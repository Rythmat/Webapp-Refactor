import { useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AdminRoutes } from '@/constants/routes';
import { uniquePartId } from '@/curriculum/engine/parts/part';
import { getPlayer } from '@/curriculum/engine/players/registry';
import { useInstrumentStore } from '../drumGrooves/instrumentStore';
import { PlayerPicker } from '../players/PlayerPicker';
import { ConsoleCallout } from '../ui/ConsoleCallout';
import { PartEditor } from './PartEditor';
import { usePartList } from './partFiles';

export const AdminPartEditPage = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const parts = usePartList();
  const store = useInstrumentStore();
  const part = parts.find((p) => p.id === id);
  const taken = useMemo(() => new Set(parts.map((p) => p.id)), [parts]);
  const [search] = useSearchParams();
  const capturingAs = search.get('capture')
    ? getPlayer(search.get('player') ?? undefined)
    : undefined;

  if (!part) {
    return (
      <div className="text-sm text-muted-foreground">
        No part with id <span className="tabular-nums">{id}</span>.
      </div>
    );
  }

  const instrument = part.instrument === 'piano' ? 'keys' : part.instrument;
  return (
    <div className="flex flex-col gap-3">
      {capturingAs && (
        <ConsoleCallout
          tone="info"
          title={`A new part for ${capturingAs.name}`}
        >
          Press Capture, count in with the click, and play: what you play is
          this part, filed under {capturingAs.name}.
        </ConsoleCallout>
      )}
      <div className="flex">
        <PlayerPicker
          item={{ kind: 'part', id: part.id }}
          instrument={instrument}
        />
      </div>
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
    </div>
  );
};
