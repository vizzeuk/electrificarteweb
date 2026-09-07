import { safeJsonLd } from "@/lib/seo";

export function HomeStructuredData() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Electrificarte",
    alternateName: "Electrificarte S.P.A.",
    url: "https://www.electrificarte.com",
    logo: "https://www.electrificarte.com/logos-electrificarte/logo-elec-sin%20auto.webp",
    description:
      "Servicio de negociación de autos electrificados en Chile. Intermediario entre compradores y vendedores oficiales que consigue el mejor precio del mercado.",
    foundingDate: "2023",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Santiago",
      addressRegion: "Region Metropolitana",
      addressCountry: "CL",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: -33.4489,
      longitude: -70.6693,
    },
    areaServed: {
      "@type": "Country",
      name: "Chile",
    },
    sameAs: [
      "https://instagram.com/electrificarte",
      "https://youtube.com/@electrificarte",
      "https://tiktok.com/@electrificarte",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "sales",
      availableLanguage: "Spanish",
      url: "https://www.electrificarte.com/contacto",
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Catalogo de autos electricos",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Asesoria IA de compra de auto electrificado",
            description:
              "Asesoria personalizada por WhatsApp para decidir que auto electrificado comprar segun uso, presupuesto y perfil",
          },
          price: "4990",
          priceCurrency: "CLP",
          availability: "https://schema.org/InStock",
        },
      ],
    },
  };

  const webSiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Electrificarte",
    url: "https://www.electrificarte.com",
    inLanguage: "es-CL",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://www.electrificarte.com/marcas?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Como puedo obtener un descuento en un auto electrico en Chile?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Electrificarte negocia directamente con vendedores oficiales para conseguir el mejor precio posible. El servicio aun no esta abierto al publico: puedes sumarte a la lista de espera sin costo y te avisamos cuando abramos el acceso.",
        },
      },
      {
        "@type": "Question",
        name: "Como logra Electrificarte los descuentos?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Trabajamos con una red de vendedores oficiales verificados en Chile. Agrupamos solicitudes para negociar descuentos por volumen, acceder a bonos exclusivos y ofertas de inventario no disponibles al publico.",
        },
      },
      {
        "@type": "Question",
        name: "Cuanto cuesta el servicio de Electrificarte?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Sumarte a la lista de espera no tiene costo: solo dejas tus datos y quedas registrado como interesado. La Asesoria IA por WhatsApp, que te ayuda a decidir que auto comprar, tiene un valor de $4.990 CLP.",
        },
      },
      {
        "@type": "Question",
        name: "Puedo ver el auto antes de comprarlo?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Si. Te conectamos con el vendedor oficial que ofrezca el mejor precio para que puedas visitarlo, hacer test drive y verificar todo antes de decidir.",
        },
      },
    ],
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Como comprar un auto electrico al mejor precio en Chile con Electrificarte",
    description:
      "Guia paso a paso para obtener el mejor precio en un vehiculo electrico en Chile.",
    estimatedCost: {
      "@type": "MonetaryAmount",
      currency: "CLP",
      value: "4990",
    },
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Elige tu auto",
        text: "Explora el catalogo o dinos que modelo te interesa.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Sumate a la lista de espera",
        text: "Deja tus datos sin costo y quedas registrado como interesado en ese modelo.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Te avisamos",
        text: "Te contactamos cuando abramos el acceso y tengamos novedades para tu modelo.",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Estrena tu auto",
        text: "Te acompanamos en todo el proceso hasta que retires tu vehiculo.",
      },
    ],
  };

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "AutoDealer",
    name: "Electrificarte",
    description:
      "Servicio de negociación de autos eléctricos en Chile con asesoría personalizada para obtener el mejor precio del mercado.",
    url: "https://www.electrificarte.com",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Santiago",
      addressRegion: "Region Metropolitana",
      postalCode: "7500000",
      addressCountry: "CL",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: -33.4489,
      longitude: -70.6693,
    },
    priceRange: "$4.990 CLP",
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "18:00",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(webSiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(howToSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(localBusinessSchema) }}
      />
    </>
  );
}
