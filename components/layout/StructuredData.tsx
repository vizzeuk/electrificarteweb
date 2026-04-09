export function HomeStructuredData() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Electrificarte",
    alternateName: "Electrificarte S.P.A.",
    url: "https://electrificarte.cl",
    logo: "https://electrificarte.cl/icons/logo.svg",
    description:
      "Marketplace de autos electricos en Chile. Intermediario entre compradores y concesionarios que garantiza el mejor precio del mercado.",
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
      url: "https://wa.me/56912345678",
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Catalogo de autos electricos",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Asesoria de compra de auto electrico",
            description:
              "Servicio de negociacion exclusiva con concesionarios para obtener el mejor precio en autos electricos en Chile",
          },
          price: "19990",
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
    url: "https://electrificarte.cl",
    inLanguage: "es-CL",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://electrificarte.cl/marcas?q={search_term_string}",
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
          text: "Al registrarte en Electrificarte y pagar $19.990 CLP, activamos nuestro servicio de busqueda exclusiva. Nuestro equipo negocia directamente con concesionarios para conseguirte el mejor precio posible, con ahorros promedio de 27%.",
        },
      },
      {
        "@type": "Question",
        name: "Como logra Electrificarte los descuentos?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Trabajamos con una red de concesionarios verificados en Chile. Agrupamos solicitudes para negociar descuentos por volumen, acceder a bonos exclusivos y ofertas de inventario no disponibles al publico.",
        },
      },
      {
        "@type": "Question",
        name: "Cuanto cuesta el servicio de Electrificarte?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Solo $19.990 CLP como pago unico. Sin costos ocultos ni comisiones. Si no logramos un descuento significativo, devolvemos el 100% del pago.",
        },
      },
      {
        "@type": "Question",
        name: "Puedo ver el auto antes de comprarlo?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Si. Te conectamos con el concesionario que ofrezca el mejor precio para que puedas visitarlo, hacer test drive y verificar todo antes de decidir.",
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
    totalTime: "PT24H",
    estimatedCost: {
      "@type": "MonetaryAmount",
      currency: "CLP",
      value: "19990",
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
        name: "Paga tu asesoria",
        text: "Pago unico de $19.990 CLP para activar la busqueda exclusiva.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Recibe tu oferta en 24 horas",
        text: "Te presentamos la mejor oferta con bonos y financiamiento incluido.",
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
    "@type": "LocalBusiness",
    name: "Electrificarte",
    description:
      "Marketplace de autos electricos en Chile con asesoria personalizada para obtener el mejor precio del mercado.",
    url: "https://electrificarte.cl",
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
    priceRange: "$19.990 CLP",
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "18:00",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "127",
      bestRating: "5",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
    </>
  );
}
