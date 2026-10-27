// npx tsx scripts/qa/youtube.test.ts
import assert from "node:assert/strict";
import { youtubeEmbedUrl, youtubeId } from "@/lib/youtube";

const casos: [string, string | null][] = [
  ["https://youtu.be/NWcb2LkAttU?si=QFDW4ErzK-dwpTQu", "NWcb2LkAttU"],
  ["https://www.youtube.com/watch?v=NWcb2LkAttU&t=30s", "NWcb2LkAttU"],
  ["https://m.youtube.com/watch?v=NWcb2LkAttU", "NWcb2LkAttU"],
  ["https://www.youtube.com/embed/NWcb2LkAttU", "NWcb2LkAttU"],
  ["https://youtube.com/shorts/NWcb2LkAttU?feature=share", "NWcb2LkAttU"],
  ["https://www.youtube.com/live/NWcb2LkAttU", "NWcb2LkAttU"],
  ["https://vimeo.com/123456", null],
  ["https://www.youtube.com/channel/UC123", null],
  ["no es una url", null],
  ["", null],
];
let fallas = 0;
for (const [url, id] of casos) {
  try {
    assert.equal(youtubeId(url), id);
    console.log(`  ✓ ${url || "(vacio)"}`);
  } catch (e) {
    fallas++;
    console.log(`  ✗ ${url}: ${(e as Error).message}`);
  }
}
assert.equal(youtubeEmbedUrl("https://youtu.be/NWcb2LkAttU"), "https://www.youtube-nocookie.com/embed/NWcb2LkAttU?rel=0");
console.log(`\n${fallas === 0 ? "✓" : "✗"} ${casos.length - fallas} pasaron, ${fallas} fallaron\n`);
process.exit(fallas ? 1 : 0);
