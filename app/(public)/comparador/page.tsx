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

  const allCars: Car[] = [];

  for (const c of raw as any[]) {
    const versions: any[] = c.versions ?? [];

    const base = {
      slug:      c.slug as string,
      imageUrl:  c.imageUrl ?? undefined,
      brand:     c.brand?.name ?? "",
      brandSlug: c.brand?.slug ?? "",
      category:  c.vehicleType?.label ?? c.electricType?.tag ?? "",
      isHotDeal: c.isHotDeal ?? false,
      highlight: c.highlight,
      ground:    c.groundClearance ?? 0,
      warranty:  c.warranty ?? "—",
    };

    if (versions.length === 0) {
      // Rare: no versions — use car-level specs
      allCars.push({
        ...base,
        id:          c.slug,
        name:        c.name,
        versionName: undefined,
        basePrice:     c.basePrice ?? 0,
        discountPrice: c.discountPrice ?? c.basePrice ?? 0,
        battery:       c.batteryCapacity ?? 0,
        range:         c.range ?? 0,
        power:         c.power ?? 0,
        traction:      c.traction ?? "—",
        acceleration:  c.acceleration ?? 0,
        topSpeed:      c.topSpeed ?? 0,
        chargeTimeDC:  c.chargeTimeDC ?? "—",
        chargeTimeAC:  c.chargeTimeAC ?? "—",
        chargeType:    c.chargeType ?? "—",
        seats:         c.seats ?? 0,
        cargo:         c.cargo ?? 0,
      });
      continue;
    }

    const showVersionBadge = versions.length > 1;

    for (let vi = 0; vi < versions.length; vi++) {
      const v = versions[vi];
      // Fallback chain: version field → car-level field → default
      allCars.push({
        ...base,
        id:          `${c.slug}__v${vi}`,
        name:        c.name,
        versionName: v.name ?? undefined,
        // Show version badge in picker only when there are 2+ versions
        showVersionBadge,
        basePrice:     v.price         ?? c.basePrice        ?? 0,
        discountPrice: v.discountPrice ?? c.discountPrice     ?? v.price ?? c.basePrice ?? 0,
        battery:       v.batteryCapacity ?? c.batteryCapacity ?? 0,
        range:         v.range          ?? c.range            ?? 0,
        power:         v.power          ?? c.power            ?? 0,
        traction:      v.traction       ?? c.traction         ?? "—",
        acceleration:  v.acceleration   ?? c.acceleration     ?? 0,
        topSpeed:      v.topSpeed       ?? c.topSpeed         ?? 0,
        chargeTimeDC:  v.chargeTimeDC   ?? c.chargeTimeDC     ?? "—",
        chargeTimeAC:  v.chargeTimeAC   ?? c.chargeTimeAC     ?? "—",
        chargeType:    v.chargeType     ?? c.chargeType        ?? "—",
        seats:         v.seats          ?? c.seats            ?? 0,
        cargo:         v.cargo          ?? c.cargo            ?? 0,
      });
    }
  }

  // Sort by discountPrice ascending
  allCars.sort((a, b) => a.discountPrice - b.discountPrice);

  // initialSlug: match on base slug (first version of that car wins)
  const initialId = add ? allCars.find(c => c.slug === add)?.id : undefined;

  return <ComparadorClient allCars={allCars} initialId={initialId} />;
}
