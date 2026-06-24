/**
 * Build crisp favicon + PWA icons from public/logo.jpeg.
 * Small sizes use extra padding so the gift-box stays readable in browser tabs.
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

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

async function iconPng(size) {
  const pad = Math.max(2, Math.round(size * 0.1));
  const inner = size - pad * 2;
  return sharp(logo)
    .resize(inner, inner, { fit: 'contain', background: WHITE, kernel: sharp.kernel.lanczos3 })
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: WHITE })
    .png()
    .toBuffer();
}

async function writeIcon(size, outPath, format = 'png') {
  const buf = await iconPng(size);
  if (format === 'jpeg') {
    await sharp(buf).jpeg({ quality: 92 }).toFile(outPath);
  } else {
    await fs.promises.writeFile(outPath, buf);
  }
}

const icoSizes = [16, 32, 48];
const pngPaths = [];
for (const size of icoSizes) {
  const out = path.join(tmpDir, `favicon-${size}.png`);
  await writeIcon(size, out);
  pngPaths.push(out);
}

const { default: toIco } = await import('to-ico');
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), await toIco(pngPaths.map((p) => fs.readFileSync(p))));

await writeIcon(32, path.join(publicDir, 'favicon-32.png'));
await writeIcon(16, path.join(publicDir, 'favicon-16.png'));
// Unique path so browsers don't reuse a cached /favicon.ico or /favicon-32.png
await writeIcon(32, path.join(publicDir, 'wishtenter-icon.png'));
await writeIcon(192, path.join(publicDir, 'pwa-icon-192.png'));
await writeIcon(192, path.join(publicDir, 'pwa-icon-192.jpeg'), 'jpeg');
await writeIcon(512, path.join(publicDir, 'pwa-icon-512.png'));
await writeIcon(512, path.join(publicDir, 'pwa-icon-512.jpeg'), 'jpeg');

// Copy master logo for direct /logo.jpeg references (OG, etc.)
fs.copyFileSync(logo, path.join(publicDir, 'logo.jpeg'));

const png32 = await iconPng(32);
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" role="img" aria-label="Wishtenter">
  <image width="32" height="32" href="data:image/png;base64,${png32.toString('base64')}"/>
</svg>
`;
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), faviconSvg);

console.log('[generate-favicons] crisp favicons built from logo.jpeg');
