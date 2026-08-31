import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? walk(path.join(dir, entry.name))
          : path.join(dir, entry.name),
      ),
    )
  ).flat();
}
const files = await walk('.next/static');
const urls = files
  .filter((file) => /\.(?:js|css|woff2?)$/.test(file))
  .map((file) => '/' + file.replaceAll('\\', '/').replace('.next/', '_next/'));
await writeFile(
  'public/precache.json',
  JSON.stringify({ version: '0.3.0', assets: urls }),
);
console.log('Offline manifest: ' + urls.length + ' built assets.');
