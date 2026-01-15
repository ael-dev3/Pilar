const world = {
  players: new Map(),
  spaces: new Map(),
  mail: new Map(),
  notifications: new Map()
};

const HOME_SPACING = 24;
let mailId = 0;

function allocateHome() {
  const index = world.spaces.size;
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

export function getOrCreatePlayer(fid) {
  let player = world.players.get(fid);
  if (player) {
    return player;
  }

  const home = allocateHome();
  const space = {
    fid,
    home,
    tiles: createObelisk(home)
  };
  world.spaces.set(fid, space);

  player = {
    fid,
    x: home.x,
    y: home.y,
    home
  };
  world.players.set(fid, player);
  return player;
}

export function movePlayer(fid, dx, dy) {
  const player = getOrCreatePlayer(fid);
  player.x += dx;
  player.y += dy;
  return player;
}

export function getSnapshot(fid) {
  const player = getOrCreatePlayer(fid);
  const spaces = listNearbySpaces(player, 40);
  return { player, spaces };
}

export function listNearbySpaces(player, radius) {
  const spaces = [];
  for (const space of world.spaces.values()) {
    if (
      Math.abs(space.home.x - player.x) <= radius &&
      Math.abs(space.home.y - player.y) <= radius
    ) {
      spaces.push(space);
    }
  }
  return spaces;
}

export function sendMail({ from, to, subject, body }) {
  const item = {
    id: (mailId += 1),
    from,
    to,
    subject,
    body,
    createdAt: Date.now(),
    read: false
  };
  const list = world.mail.get(to) || [];
  list.push(item);
  world.mail.set(to, list);
  addNotification(to, `Mail from ${from}`);
  return item;
}

export function listMail(fid) {
  return world.mail.get(fid) || [];
}

export function addNotification(fid, text) {
  const list = world.notifications.get(fid) || [];
  list.push({ text, createdAt: Date.now() });
  world.notifications.set(fid, list);
}

export function popNotifications(fid) {
  const list = world.notifications.get(fid) || [];
  world.notifications.set(fid, []);
  return list;
}
