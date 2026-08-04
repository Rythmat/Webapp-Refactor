/**
 * Studio tab — the DAW project-template starters. Selecting one emits a
 * `studio:template:<id>` launch tile that opens the Studio editor seeded with
 * that template.
 */
import { PickerResultList } from './PickerResultList';
import { studioTemplateItems, type PickedTile } from './catalog';

interface StudioTabProps {
  onSelect: (tile: PickedTile) => void;
}

export const StudioTab = ({ onSelect }: StudioTabProps) => (
  <div className="flex flex-col pt-1">
    <PickerResultList
      items={studioTemplateItems()}
      onPick={(item) =>
        onSelect({
          module: item.module,
          activityRef: item.ref,
          label: { en: item.title },
        })
      }
      emptyText="No Studio templates."
    />
  </div>
);
