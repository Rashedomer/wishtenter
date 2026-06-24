/**
 * Build real favicon.ico + pwa-icon-192.png from logo.jpeg.
 * The old favicon.ico was a JPEG renamed to .ico — browsers ignore it.
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

resizePng(192, path.join(publicDir, 'pwa-icon-192.png'));

console.log('[generate-favicons] wrote favicon.ico and pwa-icon-192.png');
