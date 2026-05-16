"use client";

import { useState, useEffect } from "react";

const SEEN_KEY = "ea_feedback_ts";
const DAYS_UNTIL_RESHOWN = 30;

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

  // Bubble sits to the LEFT of the chatbot button (chatbot is at right:24px, width:56px → bubble at right:92px)
  const bubbleRight = "92px";
  const bubbleBottom = "calc(var(--sticky-h, 0px) + 24px)";

  return (
    <>
      {/* Collapsed bubble — same size as chatbot (56px), left of chatbot */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          title="Califica tu experiencia"
          style={{
            position: "fixed",
            bottom: bubbleBottom,
            right: bubbleRight,
            zIndex: 51,
            transition: "bottom 0.3s ease",
          }}
          className="w-14 h-14 rounded-full bg-amber text-black flex items-center justify-center shadow-lg hover:scale-110 hover:shadow-xl transition-all duration-200"
        >
          <span
            className="material-symbols-outlined text-[24px]"
            style={{ fontVariationSettings: '"FILL" 1' }}
          >
            star
          </span>
        </button>
      )}

      {/* Expanded card — anchored to bottom-right of screen, safe width on mobile */}
      {expanded && (
        <div
          style={{
            position: "fixed",
            bottom: "calc(var(--sticky-h, 0px) + 96px)",
            right: "16px",
            zIndex: 51,
            width: "min(288px, calc(100vw - 32px))",
            transition: "bottom 0.3s ease",
          }}
          className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
        >
          {submitted ? (
            <div className="px-5 py-8 text-center">
              <span
                className="material-symbols-outlined text-[44px] text-amber block mb-3"
                style={{ fontVariationSettings: '"FILL" 1' }}
              >
                star
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

                {/* Stars */}
                <div className="flex gap-1 mb-4 justify-center">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onMouseEnter={() => setHovered(n)}
                      onMouseLeave={() => setHovered(0)}
                      onClick={() => setRating(n)}
                      aria-label={`${n} estrellas`}
                      className="transition-transform hover:scale-115 active:scale-95"
                    >
                      <span
                        className={`material-symbols-outlined text-[32px] transition-colors ${
                          (hovered || rating) >= n ? "text-amber" : "text-gray-200"
                        }`}
                        style={{ fontVariationSettings: '"FILL" 1' }}
                      >
                        star
                      </span>
                    </button>
                  ))}
                </div>

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
