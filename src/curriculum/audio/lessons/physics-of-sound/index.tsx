import { audioModule } from '../../catalog';
import { LessonPlayer } from '../../player/LessonPlayer';
import { PhysicsStage } from './Stage';
import { PHYSICS_SCRIPT } from './script';

export default function PhysicsOfSoundLesson() {
  const module = audioModule('sound-basics');
  if (!module) return null;
  return (
    <LessonPlayer
      script={PHYSICS_SCRIPT}
      Stage={PhysicsStage}
      module={module}
      lessonId={PHYSICS_SCRIPT.id}
      ratio={[2, 3]}
    />
  );
}
