import { type FC } from 'react';
import { normalizeSongMode } from '@/components/common/CircleOfFifthsSvg';
import { KeyWheel } from '@/components/common/KeyWheel';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { semitonesToTonic } from '@/curriculum/songLibrary/transpose';
import type { Song } from '@/curriculum/types/songLibrary';

/**
 * The song's key, and the wheel that changes it.
 *
 * The Studio's wheel picks a key AND a mode; a song's mode is a fact about
 * the song, so here it is a label rather than a menu. Choosing a key only
 * moves the whole chart to a new tonic — including a song that changes key
 * partway, whose keys move together and keep their distances.
 */

export interface TransposeKeyButtonProps {
  /** The published song, always in its own key. */
  song: Song;
  /** The chart as it is being shown. */
  displaySong: Song;
  semitones: number;
  onChange: (semitones: number) => void;
  color: [number, number, number];
}

/** The mode words of a key label: 'G major' → 'major', 'B♭ blues' → 'blues'. */
const modeWords = (key: string): string =>
  key.replace(/^[A-G](?:♯|♭)?\s*/, '').trim();

export const TransposeKeyButton: FC<TransposeKeyButtonProps> = ({
  song,
  displaySong,
  semitones,
  onChange,
  color,
}) => {
  const [r, g, b] = color;
  const transposed = semitones !== 0;
  const label = modeWords(song.key) || 'major';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-1.5 py-0.5 transition-colors hover:bg-white/10"
          title="Transpose"
          aria-label={`Key of ${displaySong.key}. Transpose`}
        >
          <span
            aria-hidden
            className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
            style={{
              background: `rgb(${r},${g},${b})`,
              boxShadow: `0 0 6px rgba(${r},${g},${b},0.6)`,
            }}
          />
          <span className="text-white/90">Key of {displaySong.key}</span>
          {transposed && (
            <span className="rounded-full bg-white/10 px-1.5 text-xs text-white/70">
              {semitones > 6
                ? semitones - 12
                : semitones > 0
                  ? `+${semitones}`
                  : semitones}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        // Without this the first wedge takes focus on open and wears a focus
        // ring, which reads as a second selected key.
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="w-auto rounded-xl border-0 p-4"
        style={{
          background: 'var(--color-surface-2)',
          border: '1px solid var(--glass-border)',
          backdropFilter: 'blur(24px)',
        }}
      >
        <KeyWheel
          selectedPc={((displaySong.keyRoot % 12) + 12) % 12}
          mode={normalizeSongMode(song.mode)}
          onSelectPc={(pc) => onChange(semitonesToTonic(song, pc))}
          ariaLabel="Choose a key"
          footer={
            <span
              className="text-[10px] font-medium capitalize"
              style={{ color: 'var(--color-text-dim)' }}
              title={`${displaySong.key} — the mode stays as written`}
            >
              {label}
            </span>
          }
        />
        {transposed && (
          <div className="mt-3 flex flex-col items-center gap-1">
            <p className="text-[11px] text-white/45">
              Recording sounds in {song.key}
            </p>
            <button
              type="button"
              onClick={() => onChange(0)}
              className="text-[11px] text-white/70 underline-offset-2 hover:underline"
            >
              Reset to {song.key}
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
