import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AdminRoutes } from '@/constants/routes';
import { uniquePartId } from '@/curriculum/engine/parts/part';
import { useInstrumentStore } from '../drumGrooves/instrumentStore';
import { PartEditor } from './PartEditor';
import { usePartList } from './partFiles';

export const AdminPartEditPage = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const parts = usePartList();
  const store = useInstrumentStore();
  const part = parts.find((p) => p.id === id);
  const taken = useMemo(() => new Set(parts.map((p) => p.id)), [parts]);

  if (!part) {
    return (
      <div className="text-sm text-muted-foreground">
        No part with id <span className="tabular-nums">{id}</span>.
      </div>
    );
  }

  return (
    <PartEditor
      // A different part starts its own history.
      key={part.id}
      part={part}
      onDuplicate={async (source) => {
        const name = `${source.name} copy`;
        const copy = {
          ...source,
          id: uniquePartId(name, taken),
          name,
          status: 'draft' as const,
        };
        await store.save('instrument_part', copy);
        navigate(AdminRoutes.part({ id: copy.id }));
      }}
    />
  );
};
