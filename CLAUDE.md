@AGENTS.md

# Electrificarte — Contexto del proyecto

Plataforma B2B2C chilena de autos eléctricos e híbridos. Intermediario entre comprador y concesionarios: negocia precios en volumen y cobra comisión al concesionario.

## Stack
- Next.js 16.2.2 App Router · React 19.2.4 · Tailwind v4 · Framer Motion 12 · Sanity v5 · TypeScript
- Node.js 22

## Sanity
- Project ID: `wd30r9b0` · Dataset: `production` · API version: `2025-01-01`
- Studio en `/studio`
- Datos: ~120 autos · 49 marcas · logos subidos para 39 marcas

## Colores (Tailwind custom tokens)
- `primary` = `#00E5E5` (cyan)
- `primary-deep` = `#006A61`
- `amber` = `#F59E0B`
- Fondos hero/secciones: negro (`bg-black`)

## Tipografía
- Headline: Space Grotesk (`font-headline`)
- Body: Inter

## Rutas públicas
`/` · `/marcas` · `/marcas/[slug]` · `/auto/[slug]` · `/tipo/[slug]` · `/electrico/[slug]` · `/coleccion/[slug]` · `/comparador` · `/solicitar` · `/contacto` · `/blog` · `/blog/[slug]` · `/studio`

## Patrones importantes
- Scripts de datos: `npx tsx --env-file=.env.local scripts/[nombre].ts`
- ISR: `export const revalidate = 60` en todas las páginas SSG
- Imágenes de Sanity: `logo.asset->url` en GROQ para obtener la URL directa
- Scripts en `scripts/` usan `@sanity/client` directamente con token de escritura

## Pendientes conocidos
- WhatsApp hardcodeado como `+56912345678` en `components/layout/Navbar.tsx` (líneas ~215 y ~339) — reemplazar con número real
- `N8N_CONTACT_URL` en Vercel necesita URL de producción (sin `-test`)
- 10 autos sin imágenes: Tesla Model Y, Chevrolet Blazer/Bolt/Equinox/Spark, Cupra Tavascan, JAC E-JS1/JS4, Skoda Elroq, Changan Hunter E
- 11 marcas sin logo: DFSK, Deepal, GAC, GWM, Jaecoo, MINI, Nammi, Ora, Riddara, Skoda, Ssangyong

## Variables de entorno necesarias (.env.local)
```
NEXT_PUBLIC_SANITY_PROJECT_ID=wd30r9b0
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_TOKEN=[token con permisos de escritura]
N8N_CONTACT_URL=[url del webhook n8n]
```
