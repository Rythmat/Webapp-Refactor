import { ShortcutSheet } from './ShortcutSheet';
import { useShortcutsNotice } from './shortcutsNotice';
import { useShortcutSheetStore } from './useShortcutSheetStore';

// DawApp mounts this once. '?' (help.shortcuts) and the notice's Show
// shortcuts open the sheet; the sheet is mounted only while open.

export interface ShortcutSheetHostProps {
  userId: string | null;
  /** Whose editor it is is known (DawApp's ownerKnown). */
  ownerKnown: boolean;
}

export function ShortcutSheetHost({
  userId,
  ownerKnown,
}: ShortcutSheetHostProps) {
  const isOpen = useShortcutSheetStore((s) => s.isOpen);
  const close = useShortcutSheetStore((s) => s.close);
  useShortcutsNotice(userId, ownerKnown);
  if (!isOpen) return null;
  return (
    <ShortcutSheet
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    />
  );
}
