/**
 * Studio tab — the Studio Basics lessons, then the DAW project-template
 * starters. A lesson emits a `studio:tutorial:<id>` launch tile that opens the
 * editor on the course's demo song with that lesson running; a template, a
 * `studio:template:<id>` tile that opens the editor seeded with it.
 */
import { PickerResultList } from './PickerResultList';
import {
  studioLessonItems,
  studioTemplateItems,
  type PickedTile,
} from './catalog';

interface StudioTabProps {
  onSelect: (tile: PickedTile) => void;
}

export const StudioTab = ({ onSelect }: StudioTabProps) => (
  <div className="flex flex-col pt-1">
    <PickerResultList
      items={[...studioLessonItems(), ...studioTemplateItems()]}
      onPick={(item) =>
        onSelect({
          module: item.module,
          activityRef: item.ref,
          label: { en: item.title },
        })
      }
      emptyText="No Studio lessons or templates."
    />
  </div>
);
