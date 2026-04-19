(function(){"use strict";function v(a="#16A34A"){return`
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :host {
      --color-primary: ${a};
      --color-bg: #0F172A;
      --color-surface: #1E293B;
      --color-border: #334155;
      --color-text: #F1F5F9;
      --color-text-muted: #94A3B8;
      --color-user-bubble: var(--color-primary);
      --color-bot-bubble: var(--color-surface);
      --radius: 16px;
      --shadow: 0 8px 32px rgba(0,0,0,0.4);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    /* Launcher bubble */
    #launcher {
      position: fixed;
      bottom: 24px;
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
      box-shadow: var(--shadow);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      z-index: 9999;
    }
    #launcher:hover { transform: scale(1.08); box-shadow: 0 12px 40px rgba(0,0,0,0.5); }
    #launcher svg { width: 26px; height: 26px; fill: white; }
    #launcher.open svg.icon-chat { display: none; }
    #launcher:not(.open) svg.icon-close { display: none; }

    /* Chat panel */
    #panel {
      position: fixed;
      bottom: 92px;
      right: 24px;
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
      background: var(--color-surface);
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
    }
    #header-avatar svg { width: 20px; height: 20px; fill: white; }
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
      color: white;
      border-bottom-right-radius: 4px;
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
      border: 1px solid var(--color-primary);
      color: var(--color-primary);
      border-radius: 20px;
      padding: 7px 14px;
      font-size: 13px;
      cursor: pointer;
      text-align: left;
      transition: background 0.15s, color 0.15s;
      line-height: 1.4;
    }
    .menu-btn:hover {
      background: rgba(0, 229, 229, 0.1);
      color: var(--color-text);
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
      background: var(--color-surface);
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
    #btn-send svg { width: 16px; height: 16px; fill: white; }

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
  `}function _(a){const e=/\[MENU\]([\s\S]*?)\[\/MENU\]/g,t=[];let s=a,i;for(;(i=e.exec(a))!==null;){const d=i[1].split(`
`).map(r=>r.trim()).filter(Boolean);for(const r of d){const l=r.match(/^(\d+)\.\s+(.+?)\s+→\s+((?:https?:\/\/|\/)\S+)$/);if(l){t.push({number:l[1],label:l[2],url:l[3]});continue}const o=r.match(/^(\d+)\.\s+(.+)$/);o&&t.push({number:o[1],label:o[2]})}}return s=a.replace(/\[MENU\][\s\S]*?\[\/MENU\]/g,"").trim(),{text:s,menuItems:t}}function y(a){return`
    <button id="launcher" aria-label="Abrir chat" aria-expanded="false">
      <svg class="icon-chat" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
      </svg>
      <svg class="icon-close" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>
    </button>

    <div id="panel" role="dialog" aria-label="Chat de asistencia" aria-hidden="true">
      <div id="header">
        <div id="header-avatar">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.656 5.344C15.892 3.58 13.54 2.5 11 2.5 5.754 2.5 1.5 6.754 1.5 12S5.754 21.5 11 21.5c5.246 0 9.5-4.254 9.5-9.5 0-2.54-1.08-4.892-2.844-6.656zM11 19.5C6.86 19.5 3.5 16.14 3.5 12S6.86 4.5 11 4.5s7.5 3.36 7.5 7.5-3.36 7.5-7.5 7.5zm.5-12.5h-1v6l5.25 3.15.75-1.23-4-2.37V7z"/>
          </svg>
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
        ></textarea>
        <button id="btn-send" aria-label="Enviar" disabled>
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    </div>
  `}function c(a,e,t,s){const i=document.createElement("div");if(i.className=`msg ${e}`,e==="bot"){const{text:n,menuItems:d}=_(t);if(n){const r=document.createElement("div");r.className="bubble",r.innerHTML=x(n),i.appendChild(r)}if(d.length>0){const r=document.createElement("div");r.className="menu-options";for(const l of d)if(l.url){const o=document.createElement("a");o.className="menu-btn",o.textContent=`${l.number}. ${l.label}`;const m=/^(https?:\/\/|\/)[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]*$/.test(l.url)?l.url.replace(/"/g,"%22"):"/";o.href=m,r.appendChild(o)}else{const o=document.createElement("button");o.className="menu-btn",o.textContent=`${l.number}. ${l.label}`,o.addEventListener("click",()=>s(l.number,l.label)),r.appendChild(o)}i.appendChild(r)}}else{const n=document.createElement("div");n.className="bubble",n.textContent=t,i.appendChild(n)}return a.appendChild(i),a.scrollTop=a.scrollHeight,i}function b(a){const e=document.createElement("div");return e.className="msg bot",e.innerHTML='<div class="typing"><span></span><span></span><span></span></div>',a.appendChild(e),a.scrollTop=a.scrollHeight,()=>e.remove()}function g(a){return String(a).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function x(a){let e=g(a);return e=e.replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>"),e=e.replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]*)\)/g,(t,s,i)=>/^(https?:\/\/|\/)[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]*$/.test(i)?`<a href="${i.replace(/"/g,"%22")}" class="chat-link" target="_blank" rel="noopener noreferrer">${s}</a>`:s),e=e.replace(/\|[-:\s|]+\|/g,"").replace(/\|[^\n<]+\|/g,""),e=e.replace(/\n{3,}/g,`

`).trim(),e}async function w(a,e){const t=await fetch(`${a}/api/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:e})});if(!t.ok){const i=await t.json().catch(()=>({}));throw new Error(i.error||"Error al conectar con el servidor.")}return(await t.json()).message??""}async function S(a,e){const t=await fetch(`${a}/api/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:"recommend",...e})});if(!t.ok){const i=await t.json().catch(()=>({}));throw new Error(i.error||"Error al conectar con el servidor.")}return(await t.json()).message??""}const h=20,p="ev_chat_history",f=`¡Hola! Soy el asistente de Electrificarte. ¿En qué puedo ayudarte hoy?

[MENU]
1. Quiero encontrar mi modelo ideal
2. Quiero información de un modelo específico
3. ¿Cuánto ahorro versus bencina?
4. Quiero contactar al equipo
[/MENU]`,u=[{key:"budget",question:"¿Cuál es tu presupuesto aproximado?",options:[{label:"Hasta 15 millones CLP",value:"hasta-15",display:"hasta 15 millones CLP"},{label:"15 a 30 millones CLP",value:"15-30",display:"15 a 30 millones CLP"},{label:"30 a 50 millones CLP",value:"30-50",display:"30 a 50 millones CLP"},{label:"Más de 50 millones CLP",value:"mas-50",display:"más de 50 millones CLP"}]},{key:"vehicleType",question:"¿Qué tipo de carrocería prefieres?",options:[{label:"SUV o Crossover",value:"suv",display:"SUV o Crossover"},{label:"Sedán",value:"sedan",display:"Sedán"},{label:"Hatchback o City car",value:"hatchback",display:"Hatchback o City car"},{label:"Pickup",value:"pickup",display:"Pickup"},{label:"Sin preferencia",value:"any",display:"cualquier carrocería"}]},{key:"electricType",question:"¿Prefieres un auto 100% eléctrico o también consideras híbridos?",options:[{label:"100% eléctrico",value:"electric",display:"100% eléctrico"},{label:"Híbrido o enchufable",value:"hybrid",display:"híbrido o enchufable"},{label:"Me da igual",value:"any",display:"cualquier tipo"}]}];class E extends HTMLElement{constructor(){super(),this._shadow=this.attachShadow({mode:"open"}),this._history=[],this._isOpen=!1,this._loading=!1,this._savingsState=null,this._savingsKm=null,this._findStep=-1,this._findCriteria={}}connectedCallback(){this._apiUrl=this.dataset.apiUrl||"",this._botName=this.dataset.botName||"Asistente",this._primaryColor=this.dataset.primaryColor||"#00E5E5";const e=document.createElement("style");e.textContent=v(this._primaryColor),this._shadow.appendChild(e);const t=document.createElement("div");t.innerHTML=y(this._botName),this._shadow.appendChild(t),this._launcher=this._shadow.getElementById("launcher"),this._panel=this._shadow.getElementById("panel"),this._messagesEl=this._shadow.getElementById("messages"),this._input=this._shadow.getElementById("input"),this._btnSend=this._shadow.getElementById("btn-send"),this._btnClear=this._shadow.getElementById("btn-clear"),this._launcher.addEventListener("click",()=>this._togglePanel()),this._btnSend.addEventListener("click",()=>this._handleSend()),this._btnClear.addEventListener("click",()=>this._clearChat()),this._input.addEventListener("keydown",s=>{s.key==="Enter"&&!s.shiftKey&&(s.preventDefault(),this._handleSend())}),this._input.addEventListener("input",()=>{this._btnSend.disabled=this._input.value.trim()===""||this._loading,this._input.style.height="auto",this._input.style.height=Math.min(this._input.scrollHeight,80)+"px"}),this._restoreSession()}_saveSession(){try{sessionStorage.setItem(p,JSON.stringify(this._history))}catch{}}_restoreSession(){try{const e=sessionStorage.getItem(p);if(e&&(this._history=JSON.parse(e),this._history.length>0)){for(const t of this._history)c(this._messagesEl,t.role==="user"?"user":"bot",t.content,(s,i)=>this._handleMenuSelect(s,i));return}}catch{sessionStorage.removeItem(p)}this._showBotMessage(f)}_togglePanel(){this._isOpen=!this._isOpen,this._launcher.classList.toggle("open",this._isOpen),this._panel.classList.toggle("visible",this._isOpen),this._panel.setAttribute("aria-hidden",String(!this._isOpen)),this._launcher.setAttribute("aria-expanded",String(this._isOpen)),this._isOpen&&requestAnimationFrame(()=>this._input.focus())}_clearChat(){this._history=[],this._savingsState=null,this._savingsKm=null,this._findStep=-1,this._findCriteria={},this._messagesEl.innerHTML="",sessionStorage.removeItem(p),this._showBotMessage(f)}_showBotMessage(e){c(this._messagesEl,"bot",e,(t,s)=>this._handleMenuSelect(t,s))}_handleMenuSelect(e,t){this._loading||this._submitUserMessage(`${e}. ${t}`)}async _handleSend(){const e=this._input.value.trim();!e||this._loading||(this._input.value="",this._input.style.height="auto",this._btnSend.disabled=!0,this._submitUserMessage(e))}async _submitUserMessage(e){if(e.includes("Empezar de nuevo")||e.includes("Volver al inicio")){c(this._messagesEl,"user",e,()=>{}),this._clearChat();return}if(this._isSavingsFlow(e)){this._handleSavingsFlow(e);return}if(this._isContactFlow(e)){this._handleContactFlow();return}if(this._isFindFlow(e)){this._handleFindFlow(e);return}c(this._messagesEl,"user",e,()=>{}),this._history.push({role:"user",content:e}),this._history.length>h&&(this._history=this._history.slice(-h)),this._loading=!0,this._btnSend.disabled=!0;const t=b(this._messagesEl);try{const s=await w(this._apiUrl,this._history);t(),this._history.push({role:"assistant",content:s}),this._history.length>h&&(this._history=this._history.slice(-h)),this._saveSession(),this._showBotMessage(s)}catch{t(),this._showBotMessage(`Lo siento, hubo un problema al conectar. Por favor intenta nuevamente.

[MENU]
1. Volver al inicio
[/MENU]`)}finally{this._loading=!1,this._btnSend.disabled=this._input.value.trim()===""}}_isFindFlow(e){return this._findStep>=0?!0:e==="1. Quiero encontrar mi modelo ideal"||e==="1"&&this._savingsState===null}_handleFindFlow(e){if(this._findStep<0){c(this._messagesEl,"user",e,()=>{}),this._findStep=0,this._findCriteria={},this._showFindStep();return}const t=u[this._findStep],s=this._resolveOption(e,t.options);if(!s){this._showBotMessage(`Por favor elige una de las opciones del menú.

[MENU]
${t.options.map((i,n)=>`${n+1}. ${i.label}`).join(`
`)}
[/MENU]`);return}c(this._messagesEl,"user",`${t.options.indexOf(s)+1}. ${s.label}`,()=>{}),this._findCriteria[t.key]=s,this._findStep++,this._findStep<u.length?this._showFindStep():(this._findStep=-1,this._callRecommendation())}_resolveOption(e,t){const s=e.match(/^(\d+)(?:\.|$)/);if(s){const i=parseInt(s[1])-1;if(i>=0&&i<t.length)return t[i]}return t.find(i=>e.toLowerCase().includes(i.label.toLowerCase()))??null}_showFindStep(){const e=u[this._findStep],t=e.options.map((s,i)=>`${i+1}. ${s.label}`).join(`
`);this._showBotMessage(`${e.question}

[MENU]
${t}
[/MENU]`)}async _callRecommendation(){const{budget:e,vehicleType:t,electricType:s}=this._findCriteria,i=`Busco ${t.display}, ${s.display}, presupuesto ${e.display}`;this._loading=!0,this._btnSend.disabled=!0;const n=b(this._messagesEl);try{const d=await S(this._apiUrl,{summary:i,budget:e.value,vehicleType:t.value,electricType:s.value});n(),this._history.push({role:"user",content:i}),this._history.push({role:"assistant",content:d}),this._history.length>h&&(this._history=this._history.slice(-h)),this._saveSession(),this._showBotMessage(d)}catch{n(),this._showBotMessage(`Lo siento, hubo un problema al buscar opciones. Por favor intenta nuevamente.

[MENU]
1. Volver al inicio
[/MENU]`)}finally{this._loading=!1,this._btnSend.disabled=this._input.value.trim()===""}}_isSavingsFlow(e){return this._savingsState!==null?!0:e==="3. ¿Cuánto ahorro versus bencina?"||e==="3"&&this._findStep<0}_handleSavingsFlow(e){if(this._savingsState===null){c(this._messagesEl,"user",e,()=>{}),this._savingsState="ask_km",this._showBotMessage(`¿Cuántos kilómetros recorres al mes aproximadamente?
(Solo escribe el número, por ejemplo: 1500)`);return}if(this._savingsState==="ask_km"){const t=parseFloat(e.replace(/\./g,"").replace(",","."));if(c(this._messagesEl,"user",e,()=>{}),isNaN(t)||t<=0){this._showBotMessage("Por favor ingresa un número válido. Por ejemplo: 1500");return}this._savingsKm=t,this._savingsState="ask_price",this._showBotMessage(`Anotado: ${t.toLocaleString("es-CL")} km/mes.

¿Cuál es el precio del litro de bencina que usas habitualmente?
(Presiona Enter para usar el valor por defecto: $1.200 CLP/L)`);return}if(this._savingsState==="ask_price"){c(this._messagesEl,"user",e,()=>{});let t=1200;const s=parseFloat(e.trim().replace(/\./g,"").replace(",","."));!isNaN(s)&&s>0&&(t=s);const i=this._savingsKm,n=i/100*10*t,d=i/100*18*130,r=n-d,l=r*12;this._savingsState=null,this._savingsKm=null;const o=m=>Math.round(m).toLocaleString("es-CL");this._showBotMessage(`Resultado para ${o(i)} km/mes con bencina a $${o(t)}/L:

Costo mensual con bencina: $${o(n)} CLP
Costo mensual con eléctrico: $${o(d)} CLP
Ahorro mensual estimado: $${o(r)} CLP
Ahorro anual estimado: $${o(l)} CLP

[MENU]
1. Ver autos disponibles → /marcas
2. Ir a contacto → /contacto
3. Empezar de nuevo
[/MENU]`)}}_isContactFlow(e){return e==="4. Quiero contactar al equipo"||e==="4"&&this._findStep<0&&this._savingsState===null||e.includes("Quiero contactar al equipo")}_handleContactFlow(){c(this._messagesEl,"user","4. Quiero contactar al equipo",()=>{}),this._showBotMessage(`Te conectamos con nuestro equipo.

[MENU]
1. Solicitar oferta personalizada → /solicitar
2. Enviar mensaje al equipo → /contacto
3. Empezar de nuevo
[/MENU]`)}}customElements.define("ev-chat-widget",E)})();
