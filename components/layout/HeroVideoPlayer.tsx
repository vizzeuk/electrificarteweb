"use client";

import { useRef, useState, useEffect } from "react";

export function HeroVideoPlayer() {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const wrapperRef  = useRef<HTMLDivElement>(null);

  const [isPlaying,    setIsPlaying]    = useState(true);
  const [isMuted,      setIsMuted]      = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCenter,   setShowCenter]   = useState(false);

  useEffect(() => {
    function onFSChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFSChange);
    return () => document.removeEventListener("fullscreenchange", onFSChange);
  }, []);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  }

  function toggleMute() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
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
    <div
      ref={wrapperRef}
      className="relative w-full h-full bg-black group cursor-pointer"
      onClick={togglePlay}
      onMouseEnter={() => setShowCenter(true)}
      onMouseLeave={() => setShowCenter(false)}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        poster="/hero-video/hero-poster.jpg"
        className="absolute inset-0 w-full h-full object-cover"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      >
        <source src="/hero-video/hero.webm" type="video/webm" />
        <source src="/hero-video/hero.mp4"  type="video/mp4"  />
      </video>

      {/* Center play/pause — visible on hover or when paused */}
      <div
        className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-200 ${
          showCenter || !isPlaying ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="w-14 h-14 rounded-full bg-black/60 backdrop-blur-sm border border-white/25 flex items-center justify-center text-white">
          <span className="material-symbols-outlined text-[28px]">
            {isPlaying ? "pause" : "play_arrow"}
          </span>
        </div>
      </div>

      {/* Bottom-right controls */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-3 right-3 flex items-center gap-2 pointer-events-auto">
          <button
            onClick={(e) => { e.stopPropagation(); toggleMute(); }}
            aria-label={isMuted ? "Activar sonido" : "Silenciar"}
            className="w-9 h-9 rounded-full bg-black/70 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-primary/20 hover:border-primary/50 hover:text-primary transition-all duration-200"
          >
            <span className="material-symbols-outlined text-[17px]">
              {isMuted ? "volume_off" : "volume_up"}
            </span>
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
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
