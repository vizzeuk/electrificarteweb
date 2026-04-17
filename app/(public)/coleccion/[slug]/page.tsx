import { notFound } from "next/navigation";
import { client } from "@/lib/sanity/client";
import { collectionBySlugQuery, carsByFiltersQuery } from "@/lib/queries/collections";
import { CarCard } from "@/components/car/CarCard";
import { Icon } from "@/components/ui/Icon";
import Link from "next/link";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ColeccionPage({ params }: PageProps) {
  const { slug } = await params;

  const col = await client
    .fetch(collectionBySlugQuery, { slug })
    .catch(() => null);

  if (!col) notFound();

  // Resolve cars — manual or automatic
  let cars: any[] = [];
  if (col.filterMode === "manual") {
    cars = col.manualCars ?? [];
  } else {
    cars = await client
      .fetch(carsByFiltersQuery, {
        brandRef:  col.filterBrandRef  ?? null,
        category:  col.filterCategory  ?? "",
        maxPrice:  col.filterMaxPrice   ? col.filterMaxPrice * 1_000_000 : 0,
        minSeats:  col.filterMinSeats   ?? 0,
      })
      .catch(() => []);
  }

  return (
    <main className="min-h-screen bg-white">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative min-h-[420px] md:min-h-[500px] flex items-end">
        {/* Background */}
        {col.heroImageUrl ? (
          <img
            src={col.heroImageUrl}
            alt={col.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#001e1e] via-[#003535] to-[#005555]" />
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />

        {/* Breadcrumb */}
        <div className="absolute top-28 left-0 right-0 px-4 md:px-8">
          <div className="max-w-7xl mx-auto">
            <nav className="flex items-center gap-2 text-white/50 text-xs">
              <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
              <span>/</span>
              <span className="text-white/80">Colecciones</span>
              <span>/</span>
              <span className="text-white">{col.title}</span>
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 pb-16 w-full">
          {col.badge && (
            <span className="inline-block bg-primary text-black text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full mb-4">
              {col.badge}
            </span>
          )}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-headline font-extrabold text-white leading-tight mb-3">
            {col.title}
          </h1>
          {(col.subtitle || col.description) && (
            <p className="text-white/70 text-lg max-w-2xl leading-relaxed">
              {col.description ?? col.subtitle}
            </p>
          )}
          <p className="text-white/40 text-sm mt-4">
            {cars.length} {cars.length === 1 ? "auto disponible" : "autos disponibles"}
          </p>
        </div>
      </section>

      {/* ── Cars grid ────────────────────────────────────────────────── */}
      <section className="py-16 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          {cars.length === 0 ? (
            <div className="text-center py-24">
              <Icon name="electric_car" className="text-gray-200 mb-4" size="xl" />
              <h2 className="text-xl font-headline font-bold text-text-main mb-2">
                Sin autos en esta colección todavía
              </h2>
              <p className="text-text-muted text-sm mb-8">
                Estamos actualizando el catálogo. Vuelve pronto.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-primary text-black font-bold px-6 py-3 rounded-xl transition-colors hover:bg-primary-dark"
              >
                <Icon name="arrow_back" size="sm" />
                Volver al inicio
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {cars.map((car: any, i: number) => (
                <CarCard
                  key={car._id}
                  name={car.name}
                  brand={car.brand?.name ?? ""}
                  slug={car.slug}
                  image={car.imageUrl}
                  category={car.category?.name}
                  batteryCapacity={car.batteryCapacity ?? 0}
                  range={car.range ?? 0}
                  basePrice={car.basePrice}
                  discountPrice={car.discountPrice}
                  isNew={car.isNew}
                  index={i}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── CTA bottom ───────────────────────────────────────────────── */}
      <section className="bg-black py-16 px-4 md:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-headline font-extrabold text-white mb-3">
            ¿Encontraste lo que buscabas?
          </h2>
          <p className="text-white/50 text-sm mb-8">
            Solicita tu oferta y te conseguimos el mejor precio del mercado.
          </p>
          <Link
            href="/solicitar"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-black font-bold px-8 py-4 rounded-xl transition-colors"
          >
            Solicitar mi oferta
            <Icon name="arrow_forward" size="sm" />
          </Link>
        </div>
      </section>
    </main>
  );
}
