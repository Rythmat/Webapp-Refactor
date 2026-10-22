// ── Foli's drums on screen ──────────────────────────────────────────────────
// Two drums are the foil pillars Foli has always had, the high bongo on the
// left and the low on the right; four are four pads, timbale, high bongo,
// low bongo and side stick, left to right. Each lights as it sounds (the
// call's notes and the player's), and shows the key that plays it. A press
// is a pointer-down only (a tap is one hit, not a touch and a mouse event),
// handed on with the moment it happened.

import { useState, type PointerEvent as ReactPointerEvent } from 'react';
import { DRUMS, type FoliDrum } from '@/curriculum/engine/foli/drums';

export type DrumGlow = 'idle' | 'hit' | 'success' | 'fail';

const FOIL_PATH =
  'M 129.695312 69.484375 L 119.902344 57.707031 C 119.597656 57.328125 119.132812 57.109375 118.640625 57.109375 L 99.054688 57.109375 C 98.566406 57.109375 98.101562 57.328125 97.792969 57.707031 L 90.671875 66.273438 L 90.664062 43.480469 C 90.65625 43.40625 90.644531 43.332031 90.621094 43.253906 C 90.707031 42.792969 90.589844 42.316406 90.292969 41.945312 L 78.453125 27.6875 L 78.445312 27.6875 C 78.136719 27.3125 77.671875 27.101562 77.1875 27.101562 L 53.492188 27.101562 C 53 27.101562 52.542969 27.3125 52.230469 27.6875 L 40.386719 41.945312 L 40.378906 41.945312 C 40.085938 42.316406 39.964844 42.792969 40.054688 43.253906 C 40.035156 43.332031 40.023438 43.40625 40.011719 43.480469 L 40.011719 115.078125 C 40.011719 115.460938 40.140625 115.832031 40.386719 116.125 L 52.230469 130.382812 C 52.246094 130.40625 52.273438 130.414062 52.292969 130.433594 L 52.296875 130.433594 C 52.390625 130.519531 52.5 130.601562 52.613281 130.671875 C 52.679688 130.726562 52.757812 130.777344 52.839844 130.820312 C 52.988281 130.882812 53.152344 130.914062 53.308594 130.929688 C 53.371094 130.945312 53.433594 130.960938 53.5 130.972656 L 77.183594 130.972656 C 77.246094 130.960938 77.300781 130.945312 77.363281 130.929688 C 77.527344 130.914062 77.683594 130.882812 77.835938 130.820312 C 77.917969 130.777344 77.992188 130.726562 78.0625 130.671875 C 78.175781 130.601562 78.28125 130.519531 78.375 130.433594 C 78.394531 130.414062 78.425781 130.402344 78.4375 130.382812 L 87.617188 119.34375 L 87.617188 121.945312 L 87.621094 121.945312 C 87.621094 122.328125 87.753906 122.699219 88 122.996094 L 97.792969 134.773438 C 97.808594 134.796875 97.84375 134.804688 97.859375 134.828125 L 97.859375 134.824219 C 98.03125 134.96875 98.210938 135.097656 98.402344 135.21875 C 98.515625 135.253906 98.632812 135.28125 98.753906 135.292969 C 98.855469 135.332031 98.953125 135.347656 99.054688 135.363281 L 118.640625 135.363281 C 118.761719 135.347656 118.878906 135.324219 119 135.28125 C 119.09375 135.269531 119.1875 135.25 119.28125 135.21875 C 119.386719 135.160156 119.496094 135.09375 119.589844 135.011719 C 119.671875 134.960938 119.746094 134.898438 119.820312 134.835938 C 119.847656 134.808594 119.878906 134.796875 119.902344 134.773438 L 129.695312 122.980469 C 129.941406 122.6875 130.078125 122.316406 130.078125 121.933594 L 130.078125 70.9375 C 130.066406 70.875 130.054688 70.8125 130.035156 70.75 C 130.109375 70.300781 129.984375 69.835938 129.695312 69.484375 Z M 99.828125 60.390625 L 117.867188 60.390625 L 126.296875 70.53125 L 117.867188 80.671875 L 99.828125 80.664062 L 91.402344 70.523438 Z M 100.703125 83.945312 L 116.988281 83.945312 L 116.988281 132.074219 L 100.703125 132.074219 Z M 54.265625 30.375 L 76.410156 30.375 L 86.894531 42.984375 L 76.410156 55.597656 L 54.265625 55.605469 L 43.785156 42.992188 Z M 55.140625 58.867188 L 75.539062 58.867188 L 75.539062 127.671875 L 55.140625 127.671875 Z M 43.292969 47.519531 L 51.859375 57.824219 L 51.855469 124.78125 L 43.292969 114.484375 Z M 78.824219 124.773438 L 78.816406 57.824219 L 87.386719 47.519531 L 87.386719 114.484375 Z M 90.910156 75.066406 L 97.421875 82.898438 L 97.417969 129.171875 L 90.90625 121.335938 Z M 120.269531 129.183594 L 120.269531 82.910156 L 126.789062 75.070312 L 126.789062 121.335938 Z M 120.269531 129.183594';

const CLIP_SPLIT_X = 89;

/** The key bound to a drum; ringed in its color while it awaits a new key. */
function KeyBox({
  label,
  color,
  selected,
  onSelect,
}: {
  label: string;
  color: string;
  selected: boolean;
  /** Set while rebinding: clicking the box selects its drum, like the drum does. */
  onSelect?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      // Don't take focus on click: a focused box would swallow the next Space
      // or Enter as a button activation instead of a key to bind.
      onMouseDown={(e) => e.preventDefault()}
      disabled={!onSelect}
      style={{
        minWidth: 38,
        height: 26,
        padding: '0 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 6,
        border: `1.5px solid ${selected ? color : 'rgba(255,255,255,0.12)'}`,
        backgroundColor: selected
          ? 'rgba(255,255,255,0.08)'
          : 'rgba(255,255,255,0.03)',
        boxShadow: selected ? `0 0 12px ${color}66` : 'none',
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 2,
        color,
        cursor: onSelect ? 'pointer' : 'default',
        transition: 'color 0.15s ease, border-color 0.15s ease',
      }}
    >
      {label}
    </button>
  );
}

function fillOf(glow: DrumGlow, lit: boolean, color: string) {
  if (glow === 'success') return '#22c55e';
  if (glow === 'fail') return '#f87171';
  return glow === 'hit' || lit ? color : '#52525b';
}

function filterOf(glow: DrumGlow, lit: boolean, color: string) {
  if (glow === 'success')
    return 'drop-shadow(0 0 18px rgba(34,197,94,0.7)) drop-shadow(0 0 36px rgba(34,197,94,0.3))';
  if (glow === 'fail')
    return 'drop-shadow(0 0 18px rgba(248,113,113,0.7)) drop-shadow(0 0 36px rgba(248,113,113,0.3))';
  if (glow === 'hit' || lit)
    return `drop-shadow(0 0 16px ${color}e6) drop-shadow(0 0 32px ${color}66)`;
  return 'none';
}

export interface FoliPadsProps {
  drums: readonly FoliDrum[];
  glows: Partial<Record<FoliDrum, DrumGlow>>;
  keyLabels: Partial<Record<FoliDrum, string>>;
  disabled: boolean;
  /** A press, with the event's timestamp (performance.now() time). */
  onPress: (drum: FoliDrum, timeStamp: number) => void;
  /** Rebinding: the drum awaiting a key, and choosing one. */
  bindingMode?: boolean;
  selected?: FoliDrum | null;
  onSelect?: (drum: FoliDrum) => void;
}

export function FoliPads({
  drums,
  glows,
  keyLabels,
  disabled,
  onPress,
  bindingMode = false,
  selected = null,
  onSelect,
}: FoliPadsProps) {
  const [pressed, setPressed] = useState<FoliDrum | null>(null);
  const down = (drum: FoliDrum) => (e: ReactPointerEvent) => {
    if (bindingMode) {
      onSelect?.(drum);
      return;
    }
    if (disabled) return;
    setPressed(drum);
    onPress(drum, e.timeStamp);
  };
  const up = () => setPressed(null);
  const lit = (drum: FoliDrum) => pressed === drum || selected === drum;

  const keys = (
    <div
      style={{
        display: 'flex',
        gap: drums.length === 2 ? 68 : 40,
        justifyContent: 'center',
      }}
    >
      {drums.map((drum) => (
        <KeyBox
          key={drum}
          label={keyLabels[drum] ?? ''}
          color={fillOf(glows[drum] ?? 'idle', lit(drum), DRUMS[drum].color)}
          selected={selected === drum}
          onSelect={bindingMode ? () => onSelect?.(drum) : undefined}
        />
      ))}
    </div>
  );

  if (drums.length === 2) {
    const [left, right] = drums;
    const pillar = (drum: FoliDrum, side: 'left' | 'right') => {
      const glow = glows[drum] ?? 'idle';
      const fill = fillOf(glow, lit(drum), DRUMS[drum].color);
      return (
        <g
          key={drum}
          clipPath={`url(#foil-clip-${side})`}
          aria-label={DRUMS[drum].label}
          style={{
            cursor: disabled && !bindingMode ? 'default' : 'pointer',
            transition: 'filter 0.15s ease',
            filter: filterOf(glow, lit(drum), DRUMS[drum].color),
          }}
          onPointerDown={down(drum)}
          onPointerUp={up}
          onPointerLeave={up}
        >
          {bindingMode && (
            <rect
              x={2}
              y={2}
              width={165 - 4}
              height={146}
              rx={4}
              fill="transparent"
              pointerEvents="all"
              stroke={selected === drum ? fill : 'rgba(255,255,255,0.12)'}
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          )}
          <path
            d={FOIL_PATH}
            fill={fill}
            fillRule="nonzero"
            style={{ transition: 'fill 0.15s ease' }}
          />
        </g>
      );
    };
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <svg
          width={280}
          height={260}
          viewBox="0 0 165 150"
          style={{
            overflow: 'visible',
            userSelect: 'none',
            touchAction: 'none',
          }}
        >
          <defs>
            <clipPath id="foil-clip-left">
              <rect x="0" y="0" width={CLIP_SPLIT_X} height="150" />
            </clipPath>
            <clipPath id="foil-clip-right">
              <rect
                x={CLIP_SPLIT_X}
                y="0"
                width={165 - CLIP_SPLIT_X}
                height="150"
              />
            </clipPath>
          </defs>
          {pillar(left, 'left')}
          {pillar(right, 'right')}
        </svg>
        {keys}
      </div>
    );
  }

  // Four pads: a hexagon each, its drum named under it.
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', gap: 14 }}>
        {drums.map((drum) => {
          const glow = glows[drum] ?? 'idle';
          const color = DRUMS[drum].color;
          // At rest each pad keeps a tint of its drum's color, so four can
          // be told apart before they sound.
          const fill =
            glow === 'idle' && !lit(drum)
              ? `${color}40`
              : fillOf(glow, lit(drum), color);
          return (
            <button
              key={drum}
              type="button"
              aria-label={DRUMS[drum].label}
              onPointerDown={down(drum)}
              onPointerUp={up}
              onPointerLeave={up}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: disabled && !bindingMode ? 'default' : 'pointer',
                touchAction: 'none',
              }}
            >
              <svg
                width={88}
                height={100}
                viewBox="-44 -50 88 100"
                style={{
                  overflow: 'visible',
                  filter: filterOf(glow, lit(drum), DRUMS[drum].color),
                  transition: 'filter 0.15s ease',
                }}
              >
                <polygon
                  points="0,-48 41,-24 41,24 0,48 -41,24 -41,-24"
                  fill={fill}
                  stroke={
                    bindingMode && selected === drum
                      ? '#fff'
                      : 'rgba(255,255,255,0.12)'
                  }
                  strokeWidth={1.5}
                  style={{ transition: 'fill 0.15s ease' }}
                />
              </svg>
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.55)',
                }}
              >
                {DRUMS[drum].label}
              </span>
            </button>
          );
        })}
      </div>
      {keys}
    </div>
  );
}
