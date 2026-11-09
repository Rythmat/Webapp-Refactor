import { Loader2 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/components/utilities';
import { FoldableDockColumn } from '@/daw/shell/dock/FoldableDockColumn';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';

// ── A MIDI instrument's sounds (the dock, 2026-10-21) ──────────────────────
//
// The menu at the dock's left that every MIDI instrument shares, after the
// Instruments (General MIDI) one, in two columns (owner): the main
// categories, then the picked category's sounds; a click on a sound plays
// it on the track. The sound playing now is the one marked in the list, so
// no name row sits above the columns: the lists start at the top (owner,
// 2026-10-21). The instrument's own controls fill the rest of the dock (`children`). Each
// instrument keeps its own sounds: Instruments its GM programs, the Synth
// its patches. (The Drums have their own menu, kits then grooves, in
// these columns' look: DrumPadsView.) The track keeps its instrument.
//
// The list opens on the category of the sound playing now, and follows it
// when it changes from elsewhere (undo, a collaborator, a preset menu).

export interface SoundOption {
  id: string;
  label: string;
}

export interface SoundCategory {
  id: string;
  label: string;
  sounds: readonly SoundOption[];
}

export interface SoundBrowserProps {
  /** What is chosen, for the list's name ('Synth patches'). */
  label: string;
  categories: readonly SoundCategory[];
  /** The sound playing now, or null when it isn't one of these. */
  selectedId: string | null;
  onPick(id: string): void;
  /** A sound still loading after a pick: it shows a spinner. */
  loadingId?: string | null;
  /** The lesson anchor on the sounds' list ('drum-kit-selector'). */
  anchor?: string;
  /** The instrument's own controls, beside the menu. */
  children?: ReactNode;
  'data-testid'?: string;
}

/** A column of the menu; the drums' menu (DrumPadsView) shares them. */
export const LIST = 'm-0 min-h-0 list-none overflow-y-auto p-1';

export const ROW = cn(
  TYPE_CLASS.label,
  'flex h-8 w-full items-center gap-2 rounded-[var(--daw-radius-sm)] px-2 text-left',
  TRANSITION,
  FOCUS_RING,
);
export const ROW_ON = 'bg-daw-selected font-bold text-daw-text';
export const ROW_OFF = 'text-daw-text-2 hover:bg-daw-hover hover:text-daw-text';

const categoryOf = (
  categories: readonly SoundCategory[],
  soundId: string | null,
): string | undefined =>
  categories.find((c) => c.sounds.some((s) => s.id === soundId))?.id ??
  categories[0]?.id;

export function SoundBrowser({
  label,
  categories,
  selectedId,
  onPick,
  loadingId = null,
  anchor,
  children,
  'data-testid': testId,
}: SoundBrowserProps) {
  const [category, setCategory] = useState(() =>
    categoryOf(categories, selectedId),
  );
  // Follows the sound playing now, from any source, to its category.
  useEffect(() => {
    setCategory(categoryOf(categories, selectedId));
    // The categories are rebuilt each render; the sound is what moves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const shown = categories.find((c) => c.id === category) ?? categories[0];

  return (
    <div data-testid={testId} className="flex h-full min-h-0 flex-1">
      {/* Folds to a rail for the instrument's room (FoldableDockColumn). */}
      <FoldableDockColumn
        panel="sounds"
        name="Menu"
        width={340}
        testId="sound-browser"
      >
        <div data-ds="v2" className="flex min-h-0 flex-1">
          <ul
            aria-label={`${label}: categories`}
            data-testid="sound-browser-categories"
            className={cn(
              LIST,
              'w-[128px] shrink-0 border-r border-daw-hairline',
            )}
            style={{ scrollbarWidth: 'thin' }}
          >
            {categories.map((c) => {
              const open = c.id === shown?.id;
              // The category of the sound playing now is marked, wherever
              // the student is looking.
              const playing = c.sounds.some((sd) => sd.id === selectedId);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    aria-pressed={open}
                    data-category={c.id}
                    onClick={() => setCategory(c.id)}
                    className={cn(ROW, open ? ROW_ON : ROW_OFF)}
                  >
                    <span className="min-w-0 flex-1 truncate">{c.label}</span>
                    {playing && !open ? (
                      <span
                        aria-hidden
                        className="size-1.5 shrink-0 rounded-full bg-daw-text-2"
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
          <ul
            aria-label={label}
            data-tutorial-id={anchor}
            className={cn(LIST, 'min-w-0 flex-1')}
            style={{ scrollbarWidth: 'thin' }}
          >
            {shown?.sounds.map((sound) => {
              const on = sound.id === selectedId;
              return (
                <li key={sound.id}>
                  <button
                    type="button"
                    aria-current={on || undefined}
                    data-sound={sound.id}
                    onClick={() => onPick(sound.id)}
                    className={cn(ROW, on ? ROW_ON : ROW_OFF)}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {sound.label}
                    </span>
                    {sound.id === loadingId ? (
                      <Loader2
                        aria-label="Loading"
                        className="size-3.5 shrink-0 animate-spin text-daw-text-3 motion-reduce:animate-none"
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </FoldableDockColumn>
      <div className="relative min-w-0 flex-1">{children}</div>
    </div>
  );
}
