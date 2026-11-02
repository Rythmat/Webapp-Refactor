import { audioModule } from '../../catalog';
import { LessonPlayer } from '../../player/LessonPlayer';
import { GainStage } from './Stage';
import { GAIN_SCRIPT } from './script';

export default function GainStagingLesson() {
  const module = audioModule('signal-path');
  if (!module) return null;
  return (
    <LessonPlayer
      script={GAIN_SCRIPT}
      Stage={GainStage}
      module={module}
      lessonId={GAIN_SCRIPT.id}
      ratio={[5, 6]}
    />
  );
}
