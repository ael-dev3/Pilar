import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import WebSocket, { WebSocketServer } from "ws";
import { CLIENT, SERVER, parseMessage } from "./protocol.js";
import {
  getSnapshot,
  movePlayer,
  sendMail,
  listMail,
  popNotifications
} from "./state.js";

const app = express();
app.use(express.json());

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "../../web");
app.use(express.static(webRoot));

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const sessions = new Map();

wss.on("connection", (ws) => {
  ws.on("message", (data) => {
    const msg = parseMessage(data.toString());
    if (!msg) {
      send(ws, { type: SERVER.ERROR, message: "bad_json" });
      return;
    }

    if (msg.type === CLIENT.HELLO) {
      const fid = (msg.fid || "").toString().trim();
      if (!fid) {
        send(ws, { type: SERVER.ERROR, message: "missing_fid" });
        return;
      }
      sessions.set(ws, fid);
      send(ws, { type: SERVER.STATE, data: getSnapshot(fid) });
      send(ws, { type: SERVER.MAIL, items: listMail(fid) });
      const notifications = popNotifications(fid);
      if (notifications.length) {
        send(ws, { type: SERVER.NOTIFY, items: notifications });
      }
      return;
    }

    const fid = sessions.get(ws);
    if (!fid) {
      send(ws, { type: SERVER.ERROR, message: "not_joined" });
      return;
    }

    if (msg.type === CLIENT.MOVE) {
      movePlayer(fid, Number(msg.dx) || 0, Number(msg.dy) || 0);
      send(ws, { type: SERVER.STATE, data: getSnapshot(fid) });
      return;
    }

    if (msg.type === CLIENT.MAIL_SEND) {
      const to = (msg.to || "").toString().trim();
      const body = (msg.body || "").toString().trim();
      const subject = (msg.subject || "").toString().trim();
      if (!to || !body) {
        send(ws, { type: SERVER.ERROR, message: "bad_mail" });
        return;
      }
      sendMail({ from: fid, to, subject, body });
      send(ws, { type: SERVER.MAIL, items: listMail(fid) });
      sendToFid(to, { type: SERVER.MAIL, items: listMail(to) });
      const notifications = popNotifications(to);
      if (notifications.length) {
        sendToFid(to, { type: SERVER.NOTIFY, items: notifications });
      }
      return;
    }

    if (msg.type === CLIENT.MAIL_LIST) {
      send(ws, { type: SERVER.MAIL, items: listMail(fid) });
      const notifications = popNotifications(fid);
      if (notifications.length) {
        send(ws, { type: SERVER.NOTIFY, items: notifications });
      }
    }
  });

  ws.on("close", () => {
    sessions.delete(ws);
  });
});

const port = Number(process.env.PORT) || 3000;
server.listen(port, () => {
  console.log(`Pilar server on http://localhost:${port}`);
});

function send(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function sendToFid(fid, message) {
  for (const [socket, socketFid] of sessions.entries()) {
    if (socketFid === fid) {
      send(socket, message);
    }
  }
}
