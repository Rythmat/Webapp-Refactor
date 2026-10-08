/* eslint-disable react/jsx-sort-props */
import { BookOpen, FileMusic, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/utilities';
import { AdminRoutes } from '@/constants/routes';
import {
  blankPart,
  keyLabel,
  PART_INSTRUMENTS,
  PART_LEVELS,
  PART_ROLES,
  uniquePartId,
  type InstrumentPart,
  type PartInstrument,
} from '@/curriculum/engine/parts/part';
import { useGrooveList } from '../drumGrooves/grooveSession';
import { useInstrumentStore } from '../drumGrooves/instrumentStore';
import { ConsoleBadge } from '../ui/ConsoleBadge';
import { ConsoleCallout } from '../ui/ConsoleCallout';
import { ConsolePageHeader } from '../ui/ConsolePageHeader';
import { CONSOLE_PANEL } from '../ui/styles';
import { LessonStepPicker } from './LessonStepPicker';
import { MidiImportPanel } from './MidiImportPanel';
import { usePartList } from './partFiles';

type Panel = 'new' | 'lesson' | 'midi' | null;

/** A part or a drum groove, as one row of the library. */
interface LibraryRow {
  id: string;
  name: string;
  instrument: string;
  role: string;
  genre?: string;
  style?: string;
  level?: number;
  bars: number;
  status: 'draft' | 'live';
  tags: string[];
  href: string;
  detail: (string | undefined)[];
  remove?: () => Promise<unknown>;
}

const LENGTHS = [1, 2, 4, 8];

const select =
  'rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm';

/**
 * The Parts Library: every instrumental example, filterable by instrument,
 * role, style, level and length. New parts start from scratch, from any
 * written lesson step, or from a MIDI file.
 */
export const AdminPartsLibraryPage = () => {
  const parts = usePartList();
  const store = useInstrumentStore();
  const canSave = store.canSave('instrument_part');
  const navigate = useNavigate();
  const [panel, setPanel] = useState<Panel>(null);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newInstrument, setNewInstrument] = useState<PartInstrument>('piano');
  const [filter, setFilter] = useState({
    q: '',
    instrument: '',
    role: '',
    genre: '',
    level: '',
    bars: '',
    status: '',
  });

  const taken = useMemo(() => new Set(parts.map((p) => p.id)), [parts]);
  const makeId = (name: string) => uniquePartId(name, taken);
  const grooves = useGrooveList();
  const genres = [
    ...new Set(
      [...parts, ...grooves].map((p) => p.genre).filter(Boolean) as string[],
    ),
  ].sort();

  // Drum grooves are designed in Drum Grooves but filed here too, so the
  // library is one place to look for any instrument.
  const rows: LibraryRow[] = useMemo(
    () => [
      ...parts.map((p) => ({
        id: p.id,
        name: p.name,
        instrument: p.instrument as string,
        role: p.role as string,
        genre: p.genre,
        style: p.style,
        level: p.level as number | undefined,
        bars: p.bars,
        status: p.status,
        tags: p.tags,
        href: AdminRoutes.part({ id: p.id }),
        detail: [
          PART_ROLES.find((r) => r.id === p.role)?.label,
          p.genre,
          p.style,
          PART_LEVELS.find((l) => l.id === p.level)?.label,
          `${p.bars} bar${p.bars === 1 ? '' : 's'}`,
          keyLabel(p.key),
          `${p.notes.length} notes`,
        ],
        remove: () => store.remove('instrument_part', p.id),
      })),
      ...grooves.map((g) => ({
        id: g.id,
        name: g.name,
        instrument: 'drums',
        role: 'groove',
        genre: g.genre,
        style: g.style,
        level: undefined,
        bars: g.bars,
        status: g.status,
        tags: g.tags ?? [],
        href: AdminRoutes.drumGroove({ id: g.id }),
        detail: [
          'Groove',
          g.genre,
          g.style,
          `${g.bars} bar${g.bars === 1 ? '' : 's'}`,
          `${g.tempo} bpm`,
          `${g.kit} kit`,
          `${g.hits.length} hits`,
        ],
        remove: undefined,
      })),
    ],
    [parts, grooves],
  );

  const shown = rows.filter((p) => {
    const q = filter.q.toLowerCase();
    return (
      (!q ||
        `${p.name} ${p.style ?? ''} ${p.tags.join(' ')} ${p.id}`
          .toLowerCase()
          .includes(q)) &&
      (!filter.instrument || p.instrument === filter.instrument) &&
      (!filter.role || p.role === filter.role) &&
      (!filter.genre || p.genre === filter.genre) &&
      (!filter.level || p.level === Number(filter.level)) &&
      (!filter.bars ||
        (filter.bars === '8+'
          ? p.bars >= 8
          : p.bars === Number(filter.bars))) &&
      (!filter.status || p.status === filter.status)
    );
  });

  /** Write a new draft and open it. */
  const create = async (part: InstrumentPart) => {
    setError(null);
    try {
      await store.save('instrument_part', { ...part, status: 'draft' });
      navigate(AdminRoutes.part({ id: part.id }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const setF = (patch: Partial<typeof filter>) =>
    setFilter((f) => ({ ...f, ...patch }));

  return (
    <div className="flex flex-col gap-5">
      <ConsolePageHeader
        title="Parts Library"
        description={
          <>
            Instrumental examples, basic to pro — the parts lessons and the
            Studio draw on. Start one from scratch, from any lesson step, or
            from a MIDI file. Drum grooves are listed here too and open in{' '}
            <Link
              to={AdminRoutes.drumGrooves()}
              className="text-white/80 underline-offset-4 hover:text-white hover:underline"
            >
              Drum Grooves
            </Link>
            .
          </>
        }
      />

      {!canSave && (
        <ConsoleCallout tone="info">
          Parts are repo files for now, so creating and saving them works on the
          local dev server (npm run dev). Here you can browse and audition.
        </ConsoleCallout>
      )}
      {error && <ConsoleCallout tone="danger">{error}</ConsoleCallout>}

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['new', Plus, 'New part'],
            ['lesson', BookOpen, 'From a lesson step'],
            ['midi', FileMusic, 'From a MIDI file'],
          ] as const
        ).map(([id, Icon, label]) => (
          <Button
            key={id}
            size="sm"
            variant={panel === id ? 'default' : 'outline'}
            disabled={!canSave}
            onClick={() => setPanel(panel === id ? null : id)}
          >
            <Icon /> {label}
          </Button>
        ))}
      </div>

      {panel && (
        <section className={cn(CONSOLE_PANEL, 'p-4')}>
          {panel === 'new' && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Name, e.g. Funk bass — Meters 16ths"
                className={cn(select, 'w-80')}
                aria-label="Part name"
              />
              <select
                value={newInstrument}
                onChange={(e) =>
                  setNewInstrument(e.target.value as PartInstrument)
                }
                className={select}
                aria-label="Instrument"
              >
                {PART_INSTRUMENTS.filter((i) => i.id !== 'drums').map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.label}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                disabled={!newName.trim()}
                onClick={() =>
                  void create(
                    blankPart(
                      makeId(newName.trim()),
                      newName.trim(),
                      newInstrument,
                    ),
                  )
                }
              >
                Create
              </Button>
            </div>
          )}
          {panel === 'lesson' && (
            <LessonStepPicker makeId={makeId} onPick={(p) => void create(p)} />
          )}
          {panel === 'midi' && (
            <MidiImportPanel makeId={makeId} onPick={(p) => void create(p)} />
          )}
        </section>
      )}

      {/* ── filters ── */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={filter.q}
          onChange={(e) => setF({ q: e.target.value })}
          placeholder="Search name, style, tags"
          className={cn(select, 'w-60')}
          aria-label="Search parts"
        />
        <select
          value={filter.instrument}
          onChange={(e) => setF({ instrument: e.target.value })}
          className={select}
          aria-label="Instrument"
        >
          <option value="">All instruments</option>
          {PART_INSTRUMENTS.map((i) => (
            <option key={i.id} value={i.id}>
              {i.label}
            </option>
          ))}
        </select>
        <select
          value={filter.role}
          onChange={(e) => setF({ role: e.target.value })}
          className={select}
          aria-label="Role"
        >
          <option value="">All roles</option>
          {PART_ROLES.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
        <select
          value={filter.genre}
          onChange={(e) => setF({ genre: e.target.value })}
          className={select}
          aria-label="Genre"
        >
          <option value="">All styles</option>
          {genres.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <select
          value={filter.level}
          onChange={(e) => setF({ level: e.target.value })}
          className={select}
          aria-label="Level"
        >
          <option value="">All levels</option>
          {PART_LEVELS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
        <select
          value={filter.bars}
          onChange={(e) => setF({ bars: e.target.value })}
          className={select}
          aria-label="Length"
        >
          <option value="">Any length</option>
          {LENGTHS.map((n) => (
            <option key={n} value={n === 8 ? '8+' : n}>
              {n === 8 ? '8+ bars' : `${n} bar${n === 1 ? '' : 's'}`}
            </option>
          ))}
        </select>
        <select
          value={filter.status}
          onChange={(e) => setF({ status: e.target.value })}
          className={select}
          aria-label="Status"
        >
          <option value="">Drafts and published</option>
          <option value="live">Published</option>
          <option value="draft">Drafts</option>
        </select>
        <span className="ml-auto text-xs text-muted-foreground">
          {shown.length} of {rows.length}
        </span>
      </div>

      {shown.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">
          {rows.length === 0
            ? 'No parts yet. Start one above — a lesson step is the quickest way in.'
            : 'Nothing matches those filters.'}
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-white/[0.08]">
          {shown.map((p, i) => (
            <div
              key={p.id}
              className={cn(
                'flex items-center gap-4 px-4 py-3',
                i > 0 && 'border-t border-white/[0.06]',
              )}
            >
              <span className="w-14 shrink-0 text-xs font-medium uppercase tracking-[0.14em] text-white/50">
                {p.instrument}
              </span>
              <Link to={p.href} className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium hover:underline">
                    {p.name}
                  </span>
                  <ConsoleBadge
                    tone={p.status === 'live' ? 'success' : 'warning'}
                  >
                    {p.status === 'live' ? 'Published' : 'Draft'}
                  </ConsoleBadge>
                </div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">
                  {p.detail.filter(Boolean).join(' · ')}
                </div>
              </Link>
              {canSave && p.remove && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Delete ${p.name}`}
                  onClick={async () => {
                    if (!window.confirm(`Delete "${p.name}"?`)) return;
                    await p.remove?.();
                  }}
                >
                  <Trash2 />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
