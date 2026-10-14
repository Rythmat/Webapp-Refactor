import { useNavigate, useParams } from 'react-router-dom';
import { AdminRoutes } from '@/constants/routes';
import { createBassLine } from './AdminBassLinesPage';
import { BassLineEditor } from './BassLineEditor';
import { useBassLineList } from './bassLineSession';

export const AdminBassLineEditPage = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const lines = useBassLineList();
  const line = lines.find((l) => l.id === id);

  if (!line) {
    return (
      <div className="text-sm text-muted-foreground">
        No bass line with id <span className="tabular-nums">{id}</span>.
      </div>
    );
  }

  return (
    <BassLineEditor
      // A new id is a different line: start its history fresh.
      key={line.id}
      line={line}
      onDuplicate={async (source) => {
        const copy = await createBassLine(`${source.name} copy`, lines, source);
        if (copy) navigate(AdminRoutes.bassLine({ id: copy.id }));
      }}
    />
  );
};
