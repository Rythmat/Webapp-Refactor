import { SegmentedControl } from '@/features/classroom/presentation/SegmentedControl';
import { PreferenceToggleRow } from '@/features/user/PreferenceToggleRow';
import {
  CHORD_NOTATION_OPTIONS,
  formatProgression,
  useChordNotationSwitcher,
} from '@/lib/chordNotation';
import { SettingsCard } from '../SettingsCard';

// The same 2-5-1 in C, written by the formatter so the example matches the app.
const EXAMPLE = '2 minor7 → 5 dominant7 → 1 major7';
const exampleIn = (notation: 'hybrid' | 'jazz' | 'roman') =>
  notation === 'hybrid'
    ? '2 min7 → 5 dom7 → 1 maj7'
    : formatProgression(EXAMPLE, notation, { keyRootPc: 0, mode: 'ionian' });

/**
 * Settings card for chord symbols: turns on the top-rail notation switcher and
 * shows (and sets) the notation it's on.
 */
export const ChordNotationSettings = () => {
  const { enabled, setEnabled, notation, setNotation } =
    useChordNotationSwitcher();

  return (
    <SettingsCard
      title="Chord symbols"
      description="Chords are written in hybrid numbers (2 min7, 5 dom7). The switcher lets you rewrite every chord symbol in jazz symbols (D−7, G7) or Roman numerals (ii7, V7) from the top bar, and switch back any time."
    >
      <PreferenceToggleRow
        label="Chord notation switcher"
        description="Show a Hybrid · Jazz · Roman switch at the top right of every screen."
        checked={enabled}
        onCheckedChange={setEnabled}
      />
      {enabled && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-col">
            <span className="text-sm text-white">Notation</span>
            <span className="text-xs text-white/50">{exampleIn(notation)}</span>
          </div>
          <SegmentedControl
            label="Chord notation"
            options={CHORD_NOTATION_OPTIONS}
            value={notation}
            onChange={setNotation}
          />
        </div>
      )}
    </SettingsCard>
  );
};
