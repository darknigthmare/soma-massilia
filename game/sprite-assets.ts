/** Original RGB sprite sources stay intact. Chroma is interpreted once, in memory. */
type Frame = { x: number; y: number; width: number; height: number };
type SpriteSheet = { image: HTMLCanvasElement; frames: Frame[] };
export type SpriteKind =
  | 'guard'
  | 'heavy'
  | 'collector'
  | 'nara'
  | 'idris'
  | 'salome';
const SOURCES: Record<
  SpriteKind,
  { src: string; chroma: 'magenta' | 'green' }
> = {
  guard: { src: '/art/soma-guard-chroma.png', chroma: 'magenta' },
  heavy: { src: '/art/soma-heavy-v04-chroma.png', chroma: 'magenta' },
  collector: { src: '/art/collector-v04-chroma.png', chroma: 'magenta' },
  nara: { src: '/art/nara-velvet-chroma.png', chroma: 'magenta' },
  idris: { src: '/art/idris-senn-chroma.png', chroma: 'green' },
  salome: { src: '/art/salome-craie-chroma.png', chroma: 'green' },
};
const loaded: Partial<Record<SpriteKind, SpriteSheet>> = {};
let pending: Promise<void> | null = null;
export function getSpriteSheet(kind: SpriteKind): SpriteSheet | undefined {
  return loaded[kind];
}

export function loadSpriteAssets(): Promise<void> {
  if (pending) return pending;
  pending = (async () => {
    // Decode and key one sheet at a time. Six parallel 1254² decodes kept the
    // compressed image, RGBA buffer and destination canvas alive together,
    // causing an avoidable peak on low-memory mobile browsers.
    for (const kind of Object.keys(SOURCES) as SpriteKind[]) {
      const source = SOURCES[kind];
      const image = new Image();
      image.src = source.src;
      await image.decode();
      const surface = document.createElement('canvas');
      surface.width = image.naturalWidth;
      surface.height = image.naturalHeight;
      const ctx = surface.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, surface.width, surface.height);
      // Key each original source in memory. Preserve Nara's dark plum and
      // Salomé's cyan (cyan has a strong blue channel, unlike the green key).
      for (let i = 0; i < pixels.data.length; i += 4) {
        const r = pixels.data[i],
          g = pixels.data[i + 1],
          b = pixels.data[i + 2];
        const keyed =
          source.chroma === 'green'
            ? g > 95 && Math.max(r, b) < g * 0.38
            : r > 95 && b > 95 && g < Math.min(r, b) * 0.38;
        if (keyed) pixels.data[i + 3] = 0;
      }
      // Despill only the surviving silhouette boundary, not interior garment colors.
      for (let y = 1; y < surface.height - 1; y++)
        for (let x = 1; x < surface.width - 1; x++) {
          const i = (y * surface.width + x) * 4,
            p = pixels.data;
          if (
            !p[i + 3] ||
            [i - 4, i + 4, i - surface.width * 4, i + surface.width * 4].every(
              (n) => p[n + 3],
            )
          )
            continue;
          if (source.chroma === 'green') {
            const spill = Math.max(0, p[i + 1] - Math.max(p[i], p[i + 2]) - 24);
            p[i + 1] -= spill;
          } else {
            const spill = Math.max(0, Math.min(p[i], p[i + 2]) - p[i + 1] - 24);
            p[i] -= spill;
            p[i + 2] -= spill;
          }
        }
      ctx.putImageData(pixels, 0, 0);
      const frames: Frame[] = [];
      for (let index = 0; index < 8; index += 1) {
        const x0 = Math.round(((index % 4) * surface.width) / 4),
          x1 = Math.round((((index % 4) + 1) * surface.width) / 4);
        const y0 = Math.round((Math.floor(index / 4) * surface.height) / 2),
          y1 = Math.round(((Math.floor(index / 4) + 1) * surface.height) / 2);
        let left = x1,
          top = y1,
          right = x0,
          bottom = y0;
        for (let y = y0; y < y1; y += 1)
          for (let x = x0; x < x1; x += 1) {
            if (pixels.data[(y * surface.width + x) * 4 + 3]) {
              left = Math.min(left, x);
              right = Math.max(right, x);
              top = Math.min(top, y);
              bottom = Math.max(bottom, y);
            }
          }
        if (right < left || bottom < top)
          throw new Error(`Sprite ${kind}: direction ${index} is empty.`);
        frames.push({
          x: left,
          y: top,
          width: right - left + 1,
          height: bottom - top + 1,
        });
      }
      loaded[kind] = { image: surface, frames };
    }
  })().catch(() => {
    pending = null;
  });
  return pending;
}
