/**
 * Build favicon assets from public/logo.jpeg (Wishtenter gift-box logo).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const logo = path.join(publicDir, 'logo.jpeg');

if (!fs.existsSync(logo)) {
  console.warn('[generate-favicons] public/logo.jpeg missing — skip');
  process.exit(0);
}

const tmpDir = path.join(root, 'node_modules', '.cache', 'favicons');
fs.mkdirSync(tmpDir, { recursive: true });

function resizePng(size, out) {
  execSync(
    `npx --yes sharp-cli -i "${logo}" -o "${out}" -f png resize ${size} ${size}`,
    { stdio: 'inherit', cwd: root }
  );
}

const pngPaths = [];
for (const size of [16, 32, 48]) {
  const out = path.join(tmpDir, `favicon-${size}.png`);
  resizePng(size, out);
  pngPaths.push(out);
}

const { default: toIco } = await import('to-ico');
const ico = await toIco(pngPaths.map((p) => fs.readFileSync(p)));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), ico);

const favicon32 = path.join(publicDir, 'favicon-32.png');
resizePng(32, favicon32);

const pwa192 = path.join(publicDir, 'pwa-icon-192.png');
resizePng(192, pwa192);

// Keep apple-touch / PWA jpeg in sync with the same logo
fs.copyFileSync(logo, path.join(publicDir, 'pwa-icon-512.jpeg'));
resizePng(192, path.join(publicDir, 'pwa-icon-192.jpeg'));

// SVG favicon — embed the real logo so all browsers show the same asset
const logoBase64 = fs.readFileSync(logo).toString('base64');
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 64 64" role="img" aria-label="Wishtenter">
  <image width="64" height="64" href="data:image/jpeg;base64,${logoBase64}"/>
</svg>
`;
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), faviconSvg);

console.log('[generate-favicons] wrote favicon.ico, favicon.svg, favicon-32.png, pwa icons from logo.jpeg');
