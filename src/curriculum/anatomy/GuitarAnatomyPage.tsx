import { AnatomyLesson } from './AnatomyLesson';
import type { AnatomyOption } from './anatomyTypes';

// Learn → Technique → Guitar Anatomy: an electric and an acoustic guitar.

const OPTIONS: readonly AnatomyOption[] = [
  { value: 'electric', label: 'Electric' },
  { value: 'acoustic', label: 'Acoustic' },
];

export default function GuitarAnatomyPage() {
  return (
    <AnatomyLesson
      instrument="guitar"
      title="Guitar Anatomy"
      options={OPTIONS}
    />
  );
}
