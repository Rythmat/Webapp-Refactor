import { AnatomyLesson } from './AnatomyLesson';
import type { AnatomyOption } from './anatomyTypes';

// Learn → Audio → Combo Amp Anatomy. Same
// cabinet and speaker, two ways of making the signal bigger.

const OPTIONS: readonly AnatomyOption[] = [
  { value: 'tubeAmp', label: 'Tube Amp', param: 'tube' },
  { value: 'solidStateAmp', label: 'Solid State Amp', param: 'solid-state' },
];

export default function ComboAmpAnatomyPage() {
  return (
    <AnatomyLesson
      instrument="comboAmp"
      title="Combo Amp Anatomy"
      options={OPTIONS}
    />
  );
}
