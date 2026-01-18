export function createHud(root) {
  root.innerHTML = `
    <div class="hud-top">
      <div class="hud-status-row">
        <div id="status" class="hud-pill">Connecting...</div>
        <div id="mail" class="hud-pill hud-pill-muted is-hidden" aria-hidden="true"></div>
      </div>
      <div id="notices" class="hud-notices" aria-live="polite"></div>
    </div>
    <div class="hud-bottom">
      <div id="hint" class="hud-hint">Move: WASD/Arrows or tap edge. Build: B/Space or tap center.</div>
      <button id="build-btn" class="hud-action" type="button">Build tile</button>
    </div>
  `;

  const statusEl = root.querySelector("#status");
  const buildBtn = root.querySelector("#build-btn");
  const noticeEl = root.querySelector("#notices");
  const mailEl = root.querySelector("#mail");
  const hintEl = root.querySelector("#hint");

  const handlers = {
    build: () => {}
  };
  let noticeTimer = null;

  buildBtn.addEventListener("click", () => handlers.build());

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function setHint(text) {
    hintEl.textContent = text;
  }

  function setMailCount(count) {
    if (!count) {
      mailEl.textContent = "";
      mailEl.classList.add("is-hidden");
      mailEl.setAttribute("aria-hidden", "true");
      return;
    }
    mailEl.textContent = `Mail ${count}`;
    mailEl.classList.remove("is-hidden");
    mailEl.setAttribute("aria-hidden", "false");
  }

  function showNotices(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return;
    }
    const slice = items.slice(-3);
    noticeEl.replaceChildren();
    for (const item of slice) {
      const toast = document.createElement("div");
      toast.className = "hud-toast";
      toast.textContent = item && item.text ? item.text : "";
      noticeEl.appendChild(toast);
    }
    if (noticeTimer) {
      window.clearTimeout(noticeTimer);
    }
    noticeTimer = window.setTimeout(() => {
      noticeEl.replaceChildren();
    }, 3200);
  }

  function onBuild(fn) {
    handlers.build = fn;
  }

  return {
    setStatus,
    setHint,
    setMailCount,
    showNotices,
    onBuild
  };
}
