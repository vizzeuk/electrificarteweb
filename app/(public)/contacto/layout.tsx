import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Contacto",
  description:
    "¿Tienes dudas sobre tu próximo auto eléctrico o híbrido? Escríbele al equipo de Electrificarte y te ayudamos a elegir bien.",
  alternates: { canonical: "/contacto" },
};

export default function ContactoLayout({ children }: { children: ReactNode }) {
  return children;
}
