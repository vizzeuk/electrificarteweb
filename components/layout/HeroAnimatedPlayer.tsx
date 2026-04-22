"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface Props {
  src: string;
}

export function HeroAnimatedPlayer({ src }: Props) {
  const iframeRef  = useRef<HTMLIFrameElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const muteRef    = useRef(false);

  const [isMuted,      setIsMuted]      = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Track browser fullscreen changes (Esc key, etc.)
  useEffect(() => {
    function onFSChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFSChange);
    return () => document.removeEventListener("fullscreenchange", onFSChange);
  }, []);

  // Once the iframe DOM is ready, patch Audio constructor so future SFX
  // respect the mute ref. The tts-audio element is handled separately.
  const handleLoad = useCallback(() => {
    try {
      const iwin = iframeRef.current?.contentWindow as any;
      if (!iwin) return;
      const Orig = iwin.Audio;
      iwin.Audio = function (srcUrl?: string) {
        const a = new Orig(srcUrl);
        a.muted = muteRef.current;
        return a;
      };
    } catch {
      // cross-origin guard (shouldn't happen since same-origin)
    }
  }, []);

  function toggleMute() {
    const next = !muteRef.current;
    muteRef.current = next;
    setIsMuted(next);

    try {
      const iwin = iframeRef.current?.contentWindow as any;
      // Mute/unmute the narration audio element
      const tts: HTMLAudioElement | null = iwin?.document?.getElementById?.("tts-audio");
      if (tts) tts.muted = next;
    } catch {}
  }

  function toggleFullscreen() {
    const el = wrapperRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  return (
    <div ref={wrapperRef} className="relative w-full h-full bg-black">
      <iframe
        ref={iframeRef}
        src={src}
        title="¿Cómo funciona Electrificarte?"
        className="absolute inset-0 w-full h-full border-0"
        allow="autoplay"
        onLoad={handleLoad}
      />

      {/* Controls — pointer-events only on the buttons so clicks pass through to iframe */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-3 right-3 flex items-center gap-2 pointer-events-auto">
          <button
            onClick={toggleMute}
            aria-label={isMuted ? "Activar sonido" : "Silenciar"}
            className="w-9 h-9 rounded-full bg-black/70 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-primary/20 hover:border-primary/50 hover:text-primary transition-all duration-200"
          >
            <span className="material-symbols-outlined text-[17px]">
              {isMuted ? "volume_off" : "volume_up"}
            </span>
          </button>

          <button
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
            className="w-9 h-9 rounded-full bg-black/70 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-primary/20 hover:border-primary/50 hover:text-primary transition-all duration-200"
          >
            <span className="material-symbols-outlined text-[17px]">
              {isFullscreen ? "fullscreen_exit" : "fullscreen"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
