/**
 * Build favicon + PWA icons directly from public/logo.jpeg.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const logo = path.join(publicDir, 'logo.jpeg');

if (!fs.existsSync(logo)) {
  console.warn('[generate-favicons] public/logo.jpeg missing — skip');
  process.exit(0);
}

const tmpDir = path.join(root, 'node_modules', '.cache', 'favicons');
fs.mkdirSync(tmpDir, { recursive: true });

async function resize(size, out, format = 'png') {
  let pipeline = sharp(logo).resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } });
  if (format === 'jpeg') pipeline = pipeline.jpeg({ quality: 90 });
  else pipeline = pipeline.png();
  await pipeline.toFile(out);
}

const master = await sharp(logo)
  .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
  .png()
  .toBuffer();

const pngPaths = [];
for (const size of [16, 32, 48]) {
  const out = path.join(tmpDir, `favicon-${size}.png`);
  await sharp(master).resize(size, size).png().toFile(out);
  pngPaths.push(out);
}

const { default: toIco } = await import('to-ico');
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), await toIco(pngPaths.map((p) => fs.readFileSync(p))));

await resize(32, path.join(publicDir, 'favicon-32.png'));
await resize(192, path.join(publicDir, 'pwa-icon-192.png'));
await resize(192, path.join(publicDir, 'pwa-icon-192.jpeg'), 'jpeg');
await resize(512, path.join(publicDir, 'pwa-icon-512.jpeg'), 'jpeg');

const logoBase64 = (await sharp(logo).resize(64, 64, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } }).png().toBuffer()).toString('base64');
fs.writeFileSync(
  path.join(publicDir, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Wishtenter">
  <image width="64" height="64" href="data:image/png;base64,${logoBase64}"/>
</svg>
`
);

console.log('[generate-favicons] favicon + PWA icons built from logo.jpeg');
