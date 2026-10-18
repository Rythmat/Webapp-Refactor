import { shareClipAudio } from '@/daw/audio/AudioBufferStore';
import { LearnRoutes } from '@/constants/routes';
import { seekTo } from '@/daw/hooks/useTransport';
import { mintNoteId } from '@/daw/model/noteIds';
import {
  newSectionId,
  relabelForType,
  sectionName,
  sectionTypeOfLabel,
  type SectionType,
  type SongSection,
} from '@/daw/model/sections';
import { useStore } from '@/daw/store';
import { withTransaction } from '@/daw/store/history';
import {
  arrangementBlocker,
  duplicateSectionEdit,
  insertSectionEdit,
  type ArrangementEdit,
  type Mint,
} from '@/daw/time/arrangementEdits';
import { ticksPerBar, timeSignatureOf } from '@/daw/time/timeModel';
import { promptDialog } from '@/daw/ui/DialogHost';
import { toast } from '@/hooks/use-toast';

// ── What the sections lane does (milestone 2.13) ───────────────────────────
//
// Every action on the song's sections, from the lane's + Section, a
// section's menu and its keys: each change is one undo step with a label
// that says what it did. Duplicate and Insert move the whole song after the
// section (arrangementEdits.ts), so they wait while a collaborator holds a
// track or a take is recording, and say why.

/** Learn → Songs, where the song charts show how songs are built. */
export const SONG_FORM_ROUTE = LearnRoutes.root(undefined, { tab: 'Songs' });

/** Every new id an arrangement edit needs. */
const mint: Mint = (kind) => {
  switch (kind) {
    case 'note':
      return mintNoteId();
    case 'section':
      return newSectionId();
    case 'region':
      return crypto.randomUUID();
    case 'clip':
      return `clip-${crypto.randomUUID().slice(0, 8)}`;
  }
};

export function findSection(id: string): SongSection | null {
  return useStore.getState().sections.find((s) => s.id === id) ?? null;
}

/** Asks for a section's name in the app's dialog; null when cancelled. */
async function askName(
  title: string,
  confirmLabel: string,
  defaultValue = '',
): Promise<string | null> {
  const name = await promptDialog({
    title,
    label: 'Section name',
    description: 'For example Verse 2, Hook or Ending.',
    defaultValue,
    confirmLabel,
    maxLength: 24,
    validate: (value) => (value.trim() ? null : 'Type a name for it.'),
  });
  const trimmed = name?.trim();
  return trimmed ? trimmed : null;
}

/** A new section of `type` after the last one; its id. */
export function addSectionOfType(type: SectionType): string {
  return withTransaction('Add section', () =>
    useStore.getState().addSection({ type, label: sectionName(type) }),
  );
}

/** A new section with a name the student types; its id, or null. */
export async function addNamedSection(): Promise<string | null> {
  const label = await askName('Name the section', 'Add');
  if (label === null) return null;
  return withTransaction('Add section', () =>
    useStore.getState().addSection({ type: sectionTypeOfLabel(label), label }),
  );
}

/**
 * Renames the section. A name that names a kind makes it that kind ("Verse 2"
 * is a verse), as the Lead Sheet's rename does; any other name keeps its
 * kind.
 */
export async function renameSection(id: string): Promise<void> {
  const section = findSection(id);
  if (!section) return;
  const label = await askName('Rename section', 'Rename', section.label);
  // The section may have gone while the dialog was open.
  if (label === null || label === findSection(id)?.label) return;
  if (!findSection(id)) return;
  const type = sectionTypeOfLabel(label);
  withTransaction('Rename section', () =>
    useStore
      .getState()
      .updateSection(id, type === 'custom' ? { label } : { label, type }),
  );
}

/**
 * Makes the section another kind: one still named after its kind takes the
 * new kind's name; a name the student gave it stays.
 */
export function changeSectionType(id: string, type: SectionType): void {
  const section = findSection(id);
  if (!section || section.type === type) return;
  withTransaction('Change section type', () =>
    useStore
      .getState()
      .updateSection(id, { type, label: relabelForType(section, type) }),
  );
}

/** Deletes the section; its bars and the clips on them stay. */
export function deleteSection(id: string): void {
  if (!findSection(id)) return;
  withTransaction('Delete section', () =>
    useStore.getState().removeSection(id),
  );
}

/** Moves the playhead to the section's start. */
export function seekToSection(id: string): void {
  const section = findSection(id);
  if (section) seekTo(section.startTick);
}

/** Whether the loop is on over exactly this section. */
export function loopsSection(
  state: {
    loopEnabled: boolean;
    loopStart: number;
    loopEnd: number;
  },
  section: Pick<SongSection, 'startTick' | 'endTick'>,
): boolean {
  return (
    state.loopEnabled &&
    state.loopStart === section.startTick &&
    state.loopEnd === section.endTick
  );
}

/**
 * Loops the section (the loop region becomes it and loop turns on), or,
 * when it already loops exactly this section, turns the loop off.
 */
export function loopSection(id: string): void {
  const section = findSection(id);
  if (!section) return;
  const s = useStore.getState();
  if (loopsSection(s, section)) {
    s.setLoopEnabled(false);
    return;
  }
  s.setLoopRange(section.startTick, section.endTick);
  s.setLoopEnabled(true);
}

/**
 * Makes the section one bar longer or shorter from its end (the keys);
 * a section that meets the next one moves that one's start too.
 */
export function stepSectionEnd(id: string, bars: 1 | -1): void {
  const section = findSection(id);
  if (!section) return;
  const bar = ticksPerBar(timeSignatureOf(useStore.getState()));
  withTransaction('Resize section', () =>
    useStore.getState().resizeSection(id, 'end', section.endTick + bars * bar),
  );
}

/** Says why the whole song can't be edited now, or null when it can. */
export function arrangementRefusal(): string | null {
  return arrangementBlocker(useStore.getState());
}

/**
 * Writes an arrangement edit as one undo step, through the store's action
 * (so a shared session gets it too), then shares its audio.
 */
function applyEdit(label: string, edit: ArrangementEdit | null): boolean {
  if (!edit) return false;
  withTransaction(label, () =>
    useStore.getState().applyArrangementPatch(edit.patch),
  );
  for (const { from, to } of edit.sharedAudio) shareClipAudio(from, to);
  return true;
}

/** True, having said why, when the song can't be edited now. */
function refused(): boolean {
  const reason = arrangementRefusal();
  if (reason === null) return false;
  toast({
    title: 'Not now',
    description: reason,
    variant: 'destructive',
  });
  return true;
}

/**
 * Plays the section twice: its length is inserted after it, everything
 * later moves on, and what plays in it is copied into the gap.
 */
export function duplicateSection(id: string): boolean {
  if (!findSection(id) || refused()) return false;
  return applyEdit(
    'Duplicate section',
    duplicateSectionEdit(useStore.getState(), id, mint),
  );
}

/**
 * Inserts 8 empty bars before or after the section, everything later moving
 * on, and a new section of `type` over them. 'custom' asks for its name.
 */
export async function insertSection(
  id: string,
  where: 'before' | 'after',
  type: SectionType,
): Promise<boolean> {
  if (!findSection(id) || refused()) return false;
  let label = sectionName(type);
  if (type === 'custom') {
    const typed = await askName('Name the section', 'Insert');
    // The dialog takes time: check again before moving the song.
    if (typed === null || !findSection(id) || refused()) return false;
    label = typed;
  }
  return applyEdit(
    'Insert section',
    insertSectionEdit(
      useStore.getState(),
      id,
      where,
      { type: type === 'custom' ? sectionTypeOfLabel(label) : type, label },
      mint,
    ),
  );
}

/** Opens Learn → Songs in a new tab, keeping the project open. */
export function openSongFormLesson(): void {
  window.open(SONG_FORM_ROUTE, '_blank', 'noopener');
}
