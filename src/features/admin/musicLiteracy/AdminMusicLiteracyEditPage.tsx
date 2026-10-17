import { useParams } from 'react-router-dom';
import { MusicLiteracyEditor } from './MusicLiteracyEditor';
import { useLiteracyList } from './literacySession';

export const AdminMusicLiteracyEditPage = () => {
  const { id = '' } = useParams<{ id: string }>();
  const lesson = useLiteracyList().find((l) => l.id === id);

  if (!lesson) {
    return (
      <div className="text-sm text-muted-foreground">
        No Music Literacy lesson with id{' '}
        <span className="tabular-nums">{id}</span>.
      </div>
    );
  }

  // A new id is a different lesson: start its history fresh.
  return <MusicLiteracyEditor key={lesson.id} lesson={lesson} />;
};
