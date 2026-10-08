/* eslint-disable react/jsx-sort-props */
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AdminRoutes } from '@/constants/routes';
import {
  CODE_GROOVES,
  THEORY_PRACTICE_GROOVE_ID,
} from '@/curriculum/engine/drumGrooves/codeGrooves';
import {
  blankGroove,
  grooveIdFrom,
  toCounted,
  TEMPO_UNITS,
  type DrumGroove,
} from '@/curriculum/engine/drumGrooves/drumGroove';
import { ConsoleBadge } from '../ui/ConsoleBadge';
import { ConsoleCallout } from '../ui/ConsoleCallout';
import { ConsolePageHeader } from '../ui/ConsolePageHeader';
import { useGrooveList } from './grooveSession';
import { useInstrumentStore } from './instrumentStore';

/**
 * Write a new draft groove (blank, or a copy of `from`) under an id derived
 * from its name. Returns null when the write fails.
 */
export async function createGroove(
  name: string,
  existing: readonly DrumGroove[],
  save: (groove: DrumGroove) => Promise<void>,
  from?: DrumGroove,
): Promise<DrumGroove | null> {
  let id = grooveIdFrom(name);
  const taken = new Set(existing.map((g) => g.id));
  for (let n = 2; taken.has(id); n++) id = `${grooveIdFrom(name)}_${n}`;
  const groove: DrumGroove = from
    ? { ...from, id, name, status: 'draft' }
    : blankGroove(id, name);
  try {
    await save(groove);
  } catch (err) {
    window.alert(err instanceof Error ? err.message : String(err));
    return null;
  }
  return groove;
}

export const AdminDrumGroovesPage = () => {
  const grooves = useGrooveList();
  const store = useInstrumentStore();
  const canSave = store.canSave('drum_groove');
  const saveGroove = (groove: DrumGroove) => store.save('drum_groove', groove);
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [genre, setGenre] = useState('');

  const genres = [...new Set(grooves.map((g) => g.genre).filter(Boolean))];
  const shown = genre ? grooves.filter((g) => g.genre === genre) : grooves;

  // The id comes from the name ("Theory Practice Track" → theory_practice_track).
  const add = async (rawName: string) => {
    const groove = await createGroove(rawName, grooves, saveGroove);
    if (groove) navigate(AdminRoutes.drumGroove({ id: groove.id }));
  };

  return (
    <div className="flex flex-col gap-5">
      <ConsolePageHeader
        title="Drum Grooves"
        description={
          <>
            The grooves activity play-alongs and Practice Tracks play. Edit one
            and it plays while you work. A published groove replaces the code
            groove with the same id; a step names any groove in its Groove
            field.
          </>
        }
      />

      {!canSave && (
        <ConsoleCallout tone="info">
          Grooves are saved as repo files, so creating and saving them works on
          the local dev server (npm run dev). Here you can open and audition
          them.
        </ConsoleCallout>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim()) void add(name.trim());
          }}
          placeholder="New groove name, e.g. Funk 07 — Meters"
          className="w-80 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm"
          aria-label="New groove name"
          disabled={!canSave}
        />
        <Button
          size="sm"
          onClick={() => void add(name.trim())}
          disabled={!canSave || !name.trim()}
        >
          <Plus /> New groove
        </Button>
        {!grooves.some((g) => g.id === THEORY_PRACTICE_GROOVE_ID) && (
          <Button
            size="sm"
            variant="outline"
            disabled={!canSave}
            onClick={() => void add('Theory Practice Track')}
            title="Published, it replaces the rock .mid every Theory Practice Track plays"
          >
            <Plus /> Theory Practice Track groove
          </Button>
        )}
        {genres.length > 1 && (
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="ml-auto rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm"
            aria-label="Filter by genre"
          >
            <option value="">All genres</option>
            {genres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">
          No grooves yet. Name one above to start.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-white/[0.08]">
          {shown.map((g, i) => {
            const unit = TEMPO_UNITS.find((u) => u.id === g.tempoUnit);
            const replaces = CODE_GROOVES.find((c) => c.id === g.id);
            return (
              <div
                key={g.id}
                className={`flex items-center gap-4 px-4 py-3 ${i > 0 ? 'border-t border-white/[0.06]' : ''}`}
              >
                <Link
                  to={AdminRoutes.drumGroove({ id: g.id })}
                  className="min-w-0 flex-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium hover:underline">
                      {g.name}
                    </span>
                    <ConsoleBadge
                      tone={g.status === 'live' ? 'success' : 'warning'}
                    >
                      {g.status === 'live' ? 'Published' : 'Draft'}
                    </ConsoleBadge>
                    {replaces && (
                      <span className="text-[11px] text-white/40">
                        {g.status === 'live' ? 'replaces' : 'would replace'}{' '}
                        code groove
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    <span className="tabular-nums">{g.id}</span>
                    {g.genre && ` · ${g.genre}`} · {g.timeSignature.join('/')} ·{' '}
                    {g.bars} bar
                    {g.bars === 1 ? '' : 's'} · {unit?.symbol} ={' '}
                    {toCounted(g.tempo, g.tempoUnit)} · {g.kit} kit ·{' '}
                    {g.hits.length} hits
                    {g.description && ` · ${g.description}`}
                  </div>
                </Link>
                {canSave && (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Delete ${g.name}`}
                    onClick={async () => {
                      if (
                        !window.confirm(
                          `Delete "${g.name}"? Steps naming ${g.id} fall back to ${replaces ? 'the code groove' : 'their style default'}.`,
                        )
                      )
                        return;
                      await store.remove('drum_groove', g.id);
                    }}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
