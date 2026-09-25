import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Todas las marcas de autos eléctricos e híbridos en Chile",
  description:
    "Explora todas las marcas de autos eléctricos e híbridos disponibles en Chile: BYD, Tesla, Volvo, Hyundai, Kia y más. Compara modelos y elige bien tu próximo auto electrificado.",
  alternates: { canonical: "/marcas" },
};

export default function MarcasLayout({ children }: { children: ReactNode }) {
  return children;
}
