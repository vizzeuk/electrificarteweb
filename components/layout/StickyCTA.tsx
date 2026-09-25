"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { OfferCta } from "@/components/waitlist/OfferCta";

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
    const LIFTED = "97px"; // 24 px de margen + 73 px de la barra (12 + 48 + 12 + 1 de hairline)
    const BASE   = "24px";

    document.documentElement.style.setProperty("--sticky-h",    visible ? "73px" : "0px");
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
    <div className={`sticky-bar${visible ? " is-visible" : ""}`} aria-hidden={!visible}>
      <div className="wrap sticky-bar__in">
        <p className="sticky-bar__text">
          <strong>¿No sabes cuál elegir?</strong>
          <span>Te asesoramos por WhatsApp según tu uso y tu presupuesto.</span>
        </p>
        <div className="sticky-bar__actions">
          <OfferCta source="sticky" className="btn btn--secondary">
            Únete a la waitlist
          </OfferCta>
          <Link href="/asesoria" className="btn btn--primary" tabIndex={visible ? undefined : -1}>
            Quiero asesoría
          </Link>
        </div>
      </div>
    </div>
  );
}
