import type { WorldEntity } from './types';

type Frame = { x: number; y: number; width: number; height: number };
type SpriteEntry = {
  src: string;
  width: number;
  height: number;
  frames: Frame[];
};
type SpriteSheet = { image: HTMLImageElement; frames: Frame[] };
export type SpriteKind =
  | 'guard'
  | 'heavy'
  | 'collector'
  | 'nara'
  | 'idris'
  | 'salome'
  | 'civilian-worker'
  | 'civilian-witness'
  | 'viewmodel-pistol'
  | 'viewmodel-smg'
  | 'viewmodel-rifle'
  | 'viewmodel-blade';

type SpriteManifest = {
  version: number;
  sprites: Record<SpriteKind, SpriteEntry>;
};

export type SpriteLoadResult = {
  loaded: SpriteKind[];
  failed: SpriteKind[];
};

export type SpriteLoadOptions = {
  signal?: AbortSignal;
  attempts?: number;
  retryDelaysMs?: readonly number[];
  timeoutMs?: number;
  /** Bypasses HTTP and manifest caches after an explicit player retry. */
  reload?: boolean;
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
  'viewmodel-pistol',
  'viewmodel-smg',
  'viewmodel-rifle',
  'viewmodel-blade',
];
export const VIEWMODEL_SPRITE_KINDS = [
  'viewmodel-pistol',
  'viewmodel-smg',
  'viewmodel-rifle',
  'viewmodel-blade',
] as const satisfies readonly SpriteKind[];
const DEFAULT_RETRY_DELAYS = [0, 350, 1100] as const;
const loaded: Partial<Record<SpriteKind, SpriteSheet>> = {};
let manifestCache: SpriteManifest['sprites'] | null = null;

class SpriteAssetError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'SpriteAssetError';
  }
}

function abortedError(): Error {
  const error = new Error('Sprite loading aborted.');
  error.name = 'AbortError';
  return error;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw abortedError();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function retryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  throwIfAborted(signal);
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, ms);
    const abort = () => {
      clearTimeout(timer);
      reject(abortedError());
    };
    signal?.addEventListener('abort', abort, { once: true });
  });
}

async function withAttemptTimeout<T>(
  signal: AbortSignal | undefined,
  timeoutMs: number,
  task: (attemptSignal: AbortSignal) => Promise<T>,
): Promise<T> {
  throwIfAborted(signal);
  const controller = new AbortController();
  let timedOut = false;
  const forwardAbort = () => controller.abort();
  signal?.addEventListener('abort', forwardAbort, { once: true });
  let cancelAttempt: () => void = () => undefined;
  const cancellation = new Promise<never>((_, reject) => {
    cancelAttempt = () =>
      reject(
        timedOut
          ? new SpriteAssetError('Sprite request timed out.', true)
          : abortedError(),
      );
    controller.signal.addEventListener('abort', cancelAttempt, { once: true });
  });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    return await Promise.race([task(controller.signal), cancellation]);
  } catch (error) {
    if (signal?.aborted) throw abortedError();
    if (timedOut) throw new SpriteAssetError('Sprite request timed out.', true);
    throw error;
  } finally {
    clearTimeout(timer);
    controller.signal.removeEventListener('abort', cancelAttempt);
    signal?.removeEventListener('abort', forwardAbort);
  }
}

async function withRetries<T>(
  operation: () => Promise<T>,
  options: SpriteLoadOptions,
): Promise<T> {
  const attempts = Math.min(3, Math.max(1, Math.floor(options.attempts ?? 3)));
  const delays = options.retryDelaysMs?.length
    ? options.retryDelaysMs
    : DEFAULT_RETRY_DELAYS;
  let lastError: unknown = new SpriteAssetError(
    'Sprite request failed.',
    false,
  );
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0)
      await wait(
        delays[attempt] ?? delays[delays.length - 1] ?? 0,
        options.signal,
      );
    throwIfAborted(options.signal);
    try {
      return await operation();
    } catch (error) {
      if (isAbortError(error) || options.signal?.aborted) throw abortedError();
      lastError = error;
      if (
        !(error instanceof SpriteAssetError) ||
        !error.retryable ||
        attempt === attempts - 1
      )
        break;
    }
  }
  throw lastError;
}

function validEntry(value: unknown): value is SpriteEntry {
  if (
    !isRecord(value) ||
    typeof value.src !== 'string' ||
    !value.src.startsWith('/') ||
    !Number.isFinite(value.width) ||
    !Number.isFinite(value.height) ||
    Number(value.width) <= 0 ||
    Number(value.height) <= 0 ||
    Number(value.width) > 4096 ||
    Number(value.height) > 4096 ||
    !Array.isArray(value.frames) ||
    value.frames.length !== 8
  )
    return false;
  const width = Number(value.width);
  const height = Number(value.height);
  return value.frames.every((frame) => {
    if (!isRecord(frame)) return false;
    const x = Number(frame.x);
    const y = Number(frame.y);
    const frameWidth = Number(frame.width);
    const frameHeight = Number(frame.height);
    return (
      [x, y, frameWidth, frameHeight].every(Number.isFinite) &&
      x >= 0 &&
      y >= 0 &&
      frameWidth > 0 &&
      frameHeight > 0 &&
      x + frameWidth <= width &&
      y + frameHeight <= height
    );
  });
}

async function fetchManifestAttempt(
  signal: AbortSignal | undefined,
  timeoutMs: number,
  cache: RequestCache,
): Promise<SpriteManifest['sprites']> {
  return withAttemptTimeout(signal, timeoutMs, async (attemptSignal) => {
    let response: Response;
    try {
      response = await fetch('/art/runtime/sprites.json', {
        cache,
        signal: attemptSignal,
      });
    } catch (error) {
      if (attemptSignal.aborted) throw error;
      throw new SpriteAssetError('Sprite manifest unavailable.', true);
    }
    if (!response.ok)
      throw new SpriteAssetError(
        'Sprite manifest unavailable: ' + response.status,
        retryableStatus(response.status),
      );
    let value: unknown;
    try {
      value = await response.json();
    } catch {
      throw new SpriteAssetError('Sprite manifest is not valid JSON.', false);
    }
    if (!isRecord(value) || value.version !== 1 || !isRecord(value.sprites))
      throw new SpriteAssetError('Unsupported sprite manifest.', false);
    return value.sprites as SpriteManifest['sprites'];
  });
}

function decodeImage(
  image: HTMLImageElement,
  signal: AbortSignal,
): Promise<void> {
  if (signal.aborted) {
    image.src = '';
    return Promise.reject(abortedError());
  }
  return new Promise((resolve, reject) => {
    const cleanup = () => signal.removeEventListener('abort', abort);
    const abort = () => {
      image.src = '';
      cleanup();
      reject(abortedError());
    };
    signal.addEventListener('abort', abort, { once: true });
    let decoding: Promise<void>;
    try {
      decoding = image.decode();
    } catch (error) {
      cleanup();
      reject(error);
      return;
    }
    void decoding.then(
      () => {
        cleanup();
        resolve();
      },
      (error) => {
        cleanup();
        reject(error);
      },
    );
  });
}

async function loadKindAttempt(
  entry: SpriteEntry,
  signal: AbortSignal | undefined,
  timeoutMs: number,
  cache: RequestCache,
): Promise<SpriteSheet> {
  return withAttemptTimeout(signal, timeoutMs, async (attemptSignal) => {
    let response: Response;
    try {
      response = await fetch(entry.src, {
        cache,
        signal: attemptSignal,
      });
    } catch (error) {
      if (attemptSignal.aborted) throw error;
      throw new SpriteAssetError('Sprite sheet unavailable.', true);
    }
    if (!response.ok)
      throw new SpriteAssetError(
        'Sprite sheet unavailable: ' + response.status,
        retryableStatus(response.status),
      );
    let objectUrl = '';
    let image: HTMLImageElement | null = null;
    try {
      const blob = await response.blob();
      throwIfAborted(signal);
      objectUrl = URL.createObjectURL(blob);
      image = new Image();
      image.src = objectUrl;
      await decodeImage(image, attemptSignal);
      if (
        image.naturalWidth > 0 &&
        image.naturalHeight > 0 &&
        (image.naturalWidth !== entry.width ||
          image.naturalHeight !== entry.height)
      )
        throw new SpriteAssetError('Sprite sheet dimensions mismatch.', false);
      throwIfAborted(signal);
      return { image, frames: entry.frames };
    } catch (error) {
      if (signal?.aborted || attemptSignal.aborted) throw error;
      if (error instanceof SpriteAssetError) throw error;
      throw new SpriteAssetError('Sprite sheet could not be decoded.', true);
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      if (attemptSignal.aborted && image) image.src = '';
    }
  });
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

/**
 * Retains only the sheets required by the current scene. Each requested sheet
 * gets at most three attempts, independent failures keep their procedural
 * fallback, and cancellation never becomes a degraded player-facing state.
 */
export async function loadSpriteAssets(
  kinds: readonly SpriteKind[] = ALL_KINDS,
  options: SpriteLoadOptions = {},
): Promise<SpriteLoadResult> {
  const requested = [...new Set(kinds)];
  throwIfAborted(options.signal);
  const timeoutMs = Math.max(1, Math.min(8000, options.timeoutMs ?? 7000));
  const cache: RequestCache = options.reload ? 'reload' : 'force-cache';
  if (options.reload) manifestCache = null;
  let entries: SpriteManifest['sprites'];
  try {
    entries =
      manifestCache ??
      (await withRetries(
        () => fetchManifestAttempt(options.signal, timeoutMs, cache),
        options,
      ));
    manifestCache = entries;
  } catch (error) {
    if (isAbortError(error) || options.signal?.aborted) throw abortedError();
    return {
      loaded: requested.filter((kind) => Boolean(loaded[kind])),
      failed: requested.filter((kind) => !loaded[kind]),
    };
  }
  const results = await Promise.all(
    requested.map(async (kind) => {
      if (loaded[kind]) return true;
      const entry: unknown = entries[kind];
      if (!validEntry(entry)) return false;
      try {
        const sheet = await withRetries(
          () => loadKindAttempt(entry, options.signal, timeoutMs, cache),
          options,
        );
        throwIfAborted(options.signal);
        loaded[kind] = sheet;
        return true;
      } catch (error) {
        if (isAbortError(error) || options.signal?.aborted)
          throw abortedError();
        return false;
      }
    }),
  );
  return {
    loaded: requested.filter((_, index) => results[index]),
    failed: requested.filter((_, index) => !results[index]),
  };
}

/** Releases decoded sheets when a mission viewport unmounts or changes scene. */
export function releaseSpriteAssets(
  kinds: readonly SpriteKind[] = ALL_KINDS,
): void {
  for (const kind of kinds) {
    delete loaded[kind];
  }
}
