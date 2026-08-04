/**
 * Eras tab — the 7 musical eras. Selecting one emits a `globe:era:<id>` launch
 * tile that filters the globe timeline to that era. No embed (era slides are
 * text-forward, tinted by the era's accent color at seed time).
 */
import { PickerResultList } from './PickerResultList';
import { eraItems, type PickedTile } from './catalog';

interface ErasTabProps {
  onSelect: (tile: PickedTile) => void;
}

export const ErasTab = ({ onSelect }: ErasTabProps) => (
  <div className="flex flex-col pt-1">
    <PickerResultList
      items={eraItems()}
      onPick={(item) =>
        onSelect({
          module: item.module,
          activityRef: item.ref,
          label: { en: item.title },
        })
      }
      emptyText="No eras."
    />
  </div>
);
