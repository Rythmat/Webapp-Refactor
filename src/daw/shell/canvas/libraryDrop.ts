import { toast } from '@/hooks/use-toast';
import { DRAG_MIME, type DragPayload } from '@/daw/data/libraryItems';
import { importMidiToTracks } from '@/daw/midi/importMidiToTracks';

// ── Drops on the timeline (milestone 2.14, plan finding F11) ───────────────
//
// What the canvas (and an empty project's first steps, which cover it) take
// when something is dropped on them:
// - a Library row: its item, at the bar under the pointer, on the lane's
//   track when it fits there, else on a new track (addItem, with the song's
//   key and tempo rules). Drag is the Library's second way in; + is the
//   first.
// - a .mid file: a Synth track per track of the file, in one undo step, as
//   Import MIDI file… does.
// Nothing ever wrote the Library's drag data before 2.14, so the drop's old
// branches (instruments, track templates, samples, MIDI loops from a URL)
// could never run; they went with it.

/** Where a drop lands: the track whose lane it is on (or none), and a bar. */
export interface DropTarget {
  trackId: string | null;
  /** The bar line's tick. */
  tick: number;
}

/** Whether a drag carries something the timeline takes. */
export function acceptsDrop(e: React.DragEvent): boolean {
  const types = e.dataTransfer?.types ?? [];
  return types.includes(DRAG_MIME) || types.includes('Files');
}

/** dragover: say the drop copies, or refuse what the timeline doesn't take. */
export function onTimelineDragOver(e: React.DragEvent): void {
  if (!acceptsDrop(e)) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
}

function payloadOf(e: React.DragEvent): DragPayload | null {
  const raw = e.dataTransfer.getData(DRAG_MIME);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DragPayload;
  } catch {
    return null;
  }
}

/** A drop at `target`: a Library row, or a .mid file. */
export async function dropOnTimeline(
  e: React.DragEvent,
  target: DropTarget,
): Promise<void> {
  e.preventDefault();
  const payload = payloadOf(e);
  if (payload) {
    if (payload.kind !== 'library-item') return;
    // The Library's chunk is loaded: the drag started in it.
    const { dropLibraryItem } = await import(
      '@/daw/shell/inspector/browser/addItem'
    );
    await dropLibraryItem(payload.itemId, target);
    return;
  }
  const file = e.dataTransfer.files[0];
  if (!file || !/\.midi?$/i.test(file.name)) return;
  try {
    await importMidiToTracks(await file.arrayBuffer());
  } catch (err) {
    console.warn('[timeline] MIDI file drop failed', err);
    toast({
      title: 'That MIDI file couldn’t be read',
      description: file.name,
      variant: 'destructive',
    });
  }
}
