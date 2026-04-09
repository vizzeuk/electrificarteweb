"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
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

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-lg border-t border-white/10 py-3 px-4 md:px-8"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="hidden sm:block">
              <p className="text-white text-sm font-medium">
                Asesoria por solo{" "}
                <span className="text-primary font-headline font-bold">
                  $19.990
                </span>
              </p>
              <p className="text-white/40 text-xs">
                Garantizamos el mejor precio o te devolvemos tu dinero
              </p>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <Link
                href="/solicitar"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-black font-bold px-6 py-3 rounded-lg transition-all text-sm"
              >
                Solicitar oferta
                <Icon name="arrow_forward" size="sm" />
              </Link>
              <a
                href="https://wa.me/56912345678?text=Hola%2C%20quiero%20asesor%C3%ADa"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-3 rounded-lg transition-all text-sm"
                aria-label="Contactar por WhatsApp"
              >
                <Icon name="chat_bubble" size="sm" />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
