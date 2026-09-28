/**
 * The server builds from the docs, not from this repo.
 *
 * P0 replaced Rule 1's substring matcher with an exact-key walk, but
 * `backend-directions.md` kept instructing the server to run the deleted
 * substring regex over the serialized snapshot. A server built to that document
 * would have rejected ordinary lessons — a slide titled "Standards of the
 * Blues", a prompt containing the word "notes" — with `firewall_violation`, and
 * the failure would have looked like a client bug.
 *
 * The docs are a contract with people who cannot read this code. Pin them.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FORBIDDEN_KEYS, isForbiddenKey } from './publishDay';

const DOC = resolve(
  __dirname,
  '../../../../docs/classroom-v2/backend-directions.md',
);
const doc = readFileSync(DOC, 'utf8');

/** The fenced key list under the publish endpoint. */
const documentedKeys = (): string[] => {
  const start = doc.indexOf('Compare `key.toLowerCase()`');
  const fenceEnd = doc.lastIndexOf('```', start);
  const fenceStart = doc.lastIndexOf('```', fenceEnd - 1);
  return doc
    .slice(fenceStart + 3, fenceEnd)
    .split(/[|\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
};

describe('backend-directions.md matches the shipped firewall', () => {
  it('documents exactly the keys the client refuses', () => {
    const code = [...FORBIDDEN_KEYS].map((k) => k.toLowerCase()).sort();
    expect(documentedKeys().sort()).toEqual([...new Set(code)].sort());
  });

  it('every documented key really is refused', () => {
    for (const key of documentedKeys()) {
      expect(isForbiddenKey(key), key).toBe(true);
      expect(isForbiddenKey(key.toUpperCase()), key).toBe(true);
    }
  });

  it('does not tell the server to scan for substrings', () => {
    // The specific wrong instruction that shipped.
    expect(doc).not.toMatch(/forbidden-substring\s+regex/i);
    expect(doc).not.toContain('runFirewallTest');
    expect(doc).toMatch(/exact-KEY check over object keys/i);
  });

  it('warns that a substring scan false-positives on real lesson content', () => {
    // Without this note the next reader "simplifies" it back to a regex.
    expect(doc).toMatch(/Standards of the Blues/);
  });

  it('a forbidden word inside CONTENT is not a forbidden key', () => {
    // The property the substring matcher got wrong, asserted against the code.
    for (const word of ['standards', 'notes', 'assessment']) {
      expect(isForbiddenKey(word)).toBe(true);
      expect(isForbiddenKey(`Slide about ${word}`)).toBe(false);
      expect(isForbiddenKey(`${word}Label`)).toBe(false);
    }
  });
});
