import { AnatomyLesson } from './AnatomyLesson';
import type { AnatomyOption } from './anatomyTypes';

// Learn → Audio → Bass Anatomy: an electric and an acoustic bass.

const OPTIONS: readonly AnatomyOption[] = [
  { value: 'electricBass', label: 'Electric' },
  { value: 'acousticBass', label: 'Acoustic' },
];

export default function BassAnatomyPage() {
  return (
    <AnatomyLesson instrument="bass" title="Bass Anatomy" options={OPTIONS} />
  );
}
