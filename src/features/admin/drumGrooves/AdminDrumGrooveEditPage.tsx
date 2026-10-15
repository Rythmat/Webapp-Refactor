import { useNavigate, useParams } from 'react-router-dom';
import { AdminRoutes } from '@/constants/routes';
import { createGroove } from './AdminDrumGroovesPage';
import { DrumGrooveEditor } from './DrumGrooveEditor';
import { rememberSaved, useGrooveList } from './grooveSession';
import { useInstrumentStore } from './instrumentStore';

export const AdminDrumGrooveEditPage = () => {
  const store = useInstrumentStore();
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const grooves = useGrooveList();
  const groove = grooves.find((g) => g.id === id);

  if (!groove) {
    return (
      <div className="text-sm text-muted-foreground">
        No groove with id <span className="tabular-nums">{id}</span>.
      </div>
    );
  }

  return (
    <DrumGrooveEditor
      // A new id is a different groove: start its history fresh.
      key={groove.id}
      groove={groove}
      onSaved={rememberSaved}
      onDuplicate={async (source) => {
        const copy = await createGroove(
          `${source.name} copy`,
          grooves,
          (groove) => store.save('drum_groove', groove),
          source,
        );
        if (copy) navigate(AdminRoutes.drumGroove({ id: copy.id }));
      }}
    />
  );
};
