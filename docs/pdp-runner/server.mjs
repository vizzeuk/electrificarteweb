// pdp-runner: reemplazo del Managed Agent de Anthropic para el flujo v2 de creacion de PDPs.
// Misma forma de ciclo de vida que la web ya maneja (abrir → consultar → leer la entrega), pero
// cada "sesion" es un `opencode run` en esta VPS con el modelo que diga PDP_MODELO.
//
//   POST /v1/sesiones        {encargo, host, fichas?: [{id, ruta}], agente?, modelo?, variante?} → {id, status: "running"}
//                            agente: "pdp" (crear una ficha, default) | "revision" (re-check de precios)
//                            (`ficha_id` suelto = la del modelo, formato anterior)
//   GET  /v1/sesiones/:id    → {id, status: running|idle|terminated, contrato, ultimoMensaje, errores, segundos}
//   POST /v1/fichas          (PDF crudo) → {id: "file_oc_…"}   ·   DELETE /v1/fichas/:id
//   GET  /health
//
// Auth: header `x-runner-secret` = PDP_RUNNER_SECRET. Sin secreto configurado no arranca.
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync, appendFileSync, readdirSync, statSync, rmSync } from "node:fs";
import { join } from "node:path";
import { randomUUID, timingSafeEqual } from "node:crypto";

const DIR = new URL(".", import.meta.url).pathname;
const RUNS = join(DIR, "runs");
const SECRETO = process.env.PDP_RUNNER_SECRET ?? "";
const PUERTO = Number(process.env.PORT ?? 4100);
const MAX_PARALELO = Number(process.env.PDP_MAX_PARALELO ?? 2);
// Bajo el techo de n8n (12 min, FLUJO-PDP-N8N §3.5c): la corrida tiene que terminar con su
// razon antes de que n8n se rinda y la marque por su cuenta.
const TIMEOUT_S = Number(process.env.PDP_TIMEOUT_S ?? 600);
// Sin un solo evento del modelo en este rato = el proveedor no responde. Con la cuota agotada,
// opencode reintenta en silencio en vez de salir: sin esto esperariamos el timeout entero.
const SILENCIO_S = Number(process.env.PDP_SILENCIO_S ?? 240);
const MODELO = process.env.PDP_MODELO ?? "github-copilot/claude-sonnet-5";
// Esfuerzo de razonamiento: el Managed Agent corria con effort "high" (claude/agents/extractor-pdp.json).
const VARIANTE = process.env.PDP_VARIANTE ?? "high";
// Agentes de opencode.json. La revision de precios es extraccion acotada: sin esfuerzo extra.
const AGENTES = { pdp: { variante: VARIANTE }, revision: { variante: process.env.PDP_VARIANTE_REVISION ?? "" } };
const OPENCODE = process.env.OPENCODE_BIN ?? "opencode";
// Donde la web le dice al agente que esta la ficha (lib/pdp-creacion/ficha.ts → FICHA_RUTA).
const FICHAS = join(DIR, "fichas");
const esFichaId = (v) => typeof v === "string" && /^file_oc_[a-f0-9]{32}$/.test(v);
// Donde la web le dice al agente que estan las fichas (lib/pdp-creacion/ficha.ts): una ruta por PDF.
const RUTA_FICHA_WEB = /^\/mnt\/session\/uploads\/[a-z0-9-]+\.pdf$/;
const RUTA_FICHA_MODELO = "/mnt/session/uploads/ficha-tecnica.pdf";

if (!SECRETO) { console.error("Falta PDP_RUNNER_SECRET"); process.exit(1); }
const { PDP_RUNNER_SECRET: _fuera, ...entornoAgente } = process.env;
mkdirSync(RUNS, { recursive: true });
mkdirSync(FICHAS, { recursive: true });

/** id → { proc?, inicio, fin? } de esta vida del proceso. Lo demas se reconstruye del disco. */
const vivas = new Map();
const cola = [];

function autorizado(req) {
  const a = Buffer.from(String(req.headers["x-runner-secret"] ?? ""));
  const b = Buffer.from(SECRETO);
  return a.length === b.length && timingSafeEqual(a, b);
}

function json(res, status, cuerpo) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(cuerpo));
}

function leerBytes(req, max = 6 * 1024 * 1024) {
  return new Promise((ok, mal) => {
    let n = 0; const partes = [];
    req.on("data", (c) => { n += c.length; if (n > max) { mal(new Error("cuerpo demasiado grande")); req.destroy(); } else partes.push(c); });
    req.on("end", () => ok(Buffer.concat(partes)));
    req.on("error", mal);
  });
}

function leerCuerpo(req, max = 12 * 1024 * 1024) {
  return new Promise((ok, mal) => {
    let n = 0; const partes = [];
    req.on("data", (c) => { n += c.length; if (n > max) { mal(new Error("cuerpo demasiado grande")); req.destroy(); } else partes.push(c); });
    req.on("end", () => { try { ok(JSON.parse(Buffer.concat(partes).toString("utf8") || "{}")); } catch (e) { mal(e); } });
    req.on("error", mal);
  });
}

async function pdfATexto(pdfPath, txtPath) {
  const { extractText, getDocumentProxy } = await import(join(DIR, ".opencode/node_modules/unpdf/dist/index.mjs"));
  const pdf = await getDocumentProxy(new Uint8Array(readFileSync(pdfPath)));
  const { text } = await extractText(pdf, { mergePages: false });
  writeFileSync(txtPath, text.map((t, i) => `--- pagina ${i + 1} ---\n${t}`).join("\n"));
  // Fichas impresas como imagen (cidef.cl): el texto sale vacio. Esas se le adjuntan al modelo.
  const letras = text.join("").replace(/\s+/g, "").length;
  return { paginas: text.length, sinTexto: letras < 150 * Math.max(1, text.length) };
}

// Mas paginas que esto no se adjuntan como imagen: un catalogo entero no cabe en el contexto.
const MAX_PAGINAS_ADJUNTAS = Number(process.env.PDP_MAX_PAGINAS_ADJUNTAS ?? 12);

function arrancar(id) {
  const d = join(RUNS, id);
  const meta = JSON.parse(readFileSync(join(d, "meta.json"), "utf8"));
  const v = vivas.get(id);
  v.inicio = Date.now();
  const adjuntos = (meta.adjuntos ?? []).flatMap((p) => ["-f", p]);
  const agente = AGENTES[meta.agente] ? meta.agente : "pdp";
  const variante = meta.variante ?? AGENTES[agente].variante;
  const proc = spawn(OPENCODE, ["run", "--agent", agente, "-m", meta.modelo, "--format", "json", readFileSync(join(d, "encargo.txt"), "utf8"), ...adjuntos, ...(variante ? ["--variant", variante] : [])], {
    cwd: DIR,
    // Solo lo que las herramientas necesitan: el secreto del runner no entra al proceso del agente.
    env: { ...entornoAgente, PDP_HOST: meta.host, PDP_OUT: join(d, "contrato.json"), PDP_FICHAS: (meta.fichas ?? []).join("\n") },
    stdio: ["ignore", "pipe", "pipe"],
  });
  v.proc = proc;
  const cortar = (razon) => { appendFileSync(join(d, "stderr.log"), `\n${razon}\n`); proc.kill("SIGTERM"); };
  let silencio = setTimeout(() => cortar(`El modelo no respondio en ${SILENCIO_S / 60} min: cuota agotada o proveedor caido (${meta.modelo})`), SILENCIO_S * 1000);
  proc.stdout.on("data", (c) => {
    appendFileSync(join(d, "eventos.jsonl"), c);
    silencio.refresh();
  });
  proc.stderr.on("data", (c) => appendFileSync(join(d, "stderr.log"), c));
  const corte = setTimeout(() => cortar(`La corrida supero ${TIMEOUT_S / 60} min y se corto`), TIMEOUT_S * 1000);
  proc.on("close", (code) => {
    clearTimeout(corte);
    clearTimeout(silencio);
    writeFileSync(join(d, "fin.json"), JSON.stringify({ code, fin: Date.now(), segundos: Math.round((Date.now() - v.inicio) / 1000) }));
    v.proc = null; v.fin = Date.now();
    siguiente();
  });
}

function siguiente() {
  const corriendo = [...vivas.values()].filter((v) => v.proc).length;
  for (let i = corriendo; i < MAX_PARALELO && cola.length; i++) arrancar(cola.shift());
}

/** Estado de una corrida, leido del disco (sobrevive reinicios del runner). */
function estado(id) {
  const d = join(RUNS, id);
  if (!/^[a-f0-9-]{36}$/.test(id) || !existsSync(d)) return null;
  const contrato = existsSync(join(d, "contrato.json")) ? JSON.parse(readFileSync(join(d, "contrato.json"), "utf8")) : null;
  const fin = existsSync(join(d, "fin.json")) ? JSON.parse(readFileSync(join(d, "fin.json"), "utf8")) : null;
  const viva = vivas.get(id);
  const enCurso = !fin && viva && (viva.proc || cola.includes(id));
  const errores = [];
  let ultimoMensaje = null;
  if (existsSync(join(d, "eventos.jsonl"))) {
    for (const l of readFileSync(join(d, "eventos.jsonl"), "utf8").split("\n")) {
      if (!l.trim()) continue;
      try {
        const e = JSON.parse(l);
        if (e.type === "text" && e.part?.text) ultimoMensaje = String(e.part.text).slice(0, 800);
        if (e.type === "error") errores.unshift(String(e.error?.data?.message ?? e.error?.message ?? JSON.stringify(e.error)).slice(0, 300));
      } catch {}
    }
  }
  if (fin && fin.code !== 0 && !contrato) {
    const err = existsSync(join(d, "stderr.log")) ? readFileSync(join(d, "stderr.log"), "utf8").trim().split("\n").filter((l) => l.trim()).slice(-1)[0] ?? "" : "";
    errores.unshift(err ? err.slice(0, 300) : `opencode salio con codigo ${fin.code}`);
  }
  // `idle` = termino (igual que una sesion de Anthropic que espera el resultado del tool).
  // `terminated` = el runner se reinicio a mitad de la corrida: no va a terminar nunca.
  const status = enCurso ? "running" : fin ? "idle" : "terminated";
  // Lo que leyo el agente, solo al terminar (la web confirma cifras contra esto).
  const pagPath = join(d, "contrato.json.paginas.txt");
  const paginas = status !== "running" && existsSync(pagPath) ? readFileSync(pagPath, "utf8").slice(0, 300_000) : undefined;
  return { id, status, contrato, ultimoMensaje, errores, paginas, segundos: fin?.segundos ?? (viva?.inicio ? Math.round((Date.now() - viva.inicio) / 1000) : 0), modelo: JSON.parse(readFileSync(join(d, "meta.json"), "utf8")).modelo };
}

/** Borra corridas de mas de 30 dias: los logs son para depurar, no un archivo historico. */
function limpiar() {
  const limite = Date.now() - 30 * 86400_000;
  for (const f of readdirSync(FICHAS)) {
    try { if (statSync(join(FICHAS, f)).mtimeMs < limite) rmSync(join(FICHAS, f)); } catch {}
  }
  for (const id of readdirSync(RUNS)) {
    const d = join(RUNS, id);
    try { if (statSync(d).isDirectory() && /^[a-f0-9-]{36}$/.test(id) && statSync(d).mtimeMs < limite) rmSync(d, { recursive: true }); } catch {}
  }
}
setInterval(limpiar, 6 * 3600_000).unref();

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://x");
    if (url.pathname === "/health") return json(res, 200, { ok: true, modelo: MODELO, corriendo: [...vivas.values()].filter((v) => v.proc).length, en_cola: cola.length });
    if (!autorizado(req)) return json(res, 401, { error: "Unauthorized" });

    if (req.method === "POST" && url.pathname === "/v1/sesiones") {
      const b = await leerCuerpo(req);
      const host = String(b.host ?? "").toLowerCase().replace(/^www\./, "");
      let encargo = String(b.encargo ?? "");
      if (!host || !/^[a-z0-9.-]+$/.test(host) || !encargo.trim()) return json(res, 400, { error: "Faltan encargo y host" });
      const id = randomUUID();
      const d = join(RUNS, id);
      mkdirSync(d, { recursive: true });
      const fichas = Array.isArray(b.fichas) ? b.fichas : b.ficha_id ? [{ id: b.ficha_id, ruta: RUTA_FICHA_MODELO }] : [];
      for (const f of fichas) {
        if (!esFichaId(f?.id) || !existsSync(join(FICHAS, `${f.id}.pdf`))) return json(res, 422, { error: `No existe la ficha ${f?.id}` });
        if (!RUTA_FICHA_WEB.test(String(f.ruta))) return json(res, 422, { error: `Ruta de ficha invalida: ${f.ruta}` });
      }
      // Cada ficha se pasa a texto en su propio archivo y su ruta del encargo apunta a ese .txt:
      // el modelo sabe de que version es cada una. `read` solo puede abrir estos.
      const leibles = [];
      const adjuntos = [];
      for (const [n, f] of fichas.entries()) {
        // Con el nombre de su ruta (ficha-tecnica.pdf, ficha-version-2.pdf): asi el modelo distingue
        // de que version es cada adjunto.
        const pdf = join(d, f.ruta.split("/").pop());
        const txt = join(d, `ficha-${n + 1}.txt`);
        writeFileSync(pdf, readFileSync(join(FICHAS, `${f.id}.pdf`)));
        const { paginas, sinTexto } = await pdfATexto(pdf, txt);
        if (sinTexto && paginas <= MAX_PAGINAS_ADJUNTAS) {
          encargo = encargo.split(f.ruta).join(`el PDF adjunto a este mensaje "${f.ruta.split("/").pop()}" (es una imagen: leelo directo, no con \`read\`)`);
          adjuntos.push(pdf);
        } else {
          encargo = encargo.split(f.ruta).join(txt);
          leibles.push(txt);
        }
      }
      writeFileSync(join(d, "encargo.txt"), encargo);
      const agente = AGENTES[b.agente] ? b.agente : "pdp";
      const variante = typeof b.variante === "string" && /^[a-z]{0,12}$/.test(b.variante) ? b.variante : undefined;
      writeFileSync(join(d, "meta.json"), JSON.stringify({ host, agente, ...(variante !== undefined ? { variante } : {}), modelo: String(b.modelo || MODELO), titulo: String(b.titulo ?? "").slice(0, 200), fichas: leibles, adjuntos, creada: new Date().toISOString() }));
      vivas.set(id, { proc: null });
      cola.push(id);
      siguiente();
      return json(res, 200, { id, status: "running" });
    }

    if (req.method === "POST" && url.pathname === "/v1/fichas") {
      const pdf = await leerBytes(req);
      if (pdf.subarray(0, 5).toString("latin1") !== "%PDF-") return json(res, 422, { error: "No es un PDF" });
      const id = `file_oc_${randomUUID().replace(/-/g, "")}`;
      writeFileSync(join(FICHAS, `${id}.pdf`), pdf);
      return json(res, 201, { id });
    }
    const f = url.pathname.match(/^\/v1\/fichas\/([^/]+)$/);
    if (req.method === "DELETE" && f) {
      if (esFichaId(f[1])) rmSync(join(FICHAS, `${f[1]}.pdf`), { force: true });
      return json(res, 200, { ok: true });
    }

    const m = url.pathname.match(/^\/v1\/sesiones\/([^/]+)$/);
    if (req.method === "GET" && m) {
      const e = estado(m[1]);
      return e ? json(res, 200, e) : json(res, 404, { error: "No existe" });
    }
    if (req.method === "POST" && url.pathname.match(/^\/v1\/sesiones\/[^/]+\/cancelar$/)) {
      const id = url.pathname.split("/")[3];
      const v = vivas.get(id);
      const i = cola.indexOf(id); if (i >= 0) cola.splice(i, 1);
      v?.proc?.kill("SIGTERM");
      return json(res, 200, { ok: true });
    }
    return json(res, 404, { error: "No existe" });
  } catch (e) {
    return json(res, 500, { error: e instanceof Error ? e.message : String(e) });
  }
}).listen(PUERTO, "0.0.0.0", () => console.log(`pdp-runner en :${PUERTO} · modelo ${MODELO}`));
