import { SegmentedControl } from '@/curriculum/guitar/layout/settingsControls';
import {
  useGuitarDisplaySettings,
  type ChordBoxLabelMode,
} from '@/features/learn/useGuitarDisplaySettings';

const OPTIONS = [
  { value: 'fingers', label: 'Fingers' },
  { value: 'chordTones', label: 'Chord tones' },
] as const;

/** Fingers or chord tones on the chord boxes: the guitar display setting. */
export function GuitarLabelToggle({ className }: { className?: string }) {
  const mode = useGuitarDisplaySettings((s) => s.chordBoxLabels);
  const setMode = useGuitarDisplaySettings((s) => s.setChordBoxLabels);
  return (
    <SegmentedControl<ChordBoxLabelMode>
      options={OPTIONS}
      value={mode}
      onChange={setMode}
      label="Chord box labels"
      className={className}
    />
  );
}
