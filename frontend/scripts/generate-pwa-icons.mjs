import sharp from 'sharp';
import { readFile, mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.resolve(__dirname, '../public');
const ICONS = path.join(PUBLIC, 'icons');

async function run() {
  await mkdir(ICONS, { recursive: true });
  const svgMaster = await readFile(path.join(ICONS, 'icon-master.svg'));
  const svgMaskable = await readFile(path.join(ICONS, 'icon-maskable-master.svg'));

  // Standard icons (purpose: any)
  for (const size of [192, 512]) {
    const out = path.join(ICONS, `icon-${size}.png`);
    await sharp(svgMaster, { density: 384 }).resize(size, size).png().toFile(out);
    console.log('[ok]', out);
  }

  // Maskable icon (full-bleed, safe zone 80%)
  const maskOut = path.join(ICONS, 'icon-maskable-512.png');
  await sharp(svgMaskable, { density: 384 }).resize(512, 512).png().toFile(maskOut);
  console.log('[ok]', maskOut);

  // Apple touch icon (180x180, non-maskable)
  const appleOut = path.join(ICONS, 'apple-touch-icon.png');
  await sharp(svgMaster, { density: 384 }).resize(180, 180).png().toFile(appleOut);
  console.log('[ok]', appleOut);

  // Favicon PNG 32x32
  const faviconOut = path.join(PUBLIC, 'favicon-32.png');
  await sharp(svgMaster, { density: 384 }).resize(32, 32).png().toFile(faviconOut);
  console.log('[ok]', faviconOut);

  // Open Graph default card (1200x630) — pad brand square on brand-colored background
  const ogOut = path.join(PUBLIC, 'og-default.png');
  await sharp(svgMaster, { density: 384 })
    .resize(630, 630)
    .extend({
      top: 0,
      bottom: 0,
      left: 285,
      right: 285,
      background: { r: 37, g: 99, b: 235, alpha: 1 },
    })
    .png()
    .toFile(ogOut);
  console.log('[ok]', ogOut);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
