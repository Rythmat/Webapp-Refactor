import { isSectionType } from '@/daw/model/sections';
import { useStore } from '@/daw/store';
import { snapTicks, timelineSnapGrid } from '@/daw/time/timeModel';
import { promptDialog } from '@/daw/ui/DialogHost';
import type { AllGridSize } from '@/daw/utils/quantize';
import type { CanvasMenuTarget } from './canvasMenuStore';
import {
  copyClip,
  createClipAt,
  cutClip,
  deleteClipStep,
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
import {
  changeSectionType,
  deleteSection,
  duplicateSection,
  insertSection,
  loopSection,
  openSongFormLesson,
  renameSection,
} from '../sections/sectionActions';

// ── What a canvas menu item does (milestone 2.12) ──────────────────────────
//
// The ids clipMenuModel gives its items, each to its action. Clip actions
// are clipActions' (one undo step each), a section's sectionActions'
// (milestone 2.13); a marker's are here, moved from the Timeline's old menu.

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

/** A section menu's item: its verb, and the kind for the sub-menus. */
function runSectionItem(sectionId: string, id: string): boolean {
  const [verb, arg] = id.split(':');
  switch (verb) {
    case 'renameSection':
      void renameSection(sectionId);
      return true;
    case 'sectionType':
      if (!isSectionType(arg)) return false;
      changeSectionType(sectionId, arg);
      return true;
    case 'duplicateSection':
      return duplicateSection(sectionId);
    case 'loopSection':
      loopSection(sectionId);
      return true;
    case 'insertBefore':
    case 'insertAfter':
      if (!isSectionType(arg)) return false;
      void insertSection(
        sectionId,
        verb === 'insertBefore' ? 'before' : 'after',
        arg,
      );
      return true;
    case 'deleteSection':
      deleteSection(sectionId);
      return true;
    case 'learnSections':
      openSongFormLesson();
      return true;
    default:
      return false;
  }
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
  if (target.kind === 'section') return runSectionItem(target.sectionId, id);
  if (target.kind === 'lane') {
    if (id === 'paste') {
      return pasteClipboard({
        trackId: target.trackId,
        tick: snapTicks(target.tick, timelineSnapGrid(useStore.getState())),
      });
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
      return deleteClipStep(ref);
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
      // Where the clip was right-clicked, else where it starts.
      const found = findClip(useStore.getState(), ref);
      suggestChordsAt(
        target.tick ?? (found?.midi ?? found?.audio)?.startTick ?? 0,
        ref.trackId,
      );
      return true;
    }
    default:
      return false;
  }
}
