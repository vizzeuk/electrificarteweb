import type { Metadata } from "next";
import { client } from "@/lib/sanity/client";
import { groq } from "next-sanity";
import CalculadoraContent from "./CalculadoraContent";
import type { CalcCar } from "./types";

export const revalidate = 3600;

export const metadata: Metadata = {
  alternates: { canonical: "/calculadora" },
  title: "Calculadora de ahorro eléctrico | Electrificarte",
  description: "Descubre cuánto puedes ahorrar al cambiar tu auto a eléctrico. Calcula tu ahorro mensual, anual y reducción de CO₂ con autos disponibles en Chile.",
};

const carsForCalculatorQuery = groq`
  *[
    _type == "car"
    && defined(basePrice)
    && (
      (defined(batteryCapacity) && batteryCapacity > 0 && defined(range) && range > 0) ||
      (defined(electricRangeKm) && electricRangeKm > 0) ||
      (defined(fuelConsumption) && fuelConsumption > 0 && fuelConsumption <= 20)
    )
  ] | order(coalesce(discountPrice, basePrice) asc) {
    _id,
    name,
    "slug":              slug.current,
    "brand":             brand->name,
    "brandSlug":         brand->slug.current,
    "imageUrl":          mainImage.asset->url,
    basePrice,
    discountPrice,
    range,
    batteryCapacity,
    electricRangeKm,
    fuelConsumption,
    rendimientoElectrico,
    "electricTypeTag":   electricType->tag,
    "vehicleTypeSlug":   vehicleType->slug.current,
    "brandLogoUrl":      brand->logo.asset->url,
    "versions": versions[defined(price) && price > 0]{
      _key,
      name,
      price,
      discountPrice,
      batteryCapacity,
      range,
      electricRangeKm,
      fuelConsumption,
      rendimientoElectrico,
    },
  }
`;

export default async function CalculadoraPage() {
  const cars: CalcCar[] = await client.fetch(carsForCalculatorQuery).catch(() => []);
  return <CalculadoraContent cars={cars} />;
}
