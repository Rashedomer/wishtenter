/**
 * Railway deploys from server/ — copy built frontend into server/dist
 * so Express can serve SPA + fix 404 on profile links.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'dist');
const dest = path.join(root, 'server', 'dist');

function copyRecursive(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const srcPath = path.join(from, entry.name);
    const destPath = path.join(to, entry.name);
    if (entry.isDirectory()) copyRecursive(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

if (!fs.existsSync(path.join(src, 'index.html'))) {
  console.warn('[sync-railway-output] dist/index.html missing — skip');
  process.exit(0);
}

if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
copyRecursive(src, dest);
console.log('[sync-railway-output] copied dist/ → server/dist/');
