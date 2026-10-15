import { describe, expect, it } from 'vitest';
import { hashFingerprint } from '../fingerprintHash';

// ── The fingerprint hash (milestone 1.4) ──────────────────────────────────
// Run: npx vitest run src/lib/studio-projects/drafts/__tests__/fingerprintHash.test.ts

const SHAPE = /^h1:[0-9a-f]{16}$/;

describe('hashFingerprint', () => {
  it("is 'h1:' plus 16 hex digits", () => {
    expect(hashFingerprint('')).toMatch(SHAPE);
    expect(hashFingerprint('{"bpm":120}')).toMatch(SHAPE);
  });

  it('gives equal output for equal input, call after call', () => {
    const text = JSON.stringify({ tracks: [{ id: 't1', name: 'Bass' }] });
    expect(hashFingerprint(text)).toBe(hashFingerprint(text.slice()));
    expect(hashFingerprint(text)).toBe(hashFingerprint(`${text}`));
  });

  it('is stable across builds (pinned values)', () => {
    // Stored in drafts and compared on later pages: never change these
    // without a new 'h2:' scheme.
    expect(hashFingerprint('')).toBe('h1:811c9dc52f6b9e37');
    // Lane A is plain FNV-1a 32: 'a' → e40c292c.
    expect(hashFingerprint('a')).toBe('h1:e40c292c62f5abe4');
    expect(hashFingerprint('{"bpm":120}')).toBe('h1:277b8c61e1703d50');
  });

  it('differs on a one-character change anywhere', () => {
    const base = JSON.stringify({
      bpm: 120,
      tracks: Array.from({ length: 20 }, (_, i) => ({ id: `t${i}`, vol: 0.8 })),
    });
    const seen = new Set([hashFingerprint(base)]);
    for (const at of [0, 1, Math.floor(base.length / 2), base.length - 1]) {
      const changed =
        base.slice(0, at) +
        String.fromCharCode(base.charCodeAt(at) + 1) +
        base.slice(at + 1);
      const hash = hashFingerprint(changed);
      expect(seen.has(hash)).toBe(false);
      seen.add(hash);
    }
    // Two swapped characters too.
    expect(hashFingerprint('ab')).not.toBe(hashFingerprint('ba'));
  });

  it('keeps its two lanes independent (a lane-A near-collision says nothing of lane B)', () => {
    // Two-character edits of a fingerprint. Among pairs whose lane A agrees
    // in its low 16 bits, lane B's low byte should agree about 1 time in
    // 256. Two lanes of the same multiply-xor shape agree 2-5x as often
    // (low bits only depend on low bits), which would make the 64-bit hash
    // far weaker than it reads.
    const base =
      '{"tracks":[{"id":"t1","volume":0.8,"pan":0,"notes":[{"p":60,"t":0}]}],"bpm":120,"name":"My song"}';
    const seen = new Set<string>();
    const byLaneA = new Map<number, number[]>();
    let pairs = 0;
    let agree = 0;
    for (let i = 0; i < base.length && seen.size < 40_000; i++) {
      for (let j = i + 1; j < base.length && seen.size < 40_000; j++) {
        for (let c = 48; c < 58 && seen.size < 40_000; c++) {
          const text =
            base.slice(0, i) +
            String.fromCharCode(c) +
            base.slice(i + 1, j) +
            String.fromCharCode(c + 5) +
            base.slice(j + 1);
          if (seen.has(text)) continue;
          seen.add(text);
          const hex = hashFingerprint(text).slice(3);
          const laneA = parseInt(hex.slice(0, 8), 16);
          const laneB = parseInt(hex.slice(8), 16);
          const bucket = byLaneA.get(laneA & 0xffff) ?? [];
          for (const other of bucket) {
            pairs += 1;
            if (((other ^ laneB) & 0xff) === 0) agree += 1;
          }
          bucket.push(laneB);
          byLaneA.set(laneA & 0xffff, bucket);
        }
      }
    }
    expect(pairs).toBeGreaterThan(5000);
    // Chance is pairs / 256 (about 48 here; this scheme gives 52). The old
    // same-shape lane gave 226.
    expect(agree).toBeLessThan((pairs / 256) * 1.6);
  });

  it('hashes UTF-16 code units (astral characters included)', () => {
    expect(hashFingerprint('♯')).not.toBe(hashFingerprint('#'));
    expect(hashFingerprint('🎸')).toMatch(SHAPE);
    expect(hashFingerprint('🎸')).not.toBe(hashFingerprint('🎹'));
  });

  it('hashes 50K characters well within a frame', () => {
    const big = JSON.stringify(
      Array.from({ length: 2000 }, (_, i) => ({ id: `n${i}`, pitch: i % 128 })),
    ).padEnd(50_000, 'x');
    expect(big.length).toBeGreaterThanOrEqual(50_000);
    hashFingerprint(big); // warm
    const start = performance.now();
    for (let i = 0; i < 10; i++) hashFingerprint(big);
    const each = (performance.now() - start) / 10;
    expect(each).toBeLessThan(20);
  });
});
