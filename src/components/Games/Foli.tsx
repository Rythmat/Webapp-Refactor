/* eslint-disable react/jsx-sort-props */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePrismRhythms } from '@/hooks/data/prism/usePrismRhythms';

// ── Constants ─────────────────────────────────────────────────────────────────

const TICKS_PER_QUARTER = 480;
const BPM = 90;
const TICK_DURATION_S = 60 / (BPM * TICKS_PER_QUARTER);
const TOLERANCE_RATIO = 0.1;
const FLASH_HOLD_MS = 180;

const BEAT_MS = (60 / BPM) * 1000; // ~666.67ms
const BAR_MS = BEAT_MS * 4; // ~2666.67ms
const BAR_TICKS = TICKS_PER_QUARTER * 4; // 1920
const NUM_CYCLES = 2;

const BONGO_LEFT_URL = '/samples/bongo/bongo0.mp3';
const BONGO_RIGHT_URL = '/samples/bongo/bongo1.mp3';

const SHAKER_URLS = [
  '/samples/bongo/shaker1.wav',
  '/samples/bongo/shaker2.wav',
  '/samples/bongo/shaker3.wav',
];

const METRO_FIRST_URL = '/sound/firstMetronomeClick.mp3';
const METRO_URL = '/sound/metronomeClick.mp3';

const MAX_LIVES = 5;

// ── Types ─────────────────────────────────────────────────────────────────────

type Side = 'left' | 'right';
type RhythmHit = [start: number, duration: number];
type SequenceNote = { startTick: number; durationTick: number; side: Side };
type Phase =
  | 'loading'
  | 'ready'
  | 'listening'
  | 'input'
  | 'success'
  | 'fail'
  | 'gameover';
type BongoGlow = 'idle' | 'hit' | 'success' | 'fail';

// ── Helpers ───────────────────────────────────────────────────────────────────

function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function ticksToMs(ticks: number) {
  return ticks * TICK_DURATION_S * 1000;
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

// ── Bongo Audio Engine ───────────────────────────────────────────────────────

class BongoEngine {
  private ctx: AudioContext | null = null;
  private bufferLeft: AudioBuffer | null = null;
  private bufferRight: AudioBuffer | null = null;
  private shakerBuffers: AudioBuffer[] = [];
  private metroFirst: AudioBuffer | null = null;
  private metroClick: AudioBuffer | null = null;
  private activeShaker: AudioBufferSourceNode | null = null;
  private shakerGain: GainNode | null = null;
  private metroInterval: ReturnType<typeof setInterval> | null = null;
  private metroBeatCount = 0;
  private loaded = false;
  private shakersLoaded = false;
  private metroLoaded = false;

  async init() {
    if (this.loaded) return;
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    this.ctx = new AC();
    const [leftBuf, rightBuf] = await Promise.all([
      fetch(BONGO_LEFT_URL)
        .then((r) => r.arrayBuffer())
        .then((b) => this.ctx!.decodeAudioData(b)),
      fetch(BONGO_RIGHT_URL)
        .then((r) => r.arrayBuffer())
        .then((b) => this.ctx!.decodeAudioData(b)),
    ]);
    this.bufferLeft = leftBuf;
    this.bufferRight = rightBuf;
    this.loaded = true;
  }

  async loadShakers() {
    if (this.shakersLoaded || !this.ctx) return;
    this.shakerBuffers = await Promise.all(
      SHAKER_URLS.map((url) =>
        fetch(url)
          .then((r) => r.arrayBuffer())
          .then((b) => this.ctx!.decodeAudioData(b)),
      ),
    );
    this.shakersLoaded = true;
  }

  async loadMetronome() {
    if (this.metroLoaded || !this.ctx) return;
    const [first, click] = await Promise.all([
      fetch(METRO_FIRST_URL)
        .then((r) => r.arrayBuffer())
        .then((b) => this.ctx!.decodeAudioData(b)),
      fetch(METRO_URL)
        .then((r) => r.arrayBuffer())
        .then((b) => this.ctx!.decodeAudioData(b)),
    ]);
    this.metroFirst = first;
    this.metroClick = click;
    this.metroLoaded = true;
  }

  private playBuffer(buffer: AudioBuffer | null) {
    if (!this.ctx || !buffer) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.ctx.destination);
    source.start();
  }

  play(side: Side) {
    this.playBuffer(side === 'left' ? this.bufferRight : this.bufferLeft);
  }

  playClick(isFirst: boolean) {
    this.playBuffer(isFirst ? this.metroFirst : this.metroClick);
  }

  playShaker(index: number) {
    if (!this.ctx || !this.shakersLoaded) return;
    this.stopShaker();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const buffer = this.shakerBuffers[index];
    if (!buffer) return;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.4;
    gain.connect(this.ctx.destination);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(gain);
    source.start();
    this.activeShaker = source;
    this.shakerGain = gain;
  }

  startMetronome() {
    this.stopMetronome();
    this.metroBeatCount = 0;
    this.playClick(true);
    this.metroInterval = setInterval(() => {
      this.metroBeatCount++;
      this.playClick(this.metroBeatCount % 4 === 0);
    }, BEAT_MS);
  }

  stopMetronome() {
    if (this.metroInterval !== null) {
      clearInterval(this.metroInterval);
      this.metroInterval = null;
    }
  }

  stopShaker() {
    if (this.shakerGain && this.activeShaker && this.ctx) {
      this.shakerGain.gain.linearRampToValueAtTime(
        0,
        this.ctx.currentTime + 0.1,
      );
      const src = this.activeShaker;
      setTimeout(() => {
        try {
          src.stop();
        } catch {
          /* ok */
        }
      }, 120);
      this.activeShaker = null;
      this.shakerGain = null;
    }
  }

  close() {
    this.stopMetronome();
    this.stopShaker();
    this.ctx?.close();
  }
}

// ── Foil SVG path (shared by both pillars) ──────────────────────────────────

const FOIL_PATH =
  'M 129.695312 69.484375 L 119.902344 57.707031 C 119.597656 57.328125 119.132812 57.109375 118.640625 57.109375 L 99.054688 57.109375 C 98.566406 57.109375 98.101562 57.328125 97.792969 57.707031 L 90.671875 66.273438 L 90.664062 43.480469 C 90.65625 43.40625 90.644531 43.332031 90.621094 43.253906 C 90.707031 42.792969 90.589844 42.316406 90.292969 41.945312 L 78.453125 27.6875 L 78.445312 27.6875 C 78.136719 27.3125 77.671875 27.101562 77.1875 27.101562 L 53.492188 27.101562 C 53 27.101562 52.542969 27.3125 52.230469 27.6875 L 40.386719 41.945312 L 40.378906 41.945312 C 40.085938 42.316406 39.964844 42.792969 40.054688 43.253906 C 40.035156 43.332031 40.023438 43.40625 40.011719 43.480469 L 40.011719 115.078125 C 40.011719 115.460938 40.140625 115.832031 40.386719 116.125 L 52.230469 130.382812 C 52.246094 130.40625 52.273438 130.414062 52.292969 130.433594 L 52.296875 130.433594 C 52.390625 130.519531 52.5 130.601562 52.613281 130.671875 C 52.679688 130.726562 52.757812 130.777344 52.839844 130.820312 C 52.988281 130.882812 53.152344 130.914062 53.308594 130.929688 C 53.371094 130.945312 53.433594 130.960938 53.5 130.972656 L 77.183594 130.972656 C 77.246094 130.960938 77.300781 130.945312 77.363281 130.929688 C 77.527344 130.914062 77.683594 130.882812 77.835938 130.820312 C 77.917969 130.777344 77.992188 130.726562 78.0625 130.671875 C 78.175781 130.601562 78.28125 130.519531 78.375 130.433594 C 78.394531 130.414062 78.425781 130.402344 78.4375 130.382812 L 87.617188 119.34375 L 87.617188 121.945312 L 87.621094 121.945312 C 87.621094 122.328125 87.753906 122.699219 88 122.996094 L 97.792969 134.773438 C 97.808594 134.796875 97.84375 134.804688 97.859375 134.828125 L 97.859375 134.824219 C 98.03125 134.96875 98.210938 135.097656 98.402344 135.21875 C 98.515625 135.253906 98.632812 135.28125 98.753906 135.292969 C 98.855469 135.332031 98.953125 135.347656 99.054688 135.363281 L 118.640625 135.363281 C 118.761719 135.347656 118.878906 135.324219 119 135.28125 C 119.09375 135.269531 119.1875 135.25 119.28125 135.21875 C 119.386719 135.160156 119.496094 135.09375 119.589844 135.011719 C 119.671875 134.960938 119.746094 134.898438 119.820312 134.835938 C 119.847656 134.808594 119.878906 134.796875 119.902344 134.773438 L 129.695312 122.980469 C 129.941406 122.6875 130.078125 122.316406 130.078125 121.933594 L 130.078125 70.9375 C 130.066406 70.875 130.054688 70.8125 130.035156 70.75 C 130.109375 70.300781 129.984375 69.835938 129.695312 69.484375 Z M 99.828125 60.390625 L 117.867188 60.390625 L 126.296875 70.53125 L 117.867188 80.671875 L 99.828125 80.664062 L 91.402344 70.523438 Z M 100.703125 83.945312 L 116.988281 83.945312 L 116.988281 132.074219 L 100.703125 132.074219 Z M 54.265625 30.375 L 76.410156 30.375 L 86.894531 42.984375 L 76.410156 55.597656 L 54.265625 55.605469 L 43.785156 42.992188 Z M 55.140625 58.867188 L 75.539062 58.867188 L 75.539062 127.671875 L 55.140625 127.671875 Z M 43.292969 47.519531 L 51.859375 57.824219 L 51.855469 124.78125 L 43.292969 114.484375 Z M 78.824219 124.773438 L 78.816406 57.824219 L 87.386719 47.519531 L 87.386719 114.484375 Z M 90.910156 75.066406 L 97.421875 82.898438 L 97.417969 129.171875 L 90.90625 121.335938 Z M 120.269531 129.183594 L 120.269531 82.910156 L 126.789062 75.070312 L 126.789062 121.335938 Z M 120.269531 129.183594';

const CLIP_SPLIT_X = 89;

// ── Rhythm Notation Component ────────────────────────────────────────────────

type NoteValue =
  | 'whole'
  | 'half.'
  | 'half'
  | 'quarter.'
  | 'quarter'
  | 'eighth.'
  | 'eighth'
  | 'sixteenth.'
  | 'sixteenth';
type RestSlot = { startTick: number; durationTick: number };

function durationToValue(ticks: number): NoteValue {
  if (ticks >= 1680) return 'whole';
  if (ticks >= 1200) return 'half.';
  if (ticks >= 840) return 'half';
  if (ticks >= 600) return 'quarter.';
  if (ticks >= 420) return 'quarter';
  if (ticks >= 300) return 'eighth.';
  if (ticks >= 180) return 'eighth';
  if (ticks >= 150) return 'sixteenth.';
  return 'sixteenth';
}

function isDotted(val: NoteValue) {
  return val.endsWith('.');
}
function isFilledHead(val: NoteValue) {
  return !['whole', 'half.', 'half'].includes(val);
}
function hasNoteStem(val: NoteValue) {
  return val !== 'whole';
}
function isBeamable(val: NoteValue) {
  return ['eighth', 'eighth.', 'sixteenth', 'sixteenth.'].includes(val);
}

const REST_TICK_VALUES = [1920, 960, 480, 240, 120];

function subdivideRest(startTick: number, durationTick: number): RestSlot[] {
  const result: RestSlot[] = [];
  let remaining = durationTick;
  let cursor = startTick;
  while (remaining >= 120) {
    for (const d of REST_TICK_VALUES) {
      if (d <= remaining) {
        result.push({ startTick: cursor, durationTick: d });
        cursor += d;
        remaining -= d;
        break;
      }
    }
  }
  return result;
}

function computeRests(seq: SequenceNote[]): RestSlot[] {
  const rests: RestSlot[] = [];
  let cursor = 0;
  for (const note of seq) {
    if (note.startTick > cursor) {
      rests.push(...subdivideRest(cursor, note.startTick - cursor));
    }
    cursor = note.startTick + note.durationTick;
  }
  if (cursor < BAR_TICKS) {
    rests.push(...subdivideRest(cursor, BAR_TICKS - cursor));
  }
  return rests;
}

const NOTATION_W = 280;
const NOTATION_H = 60;
const NOTATION_PAD_L = 22;
const NOTATION_PAD_R = 22;
const NOTATION_STAFF_Y = 36;
const NOTATION_HEAD_RX = 5.5;
const NOTATION_HEAD_RY = 4;
const NOTATION_STEM_H = 24;
const NOTATION_BEAM_THICK = 3;
const NOTATION_USABLE = NOTATION_W - NOTATION_PAD_L - NOTATION_PAD_R;

function tickToX(tick: number) {
  return NOTATION_PAD_L + (tick / BAR_TICKS) * NOTATION_USABLE;
}

function restBaseValue(
  ticks: number,
): 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth' {
  if (ticks >= 1680) return 'whole';
  if (ticks >= 840) return 'half';
  if (ticks >= 420) return 'quarter';
  if (ticks >= 180) return 'eighth';
  return 'sixteenth';
}

function RestSymbol({ slot }: { slot: RestSlot }) {
  const x = tickToX(slot.startTick + slot.durationTick / 2);
  const y = NOTATION_STAFF_Y;
  const c = 'rgba(255,255,255,0.22)';
  const val = restBaseValue(slot.durationTick);

  if (val === 'whole') {
    return <rect x={x - 5} y={y} width={10} height={5} rx={0.5} fill={c} />;
  }
  if (val === 'half') {
    return <rect x={x - 5} y={y - 5} width={10} height={5} rx={0.5} fill={c} />;
  }
  if (val === 'quarter') {
    return (
      <path
        d={`M${x + 2} ${y - 10} L${x - 2} ${y - 5} L${x + 3} ${y - 1} Q${x - 3} ${y + 2} ${x - 1} ${y + 8}`}
        fill="none"
        stroke={c}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }
  if (val === 'eighth') {
    return (
      <g>
        <circle cx={x + 1} cy={y - 7} r={1.8} fill={c} />
        <line
          x1={x + 1}
          y1={y - 7}
          x2={x - 3}
          y2={y + 5}
          stroke={c}
          strokeWidth={1.4}
          strokeLinecap="round"
        />
      </g>
    );
  }
  // sixteenth
  return (
    <g>
      <circle cx={x + 1} cy={y - 9} r={1.8} fill={c} />
      <circle cx={x - 0.5} cy={y - 3} r={1.8} fill={c} />
      <line
        x1={x + 1}
        y1={y - 9}
        x2={x - 4}
        y2={y + 5}
        stroke={c}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </g>
  );
}

function RhythmNotation({
  sequence,
  matched,
  barStartTime,
}: {
  sequence: SequenceNote[];
  matched: Set<number>;
  barStartTime: number | null;
}) {
  const W = NOTATION_W;
  const H = NOTATION_H;
  const PAD_L = NOTATION_PAD_L;
  const PAD_R = NOTATION_PAD_R;
  const STAFF_Y = NOTATION_STAFF_Y;
  const HEAD_RX = NOTATION_HEAD_RX;
  const HEAD_RY = NOTATION_HEAD_RY;
  const STEM_H = NOTATION_STEM_H;
  const BEAM_THICK = NOTATION_BEAM_THICK;
  const usable = NOTATION_USABLE;

  // ── Playhead ──
  const [playheadX, setPlayheadX] = useState<number | null>(null);

  useEffect(() => {
    if (barStartTime === null) {
      setPlayheadX(null);
      return;
    }
    let raf: number;
    const tick = () => {
      const elapsed = performance.now() - barStartTime;
      const progress = Math.min(elapsed / BAR_MS, 1);
      setPlayheadX(PAD_L + progress * usable);
      if (progress < 1) raf = requestAnimationFrame(tick);
      else setPlayheadX(null);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [barStartTime, PAD_L, usable]);

  const noteX = (n: SequenceNote) => tickToX(n.startTick);

  // ── Beam groups ──
  const beamGroups: number[][] = [];
  let cur: number[] = [];
  for (let i = 0; i < sequence.length; i++) {
    const val = durationToValue(sequence[i].durationTick);
    if (isBeamable(val)) {
      cur.push(i);
    } else {
      if (cur.length > 1) beamGroups.push(cur);
      cur = [];
    }
  }
  if (cur.length > 1) beamGroups.push(cur);
  const beamed = new Set(beamGroups.flat());

  // ── Rest slots ──
  const rests = computeRests(sequence);

  const sideColor = (side: Side) => (side === 'left' ? '#a78bfa' : '#38bdf8');

  const barTop = STAFF_Y - STEM_H - 2;
  const barBot = STAFF_Y + 8;

  return (
    <svg width={W} height={H} style={{ overflow: 'visible' }}>
      {/* Bar lines */}
      <line
        x1={PAD_L - 10}
        y1={barTop}
        x2={PAD_L - 10}
        y2={barBot}
        stroke="rgba(255,255,255,0.25)"
        strokeWidth={1.5}
      />
      <line
        x1={W - PAD_R + 10}
        y1={barTop}
        x2={W - PAD_R + 10}
        y2={barBot}
        stroke="rgba(255,255,255,0.25)"
        strokeWidth={1.5}
      />

      {/* Staff line */}
      <line
        x1={PAD_L - 10}
        y1={STAFF_Y}
        x2={W - PAD_R + 10}
        y2={STAFF_Y}
        stroke="rgba(255,255,255,0.12)"
        strokeWidth={1.2}
      />

      {/* Rests */}
      {rests.map((slot, i) => (
        <RestSymbol key={`rest-${i}`} slot={slot} />
      ))}

      {/* Beams */}
      {beamGroups.map((group, gi) => {
        const x1 = noteX(sequence[group[0]]) + HEAD_RX;
        const x2 = noteX(sequence[group[group.length - 1]]) + HEAD_RX;
        const beamY = STAFF_Y - STEM_H;
        const hasDouble = group.some((idx) => {
          const v = durationToValue(sequence[idx].durationTick);
          return v === 'sixteenth' || v === 'sixteenth.';
        });
        return (
          <g key={`beam-${gi}`}>
            <line
              x1={x1}
              y1={beamY}
              x2={x2}
              y2={beamY}
              stroke="rgba(255,255,255,0.5)"
              strokeWidth={BEAM_THICK}
              strokeLinecap="round"
            />
            {hasDouble && (
              <line
                x1={x1}
                y1={beamY + 5}
                x2={x2}
                y2={beamY + 5}
                stroke="rgba(255,255,255,0.5)"
                strokeWidth={BEAM_THICK}
                strokeLinecap="round"
              />
            )}
          </g>
        );
      })}

      {/* Notes */}
      {sequence.map((note, i) => {
        const x = noteX(note);
        const val = durationToValue(note.durationTick);
        const isHit = matched.has(i);
        const color = sideColor(note.side);
        const opacity = isHit ? 1 : 0.3;
        const filled = isFilledHead(val);
        const stem = hasNoteStem(val);
        const dotted = isDotted(val);
        const base = val.replace('.', '') as string;
        const isSixteenth = base === 'sixteenth';

        return (
          <g key={i} style={{ transition: 'opacity 0.15s' }} opacity={opacity}>
            {/* Note head */}
            <ellipse
              cx={x}
              cy={STAFF_Y}
              rx={HEAD_RX}
              ry={HEAD_RY}
              fill={filled ? color : 'none'}
              stroke={color}
              strokeWidth={filled ? 0 : 1.6}
              transform={`rotate(-20 ${x} ${STAFF_Y})`}
            />

            {/* Augmentation dot */}
            {dotted && (
              <circle
                cx={x + HEAD_RX + 4}
                cy={STAFF_Y - 1}
                r={1.5}
                fill={color}
              />
            )}

            {/* Stem */}
            {stem && (
              <line
                x1={x + HEAD_RX}
                y1={STAFF_Y - 2}
                x2={x + HEAD_RX}
                y2={STAFF_Y - STEM_H}
                stroke={color}
                strokeWidth={1.4}
                strokeLinecap="round"
              />
            )}

            {/* Flag for isolated beamable notes */}
            {isBeamable(val) && !beamed.has(i) && (
              <>
                <path
                  d={`M ${x + HEAD_RX} ${STAFF_Y - STEM_H} q 6 8 0 16`}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.4}
                  strokeLinecap="round"
                />
                {isSixteenth && (
                  <path
                    d={`M ${x + HEAD_RX} ${STAFF_Y - STEM_H + 5} q 6 8 0 16`}
                    fill="none"
                    stroke={color}
                    strokeWidth={1.4}
                    strokeLinecap="round"
                  />
                )}
              </>
            )}
          </g>
        );
      })}

      {/* Playhead */}
      {playheadX !== null && (
        <line
          x1={playheadX}
          y1={barTop - 2}
          x2={playheadX}
          y2={barBot + 2}
          stroke="rgba(255,255,255,0.6)"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

// ── Foil Drums Component ─────────────────────────────────────────────────────

function FoilDrums({
  leftGlow,
  rightGlow,
  disabled,
  onPressLeft,
  onPressRight,
}: {
  leftGlow: BongoGlow;
  rightGlow: BongoGlow;
  disabled: boolean;
  onPressLeft: () => void;
  onPressRight: () => void;
}) {
  const [pressedLeft, setPressedLeft] = useState(false);
  const [pressedRight, setPressedRight] = useState(false);

  const getFill = (glow: BongoGlow, pressed: boolean, side: Side) => {
    const isLit = glow === 'hit' || pressed;
    if (glow === 'success') return '#22c55e';
    if (glow === 'fail') return '#f87171';
    if (isLit) return side === 'left' ? '#a78bfa' : '#38bdf8';
    return '#52525b';
  };

  const getFilter = (glow: BongoGlow, pressed: boolean, side: Side): string => {
    const isLit = glow === 'hit' || pressed;
    if (glow === 'success')
      return 'drop-shadow(0 0 18px rgba(34,197,94,0.7)) drop-shadow(0 0 36px rgba(34,197,94,0.3))';
    if (glow === 'fail')
      return 'drop-shadow(0 0 18px rgba(248,113,113,0.7)) drop-shadow(0 0 36px rgba(248,113,113,0.3))';
    if (isLit) {
      return side === 'left'
        ? 'drop-shadow(0 0 16px rgba(167,139,250,0.9)) drop-shadow(0 0 32px rgba(167,139,250,0.4))'
        : 'drop-shadow(0 0 16px rgba(56,189,248,0.9)) drop-shadow(0 0 32px rgba(56,189,248,0.4))';
    }
    return 'none';
  };

  const leftFill = getFill(leftGlow, pressedLeft, 'left');
  const rightFill = getFill(rightGlow, pressedRight, 'right');
  const leftFilter = getFilter(leftGlow, pressedLeft, 'left');
  const rightFilter = getFilter(rightGlow, pressedRight, 'right');

  const handleLeftDown = () => {
    if (!disabled) {
      setPressedLeft(true);
      onPressLeft();
    }
  };
  const handleRightDown = () => {
    if (!disabled) {
      setPressedRight(true);
      onPressRight();
    }
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
        style={{ overflow: 'visible', userSelect: 'none' }}
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

        {/* Left pillar */}
        <g
          clipPath="url(#foil-clip-left)"
          style={{
            cursor: disabled ? 'default' : 'pointer',
            transition: 'filter 0.15s ease',
            filter: leftFilter,
          }}
          onMouseDown={handleLeftDown}
          onMouseUp={() => setPressedLeft(false)}
          onMouseLeave={() => setPressedLeft(false)}
          onTouchStart={handleLeftDown}
          onTouchEnd={() => setPressedLeft(false)}
        >
          <path
            d={FOIL_PATH}
            fill={leftFill}
            fillRule="nonzero"
            style={{ transition: 'fill 0.15s ease' }}
          />
        </g>

        {/* Right pillar */}
        <g
          clipPath="url(#foil-clip-right)"
          style={{
            cursor: disabled ? 'default' : 'pointer',
            transition: 'filter 0.15s ease',
            filter: rightFilter,
          }}
          onMouseDown={handleRightDown}
          onMouseUp={() => setPressedRight(false)}
          onMouseLeave={() => setPressedRight(false)}
          onTouchStart={handleRightDown}
          onTouchEnd={() => setPressedRight(false)}
        >
          <path
            d={FOIL_PATH}
            fill={rightFill}
            fillRule="nonzero"
            style={{ transition: 'fill 0.15s ease' }}
          />
        </g>
      </svg>

      {/* Key hints */}
      <div style={{ display: 'flex', gap: 80, justifyContent: 'center' }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 2,
            color: leftFill,
            fontFamily: 'monospace',
            transition: 'color 0.15s ease',
          }}
        >
          A
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 2,
            color: rightFill,
            fontFamily: 'monospace',
            transition: 'color 0.15s ease',
          }}
        >
          D
        </span>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Foli() {
  const rhythmsQuery = usePrismRhythms();

  const [phase, setPhase] = useState<Phase>('loading');
  const [leftGlow, setLeftGlow] = useState<BongoGlow>('idle');
  const [rightGlow, setRightGlow] = useState<BongoGlow>('idle');
  const [sequence, setSequence] = useState<SequenceNote[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [lives, setLives] = useState(MAX_LIVES);
  const [score, setScore] = useState(0);
  const [barStartTime, setBarStartTime] = useState<number | null>(null);

  const phaseRef = useRef<Phase>('loading');
  const sequenceRef = useRef<SequenceNote[]>([]);
  const inputStartRef = useRef<number>(0);
  const matchedRef = useRef<Set<number>>(new Set());
  const toleranceRef = useRef(BEAT_MS * 0.15);
  const engineRef = useRef<BongoEngine | null>(null);
  const runningRef = useRef(false);
  const livesRef = useRef(MAX_LIVES);
  const scoreRef = useRef(0);

  const getEngine = useCallback(() => {
    if (!engineRef.current) engineRef.current = new BongoEngine();
    return engineRef.current;
  }, []);

  const sp = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      runningRef.current = false;
      engineRef.current?.close();
    };
  }, []);

  // ── Flash helper ────────────────────────────────────────────────────

  const flashSide = useCallback((side: Side, glow: BongoGlow = 'hit') => {
    const setter = side === 'left' ? setLeftGlow : setRightGlow;
    setter(glow);
    setTimeout(() => {
      if (phaseRef.current === 'listening' || phaseRef.current === 'input') {
        setter('idle');
      }
    }, FLASH_HOLD_MS);
  }, []);

  // ── Pick a random rhythm once data is loaded ─────────────────────────

  const allPatterns = useMemo(() => {
    if (!rhythmsQuery.data) return [];
    const melodies = Object.values(rhythmsQuery.data.melodies ?? {});
    const chords = Object.values(rhythmsQuery.data.chords ?? {});
    const all = [...melodies, ...chords].filter((p) => {
      if (!Array.isArray(p) || p.length < 2 || p.length > 12) return false;
      // Only patterns that fit within 1 bar
      const lastTick = p[p.length - 1][0];
      return lastTick < BAR_TICKS;
    });
    return all as RhythmHit[][];
  }, [rhythmsQuery.data]);

  useEffect(() => {
    if (allPatterns.length > 0 && phaseRef.current === 'loading') {
      sp('ready');
    }
  }, [allPatterns, sp]);

  // ── Assign L/R sides & normalize to start at tick 0 ─────────────────

  const assignSides = useCallback((pattern: RhythmHit[]): SequenceNote[] => {
    const firstTick = pattern[0][0];
    return pattern.map(([startTick, duration], i) => ({
      startTick: startTick - firstTick,
      durationTick: duration,
      side: (i % 2 === 0 ? 'left' : 'right') as Side,
    }));
  }, []);

  // ── Play the demonstration sequence (fire-and-forget within a bar) ──

  const playSequence = useCallback(
    (seq: SequenceNote[], engine: BongoEngine) => {
      // Schedule all notes relative to now — does not await, returns immediately
      for (let i = 0; i < seq.length; i++) {
        const delayMs = ticksToMs(seq[i].startTick);
        const side = seq[i].side;
        setTimeout(() => {
          if (!runningRef.current) return;
          flashSide(side);
          engine.play(side);
        }, delayMs);
      }
    },
    [flashSide],
  );

  // ── Evaluate user hits against the sequence ─────────────────────────

  const checkHits = useCallback((seq: SequenceNote[]): boolean => {
    return matchedRef.current.size >= seq.length;
  }, []);

  // ── Play a single round, return true if passed ──────────────────────

  const playRound = useCallback(
    async (engine: BongoEngine): Promise<boolean> => {
      if (allPatterns.length === 0) return false;

      const picked = pickRandom(allPatterns);
      const withSides = assignSides(picked);
      sequenceRef.current = withSides;

      setSequence(withSides);
      setLeftGlow('idle');
      setRightGlow('idle');

      // Compute tolerance window for this pattern
      const seqTimesMs = withSides.map((n) => ticksToMs(n.startTick));
      const seqSpan =
        seqTimesMs.length > 1 ? seqTimesMs[seqTimesMs.length - 1] : 1000;
      toleranceRef.current = Math.max(
        seqSpan * TOLERANCE_RATIO,
        BEAT_MS * 0.15,
      );

      // Question/Answer cycles
      for (let cycle = 0; cycle < NUM_CYCLES; cycle++) {
        if (!runningRef.current) return false;

        // Question bar
        sp('listening');
        setLeftGlow('idle');
        setRightGlow('idle');
        setBarStartTime(performance.now());
        playSequence(withSides, engine);
        await wait(BAR_MS);
        if (!runningRef.current) return false;

        // Answer bar
        matchedRef.current = new Set();
        setMatched(new Set());
        inputStartRef.current = performance.now();
        setBarStartTime(performance.now());
        sp('input');
        await wait(BAR_MS);
        if (!runningRef.current) return false;

        if (checkHits(withSides)) return true;
      }

      setBarStartTime(null);
      return false;
    },
    [allPatterns, assignSides, playSequence, checkHits, sp],
  );

  // ── Start a full game session ──────────────────────────────────────

  const startGame = useCallback(async () => {
    if (allPatterns.length === 0) return;

    livesRef.current = MAX_LIVES;
    scoreRef.current = 0;
    setLives(MAX_LIVES);
    setScore(0);
    runningRef.current = true;

    const engine = getEngine();
    await engine.init();
    await engine.loadShakers();
    await engine.loadMetronome();

    const shakerIndex = Math.floor(Math.random() * SHAKER_URLS.length);
    engine.playShaker(shakerIndex);
    engine.startMetronome();

    // One count-in bar before the first question
    sp('listening');
    await wait(BAR_MS);
    if (!runningRef.current) return;

    while (livesRef.current > 0 && runningRef.current) {
      const passed = await playRound(engine);
      if (!runningRef.current) return;

      setBarStartTime(null);
      if (passed) {
        scoreRef.current += 1;
        setScore(scoreRef.current);
        setLeftGlow('success');
        setRightGlow('success');
        sp('success');
      } else {
        livesRef.current -= 1;
        setLives(livesRef.current);
        setLeftGlow('fail');
        setRightGlow('fail');
        sp('fail');
      }
    }

    runningRef.current = false;
    engine.stopMetronome();
    engine.stopShaker();
    sp('gameover');
  }, [allPatterns, getEngine, playRound, sp]);

  // ── Handle user bongo press ─────────────────────────────────────────

  const handleHit = useCallback(
    (side: Side) => {
      if (phaseRef.current !== 'input') return;

      const engine = getEngine();
      engine.play(side);
      flashSide(side);

      const relativeMs = performance.now() - inputStartRef.current;
      const seq = sequenceRef.current;
      const windowMs = toleranceRef.current;

      // Find closest unmatched note within tolerance and correct side
      let bestIdx = -1;
      let bestDist = Infinity;
      for (let i = 0; i < seq.length; i++) {
        if (matchedRef.current.has(i)) continue;
        if (seq[i].side !== side) continue;
        const expectedMs = ticksToMs(seq[i].startTick);
        const dist = Math.abs(relativeMs - expectedMs);
        if (dist < bestDist && dist <= windowMs) {
          bestDist = dist;
          bestIdx = i;
        }
      }
      if (bestIdx >= 0) {
        matchedRef.current = new Set(matchedRef.current).add(bestIdx);
        setMatched(new Set(matchedRef.current));
      }
    },
    [getEngine, flashSide],
  );

  // ── Keyboard support: A = left, D = right, Space/Enter = start ──────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;

      if (e.code === 'KeyA') {
        e.preventDefault();
        if (phaseRef.current === 'input') handleHit('left');
      } else if (e.code === 'KeyD') {
        e.preventDefault();
        if (phaseRef.current === 'input') handleHit('right');
      } else if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (phaseRef.current === 'ready' || phaseRef.current === 'gameover') {
          startGame();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleHit, startGame]);

  // ── Reset after result ────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    runningRef.current = false;
    getEngine().stopMetronome();
    getEngine().stopShaker();
    setLeftGlow('idle');
    setRightGlow('idle');
    setSequence([]);
    setMatched(new Set());
    setBarStartTime(null);
    matchedRef.current = new Set();
    livesRef.current = MAX_LIVES;
    scoreRef.current = 0;
    setLives(MAX_LIVES);
    setScore(0);
    sp('ready');
  }, [getEngine, sp]);

  // ── Derived display ───────────────────────────────────────────────────

  const isInputActive = phase === 'input';

  const statusLabel: Record<Phase, string> = {
    loading: 'Loading rhythms…',
    ready: '',
    listening: 'Listen to the rhythm…',
    input: 'Your turn — tap it back!',
    success: 'Rhythm matched!',
    fail: 'Not quite…',
    gameover: '',
  };

  // Hex path for tiny life indicators (flat-top, centered at 0,0, radius ~6)
  const hexPts = '0,-6 5.2,-3 5.2,3 0,6 -5.2,3 -5.2,-3';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        padding: '24px 16px',
        minHeight: '70vh',
      }}
    >
      {/* Title + Score + Lives */}
      <div style={{ textAlign: 'center' }}>
        <h1
          style={{
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: 5,
            color: '#a78bfa',
            margin: 0,
            textTransform: 'uppercase',
          }}
        >
          Foli
        </h1>
        <p
          style={{
            fontSize: 10,
            color: 'var(--color-text-dim, #6b7280)',
            marginTop: 3,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
          }}
        >
          Rhythmic recall
        </p>
      </div>

      {/* Lives and Score bar */}
      {phase !== 'loading' && phase !== 'ready' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Lives as hex icons */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {Array.from({ length: MAX_LIVES }).map((_, i) => (
              <svg key={i} width={14} height={14} viewBox="-7 -7 14 14">
                <polygon
                  points={hexPts}
                  fill={i < lives ? '#a78bfa' : 'rgba(255,255,255,0.08)'}
                  stroke={i < lives ? '#c4b5fd' : 'rgba(255,255,255,0.06)'}
                  strokeWidth={1}
                  style={{ transition: 'fill 0.3s, stroke 0.3s' }}
                />
              </svg>
            ))}
          </div>

          {/* Score */}
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              fontFamily: 'monospace',
              color: '#ddd6fe',
              letterSpacing: 1,
            }}
          >
            {score}
          </span>
        </div>
      )}

      {/* Foil drums */}
      <FoilDrums
        leftGlow={leftGlow}
        rightGlow={rightGlow}
        disabled={!isInputActive}
        onPressLeft={() => handleHit('left')}
        onPressRight={() => handleHit('right')}
      />

      {/* Status */}
      {phase !== 'gameover' && (
        <div
          style={{
            fontSize: 11,
            fontWeight: 500,
            minHeight: 16,
            textAlign: 'center',
            transition: 'color 0.3s',
            color:
              phase === 'success'
                ? '#22c55e'
                : phase === 'fail'
                  ? '#f87171'
                  : 'var(--color-text-dim, #6b7280)',
          }}
        >
          {statusLabel[phase]}
        </div>
      )}

      {/* Rhythm notation */}
      {(phase === 'listening' || phase === 'input') && sequence.length > 0 && (
        <RhythmNotation
          sequence={sequence}
          matched={matched}
          barStartTime={barStartTime}
        />
      )}

      {/* Game Over screen */}
      {phase === 'gameover' && (
        <div
          style={{
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              letterSpacing: 3,
              color: '#f87171',
              textTransform: 'uppercase',
            }}
          >
            Game Over
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--color-text-dim, #6b7280)',
            }}
          >
            Final Score:{' '}
            <span
              style={{
                color: '#ddd6fe',
                fontWeight: 700,
                fontFamily: 'monospace',
              }}
            >
              {score}
            </span>
          </div>
        </div>
      )}

      {/* Start / Play Again */}
      {(phase === 'ready' || phase === 'gameover') && (
        <button
          onClick={
            phase === 'ready'
              ? startGame
              : () => {
                  handleReset();
                }
          }
          style={{
            padding: '9px 36px',
            borderRadius: 10,
            border: `1.5px solid ${phase === 'gameover' ? '#f87171' : '#a78bfa'}`,
            backgroundColor:
              phase === 'gameover'
                ? 'rgba(248,113,113,0.1)'
                : 'rgba(167,139,250,0.14)',
            color: phase === 'gameover' ? '#fca5a5' : '#ddd6fe',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: 2,
            textTransform: 'uppercase',
            transition: 'all 0.18s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor =
              phase === 'gameover'
                ? 'rgba(248,113,113,0.2)'
                : 'rgba(167,139,250,0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor =
              phase === 'gameover'
                ? 'rgba(248,113,113,0.1)'
                : 'rgba(167,139,250,0.14)';
          }}
        >
          {phase === 'ready' ? 'Start' : 'Play Again'}
        </button>
      )}

      {/* Loading state */}
      {phase === 'loading' && (
        <div
          style={{
            fontSize: 11,
            color: 'var(--color-text-dim, #6b7280)',
            letterSpacing: 1,
          }}
        >
          Loading rhythms…
        </div>
      )}
    </div>
  );
}
