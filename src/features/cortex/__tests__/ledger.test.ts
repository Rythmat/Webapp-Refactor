// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setLocalStoreUser } from '@/lib/local-store/userScope';
import {
  flushCortex,
  getCortexRecords,
  markCurrentDone,
  MAX_RECORDS,
  mergeRecord,
  mergeRemoteRecords,
  recordDone,
  recordVisit,
  resetCortexLedger,
  setCortexSink,
  setCurrentActivity,
  type CortexRecord,
  type CortexSink,
} from '../ledger';

const MINUTE = 60_000;
const T = 1000 * MINUTE;

beforeEach(() => {
  localStorage.clear();
  resetCortexLedger();
  setLocalStoreUser('ana');
});

afterEach(() => {
  setLocalStoreUser(undefined);
  resetCortexLedger();
  vi.useRealTimers();
});

describe('merging records', () => {
  it('takes the earliest first seen and the latest of the others', () => {
    expect(mergeRecord([5, 9, 0], [3, 7, 8])).toEqual([3, 9, 8]);
  });

  it('doesn’t take an undated record for the earliest', () => {
    expect(mergeRecord([0, 0, 1], [3, 7, 0])).toEqual([3, 7, 1]);
  });
});

describe('recording', () => {
  it('keeps a visit dim and finishing bright', () => {
    recordVisit('song:a', T);
    expect(getCortexRecords()['song:a']).toEqual([1000, 1000, 0]);
    recordDone('song:a', T + 2 * MINUTE);
    expect(getCortexRecords()['song:a']).toEqual([1000, 1002, 1002]);
  });

  it('never dims something finished', () => {
    recordDone('song:a', T);
    recordVisit('song:a', T + MINUTE);
    expect(getCortexRecords()['song:a'][2]).toBe(1000);
  });

  it('finishes what’s on screen', () => {
    setCurrentActivity('game:chroma');
    markCurrentDone();
    expect(getCortexRecords()['game:chroma'][2]).toBeGreaterThan(0);
    setCurrentActivity(null);
    markCurrentDone();
    expect(Object.keys(getCortexRecords())).toEqual(['game:chroma']);
  });

  it('writes nothing while it doesn’t know whose it is, or when signed out', () => {
    setLocalStoreUser(undefined);
    recordVisit('song:a', T);
    expect(getCortexRecords()).toEqual({});
    setLocalStoreUser(null);
    recordVisit('song:a', T);
    expect(getCortexRecords()).toEqual({});
    expect(localStorage.length).toBe(0);
  });
});

describe('on a shared device', () => {
  it('keeps each person’s map to themselves', () => {
    recordVisit('song:ana', T);
    setLocalStoreUser('ben');
    expect(getCortexRecords()).toEqual({});
    recordVisit('song:ben', T);
    expect(Object.keys(getCortexRecords())).toEqual(['song:ben']);
    setLocalStoreUser('ana');
    expect(Object.keys(getCortexRecords())).toEqual(['song:ana']);
  });

  it('forgets what was on screen when the user changes', () => {
    setCurrentActivity('song:ana');
    setLocalStoreUser('ben');
    markCurrentDone();
    expect(getCortexRecords()).toEqual({});
  });
});

describe('the cap', () => {
  it('lets the oldest unfinished go first, and tells the account', async () => {
    const seeded: Record<string, CortexRecord> = { 'song:finished': [1, 1, 1] };
    for (let i = 0; i < MAX_RECORDS - 1; i++)
      seeded[`song:${i}`] = [10 + i, 10 + i, 0];
    mergeRemoteRecords(seeded);
    recordVisit('song:new', T);
    const records = getCortexRecords();
    expect(Object.keys(records)).toHaveLength(MAX_RECORDS);
    expect(records['song:finished']).toBeDefined();
    expect(records['song:0']).toBeUndefined();
    expect(records['song:new']).toBeDefined();

    const sink = vi.fn<CortexSink>().mockResolvedValue(undefined);
    setCortexSink(sink);
    await flushCortex();
    expect(sink.mock.calls[0][0]['song:0']).toBeNull();
    expect(sink.mock.calls[0][0]['song:new']).toEqual([1000, 1000, 0]);
  });
});

describe('the account’s copy', () => {
  it('sends one key per activity, only what changed', async () => {
    const sink = vi.fn<CortexSink>().mockResolvedValue(undefined);
    setCortexSink(sink);
    recordVisit('song:a', T);
    await flushCortex();
    expect(sink).toHaveBeenCalledTimes(1);
    expect(sink.mock.calls[0][0]).toEqual({ 'song:a': [1000, 1000, 0] });
    await flushCortex();
    expect(sink).toHaveBeenCalledTimes(1);
    recordVisit('song:b', T);
    await flushCortex();
    expect(Object.keys(sink.mock.calls[1][0])).toEqual(['song:b']);
  });

  it('keeps what failed to send, to send later', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const sink = vi
      .fn<CortexSink>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(undefined);
    setCortexSink(sink);
    recordVisit('song:a', T);
    await flushCortex();
    await flushCortex();
    expect(sink).toHaveBeenCalledTimes(2);
    expect(sink.mock.calls[1][0]).toEqual({ 'song:a': [1000, 1000, 0] });
    warn.mockRestore();
  });

  it('saves what changed while a save was on its way', async () => {
    let release = () => {};
    const sink = vi.fn<CortexSink>(
      () => new Promise<void>((resolve) => (release = resolve)),
    );
    setCortexSink(sink);
    recordVisit('song:a', T);
    const flushing = flushCortex();
    recordDone('song:a', T + MINUTE);
    release();
    await flushing;
    sink.mockResolvedValue(undefined);
    await flushCortex();
    expect(sink.mock.calls[1][0]).toEqual({ 'song:a': [1000, 1001, 1001] });
  });

  it('merges in another device’s work, and sends back only what it lacked', async () => {
    recordVisit('song:mine', T);
    const sink = vi.fn<CortexSink>().mockResolvedValue(undefined);
    setCortexSink(sink);
    mergeRemoteRecords({
      'song:theirs': [5, 6, 0],
      'song:mine': [999, 999, 0],
      'song:gone': null,
      'song:junk': 'nonsense',
    });
    const records = getCortexRecords();
    expect(records['song:theirs']).toEqual([5, 6, 0]);
    expect(records['song:mine']).toEqual([999, 1000, 0]);
    expect(records['song:gone']).toBeUndefined();
    expect(records['song:junk']).toBeUndefined();
    await flushCortex();
    expect(Object.keys(sink.mock.calls[0][0])).toEqual(['song:mine']);
  });

  it('survives a reload with its unsent work', async () => {
    recordVisit('song:a', T);
    resetCortexLedger();
    const sink = vi.fn<CortexSink>().mockResolvedValue(undefined);
    setCortexSink(sink);
    expect(getCortexRecords()['song:a']).toBeDefined();
    await flushCortex();
    expect(sink.mock.calls[0][0]).toEqual({ 'song:a': [1000, 1000, 0] });
  });

  it('asks for a save on its own, in time', async () => {
    vi.useFakeTimers();
    const sink = vi.fn<CortexSink>().mockResolvedValue(undefined);
    setCortexSink(sink);
    recordVisit('song:a', T);
    expect(sink).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(sink).toHaveBeenCalledTimes(1);
  });
});
