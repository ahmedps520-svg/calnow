import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { tileSvg } from './logo.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'icons');
mkdirSync(out, { recursive: true });

const png = (svg, size, file) =>
  sharp(Buffer.from(svg)).resize(size, size).png({ compressionLevel: 9 }).toFile(join(out, file));

const standard = tileSvg({ radius: 112 });
const maskable = tileSvg({ radius: 0, glyphScale: 0.68, bleed: true });

writeFileSync(join(root, 'public', 'logo.svg'), standard);

await Promise.all([
  png(standard, 192, 'icon-192.png'),
  png(standard, 512, 'icon-512.png'),
  png(standard, 180, 'apple-touch-icon.png'),
  png(standard, 32, 'favicon-32.png'),
  png(maskable, 512, 'maskable-512.png'),
  png(maskable, 192, 'maskable-192.png'),
]);
console.log('icons written to public/icons');
