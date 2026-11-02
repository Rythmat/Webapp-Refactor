import { LearnRoutes } from '@/constants/routes';
import { AnatomyLesson } from './AnatomyLesson';
import type { AnatomyOption } from './anatomyTypes';

// Learn → Audio → Microphone Anatomy.

const OPTIONS: readonly AnatomyOption[] = [
  { value: 'microphone', label: 'Microphone' },
];

export default function MicrophoneAnatomyPage() {
  return (
    <AnatomyLesson
      instrument="microphone"
      title="Microphone Anatomy"
      options={OPTIONS}
      back={{
        label: 'The Signal Path',
        to: LearnRoutes.audioCourse({ module: 'signal-path' }),
      }}
    />
  );
}
