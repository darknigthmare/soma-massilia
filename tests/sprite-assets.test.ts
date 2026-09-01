import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  requiredSpriteKinds,
  spriteKindForEntity,
  type SpriteKind,
} from '@/game/sprite-assets';

const manifestPath = path.join(
  process.cwd(),
  'public',
  'art',
  'runtime',
  'sprites.json',
);

describe('runtime sprite pipeline', () => {
  it('ships eight bounded alpha sheets below the decoded mobile budget', async () => {
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
    expect(Object.keys(manifest.sprites)).toHaveLength(8);
    let decodedBytes = 0;
    for (const entry of Object.values(manifest.sprites)) {
      expect(entry.width).toBe(768);
      expect(entry.height).toBe(768);
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
