(function () {
  "use strict";

  // ── Styles ────────────────────────────────────────────────────────────────
  function v(a = "#16A34A") {
    return `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :host {
      --color-primary: ${a};
      --color-bg: #000000;
      --color-surface: #0f0f0f;
      --color-border: rgba(255,255,255,0.1);
      --color-text: #ffffff;
      --color-text-muted: rgba(255,255,255,0.45);
      --color-user-bubble: var(--color-primary);
      --color-user-text: #000000;
      --color-bot-bubble: #1a1a1a;
      --radius: 16px;
      --shadow: 0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,229,229,0.08);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    /* Launcher bubble */
    #launcher {
      position: fixed;
      bottom: var(--chat-bottom, 24px);
      right: 24px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--color-primary);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 20px rgba(0,229,229,0.35);
      transition: transform 0.2s ease, box-shadow 0.2s ease, bottom 0.3s ease;
      z-index: 9999;
    }
    @media (max-width: 767px) {
      #launcher { width: 48px; height: 48px; }
      #launcher svg.icon-close { width: 22px; height: 22px; }
    }
    #launcher:hover { transform: scale(1.08); box-shadow: 0 8px 32px rgba(0,229,229,0.5); }
    #launcher img.icon-chat { position: absolute; inset: 0; width: 100%; height: 100%; border-radius: 50%; object-fit: cover; object-position: center top; }
    #launcher svg.icon-close { width: 26px; height: 26px; fill: #000000; }
    #launcher.open img.icon-chat { display: none; }
    #launcher:not(.open) svg.icon-close { display: none; }
    #launcher:not(.open) { background: transparent; box-shadow: 0 4px 24px rgba(0,0,0,0.35), 0 0 0 2px rgba(0,229,229,0.4); overflow: hidden; }

    /* Chat panel */
    #panel {
      position: fixed;
      bottom: calc(var(--chat-bottom, 24px) + 68px);
      right: 24px;
      transition: bottom 0.3s ease;
      width: 380px;
      height: 520px;
      background: var(--color-bg);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 9998;
      border: 1px solid var(--color-border);
      transform: scale(0.95) translateY(8px);
      transform-origin: bottom right;
      opacity: 0;
      pointer-events: none;
      transition: transform 0.2s ease, opacity 0.2s ease;
    }
    #panel.visible {
      transform: scale(1) translateY(0);
      opacity: 1;
      pointer-events: all;
    }

    /* Header */
    #header {
      background: #000000;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      border-bottom: 1px solid var(--color-border);
      flex-shrink: 0;
    }
    #header-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      overflow: hidden;
    }
    #header-avatar img { width: 100%; height: 100%; object-fit: cover; object-position: center top; border-radius: 50%; }
    #header-avatar svg { width: 20px; height: 20px; fill: #000000; }
    #header-info { flex: 1; min-width: 0; }
    #header-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--color-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    #header-status { font-size: 11px; color: var(--color-primary); }
    #btn-clear {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--color-text-muted);
      padding: 4px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      transition: color 0.15s;
    }
    #btn-clear:hover { color: var(--color-text); }
    #btn-clear svg { width: 16px; height: 16px; stroke: currentColor; fill: none; }

    /* Messages area */
    #messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      scroll-behavior: smooth;
    }
    #messages::-webkit-scrollbar { width: 4px; }
    #messages::-webkit-scrollbar-track { background: transparent; }
    #messages::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px; }

    /* Message bubbles */
    .msg {
      display: flex;
      flex-direction: column;
      max-width: 85%;
    }
    .msg.user { align-self: flex-end; align-items: flex-end; }
    .msg.bot { align-self: flex-start; align-items: flex-start; }
    .bubble {
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 13.5px;
      line-height: 1.5;
      word-break: break-word;
      white-space: pre-wrap;
    }
    .msg.user .bubble {
      background: var(--color-user-bubble);
      color: var(--color-user-text);
      border-bottom-right-radius: 4px;
      font-weight: 500;
    }
    .msg.bot .bubble {
      background: var(--color-bot-bubble);
      color: var(--color-text);
      border-bottom-left-radius: 4px;
      border: 1px solid var(--color-border);
    }

    /* Menu buttons */
    .menu-options {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 6px;
      width: 100%;
    }
    .menu-btn {
      background: transparent;
      border: 1px solid rgba(0, 229, 229, 0.3);
      color: var(--color-primary);
      border-radius: 20px;
      padding: 7px 14px;
      font-size: 13px;
      cursor: pointer;
      text-align: left;
      transition: background 0.15s, border-color 0.15s, color 0.15s;
      line-height: 1.4;
    }
    .menu-btn:hover {
      background: rgba(0, 229, 229, 0.12);
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
    a.menu-btn {
      display: block;
      text-decoration: none;
    }
    .chat-link {
      color: var(--color-primary);
      text-decoration: underline;
      text-underline-offset: 2px;
    }
    .chat-link:hover { opacity: 0.8; }

    /* Loading indicator */
    .typing {
      display: flex;
      gap: 4px;
      padding: 12px 14px;
      background: var(--color-bot-bubble);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      border-bottom-left-radius: 4px;
      width: fit-content;
    }
    .typing span {
      width: 6px;
      height: 6px;
      background: var(--color-text-muted);
      border-radius: 50%;
      animation: bounce 1.2s infinite;
    }
    .typing span:nth-child(2) { animation-delay: 0.2s; }
    .typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce {
      0%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(-6px); }
    }

    /* Input area */
    #input-area {
      padding: 12px 14px;
      border-top: 1px solid var(--color-border);
      display: flex;
      gap: 8px;
      background: #000000;
      flex-shrink: 0;
    }
    #input {
      flex: 1;
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: 20px;
      padding: 8px 14px;
      color: var(--color-text);
      font-size: 13.5px;
      outline: none;
      transition: border-color 0.15s;
      resize: none;
      max-height: 80px;
      line-height: 1.4;
      font-family: inherit;
    }
    #input:focus { border-color: var(--color-primary); }
    #input::placeholder { color: var(--color-text-muted); }
    #btn-send {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--color-primary);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: opacity 0.15s;
      align-self: flex-end;
    }
    #btn-send:disabled { opacity: 0.4; cursor: not-allowed; }
    #btn-send svg { width: 16px; height: 16px; fill: #000000; }

    /* Nudge tooltip */
    #nudge {
      position: fixed;
      bottom: calc(var(--chat-bottom, 24px) + 8px);
      right: 88px;
      background: #ffffff;
      color: #111111;
      font-size: 14px;
      font-weight: 500;
      line-height: 1.4;
      padding: 10px 14px;
      border-radius: 12px 12px 4px 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.18);
      white-space: nowrap;
      pointer-events: auto;
      cursor: pointer;
      opacity: 0;
      transform: translateY(6px) scale(0.96);
      transition: opacity 0.3s ease, transform 0.3s ease, bottom 0.3s ease;
      z-index: 9998;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    #nudge.visible {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
    #nudge.hidden { display: none; }
    #nudge-close {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 14px;
      color: #888;
      padding: 0;
      line-height: 1;
      flex-shrink: 0;
    }
    #nudge-close:hover { color: #333; }

    /* Position variants */
    :host([data-position="bottom-left"]) #launcher,
    :host([data-position="bottom-left"]) #panel {
      right: auto;
      left: 24px;
    }
    :host([data-position="bottom-left"]) #panel {
      transform-origin: bottom left;
    }

    /* Mobile full-screen */
    @media (max-width: 480px) {
      #panel {
        bottom: 0;
        right: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        height: 100dvh;
        border-radius: 0;
        transform-origin: bottom center;
      }
      #launcher {
        bottom: 16px;
        right: 16px;
      }
    }

    /* Upsell card */
    .upsell-card {
      margin-top: 2px;
      padding: 12px 14px;
      background: linear-gradient(135deg, rgba(0,229,229,0.07) 0%, rgba(0,106,97,0.12) 100%);
      border: 1px solid rgba(0,229,229,0.28);
      border-radius: 12px;
      font-size: 13px;
      align-self: flex-start;
      max-width: 85%;
    }
    .upsell-label {
      font-size: 10.5px;
      font-weight: 700;
      color: var(--color-primary);
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin-bottom: 5px;
    }
    .upsell-title {
      color: var(--color-text);
      font-weight: 600;
      font-size: 13.5px;
      margin-bottom: 3px;
      line-height: 1.35;
    }
    .upsell-desc {
      color: var(--color-text-muted);
      font-size: 12px;
      margin-bottom: 10px;
      line-height: 1.4;
    }
    .upsell-btn {
      display: inline-block;
      background: var(--color-primary);
      color: #000000;
      font-weight: 700;
      font-size: 13px;
      padding: 8px 16px;
      border-radius: 20px;
      text-decoration: none;
      transition: opacity 0.15s;
    }
    .upsell-btn:hover { opacity: 0.82; }
    .upsell-post { margin-top: 8px; font-size: 11.5px; color: var(--color-text-muted); line-height: 1.4; }
    .upsell-benefits { list-style: none; margin-bottom: 10px; display: flex; flex-direction: column; gap: 4px; }
    .upsell-benefits li { color: var(--color-text); font-size: 12px; line-height: 1.4; }
    .upsell-no-btn { display: block; background: none; border: none; cursor: pointer; color: var(--color-text-muted); font-size: 11.5px; margin-top: 8px; text-decoration: underline; padding: 0; text-align: left; font-family: inherit; }
    .upsell-no-btn:hover { color: var(--color-text); }
  `;
  }

  // ── Menu parsing ──────────────────────────────────────────────────────────
  // Bot text may embed a menu block. Each item is one of:
  //   "1. Label → /url"      → link  ({ number, label, url })
  //   "1. Label #action"     → action button ({ number, label, action })
  //   "1. Label"             → legacy button, submits its label as free text
  // The `#action` id is stable and survives serialization to sessionStorage,
  // so routing never depends on matching the visible label text.
  function parseMenu(a) {
    const blockRe = /\[MENU\]([\s\S]*?)\[\/MENU\]/g;
    const items = [];
    let match;
    while ((match = blockRe.exec(a)) !== null) {
      const lines = match[1].split("\n").map((r) => r.trim()).filter(Boolean);
      for (const line of lines) {
        const link = line.match(/^(\d+)\.\s+(.+?)\s+→\s+((?:https?:\/\/|\/)\S+)$/);
        if (link) {
          items.push({ number: link[1], label: link[2], url: link[3] });
          continue;
        }
        const action = line.match(/^(\d+)\.\s+(.+?)\s+#([\w:-]+)$/);
        if (action) {
          items.push({ number: action[1], label: action[2], action: action[3] });
          continue;
        }
        const plain = line.match(/^(\d+)\.\s+(.+)$/);
        if (plain) items.push({ number: plain[1], label: plain[2] });
      }
    }
    const text = a.replace(/\[MENU\][\s\S]*?\[\/MENU\]/g, "").trim();
    return { text, menuItems: items };
  }

  // ── HTML template ─────────────────────────────────────────────────────────
  function y(a) {
    return `
    <div id="nudge" class="hidden" role="status" aria-live="polite">
      <span>¿Necesitas ayuda? 💬</span>
      <button id="nudge-close" aria-label="Cerrar">✕</button>
    </div>

    <button id="launcher" aria-label="Abrir chat" aria-expanded="false">
      <img class="icon-chat" src="/images/foto-francisco.jpeg" alt="Francisco" />
      <svg class="icon-close" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>
    </button>

    <div id="panel" role="dialog" aria-label="Chat de asistencia" aria-hidden="true">
      <div id="header">
        <div id="header-avatar">
          <img src="/images/foto-francisco.jpeg" alt="Francisco" />
        </div>
        <div id="header-info">
          <div id="header-name">${g(a)}</div>
          <div id="header-status">● En línea</div>
        </div>
        <button id="btn-clear" title="Limpiar conversación" aria-label="Limpiar conversación">
          <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="1 4 1 10 7 10"></polyline>
            <path d="M3.51 15a9 9 0 1 0 .49-3.51"></path>
          </svg>
        </button>
      </div>

      <div id="messages" role="log" aria-live="polite" aria-atomic="false"></div>

      <div id="input-area">
        <textarea
          id="input"
          rows="1"
          placeholder="Escribe un mensaje o elige una opción…"
          aria-label="Mensaje"
          autocomplete="off"
          spellcheck="false"
          maxlength="800"
        ></textarea>
        <button id="btn-send" aria-label="Enviar" disabled>
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    </div>
  `;
  }

  // ── Message rendering ─────────────────────────────────────────────────────
  // `onSelect(action, displayText)` is invoked when a menu button is clicked.
  // For action buttons `action` is the stable id; for legacy buttons it is null
  // and `displayText` (the "N. Label" string) is submitted as free text.
  function c(container, role, content, onSelect) {
    const wrap = document.createElement("div");
    wrap.className = `msg ${role}`;
    if (role === "bot") {
      const { text, menuItems } = parseMenu(content);
      if (text) {
        const bubble = document.createElement("div");
        bubble.className = "bubble";
        bubble.innerHTML = x(text);
        wrap.appendChild(bubble);
      }
      if (menuItems.length > 0) {
        const menu = document.createElement("div");
        menu.className = "menu-options";
        for (const item of menuItems) {
          const displayText = `${item.number}. ${item.label}`;
          if (item.url) {
            const link = document.createElement("a");
            link.className = "menu-btn";
            link.textContent = displayText;
            const safe = /^(https?:\/\/|\/)[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]*$/.test(item.url)
              ? item.url.replace(/"/g, "%22")
              : "/";
            link.href = safe;
            menu.appendChild(link);
          } else {
            const btn = document.createElement("button");
            btn.className = "menu-btn";
            btn.textContent = displayText;
            btn.addEventListener("click", () => onSelect(item.action || null, displayText));
            menu.appendChild(btn);
          }
        }
        wrap.appendChild(menu);
      }
    } else {
      const bubble = document.createElement("div");
      bubble.className = "bubble";
      bubble.textContent = content;
      wrap.appendChild(bubble);
    }
    container.appendChild(wrap);
    container.scrollTop = container.scrollHeight;
    return wrap;
  }

  function b(a) {
    const e = document.createElement("div");
    e.className = "msg bot";
    e.innerHTML = '<div class="typing"><span></span><span></span><span></span></div>';
    a.appendChild(e);
    a.scrollTop = a.scrollHeight;
    return () => e.remove();
  }

  function g(a) {
    return String(a).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function x(a) {
    let e = g(a);
    e = e.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    e = e.replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]*)\)/g, (t, s, i) =>
      /^(https?:\/\/|\/)[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]*$/.test(i)
        ? `<a href="${i.replace(/"/g, "%22")}" class="chat-link" target="_blank" rel="noopener noreferrer">${s}</a>`
        : s
    );
    e = e.replace(/\|[-:\s|]+\|/g, "").replace(/\|[^\n<]+\|/g, "");
    e = e.replace(/\n{3,}/g, "\n\n").trim();
    return e;
  }

  // ── Backend calls ─────────────────────────────────────────────────────────
  async function w(a, e, signal) {
    const t = await fetch(`${a}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: e }),
      signal,
    });
    if (!t.ok) {
      const i = await t.json().catch(() => ({}));
      throw new Error(i.error || "Error al conectar con el servidor.");
    }
    return (await t.json()).message ?? "";
  }

  async function S(a, e, signal) {
    const t = await fetch(`${a}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "recommend", ...e }),
      signal,
    });
    if (!t.ok) {
      const i = await t.json().catch(() => ({}));
      throw new Error(i.error || "Error al conectar con el servidor.");
    }
    return (await t.json()).message ?? "";
  }

  // ── Constants & static content ────────────────────────────────────────────
  const UPSELL_THRESHOLD = 3;
  const UPSELL_URL = "https://app.reveniu.com/checkout-custom-link/nd1Zh0zfeNfi1b1yJgH8XeI94hJqycjB";
  const MAX_HISTORY = 20;
  const MAX_TRANSCRIPT = 60;
  const SESSION_KEY = "ev_chat_session";

  // Menu strings emitted by /api/chat to reset the conversation.
  const RESTART_RE = /(empezar de nuevo|volver al inicio)/i;

  const MENU_BLOCK = `[MENU]
1. Quiero encontrar mi modelo ideal #find
2. Quiero información de un modelo específico #info
3. ¿Cuánto ahorro versus bencina? → /calculadora
4. Quiero contactar al equipo #contact
5. Contratar asesoría personalizada #asesoria
[/MENU]`;

  const WELCOME = `¡Hola! Soy Francisco de Electrificarte. ¿En qué puedo ayudarte hoy?

${MENU_BLOCK}`;

  const MENU_AGAIN = `¿En qué más te puedo ayudar?

${MENU_BLOCK}`;

  const INFO_PROMPT = `¡Perfecto! 🚗 Cuéntame qué modelo o marca te interesa (por ejemplo: BYD Dolphin, Volvo EX30) y te doy specs, autonomía y precio.

[MENU]
1. Volver al menú principal #menu
[/MENU]`;

  const CONTACT_MENU = `Te conectamos con nuestro equipo. ¿Qué prefieres?

[MENU]
1. Negociar el mejor precio de un modelo → /solicitar
2. Asesoría personalizada por WhatsApp → ${UPSELL_URL}
3. Enviar mensaje al equipo → /contacto
4. Volver al menú principal #menu
[/MENU]`;

  const ERROR_MENU = `Lo siento, hubo un problema al conectar. Por favor intenta nuevamente.

[MENU]
1. Volver al menú principal #menu
[/MENU]`;

  // "Find my ideal model" wizard — positional steps (routed by index, not label).
  const FIND_STEPS = [
    {
      key: "budget",
      question: "¿Cuál es tu presupuesto aproximado?",
      options: [
        { label: "Hasta 15 millones CLP", value: "hasta-15", display: "hasta 15 millones CLP" },
        { label: "15 a 30 millones CLP", value: "15-30", display: "15 a 30 millones CLP" },
        { label: "30 a 50 millones CLP", value: "30-50", display: "30 a 50 millones CLP" },
        { label: "Más de 50 millones CLP", value: "mas-50", display: "más de 50 millones CLP" },
      ],
    },
    {
      key: "vehicleType",
      question: "¿Qué tipo de carrocería prefieres?",
      options: [
        { label: "SUV o Crossover", value: "suv", display: "SUV o Crossover" },
        { label: "Sedán", value: "sedan", display: "Sedán" },
        { label: "Hatchback o City car", value: "hatchback", display: "Hatchback o City car" },
        { label: "Pickup", value: "pickup", display: "Pickup" },
        { label: "Sin preferencia", value: "any", display: "cualquier carrocería" },
      ],
    },
    {
      key: "electricType",
      question: "¿Prefieres un auto 100% eléctrico o también consideras híbridos?",
      options: [
        { label: "100% eléctrico", value: "electric", display: "100% eléctrico" },
        { label: "Híbrido o enchufable", value: "hybrid", display: "híbrido o enchufable" },
        { label: "Me da igual", value: "any", display: "cualquier tipo" },
      ],
    },
  ];

  // ── Custom element ────────────────────────────────────────────────────────
  class EvChatWidget extends HTMLElement {
    constructor() {
      super();
      this._shadow = this.attachShadow({ mode: "open" });
      this._history = [];      // LLM context, capped at MAX_HISTORY
      this._transcript = [];   // full visual transcript, for reload restore
      this._mode = "menu";     // "menu" | "find" | "chat"
      this._findStep = -1;
      this._findCriteria = {};
      this._freeCount = 0;
      this._upsellShown = false;
      this._isOpen = false;
      this._loading = false;
      this._abortCtrl = null;
    }

    disconnectedCallback() {
      clearTimeout(this._nudgeTimer);
      this._abortCtrl?.abort();
    }

    connectedCallback() {
      this._apiUrl = this.dataset.apiUrl || "";
      this._botName = this.dataset.botName || "Francisco Electrificarte";
      this._primaryColor = this.dataset.primaryColor || "#00E5E5";

      const style = document.createElement("style");
      style.textContent = v(this._primaryColor);
      this._shadow.appendChild(style);

      const root = document.createElement("div");
      root.innerHTML = y(this._botName);
      this._shadow.appendChild(root);

      this._launcher = this._shadow.getElementById("launcher");
      this._panel = this._shadow.getElementById("panel");
      this._messagesEl = this._shadow.getElementById("messages");
      this._input = this._shadow.getElementById("input");
      this._btnSend = this._shadow.getElementById("btn-send");
      this._btnClear = this._shadow.getElementById("btn-clear");

      // Single dispatch entry point for every menu button.
      this._onAction = (action, label) => this._dispatch(action, label);

      this._launcher.addEventListener("click", () => this._togglePanel());
      this._btnSend.addEventListener("click", () => this._handleSend());
      this._btnClear.addEventListener("click", () => this._clearChat());
      this._input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          this._handleSend();
        }
      });
      this._input.addEventListener("input", () => {
        this._btnSend.disabled = this._input.value.trim() === "" || this._loading;
        this._input.style.height = "auto";
        this._input.style.height = Math.min(this._input.scrollHeight, 80) + "px";
      });

      this._restoreSession();
      this._initNudge();
    }

    // ── Nudge ────────────────────────────────────────────────────────────────
    _initNudge() {
      this._nudgeEl = this._shadow.getElementById("nudge");
      const closeBtn = this._shadow.getElementById("nudge-close");
      if (!this._nudgeEl || sessionStorage.getItem("ev_nudge_seen")) return;
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this._hideNudge(true);
      });
      this._nudgeEl.addEventListener("click", () => {
        this._hideNudge(true);
        this._togglePanel();
      });
      this._nudgeTimer = setTimeout(() => {
        if (this._nudgeEl && !this._isOpen) {
          this._nudgeEl.classList.remove("hidden");
          requestAnimationFrame(() => this._nudgeEl.classList.add("visible"));
        }
      }, 30 * 1000);
    }

    _hideNudge(persist = false) {
      if (!this._nudgeEl) return;
      this._nudgeEl.classList.remove("visible");
      setTimeout(() => this._nudgeEl && this._nudgeEl.classList.add("hidden"), 300);
      if (persist) sessionStorage.setItem("ev_nudge_seen", "1");
      clearTimeout(this._nudgeTimer);
    }

    // ── Persistence ────────────────────────────────────────────────────────
    _saveSession() {
      if (this._transcript.length > MAX_TRANSCRIPT) {
        this._transcript = this._transcript.slice(-MAX_TRANSCRIPT);
      }
      try {
        sessionStorage.setItem(
          SESSION_KEY,
          JSON.stringify({
            transcript: this._transcript,
            history: this._history,
            mode: this._mode,
            findStep: this._findStep,
            findCriteria: this._findCriteria,
            freeCount: this._freeCount,
            upsellShown: this._upsellShown,
          })
        );
      } catch {}
    }

    _restoreSession() {
      try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (raw) {
          const s = JSON.parse(raw);
          if (s && Array.isArray(s.transcript) && s.transcript.length > 0) {
            this._history = Array.isArray(s.history) ? s.history : [];
            this._mode = s.mode || "menu";
            this._findStep = typeof s.findStep === "number" ? s.findStep : -1;
            this._findCriteria = s.findCriteria || {};
            this._freeCount = s.freeCount || 0;
            this._upsellShown = !!s.upsellShown;
            this._transcript = s.transcript;
            for (const entry of s.transcript) {
              if (entry.kind === "upsell") this._renderUpsell(false);
              else c(this._messagesEl, entry.role === "user" ? "user" : "bot", entry.content, this._onAction);
            }
            return;
          }
        }
      } catch {
        try {
          sessionStorage.removeItem(SESSION_KEY);
        } catch {}
      }
      this._appendBot(WELCOME);
    }

    // ── Rendering + transcript bookkeeping ───────────────────────────────────
    _appendUser(text) {
      c(this._messagesEl, "user", text, this._onAction);
      this._transcript.push({ role: "user", content: text });
      this._saveSession();
    }

    _appendBot(content) {
      c(this._messagesEl, "bot", content, this._onAction);
      this._transcript.push({ role: "bot", content });
      this._saveSession();
    }

    // ── Panel ────────────────────────────────────────────────────────────────
    _togglePanel() {
      this._isOpen = !this._isOpen;
      this._launcher.classList.toggle("open", this._isOpen);
      this._panel.classList.toggle("visible", this._isOpen);
      this._panel.setAttribute("aria-hidden", String(!this._isOpen));
      this._launcher.setAttribute("aria-expanded", String(this._isOpen));
      if (this._isOpen) {
        requestAnimationFrame(() => this._input.focus());
        this._hideNudge(true);
      }
    }

    _clearChat() {
      this._abortCtrl?.abort();
      this._abortCtrl = null;
      this._loading = false;
      this._history = [];
      this._transcript = [];
      this._mode = "menu";
      this._findStep = -1;
      this._findCriteria = {};
      this._freeCount = 0;
      this._upsellShown = false;
      this._messagesEl.innerHTML = "";
      try {
        sessionStorage.removeItem(SESSION_KEY);
      } catch {}
      this._btnSend.disabled = this._input.value.trim() === "";
      this._appendBot(WELCOME);
    }

    // Return to the main menu from anywhere — the guaranteed exit.
    _goToMenu() {
      this._mode = "menu";
      this._findStep = -1;
      this._appendBot(MENU_AGAIN);
    }

    // ── Upsell (soft: once per session, always an exit) ──────────────────────
    _showUpsell() {
      this._upsellShown = true;
      this._renderUpsell(true);
    }

    _renderUpsell(record = true) {
      const card = document.createElement("div");
      card.className = "upsell-card";
      card.innerHTML = `<div class="upsell-label">Asesoría Personalizada</div><div class="upsell-title">¿Quieres atención 100% personalizada?</div><div class="upsell-desc">Resuelve todas tus dudas directamente por WhatsApp con un experto Electrificarte — solo $4.990 CLP.</div><ul class="upsell-benefits"><li>✅ +50 personas asesoradas</li><li>✅ Recomendación ajustada a tu realidad y presupuesto</li><li>✅ Comparación de +120 autos eléctricos e híbridos</li><li>✅ Atención directa y personalizada por WhatsApp</li></ul><a class="upsell-btn" href="${UPSELL_URL}" target="_blank" rel="noopener noreferrer">Contratar asesoría &middot; $4.990 →</a><div class="upsell-post">Luego del pago te contactaremos directamente por WhatsApp.</div><button class="upsell-no-btn">Seguir explorando sin asesoría</button>`;
      this._messagesEl.appendChild(card);
      this._messagesEl.scrollTop = this._messagesEl.scrollHeight;
      const no = card.querySelector(".upsell-no-btn");
      if (no) no.addEventListener("click", () => this._goToMenu());
      if (record) {
        this._transcript.push({ role: "bot", kind: "upsell" });
        this._saveSession();
      }
    }

    _maybeUpsell() {
      if (this._freeCount >= UPSELL_THRESHOLD && !this._upsellShown) this._showUpsell();
    }

    // ── Central dispatch for menu buttons ────────────────────────────────────
    // Actions are stable ids, never the visible label, so no button can ever
    // re-trigger a flow by accident (this is what fixes the asesoría loop).
    _dispatch(action, displayText) {
      if (this._loading) return;
      // Legacy button (no action id) → treat its label as free text.
      if (!action) {
        this._submitText(displayText);
        return;
      }
      this._appendUser(displayText);
      switch (action) {
        case "find":
          this._startFind();
          break;
        case "info":
          this._mode = "chat";
          this._appendBot(INFO_PROMPT);
          break;
        case "contact":
          this._mode = "menu";
          this._appendBot(CONTACT_MENU);
          break;
        case "asesoria":
          this._showUpsell();
          break;
        case "menu":
          this._goToMenu();
          break;
        case "restart":
          this._clearChat();
          break;
        default:
          if (action.indexOf("find:opt:") === 0) {
            this._answerFind(parseInt(action.slice(9), 10));
          }
          break;
      }
    }

    // ── Free-text input ──────────────────────────────────────────────────────
    async _handleSend() {
      const text = this._input.value.trim();
      if (!text || this._loading) return;
      this._input.value = "";
      this._input.style.height = "auto";
      this._btnSend.disabled = true;
      this._submitText(text);
    }

    _submitText(text) {
      if (RESTART_RE.test(text)) {
        this._clearChat();
        return;
      }
      this._appendUser(text);
      if (this._mode === "find") {
        this._answerFindTyped(text);
        return;
      }
      this._sendToLLM(text);
    }

    // ── Find wizard ──────────────────────────────────────────────────────────
    _startFind() {
      this._mode = "find";
      this._findStep = 0;
      this._findCriteria = {};
      this._showFindStep();
    }

    _showFindStep() {
      const step = FIND_STEPS[this._findStep];
      const menu = step.options.map((o, i) => `${i + 1}. ${o.label} #find:opt:${i}`).join("\n");
      this._appendBot(`${step.question}\n\n[MENU]\n${menu}\n[/MENU]`);
    }

    _answerFind(index) {
      const step = FIND_STEPS[this._findStep];
      if (!step) return;
      const opt = step.options[index];
      if (opt) this._recordFind(opt);
    }

    _answerFindTyped(text) {
      const step = FIND_STEPS[this._findStep];
      if (!step) return;
      const opt = this._resolveOption(text, step.options);
      if (!opt) {
        const menu = step.options.map((o, i) => `${i + 1}. ${o.label} #find:opt:${i}`).join("\n");
        this._appendBot(`Por favor elige una de las opciones:\n\n[MENU]\n${menu}\n[/MENU]`);
        return;
      }
      this._recordFind(opt);
    }

    _recordFind(opt) {
      const step = FIND_STEPS[this._findStep];
      this._findCriteria[step.key] = opt;
      this._findStep++;
      if (this._findStep < FIND_STEPS.length) {
        this._showFindStep();
      } else {
        this._mode = "menu";
        this._findStep = -1;
        this._callRecommendation();
      }
    }

    _resolveOption(text, options) {
      const m = text.match(/^(\d+)(?:\.|$)/);
      if (m) {
        const i = parseInt(m[1], 10) - 1;
        if (i >= 0 && i < options.length) return options[i];
      }
      return options.find((o) => text.toLowerCase().includes(o.label.toLowerCase())) ?? null;
    }

    // ── Backend flows ────────────────────────────────────────────────────────
    async _callRecommendation() {
      const { budget, vehicleType, electricType } = this._findCriteria;
      const summary = `Busco ${vehicleType.display}, ${electricType.display}, presupuesto ${budget.display}`;
      this._abortCtrl?.abort();
      this._abortCtrl = new AbortController();
      this._loading = true;
      this._btnSend.disabled = true;
      const stopTyping = b(this._messagesEl);
      try {
        const reply = await S(
          this._apiUrl,
          {
            summary,
            budget: budget.value,
            vehicleType: vehicleType.value,
            electricType: electricType.value,
          },
          this._abortCtrl.signal
        );
        stopTyping();
        this._history.push({ role: "user", content: summary });
        this._history.push({ role: "assistant", content: reply });
        if (this._history.length > MAX_HISTORY) this._history = this._history.slice(-MAX_HISTORY);
        this._freeCount++;
        this._appendBot(reply);
        this._maybeUpsell();
      } catch (err) {
        if (err?.name === "AbortError") {
          stopTyping();
          return;
        }
        stopTyping();
        this._appendBot(ERROR_MENU);
      } finally {
        this._loading = false;
        this._btnSend.disabled = this._input.value.trim() === "";
        this._saveSession();
      }
    }

    async _sendToLLM(text) {
      this._history.push({ role: "user", content: text });
      if (this._history.length > MAX_HISTORY) this._history = this._history.slice(-MAX_HISTORY);
      this._abortCtrl?.abort();
      this._abortCtrl = new AbortController();
      this._loading = true;
      this._btnSend.disabled = true;
      const stopTyping = b(this._messagesEl);
      try {
        const reply = await w(this._apiUrl, this._history, this._abortCtrl.signal);
        stopTyping();
        this._history.push({ role: "assistant", content: reply });
        if (this._history.length > MAX_HISTORY) this._history = this._history.slice(-MAX_HISTORY);
        this._freeCount++;
        this._appendBot(reply);
        this._maybeUpsell();
      } catch (err) {
        if (err?.name === "AbortError") {
          stopTyping();
          return;
        }
        stopTyping();
        this._appendBot(ERROR_MENU);
      } finally {
        this._loading = false;
        this._btnSend.disabled = this._input.value.trim() === "";
        this._saveSession();
      }
    }
  }

  customElements.define("ev-chat-widget", EvChatWidget);
})();
