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
import { Button } from '@/daw/ui/Button';
import type { InteractionType, LaunchTile } from '../../types';
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
  /** Optional: picking a student-response component adds a new question slide. */
  onAddResponse?: (type: InteractionType) => void;
}

export const ChooseContentButton = ({
  tiles,
  onChange,
  onEmbedMedia,
  onAddResponse,
}: ChooseContentButtonProps) => {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <>
      <Button variant="pill" size="pill" onClick={() => setPickerOpen(true)}>
        <Plus aria-hidden />
        Choose content
      </Button>

      <ContentPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(tile, embed) => {
          onChange([...tiles, { id: tileUid(), ...tile }]);
          if (embed) onEmbedMedia?.(embed);
        }}
        onAddResponse={onAddResponse}
      />
    </>
  );
};
