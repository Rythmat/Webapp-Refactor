/* eslint-disable react/jsx-sort-props */
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AdminRoutes } from '@/constants/routes';
import {
  bassLineIdFrom,
  blankBassLine,
  INSTRUMENTS,
  lineBars,
  type BassLine,
} from '@/curriculum/engine/bassLines/bassLine';
import { useGrooveList } from '../drumGrooves/grooveSession';
import { ConsoleBadge } from '../ui/ConsoleBadge';
import { ConsoleCallout } from '../ui/ConsoleCallout';
import { ConsolePageHeader } from '../ui/ConsolePageHeader';
import { CAN_WRITE_FILES, deleteBassLine, saveBassLine } from './bassLineFiles';
import { useBassLineList } from './bassLineSession';

/**
 * Write a new draft line (blank, or a copy of `from`) under an id derived from
 * its name, placed last in the list. Returns null when the write fails.
 */
export async function createBassLine(
  name: string,
  existing: readonly BassLine[],
  from?: BassLine,
): Promise<BassLine | null> {
  let id = bassLineIdFrom(name);
  const taken = new Set(existing.map((l) => l.id));
  for (let n = 2; taken.has(id); n++) id = `${bassLineIdFrom(name)}-${n}`;
  const order = Math.max(0, ...existing.map((l) => l.order ?? 0)) + 10;
  const line: BassLine = from
    ? { ...from, id, name, status: 'draft', order }
    : { ...blankBassLine(id, name), order };
  try {
    await saveBassLine(line);
  } catch (err) {
    window.alert(err instanceof Error ? err.message : String(err));
    return null;
  }
  return line;
}

export const AdminBassLinesPage = () => {
  const lines = useBassLineList();
  const grooves = useGrooveList();
  const navigate = useNavigate();
  const [name, setName] = useState('');

  const add = async (rawName: string) => {
    const line = await createBassLine(rawName, lines);
    if (line) navigate(AdminRoutes.bassLine({ id: line.id }));
  };

  const grooveName = (id: string) =>
    grooves.find((g) => g.id === id)?.name ?? id;

  return (
    <div className="flex flex-col gap-5">
      <ConsolePageHeader
        title="Bass Lines"
        description={
          <>
            Bass lines written as chord-relative roles (root, third, an approach
            into the next chord, a walking passing tone), so one line plays over
            any chart in any key. Edit one and it plays over a chart and its
            drum groove while you work.
          </>
        }
      />

      {!CAN_WRITE_FILES && (
        <ConsoleCallout tone="info">
          Bass lines are saved as repo files, so creating and saving them works
          on the local dev server (npm run dev). Here you can open and audition
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
          placeholder="New bass line name, e.g. Walking: Two Chords Per Bar"
          className="w-80 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm"
          aria-label="New bass line name"
          disabled={!CAN_WRITE_FILES}
        />
        <Button
          size="sm"
          onClick={() => void add(name.trim())}
          disabled={!CAN_WRITE_FILES || !name.trim()}
        >
          <Plus /> New bass line
        </Button>
      </div>

      {lines.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">
          No bass lines yet. Name one above to start.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-white/[0.08]">
          {lines.map((l, i) => {
            const bars = lineBars(l);
            return (
              <div
                key={l.id}
                className={`flex items-center gap-4 px-4 py-3 ${i > 0 ? 'border-t border-white/[0.06]' : ''}`}
              >
                <Link
                  to={AdminRoutes.bassLine({ id: l.id })}
                  className="min-w-0 flex-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium hover:underline">
                      {l.name}
                    </span>
                    <ConsoleBadge
                      tone={l.status === 'live' ? 'success' : 'warning'}
                    >
                      {l.status === 'live' ? 'Published' : 'Draft'}
                    </ConsoleBadge>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    <span className="tabular-nums">{l.id}</span> ·{' '}
                    {l.timeSignature.join('/')} · {bars} bar
                    {bars === 1 ? '' : 's'} ·{' '}
                    {INSTRUMENTS[l.instrument]?.label ?? l.instrument} ·{' '}
                    {l.notes.length} notes
                    {l.grooves.length > 0 &&
                      ` · with ${l.grooves.map(grooveName).join(', ')}`}
                    {l.description && ` · ${l.description}`}
                  </div>
                </Link>
                {CAN_WRITE_FILES && (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Delete ${l.name}`}
                    onClick={async () => {
                      if (!window.confirm(`Delete "${l.name}"?`)) return;
                      try {
                        await deleteBassLine(l.id);
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
