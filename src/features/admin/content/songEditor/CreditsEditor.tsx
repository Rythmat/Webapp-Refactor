import { Plus, Trash2 } from 'lucide-react';
import { type FC } from 'react';
import { SESSION_INSTRUMENTS } from '@/curriculum/data/instruments';
import type {
  Credit,
  CreditRole,
  RecordingSession,
  RelatedRecording,
  Song,
} from '@/curriculum/types/songLibrary';

/**
 * Who made the record, where, and who else has recorded it.
 *
 * Every field here is a node in the Atlas graph, which is why the instrument
 * and role are SELECTS rather than text boxes: a picker cannot produce
 * 'Fender Rhodes' and 'fender rhodes' as two different things, and free text
 * always eventually does. Names are still typed — an artist registry with a
 * typeahead is the next step, and when it lands only this file changes.
 *
 * `unverified` is offered on every row on purpose. A credit nobody has
 * confirmed is worth keeping and worth marking; the song page renders those
 * muted, and the graph keeps them out of counts until someone signs them off.
 */

const ROLES: { value: CreditRole; label: string }[] = [
  { value: 'performer', label: 'Plays' },
  { value: 'vocals', label: 'Vocals' },
  { value: 'songwriter', label: 'Wrote' },
  { value: 'producer', label: 'Produced' },
  { value: 'engineer', label: 'Engineered' },
  { value: 'arranger', label: 'Arranged' },
  { value: 'conductor', label: 'Conducted' },
];

const RELATIONS: RelatedRecording['relation'][] = [
  'original',
  'cover',
  'sample',
  'interpolation',
  'collaboration',
];

const INSTRUMENTS_BY_SECTION = SESSION_INSTRUMENTS.reduce<
  Record<string, typeof SESSION_INSTRUMENTS>
>((acc, i) => {
  acc[i.section] = [...(acc[i.section] ?? []), i];
  return acc;
}, {});

const inputClass =
  'min-w-0 rounded border border-white/10 bg-white/5 px-2 py-1 text-sm text-white/85 focus:border-white/30 focus:outline-none';

const Label: FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-[11px] uppercase tracking-wide text-white/35">
    {children}
  </span>
);

const AddButton: FC<{ onClick: () => void; children: React.ReactNode }> = ({
  onClick,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center gap-1 self-start rounded border border-dashed border-white/15 px-2 py-1 text-xs text-white/45 transition-colors hover:border-white/35 hover:text-white/75"
  >
    <Plus size={12} /> {children}
  </button>
);

const RemoveButton: FC<{ onClick: () => void; title: string }> = ({
  onClick,
  title,
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-label={title}
    className="shrink-0 rounded p-1 text-white/25 transition-colors hover:bg-white/5 hover:text-white/70"
  >
    <Trash2 size={13} />
  </button>
);

export const CreditsEditor: FC<{
  song: Song;
  onPatch: (p: Partial<Song>) => void;
}> = ({ song, onPatch }) => {
  const credits = song.credits ?? [];
  const related = song.relatedRecordings ?? [];
  const session: RecordingSession = song.session ?? {};

  const setCredit = (i: number, p: Partial<Credit>) =>
    onPatch({
      credits: credits.map((c, n) => (n === i ? { ...c, ...p } : c)),
    });

  const setSession = (p: Partial<RecordingSession>) => {
    const next = { ...session, ...p };
    // Drop empties so a cleared field doesn't persist as ''.
    for (const k of Object.keys(next) as (keyof RecordingSession)[])
      if (next[k] === '' || next[k] === undefined) delete next[k];
    onPatch({ session: Object.keys(next).length ? next : undefined });
  };

  const setRelated = (i: number, p: Partial<RelatedRecording>) =>
    onPatch({
      relatedRecordings: related.map((r, n) => (n === i ? { ...r, ...p } : r)),
    });

  return (
    <section className="flex flex-col gap-5 border-t border-white/5 pt-5">
      {/* ── Credits ── */}
      <div className="flex flex-col gap-2">
        <Label>Credits</Label>
        {credits.map((credit, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <input
              value={credit.name}
              onChange={(e) => setCredit(i, { name: e.target.value })}
              placeholder="Name, or an ensemble"
              className={`${inputClass} flex-1`}
              style={{ minWidth: 170 }}
            />
            <select
              value={credit.role}
              onChange={(e) =>
                setCredit(i, {
                  role: e.target.value as CreditRole,
                  // Only a performer carries an instrument.
                  instrument:
                    e.target.value === 'performer'
                      ? credit.instrument
                      : undefined,
                })
              }
              className={inputClass}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            {credit.role === 'performer' && (
              <select
                value={credit.instrument ?? ''}
                onChange={(e) =>
                  setCredit(i, { instrument: e.target.value || undefined })
                }
                className={inputClass}
              >
                <option value="">— instrument —</option>
                {Object.entries(INSTRUMENTS_BY_SECTION).map(
                  ([section, list]) => (
                    <optgroup key={section} label={section}>
                      {list.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.name}
                        </option>
                      ))}
                    </optgroup>
                  ),
                )}
              </select>
            )}
            <label
              className="flex items-center gap-1 text-xs text-white/45"
              title="Billed on the label, not a sideman"
            >
              <input
                type="checkbox"
                checked={!!credit.primary}
                onChange={(e) => setCredit(i, { primary: e.target.checked })}
              />
              Billed
            </label>
            <label
              className="flex items-center gap-1 text-xs text-white/45"
              title="A group rather than one person"
            >
              <input
                type="checkbox"
                checked={!!credit.ensemble}
                onChange={(e) => setCredit(i, { ensemble: e.target.checked })}
              />
              Group
            </label>
            <label
              className="flex items-center gap-1 text-xs text-white/45"
              title="Could not be pinned to a reliable source"
            >
              <input
                type="checkbox"
                checked={!!credit.unverified}
                onChange={(e) =>
                  setCredit(i, { unverified: e.target.checked || undefined })
                }
              />
              Unconfirmed
            </label>
            <RemoveButton
              title={`Remove ${credit.name || 'credit'}`}
              onClick={() =>
                onPatch({ credits: credits.filter((_, n) => n !== i) })
              }
            />
          </div>
        ))}
        <AddButton
          onClick={() =>
            onPatch({ credits: [...credits, { name: '', role: 'performer' }] })
          }
        >
          Add a credit
        </AddButton>
      </div>

      {/* ── Where it was made ── */}
      <div className="flex flex-col gap-2">
        <Label>Recording</Label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={session.studio ?? ''}
            onChange={(e) => setSession({ studio: e.target.value })}
            placeholder="Studio"
            className={inputClass}
          />
          <input
            value={session.city ?? ''}
            onChange={(e) => setSession({ city: e.target.value })}
            placeholder="City"
            className={inputClass}
          />
          <input
            value={session.country ?? ''}
            onChange={(e) => setSession({ country: e.target.value })}
            placeholder="Country"
            className={inputClass}
          />
          <input
            value={session.label ?? ''}
            onChange={(e) => setSession({ label: e.target.value })}
            placeholder="Label"
            className={inputClass}
          />
          <input
            type="number"
            value={session.recordedYear ?? ''}
            onChange={(e) =>
              setSession({
                recordedYear: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              })
            }
            placeholder="Recorded"
            title="Recording year, when it differs from the release year"
            className={`${inputClass} w-24`}
          />
        </div>
      </div>

      {/* ── Other recordings ── */}
      <div className="flex flex-col gap-2">
        <Label>Also recorded by</Label>
        {related.map((rel, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <input
              value={rel.artist}
              onChange={(e) => setRelated(i, { artist: e.target.value })}
              placeholder="Artist"
              className={`${inputClass} flex-1`}
              style={{ minWidth: 170 }}
            />
            <input
              type="number"
              value={rel.year ?? ''}
              onChange={(e) =>
                setRelated(i, {
                  year: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              placeholder="Year"
              className={`${inputClass} w-24`}
            />
            <select
              value={rel.relation}
              onChange={(e) =>
                setRelated(i, {
                  relation: e.target.value as RelatedRecording['relation'],
                })
              }
              className={inputClass}
            >
              {RELATIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <input
              value={rel.songId ?? ''}
              onChange={(e) =>
                setRelated(i, { songId: e.target.value || undefined })
              }
              placeholder="Song id, if charted here"
              title="Links the two recordings in the graph"
              className={inputClass}
            />
            <RemoveButton
              title={`Remove ${rel.artist || 'recording'}`}
              onClick={() =>
                onPatch({
                  relatedRecordings: related.filter((_, n) => n !== i),
                })
              }
            />
          </div>
        ))}
        <AddButton
          onClick={() =>
            onPatch({
              relatedRecordings: [
                ...related,
                { artist: '', relation: 'cover' },
              ],
            })
          }
        >
          Add a recording
        </AddButton>
      </div>
    </section>
  );
};
