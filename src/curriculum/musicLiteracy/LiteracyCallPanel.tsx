import { useRef, type CSSProperties } from 'react';
import { CircleOfFifthsSvg } from '@/components/common/CircleOfFifthsSvg';
import { cn } from '@/components/utilities';
import {
  degreeLabel,
  type TimedNote,
} from '@/curriculum/engine/musicLiteracy/literacy';
import type { RunView } from '@/curriculum/engine/musicLiteracy/run';
import { useElementSize } from '@/hooks/useElementSize';
import type { HubHeadline, TurnCue } from './turnCues';
import './literacyCues.css';

// ── The call: the circle, the hub and the words ────────────────────────────
// The left half of a Music Literacy step, as the landing page's Theory scene
// draws its circle: the key on the circle of fifths in the house colors (a
// minor step lights its relative major's color), and in the circle's middle
// a Simon-like hub: what to do now, in big lit letters (LISTEN, GET READY,
// GO!, then YOUR TURN), the call's scale degrees lighting as they sound and
// as they should be played back, and the beat. Under the
// circle, the words, a bar to a line, each syllable lighting as its note
// sounds; one sung off the root carries its scale degree. A pickup's
// syllables lead the first line, into its downbeat.

/** The circle never grows past this, nor shrinks under the floor. */
const MAX_CIRCLE = 460;
const MIN_CIRCLE = 168;
/** Stacked: the circle beside the words. */
const COMPACT_CIRCLE = 248;
/** Between the circle and the words. */
const WORDS_GAP = 8;

/**
 * The empty bands above and below the ring, as shares of the circle's size.
 * CircleOfFifthsSvg keeps room all round for the one key label it shows
 * (the ring's outer edge at 0.34 of the size from the middle, the label at
 * 0.44); only the side the label is on needs it.
 */
export function circleTrim(tonicPc: number): { top: number; bottom: number } {
  const position = (tonicPc * 7) % 12; // C at the top, then clockwise by fifths
  const labelDown = -Math.cos((position * Math.PI) / 6) * 0.44;
  const used = (offset: number) => Math.max(0.34, offset + 0.06);
  return {
    top: Math.max(0, 0.5 - used(-labelDown)),
    bottom: Math.max(0, 0.5 - used(labelDown)),
  };
}

export interface LiteracyCallPanelProps {
  /** The 1's pitch class, and the step's mode by the color rule. */
  tonicPc: number;
  mode: 'major' | 'minor';
  keyColor: string;
  /** "C Major", "C Minor". */
  keyName: string;
  /** Minor: the major key whose color it wears ("E♭"). */
  colorOf: string | null;
  call: readonly TimedNote[];
  response: readonly TimedNote[];
  words: readonly TimedNote[];
  /**
   * Where the words' downbeat is on the timeline (a pickup comes before),
   * and a bar's length: one line a bar.
   */
  wordsStart: number;
  barTicks: number;
  beatsPerBar: number;
  view: RunView;
  running: boolean;
  /**
   * What the hub says over the degrees (turnCues.ts): LISTEN, GET READY,
   * GO!, then whose turn; out of a run, what the degrees are.
   */
  headline: HubHeadline;
  /** The circle sits beside the words (a short, wide box) rather than above. */
  compact?: boolean;
}

export function LiteracyCallPanel(props: LiteracyCallPanelProps) {
  const { keyColor, keyName, colorOf, compact } = props;
  // The circle takes what the words leave, and the two stay together.
  const areaRef = useRef<HTMLDivElement>(null);
  const wordsRef = useRef<HTMLDivElement>(null);
  const area = useElementSize(areaRef);
  const words = useElementSize(wordsRef);
  const trim = circleTrim(props.tonicPc);
  const shown = 1 - trim.top - trim.bottom;
  const size = compact
    ? COMPACT_CIRCLE
    : Math.round(
        Math.max(
          MIN_CIRCLE,
          Math.min(
            MAX_CIRCLE,
            area.width || MAX_CIRCLE,
            area.height
              ? (area.height - words.height - WORDS_GAP) / shown
              : MAX_CIRCLE,
          ),
        ),
      );

  const keyCaption = (
    <p
      data-literacy-key
      className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-white/55"
    >
      <span
        aria-hidden
        className="size-2 rounded-full"
        style={{ backgroundColor: keyColor }}
      />
      <span className="text-[#e8e8f0]">{keyName}</span>
      {colorOf && (
        <span className="normal-case tracking-normal text-white/45">
          · in {colorOf}’s color
        </span>
      )}
    </p>
  );
  const circle = (
    <div
      data-literacy-circle
      className="relative shrink-0"
      style={{
        width: size,
        height: size,
        marginTop: -trim.top * size,
        marginBottom: -trim.bottom * size,
      }}
    >
      <CircleOfFifthsSvg
        selectedPitch={props.tonicPc}
        selectedMode={props.mode}
        size={size}
        labelWeight={400}
        ariaLabel={`${keyName}${colorOf ? `, in ${colorOf}’s color` : ''}`}
      />
      <Hub {...props} size={size} />
    </div>
  );

  return (
    <section
      aria-label="The call"
      data-literacy-call
      className="flex min-h-0 min-w-0 flex-col gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4"
    >
      {keyCaption}
      {compact ? (
        <div className="flex min-w-0 items-center gap-6 max-[639px]:flex-col max-[639px]:gap-3">
          {circle}
          <div ref={wordsRef} className="min-w-0 flex-1">
            <WordsLine {...props} />
          </div>
        </div>
      ) : (
        <div ref={areaRef} className="relative min-h-0 flex-1">
          <div
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ gap: WORDS_GAP }}
          >
            {circle}
            <div ref={wordsRef} className="w-full">
              <WordsLine {...props} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ── The hub ────────────────────────────────────────────────────────────────

/**
 * Each cue's letters, as a share of the hub's diameter: as big as the hub's
 * width allows at the headline (GET READY is the longest), Go! the biggest.
 */
const CUE_SIZE: Readonly<Record<TurnCue, number>> = {
  listen: 0.19,
  getReady: 0.135,
  go: 0.27,
};

/** The headline's height, as a share of the diameter: room for Go!. */
const HEADLINE_BOX = 0.27;

/** Each cue's light: base, the sheen's peak, the glow (CSS colors). */
function cueColors(cue: TurnCue, keyColor: string) {
  const mix = (share: number, other: string) =>
    `color-mix(in oklab, ${keyColor} ${share}%, ${other})`;
  switch (cue) {
    // Calm: silver, lit white.
    case 'listen':
      return {
        base: '#d9dbe6',
        shine: '#ffffff',
        glow: 'rgb(255 255 255 / 0.28)',
        glowSize: '5px',
      };
    // The call's color: the degrees lighting under it are the targets.
    case 'getReady':
      return {
        base: mix(78, 'white'),
        shine: mix(20, 'white'),
        glow: mix(60, 'transparent'),
        glowSize: '7px',
      };
    // The brightest: white-hot in the call's color.
    case 'go':
      return {
        base: mix(52, 'white'),
        shine: '#ffffff',
        glow: mix(85, 'transparent'),
        glowSize: '10px',
      };
  }
}

function Headline({
  headline,
  keyColor,
  diameter,
}: {
  headline: HubHeadline;
  keyColor: string;
  diameter: number;
}) {
  const label = Math.max(9, Math.min(13, diameter * 0.085));
  let content;
  if (headline.kind === 'cue') {
    const colors = cueColors(headline.cue, keyColor);
    content = (
      <span
        // A new cue remounts, so it pops in again.
        key={headline.cue}
        data-literacy-cue={headline.cue}
        className="literacy-cue"
        style={
          {
            fontSize: Math.max(12, diameter * CUE_SIZE[headline.cue]),
            '--cue-base': colors.base,
            '--cue-shine': colors.shine,
            '--cue-glow': colors.glow,
            '--cue-glow-size': colors.glowSize,
          } as CSSProperties
        }
      >
        {headline.text}
      </span>
    );
  } else if (headline.kind === 'turn') {
    content = (
      <span
        className="whitespace-nowrap rounded-full font-semibold uppercase leading-none tracking-[0.14em] text-[#101012]"
        style={{
          fontSize: Math.max(10, Math.min(15, diameter * 0.095)),
          backgroundColor: keyColor,
          padding: '0.4em 0.75em',
        }}
      >
        {headline.text}
      </span>
    );
  } else {
    content = (
      <span
        className="whitespace-nowrap font-semibold uppercase leading-none tracking-[0.14em] text-white/70"
        style={{ fontSize: label }}
      >
        {headline.text}
      </span>
    );
  }
  return (
    <p
      aria-live="polite"
      data-literacy-turn
      className="flex items-center justify-center"
      // A fixed box: the degrees under it stay put as the cues change.
      style={{ height: Math.max(label * 2, diameter * HEADLINE_BOX) }}
    >
      {content}
    </p>
  );
}

function Hub({
  call,
  response,
  view,
  running,
  headline,
  keyColor,
  beatsPerBar,
  size,
}: LiteracyCallPanelProps & { size: number }) {
  // The hole in the ring is 38% of the circle (CircleOfFifthsSvg).
  const diameter = size * 0.36;
  const figure = view.phase === 'response' ? response : call;
  const lit = view.hub;
  const digits = Math.max(1, figure.length);
  const degreeSize = Math.max(
    14,
    Math.min(34, diameter / (digits * 1.25 + 0.6)),
  );
  // From GET READY to GO! the degrees are what to copy: brought forward.
  const copying =
    headline.kind === 'cue' &&
    (headline.cue === 'getReady' || headline.cue === 'go');
  const waiting = copying ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.4)';

  return (
    <div
      data-literacy-hub
      data-turn={running ? (view.phase ?? 'idle') : 'idle'}
      data-cue={headline.kind === 'cue' ? headline.cue : undefined}
      className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-[4%] rounded-full bg-[#101012] text-center"
      style={{ width: diameter, height: diameter }}
    >
      <Headline headline={headline} keyColor={keyColor} diameter={diameter} />
      <p
        aria-label={`Scale degrees ${figure.map((n) => degreeLabel(n.degree)).join(' ')}`}
        data-literacy-degrees
        className="flex items-baseline justify-center gap-[0.18em] font-semibold leading-none tabular-nums"
        style={{ fontSize: degreeSize }}
      >
        {figure.map((note, i) => {
          const on =
            lit !== null &&
            lit.index === i &&
            lit.segment === (view.phase === 'response' ? 'response' : 'call');
          return (
            <span key={i} className="flex items-baseline gap-[0.18em]">
              {i > 0 && (
                <span aria-hidden className="text-[0.5em] text-white/25">
                  ·
                </span>
              )}
              <span
                data-degree-lit={on || undefined}
                className="transition-[color,text-shadow,transform] duration-75"
                style={
                  on
                    ? {
                        color: keyColor,
                        textShadow: `0 0 14px ${keyColor}`,
                        transform: 'scale(1.15)',
                      }
                    : { color: running ? waiting : '#e8e8f0' }
                }
              >
                {degreeLabel(note.degree)}
              </span>
            </span>
          );
        })}
      </p>
      <div
        aria-hidden
        data-literacy-beats
        className="flex items-center gap-[7%]"
      >
        {Array.from({ length: beatsPerBar }, (_, beat) => {
          const on = running && view.beat === beat;
          return (
            <span
              key={beat}
              data-beat-lit={on || undefined}
              className="rounded-full transition-[background-color,transform] duration-100"
              style={{
                width: Math.max(5, diameter * 0.055),
                height: Math.max(5, diameter * 0.055),
                backgroundColor: on
                  ? beat === 0
                    ? keyColor
                    : '#e8e8f0'
                  : 'rgba(255,255,255,0.18)',
                transform: on ? 'scale(1.5)' : undefined,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── The words ──────────────────────────────────────────────────────────────

/** A syllable ending in "-" joins the next ("Ma-", "jor" → "Ma-jor"). */
const joinsNext = (text: string) => text.endsWith('-');

/** The words as read: syllables joined into their words ("gon-na"). */
const wordsText = (words: readonly TimedNote[]) =>
  words
    .map((w, i) =>
      i < words.length - 1 && !joinsNext(w.text ?? '') ? `${w.text} ` : w.text,
    )
    .join('');

interface Syllable {
  note: TimedNote;
  i: number;
}

function WordsLine({
  words,
  wordsStart,
  barTicks,
  view,
  running,
  keyColor,
  compact,
}: LiteracyCallPanelProps) {
  // A line a bar; on each, the syllables grouped into their words, so a
  // word never breaks across the line's wrap and reads as one ("gon-na").
  // A pickup, before the words' downbeat, opens the first line.
  const lines: Syllable[][][] = [];
  words.forEach((note, i) => {
    const bar = Math.max(0, Math.floor((note.onset - wordsStart) / barTicks));
    const line = (lines[bar] ??= []);
    const word = line[line.length - 1];
    if (word && joinsNext(word[word.length - 1].note.text ?? '')) {
      word.push({ note, i });
    } else {
      line.push([{ note, i }]);
    }
  });

  return (
    <div
      data-literacy-words
      aria-label={`Words: ${wordsText(words)}`}
      className={cn(
        'flex shrink-0 flex-col gap-1.5',
        compact ? 'min-w-0 flex-1 items-start' : 'items-center',
      )}
    >
      {lines.map((line, l) => (
        <p
          key={l}
          aria-hidden
          className={cn(
            'flex flex-wrap items-end gap-x-[0.3em] gap-y-1 text-[clamp(16px,1.5vw,22px)] leading-none',
            compact ? 'justify-start' : 'justify-center',
          )}
        >
          {line.map((word) => (
            <span key={word[0].i} data-literacy-word className="flex items-end">
              {word.map(({ note, i }, s) => {
                const now = running && view.word === i;
                const sung = running && view.word > i;
                const offRoot = note.degree !== '1';
                return (
                  <span
                    key={i}
                    data-word-index={i}
                    data-word-now={now || undefined}
                    className={cn(
                      'flex flex-col items-center gap-1',
                      // Each syllable keeps its own highlight; the next one
                      // in the word sits flush, over the padding between.
                      s > 0 && '-ml-[0.16em]',
                    )}
                  >
                    <span
                      className="h-[0.6em] text-[0.6em] font-semibold leading-none"
                      style={{ color: offRoot ? keyColor : 'transparent' }}
                    >
                      {offRoot ? degreeLabel(note.degree) : '·'}
                    </span>
                    <span
                      className="rounded px-[0.08em] transition-colors duration-75"
                      style={{
                        color: now
                          ? '#101012'
                          : sung || !running
                            ? '#e8e8f0'
                            : 'rgba(255,255,255,0.4)',
                        backgroundColor: now ? keyColor : 'transparent',
                      }}
                    >
                      {note.text}
                    </span>
                  </span>
                );
              })}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}
