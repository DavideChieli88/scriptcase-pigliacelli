import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

mkdirSync(dist, { recursive: true });

for (const file of ['appinfo.json', 'icon.png', 'largeIcon.png']) {
  const src = join(root, file === 'appinfo.json' ? 'appinfo.json' : join('public', file));
  const fallback = join(root, file);
  const from = existsSync(src) ? src : fallback;
  if (!existsSync(from)) {
    console.warn(`[copy-webos-assets] missing ${file}`);
    continue;
  }
  copyFileSync(from, join(dist, file));
  console.log(`[copy-webos-assets] copied ${file}`);
}
