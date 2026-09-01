import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SpriteKind } from '@/game/sprite-assets';

const FRAME = { x: 0, y: 0, width: 96, height: 192 };

function spriteEntry(src: string) {
  return {
    src,
    width: 768,
    height: 768,
    frames: Array.from({ length: 8 }, () => ({ ...FRAME })),
  };
}

function manifestResponse(
  sprites: Partial<Record<SpriteKind, ReturnType<typeof spriteEntry>>>,
  version = 1,
): Response {
  return new Response(JSON.stringify({ version, sprites }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function assetResponse(status = 200): Response {
  return new Response(new Blob(['sprite']), { status });
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  return input instanceof URL ? input.href : input.url;
}

async function runtimeWithImage(
  decode: () => Promise<void> = () => Promise.resolve(),
) {
  let imageCount = 0;
  const images: { src: string }[] = [];
  class FakeImage {
    src = '';
    naturalWidth = 768;
    naturalHeight = 768;
    constructor() {
      imageCount += 1;
      images.push(this);
    }
    decode() {
      return decode();
    }
  }
  vi.stubGlobal('Image', FakeImage);
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:soma-sprite');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  const spriteRuntime = await import('@/game/sprite-assets');
  return { spriteRuntime, imageCount: () => imageCount, images: () => images };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('resilient runtime sprite loading', () => {
  it('retries a transient manifest failure and then loads the sheet', async () => {
    let manifestCalls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (requestUrl(input).includes('sprites.json')) {
          manifestCalls += 1;
          if (manifestCalls === 1) throw new TypeError('offline');
          return manifestResponse({ guard: spriteEntry('/guard.webp') });
        }
        return assetResponse();
      }),
    );
    const { spriteRuntime } = await runtimeWithImage();
    const result = await spriteRuntime.loadSpriteAssets(['guard'], {
      retryDelaysMs: [0, 0, 0],
      timeoutMs: 100,
    });
    expect(manifestCalls).toBe(2);
    expect(result).toEqual({ loaded: ['guard'], failed: [] });
    expect(spriteRuntime.getSpriteSheet('guard')).toBeDefined();
  });

  it('bounds decode retries to three attempts before keeping the fallback', async () => {
    let assetCalls = 0;
    const decode = vi.fn(async () => {
      throw new Error('decode failed');
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (requestUrl(input).includes('sprites.json'))
          return manifestResponse({ guard: spriteEntry('/guard.webp') });
        assetCalls += 1;
        return assetResponse();
      }),
    );
    const { spriteRuntime } = await runtimeWithImage(decode);
    const result = await spriteRuntime.loadSpriteAssets(['guard'], {
      retryDelaysMs: [0, 0, 0],
      timeoutMs: 100,
    });
    expect(assetCalls).toBe(3);
    expect(decode).toHaveBeenCalledTimes(3);
    expect(result).toEqual({ loaded: [], failed: ['guard'] });
    expect(spriteRuntime.getSpriteSheet('guard')).toBeUndefined();
  });

  it('recovers when the third decode attempt succeeds', async () => {
    const decode = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('decode 1'))
      .mockRejectedValueOnce(new Error('decode 2'))
      .mockResolvedValue(undefined);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) =>
        requestUrl(input).includes('sprites.json')
          ? manifestResponse({ guard: spriteEntry('/guard.webp') })
          : assetResponse(),
      ),
    );
    const { spriteRuntime } = await runtimeWithImage(decode);
    const result = await spriteRuntime.loadSpriteAssets(['guard'], {
      retryDelaysMs: [0, 0, 0],
      timeoutMs: 100,
    });
    expect(decode).toHaveBeenCalledTimes(3);
    expect(result).toEqual({ loaded: ['guard'], failed: [] });
  });

  it('does not retry permanent HTTP or structural failures', async () => {
    let assetCalls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (requestUrl(input).includes('sprites.json'))
          return manifestResponse({
            guard: spriteEntry('/guard.webp'),
            heavy: {
              ...spriteEntry('/heavy.webp'),
              frames: [{ ...FRAME }],
            },
          });
        assetCalls += 1;
        return assetResponse(404);
      }),
    );
    const { spriteRuntime, imageCount } = await runtimeWithImage();
    const result = await spriteRuntime.loadSpriteAssets(['guard', 'heavy'], {
      retryDelaysMs: [0, 0, 0],
      timeoutMs: 100,
    });
    expect(assetCalls).toBe(1);
    expect(imageCount()).toBe(0);
    expect(result).toEqual({ loaded: [], failed: ['guard', 'heavy'] });
  });

  it('rejects an unsupported manifest without requesting a sheet', async () => {
    let manifestCalls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        manifestCalls += 1;
        return manifestResponse({ guard: spriteEntry('/guard.webp') }, 2);
      }),
    );
    const { spriteRuntime, imageCount } = await runtimeWithImage();
    const result = await spriteRuntime.loadSpriteAssets(['guard'], {
      retryDelaysMs: [0, 0, 0],
      timeoutMs: 100,
    });
    expect(manifestCalls).toBe(1);
    expect(imageCount()).toBe(0);
    expect(result).toEqual({ loaded: [], failed: ['guard'] });
  });

  it('preserves successful sheets when another requested asset fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = requestUrl(input);
        if (url.includes('sprites.json'))
          return manifestResponse({
            guard: spriteEntry('/guard.webp'),
            heavy: spriteEntry('/heavy.webp'),
          });
        return assetResponse(url.includes('heavy') ? 404 : 200);
      }),
    );
    const { spriteRuntime } = await runtimeWithImage();
    const result = await spriteRuntime.loadSpriteAssets(['guard', 'heavy'], {
      retryDelaysMs: [0, 0, 0],
      timeoutMs: 100,
    });
    expect(result).toEqual({ loaded: ['guard'], failed: ['heavy'] });
    expect(spriteRuntime.getSpriteSheet('guard')).toBeDefined();
    expect(spriteRuntime.getSpriteSheet('heavy')).toBeUndefined();
  });

  it('reloads a repaired manifest without discarding partial successes', async () => {
    let manifestCalls = 0;
    let guardCalls = 0;
    let heavyCalls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = requestUrl(input);
        if (url.includes('sprites.json')) {
          manifestCalls += 1;
          return manifestResponse({
            guard: spriteEntry('/guard.webp'),
            heavy:
              manifestCalls === 1
                ? { ...spriteEntry('/heavy.webp'), frames: [{ ...FRAME }] }
                : spriteEntry('/heavy.webp'),
          });
        }
        if (url.includes('guard')) guardCalls += 1;
        if (url.includes('heavy')) heavyCalls += 1;
        return assetResponse();
      }),
    );
    const { spriteRuntime } = await runtimeWithImage();
    expect(
      await spriteRuntime.loadSpriteAssets(['guard', 'heavy'], {
        timeoutMs: 100,
      }),
    ).toEqual({ loaded: ['guard'], failed: ['heavy'] });
    expect(
      await spriteRuntime.loadSpriteAssets(['guard', 'heavy'], {
        reload: true,
        timeoutMs: 100,
      }),
    ).toEqual({ loaded: ['guard', 'heavy'], failed: [] });
    expect(manifestCalls).toBe(2);
    expect(guardCalls).toBe(1);
    expect(heavyCalls).toBe(1);
  });

  it('aborts during backoff without issuing another request', async () => {
    vi.useFakeTimers();
    let assetCalls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (requestUrl(input).includes('sprites.json'))
          return manifestResponse({ guard: spriteEntry('/guard.webp') });
        assetCalls += 1;
        throw new TypeError('network');
      }),
    );
    const { spriteRuntime } = await runtimeWithImage();
    const controller = new AbortController();
    const loading = spriteRuntime.loadSpriteAssets(['guard'], {
      signal: controller.signal,
      retryDelaysMs: [0, 1000, 1000],
      timeoutMs: 100,
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(assetCalls).toBe(1);
    controller.abort();
    await expect(loading).rejects.toMatchObject({ name: 'AbortError' });
    await vi.runAllTimersAsync();
    expect(assetCalls).toBe(1);
  });

  it('times out a request even when the underlying promise never settles', async () => {
    vi.useFakeTimers();
    let assetCalls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        if (requestUrl(input).includes('sprites.json'))
          return Promise.resolve(
            manifestResponse({ guard: spriteEntry('/guard.webp') }),
          );
        assetCalls += 1;
        return new Promise<Response>(() => undefined);
      }),
    );
    const { spriteRuntime } = await runtimeWithImage();
    const loading = spriteRuntime.loadSpriteAssets(['guard'], {
      retryDelaysMs: [0, 0, 0],
      timeoutMs: 25,
    });
    await vi.advanceTimersByTimeAsync(100);
    await expect(loading).resolves.toEqual({
      loaded: [],
      failed: ['guard'],
    });
    expect(assetCalls).toBe(3);
  });

  it('cancels an in-flight decode and never registers the sheet', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) =>
        requestUrl(input).includes('sprites.json')
          ? manifestResponse({ guard: spriteEntry('/guard.webp') })
          : assetResponse(),
      ),
    );
    const decode = vi.fn(() => new Promise<void>(() => undefined));
    const { spriteRuntime, images } = await runtimeWithImage(decode);
    const controller = new AbortController();
    const loading = spriteRuntime.loadSpriteAssets(['guard'], {
      signal: controller.signal,
      timeoutMs: 5000,
    });
    await vi.waitFor(() => expect(decode).toHaveBeenCalledOnce());
    controller.abort();
    await expect(loading).rejects.toMatchObject({ name: 'AbortError' });
    expect(images()[0]?.src).toBe('');
    expect(spriteRuntime.getSpriteSheet('guard')).toBeUndefined();
  });

  it('reuses a decoded sheet without another network request', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) =>
      requestUrl(input).includes('sprites.json')
        ? manifestResponse({ guard: spriteEntry('/guard.webp') })
        : assetResponse(),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { spriteRuntime } = await runtimeWithImage();
    await spriteRuntime.loadSpriteAssets(['guard'], { timeoutMs: 100 });
    await spriteRuntime.loadSpriteAssets(['guard'], { timeoutMs: 100 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('releases decoded sheets when a scene unmounts', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) =>
        requestUrl(input).includes('sprites.json')
          ? manifestResponse({ guard: spriteEntry('/guard.webp') })
          : assetResponse(),
      ),
    );
    const { spriteRuntime } = await runtimeWithImage();
    await spriteRuntime.loadSpriteAssets(['guard'], {
      retryDelaysMs: [0, 0, 0],
      timeoutMs: 100,
    });
    expect(spriteRuntime.getSpriteSheet('guard')).toBeDefined();
    spriteRuntime.releaseSpriteAssets(['guard']);
    expect(spriteRuntime.getSpriteSheet('guard')).toBeUndefined();
  });
});
