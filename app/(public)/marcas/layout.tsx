import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Todas las marcas de autos eléctricos e híbridos en Chile",
  description:
    "Explorá todas las marcas de autos eléctricos e híbridos disponibles en Chile — BYD, Tesla, Volvo, Hyundai, Kia y más. Compará modelos y conseguí el mejor precio con Electrificarte.",
  alternates: { canonical: "/marcas" },
};

export default function MarcasLayout({ children }: { children: ReactNode }) {
  return children;
}
