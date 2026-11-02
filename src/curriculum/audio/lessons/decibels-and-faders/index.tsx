import { audioModule } from '../../catalog';
import { LessonPlayer } from '../../player/LessonPlayer';
import { DecibelsStage } from './Stage';
import { DECIBELS_SCRIPT } from './script';

export default function DecibelsAndFadersLesson() {
  const module = audioModule('sound-basics');
  if (!module) return null;
  return (
    <LessonPlayer
      script={DECIBELS_SCRIPT}
      Stage={DecibelsStage}
      module={module}
      lessonId={DECIBELS_SCRIPT.id}
      ratio={[4, 5]}
    />
  );
}
