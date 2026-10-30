import { AnatomyLesson } from './AnatomyLesson';
import type { AnatomyOption } from './anatomyTypes';

// Learn → Technique → Keyboard Anatomy: one instrument, so no choice between two.

const OPTIONS: readonly AnatomyOption[] = [
  { value: 'keyboard', label: 'Keyboard' },
];

export default function KeyboardAnatomyPage() {
  return (
    <AnatomyLesson
      instrument="keyboard"
      title="Keyboard Anatomy"
      options={OPTIONS}
    />
  );
}
