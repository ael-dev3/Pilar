const STORAGE_KEY = "pilar_offline_world_v1";
const HOME_SPACING = 24;
const SEED_FIDS = ["demo-1", "demo-2", "demo-3"];
const OPEN_TIMEOUT_MS = 1200;

export function createNet() {
  const listeners = {
    state: () => {},
    mail: () => {},
    notify: () => {}
  };

  let ws = null;
  let fid = null;
  let offline = false;
  let openTimer = null;

  function connect() {
    ws = new WebSocket(getWsUrl());
    let opened = false;

    openTimer = window.setTimeout(() => {
      if (!opened) {
        enableOffline();
      }
    }, OPEN_TIMEOUT_MS);

    ws.addEventListener("open", () => {
      opened = true;
      clearTimeout(openTimer);
      if (fid) {
        send("hello", { fid });
      }
    });

    ws.addEventListener("message", (event) => {
      const msg = parse(event.data);
      if (!msg || !msg.type) {
        return;
      }
      if (msg.type === "state") {
        listeners.state(msg.data || {});
      }
      if (msg.type === "mail") {
        listeners.mail(msg.items || []);
      }
      if (msg.type === "notify") {
        listeners.notify(msg.items || []);
      }
    });

    ws.addEventListener("close", () => {
      clearTimeout(openTimer);
      if (!offline) {
        setTimeout(connect, 1000);
      }
    });

    ws.addEventListener("error", () => {
      clearTimeout(openTimer);
      if (!offline) {
        enableOffline();
      }
    });
  }

  function enableOffline() {
    if (offline) {
      return;
    }
    offline = true;
    try {
      ws?.close();
    } catch {
      // ignore
    }
    if (fid) {
      emitState(fid);
      emitMailSnapshot(fid);
    }
    listeners.notify([{ text: "Offline demo mode" }]);
  }

  function emitState(activeFid) {
    const snapshot = getSnapshot(activeFid);
    listeners.state(snapshot);
  }

  function emitMailSnapshot(activeFid) {
    const result = withWorld((world) => {
      const mail = listMail(world, activeFid);
      const notifications = popNotifications(world, activeFid);
      return { mail, notifications };
    });
    listeners.mail(result.mail);
    if (result.notifications.length) {
      listeners.notify(result.notifications);
    }
  }

  function join(nextFid) {
    fid = nextFid;
    if (offline) {
      emitState(fid);
      emitMailSnapshot(fid);
      return;
    }
    if (ws && ws.readyState === WebSocket.OPEN) {
      send("hello", { fid });
    }
  }

  function send(type, payload) {
    if (offline || !ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }
    ws.send(JSON.stringify({ type, ...payload }));
  }

  function sendMove(dx, dy) {
    if (offline) {
      withWorld((world) => {
        const player = getOrCreatePlayer(world, fid);
        player.x += dx;
        player.y += dy;
      });
      emitState(fid);
      return;
    }
    send("move", { dx, dy });
  }

  function sendMail({ to, subject, body }) {
    if (offline) {
      const cleanTo = (to || "").toString().trim();
      const cleanBody = (body || "").toString().trim();
      const cleanSubject = (subject || "").toString().trim();
      if (!cleanTo || !cleanBody) {
        return;
      }
      withWorld((world) => {
        storeMail(world, {
          from: fid,
          to: cleanTo,
          subject: cleanSubject,
          body: cleanBody
        });
      });
      if (cleanTo === fid) {
        emitMailSnapshot(fid);
      } else {
        listeners.notify([{ text: `Mail queued for ${cleanTo}` }]);
      }
      return;
    }
    send("mail_send", { to, subject, body });
  }

  function requestMail() {
    if (offline) {
      emitMailSnapshot(fid);
      return;
    }
    send("mail_list", {});
  }

  function onState(fn) {
    listeners.state = fn;
  }

  function onMail(fn) {
    listeners.mail = fn;
  }

  function onNotify(fn) {
    listeners.notify = fn;
  }

  connect();

  return {
    join,
    sendMove,
    sendMail,
    requestMail,
    onState,
    onMail,
    onNotify
  };
}

function parse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getWsUrl() {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}`;
}

function getSnapshot(fid) {
  return withWorld((world) => {
    const player = getOrCreatePlayer(world, fid);
    return {
      player,
      spaces: listNearbySpaces(world, player, 40)
    };
  });
}

function getOrCreatePlayer(world, fid) {
  let player = world.players[fid];
  if (player) {
    return player;
  }
  const space = getOrCreateSpace(world, fid);
  player = {
    fid,
    x: space.home.x,
    y: space.home.y,
    home: space.home
  };
  world.players[fid] = player;
  return player;
}

function getOrCreateSpace(world, fid) {
  let space = world.spaces[fid];
  if (space) {
    return space;
  }
  const home = allocateHome(world);
  space = {
    fid,
    home,
    tiles: createObelisk(home)
  };
  world.spaces[fid] = space;
  return space;
}

function allocateHome(world) {
  const index = Object.keys(world.spaces).length;
  const x = (index % 8) * HOME_SPACING;
  const y = Math.floor(index / 8) * HOME_SPACING;
  return { x, y };
}

function createObelisk(home) {
  const tiles = [];
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      tiles.push({ x: home.x + dx, y: home.y + dy, type: "obelisk" });
    }
  }
  return tiles;
}

function listNearbySpaces(world, player, radius) {
  const spaces = [];
  for (const space of Object.values(world.spaces)) {
    if (
      Math.abs(space.home.x - player.x) <= radius &&
      Math.abs(space.home.y - player.y) <= radius
    ) {
      spaces.push(space);
    }
  }
  return spaces;
}

function storeMail(world, { from, to, subject, body }) {
  const item = {
    id: world.nextMailId += 1,
    from,
    to,
    subject,
    body,
    createdAt: Date.now(),
    read: false
  };
  const list = world.mail[to] || [];
  list.push(item);
  world.mail[to] = list;
  addNotification(world, to, `Mail from ${from}`);
  return item;
}

function listMail(world, fid) {
  return world.mail[fid] || [];
}

function addNotification(world, fid, text) {
  const list = world.notifications[fid] || [];
  list.push({ text, createdAt: Date.now() });
  world.notifications[fid] = list;
}

function popNotifications(world, fid) {
  const list = world.notifications[fid] || [];
  world.notifications[fid] = [];
  return list;
}

function createWorld() {
  return {
    players: {},
    spaces: {},
    mail: {},
    notifications: {},
    nextMailId: 0
  };
}

function loadWorld() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  let world = createWorld();
  if (raw) {
    try {
      world = JSON.parse(raw);
    } catch {
      world = createWorld();
    }
  }
  world.players = world.players || {};
  world.spaces = world.spaces || {};
  world.mail = world.mail || {};
  world.notifications = world.notifications || {};
  world.nextMailId = Number(world.nextMailId || 0);
  ensureSeeds(world);
  return world;
}

function saveWorld(world) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(world));
}

function withWorld(mutator) {
  const world = loadWorld();
  const result = mutator(world);
  saveWorld(world);
  return result;
}

function ensureSeeds(world) {
  for (const fid of SEED_FIDS) {
    if (!world.spaces[fid]) {
      const home = allocateHome(world);
      world.spaces[fid] = {
        fid,
        home,
        tiles: createObelisk(home)
      };
    }
  }
}
