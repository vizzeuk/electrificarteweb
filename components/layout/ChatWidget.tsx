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
  // Defer mounting and script loading until the browser is idle.
  const [ready, setReady] = useState(false);

  useEffect(() => {
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
