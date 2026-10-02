/**
 * One polite HTTP client per server: one request at a time, spaced, and
 * patient when the server says "not now".
 *
 * MusicBrainz allows one request per second per IP and answers faster traffic
 * with 503 — and, if it keeps coming, with a block. Wikidata asks bots to send
 * `maxlag` and to wait when its replicas fall behind. Both say how long to
 * wait (`Retry-After`); this honours it, and falls back to a doubling delay
 * when they don't.
 *
 * The clock and `fetch` are injected so the tests run a fake clock against a
 * scripted server: the rate limit is the one thing here that must not be
 * "verified" by actually waiting.
 */

export interface Clock {
  now(): number;
  sleep(ms: number): Promise<void>;
}

export const systemClock: Clock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export interface PoliteHttpOptions {
  userAgent: string;
  /** Start-to-start spacing between two requests to this server. */
  minIntervalMs: number;
  /** Tries per URL, the first one included, before giving up. */
  maxAttempts?: number;
  /** The first wait when the server wants one but doesn't say how long. */
  backoffMs?: number;
  /**
   * The longest wait this will sit through. A server asking for more than
   * this is not throttling, it is closed: the request fails with a
   * `ServerClosedError`, the run stops, and a rerun resumes from the cache.
   */
  maxWaitMs?: number;
  timeoutMs?: number;
  /**
   * A 200 that really means "try again later" — Wikidata answers a maxlag
   * refusal with a normal status and an error in the body.
   */
  isRetryableBody?: (text: string) => boolean;
  log?: (line: string) => void;
}

export interface HttpResponse {
  url: string;
  status: number;
  text: string;
}

export class HttpError extends Error {
  constructor(
    message: string,
    readonly url: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/**
 * The server asked for a longer wait than the run will sit through: it is not
 * throttling, it is closed for now. Every later request would get the same
 * answer, so the run stops at once instead of counting failed artists.
 */
export class ServerClosedError extends HttpError {
  constructor(
    message: string,
    url: string,
    status: number | undefined,
    readonly waitMs: number,
  ) {
    super(message, url, status);
    this.name = 'ServerClosedError';
  }
}

export interface HttpStats {
  /** Requests that went on the wire, retries included. */
  requests: number;
  retries: number;
  waitedMs: number;
}

export interface PoliteHttp {
  get(url: string): Promise<HttpResponse>;
  readonly stats: HttpStats;
}

/** Throttling (429, 503) and the gateway errors a retry usually clears. */
const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);

/** `Sun, 06 Nov 1994 08:49:37 GMT` — the one date format servers send. */
const HTTP_DATE =
  /^[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/;

/**
 * `Retry-After` in milliseconds. The header is either whole seconds or an
 * HTTP date; anything else is ignored rather than guessed at (`Date.parse`
 * alone would read "-3" as the year 3 BC).
 */
export function parseRetryAfter(
  value: string | null,
  now: number,
): number | null {
  if (!value) return null;
  const text = value.trim();
  if (/^\d+$/.test(text)) return Number(text) * 1000;
  if (!HTTP_DATE.test(text)) return null;
  return Math.max(0, Date.parse(text) - now);
}

interface Attempt {
  response: HttpResponse | null;
  retryAfter: string | null;
  failure: string | null;
}

export function createPoliteHttp(
  options: PoliteHttpOptions,
  fetchImpl: FetchLike = (url, init) => fetch(url, init),
  clock: Clock = systemClock,
): PoliteHttp {
  const maxAttempts = options.maxAttempts ?? 6;
  const backoffMs = options.backoffMs ?? 2000;
  const maxWaitMs = options.maxWaitMs ?? 5 * 60_000;
  const timeoutMs = options.timeoutMs ?? 30_000;
  const stats: HttpStats = { requests: 0, retries: 0, waitedMs: 0 };
  let lastStart = Number.NEGATIVE_INFINITY;
  let queue: Promise<unknown> = Promise.resolve();

  const send = async (url: string): Promise<Attempt> => {
    const wait = lastStart + options.minIntervalMs - clock.now();
    if (wait > 0) await clock.sleep(wait);
    lastStart = clock.now();
    stats.requests++;
    try {
      const res = await fetchImpl(url, {
        headers: {
          'User-Agent': options.userAgent,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(timeoutMs),
      });
      const text = await res.text();
      return {
        response: { url, status: res.status, text },
        retryAfter: res.headers.get('retry-after'),
        failure: null,
      };
    } catch (error) {
      // A reset connection or a timeout: the server may be fine, so retry.
      const reason = error instanceof Error ? error.message : String(error);
      return { response: null, retryAfter: null, failure: reason };
    }
  };

  const run = async (url: string): Promise<HttpResponse> => {
    for (let attempt = 1; ; attempt++) {
      const { response, retryAfter, failure } = await send(url);
      const refused =
        response !== null &&
        (RETRY_STATUSES.has(response.status) ||
          (response.status === 200 &&
            (options.isRetryableBody?.(response.text) ?? false)));
      if (response && !refused) return response;

      const what = failure ?? `HTTP ${response?.status}`;
      if (attempt >= maxAttempts) {
        throw new HttpError(
          `${what} after ${attempt} tries: ${url}`,
          url,
          response?.status,
        );
      }
      const asked = parseRetryAfter(retryAfter, clock.now());
      if (asked !== null && asked > maxWaitMs) {
        throw new ServerClosedError(
          `${what}; the server asked to wait ${Math.round(asked / 1000)} s — stopping, rerun later to resume: ${url}`,
          url,
          response?.status,
          asked,
        );
      }
      const delay = Math.min(
        maxWaitMs,
        asked ?? backoffMs * 2 ** (attempt - 1),
      );
      stats.retries++;
      stats.waitedMs += delay;
      options.log?.(
        `  ${what} from ${new URL(url).host}; waiting ${Math.ceil(delay / 1000)} s (try ${attempt + 1} of ${maxAttempts})`,
      );
      await clock.sleep(delay);
    }
  };

  return {
    stats,
    get(url) {
      // Chained, so two callers can never overlap: "one request at a time" is
      // a property of the client, not something each caller must remember.
      const next = queue.then(() => run(url));
      queue = next.catch(() => undefined);
      return next;
    },
  };
}
