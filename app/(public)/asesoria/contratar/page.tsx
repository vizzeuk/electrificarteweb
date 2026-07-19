import type { Metadata } from "next";
import { AsesoriaContratarContent } from "./AsesoriaContratarContent";

export const metadata: Metadata = {
  title: "Contratar Asesoría IA",
  description:
    "Activa tu Asesoría IA por WhatsApp. Pago único de $4.990 y Francisco IA te contacta al instante para ayudarte a elegir tu próximo auto electrificado.",
  alternates: { canonical: "/asesoria/contratar" },
  openGraph: {
    title: "Contratar Asesoría IA | Electrificarte",
    description: "Pago único de $4.990. Francisco IA te contacta por WhatsApp al instante.",
    url: "/asesoria/contratar",
    type: "website",
  },
};

export default function AsesoriaContratarPage() {
  return <AsesoriaContratarContent />;
}
