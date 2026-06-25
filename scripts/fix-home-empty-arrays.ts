import { createClient } from '@sanity/client';

const client = createClient({
  projectId: 'wd30r9b0',
  dataset: 'production',
  apiVersion: '2025-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

async function main() {
  const doc = await client.fetch(`*[_type == "homePage" && !(_id in path("drafts.**"))][0]{_id, serviciosExtras, testimonials}`);
  
  if (!doc) { console.log('No homePage found'); return; }
  
  console.log('Current serviciosExtras:', JSON.stringify(doc.serviciosExtras, null, 2));
  console.log('Current testimonials:', JSON.stringify(doc.testimonials, null, 2));
  
  // Remove incomplete/null entries — only keep items that have at least a title
  const cleanServicios = (doc.serviciosExtras ?? []).filter((s: any) => s.title);
  const cleanTestimonials = (doc.testimonials ?? []).filter((t: any) => t.name);
  
  console.log('\nCleaned serviciosExtras count:', cleanServicios.length);
  console.log('Cleaned testimonials count:', cleanTestimonials.length);
  
  await client.patch(doc._id).set({
    serviciosExtras: cleanServicios,
    testimonials: cleanTestimonials,
  }).commit();
  
  console.log('\n✅ Patched successfully — defaults will now show');
}

main().catch(console.error);
