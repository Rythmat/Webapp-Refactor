import { Navigate, useSearchParams } from 'react-router-dom';
import { audioModule } from '../../catalog';
import { LessonPlayer } from '../../player/LessonPlayer';
import { PathStage } from './Stage';
import { PATH_SCRIPT, screenForTopic } from './script';

export default function MicToSpeakerLesson() {
  const [params] = useSearchParams();
  const module = audioModule('signal-path');
  // A link from when this was a lab opens the screen that took its topic's place.
  const topic = params.get('topic');
  if (topic != null) {
    const screen = screenForTopic(topic);
    return (
      <Navigate replace to={{ search: screen ? `?screen=${screen}` : '' }} />
    );
  }
  if (!module) return null;
  return (
    <LessonPlayer
      script={PATH_SCRIPT}
      Stage={PathStage}
      module={module}
      lessonId={PATH_SCRIPT.id}
      ratio={[7, 10]}
    />
  );
}
