import * as Y from 'yjs';
import {
  COLLAB_UNDO_KEYS,
  type CollabUndoKey,
} from '@/daw/persistence/projectDocument/fields';

// ── What undo covers in a shared session ───────────────────────────────────
//
// In a room, undo is the Yjs undo manager's: it undoes this student's own
// changes to the shared document and leaves everyone else's. Its scope comes
// from the project registry, as solo undo's does: every key that is both
// undoable and shared, through the part of the document that holds it.
//
// A few such keys aren't in the room's document yet (the Lead Sheet's layout,
// the Score's spellings, breaks and text, the clip colour mode): collab sync
// itself doesn't carry them, so there is nothing to undo there. They are
// listed with null until the sync milestone (1.14) puts them in the document.
//
// A part of the document can hold keys outside undo too (the prism map holds
// the genre beside the key; the mastering map, the Bypass switch). The bridge
// marks a transaction that changed no undoable key (UNDOABLE_META), and the
// undo manager doesn't capture it.

/** A shared type of the room's document, by kind and name. */
type DocType = readonly ['array' | 'map', string];

/**
 * Where each shared undoable key lives in the room's document (see
 * YjsDocManager and diffEngine), or null while the document doesn't hold it.
 */
export const COLLAB_UNDO_TYPES: {
  readonly [K in CollabUndoKey]: DocType | null;
} = Object.freeze({
  bpm: ['map', 'transport'],
  timeSignatureNumerator: ['map', 'transport'],
  timeSignatureDenominator: ['map', 'transport'],
  tracks: ['array', 'tracks'],
  rootNote: ['map', 'prism'],
  mode: ['map', 'prism'],
  chordRegions: ['array', 'chordRegions'],
  markers: ['array', 'markers'],
  sections: ['array', 'sections'],
  masterVolume: ['map', 'mastering'],
  masteringFxChain: ['map', 'mastering'],
  masteringEffects: ['map', 'mastering'],
  masterAutomation: ['map', 'mastering'],
  returns: ['map', 'mastering'],
  leadSheetRepeats: ['map', 'leadSheet'],
  scoreChordTracks: ['map', 'leadSheet'],
  scoreChordHidden: ['map', 'leadSheet'],
  scoreArticulations: ['map', 'leadSheet'],
  scoreSlurs: ['map', 'leadSheet'],
  scoreSlashNotes: ['map', 'leadSheet'],
  measuresPerLine: null,
  measureRowSizes: null,
  measureRestMap: null,
  measureFermatas: null,
  leadSheetBars: null,
  scoreSpellings: null,
  scoreSystemBreaks: null,
  scorePageBreaks: null,
  scoreSystemRuns: null,
  scoreTextMarks: null,
  clipColorMode: null,
} satisfies { readonly [K in CollabUndoKey]: DocType | null });

/** The shared types collab undo watches, each once. */
export function collabUndoScope(doc: Y.Doc): Y.AbstractType<unknown>[] {
  const scope = new Map<string, Y.AbstractType<unknown>>();
  for (const key of COLLAB_UNDO_KEYS) {
    const type = COLLAB_UNDO_TYPES[key];
    if (!type || scope.has(type[1])) continue;
    const [kind, name] = type;
    scope.set(
      name,
      (kind === 'array'
        ? doc.getArray(name)
        : doc.getMap(name)) as Y.AbstractType<unknown>,
    );
  }
  return [...scope.values()];
}

/**
 * The transaction meta key the bridge sets to false on a local change that
 * undo doesn't cover: no undoable key changed, or the write was the editor's
 * own (a seed, an upload's stamp).
 */
export const UNDOABLE_META = 'ma:undoable';

/** What an undo step made of changes to these shared types is called. */
export function collabLabelFor(names: readonly string[]): string {
  if (names.includes('prism')) return 'Change key';
  if (names.includes('transport')) return 'Change tempo';
  if (names.includes('chordRegions')) return 'Edit chords';
  if (names.includes('markers')) return 'Edit markers';
  if (names.includes('sections')) return 'Edit sections';
  if (names.includes('mastering')) return 'Edit master';
  if (names.includes('leadSheet')) return 'Edit score';
  return 'Edit tracks';
}
