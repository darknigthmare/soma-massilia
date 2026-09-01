import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const ORIGIN = 'https://soma-massilia.test';
const SPRITE_MANIFEST_URL = `${ORIGIN}/art/runtime/sprites.json`;

type WorkerFetchEvent = {
  request: Request;
  respondWith(response: Promise<Response>): void;
  waitUntil(promise: Promise<unknown>): void;
};

type WorkerFetchHandler = (event: WorkerFetchEvent) => void;

function absoluteRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return new URL(input, ORIGIN).href;
  if (input instanceof URL) return input.href;
  return input.url;
}

async function createServiceWorkerHarness(networkFailure = false) {
  const serviceWorker = await readFile(
    path.join(process.cwd(), 'public', 'sw.js'),
    'utf8',
  );
  const cachedResponses = new Map<string, Response>([
    [SPRITE_MANIFEST_URL, new Response('cached sprite manifest')],
  ]);
  const cache = {
    addAll: vi.fn(async () => undefined),
    match: vi.fn(async (input: RequestInfo | URL) =>
      cachedResponses.get(absoluteRequestUrl(input))?.clone(),
    ),
    put: vi.fn(async (input: RequestInfo | URL, response: Response) => {
      cachedResponses.set(absoluteRequestUrl(input), response.clone());
    }),
  };
  const networkFetch = vi.fn(async (_input: RequestInfo | URL) => {
    if (networkFailure) throw new TypeError('offline');
    return new Response('fresh sprite manifest', { status: 200 });
  });
  let fetchHandler: WorkerFetchHandler | undefined;

  runInNewContext(serviceWorker, {
    URL,
    Request,
    Response,
    caches: {
      open: vi.fn(async () => cache),
      keys: vi.fn(async () => []),
      delete: vi.fn(async () => true),
    },
    fetch: networkFetch,
    self: {
      location: { origin: ORIGIN },
      clients: { claim: vi.fn(async () => undefined) },
      skipWaiting: vi.fn(async () => undefined),
      addEventListener(type: string, listener: unknown) {
        if (type === 'fetch') fetchHandler = listener as WorkerFetchHandler;
      },
    },
  });

  const handler = fetchHandler;
  if (!handler) throw new Error('Service worker fetch handler missing.');

  return {
    cache,
    cachedResponses,
    networkFetch,
    async dispatch(request: Request) {
      const backgroundWork: Promise<unknown>[] = [];
      let responsePromise: Promise<Response> | undefined;
      handler({
        request,
        respondWith(response) {
          responsePromise = response;
        },
        waitUntil(promise) {
          backgroundWork.push(promise);
        },
      });
      if (!responsePromise)
        throw new Error('Service worker did not handle the request.');
      const response = await responsePromise;
      await Promise.all(backgroundWork);
      return response;
    },
  };
}

describe('PWA application assets', () => {
  it('ships a valid PNG-backed ICO fallback for browsers requesting favicon.ico', async () => {
    const favicon = await readFile(
      path.join(process.cwd(), 'public', 'favicon.ico'),
    );
    expect([...favicon.subarray(0, 6)]).toEqual([0, 0, 1, 0, 1, 0]);
    expect(favicon.readUInt32LE(18)).toBe(22);
    expect([...favicon.subarray(22, 30)]).toEqual([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
  });

  it('pre-caches every generated first-person viewmodel', async () => {
    const serviceWorker = await readFile(
      path.join(process.cwd(), 'public', 'sw.js'),
      'utf8',
    );
    for (const weapon of ['pistol', 'smg', 'rifle', 'blade'])
      expect(serviceWorker).toContain(`/art/runtime/viewmodels/${weapon}.webp`);
  });

  it('keeps ordinary sprite requests cache-first', async () => {
    const harness = await createServiceWorkerHarness();

    const response = await harness.dispatch(new Request(SPRITE_MANIFEST_URL));

    expect(await response.text()).toBe('cached sprite manifest');
    expect(harness.cache.match).toHaveBeenCalledTimes(1);
    expect(harness.networkFetch).not.toHaveBeenCalled();
    expect(harness.cache.put).not.toHaveBeenCalled();
  });

  it('bypasses stale Cache Storage and refreshes it for cache reload requests', async () => {
    const harness = await createServiceWorkerHarness();

    const response = await harness.dispatch(
      new Request(SPRITE_MANIFEST_URL, { cache: 'reload' }),
    );

    expect(await response.text()).toBe('fresh sprite manifest');
    expect(harness.cache.match).not.toHaveBeenCalled();
    expect(harness.networkFetch).toHaveBeenCalledTimes(1);
    expect(harness.cache.put).toHaveBeenCalledTimes(1);
    const stored = harness.cachedResponses.get(SPRITE_MANIFEST_URL);
    expect(await stored?.text()).toBe('fresh sprite manifest');
  });

  it('falls back to the cached sprite when a reload cannot reach the network', async () => {
    const harness = await createServiceWorkerHarness(true);

    const response = await harness.dispatch(
      new Request(SPRITE_MANIFEST_URL, { cache: 'reload' }),
    );

    expect(await response.text()).toBe('cached sprite manifest');
    expect(harness.networkFetch).toHaveBeenCalledTimes(1);
    expect(harness.cache.match).toHaveBeenCalledTimes(1);
    expect(harness.cache.put).not.toHaveBeenCalled();
  });
});
