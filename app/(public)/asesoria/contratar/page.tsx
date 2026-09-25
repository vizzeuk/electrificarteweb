import type { Metadata } from "next";
import { AsesoriaContratarContent } from "./AsesoriaContratarContent";

export const metadata: Metadata = {
  title: "Contratar Asesoría IA",
  description:
    "Activa tu Asesoría IA por WhatsApp por $4.990: Francisco IA te contacta al instante para ayudarte a elegir tu próximo auto electrificado.",
  alternates: { canonical: "/asesoria/contratar" },
  openGraph: {
    title: "Contratar Asesoría IA | Electrificarte",
    description: "Asesoría por WhatsApp por $4.990. Francisco IA te contacta al instante.",
    url: "/asesoria/contratar",
    type: "website",
  },
};

export default function AsesoriaContratarPage() {
  return <AsesoriaContratarContent />;
}
