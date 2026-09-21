import { SegmentedControl } from '@/features/classroom/presentation/SegmentedControl';
import {
  CHORD_NOTATION_OPTIONS,
  useChordNotationSwitcher,
} from '@/lib/chordNotation';

/**
 * Hybrid · Jazz · Roman switch for how chord symbols are written, shown in the
 * top rail once the user turns it on in Settings ▸ Look & Feel.
 */
export const ChordNotationSwitcher = ({ size }: { size?: 'sm' | 'lg' }) => {
  const { enabled, notation, setNotation } = useChordNotationSwitcher();
  if (!enabled) return null;
  return (
    <SegmentedControl
      label="Chord notation"
      options={CHORD_NOTATION_OPTIONS}
      value={notation}
      onChange={setNotation}
      size={size}
    />
  );
};

/**
 * Phones get no top rail, so the switch sits in its own slim bar there —
 * only once it's turned on, so nobody else's layout changes.
 */
export const MobileChordNotationBar = () => {
  const { enabled } = useChordNotationSwitcher();
  if (!enabled) return null;
  return (
    <div className="flex flex-shrink-0 items-center justify-end border-b border-white/[0.06] bg-[#101012] px-4 py-1.5 md:hidden">
      <ChordNotationSwitcher size="lg" />
    </div>
  );
};
