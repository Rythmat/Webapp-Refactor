import { Eraser, MoreHorizontal, Sparkles } from 'lucide-react';
import { memo } from 'react';
import { cn } from '@/components/utilities';
import { hintText } from '@/daw/shell/help/hintSource';
import { useStore } from '@/daw/store';
import { withTransaction } from '@/daw/store/history';
import type { ChordRecordMode } from '@/daw/store/prismSlice';
import {
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from '@/daw/ui/Menu';
import { FOCUS_RING, TRANSITION } from '@/daw/ui/styles';
import { CHORD_LANE_PX } from './rowLayout';

// ── The chord ruler's settings (owner, 2026-10-21) ─────────────────────────
//
// In the track column, level with the chord ruler (the chord lane), under
// Now Playing: one ⋯, centred (owner: no 'Chords' or 'Auto' text there).
// Its menu holds
// - Auto chords: chords go on the ruler as the student records (a MIDI
//   take's as it plays and when it ends, an audio take's when it ends);
// - analyze the whole song now, clear the ruler, how chords read (numbers
//   or names), and what recording does to chords already there (replace
//   them, merge with them, or keep them).

/** What recording does to the chords already on the ruler. */
const RECORD_MODES: readonly {
  value: ChordRecordMode;
  label: string;
  about: string;
}[] = [
  {
    value: 'replace',
    label: 'Replace',
    about: 'New chords write over the ones there',
  },
  {
    value: 'merge',
    label: 'Merge',
    about: 'New notes join the chords there',
  },
  {
    value: 'locked',
    label: 'Keep',
    about: 'Chords there stay; only gaps fill',
  },
];

/** Analyze every track's notes and put the chords on the ruler: one step. */
export function analyzeSongChords(): void {
  withTransaction('Analyze chords', () => {
    const s = useStore.getState();
    s.analyzeChords();
    useStore.getState().applyChordSymbols();
  });
}

export const ChordRulerSettings = memo(function ChordRulerSettings() {
  const auto = useStore((s) => s.chordAutoAnalyze);
  const setAuto = useStore((s) => s.setChordAutoAnalyze);
  const showNotes = useStore((s) => s.chordRulerShowNotes);
  const recordMode = useStore((s) => s.chordRecordMode);
  const hasChords = useStore((s) => s.chordRegions.length > 0);

  return (
    <div
      data-testid="chord-ruler-settings"
      className="flex items-center justify-center border-b border-daw-hairline"
      style={{ height: CHORD_LANE_PX }}
    >
      <Menu>
        <MenuTrigger asChild>
          <button
            type="button"
            aria-label="Chord ruler settings"
            data-testid="chord-ruler-menu-button"
            data-hint={hintText(
              'Chord ruler settings',
              'Auto chords, analyze the song, clear the chords, and how chords read',
            )}
            className={cn(
              'flex size-6 items-center justify-center rounded-[var(--daw-radius-sm)] text-daw-pill-text hover:text-daw-text [&_svg]:size-3.5',
              TRANSITION,
              FOCUS_RING,
            )}
          >
            <MoreHorizontal aria-hidden />
          </button>
        </MenuTrigger>
        <MenuContent
          align="center"
          data-ds="v2"
          data-testid="chord-ruler-menu"
          className="w-64"
        >
          <MenuCheckboxItem
            checked={auto}
            data-item="auto"
            description="Chords go on the ruler as you record"
            onCheckedChange={(on) => setAuto(on === true)}
          >
            Auto chords
          </MenuCheckboxItem>
          <MenuSeparator />
          <MenuItem
            icon={<Sparkles aria-hidden />}
            data-item="analyze"
            description="Read every track’s notes and write their chords"
            onSelect={analyzeSongChords}
          >
            Analyze the song now
          </MenuItem>
          <MenuItem
            icon={<Eraser aria-hidden />}
            data-item="clear"
            danger
            disabled={!hasChords}
            onSelect={() =>
              withTransaction('Clear chords', () =>
                useStore.getState().setChordRegions([], true),
              )
            }
          >
            Clear the chord ruler
          </MenuItem>
          <MenuSeparator />
          <MenuRadioGroup
            label="Chords read as"
            value={showNotes ? 'names' : 'numbers'}
            onValueChange={(v) => {
              if ((v === 'names') !== showNotes) {
                useStore.getState().toggleChordRulerLabels();
              }
            }}
          >
            <MenuRadioItem value="numbers">Numbers (2 min7)</MenuRadioItem>
            <MenuRadioItem value="names">Names (D min7)</MenuRadioItem>
          </MenuRadioGroup>
          <MenuSeparator />
          <MenuRadioGroup
            label="Recording over chords"
            value={recordMode}
            onValueChange={(v) =>
              useStore.getState().setChordRecordMode(v as ChordRecordMode)
            }
          >
            {RECORD_MODES.map((m) => (
              <MenuRadioItem
                key={m.value}
                value={m.value}
                description={m.about}
              >
                {m.label}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </MenuContent>
      </Menu>
    </div>
  );
});
