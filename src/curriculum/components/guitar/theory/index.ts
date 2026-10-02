// Guitar theory UI: the Beato-derived knowledge layer around Book One
// (docs/guitar-atlas/design/beato-knowledge-spec.md §3). Display only.

export {
  ChordFamilyStrip,
  type ChordFamilyStripProps,
} from './ChordFamilyStrip';
export { ChordJobsBadge, type ChordJobsBadgeProps } from './ChordJobsBadge';
export { GuitarKeyIntro, type GuitarKeyIntroProps } from './GuitarKeyIntro';
export {
  GuitarSectionBCard,
  type GuitarSectionBCardProps,
} from './GuitarSectionBCard';
export {
  GuitarKeyNotes,
  GuitarStepNotes,
  type GuitarKeyNotesProps,
  type GuitarStepNotesProps,
} from './GuitarStepNotes';
export {
  GuitarTheoryPanel,
  type GuitarTheoryPanelProps,
} from './GuitarTheoryPanel';
export {
  GuitarTheoryToggles,
  type GuitarTheoryTogglesProps,
} from './GuitarTheoryToggles';
export {
  MusicMapOverlay,
  musicMapOverlayModel,
  type MapBarMark,
  type MapChipSegment,
  type MusicMapOverlayModel,
  type MusicMapOverlayProps,
} from './MusicMapOverlay';
export { BlockLabel, DisclosureHeading, InfoItem, NoteCard } from './noteParts';
export { SameRootCompare, type SameRootCompareProps } from './SameRootCompare';
export { TheoryPopover, type PopoverNote } from './TheoryPopover';
export {
  CHANGE_PREFIXES,
  familyChips,
  isSectionBCardDue,
  markSectionBCardSeen,
  noteSeenId,
  patternChipText,
  patternNoteId,
  rankInfoNotes,
  sectionBCardBarreCare,
  sectionBCardSeenId,
  sharedNotesText,
  stepTheoryNotes,
  toTheoryStep,
  type FamilyChip,
  type StepTheoryNotes,
} from './theoryUi';
