/* eslint-disable react/jsx-sort-props */
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AdminRoutes } from '@/constants/routes';
import {
  BAND_INSTRUMENTS,
  type BandInstrument,
  bandIdFrom,
} from '@/curriculum/engine/band/band';
import { PLAYER_ROLE, type Player } from '@/curriculum/engine/players/player';
import { ConsoleCallout } from '../ui/ConsoleCallout';
import { ConsolePageHeader } from '../ui/ConsolePageHeader';
import { CONSOLE_LABEL } from '../ui/styles';
import { CAN_WRITE_FILES, savePlayer } from './playerFiles';
import { usePlayerList } from './playerSession';

/** A genre id as people write it: 'hip-hop' → 'Hip-Hop', 'rnb' → 'R&B'. */
export const genreLabel = (genre: string | undefined) =>
  !genre
    ? 'No genre'
    : genre === 'rnb'
      ? 'R&B'
      : genre
          .split('-')
          .map((w) => w[0].toUpperCase() + w.slice(1))
          .join('-');

/** The instruments the grid shows as columns, in band order. */
const COLUMNS: BandInstrument[] = ['drums', 'bass', 'keys', 'guitar'];

/**
 * The players, as a genre × instrument grid: who sits in each chair, and how
 * many grooves, lines, patterns and parts each has. A new player goes in any
 * chair; the generic ones ('Latin-Bassist-1') are where everyone starts.
 */
export const AdminPlayersPage = () => {
  const players = usePlayerList();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [instrument, setInstrument] = useState<BandInstrument>('drums');
  const [genre, setGenre] = useState('');

  const genres = [...new Set(players.map((p) => p.genre ?? ''))];
  const columns = [
    ...COLUMNS,
    ...BAND_INSTRUMENTS.map((i) => i.id).filter(
      (i) => !COLUMNS.includes(i) && players.some((p) => p.instrument === i),
    ),
  ];

  const add = async () => {
    const base = bandIdFrom(name.trim());
    const taken = new Set(players.map((p) => p.id));
    let id = base;
    for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
    const player: Player = {
      id,
      name: name.trim(),
      instrument,
      ...(genre ? { genre } : {}),
      kind: 'placeholder',
      order: Math.max(0, ...players.map((p) => p.order ?? 0)) + 10,
      items: [],
    };
    try {
      await savePlayer(player);
      navigate(AdminRoutes.player({ id }));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err));
    }
  };

  const control =
    'rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm';

  return (
    <div className="flex flex-col gap-5">
      <ConsolePageHeader
        title="Players"
        description={
          <>
            The players in the bands: one per instrument per genre to start,
            each with the grooves, bass lines, comping and parts they play. Open
            a player to see their parts, file more under them, or capture a new
            one as them. A player is always optional — a part plays with or
            without one.
          </>
        }
      />

      {!CAN_WRITE_FILES && (
        <ConsoleCallout tone="info">
          Players are saved as repo files, so changes work on the local dev
          server (npm run dev).
        </ConsoleCallout>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New player, e.g. Funk-Drummer-2"
          className={`${control} w-72`}
          aria-label="New player name"
          disabled={!CAN_WRITE_FILES}
        />
        <select
          value={instrument}
          onChange={(e) => setInstrument(e.target.value as BandInstrument)}
          className={control}
          aria-label="Instrument"
        >
          {BAND_INSTRUMENTS.map((i) => (
            <option key={i.id} value={i.id}>
              {PLAYER_ROLE[i.id]}
            </option>
          ))}
        </select>
        <select
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          className={control}
          aria-label="Genre"
        >
          <option value="">No genre</option>
          {genres.filter(Boolean).map((g) => (
            <option key={g} value={g}>
              {genreLabel(g)}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          onClick={() => void add()}
          disabled={!CAN_WRITE_FILES || !name.trim()}
        >
          <Plus /> New player
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-white/[0.08]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.08] text-left">
              <th className={`${CONSOLE_LABEL} px-3 py-2`}>Genre</th>
              {columns.map((c) => (
                <th key={c} className={`${CONSOLE_LABEL} px-3 py-2`}>
                  {PLAYER_ROLE[c]}s
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {genres.map((g) => (
              <tr key={g} className="border-t border-white/[0.06] align-top">
                <td className="px-3 py-2 font-medium">{genreLabel(g)}</td>
                {columns.map((c) => (
                  <td key={c} className="px-3 py-2">
                    <div className="flex flex-col gap-1">
                      {players
                        .filter(
                          (p) => (p.genre ?? '') === g && p.instrument === c,
                        )
                        .map((p) => (
                          <Link
                            key={p.id}
                            to={AdminRoutes.player({ id: p.id })}
                            className="flex items-baseline gap-1.5 hover:underline"
                          >
                            <span className="truncate">{p.name}</span>
                            <span
                              className={`shrink-0 text-xs tabular-nums ${p.items.length ? 'text-white/60' : 'text-white/30'}`}
                            >
                              {p.items.length}
                            </span>
                          </Link>
                        ))}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
