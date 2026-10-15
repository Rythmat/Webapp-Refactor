/* eslint-disable react/jsx-sort-props */
import { ArrowLeft, Circle, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/utilities';
import { AdminRoutes } from '@/constants/routes';
import {
  BAND_INSTRUMENTS,
  type BandInstrument,
} from '@/curriculum/engine/band/band';
import {
  blankPart,
  type PartInstrument,
  uniquePartId,
} from '@/curriculum/engine/parts/part';
import {
  PLAYER_ROLE,
  type Player,
  type PlayerItem,
  withItem,
  withoutItem,
} from '@/curriculum/engine/players/player';
import { useInstrumentStore } from '../drumGrooves/instrumentStore';
import { usePartList } from '../parts/partFiles';
import { ConsoleBadge } from '../ui/ConsoleBadge';
import { CONSOLE_LABEL, CONSOLE_PANEL } from '../ui/styles';
import { genreLabel } from './AdminPlayersPage';
import {
  CAN_WRITE_FILES,
  deletePlayer,
  fileItem,
  savePlayer,
} from './playerFiles';
import { type ItemInfo, KIND_LABEL, itemKey, useAllItems } from './playerItems';
import { usePlayerList } from './playerSession';

/** The Parts Library instrument a player captures on. */
const CAPTURE_INSTRUMENT: Partial<Record<BandInstrument, PartInstrument>> = {
  drums: 'drums',
  percussion: 'drums',
  bass: 'bass',
  guitar: 'guitar',
};

/**
 * One player: who they are, the grooves, lines, patterns and parts they play
 * (each opening in its own editor), filing more under them, and capturing a
 * new part as them — it opens in the Parts editor, already theirs.
 */
export const AdminPlayerPage = () => {
  const { id = '' } = useParams<{ id: string }>();
  const players = usePlayerList();
  const player = players.find((p) => p.id === id);
  if (!player)
    return (
      <div className="text-sm text-muted-foreground">
        No player with id <span className="tabular-nums">{id}</span>.
      </div>
    );
  return <PlayerView key={player.id} player={player} players={players} />;
};

const PlayerView = ({
  player,
  players,
}: {
  player: Player;
  players: readonly Player[];
}) => {
  const navigate = useNavigate();
  const items = useAllItems();
  const parts = usePartList();
  const store = useInstrumentStore();
  const [draft, setDraft] = useState(player);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState('');
  const [showAll, setShowAll] = useState(false);
  useEffect(() => setDraft(player), [player]);
  const dirty =
    draft.name !== player.name ||
    draft.instrument !== player.instrument ||
    (draft.genre ?? '') !== (player.genre ?? '') ||
    (draft.description ?? '') !== (player.description ?? '');

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const ownerOf = (item: PlayerItem) =>
    players.find((p) =>
      p.items.some((i) => i.kind === item.kind && i.id === item.id),
    );

  const mine = player.items
    .map((item) => items.get(itemKey(item)))
    .filter((i): i is ItemInfo => Boolean(i));
  const missing = player.items.filter((item) => !items.has(itemKey(item)));

  // What could be filed under them: their instrument first; the rest on asking.
  const candidates = [...items.values()]
    .filter((i) => !player.items.some((m) => itemKey(m) === itemKey(i.item)))
    .filter((i) => showAll || i.instrument === player.instrument)
    .sort(
      (a, b) =>
        Number(b.genre === player.genre) - Number(a.genre === player.genre) ||
        a.name.localeCompare(b.name),
    );

  const capture = () =>
    run(async () => {
      const instrument = CAPTURE_INSTRUMENT[player.instrument] ?? 'piano';
      const taken = new Set(parts.map((p) => p.id));
      const n = player.items.filter((i) => i.kind === 'part').length + 1;
      const name = `${player.name} · take ${n}`;
      const part = {
        ...blankPart(uniquePartId(name, taken), name, instrument),
        ...(player.genre && player.genre !== 'theory'
          ? { genre: player.genre }
          : {}),
      };
      await store.save('instrument_part', part);
      await savePlayer(withItem(player, { kind: 'part', id: part.id }));
      navigate(
        `${AdminRoutes.part({ id: part.id })}?capture=1&player=${player.id}`,
      );
    });

  const input =
    'rounded-md border border-white/10 bg-white/5 px-2 py-1 text-sm';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to={AdminRoutes.players()}
          className="text-muted-foreground hover:text-white"
          aria-label="All players"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <span className="grid size-9 place-items-center rounded-full bg-white/10 text-sm font-semibold">
          {player.name
            .split(/[-\s]+/)
            .slice(0, 2)
            .map((w) => w[0])
            .join('')}
        </span>
        <input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          className="min-w-0 flex-1 bg-transparent text-xl font-semibold outline-none"
          aria-label="Player name"
        />
        {CAN_WRITE_FILES && (
          <>
            <Button
              size="sm"
              disabled={!dirty || busy}
              onClick={() => void run(() => savePlayer(draft))}
            >
              Save
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Delete ${player.name}`}
              onClick={() => {
                if (
                  window.confirm(
                    `Delete ${player.name}? Their ${player.items.length} item(s) stay in the libraries, unfiled.`,
                  )
                )
                  void run(async () => {
                    await deletePlayer(player.id);
                    navigate(AdminRoutes.players());
                  });
              }}
            >
              <Trash2 />
            </Button>
          </>
        )}
      </div>
      {error && <p className="text-sm text-red-300">{error}</p>}

      <div className={cn(CONSOLE_PANEL, 'flex flex-wrap items-end gap-4 p-3')}>
        <label className="flex flex-col gap-1">
          <span className={CONSOLE_LABEL}>Plays</span>
          <select
            value={draft.instrument}
            onChange={(e) =>
              setDraft({
                ...draft,
                instrument: e.target.value as BandInstrument,
              })
            }
            className={input}
          >
            {BAND_INSTRUMENTS.map((i) => (
              <option key={i.id} value={i.id}>
                {i.label} ({PLAYER_ROLE[i.id]})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={CONSOLE_LABEL}>Genre</span>
          <input
            value={draft.genre ?? ''}
            onChange={(e) =>
              setDraft({ ...draft, genre: e.target.value || undefined })
            }
            className={cn(input, 'w-32')}
          />
        </label>
        <label className="flex min-w-64 flex-1 flex-col gap-1">
          <span className={CONSOLE_LABEL}>About</span>
          <input
            value={draft.description ?? ''}
            onChange={(e) =>
              setDraft({ ...draft, description: e.target.value || undefined })
            }
            placeholder="Feel, influences, what they're good for"
            className={input}
          />
        </label>
        <ConsoleBadge tone="neutral">Placeholder</ConsoleBadge>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          onClick={() => void capture()}
          disabled={!CAN_WRITE_FILES || busy}
        >
          <Circle className="fill-red-500 text-red-500" /> Capture a new part
        </Button>
        <span className="text-xs text-muted-foreground">
          Opens a new {genreLabel(player.genre)} part as {player.name} in the
          Parts editor: press Capture there and play.
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-white/[0.08]">
        <div className={cn(CONSOLE_LABEL, 'px-4 py-2')}>
          Plays · {mine.length}
        </div>
        {mine.length === 0 && (
          <p className="px-4 pb-3 text-sm italic text-muted-foreground">
            Nothing filed under {player.name} yet.
          </p>
        )}
        {mine.map((info) => (
          <div
            key={itemKey(info.item)}
            className="flex items-center gap-3 border-t border-white/[0.06] px-4 py-2 text-sm"
          >
            <Link to={info.href} className="min-w-0 flex-1 hover:underline">
              <span className="font-medium">{info.name}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {info.kindLabel}
                {info.genre && ` · ${genreLabel(info.genre)}`}
              </span>
            </Link>
            <ConsoleBadge tone={info.status === 'live' ? 'success' : 'warning'}>
              {info.status === 'live' ? 'Published' : 'Draft'}
            </ConsoleBadge>
            {CAN_WRITE_FILES && (
              <button
                type="button"
                aria-label={`Take ${info.name} off ${player.name}`}
                title="Unfile — it stays in its library"
                className="text-muted-foreground hover:text-white"
                onClick={() =>
                  void run(() => savePlayer(withoutItem(player, info.item)))
                }
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        ))}
        {missing.length > 0 && (
          <p className="border-t border-white/[0.06] px-4 py-2 text-xs text-amber-300">
            {missing.length} item(s) filed here are no longer in their
            libraries: {missing.map((m) => m.id).join(', ')}.
          </p>
        )}
      </div>

      {CAN_WRITE_FILES && (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={adding}
            onChange={(e) => setAdding(e.target.value)}
            className={cn(input, 'max-w-xl')}
            aria-label="File an item under this player"
          >
            <option value="">File a groove, line, pattern or part here…</option>
            {(['groove', 'bassLine', 'comping', 'part'] as const).map(
              (kind) => {
                const options = candidates.filter((c) => c.item.kind === kind);
                if (!options.length) return null;
                return (
                  <optgroup key={kind} label={`${KIND_LABEL[kind]}s`}>
                    {options.map((c) => {
                      const owner = ownerOf(c.item);
                      return (
                        <option key={itemKey(c.item)} value={itemKey(c.item)}>
                          {c.name}
                          {c.genre ? ` · ${genreLabel(c.genre)}` : ''}
                          {owner ? ` — now with ${owner.name}` : ''}
                        </option>
                      );
                    })}
                  </optgroup>
                );
              },
            )}
          </select>
          <Button
            size="sm"
            variant="secondary"
            disabled={!adding || busy}
            onClick={() => {
              const info = items.get(adding);
              if (!info) return;
              void run(async () => {
                await fileItem(info.item, player.id);
                setAdding('');
              });
            }}
          >
            <Plus /> File here
          </Button>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
            />
            Other instruments too
          </label>
        </div>
      )}
    </div>
  );
};
