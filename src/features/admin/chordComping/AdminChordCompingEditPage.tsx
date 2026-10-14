import { useNavigate, useParams } from 'react-router-dom';
import { AdminRoutes } from '@/constants/routes';
import { createComping } from './AdminChordCompingsPage';
import { ChordCompingEditor } from './ChordCompingEditor';
import { useCompingList } from './compingSession';

export const AdminChordCompingEditPage = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const patterns = useCompingList();
  const pattern = patterns.find((c) => c.id === id);

  if (!pattern) {
    return (
      <div className="text-sm text-muted-foreground">
        No comping pattern with id <span className="tabular-nums">{id}</span>.
      </div>
    );
  }

  return (
    <ChordCompingEditor
      // A new id is a different pattern: start its history fresh.
      key={pattern.id}
      pattern={pattern}
      onDuplicate={async (source) => {
        const copy = await createComping(
          `${source.name} copy`,
          patterns,
          source,
        );
        if (copy) navigate(AdminRoutes.chordCompingPattern({ id: copy.id }));
      }}
    />
  );
};
