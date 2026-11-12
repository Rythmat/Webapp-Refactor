import { useParams } from 'react-router-dom';
import {
  listStudioLessonFiles,
  useStudioLessonsVersion,
} from '@/curriculum/engine/studioLessons/registry';
import {
  codeLessonAsFile,
  isCodeLesson,
} from '@/daw/components/Tutorial/lessonFiles';
import { StudioLessonEditor } from './StudioLessonEditor';

/**
 * A Studio lesson's editor: the console's file when there is one, else the
 * code lesson as it ships (its first save makes the file).
 */
export const AdminStudioLessonEditPage = () => {
  const { id = '' } = useParams<{ id: string }>();
  useStudioLessonsVersion();
  const file = listStudioLessonFiles().find((l) => l.id === id);
  const lesson = file ?? codeLessonAsFile(id);

  if (!lesson) {
    return (
      <div className="text-sm text-muted-foreground">
        No Studio lesson with id <span className="tabular-nums">{id}</span>.
      </div>
    );
  }

  // A new id is a different lesson: start its history fresh.
  return (
    <StudioLessonEditor
      key={lesson.id}
      lesson={lesson}
      fromCode={!file}
      replacesCode={isCodeLesson(lesson.id)}
    />
  );
};
