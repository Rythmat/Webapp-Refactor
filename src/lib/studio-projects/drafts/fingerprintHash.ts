// ── A short, stable hash of a document fingerprint ─────────────────────────
//
// 1.3's documentFingerprint is the project as canonical JSON (5–70K
// characters for real projects). Drafts and the save chip store and compare
// it often, so they keep this hash of it instead: 'h1:' then 16 hex digits,
// two 32-bit lanes over the string's UTF-16 code units. Lane A is plain
// FNV-1a. Lane B uses another seed, another multiplier and an xorshift each
// step: in a multiply-xor hash the low bits depend only on the low bits, so
// two lanes of the same shape collide together far more often than chance;
// the shift feeds high bits down and makes B independent of A. Synchronous,
// deterministic across pages and builds, and about a millisecond for the
// largest fixtures. The 'h1:' names the scheme, so a later one can never be
// mistaken for it.
//
// A collision would make a draft with work look pristine or cloud-equal (and
// prunable), so the two lanes must really give 64 bits.
//
// Not cryptographic: it tells content apart, it doesn't defend against
// anyone. Pure, no imports: the Studio dashboard loads it.

const FNV_PRIME = 0x01000193;
/** FNV-1a's 32-bit offset basis. */
const SEED_A = 0x811c9dc5;
/** Lane B's own start and multiplier (MurmurHash2's m). */
const SEED_B = 0x2f6b9e37;
const MULT_B = 0x5bd1e995;

const hex8 = (value: number): string =>
  (value >>> 0).toString(16).padStart(8, '0');

/** `fingerprint` as 'h1:' + 16 hex digits; equal input, equal output. */
export function hashFingerprint(fingerprint: string): string {
  let a = SEED_A;
  let b = SEED_B;
  for (let i = 0; i < fingerprint.length; i++) {
    const unit = fingerprint.charCodeAt(i);
    a = Math.imul(a ^ unit, FNV_PRIME);
    b = Math.imul(b ^ unit, MULT_B);
    b ^= b >>> 15;
  }
  return `h1:${hex8(a)}${hex8(b)}`;
}
