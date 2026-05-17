import { Navbar } from "@/components/layout/Navbar";
import { client } from "@/lib/sanity/client";
import { featuredBrandsQuery, allVehicleTypesQuery, allElectricTypesQuery } from "@/lib/queries/car";

// Diagnostic — only Navbar, nothing else.
export default async function TestNavbarLayout({ children }: { children: React.ReactNode }) {
  const [brands, vehicleTypes, electricTypes] = await Promise.all([
    client.fetch(featuredBrandsQuery),
    client.fetch(allVehicleTypesQuery),
    client.fetch(allElectricTypesQuery),
  ]);
  return (
    <>
      <Navbar brands={brands ?? []} vehicleTypes={vehicleTypes ?? []} electricTypes={electricTypes ?? []} />
      <main>{children}</main>
    </>
  );
}
