/* eslint-disable react/jsx-sort-props */
/**
 * Who plays an item: an optional player, chosen from the players of the
 * item's instrument first. Choosing one files the item under them (and takes
 * it from anyone else); "No player" leaves it unfiled.
 */

import { Link } from 'react-router-dom';
import { AdminRoutes } from '@/constants/routes';
import type { BandInstrument } from '@/curriculum/engine/band/band';
import type { PlayerItem } from '@/curriculum/engine/players/player';
import { CONSOLE_LABEL } from '../ui/styles';
import { CAN_WRITE_FILES, fileItem } from './playerFiles';
import { usePlayerList } from './playerSession';

interface Props {
  item: PlayerItem;
  /** The instrument whose players come first. */
  instrument?: BandInstrument;
}

export const PlayerPicker = ({ item, instrument }: Props) => {
  const players = usePlayerList();
  const current = players.find((p) =>
    p.items.some((i) => i.kind === item.kind && i.id === item.id),
  );
  const own = players.filter((p) => !instrument || p.instrument === instrument);
  const others = players.filter((p) => !own.includes(p));

  return (
    <label className="flex flex-col gap-1">
      <span className={CONSOLE_LABEL}>
        Player
        {current && (
          <Link
            to={AdminRoutes.player({ id: current.id })}
            className="ml-1.5 normal-case tracking-normal text-white/50 hover:text-white hover:underline"
          >
            open
          </Link>
        )}
      </span>
      <select
        value={current?.id ?? ''}
        disabled={!CAN_WRITE_FILES}
        onChange={(e) => {
          void fileItem(item, e.target.value || null).catch((err) =>
            window.alert(err instanceof Error ? err.message : String(err)),
          );
        }}
        className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-sm"
      >
        <option value="">No player</option>
        <optgroup label={instrument ? 'This instrument' : 'Players'}>
          {own.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </optgroup>
        {others.length > 0 && instrument && (
          <optgroup label="Other instruments">
            {others.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </label>
  );
};
