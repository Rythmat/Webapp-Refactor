/**
 * ChooseContentButton — the slide editor's toolbar affordance for attaching Atlas
 * content to the selected content slide. Opens the ContentPickerDialog so a
 * teacher picks an EXACT item (a Theory activity, a song, or a globe pathway);
 * the picker emits a student-safe, resolvable launch tile (and, for a pathway, a
 * globe preview to embed as the slide's media). The chosen tiles render on the
 * slide via LaunchTileRowEditor — this control only adds them.
 */
import { Plus } from 'lucide-react';
import { useState } from 'react';
import type { LaunchTile } from '../../types';
import { ContentPickerDialog } from './contentPicker/ContentPickerDialog';
import type { SlideMediaEmbed } from './contentPicker/catalog';

const tileUid = (): string =>
  `lt-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36).slice(-4)}`;

interface ChooseContentButtonProps {
  tiles: LaunchTile[];
  onChange: (tiles: LaunchTile[]) => void;
  /** Optional: some picks embed media alongside the tile (content slides only) —
   *  a pathway → globe preview; a song → its YouTube video + artist image. */
  onEmbedMedia?: (embed: SlideMediaEmbed) => void;
}

export const ChooseContentButton = ({
  tiles,
  onChange,
  onEmbedMedia,
}: ChooseContentButtonProps) => {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-sm text-white/80 transition-colors hover:border-white/25 hover:text-white"
      >
        <Plus className="h-4 w-4" />
        Choose content
      </button>

      <ContentPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(tile, embed) => {
          onChange([...tiles, { id: tileUid(), ...tile }]);
          if (embed) onEmbedMedia?.(embed);
        }}
      />
    </>
  );
};
