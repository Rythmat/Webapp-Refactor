// Parses a Serum 2 .SerumPreset file:
//   "XferJson" magic → plain-JSON metadata → [u32 size][u32 ver] → zstd(CBOR)
// Storage is SPARSE: `plainParams: "default"` means an all-default section,
// and absent keys mean per-param defaults (see serumDefaults.ts).

import { readFileSync } from 'node:fs';
import { zstdDecompressSync } from 'node:zlib';
import { decodeCbor, type CborValue } from './cbor.ts';

export interface SerumMeta {
  presetName: string;
  presetAuthor?: string;
  presetDescription?: string;
  tags?: string[];
  productVersion?: string;
}

export type Params = Record<string, number | string>;

export interface SerumDoc {
  meta: SerumMeta;
  body: Record<string, CborValue>;
}

const ZSTD_MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd]);

/**
 * Reads ONLY the header metadata (name/author/tags) without decompressing
 * the CBOR body — cheap enough to scan a whole library for a name match.
 */
export function parseSerumMetaOnly(path: string): SerumMeta {
  const raw = readFileSync(path);
  const jsonStart = raw.indexOf(0x7b); // '{'
  return JSON.parse(
    raw.subarray(jsonStart, findJsonEnd(raw, jsonStart)).toString('utf8'),
  ) as SerumMeta;
}

export function parseSerumPreset(path: string): SerumDoc {
  const raw = readFileSync(path);
  if (raw.subarray(0, 8).toString('latin1') !== 'XferJson') {
    throw new Error(`${path}: not an XferJson file`);
  }
  const jsonStart = raw.indexOf(0x7b); // '{'
  const zstdAt = raw.indexOf(ZSTD_MAGIC, jsonStart);
  if (zstdAt < 0) throw new Error(`${path}: no zstd frame`);
  const meta = JSON.parse(
    raw.subarray(jsonStart, findJsonEnd(raw, jsonStart)).toString('utf8'),
  ) as SerumMeta;
  const cborBuf = zstdDecompressSync(raw.subarray(zstdAt));
  const body = decodeCbor(new Uint8Array(cborBuf)) as Record<string, CborValue>;
  return { meta, body };
}

/** Byte offset one past the metadata JSON's closing brace. */
function findJsonEnd(buf: Buffer, start: number): number {
  let depth = 0;
  let inString = false;
  for (let i = start; i < buf.length; i++) {
    const c = buf[i];
    if (inString) {
      if (c === 0x5c)
        i++; // backslash escape
      else if (c === 0x22) inString = false;
    } else if (c === 0x22) {
      inString = true;
    } else if (c === 0x7b) {
      depth++;
    } else if (c === 0x7d) {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  throw new Error('unterminated metadata JSON');
}

// ── Sparse-section access helpers ─────────────────────────────────────────

/** A section's plainParams, treating "default"/missing as {}. */
export function plainParams(section: CborValue | undefined): Params {
  if (!section || typeof section !== 'object' || Array.isArray(section)) {
    return {};
  }
  const pp = (section as Record<string, CborValue>).plainParams;
  if (!pp || typeof pp !== 'object' || Array.isArray(pp)) return {};
  return pp as Params;
}

/** Numeric param with sparse default. */
export function num(params: Params, key: string, fallback: number): number {
  const v = params[key];
  return typeof v === 'number' ? v : fallback;
}

/** String param with sparse default. */
export function str(params: Params, key: string, fallback: string): string {
  const v = params[key];
  return typeof v === 'string' ? v : fallback;
}

export function section(
  doc: SerumDoc,
  name: string,
): Record<string, CborValue> | undefined {
  const s = doc.body[name];
  if (s && typeof s === 'object' && !Array.isArray(s)) {
    return s as Record<string, CborValue>;
  }
  return undefined;
}
