import SuperJSON from 'superjson';
import type { MidiNoteEvent, StrumMode, VelocityTilt } from '@prism/engine';
import { authFetch } from '@/auth/authFetch';
import { Env } from '@/constants/env';

// ── Prism Create on the server ─────────────────────────────────────────────
//
// The Studio's Prism panel sends what the student chose (the prompt) to
// music-atlas-api, which voices the chords and writes the take
// (POST /api/studio/prism/generate, services/prism/generate-clip.ts there).
// The Studio places the clip it gets back; see generateToTracks in
// src/daw/store/prismSlice.ts.

/** What the student chose in Prism. */
export interface PrismPrompt {
  /** The key: tonic pitch class (0 = C) and mode ('ionian', 'dorian', …). */
  key: { root: number; mode: string };
  /** Graph chord names, in order: "1 major", "b7 dominant7". */
  progression: string[];
  /** A chord rhythm's name; one the server doesn't know becomes Quarters. */
  rhythm: string;
  swing: number;
  strum: { mode: StrumMode; amount: number };
  tilt: { mode: VelocityTilt; amount: number };
}

/** Four bars of 4/4 at 480 PPQ, starting at its own tick 0. */
export interface PrismClipResponse {
  /** The rhythm the server used. */
  rhythm: string;
  ticksPerQuarterNote: number;
  clip: { durationTicks: number; events: MidiNoteEvent[] };
}

export type PrismGenerateFailure =
  | 'signed-out'
  | 'offline'
  | 'timeout'
  | 'rejected'
  | 'server';

export class PrismGenerateError extends Error {
  constructor(
    message: string,
    readonly kind: PrismGenerateFailure,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'PrismGenerateError';
  }
}

/** Generation takes milliseconds; this covers a cold start and a slow link. */
const TIMEOUT_MS = 20_000;

function generateUrl(): string {
  const base = Env.get('VITE_MUSIC_ATLAS_API_URL').replace(/\/+$/, '');
  // Some deployments' base already ends in /api (see lib/gameOptions/api.ts).
  const path = base.endsWith('/api')
    ? '/studio/prism/generate'
    : '/api/studio/prism/generate';
  return `${base}${path}`;
}

function failureKind(status: number): PrismGenerateFailure {
  if (status === 401) return 'signed-out';
  // The prompt itself was refused (schema, or a chord the server can't voice).
  if (status === 400 || status === 422) return 'rejected';
  // 5xx, and a 404 from an API deployed without this endpoint yet.
  return 'server';
}

function errorMessage(text: string, status: number): string {
  try {
    const parsed = JSON.parse(text) as { error?: unknown };
    if (typeof parsed.error === 'string') return parsed.error;
  } catch {
    // Not JSON: fall through to the status.
  }
  return `HTTP ${status}`;
}

/**
 * Ask the server for the chord clip a Prism prompt makes. Throws a
 * PrismGenerateError saying what kind of failure it was.
 */
export async function generatePrismClip(
  token: string,
  prompt: PrismPrompt,
): Promise<PrismClipResponse> {
  let response: Response;
  try {
    response = await authFetch(generateUrl(), token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prompt),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut =
      error instanceof DOMException && error.name === 'TimeoutError';
    throw new PrismGenerateError(
      timedOut ? 'Prism generation timed out' : String(error),
      timedOut ? 'timeout' : 'offline',
    );
  }

  const text = await response.text();
  if (!response.ok) {
    throw new PrismGenerateError(
      errorMessage(text, response.status),
      failureKind(response.status),
      response.status,
    );
  }

  // The API serialises responses with SuperJSON.
  const data = SuperJSON.parse<PrismClipResponse>(text);
  if (!Array.isArray(data?.clip?.events)) {
    throw new PrismGenerateError('Malformed Prism clip response', 'server');
  }
  return data;
}
