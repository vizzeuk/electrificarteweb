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
    const ts = localStorage.getItem(SEEN_KEY);
    if (ts) {
      const daysSince = (Date.now() - parseInt(ts)) / 86_400_000;
      if (daysSince < DAYS_UNTIL_RESHOWN) return;
    }
    setHidden(false);

    const timer = setTimeout(() => {
      setExpanded(prev => (!prev ? true : prev));
    }, 5 * 60 * 1000);

    return () => clearTimeout(timer);
  }, []);

  // Closing without answering — just collapse to bubble, don't mark as seen
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
      // silently ignore; user still sees thank-you
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
    <div
      style={{
        position: "fixed",
        bottom: "calc(92px + var(--sticky-h, 0px))",
        right: "24px",
        zIndex: 50,
        transition: "bottom 0.3s ease",
      }}
    >
      {/* Collapsed bubble */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          title="Califica tu experiencia"
          className="w-12 h-12 rounded-full bg-amber text-black flex items-center justify-center shadow-lg hover:scale-110 hover:shadow-xl transition-all duration-200"
        >
          <span
            className="material-symbols-outlined text-[22px]"
            style={{ fontVariationSettings: '"FILL" 1' }}
          >
            star
          </span>
        </button>
      )}

      {/* Expanded card */}
      {expanded && (
        <div className="w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
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

                {/* Optional comment */}
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
    </div>
  );
}
