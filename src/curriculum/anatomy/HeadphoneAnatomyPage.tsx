import { AnatomyLesson } from './AnatomyLesson';
import type { AnatomyOption } from './anatomyTypes';

// Learn → Audio → Headphone Anatomy.

const OPTIONS: readonly AnatomyOption[] = [
  { value: 'headphones', label: 'Headphones' },
];

export default function HeadphoneAnatomyPage() {
  return (
    <AnatomyLesson
      instrument="headphones"
      title="Headphone Anatomy"
      options={OPTIONS}
    />
  );
}
