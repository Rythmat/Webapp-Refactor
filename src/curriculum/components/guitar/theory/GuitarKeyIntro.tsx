import { ChevronDown } from 'lucide-react';
import { memo, useId, useMemo, useState } from 'react';
import { cn } from '@/components/utilities';
import { GUITAR_ATLAS_BOOK_ONE } from '@/curriculum/data/guitar/bookOne';
import { notesFor } from '@/curriculum/data/guitar/theoryNotes';
import type { GuitarKeyName } from '@/curriculum/data/guitar/types';
import { useGuitarDisplaySettings } from '@/features/learn/useGuitarDisplaySettings';
import { ChordFamilyStrip } from './ChordFamilyStrip';

// ── GuitarKeyIntro ─────────────────────────────────────────────────────────
// "About this key", for the lesson header and the key picker: the one note
// this key changes from the one before it (or why C comes first), why the
// keys come in this order, the key's minor partner, and a preview of its
// chord family. Collapsed until asked for.

export interface GuitarKeyIntroProps {
  keyCenter: GuitarKeyName;
  keyColor?: string;
  defaultOpen?: boolean;
  className?: string;
}

export const GuitarKeyIntro = memo(function GuitarKeyIntro({
  keyCenter,
  keyColor = 'var(--color-text, #e8e8f0)',
  defaultOpen = false,
  className,
}: GuitarKeyIntroProps) {
  const [open, setOpen] = useState(defaultOpen);
  const buttonId = useId();
  const regionId = useId();
  const showRomanNumerals = useGuitarDisplaySettings(
    (s) => s.showRomanNumerals,
  );

  const notes = useMemo(() => {
    const all = notesFor('KEY', {
      center: GUITAR_ATLAS_BOOK_ONE[keyCenter],
      settings: { accidentals: 'unicode' },
    });
    return [...all.intro, ...all.info];
  }, [keyCenter]);

  return (
    <div
      data-guitar-key-intro
      className={cn('flex flex-col gap-2 text-left', className)}
      style={{ color: 'var(--color-text, #e8e8f0)' }}
    >
      <button
        id={buttonId}
        type="button"
        aria-expanded={open}
        aria-controls={regionId}
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 self-start rounded-full px-2 py-0.5 text-xs hover:bg-white/10"
        style={{
          border: '1px solid var(--color-border, rgba(255,255,255,0.12))',
        }}
      >
        <ChevronDown
          aria-hidden
          className={cn(
            'h-3.5 w-3.5 motion-safe:transition-transform',
            open ? 'rotate-180' : '',
          )}
        />
        About this key
      </button>
      {open && (
        <section
          id={regionId}
          aria-labelledby={buttonId}
          className="flex flex-col gap-2 rounded-lg p-2.5"
          style={{
            border: '1px solid var(--color-border, rgba(255,255,255,0.12))',
          }}
        >
          <ul className="flex flex-col gap-1.5">
            {notes.map((note) => (
              <li key={note.id} data-key-note={note.id}>
                <h4 className="text-[13px] font-semibold">{note.title}</h4>
                <p
                  className="text-[13px] leading-snug"
                  style={{ color: 'var(--color-text-dim, #b4b4c2)' }}
                >
                  {note.body}
                </p>
              </li>
            ))}
          </ul>
          <ChordFamilyStrip
            keyCenter={keyCenter}
            keyColor={keyColor}
            showRomanNumerals={showRomanNumerals}
          />
        </section>
      )}
    </div>
  );
});
