import { AnatomyLesson } from './AnatomyLesson';
import type { AnatomyOption } from './anatomyTypes';

// Learn → Technique → Piano Anatomy: a grand and an upright. The labels are the
// instruments' full names; the URL takes the short word.

const OPTIONS: readonly AnatomyOption[] = [
  { value: 'grandPiano', label: 'Grand Piano', param: 'grand' },
  { value: 'uprightPiano', label: 'Upright Piano', param: 'upright' },
];

export default function PianoAnatomyPage() {
  return (
    <AnatomyLesson instrument="piano" title="Piano Anatomy" options={OPTIONS} />
  );
}
