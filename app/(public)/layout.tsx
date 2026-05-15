import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ChatWidget } from "@/components/layout/ChatWidget";
import { FeedbackWidget } from "@/components/layout/FeedbackWidget";
import { MotionProvider } from "@/components/providers/MotionProvider";
import { client } from "@/lib/sanity/client";
import { featuredBrandsQuery, allVehicleTypesQuery, allElectricTypesQuery } from "@/lib/queries/car";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [brands, vehicleTypes, electricTypes] = await Promise.all([
    client.fetch(featuredBrandsQuery),
    client.fetch(allVehicleTypesQuery),
    client.fetch(allElectricTypesQuery),
  ]);

  return (
    <MotionProvider>
      <Navbar brands={brands ?? []} vehicleTypes={vehicleTypes ?? []} electricTypes={electricTypes ?? []} />
      <main>{children}</main>
      <Footer />
      <FeedbackWidget />
      <ChatWidget />
    </MotionProvider>
  );
}
