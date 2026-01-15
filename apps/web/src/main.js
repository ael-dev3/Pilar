import { createGame } from "./game.js";
import { createNet } from "./net.js";
import { createHud } from "./ui.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d", { alpha: false });

const hud = createHud(document.getElementById("hud"));
const net = createNet();
const game = createGame({ ctx, net, hud });

net.onState((snapshot) => {
  game.setState(snapshot);
});

net.onMail((items) => hud.setMail(items));
net.onNotify((items) => hud.pushNotifications(items));

hud.onMailSend((payload) => net.sendMail(payload));
hud.onMailRefresh(() => net.requestMail());

game.start();

const fid = getFid();
hud.setStatus(`FID ${fid}`);
net.join(fid);

function getFid() {
  const params = new URLSearchParams(window.location.search);
  const fid = params.get("fid");
  if (fid && fid.trim()) {
    return fid.trim();
  }
  return `guest-${Math.random().toString(36).slice(2, 8)}`;
}
