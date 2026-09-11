import { SegmentedControl } from '@/features/classroom/presentation/SegmentedControl';
import {
  CHORD_NOTATION_OPTIONS,
  useChordNotationSwitcher,
} from '@/lib/chordNotation';

/**
 * Hybrid · Jazz · Roman switch for how chord symbols are written, shown in the
 * top rail once the user turns it on in Settings ▸ Look & Feel.
 */
export const ChordNotationSwitcher = () => {
  const { enabled, notation, setNotation } = useChordNotationSwitcher();
  if (!enabled) return null;
  return (
    <SegmentedControl
      label="Chord notation"
      options={CHORD_NOTATION_OPTIONS}
      value={notation}
      onChange={setNotation}
    />
  );
};
