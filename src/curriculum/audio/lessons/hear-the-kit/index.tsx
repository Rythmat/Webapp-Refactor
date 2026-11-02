import { audioModule } from '../../catalog';
import { LessonPlayer } from '../../player/LessonPlayer';
import { KitStage } from './Stage';
import { KIT_SCRIPT } from './script';

export default function HearTheKitLesson() {
  const module = audioModule('sound-basics');
  if (!module) return null;
  return (
    <LessonPlayer
      script={KIT_SCRIPT}
      Stage={KitStage}
      module={module}
      lessonId={KIT_SCRIPT.id}
      ratio={[3, 4]}
    />
  );
}
