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

  function collapse() {
    setExpanded(false);
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
      {/* Collapsed — pestaña vertical pegada al borde izquierdo */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          title="Califica tu experiencia"
          style={{
            position: "fixed",
            left: 0,
            top: "42%",
            zIndex: 51,
            borderRadius: "0 8px 8px 0",
            padding: "16px 9px",
          }}
          className="bg-amber text-black flex flex-col items-center gap-2 shadow-lg hover:translate-x-0.5 transition-all duration-200"
        >
          <span
            className="material-symbols-outlined text-[17px]"
            style={{ fontVariationSettings: '"FILL" 1' }}
          >
            sentiment_satisfied
          </span>
          <span
            className="font-black text-[10px] uppercase tracking-widest"
            style={{ writingMode: "vertical-lr", transform: "rotate(180deg)" }}
          >
            Feedback
          </span>
        </button>
      )}

      {/* Expanded card — flota cerca de la pestaña */}
      {expanded && (
        <div
          style={{
            position: "fixed",
            left: "8px",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 51,
            width: "min(288px, calc(100vw - 24px))",
          }}
          className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
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
                  onClick={collapse}
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
                          className={`material-symbols-outlined text-[34px] transition-colors ${
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
