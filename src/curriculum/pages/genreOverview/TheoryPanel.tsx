import { Play } from 'lucide-react';
import { useMemo } from 'react';
import { PianoKeyboard } from '@/components/PianoKeyboard';
import { formatScaleDegrees } from '@/components/learn/modeHelpers';
import {
  PROMPT_FRAME,
  PROMPT_PILL,
  PROMPT_PILL_OFF,
  PROMPT_PILL_ON,
  PROMPT_WASH,
  PromptPillButton,
} from '@/components/promptBox/PromptBoxParts';
import { cn } from '@/components/utilities';
import type {
  GenreLevelProfile,
  VoicingRef,
} from '@/curriculum/types/genreProfile';
import {
  EYEBROW,
  midisToEvents,
  playChord,
  ScaledPiano,
  scaleColor,
  type ShownScale,
} from './genreOverviewShared';

/** One of the level's chords: its name, its keys, a button to hear it. */
function VoicingCard({
  voicing,
  color,
  startC,
  endC,
}: {
  voicing: VoicingRef;
  color: string;
  startC: number;
  endC: number;
}) {
  const events = useMemo(
    () => midisToEvents(voicing.midis, `voicing-${voicing.symbol}`),
    [voicing],
  );
  return (
    <div className={cn(PROMPT_FRAME, PROMPT_WASH, 'flex flex-col gap-3 p-4')}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-base text-[#e8e8f0]">{voicing.label}</p>
        <button
          type="button"
          onClick={() => void playChord(voicing.midis)}
          aria-label={`Play ${voicing.label}`}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-white/70 outline-none transition-colors duration-150 hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <Play aria-hidden className="size-4" fill="currentColor" />
        </button>
      </div>
      <ScaledPiano pointerEventsNone>
        <PianoKeyboard
          activeWhiteKeyColor={color}
          activeBlackKeyColor={color}
          enableClick={false}
          startC={startC}
          endC={endC}
          playingNotes={events}
          useContextNotes={false}
        />
      </ScaledPiano>
      <p className="text-sm leading-6 text-white/55">{voicing.description}</p>
    </div>
  );
}

/**
 * The level's key and scales (lit on the lesson's keyboard, on its bar) and
 * its chords, each on its own small keyboard.
 */
export function TheoryPanel({
  level,
  scales,
  scaleAt,
  onScaleAt,
  onPlayScale,
  keyColor,
  onStart,
}: {
  level: GenreLevelProfile;
  scales: ShownScale[];
  scaleAt: number;
  onScaleAt: (index: number) => void;
  onPlayScale: () => void;
  keyColor: string;
  /** The level's way in (its `entryLabel`, "Start Level 1"): its first section. */
  onStart: () => void;
}) {
  const scale = scales[scaleAt] ?? scales[0];
  const keyLetter = level.keyCenter.split(' ')[0];

  // One range for every chord card: all their notes, an octave either side.
  const { startC, endC } = useMemo(() => {
    const all = level.primaryVoicings.flatMap((v) => v.midis);
    if (all.length === 0) return { startC: 3, endC: 6 };
    const lo = Math.floor(Math.min(...all) / 12);
    const hi = Math.floor(Math.max(...all) / 12);
    return { startC: Math.max(0, lo - 1), endC: hi + 2 };
  }, [level]);

  return (
    <div data-genre-overview-panel="theory" className="flex flex-col gap-4">
      <section
        className={cn(PROMPT_FRAME, PROMPT_WASH, 'flex flex-col gap-2 p-5')}
      >
        <h3 className={EYEBROW}>Key &amp; Scale</h3>
        {scales.length > 1 && (
          <div
            role="group"
            aria-label="Scales"
            className="flex flex-wrap gap-2 pb-1"
          >
            {scales.map((sc, i) => (
              <button
                key={sc.name}
                type="button"
                aria-pressed={i === scaleAt}
                onClick={() => onScaleAt(i)}
                className={cn(
                  PROMPT_PILL,
                  'max-[639px]:h-11',
                  i === scaleAt ? PROMPT_PILL_ON : PROMPT_PILL_OFF,
                )}
              >
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ background: scaleColor(level, sc.scaleId) }}
                />
                {keyLetter} {sc.name}
              </button>
            ))}
          </div>
        )}
        <p className="text-lg leading-7 text-white">
          {level.scales
            ? `${keyLetter} ${scale.name}`
            : `${keyLetter} ${level.mode}`}
        </p>
        <p className="text-[15px] leading-6 text-white/70">
          The notes of the scale are: {scale.notes.join(', ')}
        </p>
        <p className="text-[15px] leading-6 text-white/70">
          Scale degrees: {formatScaleDegrees(scale.intervals).join(', ')}
        </p>
        <p className="text-[15px] leading-6 text-white/55">
          {level.tempoRange}
        </p>
        <PromptPillButton
          variant="primary"
          onClick={onPlayScale}
          className="mt-2 gap-2 self-start"
        >
          <Play size={14} fill="currentColor" /> Play Scale
        </PromptPillButton>
      </section>

      {level.primaryVoicings.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className={EYEBROW}>Key Voicings</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {level.primaryVoicings.map((v) => (
              <VoicingCard
                key={v.label}
                voicing={v}
                color={v.scaleId ? scaleColor(level, v.scaleId) : keyColor}
                startC={startC}
                endC={endC}
              />
            ))}
          </div>
        </section>
      )}

      <PromptPillButton
        variant="outline"
        onClick={onStart}
        className="h-10 self-start px-5 text-sm"
      >
        {level.entryLabel}
      </PromptPillButton>
    </div>
  );
}
