"use client";

import { CarCard } from "@/components/car/CarCard";

export interface LaunchCarData {
  _id?: string;
  name: string;
  slug: string;
  brand: { name: string; slug: string } | string;
  category?: { name: string } | string;
  imageUrl?: string;
  batteryCapacity: number;
  range: number;
  basePrice: number;
  discountPrice?: number;
  isNew?: boolean;
}

interface LatestLaunchesProps {
  title?: string;
  cars?: LaunchCarData[];
}

const FALLBACK_CARS: LaunchCarData[] = [
  { name: "EX30 Pure Electric", slug: "volvo-ex30", brand: "Volvo", category: "SUV Compacto", batteryCapacity: 51, range: 480, basePrice: 40500000, discountPrice: 36900000, isNew: true },
  { name: "Tavascan EV",        slug: "cupra-tavascan", brand: "Cupra", category: "SUV Coupé", batteryCapacity: 77, range: 520, basePrice: 47590000 },
  { name: "Seal EV Pro",        slug: "byd-seal", brand: "BYD", category: "Sedán", batteryCapacity: 82.6, range: 570, basePrice: 45500000, discountPrice: 38990000 },
];

export function LatestLaunches({ title = "Últimos lanzamientos", cars }: LatestLaunchesProps) {
  const displayCars = cars && cars.length > 0 ? cars : FALLBACK_CARS;

  return (
    <section className="py-20 md:py-24 bg-surface" aria-labelledby="latest-title">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-primary-deep font-bold mb-2">Novedades</p>
            <h2 id="latest-title" className="text-3xl md:text-4xl font-headline font-black uppercase tracking-tight">
              {title}
            </h2>
          </div>
          <a href="/marcas" className="text-sm font-medium text-primary-deep hover:text-primary transition-colors">
            Ver todos los modelos &rarr;
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {displayCars.map((car, i) => {
            const brandName = typeof car.brand === "string" ? car.brand : car.brand.name;
            const categoryName = car.category ? (typeof car.category === "string" ? car.category : car.category.name) : undefined;
            return (
              <CarCard
                key={car._id ?? car.slug}
                name={car.name}
                brand={brandName}
                slug={car.slug}
                image={car.imageUrl}
                category={categoryName}
                batteryCapacity={car.batteryCapacity}
                range={car.range}
                basePrice={car.basePrice}
                discountPrice={car.discountPrice}
                isNew={car.isNew}
                index={i}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
