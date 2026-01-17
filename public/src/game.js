const minTileSize = 6;
const tilesAcross = 50;
const colors = {
  ground: "#e8d8b3",
  obelisk: "#3d3b35",
  player: "#1f7a6c",
  home: "#b89f70"
};

const keyMap = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  w: [0, -1],
  s: [0, 1],
  a: [-1, 0],
  d: [1, 0]
};

export function createGame({ ctx, net }) {
  const state = {
    player: null,
    spaces: []
  };
  const canvas = ctx.canvas;

  canvas.addEventListener("pointerdown", (event) => {
    if (!state.player) {
      return;
    }
    event.preventDefault();
    const tileSize = getTileSize(canvas);
    const rect = canvas.getBoundingClientRect();
    const dx = event.clientX - rect.left - rect.width / 2;
    const dy = event.clientY - rect.top - rect.height / 2;
    const deadZone = tileSize * 1.5;
    if (Math.abs(dx) < deadZone && Math.abs(dy) < deadZone) {
      net.sendBuild();
      return;
    }
    if (Math.abs(dx) >= Math.abs(dy)) {
      net.sendMove(Math.sign(dx), 0);
      return;
    }
    net.sendMove(0, Math.sign(dy));
  });

  window.addEventListener("keydown", (event) => {
    if (event.repeat) {
      return;
    }
    const target = event.target;
    const tagName = target && target.tagName;
    if (tagName === "INPUT" || tagName === "TEXTAREA") {
      return;
    }
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (key === "b" || event.code === "Space") {
      event.preventDefault();
      net.sendBuild();
      return;
    }
    const move = keyMap[key];
    if (!move) {
      return;
    }
    event.preventDefault();
    net.sendMove(move[0], move[1]);
  });

  function setState(snapshot) {
    state.player = snapshot.player;
    state.spaces = snapshot.spaces || [];
  }

  function render() {
    const { player } = state;
    const tileSize = getTileSize(canvas);
    ctx.fillStyle = colors.ground;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    if (!player) {
      return;
    }

    for (const space of state.spaces) {
      drawSpace(space, player, tileSize);
    }

    const playerPos = toScreen(player.x, player.y, player, tileSize);
    ctx.fillStyle = colors.player;
    ctx.fillRect(playerPos.x, playerPos.y, tileSize, tileSize);
  }

  function drawSpace(space, player, tileSize) {
    const homePos = toScreen(space.home.x, space.home.y, player, tileSize);
    ctx.fillStyle = colors.home;
    ctx.fillRect(homePos.x, homePos.y, tileSize, tileSize);

    for (const tile of space.tiles) {
      const pos = toScreen(tile.x, tile.y, player, tileSize);
      ctx.fillStyle = tile.type === "obelisk" ? colors.obelisk : colors.home;
      ctx.fillRect(pos.x, pos.y, tileSize, tileSize);
    }
  }

  function toScreen(worldX, worldY, player, tileSize) {
    const offsetX = Math.floor(ctx.canvas.width / 2);
    const offsetY = Math.floor(ctx.canvas.height / 2);
    return {
      x: Math.round((worldX - player.x) * tileSize + offsetX),
      y: Math.round((worldY - player.y) * tileSize + offsetY)
    };
  }

  function loop() {
    render();
    requestAnimationFrame(loop);
  }

  function start() {
    requestAnimationFrame(loop);
  }

  return {
    setState,
    start
  };
}

function getTileSize(canvas) {
  return Math.max(minTileSize, Math.floor(canvas.width / tilesAcross));
}
