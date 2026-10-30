import { AnatomyLesson } from './AnatomyLesson';
import type { AnatomyOption } from './anatomyTypes';

// Learn → Technique → Synth Anatomy: one instrument, so no choice between two.

const OPTIONS: readonly AnatomyOption[] = [{ value: 'synth', label: 'Synth' }];

export default function SynthAnatomyPage() {
  return (
    <AnatomyLesson instrument="synth" title="Synth Anatomy" options={OPTIONS} />
  );
}
