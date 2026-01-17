export function createHud(root) {
  root.innerHTML = `
    <div class="hud-top">
      <div id="status" class="hud-pill">Connecting...</div>
    </div>
    <div class="hud-bottom">
      <div class="hud-hint">Move: WASD/Arrows or tap edge. Build: B/Space or tap center.</div>
      <button id="build-btn" class="hud-action" type="button">Build tile</button>
    </div>
  `;

  const statusEl = root.querySelector("#status");
  const buildBtn = root.querySelector("#build-btn");

  const handlers = {
    build: () => {}
  };

  buildBtn.addEventListener("click", () => handlers.build());

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function onBuild(fn) {
    handlers.build = fn;
  }

  return {
    setStatus,
    onBuild
  };
}
