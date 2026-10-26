import { useEffect, useState } from 'react';
import { artAccent, hexArtPalette } from '@/lib/hexArtPalette';

// ── A hex artwork's accent (owner, 2026-10-26) ────────────────────────────
// Read once per image (its fills, most used first, then artAccent) and
// shared by everything that shows it: a Genre tile's accent is its art's.

const accents = new Map<string, Promise<string | null>>();

function accentOf(src: string) {
  let accent = accents.get(src);
  if (!accent) {
    accent = fetch(src)
      .then((res) => (res.ok ? res.text() : ''))
      .then((svg) => artAccent(hexArtPalette(svg)))
      .catch(() => null);
    accents.set(src, accent);
  }
  return accent;
}

/** The art's accent colour, or null until it's read (or for art with
 *  none, or no art). */
export function useArtAccent(src?: string): string | null {
  const [accent, setAccent] = useState<string | null>(null);
  useEffect(() => {
    if (!src) return;
    let live = true;
    void accentOf(src).then((found) => {
      if (live) setAccent(found);
    });
    return () => {
      live = false;
    };
  }, [src]);
  return accent;
}
