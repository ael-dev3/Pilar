export function createNet() {
  const listeners = {
    state: () => {},
    mail: () => {},
    notify: () => {}
  };

  let ws = null;
  let fid = null;

  function connect() {
    ws = new WebSocket(getWsUrl());
    ws.addEventListener("open", () => {
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
      setTimeout(connect, 1000);
    });
  }

  function join(nextFid) {
    fid = nextFid;
    if (ws && ws.readyState === WebSocket.OPEN) {
      send("hello", { fid });
    }
  }

  function send(type, payload) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }
    ws.send(JSON.stringify({ type, ...payload }));
  }

  function sendMove(dx, dy) {
    send("move", { dx, dy });
  }

  function sendMail({ to, subject, body }) {
    send("mail_send", { to, subject, body });
  }

  function requestMail() {
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
