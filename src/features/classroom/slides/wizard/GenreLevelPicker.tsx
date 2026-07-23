/**
 * Genre × level picker for the deck wizard's "Genre Lesson" source. 14 genres,
 * L1/L2/L3 chips; locked levels are disabled (students would hit a paywall).
 * Selecting a chip triggers the async ActivityFlow fetch (spinner on the chip).
 */
import { Loader2, Lock } from 'lucide-react';
import { useMemo } from 'react';
import {
  CURRICULUM_GENRE_IDS,
  CURRICULUM_GENRE_SLUGS,
} from '@/curriculum/bridge/genreIdMap';
import { getGenreProfile } from '@/curriculum/data/genreProfiles';
import type { GCMKey } from '@/curriculum/types/curriculum';

const LEVELS = [1, 2, 3] as const;

export interface GenreLevelPickerProps {
  selected: GCMKey | null;
  loading: boolean;
  onSelect: (gcmKey: GCMKey) => void;
}

export const GenreLevelPicker = ({
  selected,
  loading,
  onSelect,
}: GenreLevelPickerProps) => {
  const rows = useMemo(
    () =>
      CURRICULUM_GENRE_IDS.map((id) => ({
        id,
        profile: getGenreProfile(CURRICULUM_GENRE_SLUGS[id]),
      })),
    [],
  );

  return (
    <div className="flex max-h-[420px] flex-col gap-1 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.02] p-3">
      {rows.map(({ id, profile }) => (
        <div
          key={id}
          className="flex items-center justify-between gap-3 rounded-xl px-2 py-1.5"
        >
          <span className="inline-flex items-center gap-2 text-sm text-white/85">
            <span
              className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ backgroundColor: profile?.accentColor ?? '#7ecfcf' }}
            />
            {profile?.displayName ?? id}
          </span>
          <div className="flex items-center gap-1.5">
            {LEVELS.map((n) => {
              const key = `${id}:L${n}` as GCMKey;
              const locked = profile?.levels[n]?.locked ?? false;
              const isSelected = selected === key;
              return (
                <button
                  key={n}
                  type="button"
                  disabled={locked}
                  onClick={() => onSelect(key)}
                  title={locked ? 'Locked — premium level' : undefined}
                  className={
                    'inline-flex h-7 w-9 items-center justify-center rounded-lg text-xs transition-colors ' +
                    (locked
                      ? 'cursor-not-allowed border border-white/[0.06] text-white/25'
                      : isSelected
                        ? 'bg-[#7ecfcf] text-black'
                        : 'border border-white/10 text-white/70 hover:border-white/25 hover:text-white')
                  }
                >
                  {locked ? (
                    <Lock className="h-3 w-3" />
                  ) : isSelected && loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    `L${n}`
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
