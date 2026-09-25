"use client";

import { useState, useEffect } from "react";
import { Icon } from "@/components/ui/Icon";

const SEEN_KEY = "ea_feedback_ts";
const DAYS_UNTIL_RESHOWN = 30;

// 5 caritas que mapean al rating 1-5 que sigue recibiendo n8n/Supabase.
const FACES = [
  { icon: "sentiment_very_dissatisfied", label: "Muy mal" },
  { icon: "sentiment_dissatisfied", label: "Mal" },
  { icon: "sentiment_neutral", label: "Regular" },
  { icon: "sentiment_satisfied", label: "Bien" },
  { icon: "sentiment_very_satisfied", label: "Excelente" },
];

export function FeedbackWidget() {
  const [hidden, setHidden]       = useState(true);
  const [expanded, setExpanded]   = useState(false);
  const [rating, setRating]       = useState(0);
  const [hovered, setHovered]     = useState(0);
  const [comment, setComment]     = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending]     = useState(false);

  useEffect(() => {
    // Defer all setup until the browser is idle so we don't compete with
    // the initial paint. The widget is below-the-fold and never shown
    // before user interaction; pushing it past LCP is free perf.
    let cancelled = false;
    let mountTimer: ReturnType<typeof setTimeout> | null = null;
    let popTimer:   ReturnType<typeof setTimeout> | null = null;
    let idleId: number | null = null;

    function init() {
      if (cancelled) return;
      const ts = localStorage.getItem(SEEN_KEY);
      if (ts) {
        const daysSince = (Date.now() - parseInt(ts)) / 86_400_000;
        if (daysSince < DAYS_UNTIL_RESHOWN) return;
      }
      setHidden(false);
      popTimer = setTimeout(() => {
        setExpanded(prev => (!prev ? true : prev));
      }, 5 * 60 * 1000);
    }

    if (typeof (window as any).requestIdleCallback === "function") {
      idleId = (window as any).requestIdleCallback(init, { timeout: 4000 });
    } else {
      mountTimer = setTimeout(init, 2500);
    }

    return () => {
      cancelled = true;
      if (mountTimer) clearTimeout(mountTimer);
      if (popTimer)   clearTimeout(popTimer);
      if (idleId && typeof (window as any).cancelIdleCallback === "function") {
        (window as any).cancelIdleCallback(idleId);
      }
    };
  }, []);

  // Oculta el widget y persiste el descarte: la lógica de lectura en el
  // useEffect ya respeta SEEN_KEY, así que no reaparece por 30 días.
  function dismiss() {
    setExpanded(false);
    setHidden(true);
    try {
      localStorage.setItem(SEEN_KEY, Date.now().toString());
    } catch {}
  }

  async function handleSubmit() {
    if (rating === 0 || sending) return;
    setSending(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment.trim() || undefined, page: window.location.pathname }),
      });
    } catch {
      // silently ignore
    }
    setSending(false);
    localStorage.setItem(SEEN_KEY, Date.now().toString());
    setSubmitted(true);
    setTimeout(() => {
      setExpanded(false);
      setHidden(true);
    }, 2500);
  }

  if (hidden) return null;

  return (
    <>
      {/* Colapsado: botón discreto abajo a la izquierda (simétrico al chat de la
          derecha). Solo ícono en móvil; ícono + texto desde sm. */}
      {!expanded && (
        <div
          style={{
            position: "fixed",
            left: "1rem",
            bottom: "calc(var(--sticky-h, 0px) + 1rem + env(safe-area-inset-bottom))", // sobre la barra fija (StickyCTA)
            transition: "bottom 0.3s ease",
            zIndex: 47, // sobre el chat (45-46) y la barra fija (40), bajo la navegación (50) y los modales (100)
          }}
          className="feedback-widget flex items-center gap-1"
        >
          <button
            type="button"
            onClick={() => setExpanded(true)}
            title="Califica tu experiencia"
            aria-label="Danos tu opinión"
            className="btn btn--secondary btn--icon bg-canvas sm:w-auto sm:px-4"
          >
            <Icon name="sentiment_satisfied" size="none" />
            <span className="hidden sm:inline">Tu opinión</span>
          </button>
          {/* Descartar: oculta el widget (no reaparece por 30 días) */}
          <button
            type="button"
            onClick={dismiss}
            aria-label="Ocultar opinión"
            title="Ocultar"
            className="btn btn--secondary btn--icon btn--sm bg-canvas"
          >
            <Icon name="close" size="none" />
          </button>
        </div>
      )}

      {/* Abierto: tarjeta que se despliega desde abajo a la izquierda */}
      {expanded && (
        <div
          style={{
            position: "fixed",
            left: "1rem",
            bottom: "calc(var(--sticky-h, 0px) + 1rem + env(safe-area-inset-bottom))", // sobre la barra fija (StickyCTA)
            transition: "bottom 0.3s ease",
            zIndex: 48, // sobre el chat (45-46), bajo la navegación (50) y los modales (100)
            width: "min(320px, calc(100vw - 2rem))",
            maxHeight: "calc(100dvh - 6rem)", // aire para el teclado del celular
          }}
          className="feedback-widget overflow-y-auto rounded-card border border-line bg-surface text-ink shadow-overlay"
        >
          {submitted ? (
            <div className="px-5 py-8 text-center">
              <Icon name="sentiment_very_satisfied" className="mb-3 block text-[40px] text-accent" filled />
              <p className="font-display text-xl font-bold">Gracias por tu opinión</p>
              <p className="mt-1 text-sm text-ink-2">
                Nos ayuda a mejorar el sitio para todos.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-line py-2 pl-5 pr-2">
                <p className="text-[15px] font-semibold">Tu experiencia</p>
                <button
                  type="button"
                  onClick={dismiss}
                  className="btn btn--quiet btn--icon btn--sm"
                  aria-label="Cerrar"
                >
                  <Icon name="close" size="none" />
                </button>
              </div>

              <div className="p-5">
                <p className="text-[15px] font-semibold leading-snug">
                  ¿Cómo fue tu experiencia en Electrificarte?
                </p>
                <p className="mt-1 text-sm text-ink-2">
                  Cuéntanos qué podemos mejorar.
                </p>

                {/* Caritas: solo se pinta la activa, siempre con el color de acento.
                    onMouseLeave en el contenedor evita parpadeo al cruzar entre botones. */}
                <div
                  className="mt-4 flex justify-between"
                  onMouseLeave={() => setHovered(0)}
                >
                  {FACES.map((face, i) => {
                    const n = i + 1;
                    const isActive = hovered ? hovered === n : rating === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        onMouseEnter={() => setHovered(n)}
                        onClick={() => setRating(n)}
                        aria-label={face.label}
                        aria-pressed={rating === n}
                        title={face.label}
                        className="rounded-control p-1"
                      >
                        <Icon
                          name={face.icon}
                          className={`text-[32px] transition-colors ${isActive ? "text-accent" : "text-line-2"}`}
                          filled
                        />
                      </button>
                    );
                  })}
                </div>

                {/* Etiqueta de la opción activa para guiar al usuario */}
                <p className="mb-3 mt-1 min-h-[1.25em] text-center text-label font-semibold text-ink-2">
                  {hovered ? FACES[hovered - 1].label : rating ? FACES[rating - 1].label : ""}
                </p>

                <label htmlFor="feedback-comment" className="sr-only">Comentario (opcional)</label>
                <textarea
                  id="feedback-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="¿Qué podríamos mejorar? (opcional)"
                  rows={2}
                  className="input mb-3 h-auto resize-none py-3 text-[15px] leading-normal"
                />

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={rating === 0 || sending}
                  className="btn btn--primary btn--block"
                >
                  {sending ? "Enviando…" : "Enviar opinión"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
