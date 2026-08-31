import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
const svg = await readFile(new URL('../public/favicon.svg', import.meta.url));
await Promise.all(
  [192, 512].map((size) =>
    sharp(svg)
      .resize(size, size)
      .png()
      .toFile(
        new URL(
          '../public/icon-' + size + '.png',
          import.meta.url,
        ).pathname.replace(/^\/([A-Z]:)/, '$1'),
      ),
  ),
);
console.log('Original application icons: 192 and 512 px.');
