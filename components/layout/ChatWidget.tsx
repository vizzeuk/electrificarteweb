"use client";

import { useEffect } from "react";

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
  useEffect(() => {
    if (document.querySelector('script[src="/ev-chat-widget.js"]')) return;
    const script = document.createElement("script");
    script.src = "/ev-chat-widget.js";
    script.defer = true;
    document.body.appendChild(script);
  }, []);

  return (
    <ev-chat-widget
      data-api-url=""
      data-bot-name="Asistente Electrificarte"
      data-primary-color="#00E5E5"
    />
  );
}
