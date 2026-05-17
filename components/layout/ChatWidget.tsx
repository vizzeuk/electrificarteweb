"use client";

import { useEffect, useState } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "ev-chat-widget": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          "data-api-url"?: string;
          "data-bot-name"?: string;
          "data-primary-color"?: string;
        },
        HTMLElement
      >;
    }
  }
}

export function ChatWidget() {
  // TEMPORARILY DISABLED on mobile for diagnostic. The chatbot is a custom
  // element (<ev-chat-widget>) backed by a 23 KB script that builds a shadow
  // DOM with inputs, buttons, etc. iOS Safari has historical bugs with custom
  // elements during initial paint; Brave (which loads instantly) may handle
  // them differently. If Safari is fast after this deploy with the widget
  // hidden, the chatbot was the culprit on mobile and we'll redesign.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Skip the widget entirely on mobile.
    if (window.matchMedia("(max-width: 767px)").matches) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let idleId: number | null = null;

    function mount() {
      setReady(true);
      if (document.querySelector('script[src="/ev-chat-widget.js"]')) return;
      const script = document.createElement("script");
      script.src = "/ev-chat-widget.js";
      script.defer = true;
      document.body.appendChild(script);
    }

    if (typeof (window as any).requestIdleCallback === "function") {
      idleId = (window as any).requestIdleCallback(mount, { timeout: 4000 });
    } else {
      timeoutId = setTimeout(mount, 3000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (idleId && typeof (window as any).cancelIdleCallback === "function") {
        (window as any).cancelIdleCallback(idleId);
      }
    };
  }, []);

  if (!ready) return null;

  return (
    <ev-chat-widget
      data-api-url=""
      data-bot-name="Francisco Electrificarte"
      data-primary-color="#00E5E5"
    />
  );
}
