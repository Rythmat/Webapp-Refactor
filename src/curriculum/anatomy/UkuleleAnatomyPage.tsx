import { AnatomyLesson } from './AnatomyLesson';
import type { AnatomyOption } from './anatomyTypes';

// Learn → Technique → Ukulele Anatomy: one instrument, so no choice between two.

const OPTIONS: readonly AnatomyOption[] = [
  { value: 'ukulele', label: 'Concert' },
];

export default function UkuleleAnatomyPage() {
  return (
    <AnatomyLesson
      instrument="ukulele"
      title="Ukulele Anatomy"
      options={OPTIONS}
    />
  );
}
