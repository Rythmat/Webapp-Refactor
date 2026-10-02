import type { ComponentType } from 'react';
import type { ContentKind } from '@/hooks/data/admin/useAdminContent';
import { ARTIST_KEYS, ArtistFields } from './ArtistFields';
import { LABEL_KEYS, LabelFields } from './LabelFields';
import { PLACE_KEYS, PlaceFields } from './PlaceFields';
import {
  PROGRESSION_KEYS,
  PROGRESSION_READ_ONLY_KEYS,
  ProgressionFields,
} from './ProgressionFields';
import { RELEASE_KEYS, ReleaseFields } from './ReleaseFields';
import { STUDIO_KEYS, StudioFields } from './StudioFields';
import type { RecordEditorProps } from './shared';

/**
 * The record field editors (design §3.3 "Record editors", phase D): one per
 * record kind, each a `StructuredEditor` over the item's body, so the same
 * component is the kind's editor (a KindSpec's `StructuredEditor`, its
 * `keys` the `structuralKeys`) and the Table row panel's Details section —
 * there with `readOnly` where nothing can be saved (repo mode, design §3.4).
 *
 * Each Field carries a `data-field` anchor naming the body keys it edits;
 * `fieldSelector(path)` finds it, for a cell click or a suggestion's Replace.
 *
 * Console-only and heavy (the pickers read every artist, city and song):
 * load this module through `lazy()` or from code that already is, never from
 * the eager console chrome.
 */

export interface RecordEditor {
  /** A `StructuredEditor` too: `readOnly` is optional. */
  Editor: ComponentType<RecordEditorProps>;
  /** The body keys it writes; everything else stays in the JSON pane. */
  keys: readonly string[];
}

export const RECORD_EDITORS = {
  artist: { Editor: ArtistFields, keys: ARTIST_KEYS },
  release: { Editor: ReleaseFields, keys: RELEASE_KEYS },
  studio: { Editor: StudioFields, keys: STUDIO_KEYS },
  label: { Editor: LabelFields, keys: LABEL_KEYS },
  globe_city: { Editor: PlaceFields, keys: PLACE_KEYS },
  chord_progression: { Editor: ProgressionFields, keys: PROGRESSION_KEYS },
} satisfies Partial<Record<ContentKind, RecordEditor>>;

/** The record editor for any content kind, or undefined when it has none. */
export const recordEditorFor = (kind: ContentKind): RecordEditor | undefined =>
  Object.prototype.hasOwnProperty.call(RECORD_EDITORS, kind)
    ? (RECORD_EDITORS as Partial<Record<ContentKind, RecordEditor>>)[kind]
    : undefined;

export {
  ArtistFields,
  BORN_ARTIST_LEVEL,
  BornFields,
  bornDateProblem,
} from './ArtistFields';
export { LabelFields } from './LabelFields';
export { PlaceFields } from './PlaceFields';
export { ProgressionFields } from './ProgressionFields';
export { ReleaseFields } from './ReleaseFields';
export { fieldSelector, type RecordEditorProps } from './shared';
export { StudioFields } from './StudioFields';
export {
  ARTIST_KEYS,
  LABEL_KEYS,
  PLACE_KEYS,
  PROGRESSION_KEYS,
  PROGRESSION_READ_ONLY_KEYS,
  RELEASE_KEYS,
  STUDIO_KEYS,
};
