import { ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { memo, useId, useMemo, useState } from 'react';
import { cn } from '@/components/utilities';
import {
  GUITAR_ATLAS_BOOK_ONE,
  keyScaleSpelling,
} from '@/curriculum/data/guitar/bookOne';
import { notesFor } from '@/curriculum/data/guitar/theoryNotes';
import type { GuitarKeyName } from '@/curriculum/data/guitar/types';
import type { ActivityFlowV2 } from '@/curriculum/types/activity.v2';
import { useGuitarDisplaySettings } from '@/features/learn/useGuitarDisplaySettings';
import { ChordFamilyStrip } from './ChordFamilyStrip';
import {
  displayText,
  familyChips,
  noteSeenId,
  sectionBCardBarreCare,
  sectionBCardSeenId,
} from './theoryUi';

// ── GuitarSectionBCard ─────────────────────────────────────────────────────
// Shown once per key as Section B begins: chords come from the scale (skip a
// note, take the next), the key's chord family 1-7, the pattern every major
// key shares, and where chord 7 went. When the key's barre shapes start on
// Section B's first step, the hand-care note comes with it (and counts as
// seen, so the step panel does not show it again). The skip/take highlight
// moves only when the student steps it, so it is static under
// prefers-reduced-motion as everywhere else.

export interface GuitarSectionBCardProps {
  flow: ActivityFlowV2;
  keyCenter: GuitarKeyName;
  keyColor: string;
  /** Called after the card marks itself seen for this key. */
  onClose: () => void;
  className?: string;
}

const SETTINGS = { accidentals: 'unicode' as const };
/** Two octaves' worth of the row: enough for the triad on 7 (7, 2, 4). */
const ROW_LENGTH = 11;

function SkipTakeRow({
  keyCenter,
  keyColor,
}: {
  keyCenter: GuitarKeyName;
  keyColor: string;
}) {
  // 0-based degree the triad is built on.
  const [start, setStart] = useState(0);
  const names = useMemo(
    () => keyScaleSpelling(keyCenter).map(displayText),
    [keyCenter],
  );
  const chips = useMemo(() => familyChips(keyCenter), [keyCenter]);
  const cells = Array.from({ length: ROW_LENGTH }, (_, i) => {
    const offset = i - start;
    const inTriad = offset >= 0 && offset <= 4;
    return {
      i,
      name: names[i % 7],
      degree: (i % 7) + 1,
      role: !inTriad ? null : offset % 2 === 0 ? 'take' : 'skip',
    } as const;
  });
  const taken = cells.filter((c) => c.role === 'take');
  const chip = chips[start];

  return (
    <div data-skip-take className="flex flex-col gap-1.5">
      <ol aria-label="Scale notes" className="flex flex-wrap gap-1">
        {cells.map((cell) => (
          <li
            key={cell.i}
            data-role={cell.role ?? 'none'}
            className={cn(
              'flex w-9 flex-col items-center rounded-md py-0.5 leading-tight motion-safe:transition-colors',
              cell.role === 'skip' && 'opacity-60',
              cell.role === null && 'opacity-40',
            )}
            style={{
              border:
                cell.role === 'take'
                  ? `2px solid ${keyColor}`
                  : cell.role === 'skip'
                    ? '1px dashed var(--color-border, rgba(255,255,255,0.25))'
                    : '1px solid transparent',
            }}
          >
            <span className="text-[13px] font-semibold">{cell.name}</span>
            <span
              className="text-[10px]"
              style={{ color: 'var(--color-text-dim, #9a9aab)' }}
            >
              {cell.degree}
            </span>
            {/* Taken and skipped notes are named, not just coloured. */}
            <span className="h-3 text-[9px] uppercase tracking-wide">
              {cell.role ?? ''}
            </span>
          </li>
        ))}
      </ol>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Previous chord"
          disabled={start === 0}
          onClick={() => setStart(start - 1)}
          className="rounded-full p-1 hover:bg-white/10 disabled:opacity-30"
          style={{
            border: '1px solid var(--color-border, rgba(255,255,255,0.12))',
          }}
        >
          <ChevronLeft aria-hidden className="h-3.5 w-3.5" />
        </button>
        <p data-skip-take-result aria-live="polite" className="text-[13px]">
          <span className="font-semibold">Chord {chip.degree}:</span>{' '}
          {taken.map((c) => c.name).join(' ')}{' '}
          <span style={{ color: 'var(--color-text-dim, #9a9aab)' }}>
            = {chip.symbol} ({chip.hybrid})
          </span>
        </p>
        <button
          type="button"
          aria-label="Next chord"
          disabled={start === 6}
          onClick={() => setStart(start + 1)}
          className="rounded-full p-1 hover:bg-white/10 disabled:opacity-30"
          style={{
            border: '1px solid var(--color-border, rgba(255,255,255,0.12))',
          }}
        >
          <ChevronRight aria-hidden className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export const GuitarSectionBCard = memo(function GuitarSectionBCard({
  flow,
  keyCenter,
  keyColor,
  onClose,
  className,
}: GuitarSectionBCardProps) {
  const titleId = useId();
  const laterId = useId();
  const [showLater, setShowLater] = useState(false);
  const dismissNote = useGuitarDisplaySettings((s) => s.dismissNote);
  const showRomanNumerals = useGuitarDisplaySettings(
    (s) => s.showRomanNumerals,
  );

  const { intro, info, barreCare } = useMemo(() => {
    const notes = notesFor('B', {
      center: GUITAR_ATLAS_BOOK_ONE[keyCenter],
      settings: SETTINGS,
    });
    return {
      intro: notes.intro,
      info: notes.info,
      barreCare: sectionBCardBarreCare(flow, keyCenter),
    };
  }, [flow, keyCenter]);

  const fromScale = intro.find((n) => n.id === 'b.fromScale');
  const pattern = intro.find((n) => n.id === 'b.pattern');
  const sevenLater = info.find((n) => n.id === 'b.sevenLater');

  const close = () => {
    dismissNote(sectionBCardSeenId(keyCenter));
    // Read here: the step panel keeps it as a "Why?" link from now on.
    if (barreCare) dismissNote(noteSeenId(barreCare.id, keyCenter));
    onClose();
  };

  return (
    <section
      data-guitar-section-b-card
      aria-labelledby={titleId}
      className={cn('flex flex-col gap-3 rounded-xl p-4 text-left', className)}
      style={{
        border: `1px solid ${keyColor}`,
        background: 'var(--color-surface, rgba(255,255,255,0.04))',
        color: 'var(--color-text, #e8e8f0)',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 id={titleId} className="text-base font-semibold">
          {fromScale?.title}
        </h3>
        <button
          type="button"
          aria-label="Close"
          onClick={close}
          className="rounded-full p-1 hover:bg-white/10"
        >
          <X aria-hidden className="h-4 w-4" />
        </button>
      </div>
      {fromScale && (
        <p className="text-[13px] leading-snug">{fromScale.body}</p>
      )}
      <SkipTakeRow keyCenter={keyCenter} keyColor={keyColor} />

      <ChordFamilyStrip
        keyCenter={keyCenter}
        keyColor={keyColor}
        showRomanNumerals={showRomanNumerals}
      />

      {pattern && (
        <div>
          <h4 className="text-[13px] font-semibold">{pattern.title}</h4>
          <p
            className="text-[13px] leading-snug"
            style={{ color: 'var(--color-text-dim, #b4b4c2)' }}
          >
            {pattern.body}
          </p>
        </div>
      )}

      {sevenLater && (
        <div>
          <button
            type="button"
            aria-expanded={showLater}
            aria-controls={laterId}
            onClick={() => setShowLater(!showLater)}
            className="inline-flex items-center gap-1 text-[13px] font-medium hover:underline"
          >
            <ChevronDown
              aria-hidden
              className={cn(
                'h-3.5 w-3.5 motion-safe:transition-transform',
                showLater ? 'rotate-0' : '-rotate-90',
              )}
            />
            {sevenLater.title}
          </button>
          {showLater && (
            <p
              id={laterId}
              className="pl-5 text-[13px] leading-snug"
              style={{ color: 'var(--color-text-dim, #b4b4c2)' }}
            >
              {sevenLater.body}
            </p>
          )}
        </div>
      )}

      {barreCare && (
        <div
          data-theory-note={barreCare.id}
          className="rounded-lg py-1.5 pl-3 pr-2"
          style={{
            borderLeft: `3px solid ${keyColor}`,
            background: 'rgba(255,255,255,0.04)',
          }}
        >
          <h4 className="text-[13px] font-semibold">{barreCare.title}</h4>
          <p
            className="text-[13px] leading-snug"
            style={{ color: 'var(--color-text-dim, #b4b4c2)' }}
          >
            {barreCare.body}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={close}
        className="self-end rounded-full px-3 py-1 text-xs font-medium hover:bg-white/10"
        style={{ border: `1px solid ${keyColor}` }}
      >
        Got it
      </button>
    </section>
  );
});
