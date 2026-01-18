const minTileSize = 6;
const tilesAcross = 50;
const colors = {
  ground: "#ffffff",
  player: "#000000",
  home: "#000000"
};
const obeliskPalette = {
  highlight: "#000000",
  mid: "#000000",
  shade: "#000000"
};
const cameraYaw = Math.PI / 4;
const cameraPitch = -0.6;
const cameraDistance = 12;
const cameraYawSin = Math.sin(cameraYaw);
const cameraYawCos = Math.cos(cameraYaw);
const cameraPitchSin = Math.sin(cameraPitch);
const cameraPitchCos = Math.cos(cameraPitch);
const lightDir = normalize3(-0.4, 0.85, -0.2);
const obeliskModel = createObeliskModel();

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
  const pointer = {
    x: 0,
    y: 0,
    active: false
  };

  function updatePointer(event) {
    if (event.pointerType && event.pointerType !== "mouse") {
      pointer.active = false;
      return;
    }
    const rect = canvas.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    pointer.active = true;
  }

  canvas.addEventListener("pointermove", updatePointer);
  canvas.addEventListener("pointerenter", updatePointer);
  canvas.addEventListener("pointerleave", () => {
    pointer.active = false;
  });
  canvas.addEventListener("pointercancel", () => {
    pointer.active = false;
  });

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

  function render(now) {
    const { player } = state;
    const tileSize = getTileSize(canvas);
    const time = now * 0.001;
    ctx.fillStyle = colors.ground;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    if (!player) {
      return;
    }

    for (const space of state.spaces) {
      drawSpace(space, player, tileSize, time);
    }

    drawBuildReticle(tileSize, time);

    const playerPos = toScreen(player.x, player.y, player, tileSize);
    const radius = tileSize * 0.55;
    ctx.fillStyle = colors.player;
    ctx.beginPath();
    ctx.arc(
      playerPos.x + tileSize * 0.5,
      playerPos.y + tileSize * 0.5,
      radius,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.lineWidth = Math.max(1, tileSize * 0.18);
    ctx.strokeStyle = colors.ground;
    ctx.stroke();
  }

  function drawSpace(space, player, tileSize, time) {
    const homePos = toScreen(space.home.x, space.home.y, player, tileSize);
    ctx.fillStyle = colors.home;
    ctx.fillRect(homePos.x, homePos.y, tileSize, tileSize);

    for (const tile of space.tiles) {
      if (tile.type === "obelisk") {
        continue;
      }
      const pos = toScreen(tile.x, tile.y, player, tileSize);
      ctx.fillStyle = colors.home;
      ctx.fillRect(pos.x, pos.y, tileSize, tileSize);
    }

    drawObelisk(space, player, tileSize, time);
  }

  function toScreen(worldX, worldY, player, tileSize) {
    const offsetX = Math.floor(ctx.canvas.width / 2);
    const offsetY = Math.floor(ctx.canvas.height / 2);
    return {
      x: Math.round((worldX - player.x) * tileSize + offsetX),
      y: Math.round((worldY - player.y) * tileSize + offsetY)
    };
  }

  function getHoverInfluence(baseX, baseY, tileSize) {
    if (!pointer.active) {
      return { strength: 0, angle: 0 };
    }
    const dx = pointer.x - baseX;
    const dy = pointer.y - baseY;
    const distance = Math.hypot(dx, dy);
    const maxDistance = tileSize * 6;
    if (distance > maxDistance) {
      return { strength: 0, angle: 0 };
    }
    return {
      strength: clamp(1 - distance / maxDistance, 0, 1),
      angle: Math.atan2(dy, dx)
    };
  }

  function drawObelisk(space, player, tileSize, time) {
    const base = toScreen(space.home.x, space.home.y, player, tileSize);
    const baseX = base.x + tileSize * 0.5;
    const baseY = base.y + tileSize * 0.5;
    const seed = hashString(space.fid || "obelisk");
    const phase = (seed % 360) * (Math.PI / 180);
    const hover = getHoverInfluence(baseX, baseY, tileSize);
    const wobble = hover.strength * Math.sin(time * 1.1 + phase) * 0.45;
    const rotation =
      phase + hover.angle * 0.55 * hover.strength + wobble;
    const bob = Math.sin(time * 1.6 + phase) * 0.18 * hover.strength;
    const sin = Math.sin(rotation);
    const cos = Math.cos(rotation);
    const dotRadius = Math.max(0.8, tileSize * 0.12);
    const dots = [];

    for (const point of obeliskModel.points) {
      const x = point.x + point.jitterX;
      const z = point.z + point.jitterZ;
      const y = point.y + bob;
      const rx = x * cos - z * sin;
      const rz = x * sin + z * cos;
      const ry = y;

      const nx = point.nx * cos - point.nz * sin;
      const nz = point.nx * sin + point.nz * cos;
      const ny = point.ny;

      let camX = rx * cameraYawCos - rz * cameraYawSin;
      let camZ = rx * cameraYawSin + rz * cameraYawCos;
      let camY = ry * cameraPitchCos - camZ * cameraPitchSin;
      camZ = ry * cameraPitchSin + camZ * cameraPitchCos;

      const depth = cameraDistance + camZ;
      if (depth <= 0.2) {
        continue;
      }
      const scale = cameraDistance / depth;
      const screenX = camX * scale * tileSize;
      const screenY = camY * scale * tileSize;

      const light = clamp(
        0.2 + 0.8 * dot3(nx, ny, nz, lightDir.x, lightDir.y, lightDir.z),
        0,
        1
      );
      const heightFade = clamp(ry / obeliskModel.height, 0, 1);
      const shade = clamp(light + heightFade * 0.2, 0, 1);
      const color =
        shade > 0.72
          ? obeliskPalette.highlight
          : shade < 0.35
            ? obeliskPalette.shade
            : obeliskPalette.mid;
      const shimmer = clamp(
        0.95 +
          hover.strength *
            0.08 *
            Math.sin(time * 1.4 + point.phase + phase),
        0.85,
        1
      );
      const size =
        dotRadius * scale * (0.8 + heightFade * 0.25 + hover.strength * 0.08);
      dots.push({
        x: baseX + screenX,
        y: baseY + screenY,
        depth,
        color,
        alpha: shimmer,
        size
      });
    }

    dots.sort((a, b) => a.depth - b.depth);
    for (const dot of dots) {
      ctx.globalAlpha = dot.alpha;
      ctx.fillStyle = dot.color;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawBuildReticle(tileSize, time) {
    const centerX = Math.floor(ctx.canvas.width / 2);
    const centerY = Math.floor(ctx.canvas.height / 2);
    const pulse = 0.08 * Math.sin(time * 2);
    const radius = tileSize * (0.9 + pulse);
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = colors.home;
    ctx.lineWidth = Math.max(1, tileSize * 0.12);
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function loop(now) {
    render(now);
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

function createObeliskModel() {
  const points = [];
  const height = 7.2;
  const width = 3.8;
  const depth = 2.8;
  const spacing = 0.9;
  let index = 0;

  for (let y = 0; y <= height; y += spacing) {
    const t = y / height;
    const taper = 1 - t * 0.35;
    const halfW = (width * taper) / 2;
    const halfD = (depth * taper) / 2;

    for (let x = -halfW; x <= halfW; x += spacing) {
      points.push(makePoint(x, y, -halfD, index++, 0, 0, -1));
      points.push(makePoint(x, y, halfD, index++, 0, 0, 1));
    }
    for (let z = -halfD; z <= halfD; z += spacing) {
      points.push(makePoint(-halfW, y, z, index++, -1, 0, 0));
      points.push(makePoint(halfW, y, z, index++, 1, 0, 0));
    }
  }

  const capY = height + spacing * 0.5;
  for (let x = -spacing; x <= spacing; x += spacing) {
    for (let z = -spacing; z <= spacing; z += spacing) {
      points.push(makePoint(x * 0.6, capY, z * 0.6, index++, 0, 1, 0));
    }
  }
  const capY2 = capY + spacing * 0.45;
  const capOffset = spacing * 0.45;
  const capOffsets = [-capOffset, 0, capOffset];
  for (const x of capOffsets) {
    for (const z of capOffsets) {
      if (x === 0 && z === 0) {
        continue;
      }
      points.push(makePoint(x * 0.75, capY2, z * 0.75, index++, 0, 1, 0));
    }
  }

  return {
    points,
    height,
    width,
    depth
  };
}

function makePoint(x, y, z, index, nx, ny, nz) {
  const jitterX = (randomFromSeed(index * 1.7) - 0.5) * 0.1;
  const jitterZ = (randomFromSeed(index * 2.3) - 0.5) * 0.1;
  return {
    x,
    y,
    z,
    jitterX,
    jitterZ,
    phase: index * 0.6,
    nx,
    ny,
    nz
  };
}

function randomFromSeed(seed) {
  const value = Math.sin(seed) * 43758.5453;
  return value - Math.floor(value);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalize3(x, y, z) {
  const length = Math.hypot(x, y, z) || 1;
  return { x: x / length, y: y / length, z: z / length };
}

function dot3(ax, ay, az, bx, by, bz) {
  return ax * bx + ay * by + az * bz;
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
