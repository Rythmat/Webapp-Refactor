import { CurriculumRoutes } from '@/constants/routes';
import { LessonPlayer } from '@/curriculum/audio/player/LessonPlayer';
import { FUNDAMENTALS_COURSE, fundamentalsLessonKey } from '../../course';
import { PianoStage } from './Stage';
import { MEET_SCRIPT } from './script';

export default function MeetYourInstrumentLesson() {
  return (
    <LessonPlayer
      script={MEET_SCRIPT}
      Stage={PianoStage}
      home={{
        accentKey: FUNDAMENTALS_COURSE.accentKey,
        href: CurriculumRoutes.pianoFundamentals(),
        lessonKey: fundamentalsLessonKey(MEET_SCRIPT.id),
      }}
      lessonId={MEET_SCRIPT.id}
      ratio={[1, 2]}
      dock
    />
  );
}
