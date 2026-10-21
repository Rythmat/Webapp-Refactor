import type { SVGProps } from 'react';

// ── The floating frame's icons (the top bar, 2026-10-21) ────────────────────
//
// Solid, rounded glyphs on a 16 px grid, drawn for Music Atlas in the
// floating frame's icon style (owner: "match the top rail icon style"):
// filled shapes rather than outlines, in currentColor, so a control's
// white/50 rest and white hover colour them. Loop, Undo and Redo are
// round-capped 1.75 px strokes, which read as solid at 16 px. Each is
// decorative (aria-hidden): the control around it carries the name.

type IconProps = SVGProps<SVGSVGElement>;

function Glyph({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="currentColor"
      aria-hidden
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/** Play: a rounded triangle. */
export function PlayGlyph(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M4.5 2.9c0-.8.9-1.3 1.6-.9l7.2 4.4c.7.4.7 1.4 0 1.8l-7.2 4.4c-.7.4-1.6-.1-1.6-.9V2.9z" />
    </Glyph>
  );
}

/** Pause: two rounded bars. */
export function PauseGlyph(props: IconProps) {
  return (
    <Glyph {...props}>
      <rect x="3.5" y="2.5" width="3" height="11" rx="1" />
      <rect x="9.5" y="2.5" width="3" height="11" rx="1" />
    </Glyph>
  );
}

/** Record: a solid dot. */
export function RecordGlyph(props: IconProps) {
  return (
    <Glyph {...props}>
      <circle cx="8" cy="8" r="5" />
    </Glyph>
  );
}

/** Back to start: two rounded triangles pointing left. */
export function BackToStartGlyph(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M8 3.6v8.8c0 .7-.8 1.1-1.3.6L1.9 8.6a.8.8 0 0 1 0-1.2l4.8-4.4c.5-.5 1.3-.1 1.3.6z" />
      <path d="M14.5 3.6v8.8c0 .7-.8 1.1-1.3.6L8.4 8.6a.8.8 0 0 1 0-1.2l4.8-4.4c.5-.5 1.3-.1 1.3.6z" />
    </Glyph>
  );
}

/** Loop: a rounded loop with an arrowhead. */
export function LoopGlyph(props: IconProps) {
  return (
    <Glyph {...props}>
      <path
        {...STROKE}
        d="M5 11.5h-.5A2.5 2.5 0 0 1 2 9V7a2.5 2.5 0 0 1 2.5-2.5h7A2.5 2.5 0 0 1 14 7v2a2.5 2.5 0 0 1-2.5 2.5H7"
      />
      <path {...STROKE} d="M8.75 9.5 6.75 11.5l2 2" />
    </Glyph>
  );
}

/** Undo: an arrow curving back to the left. */
export function UndoGlyph(props: IconProps) {
  return (
    <Glyph {...props}>
      <path {...STROKE} d="M5.5 3.5 2.5 6.5l3 3" />
      <path {...STROKE} d="M2.5 6.5h7a3.5 3.5 0 0 1 0 7H8" />
    </Glyph>
  );
}

/** Redo: Undo, mirrored. */
export function RedoGlyph(props: IconProps) {
  return (
    <Glyph {...props}>
      <path {...STROKE} d="M10.5 3.5l3 3-3 3" />
      <path {...STROKE} d="M13.5 6.5h-7a3.5 3.5 0 0 0 0 7H8" />
    </Glyph>
  );
}

/** More: three dots. */
export function MoreGlyph(props: IconProps) {
  return (
    <Glyph {...props}>
      <circle cx="3.25" cy="8" r="1.4" />
      <circle cx="8" cy="8" r="1.4" />
      <circle cx="12.75" cy="8" r="1.4" />
    </Glyph>
  );
}

/** Back: an arrow to the left. */
export function BackGlyph(props: IconProps) {
  return (
    <Glyph {...props}>
      <path {...STROKE} d="M7 3.5 2.5 8 7 12.5" />
      <path {...STROKE} d="M2.75 8H13.5" />
    </Glyph>
  );
}
