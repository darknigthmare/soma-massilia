import type { WorldEntity } from './types';

type Frame = { x: number; y: number; width: number; height: number };
type SpriteSheet = { image: HTMLImageElement; frames: Frame[] };
export type SpriteKind =
  | 'guard'
  | 'heavy'
  | 'collector'
  | 'nara'
  | 'idris'
  | 'salome'
  | 'civilian-worker'
  | 'civilian-witness';

type SpriteManifest = {
  version: number;
  sprites: Record<
    SpriteKind,
    { src: string; width: number; height: number; frames: Frame[] }
  >;
};

const ALL_KINDS: SpriteKind[] = [
  'guard',
  'heavy',
  'collector',
  'nara',
  'idris',
  'salome',
  'civilian-worker',
  'civilian-witness',
];
const loaded: Partial<Record<SpriteKind, SpriteSheet>> = {};
const pending: Partial<Record<SpriteKind, Promise<void>>> = {};
let desired = new Set<SpriteKind>();
let manifestPromise: Promise<SpriteManifest['sprites']> | null = null;

function manifest(): Promise<SpriteManifest['sprites']> {
  manifestPromise ??= fetch('/art/runtime/sprites.json', {
    cache: 'force-cache',
  })
    .then(async (response) => {
      if (!response.ok)
        throw new Error(`Sprite manifest unavailable: ${response.status}`);
      const value = (await response.json()) as SpriteManifest;
      if (value.version !== 1) throw new Error('Unsupported sprite manifest.');
      return value.sprites;
    })
    .catch((error) => {
      manifestPromise = null;
      throw error;
    });
  return manifestPromise;
}

export function spriteKindForEntity(
  entity: Pick<WorldEntity, 'id' | 'kind' | 'agentId'>,
): SpriteKind | undefined {
  if (entity.agentId) return entity.agentId;
  if (entity.kind === 'heavy') return 'heavy';
  if (entity.kind === 'boss') return 'collector';
  if (entity.kind === 'guard') return 'guard';
  if (entity.kind !== 'nara') return undefined;
  if (entity.id === 'nara') return 'nara';
  if (
    entity.id.includes('resident') ||
    entity.id.includes('worker') ||
    entity.id.startsWith('station.')
  )
    return 'civilian-worker';
  return 'civilian-witness';
}

export function requiredSpriteKinds(
  entities: readonly Pick<WorldEntity, 'id' | 'kind' | 'agentId'>[],
): SpriteKind[] {
  return [
    ...new Set(
      entities
        .map(spriteKindForEntity)
        .filter((kind): kind is SpriteKind => kind !== undefined),
    ),
  ];
}

export function getSpriteSheet(kind: SpriteKind): SpriteSheet | undefined {
  return loaded[kind];
}

async function loadKind(kind: SpriteKind): Promise<void> {
  if (loaded[kind]) return;
  if (pending[kind]) return pending[kind];
  const task = (async () => {
    const entry = (await manifest())[kind];
    if (!entry || entry.frames.length !== 8)
      throw new Error(`Sprite manifest entry invalid: ${kind}`);
    const image = new Image();
    image.src = entry.src;
    await image.decode();
    if (desired.has(kind)) loaded[kind] = { image, frames: entry.frames };
  })().finally(() => {
    delete pending[kind];
  });
  pending[kind] = task;
  return task;
}

/**
 * Retains only the sheets required by the current scene. The 768px alpha
 * derivatives avoid main-thread chroma scans and cap eight decoded sheets at
 * about 18 MiB; ordinary scenes keep substantially less.
 */
export async function loadSpriteAssets(
  kinds: readonly SpriteKind[] = ALL_KINDS,
): Promise<void> {
  desired = new Set(kinds);
  for (const kind of ALL_KINDS) if (!desired.has(kind)) delete loaded[kind];
  for (const kind of kinds) {
    if (!desired.has(kind)) break;
    await loadKind(kind);
  }
}
