import { useRef } from 'react';
import { useEscapeLayer } from '@/components/atlas/hooks/useEscapeLayer';
import { usePanelFocus } from './usePanelFocus';

/** What a panel zone (the Inspector, the phone's sheet) shows. */
export interface PanelZoneSlot {
  /** Identity of what it shows; a change is new content, not a re-open. */
  key: string;
  /** Escape and the close button both close it this way. */
  onClose: () => void;
}

/**
 * A panel zone owns its focus and its Escape: opening moves focus to the
 * panel's heading, closing returns it, and Escape closes it.
 */
export function usePanelZone<T extends HTMLElement>(
  slot: PanelZoneSlot | null,
) {
  const ref = useRef<T>(null);
  usePanelFocus(ref, slot !== null, slot?.key ?? null);
  useEscapeLayer(slot !== null, () => slot?.onClose());
  return ref;
}
