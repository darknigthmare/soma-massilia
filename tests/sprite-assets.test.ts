import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import {
  requiredSpriteKinds,
  spriteKindForEntity,
  VIEWMODEL_SPRITE_KINDS,
  type SpriteKind,
} from '@/game/sprite-assets';

const manifestPath = path.join(
  process.cwd(),
  'public',
  'art',
  'runtime',
  'sprites.json',
);

async function significantAlphaComponents(file: string) {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const total = info.width * info.height;
  const seen = new Uint8Array(total);
  const stack = new Int32Array(total);
  const components: number[] = [];
  for (let start = 0; start < total; start += 1) {
    if (seen[start] || data[start * 4 + 3] <= 24) continue;
    let stackLength = 1;
    let size = 0;
    stack[0] = start;
    seen[start] = 1;
    while (stackLength > 0) {
      stackLength -= 1;
      const pixel = stack[stackLength];
      size += 1;
      const x = pixel % info.width;
      for (const neighbor of [
        pixel - 1,
        pixel + 1,
        pixel - info.width,
        pixel + info.width,
      ]) {
        if (
          neighbor < 0 ||
          neighbor >= total ||
          seen[neighbor] ||
          data[neighbor * 4 + 3] <= 24 ||
          Math.abs((neighbor % info.width) - x) > 1
        )
          continue;
        seen[neighbor] = 1;
        stack[stackLength] = neighbor;
        stackLength += 1;
      }
    }
    components.push(size);
  }
  return components;
}

describe('runtime sprite pipeline', () => {
  it('ships twelve bounded alpha sheets below the decoded mobile budget', async () => {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
      version: number;
      sprites: Record<
        SpriteKind,
        {
          src: string;
          width: number;
          height: number;
          frames: { x: number; y: number; width: number; height: number }[];
        }
      >;
    };
    expect(manifest.version).toBe(1);
    expect(Object.keys(manifest.sprites)).toHaveLength(12);
    let decodedBytes = 0;
    for (const [kind, entry] of Object.entries(manifest.sprites) as [
      SpriteKind,
      (typeof manifest.sprites)[SpriteKind],
    ][]) {
      const expectedSize = VIEWMODEL_SPRITE_KINDS.includes(
        kind as (typeof VIEWMODEL_SPRITE_KINDS)[number],
      )
        ? 512
        : 768;
      expect(entry.width).toBe(expectedSize);
      expect(entry.height).toBe(expectedSize);
      expect(entry.frames).toHaveLength(8);
      decodedBytes += entry.width * entry.height * 4;
      for (const frame of entry.frames) {
        expect(frame.width).toBeGreaterThan(0);
        expect(frame.height).toBeGreaterThan(0);
        expect(frame.x + frame.width).toBeLessThanOrEqual(entry.width);
        expect(frame.y + frame.height).toBeLessThanOrEqual(entry.height);
      }
      const file = path.join(process.cwd(), 'public', entry.src);
      expect((await stat(file)).size).toBeGreaterThan(10_000);
      if (
        VIEWMODEL_SPRITE_KINDS.includes(
          kind as (typeof VIEWMODEL_SPRITE_KINDS)[number],
        )
      ) {
        const components = await significantAlphaComponents(file);
        expect(components.length).toBeGreaterThan(0);
        expect(components.length).toBeLessThanOrEqual(4);
        expect(components.every((size) => size >= 64)).toBe(true);
      }
    }
    expect(decodedBytes).toBeLessThan(32 * 1024 * 1024);
  });

  it('keeps named agents and generic adult civilians visually distinct', () => {
    expect(
      spriteKindForEntity({
        id: 'agent.idris',
        kind: 'nara',
        agentId: 'idris',
      }),
    ).toBe('idris');
    expect(spriteKindForEntity({ id: 'nara', kind: 'nara' })).toBe('nara');
    expect(spriteKindForEntity({ id: 'resident.mole-9', kind: 'nara' })).toBe(
      'civilian-worker',
    );
    expect(
      spriteKindForEntity({ id: 'objective.appearance-witness', kind: 'nara' }),
    ).toBe('civilian-witness');
    expect(spriteKindForEntity({ id: 'guard.1', kind: 'guard' })).toBe('guard');
  });

  it('deduplicates the sheets required by a scene', () => {
    expect(
      requiredSpriteKinds([
        { id: 'guard.1', kind: 'guard' },
        { id: 'guard.2', kind: 'guard' },
        { id: 'resident.1', kind: 'nara' },
        { id: 'terminal.1', kind: 'terminal' },
      ]),
    ).toEqual(['guard', 'civilian-worker']);
  });
});
