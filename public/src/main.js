import { createGame } from "./game.js";
import { createNet } from "./net.js";
import { createHud } from "./ui.js";

const app = document.getElementById("app");
const canvas = document.getElementById("game");
const hudRoot = document.getElementById("hud");

if (!canvas || !hudRoot) {
  if (app) {
    app.textContent = "Pilar failed to load. Please refresh.";
  }
} else {
  const ctx = canvas.getContext("2d", { alpha: false });

  if (!ctx) {
    hudRoot.textContent = "Canvas not supported.";
  } else {
    boot(ctx, hudRoot);
  }
}

function boot(ctx, hudRoot) {
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

  const hud = createHud(hudRoot);
  const net = createNet();
  const game = createGame({ ctx, net });
  const hasCoarsePointer =
    window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  hud.setHint(
    hasCoarsePointer
      ? "Tap edge to move. Tap center or Build to place."
      : "Move: WASD/Arrows or tap edge. Build: B/Space or tap center."
  );

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

  net.onNotify((items) => {
    hud.showNotices(items);
  });

  net.onMail((items) => {
    if (!Array.isArray(items)) {
      hud.setMailCount(0);
      return;
    }
    const unread = items.filter((item) => !item.read).length;
    hud.setMailCount(unread || items.length);
  });

  hud.onBuild(() => net.sendBuild());

  game.start();
  net.join(fid);
}

function getFid() {
  const params = new URLSearchParams(window.location.search);
  const fid = params.get("fid");
  if (fid && fid.trim()) {
    return fid.trim();
  }
  return `guest-${Math.random().toString(36).slice(2, 8)}`;
}
