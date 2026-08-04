/**
 * AppRoutePanel — authors an app-route slide's destination. The slide routes
 * students into a real Music Atlas module via an `atlas`-type Interaction; this
 * panel lets a teacher pick that destination with the ContentPickerDialog.
 * onChange routes through `setSlideInteractions`, which writes the interaction
 * into the slide's phase cell AND repoints the slide's `interactionId` in one
 * transaction, so no dangling reference is produced.
 */
import { X } from 'lucide-react';
import { useState } from 'react';
import { newInteractionId } from '../../slides/deckEdit';
import type { Interaction, LocalizedText } from '../../types';
import { ContentPickerDialog } from './contentPicker/ContentPickerDialog';
import type { PickedTile } from './contentPicker/catalog';

interface AppRoutePanelProps {
  interactions: Interaction[];
  onChange: (interactions: Interaction[]) => void;
}

export const AppRoutePanel = ({
  interactions,
  onChange,
}: AppRoutePanelProps) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const current = interactions.find((i) => i.type === 'atlas' && i.atlas);

  const setDestination = (tile: PickedTile) => {
    const question: LocalizedText = tile.label ?? { en: 'Open the activity' };
    const interaction: Interaction = {
      id: current?.id ?? newInteractionId(),
      type: 'atlas',
      question,
      shareable: false,
      atlas: {
        module: tile.module,
        activityRef: tile.activityRef,
        expects: 'completion',
      },
    };
    onChange([interaction]);
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs uppercase tracking-wider text-white/40">
        Destination
      </span>
      {current?.atlas ? (
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
          <span className="uppercase tracking-wide text-[#7ecfcf]">
            {current.atlas.module}
          </span>
          <span className="min-w-0 flex-1 truncate text-white/80">
            {current.question?.en ?? current.atlas.activityRef}
          </span>
          <button
            type="button"
            onClick={() => onChange([])}
            aria-label="Remove destination"
            className="text-white/40 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <p className="text-[11px] text-white/45">
          No destination yet — pick where this slide sends students.
        </p>
      )}
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="inline-flex w-fit items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-sm text-white/70 hover:border-white/25 hover:text-white"
      >
        {current ? 'Change content' : 'Choose content'}
      </button>
      <ContentPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={setDestination}
      />
    </div>
  );
};
