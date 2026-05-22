import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Contacto | Electrificarte",
  description:
    "¿Tenés dudas sobre tu próximo auto eléctrico o híbrido? Contactá al equipo de Electrificarte y te asesoramos para conseguir el mejor precio del mercado en Chile.",
  alternates: { canonical: "/contacto" },
};

export default function ContactoLayout({ children }: { children: ReactNode }) {
  return children;
}
