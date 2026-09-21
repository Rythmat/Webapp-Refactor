import { useEffect, useLayoutEffect, useState } from 'react';
import type { ChordClef } from '@/lib/notation';
import { loadVexFlow } from './StaffView';

// ── Which clef to read in ──────────────────────────────────────────────────
// Sits beside the roll/notation switch and borrows its look. Drawn in Bravura
// — the same font the staff itself is set in — so the buttons show the very
// glyphs that will appear on the staff.

/**
 * SMuFL codepoints, matching VexFlow's own glyph table (`Glyphs.gClef` and
 * `Glyphs.fClef`). Written out rather than imported: importing the enum would
 * pull VexFlow in eagerly and undo the lazy load below.
 */
const G_CLEF = '';
const F_CLEF = '';

/** Ink height both clefs are drawn at, inside a 24px button. */
const GLYPH_HEIGHT = 18;
/** Size the glyph is measured at — bigger is a more precise box. */
const MEASURE_SIZE = 100;

interface InkBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

let sharedContext: CanvasRenderingContext2D | null = null;

/** A canvas to measure on. Only a working context is cached, so a failure
 *  early on (no canvas yet, context lost) does not poison later measurements. */
function measuringContext(): CanvasRenderingContext2D | null {
  if (sharedContext) return sharedContext;
  if (typeof document === 'undefined') return null;
  sharedContext = document.createElement('canvas').getContext('2d');
  return sharedContext;
}

/**
 * The tight ink box of a glyph, relative to its baseline origin.
 *
 * Measured on a canvas rather than with `getBBox`, which for SVG text reports
 * a box built from the font's ascent, descent and advance width instead of the
 * ink. Bravura's em box is vast — it has to hold glyphs like full staff
 * brackets — so fitting that box to a button leaves the clef itself a
 * fraction of the size. `actualBoundingBox*` is the real ink.
 */
function measureInk(glyph: string, fontFamily: string): InkBox | null {
  const ctx = measuringContext();
  if (!ctx) return null;

  ctx.font = `${MEASURE_SIZE}px ${fontFamily}`;
  const m = ctx.measureText(glyph);
  const { actualBoundingBoxAscent: up, actualBoundingBoxDescent: down } = m;
  const { actualBoundingBoxLeft: left, actualBoundingBoxRight: right } = m;
  if (![up, down, left, right].every((v) => Number.isFinite(v))) return null;

  const width = left + right;
  const height = up + down;
  if (width <= 0 || height <= 0) return null;
  // The text is drawn at the origin, so the ink starts left of and above it.
  return { x: -left, y: -up, width, height };
}

/**
 * One clef, normalised to a fixed ink height.
 *
 * Bravura's clefs are nothing alike as glyphs: a G clef runs about seven staff
 * spaces and hangs well below the baseline, an F clef is barely three and sits
 * above it. Picking a font size for each by hand leaves them mismatched in
 * size and in height on the line. Instead the ink is measured and becomes the
 * viewBox, so the drawing is exactly the glyph itself — which the `svg` scales
 * to one height and the button centres, with no per-glyph tuning to drift.
 */
function ClefGlyph({
  glyph,
  fontReady,
}: {
  glyph: string;
  fontReady: boolean;
}) {
  const [box, setBox] = useState<InkBox | null>(null);
  const fontFamily = fontReady ? 'Bravura' : 'serif';

  useLayoutEffect(() => {
    setBox(measureInk(glyph, fontFamily));
  }, [glyph, fontFamily]);

  return (
    <svg
      aria-hidden
      height={GLYPH_HEIGHT}
      width={box ? (GLYPH_HEIGHT * box.width) / box.height : GLYPH_HEIGHT}
      viewBox={box ? `${box.x} ${box.y} ${box.width} ${box.height}` : undefined}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <text
        x={0}
        y={0}
        fill="currentColor"
        fontFamily={fontFamily}
        fontSize={MEASURE_SIZE}
      >
        {glyph}
      </text>
    </svg>
  );
}

const OPTIONS: { id: ChordClef; glyph: string; label: string }[] = [
  { id: 'treble', glyph: G_CLEF, label: 'Treble clef' },
  { id: 'bass', glyph: F_CLEF, label: 'Bass clef' },
];

export function ClefToggle({
  clef,
  onChange,
  disabled = false,
}: {
  clef: ChordClef;
  onChange: (clef: ChordClef) => void;
  /**
   * Two-hand parts are written on a grand staff, so there is no clef to pick.
   * The control stays visible but inert, so the student can see the choice
   * exists on other steps rather than watching it appear and vanish.
   */
  disabled?: boolean;
}) {
  // Bravura arrives with VexFlow; measuring again once it lands sizes the
  // glyph against the real font rather than the fallback.
  const [fontReady, setFontReady] = useState(false);
  useEffect(() => {
    let alive = true;
    loadVexFlow().then(
      () => alive && setFontReady(true),
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div
      role="radiogroup"
      aria-label="Clef"
      aria-disabled={disabled || undefined}
      className={`flex shrink-0 items-center gap-0.5 rounded-md border border-white/10 bg-black/30 p-0.5${
        disabled ? ' opacity-40' : ''
      }`}
    >
      {OPTIONS.map(({ id, glyph, label }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={clef === id}
          aria-label={label}
          disabled={disabled}
          title={disabled ? 'Two-hand part — written on a grand staff' : label}
          onClick={() => onChange(id)}
          className={`flex h-6 w-8 items-center justify-center rounded transition-colors ${
            disabled
              ? 'cursor-not-allowed text-white/30'
              : clef === id
                ? 'bg-white/15 text-white'
                : 'text-white/40 hover:bg-white/5 hover:text-white/70'
          }`}
        >
          <ClefGlyph glyph={glyph} fontReady={fontReady} />
        </button>
      ))}
    </div>
  );
}
