/**
 * Vercel projects with Root Directory = "dist" only deploy build output.
 * Copy routing + OG handlers into dist so rewrites and middleware apply.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyRecursive(from, to);
    else fs.copyFileSync(from, to);
  }
}

if (!fs.existsSync(dist)) {
  console.warn('[sync-vercel-output] dist/ missing — run vite build first');
  process.exit(0);
}

for (const file of ['vercel.json', 'middleware.js']) {
  const src = path.join(root, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(dist, file));
    console.log(`[sync-vercel-output] copied ${file}`);
  }
}

copyRecursive(path.join(root, 'lib'), path.join(dist, 'lib'));
copyRecursive(path.join(root, 'api'), path.join(dist, 'api'));
console.log('[sync-vercel-output] copied lib/ and api/');
