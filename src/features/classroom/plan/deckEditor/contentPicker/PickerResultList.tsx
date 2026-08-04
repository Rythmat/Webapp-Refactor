/**
 * Shared result list for the content picker tabs. Renders `PickableItem` rows
 * with a thumbnail, disables any item whose ref/label would trip the publish
 * firewall (with an explanation), and calls `onPick` on select.
 */
import { AlertTriangle, Music } from 'lucide-react';
import { refFirewallCollision } from '../../../slides/contentRefs';
import type { PickableItem, PickableThumb } from './catalog';

interface PickerResultListProps {
  items: PickableItem[];
  onPick: (item: PickableItem) => void;
  emptyText: string;
}

export const PickerResultList = ({
  items,
  onPick,
  emptyText,
}: PickerResultListProps) => (
  <ul className="max-h-[46vh] min-h-32 overflow-y-auto px-2 pb-3">
    {items.map((item) => {
      const collision = refFirewallCollision(item.ref, item.title);
      return (
        <li key={item.key}>
          <button
            type="button"
            disabled={!!collision}
            onClick={() => onPick(item)}
            title={
              collision
                ? `Can't link yet — the reference contains “${collision}”, which the publisher blocks.`
                : undefined
            }
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <Thumb thumb={item.thumb} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-white">
                {item.title}
              </span>
              {item.subtitle && (
                <span className="block truncate text-xs text-white/50">
                  {item.subtitle}
                </span>
              )}
            </span>
            {collision && (
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400/80" />
            )}
          </button>
        </li>
      );
    })}
    {items.length === 0 && (
      <li className="px-3 py-8 text-center text-sm text-white/45">
        {emptyText}
      </li>
    )}
  </ul>
);

const Thumb = ({ thumb }: { thumb?: PickableThumb }) => {
  if (thumb?.imageUrl) {
    return (
      <img
        src={thumb.imageUrl}
        alt=""
        loading="lazy"
        className="h-9 w-9 shrink-0 rounded-lg object-cover"
      />
    );
  }
  if (thumb?.emoji) {
    return (
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-lg">
        {thumb.emoji}
      </span>
    );
  }
  return (
    <span
      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/[0.06]"
      style={thumb?.color ? { backgroundColor: `${thumb.color}22` } : undefined}
    >
      {thumb?.color ? (
        <span
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: thumb.color }}
        />
      ) : (
        <Music className="h-4 w-4 text-white/40" />
      )}
    </span>
  );
};
