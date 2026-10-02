import { describe, expect, it } from 'vitest';
import { MUSICBRAINZ_HTTP } from '../musicbrainz';
import {
  createPoliteHttp,
  HttpError,
  parseRetryAfter,
  ServerClosedError,
} from '../politeHttp';
import { fakeClock, scriptedFetch } from './fakes';

const URL_A = 'https://musicbrainz.org/ws/2/artist/a';
const URL_B = 'https://musicbrainz.org/ws/2/artist/b';
const URL_C = 'https://musicbrainz.org/ws/2/artist/c';

describe('the polite client', () => {
  it('starts requests at least 1.1 s apart, one at a time', async () => {
    const clock = fakeClock();
    // Each answer takes 300 ms, so only the rest of the interval is waited.
    const server = scriptedFetch(clock, [{ takesMs: 300 }]);
    const http = createPoliteHttp(MUSICBRAINZ_HTTP, server.fetch, clock);

    // Asked for all at once; the client queues them anyway.
    await Promise.all([http.get(URL_A), http.get(URL_B), http.get(URL_C)]);

    expect(server.calls.map((c) => c.at)).toEqual([0, 1100, 2200]);
    expect(clock.sleeps).toEqual([300, 800, 300, 800, 300]);
    expect(http.stats).toMatchObject({ requests: 3, retries: 0 });
  });

  it('does not wait before the first request, or after a long gap', async () => {
    const clock = fakeClock();
    const server = scriptedFetch(clock, [{}]);
    const http = createPoliteHttp(MUSICBRAINZ_HTTP, server.fetch, clock);

    await http.get(URL_A);
    await clock.sleep(5000);
    await http.get(URL_B);

    expect(server.calls.map((c) => c.at)).toEqual([0, 5000]);
  });

  it('honours Retry-After in seconds on a 503', async () => {
    const clock = fakeClock();
    const server = scriptedFetch(clock, [
      { status: 503, headers: { 'Retry-After': '7' }, body: 'slow down' },
      { body: { id: 'a' } },
    ]);
    const http = createPoliteHttp(MUSICBRAINZ_HTTP, server.fetch, clock);

    const res = await http.get(URL_A);

    expect(res.status).toBe(200);
    expect(JSON.parse(res.text)).toEqual({ id: 'a' });
    expect(server.calls.map((c) => c.at)).toEqual([0, 7000]);
    expect(http.stats).toMatchObject({
      requests: 2,
      retries: 1,
      waitedMs: 7000,
    });
  });

  it('honours Retry-After as an HTTP date on a 429', async () => {
    const clock = fakeClock(); // the fake clock starts at the epoch
    const server = scriptedFetch(clock, [
      {
        status: 429,
        headers: { 'Retry-After': 'Thu, 01 Jan 1970 00:00:12 GMT' },
      },
      {},
    ]);
    const http = createPoliteHttp(MUSICBRAINZ_HTTP, server.fetch, clock);

    await http.get(URL_A);

    expect(server.calls.map((c) => c.at)).toEqual([0, 12_000]);
  });

  it('doubles its wait when the server does not say how long', async () => {
    const clock = fakeClock();
    const server = scriptedFetch(clock, [{ status: 503 }, { status: 502 }, {}]);
    const http = createPoliteHttp(
      { ...MUSICBRAINZ_HTTP, backoffMs: 2000 },
      server.fetch,
      clock,
    );

    await http.get(URL_A);

    expect(server.calls.map((c) => c.at)).toEqual([0, 2000, 6000]);
  });

  it('retries a dropped connection', async () => {
    const clock = fakeClock();
    const server = scriptedFetch(clock, [{ networkError: true }, {}]);
    const http = createPoliteHttp(MUSICBRAINZ_HTTP, server.fetch, clock);

    await expect(http.get(URL_A)).resolves.toMatchObject({ status: 200 });
    expect(server.calls).toHaveLength(2);
  });

  it('gives up after its tries, and the queue keeps working', async () => {
    const clock = fakeClock();
    const server = scriptedFetch(clock, [
      { status: 503 },
      { status: 503 },
      { status: 503 },
      { body: { id: 'b' } },
    ]);
    const http = createPoliteHttp(
      { ...MUSICBRAINZ_HTTP, maxAttempts: 3 },
      server.fetch,
      clock,
    );

    const failed = http.get(URL_A);
    const next = http.get(URL_B);
    await expect(failed).rejects.toBeInstanceOf(HttpError);
    await expect(failed).rejects.toMatchObject({ status: 503 });
    await expect(next).resolves.toMatchObject({ status: 200 });
    expect(server.calls.map((c) => c.url)).toEqual([
      URL_A,
      URL_A,
      URL_A,
      URL_B,
    ]);
  });

  it('stops rather than sit through a wait longer than it allows', async () => {
    const clock = fakeClock();
    const server = scriptedFetch(clock, [
      { status: 503, headers: { 'Retry-After': '3600' } },
    ]);
    const http = createPoliteHttp(MUSICBRAINZ_HTTP, server.fetch, clock);

    const closed = http.get(URL_A);
    await expect(closed).rejects.toThrow(/asked to wait 3600 s/);
    // Its own kind of failure, so the run stops instead of trying the next
    // artist against a server that has closed.
    await expect(closed).rejects.toBeInstanceOf(ServerClosedError);
    await expect(closed).rejects.toMatchObject({ waitMs: 3_600_000 });
    expect(server.calls).toHaveLength(1);
  });

  it('hands back an answer that is not throttling, a 404 included', async () => {
    const clock = fakeClock();
    const server = scriptedFetch(clock, [{ status: 404, body: 'Not Found' }]);
    const http = createPoliteHttp(MUSICBRAINZ_HTTP, server.fetch, clock);

    await expect(http.get(URL_A)).resolves.toMatchObject({ status: 404 });
    expect(http.stats.retries).toBe(0);
  });

  it('sends the User-Agent it was given', async () => {
    const clock = fakeClock();
    const server = scriptedFetch(clock, [{}]);
    const http = createPoliteHttp(MUSICBRAINZ_HTTP, server.fetch, clock);

    await http.get(URL_A);

    expect(server.calls[0].headers['User-Agent']).toBe(
      'MusicAtlas/1.0 ( https://musicatlas.io )',
    );
  });
});

describe('parseRetryAfter', () => {
  it('reads seconds and dates, and ignores anything else', () => {
    expect(parseRetryAfter('5', 0)).toBe(5000);
    expect(parseRetryAfter(' 0 ', 0)).toBe(0);
    expect(parseRetryAfter('Thu, 01 Jan 1970 00:00:03 GMT', 1000)).toBe(2000);
    // A date already past is "now", not a negative wait.
    expect(parseRetryAfter('Thu, 01 Jan 1970 00:00:01 GMT', 5000)).toBe(0);
    expect(parseRetryAfter('soon', 0)).toBeNull();
    expect(parseRetryAfter('-3', 0)).toBeNull();
    expect(parseRetryAfter(null, 0)).toBeNull();
  });
});
