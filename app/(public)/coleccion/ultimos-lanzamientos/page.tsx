import type { Metadata } from "next";
import { client } from "@/lib/sanity/client";
import { latestLaunchesManualQuery, newCarsForHomeQuery } from "@/lib/queries/car";
import { LATEST_LAUNCHES_PATH, LATEST_LAUNCHES_TITLE, mergeLatestLaunches } from "@/lib/latest-launches";
import ColeccionPageContent from "../[slug]/ColeccionPageContent";

type Car = React.ComponentProps<typeof ColeccionPageContent>["cars"][number];

// "Ver todos" del carrusel Últimos lanzamientos del home. No es un documento de Colección en
// Sanity: sale de la misma lista que el carrusel (elegidos a mano + 🆕 + recientes), sin el tope
// de 20. La ruta fija gana sobre /coleccion/[slug].

export const revalidate = 60;

const DESCRIPTION =
  "Los modelos eléctricos e híbridos que entraron hace poco al catálogo, con precio de lista y specs clave.";

export const metadata: Metadata = {
  title: LATEST_LAUNCHES_TITLE,
  description: DESCRIPTION,
  alternates: { canonical: LATEST_LAUNCHES_PATH },
};

export default async function UltimosLanzamientosPage() {
  const [home, newCars] = await Promise.all([
    client.fetch<{ latestLaunchesTitle?: string; cars?: Car[] } | null>(latestLaunchesManualQuery, {}, { next: { tags: ["homePage", "car"] } }).catch(() => null),
    client.fetch<Car[]>(newCarsForHomeQuery, { limit: 200 }, { next: { tags: ["car"] } }).catch(() => []),
  ]);

  const cars = mergeLatestLaunches(home?.cars, newCars);

  return (
    <ColeccionPageContent
      col={{
        title:    home?.latestLaunchesTitle || LATEST_LAUNCHES_TITLE,
        slug:     "ultimos-lanzamientos",
        subtitle: DESCRIPTION,
      }}
      cars={cars}
    />
  );
}
