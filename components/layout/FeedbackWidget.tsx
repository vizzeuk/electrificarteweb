"use client";

import { useState, useEffect } from "react";

const SEEN_KEY = "ea_feedback_ts";
const DAYS_UNTIL_RESHOWN = 30;

// 5 caritas que mapean al rating 1-5 que sigue recibiendo n8n/Supabase.
// Los colores se aplican solo en la cara activa (hover o seleccionada).
const FACES = [
  { icon: "sentiment_very_dissatisfied", color: "text-red-500",     label: "Muy mal" },
  { icon: "sentiment_dissatisfied",      color: "text-orange-500",  label: "Mal" },
  { icon: "sentiment_neutral",           color: "text-amber-500",   label: "Regular" },
  { icon: "sentiment_satisfied",         color: "text-lime-500",    label: "Bien" },
  { icon: "sentiment_very_satisfied",    color: "text-emerald-500", label: "Excelente" },
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
      {/* Collapsed — botón discreto anclado abajo-izquierda (simétrico al chat
          de la derecha). Icono solo en mobile; icono + label en sm+. */}
      {!expanded && (
        <div
          style={{
            position: "fixed",
            left: "1rem",
            bottom: "calc(1rem + env(safe-area-inset-bottom))",
            zIndex: 40,
          }}
        >
          <button
            onClick={() => setExpanded(true)}
            title="Califica tu experiencia"
            aria-label="Danos tu opinión"
            className="flex items-center justify-center gap-2 bg-amber text-black rounded-full shadow-lg h-12 w-12 sm:h-auto sm:w-auto sm:px-4 sm:py-3 hover:brightness-105 active:scale-95 transition-all duration-200"
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: '"FILL" 1' }}
            >
              sentiment_satisfied
            </span>
            <span className="hidden sm:inline font-black text-[11px] uppercase tracking-widest">
              Feedback
            </span>
          </button>
          {/* Descartar — oculta el widget (no reaparece por 30 días) */}
          <button
            onClick={dismiss}
            aria-label="Ocultar feedback"
            title="Ocultar"
            className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black text-white/70 shadow-md hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[12px]">close</span>
          </button>
        </div>
      )}

      {/* Expanded card — se despliega desde abajo-izquierda, responsive */}
      {expanded && (
        <div
          style={{
            position: "fixed",
            left: "1rem",
            bottom: "calc(1rem + env(safe-area-inset-bottom))",
            zIndex: 41,
            width: "min(320px, calc(100vw - 2rem))",
            maxHeight: "calc(100dvh - 2rem)",
          }}
          className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-y-auto"
        >
          {submitted ? (
            <div className="px-5 py-8 text-center">
              <span
                className="material-symbols-outlined text-[48px] text-emerald-500 block mb-3"
                style={{ fontVariationSettings: '"FILL" 1' }}
              >
                sentiment_very_satisfied
              </span>
              <p className="font-headline font-black text-lg">¡Gracias por tu opinión!</p>
              <p className="text-gray-500 text-sm mt-1 leading-snug">
                Tu feedback nos ayuda a mejorar la experiencia para todos.
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-black">
                <p className="text-white font-bold text-sm">Tu experiencia</p>
                <button
                  onClick={dismiss}
                  className="text-white/50 hover:text-white transition-colors"
                  aria-label="Cerrar"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <div className="p-4">
                <p className="text-sm font-semibold text-gray-800 leading-snug mb-1">
                  ¿Cómo fue tu experiencia en Electrificarte?
                </p>
                <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                  Cuéntanos cómo podemos mejorar el sitio para ayudarte mejor.
                </p>

                {/* Caritas — cada una con su color individual, solo se pinta la activa.
                    onMouseLeave en el contenedor evita parpadeo al cruzar entre botones. */}
                <div
                  className="flex mb-3 justify-between"
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
                        title={face.label}
                        className="transition-transform hover:scale-125 active:scale-95"
                      >
                        <span
                          className={`material-symbols-outlined text-[28px] sm:text-[34px] transition-colors ${
                            isActive ? face.color : "text-gray-300"
                          }`}
                          style={{ fontVariationSettings: '"FILL" 1' }}
                        >
                          {face.icon}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Label de la opción activa para guiar al usuario */}
                <p className="text-center text-xs font-semibold text-gray-500 mb-3 min-h-[1em]">
                  {hovered ? FACES[hovered - 1].label : rating ? FACES[rating - 1].label : ""}
                </p>

                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="¿Qué podríamos mejorar? (opcional)"
                  rows={2}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all mb-3 placeholder:text-gray-300"
                />

                <button
                  onClick={handleSubmit}
                  disabled={rating === 0 || sending}
                  className="w-full bg-primary hover:bg-primary-deep text-black font-bold text-sm py-2.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {sending ? "Enviando…" : "Enviar feedback"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
