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
  _id:             string;
  name:            string;
  slug:            string;
  brand:           string;
  brandSlug:       string;
  imageUrl?:       string;
  basePrice:       number;
  discountPrice:   number;
  range:           number;
  batteryCapacity: number;
  electricTypeTag: string;
}

const carsForCalculatorQuery = groq`
  *[
    _type == "car"
    && defined(batteryCapacity) && batteryCapacity > 0
    && defined(range) && range > 100
    && defined(basePrice)
  ] | order(coalesce(discountPrice, basePrice) asc) {
    _id,
    name,
    "slug":            slug.current,
    "brand":           brand->name,
    "brandSlug":       brand->slug.current,
    "imageUrl":        mainImage.asset->url,
    basePrice,
    discountPrice,
    range,
    batteryCapacity,
    "electricTypeTag": electricType->tag,
  }
`;

export default async function CalculadoraPage() {
  const cars: CalcCar[] = await client.fetch(carsForCalculatorQuery).catch(() => []);
  return <CalculadoraContent cars={cars} />;
}
