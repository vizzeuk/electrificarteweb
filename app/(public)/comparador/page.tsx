import { client } from "@/lib/sanity/client";
import { allCarsForComparadorQuery } from "@/lib/queries/car";
import ComparadorClient, { type Car } from "./ComparadorClient";

export const revalidate = 60;

interface PageProps {
  searchParams: Promise<{ add?: string }>;
}

export default async function ComparadorPage({ searchParams }: PageProps) {
  const { add } = await searchParams;
  const raw = await client.fetch(allCarsForComparadorQuery).catch(() => []);

  const allCars: Car[] = raw.map((c: any) => ({
    slug:          c.slug,
    name:          c.name,
    brand:         c.brand?.name ?? "",
    brandSlug:     c.brand?.slug ?? "",
    category:      c.vehicleType?.label ?? c.electricType?.tag ?? "",
    basePrice:     c.basePrice ?? 0,
    discountPrice: c.discountPrice ?? c.basePrice ?? 0,
    battery:       c.batteryCapacity ?? 0,
    range:         c.range ?? 0,
    power:         c.power ?? 0,
    traction:      c.traction ?? "",
    acceleration:  c.acceleration ?? 0,
    topSpeed:      c.topSpeed ?? 0,
    chargeTimeDC:  c.chargeTimeDC ?? "—",
    chargeTimeAC:  c.chargeTimeAC ?? "—",
    chargeType:    c.chargeType ?? "—",
    seats:         c.seats ?? 0,
    cargo:         c.cargo ?? 0,
    ground:        c.groundClearance ?? 0,
    warranty:      c.warranty ?? "—",
    isHotDeal:     c.isHotDeal ?? false,
    highlight:     c.highlight,
  }));

  return <ComparadorClient allCars={allCars} initialSlug={add} />;
}
