/* eslint-disable react/jsx-sort-props */
import { BookOpen, FileMusic, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/utilities';
import { AdminRoutes } from '@/constants/routes';
import type { HarmonyMatch, ProgressionLike } from '@/content/harmony';
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
import type { PlayerItem } from '@/curriculum/engine/players/player';
import { useBassLineList } from '../bassLines/bassLineSession';
import { useCompingList } from '../chordComping/compingSession';
import { useGrooveList } from '../drumGrooves/grooveSession';
import { useInstrumentStore } from '../drumGrooves/instrumentStore';
import { usePlayerList } from '../players/playerSession';
import { ConsoleBadge } from '../ui/ConsoleBadge';
import { ConsoleCallout } from '../ui/ConsoleCallout';
import { ConsolePageHeader } from '../ui/ConsolePageHeader';
import { CONSOLE_PANEL } from '../ui/styles';
import { LessonStepPicker } from './LessonStepPicker';
import { MidiImportPanel } from './MidiImportPanel';
import { usePartList } from './partFiles';
import { partProgressions } from './partProgressions';

type Panel = 'new' | 'lesson' | 'midi' | null;

/** A part, groove, bass line or comping pattern, as one row of the library. */
interface LibraryRow {
  /** What the row is, as a player files it. */
  item: PlayerItem;
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

/** A template length ("2m") as people say it: "2 bars", "1 bar". */
const barsLabel = (length: string) => {
  const n = Number.parseInt(length, 10) || 1;
  return `${n} bar${n === 1 ? '' : 's'}`;
};

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
    player: '',
    progression: '',
    level: '',
    bars: '',
    status: '',
  });

  const taken = useMemo(() => new Set(parts.map((p) => p.id)), [parts]);
  const makeId = (name: string) => uniquePartId(name, taken);
  const grooves = useGrooveList();
  const lines = useBassLineList();
  const patterns = useCompingList();
  const players = usePlayerList();
  const genreOfGroove = useMemo(
    () => new Map(grooves.map((g) => [g.id, g.genre])),
    [grooves],
  );
  // Bass lines and comping patterns name no genre: their grooves' is theirs.
  const viaGrooves = (ids: readonly string[]) =>
    ids.map((id) => genreOfGroove.get(id)).find(Boolean);
  const genres = [
    ...new Set(
      [...parts, ...grooves].map((p) => p.genre).filter(Boolean) as string[],
    ),
  ].sort();

  // The library progressions each chord part plays, once the library loads.
  const [library, setLibrary] = useState<ProgressionLike[] | null>(null);
  useEffect(() => {
    void import('@/curriculum/data/chordProgressionLibrary').then((m) =>
      setLibrary(m.default),
    );
  }, []);
  const heard = useMemo(
    () =>
      library
        ? partProgressions(parts, library)
        : new Map<string, HarmonyMatch[]>(),
    [parts, library],
  );
  const progressionsHeard = useMemo(() => {
    const count = new Map<number, number>();
    for (const matches of heard.values())
      for (const m of matches)
        count.set(m.progressionId, (count.get(m.progressionId) ?? 0) + 1);
    return [...count]
      .map(([id, n]) => ({
        id,
        n,
        name: library?.find((p) => p.id === id)?.chords.join(' - ') ?? `#${id}`,
      }))
      .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
  }, [heard, library]);
  const playerOfRow = (item: PlayerItem) =>
    players.find((pl) =>
      pl.items.some((i) => i.kind === item.kind && i.id === item.id),
    );

  // Drum grooves are designed in Drum Grooves but filed here too, so the
  // library is one place to look for any instrument.
  const rows: LibraryRow[] = useMemo(
    () => [
      ...parts.map((p) => ({
        item: { kind: 'part' as const, id: p.id },
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
        item: { kind: 'groove' as const, id: g.id },
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
      ...lines.map((l) => ({
        item: { kind: 'bassLine' as const, id: l.id },
        id: l.id,
        name: l.name,
        instrument: 'bass',
        role: 'bassline',
        genre: viaGrooves(l.grooves),
        style: undefined,
        level: undefined,
        bars: Number.parseInt(l.length, 10) || 1,
        status: l.status,
        tags: l.tags ?? [],
        href: AdminRoutes.bassLine({ id: l.id }),
        detail: [
          'Bass line (follows any chords)',
          viaGrooves(l.grooves),
          barsLabel(l.length),
          l.instrument,
        ],
        remove: undefined,
      })),
      ...patterns.map((c) => ({
        item: { kind: 'comping' as const, id: c.id },
        id: c.id,
        name: c.name,
        instrument: 'piano',
        role: 'comping',
        genre: viaGrooves(c.grooves),
        style: undefined,
        level: undefined,
        bars: Number.parseInt(c.length, 10) || 1,
        status: c.status,
        tags: c.tags ?? [],
        href: AdminRoutes.chordCompingPattern({ id: c.id }),
        detail: [
          'Comping pattern (voices any chords)',
          viaGrooves(c.grooves),
          barsLabel(c.length),
          `${c.hits.length} hits`,
        ],
        remove: undefined,
      })),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parts, grooves, lines, patterns, genreOfGroove],
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
      (!filter.player || playerOfRow(p.item)?.id === filter.player) &&
      (!filter.progression ||
        (p.item.kind === 'part' &&
          (heard.get(p.id) ?? []).some(
            (m) => m.progressionId === Number(filter.progression),
          ))) &&
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
            from a MIDI file. Drum grooves, bass lines and comping patterns are
            listed here too and open in their own editors. Browse by genre, by{' '}
            <Link
              to={AdminRoutes.players()}
              className="text-white/80 underline-offset-4 hover:text-white hover:underline"
            >
              player
            </Link>
            , or by the chord progression a piano or guitar part plays.
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
          <option value="">All genres</option>
          {genres.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <select
          value={filter.player}
          onChange={(e) => setF({ player: e.target.value })}
          className={select}
          aria-label="Player"
        >
          <option value="">All players</option>
          {players
            .filter((pl) => pl.items.length)
            .map((pl) => (
              <option key={pl.id} value={pl.id}>
                {pl.name}
              </option>
            ))}
        </select>
        <select
          value={filter.progression}
          onChange={(e) => setF({ progression: e.target.value })}
          className={cn(select, 'max-w-[18rem]')}
          aria-label="Chord progression"
          disabled={!progressionsHeard.length}
          title="Chord parts (piano, guitar) by the library progression their chords play"
        >
          <option value="">
            {progressionsHeard.length
              ? 'Any progression'
              : 'No chord part plays a library progression yet'}
          </option>
          {progressionsHeard.map((pr) => (
            <option key={pr.id} value={pr.id}>
              {pr.name} ({pr.n})
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
              key={`${p.item.kind}:${p.id}`}
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
                  {[...p.detail, playerOfRow(p.item)?.name]
                    .filter(Boolean)
                    .join(' · ')}
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
