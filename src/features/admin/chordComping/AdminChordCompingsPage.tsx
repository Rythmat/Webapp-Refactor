/* eslint-disable react/jsx-sort-props */
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AdminRoutes } from '@/constants/routes';
import {
  blankComping,
  compingBars,
  compingIdFrom,
  type ChordComping,
} from '@/curriculum/engine/chordComping/chordComping';
import { useGrooveList } from '../drumGrooves/grooveSession';
import { ConsoleBadge } from '../ui/ConsoleBadge';
import { ConsoleCallout } from '../ui/ConsoleCallout';
import { ConsolePageHeader } from '../ui/ConsolePageHeader';
import { CAN_WRITE_FILES, deleteComping, saveComping } from './compingFiles';
import { useCompingList } from './compingSession';

/**
 * Write a new draft pattern (blank, or a copy of `from`) under an id derived
 * from its name, placed last in the list. Returns null when the write fails.
 */
export async function createComping(
  name: string,
  existing: readonly ChordComping[],
  from?: ChordComping,
): Promise<ChordComping | null> {
  let id = compingIdFrom(name);
  const taken = new Set(existing.map((c) => c.id));
  for (let n = 2; taken.has(id); n++) id = `${compingIdFrom(name)}-${n}`;
  const order = Math.max(0, ...existing.map((c) => c.order ?? 0)) + 10;
  const pattern: ChordComping = from
    ? { ...from, id, name, status: 'draft', order }
    : { ...blankComping(id, name), order };
  try {
    await saveComping(pattern);
  } catch (err) {
    window.alert(err instanceof Error ? err.message : String(err));
    return null;
  }
  return pattern;
}

export const AdminChordCompingsPage = () => {
  const patterns = useCompingList();
  const grooves = useGrooveList();
  const navigate = useNavigate();
  const [name, setName] = useState('');

  const add = async (rawName: string) => {
    const pattern = await createComping(rawName, patterns);
    if (pattern) navigate(AdminRoutes.chordCompingPattern({ id: pattern.id }));
  };

  const grooveName = (id: string) =>
    grooves.find((g) => g.id === id)?.name ?? id;

  return (
    <div className="flex flex-col gap-5">
      <ConsolePageHeader
        title="Chord Comping"
        description={
          <>
            Comping patterns are rhythms of chord hits (the reggaeton tresillo,
            cumbia&rsquo;s offbeats, the vals&rsquo; chord-chord). Each hit
            voices whatever chord is sounding, so one pattern plays over any
            progression in any key. Edit one and hear it over a progression, a
            drum groove and a bass line while you work.
          </>
        }
      />

      {!CAN_WRITE_FILES && (
        <ConsoleCallout tone="info">
          Comping patterns are saved as repo files, so creating and saving them
          works on the local dev server (npm run dev). Here you can open and
          audition them.
        </ConsoleCallout>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim()) void add(name.trim());
          }}
          placeholder="New pattern name, e.g. Bossa Nova Comp"
          className="w-80 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm"
          aria-label="New pattern name"
          disabled={!CAN_WRITE_FILES}
        />
        <Button
          size="sm"
          onClick={() => void add(name.trim())}
          disabled={!CAN_WRITE_FILES || !name.trim()}
        >
          <Plus /> New pattern
        </Button>
      </div>

      {patterns.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">
          No comping patterns yet. Name one above to start.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-white/[0.08]">
          {patterns.map((c, i) => {
            const bars = compingBars(c);
            return (
              <div
                key={c.id}
                className={`flex items-center gap-4 px-4 py-3 ${i > 0 ? 'border-t border-white/[0.06]' : ''}`}
              >
                <Link
                  to={AdminRoutes.chordCompingPattern({ id: c.id })}
                  className="min-w-0 flex-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium hover:underline">
                      {c.name}
                    </span>
                    <ConsoleBadge
                      tone={c.status === 'live' ? 'success' : 'warning'}
                    >
                      {c.status === 'live' ? 'Published' : 'Draft'}
                    </ConsoleBadge>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    <span className="tabular-nums">{c.id}</span> ·{' '}
                    {c.timeSignature.join('/')} · {bars} bar
                    {bars === 1 ? '' : 's'} · {c.hits.length} hit
                    {c.hits.length === 1 ? '' : 's'}
                    {c.grooves.length > 0 &&
                      ` · with ${c.grooves.map(grooveName).join(', ')}`}
                    {c.description && ` · ${c.description}`}
                  </div>
                </Link>
                {CAN_WRITE_FILES && (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Delete ${c.name}`}
                    onClick={async () => {
                      if (!window.confirm(`Delete "${c.name}"?`)) return;
                      try {
                        await deleteComping(c.id);
                      } catch (err) {
                        window.alert(
                          err instanceof Error ? err.message : String(err),
                        );
                      }
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
