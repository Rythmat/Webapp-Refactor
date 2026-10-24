import { isSectionType } from '@/daw/model/sections';
import { useStore } from '@/daw/store';
import { snapTicks, timelineSnapGrid } from '@/daw/time/timeModel';
import type { AllGridSize } from '@/daw/utils/quantize';
import type { CanvasMenuTarget } from './canvasMenuStore';
import {
  copyClip,
  createClipAt,
  cutClip,
  deleteClipStep,
  duplicateClip,
  findClip,
  pasteClipboard,
  quantizeClip,
  renameClip,
  splitClipAtPlayhead,
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
import { addMarkerAt, deleteMarker, renameMarker } from '../markerActions';
import { usePromptBarStore } from '../../prompt/promptBarStore';
import { prismSelectionAt } from '../../prompt/promptSpot';
import { deleteChords, editChord, insertChordAt } from '../chordActions';

// ── What a canvas menu item does (milestone 2.12) ──────────────────────────
//
// The ids clipMenuModel gives its items, each to its action, one undo step
// each: a clip's are clipActions', a section's sectionActions' and a
// marker's markerActions' (milestone 2.13).

/**
 * Prism (owner, 2026-10-24: the prompt bar is the new Prism): the bar open
 * on bars of the track, highlighted on the timeline, from the bar
 * right-clicked (prismSelectionAt) — its suggestions, and the part it
 * writes into the track, that track's kind (Drums, Bass, Chords).
 */
function openPrismAt(tick: number, trackId: string): void {
  const bar = usePromptBarStore.getState();
  bar.select(
    prismSelectionAt(useStore.getState(), tick, trackId, bar.selection),
  );
  bar.expand();
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
    case 'prompt': {
      // The prompt bar on the whole section, for its chords or a part.
      const section = useStore
        .getState()
        .sections.find((s) => s.id === sectionId);
      if (!section) return false;
      usePromptBarStore.getState().askAt({
        tick: section.startTick,
        trackId: null,
        lengthTicks: section.endTick - section.startTick,
      });
      return true;
    }
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
    else if (id === 'deleteMarker') deleteMarker(target.markerId);
    else return false;
    return true;
  }
  if (target.kind === 'ruler') {
    if (id !== 'addMarker') return false;
    void addMarkerAt(target.tick);
    return true;
  }
  if (target.kind === 'section') return runSectionItem(target.sectionId, id);
  if (target.kind === 'chordLane') {
    if (id !== 'insertChord') return false;
    return insertChordAt(target.tick) !== null;
  }
  if (target.kind === 'chord') {
    if (id === 'editChord') {
      editChord(target.chordId);
      return true;
    }
    if (id === 'insertChord') return insertChordAt(target.tick) !== null;
    if (id !== 'deleteChord') return false;
    const { selectedChordIds } = useStore.getState();
    return deleteChords(
      selectedChordIds.includes(target.chordId)
        ? selectedChordIds
        : [target.chordId],
    );
  }
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
    if (id === 'prism') {
      openPrismAt(target.tick, target.trackId);
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
      // Where the clip was right-clicked, else where it starts.
      const found = findClip(useStore.getState(), ref);
      openPrismAt(
        target.tick ?? (found?.midi ?? found?.audio)?.startTick ?? 0,
        ref.trackId,
      );
      return true;
    }
    default:
      return false;
  }
}
