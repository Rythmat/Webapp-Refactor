import { useLayoutEffect, useRef, useState } from 'react';
import type {
  LabGroove,
  LabLane,
} from '@/curriculum/engine/grooveLab/labGroove';
import {
  DRUM_TYPING_OCTAVE,
  typingKeyFor,
} from '@/daw/commands/musicalTypingMap';
import {
  badgePoint,
  KIT_BADGES,
  KIT_DRUMS,
  type KitDrum,
} from '@/daw/shell/dock/drumKitLayout';
import { laneColor, laneName } from './lanes';

// ── The finger-drumming pads ────────────────────────────────────────────────
// The Studio's drum kit (daw/shell/dock/DrumPadsView.tsx), its layout and
// its keys, with only the groove's three drums on it: the kick (A), the
// snare (S), and the hi-hat (T) or the ride (P), each where it sits in the
// Studio so the fingers learn one kit. The hi-hat carries the Studio's open
// hat badge (U) on its rim. Drawn here from the Studio's pure
// layout (drumKitLayout.ts); the Studio's own view runs on its store.

export type PadGlow = 'idle' | 'hit' | 'success' | 'fail';

/** The kit pad each row is played on: its place, size and key. */
export function lanePad(groove: LabGroove, lane: LabLane): number {
  if (lane === 'kick') return 36;
  if (lane === 'snare') return 38;
  return groove.cymbal === 'hat' ? 42 : 51;
}

/** The key that plays a row ('KeyA'), and its letter. */
export function laneKey(
  groove: LabGroove,
  lane: LabLane,
): { code: string; letter: string } {
  const letter = typingKeyFor(lanePad(groove, lane), DRUM_TYPING_OCTAVE) ?? '';
  return { code: `Key${letter}`, letter };
}

/** The open hi-hat's key, the Studio's (U). */
export const OPEN_HAT_KEY = {
  code: 'KeyU',
  letter: typingKeyFor(46, DRUM_TYPING_OCTAVE) ?? 'U',
};

const OPEN_BADGE = KIT_BADGES.find((b) => b.note === 46);

const LANES_BY_PAD = (groove: LabGroove) =>
  (['kick', 'snare', 'cymbal'] as const).map((lane) => ({
    lane,
    drum: KIT_DRUMS.find((d) => d.note === lanePad(groove, lane)) as KitDrum,
  }));

/** The part of the kit the three pads take up, with room for their names. */
function viewBox(drums: readonly KitDrum[]) {
  const pad = 14;
  // Room on the left for the hi-hat's open badge, on its rim.
  const left = Math.min(...drums.map((d) => d.cx - d.r)) - pad - 16;
  const right = Math.max(...drums.map((d) => d.cx + d.r)) + pad;
  const top = Math.min(...drums.map((d) => d.cy - d.r)) - pad;
  const bottom = Math.max(...drums.map((d) => d.cy + d.r)) + pad + 26;
  return { left, top, width: right - left, height: bottom - top };
}

export function GroovePads({
  groove,
  glows,
  onPress,
  disabled = false,
}: {
  groove: LabGroove;
  glows: Partial<Record<LabLane, PadGlow>>;
  onPress: (lane: LabLane, timeStamp: number, open?: boolean) => void;
  disabled?: boolean;
}) {
  const pads = LANES_BY_PAD(groove);
  const box = viewBox(pads.map((p) => p.drum));
  const holder = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);

  // As big as the room allows, no bigger than the Studio draws them.
  useLayoutEffect(() => {
    const el = holder.current;
    if (!el) return;
    const fit = () =>
      setScale(
        Math.min(
          1,
          el.clientWidth / box.width,
          Math.max(240, el.clientHeight) / box.height,
        ),
      );
    fit();
    const ro =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [box.width, box.height]);

  return (
    <div
      ref={holder}
      className="flex min-h-[260px] w-full flex-1 items-center justify-center"
      data-groove-pads
    >
      <div
        className="relative"
        style={{
          width: box.width * scale,
          height: box.height * scale,
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        {pads.map(({ lane, drum }) => {
          const glow = glows[lane] ?? 'idle';
          const color = laneColor(groove, lane);
          const { letter } = laneKey(groove, lane);
          const size = 2 * drum.r * scale;
          const ring =
            glow === 'success'
              ? '#22c55e'
              : glow === 'fail'
                ? '#f87171'
                : glow === 'hit'
                  ? color
                  : 'rgba(255,255,255,0.35)';
          return (
            <button
              key={lane}
              type="button"
              disabled={disabled}
              aria-label={`${laneName(groove, lane)} (${letter})`}
              data-pad={lane}
              data-lit={glow === 'hit' || undefined}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                e.preventDefault();
                onPress(lane, e.timeStamp);
              }}
              className="absolute grid place-items-center rounded-full transition-[background-color,box-shadow,border-color] duration-100"
              style={{
                left: (drum.cx - drum.r - box.left) * scale,
                top: (drum.cy - drum.r - box.top) * scale,
                width: size,
                height: size,
                border: `${glow === 'idle' ? 2 : 3}px solid ${ring}`,
                background:
                  glow === 'hit'
                    ? `${color}55`
                    : drum.kind === 'cymbal'
                      ? '#1d1d22'
                      : '#202024',
                boxShadow:
                  glow === 'hit' ? `0 0 ${24 * scale}px ${color}` : 'none',
                cursor: disabled ? 'default' : 'pointer',
              }}
            >
              {/* The Studio's rings: one inside a drum, two in a cymbal. */}
              <span
                aria-hidden
                className="pointer-events-none absolute rounded-full border border-white/10"
                style={{ inset: drum.kind === 'cymbal' ? '12%' : '24%' }}
              />
              {drum.kind === 'cymbal' && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute rounded-full border border-white/10"
                  style={{ inset: '30%' }}
                />
              )}
              <span
                className="relative grid place-items-center rounded-full bg-white font-bold text-[#101012]"
                style={{
                  width: Math.max(28, 52 * scale),
                  height: Math.max(28, 52 * scale),
                  fontSize: Math.max(13, 22 * scale),
                }}
              >
                {letter}
              </span>
              <span
                className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold uppercase tracking-wide"
                style={{ top: size + 6, color }}
              >
                {laneName(groove, lane)}
              </span>
            </button>
          );
        })}
        {groove.cymbal === 'hat' &&
          OPEN_BADGE &&
          (() => {
            const at = badgePoint(OPEN_BADGE);
            const size = Math.max(26, 40 * scale);
            const lit = glows.cymbal === 'hit';
            return (
              <button
                type="button"
                disabled={disabled}
                aria-label={`Open hi-hat (${OPEN_HAT_KEY.letter})`}
                data-pad="open-hat"
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  e.preventDefault();
                  onPress('cymbal', e.timeStamp, true);
                }}
                className="absolute z-10 grid place-items-center rounded-full border-2 bg-white font-bold text-[#101012]"
                style={{
                  left: (at.x - box.left) * scale - size / 2,
                  top: (at.y - box.top) * scale - size / 2,
                  width: size,
                  height: size,
                  fontSize: Math.max(12, 18 * scale),
                  borderColor: lit ? laneColor(groove, 'cymbal') : '#101012',
                  cursor: disabled ? 'default' : 'pointer',
                }}
              >
                {OPEN_HAT_KEY.letter}
              </button>
            );
          })()}
      </div>
    </div>
  );
}
