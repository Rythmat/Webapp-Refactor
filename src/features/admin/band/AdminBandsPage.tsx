/* eslint-disable react/jsx-sort-props */
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AdminRoutes } from '@/constants/routes';
import { lessonStyleLabel } from '@/curriculum/data/lessonStyles';
import {
  BAND_INSTRUMENTS,
  type Band,
  bandIdFrom,
  blankBand,
} from '@/curriculum/engine/band/band';
import { stylesUsingBand } from '@/curriculum/engine/lessonPairings/registry';
import { ConsoleBadge } from '../ui/ConsoleBadge';
import { ConsoleCallout } from '../ui/ConsoleCallout';
import { ConsolePageHeader } from '../ui/ConsolePageHeader';
import { CAN_WRITE_FILES, deleteBand, saveBand } from './bandFiles';
import { useBandList, usePairingList } from './bandSession';

/**
 * Write a new draft band (blank, or a copy of `from`) under an id derived
 * from its name, placed last in the list. Returns null when the write fails.
 */
export async function createBand(
  name: string,
  existing: readonly Band[],
  from?: Band,
): Promise<Band | null> {
  let id = bandIdFrom(name);
  const taken = new Set(existing.map((b) => b.id));
  for (let n = 2; taken.has(id); n++) id = `${bandIdFrom(name)}-${n}`;
  const order = Math.max(0, ...existing.map((b) => b.order ?? 0)) + 10;
  const band: Band = from
    ? { ...from, id, name, status: 'draft', order }
    : { ...blankBand(id, name), order };
  try {
    await saveBand(band);
  } catch (err) {
    window.alert(err instanceof Error ? err.message : String(err));
    return null;
  }
  return band;
}

const instrumentLabel = (id: string) =>
  BAND_INSTRUMENTS.find((i) => i.id === id)?.label ?? id;

export const AdminBandsPage = () => {
  const bands = useBandList();
  // Re-render when an assignment changes, so "Plays in" stays current.
  usePairingList();
  const navigate = useNavigate();
  const [name, setName] = useState('');

  const add = async (rawName: string) => {
    const band = await createBand(rawName, bands);
    if (band) navigate(AdminRoutes.band({ id: band.id }));
  };

  return (
    <div className="flex flex-col gap-5">
      <ConsolePageHeader
        title="Bands"
        description={
          <>
            A band is a lesson style&rsquo;s rhythm section in one place: drums,
            bass, comping and any keyboard or guitar layers, heard together over
            a chart. Each layer plays a groove, bass line, comping pattern or
            part from its own library, on the sound you pick. Assign a band to a
            style and it plays every play-along step in that style, and its
            Practice Track.
          </>
        }
      />

      {!CAN_WRITE_FILES && (
        <ConsoleCallout tone="info">
          Bands are saved as repo files, so creating and saving them works on
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
          placeholder="New band name, e.g. Cumbia Band"
          className="w-80 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm"
          aria-label="New band name"
          disabled={!CAN_WRITE_FILES}
        />
        <Button
          size="sm"
          onClick={() => void add(name.trim())}
          disabled={!CAN_WRITE_FILES || !name.trim()}
        >
          <Plus /> New band
        </Button>
      </div>

      {bands.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">
          No bands yet. Name one above to start.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-white/[0.08]">
          {bands.map((band, i) => {
            const styles = stylesUsingBand(band.id);
            return (
              <div
                key={band.id}
                className={`flex items-center gap-4 px-4 py-3 ${i > 0 ? 'border-t border-white/[0.06]' : ''}`}
              >
                <Link
                  to={AdminRoutes.band({ id: band.id })}
                  className="min-w-0 flex-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium hover:underline">
                      {band.name}
                    </span>
                    <ConsoleBadge
                      tone={band.status === 'live' ? 'success' : 'warning'}
                    >
                      {band.status === 'live' ? 'Published' : 'Draft'}
                    </ConsoleBadge>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {band.timeSignature.join('/')} ·{' '}
                    {band.layers.length
                      ? band.layers
                          .map(
                            (l) =>
                              `${l.name} (${instrumentLabel(l.instrument)})`,
                          )
                          .join(', ')
                      : 'no layers yet'}
                    {styles.length > 0 &&
                      ` · plays in ${styles.map(lessonStyleLabel).join(', ')}`}
                  </div>
                </Link>
                {CAN_WRITE_FILES && (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Delete ${band.name}`}
                    onClick={async () => {
                      const using = styles.length
                        ? ` It plays in ${styles.length} lesson style${styles.length === 1 ? '' : 's'}, which will go back to their own backing.`
                        : '';
                      if (!window.confirm(`Delete "${band.name}"?${using}`))
                        return;
                      try {
                        await deleteBand(band.id);
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
