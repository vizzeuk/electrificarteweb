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
      "Catalogo y asesoria para elegir autos electrificados en Chile: fichas tecnicas y precios de lista, comparador de modelos, calculadora de ahorro y asesoria por WhatsApp.",
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
        name: "Que ofrece Electrificarte?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Un catalogo de autos electrificados en Chile con fichas tecnicas y precios de lista, un comparador de modelos, una calculadora de ahorro frente a la bencina y una asesoria por WhatsApp de $4.990 CLP que te ayuda a decidir que auto comprar.",
        },
      },
      {
        "@type": "Question",
        name: "Electrificarte consigue descuentos en autos electricos?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Todavia no. Estamos preparando un servicio para buscar, dentro de una red de vendedores oficiales, un precio mejor que el de lista para el modelo que elijas. Aun no esta abierto: puedes dejar tus datos en la lista de espera, sin costo, para enterarte cuando abra.",
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
          text: "Si. La compra la haces directamente con el vendedor oficial de la marca: puedes visitarlo, hacer una prueba de manejo y revisar el auto antes de decidir.",
        },
      },
    ],
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Como elegir un auto electrificado en Chile con Electrificarte",
    description:
      "Guia paso a paso para elegir el auto electrico o hibrido que mas te conviene en Chile.",
    estimatedCost: {
      "@type": "MonetaryAmount",
      currency: "CLP",
      value: "4990",
    },
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Explora el catalogo",
        text: "Revisa las fichas tecnicas y los precios de lista de los autos electrificados disponibles en Chile.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Compara modelos",
        text: "Pon hasta 3 modelos lado a lado: autonomia, bateria, potencia, carga y precio.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Calcula tu ahorro",
        text: "Estima cuanto ahorras frente a la bencina segun tus kilometros.",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Resuelve tus dudas",
        text: "Si todavia no sabes cual elegir, la asesoria por WhatsApp te ayuda a decidir segun tu uso y tu presupuesto.",
      },
    ],
  };

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "AutoDealer",
    name: "Electrificarte",
    description:
      "Catalogo y asesoria para elegir autos electrificados en Chile: fichas tecnicas y precios de lista, comparador de modelos, calculadora de ahorro y asesoria por WhatsApp.",
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
