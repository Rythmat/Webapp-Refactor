/**
 * SlideInteractionPanel — authors the interactions a Question slide surfaces.
 * Wraps the reused `InteractionEditor`; the parent routes onChange through
 * `setSlideInteractions`, which writes the interaction objects into the slide's
 * phase cell AND repoints the slide's `interactionIds` in one transaction, so
 * no dangling reference is ever produced.
 */
import type { Interaction } from '../../types';
import { InteractionEditor } from '../InteractionEditor';

interface SlideInteractionPanelProps {
  interactions: Interaction[];
  onChange: (interactions: Interaction[]) => void;
}

export const SlideInteractionPanel = ({
  interactions,
  onChange,
}: SlideInteractionPanelProps) => (
  <div className="flex flex-col gap-2">
    <span className="text-xs uppercase tracking-wider text-white/40">
      Question / interaction
    </span>
    <InteractionEditor interactions={interactions} onChange={onChange} />
  </div>
);
