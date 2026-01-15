export function createHud(root) {
  root.innerHTML = `
    <div class="panel">
      <div id="status">Connecting...</div>
      <div class="hint">Move: WASD/Arrows · Build: B</div>
      <button id="mail-refresh" type="button">Refresh mail</button>
    </div>
    <div class="panel">
      <div class="panel-title">Mail</div>
      <div id="mail-list"></div>
      <form id="mail-form">
        <input name="to" placeholder="To FID" />
        <input name="subject" placeholder="Subject" />
        <textarea name="body" rows="3" placeholder="Message"></textarea>
        <button type="submit">Send</button>
      </form>
    </div>
    <div class="panel">
      <div class="panel-title">Notifications</div>
      <div id="notify-list"></div>
    </div>
  `;

  const statusEl = root.querySelector("#status");
  const mailListEl = root.querySelector("#mail-list");
  const notifyListEl = root.querySelector("#notify-list");
  const form = root.querySelector("#mail-form");
  const refreshBtn = root.querySelector("#mail-refresh");

  const handlers = {
    mailSend: () => {},
    mailRefresh: () => {}
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const payload = {
      to: (data.get("to") || "").toString().trim(),
      subject: (data.get("subject") || "").toString().trim(),
      body: (data.get("body") || "").toString().trim()
    };
    if (!payload.to || !payload.body) {
      return;
    }
    handlers.mailSend(payload);
    form.reset();
  });

  refreshBtn.addEventListener("click", () => handlers.mailRefresh());

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function setMail(items) {
    mailListEl.innerHTML = "";
    if (!items || items.length === 0) {
      mailListEl.textContent = "No mail yet.";
      return;
    }
    for (const item of items) {
      const el = document.createElement("div");
      el.className = "mail-item";
      const from = item.from || "unknown";
      const subject = item.subject || "(no subject)";
      const body = item.body || "";
      el.innerHTML = `<strong>${escapeHtml(from)}</strong> - ${escapeHtml(subject)}<br />${escapeHtml(body)}`;
      mailListEl.appendChild(el);
    }
  }

  function pushNotifications(items) {
    if (!items || items.length === 0) {
      return;
    }
    for (const item of items) {
      const text = typeof item === "string" ? item : item.text;
      const el = document.createElement("div");
      el.textContent = text;
      notifyListEl.prepend(el);
    }
  }

  function onMailSend(fn) {
    handlers.mailSend = fn;
  }

  function onMailRefresh(fn) {
    handlers.mailRefresh = fn;
  }

  return {
    setStatus,
    setMail,
    pushNotifications,
    onMailSend,
    onMailRefresh
  };
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
