/**
 * Globe tab — reuses the Home Dashboard "Pathways" shelf (GlobePathways) in
 * selection mode, so the picker shows the exact dashboard cards. Selecting a
 * pathway emits a `globe:pathway:<id>` launch tile.
 */
import { GlobePathways } from '@/components/ClassroomLayout/globe/GlobePathways';
import { globePathwayRef } from '../../../slides/contentRefs';
import type { PickedTile, SlideMediaEmbed } from './catalog';

interface GlobeTabProps {
  onSelect: (tile: PickedTile, embed?: SlideMediaEmbed) => void;
}

export const GlobeTab = ({ onSelect }: GlobeTabProps) => (
  <div className="max-h-[52vh] overflow-y-auto px-5 pb-5 pt-2">
    <GlobePathways
      onSelectPathway={(id, title) =>
        onSelect(
          {
            module: 'globe',
            activityRef: globePathwayRef(id),
            label: { en: title },
          },
          // Also embed the dashboard-style globe preview for this pathway.
          { media: { type: 'globePathway', pathwayId: id } },
        )
      }
    />
  </div>
);
