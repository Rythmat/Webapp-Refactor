import { useStore } from '@/daw/store';
import { withTransaction } from '@/daw/store/history';
import { promptDialog } from '@/daw/ui/DialogHost';
import type { AllGridSize } from '@/daw/utils/quantize';
import type { CanvasMenuTarget } from './canvasMenuStore';
import {
  copyClip,
  createClipAt,
  cutClip,
  deleteClip,
  duplicateClip,
  findClip,
  openPrismFor,
  pasteClipboard,
  quantizeClip,
  renameClip,
  splitClipAtPlayhead,
  suggestChordsAt,
  toggleClipFade,
  toggleClipMute,
  transposeClip,
} from './clipActions';

// ── What a canvas menu item does (milestone 2.12) ──────────────────────────
//
// The ids clipMenuModel gives its items, each to its action. Clip actions
// are clipActions' (one undo step each); a marker's are here, moved from the
// Timeline's old menu.

async function renameMarker(markerId: string): Promise<void> {
  const marker = useStore.getState().markers.find((m) => m.id === markerId);
  if (!marker) return;
  const name = await promptDialog({
    title: 'Rename marker',
    label: 'Marker name',
    defaultValue: marker.name,
    confirmLabel: 'Rename',
    validate: (value) => (value.trim() ? null : 'Type a name for it.'),
  });
  // The marker may have gone while the dialog was open.
  if (name === null || !name.trim()) return;
  if (!useStore.getState().markers.some((m) => m.id === markerId)) return;
  useStore.getState().updateMarker(markerId, { name: name.trim() });
}

function addMarker(tick: number): void {
  const state = useStore.getState();
  state.addMarker(tick, `Marker ${state.markers.length + 1}`);
}

/**
 * Does what item `id` of the menu opened on `target` says. True when it
 * acted: a refused transpose (notes off the keyboard) and an id it doesn't
 * know don't.
 */
export function runCanvasMenuItem(
  target: CanvasMenuTarget,
  id: string,
): boolean {
  if (target.kind === 'marker') {
    if (id === 'renameMarker') void renameMarker(target.markerId);
    else if (id === 'deleteMarker') {
      useStore.getState().removeMarker(target.markerId);
    } else return false;
    return true;
  }
  if (target.kind === 'ruler') {
    if (id !== 'addMarker') return false;
    addMarker(target.tick);
    return true;
  }
  if (target.kind === 'lane') {
    if (id === 'paste') {
      return pasteClipboard({ trackId: target.trackId, tick: target.tick });
    }
    if (id === 'createClip') {
      return createClipAt(target.trackId, target.tick) !== null;
    }
    if (id === 'prism:suggest') {
      suggestChordsAt(target.tick, target.trackId);
      return true;
    }
    return false;
  }

  const ref = { trackId: target.trackId, clipId: target.clipId };
  const [verb, arg] = id.split(':');
  switch (verb) {
    case 'cut':
      return cutClip(ref);
    case 'copy':
      return copyClip(ref);
    case 'paste':
      return pasteClipboard({ trackId: ref.trackId });
    case 'delete':
      return withTransaction('Delete clip', () => deleteClip(ref));
    case 'duplicate':
      return duplicateClip(ref);
    case 'rename':
      void renameClip(ref);
      return true;
    case 'split':
      return splitClipAtPlayhead(ref);
    case 'mute':
      return toggleClipMute(ref);
    case 'transpose':
      return transposeClip(ref, Number(arg));
    case 'quantize':
      return quantizeClip(
        ref,
        (arg === 'grid'
          ? useStore.getState().timelineGridSize
          : arg) as AllGridSize,
      );
    case 'fadeIn':
      return toggleClipFade(ref, 'in');
    case 'fadeOut':
      return toggleClipFade(ref, 'out');
    case 'prism': {
      if (arg === 'open') {
        openPrismFor(ref.trackId);
        return true;
      }
      if (arg !== 'suggest') return false;
      const found = findClip(useStore.getState(), ref);
      suggestChordsAt(
        (found?.midi ?? found?.audio)?.startTick ?? 0,
        ref.trackId,
      );
      return true;
    }
    default:
      return false;
  }
}
