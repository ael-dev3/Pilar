import { createGame } from "./game.js";
import { createNet } from "./net.js";
import { createHud } from "./ui.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d", { alpha: false });

function resizeCanvas() {
  const width = Math.floor(canvas.clientWidth);
  const height = Math.floor(canvas.clientHeight);
  if (!width || !height) {
    return;
  }
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    ctx.imageSmoothingEnabled = false;
  }
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

const hud = createHud(document.getElementById("hud"));
const net = createNet();
const game = createGame({ ctx, net });

const fid = getFid();
let connectionLabel = "Connecting";

function updateStatus() {
  hud.setStatus(connectionLabel);
}

updateStatus();

net.onState((snapshot) => {
  game.setState(snapshot);
});

net.onStatus((label) => {
  connectionLabel = label;
  updateStatus();
});

hud.onBuild(() => net.sendBuild());

game.start();
net.join(fid);

function getFid() {
  const params = new URLSearchParams(window.location.search);
  const fid = params.get("fid");
  if (fid && fid.trim()) {
    return fid.trim();
  }
  return `guest-${Math.random().toString(36).slice(2, 8)}`;
}
