"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { m, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/ui/Icon";

export function StickyCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 600);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const LIFTED = "92px";
    const BASE   = "24px";

    document.documentElement.style.setProperty("--sticky-h",    visible ? "68px" : "0px");
    document.documentElement.style.setProperty("--chat-bottom", visible ? LIFTED : BASE);

    // Direct shadow-DOM manipulation — CSS variable inheritance is unreliable in
    // Safari/iOS web components, so we also set the inline style on the launcher
    // element itself as a guaranteed fallback.
    try {
      const widget   = document.querySelector("ev-chat-widget");
      const launcher = widget?.shadowRoot?.querySelector("#launcher") as HTMLElement | null;
      const panel    = widget?.shadowRoot?.querySelector("#panel")    as HTMLElement | null;
      if (launcher) launcher.style.bottom = visible ? LIFTED : "";
      if (panel)    panel.style.setProperty("--chat-bottom", visible ? LIFTED : BASE);
    } catch { /* non-blocking */ }

    return () => {
      document.documentElement.style.setProperty("--sticky-h",    "0px");
      document.documentElement.style.setProperty("--chat-bottom", BASE);
      try {
        const widget   = document.querySelector("ev-chat-widget");
        const launcher = widget?.shadowRoot?.querySelector("#launcher") as HTMLElement | null;
        if (launcher) launcher.style.bottom = "";
      } catch { /* non-blocking */ }
    };
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-lg border-t border-white/10 py-3 px-4 md:px-8"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="hidden sm:block">
              <p className="text-white text-sm font-medium">
                Conseguimos el mejor precio del mercado
              </p>
              <p className="text-white/40 text-xs">
                $19.990 único · Si no ahorras, te devolvemos todo
              </p>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <Link
                href="/solicitar"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-black font-bold px-8 py-3 rounded-xl transition-all text-sm shadow-[0_4px_20px_rgba(0,229,229,0.25)] hover:shadow-[0_6px_28px_rgba(0,229,229,0.38)] hover:scale-[1.02] active:scale-[0.99]"
              >
                Solicitar oferta
                <Icon name="arrow_forward" size="sm" />
              </Link>
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
