import type { Metadata } from "next";
import { client } from "@/lib/sanity/client";
import { groq } from "next-sanity";
import CalculadoraContent from "./CalculadoraContent";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Calculadora de ahorro eléctrico | Electrificarte",
  description: "Descubre cuánto puedes ahorrar al cambiar tu auto a eléctrico. Calcula tu ahorro mensual, anual y reducción de CO₂ con autos disponibles en Chile.",
};

export interface CalcCar {
  _id:                  string;
  name:                 string;
  slug:                 string;
  brand:                string;
  brandSlug:            string;
  imageUrl?:            string;
  basePrice:            number;
  discountPrice:        number;
  range:                number;
  batteryCapacity:      number;
  electricTypeTag:      string;
  vehicleTypeSlug?:     string;
  electricRangeKm?:     number | null;
  fuelConsumption?:     number | null;
  rendimientoElectrico?: number | null;
  brandLogoUrl?:        string | null;
}

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
  }
`;

export default async function CalculadoraPage() {
  const cars: CalcCar[] = await client.fetch(carsForCalculatorQuery).catch(() => []);
  return <CalculadoraContent cars={cars} />;
}
