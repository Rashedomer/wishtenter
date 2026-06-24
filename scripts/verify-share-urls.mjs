/**
 * Fail the build if any client bundle still bakes Railway /share URLs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetsDir = path.join(root, 'dist', 'assets');
const indexHtml = path.join(root, 'dist', 'index.html');

const FORBIDDEN = /railway\.app\/share[`'"]/;

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.js$/i.test(name)) out.push(full);
  }
  return out;
}

const files = walk(assetsDir);
const hits = [];

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  if (FORBIDDEN.test(text)) {
    hits.push(path.relative(root, file));
  }
}

if (hits.length) {
  console.error('[verify-share-urls] Railway /share URLs found in build output:');
  for (const hit of hits) console.error('  -', hit);
  process.exit(1);
}

if (!fs.existsSync(indexHtml) || !fs.readFileSync(indexHtml, 'utf8').includes('id="wishtenter-share-fix"')) {
  console.error('[verify-share-urls] dist/index.html missing share-fix injection');
  process.exit(1);
}

console.log('[verify-share-urls] OK — share links use wishtenter.com');
