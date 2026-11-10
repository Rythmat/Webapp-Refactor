import SuperJSON from 'superjson';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StrumMode, VelocityTilt } from '@prism/engine';
import {
  generatePrismClip,
  PrismGenerateError,
  type PrismClipResponse,
  type PrismPrompt,
} from '../api';

// ── Prism Create's request to music-atlas-api ──────────────────────────────
// POST /api/studio/prism/generate with the student's choices; the answer is
// SuperJSON, and every failure is a PrismGenerateError whose kind decides
// what the Studio tells the student.

const env = vi.hoisted(() => ({ base: 'https://api.example.test' }));
vi.mock('@/constants/env', () => ({ Env: { get: () => env.base } }));

const fetchMock = vi.fn<typeof fetch>();

const prompt: PrismPrompt = {
  key: { root: 2, mode: 'dorian' },
  progression: ['2 minor7', '5 dominant7'],
  rhythm: 'Quarters',
  swing: 10,
  strum: { mode: StrumMode.Down, amount: 12 },
  tilt: { mode: VelocityTilt.Balanced, amount: 0 },
};

const take: PrismClipResponse = {
  rhythm: 'Quarters',
  ticksPerQuarterNote: 480,
  clip: {
    durationTicks: 7680,
    events: [
      { note: 50, velocity: 100, startTick: 1, durationTicks: 480, channel: 1 },
    ],
  },
};

function answer(status: number, body: string): void {
  fetchMock.mockResolvedValueOnce(new Response(body, { status }));
}

async function failureOf(): Promise<PrismGenerateError> {
  const error = await generatePrismClip('tok', prompt).catch((e) => e);
  expect(error).toBeInstanceOf(PrismGenerateError);
  return error as PrismGenerateError;
}

beforeEach(() => {
  env.base = 'https://api.example.test';
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('generatePrismClip', () => {
  it('posts the prompt, signed in, and reads the SuperJSON take', async () => {
    answer(200, SuperJSON.stringify(take));

    await expect(generatePrismClip('tok', prompt)).resolves.toEqual(take);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example.test/api/studio/prism/generate');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual(prompt);
    expect(init?.headers).toMatchObject({
      Authorization: 'Bearer tok',
      'Content-Type': 'application/json',
    });
  });

  it('does not double the /api of a base that already ends in it', async () => {
    env.base = 'https://api.example.test/api/';
    answer(200, SuperJSON.stringify(take));

    await generatePrismClip('tok', prompt);

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.example.test/api/studio/prism/generate',
    );
  });

  it.each([
    [401, 'signed-out'],
    [422, 'rejected'],
    [400, 'rejected'],
    [404, 'server'], // an API deployed without this endpoint yet
    [500, 'server'],
    [503, 'server'],
  ] as const)('calls a %i %s', async (status, kind) => {
    answer(status, JSON.stringify({ error: 'Unknown chord: 4 hypermajor' }));

    const error = await failureOf();
    expect(error.kind).toBe(kind);
    expect(error.status).toBe(status);
    expect(error.message).toBe('Unknown chord: 4 hypermajor');
  });

  it('calls a request that never reached the server offline', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect((await failureOf()).kind).toBe('offline');
  });

  it('calls a request the timeout stopped a timeout', async () => {
    fetchMock.mockRejectedValueOnce(
      new DOMException('signal timed out', 'TimeoutError'),
    );
    expect((await failureOf()).kind).toBe('timeout');
  });

  it('calls a 200 without a clip a server failure', async () => {
    answer(200, SuperJSON.stringify({ rhythm: 'Quarters' }));
    expect((await failureOf()).kind).toBe('server');
  });
});
