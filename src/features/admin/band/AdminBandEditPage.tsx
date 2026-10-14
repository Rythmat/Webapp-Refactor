import { useNavigate, useParams } from 'react-router-dom';
import { AdminRoutes } from '@/constants/routes';
import { createBand } from './AdminBandsPage';
import { BandEditor } from './BandEditor';
import { useBandList } from './bandSession';

export const AdminBandEditPage = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const bands = useBandList();
  const band = bands.find((b) => b.id === id);

  if (!band) {
    return (
      <div className="text-sm text-muted-foreground">
        No band with id <span className="tabular-nums">{id}</span>.
      </div>
    );
  }

  return (
    <BandEditor
      // A new id is a different band: start fresh.
      key={band.id}
      band={band}
      onDuplicate={async (source) => {
        const copy = await createBand(`${source.name} copy`, bands, source);
        if (copy) navigate(AdminRoutes.band({ id: copy.id }));
      }}
    />
  );
};
