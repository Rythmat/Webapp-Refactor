import type { SlideSection } from '../../slides/sections';
import type { SlideTemplateId } from '../../slides/templates/slideTemplates';
import type { FeelingsLevel, InteractionType } from '../../types';

// ── What each section's "Add" offers (owner, 2026-11-09) ────────────────────
// A slide is added INTO a section, so the menu offers what that section is
// for: Connect asks how students arrive, Showcase spotlights someone or
// somewhere from the app, the projects send students into Learn, the Studio
// or the Globe, Present shares the work, Reflect closes the lesson. Every
// section also takes a blank slide. Pure data; the filmstrip renders it.

export type SectionAddOption =
  /** A slide seeded from app content (opens the content picker). */
  | { kind: 'template'; templateId: SlideTemplateId; label: string }
  /** A slide that asks students something. */
  | {
      kind: 'response';
      type: InteractionType;
      label: string;
      /** For a feelings check-in. */
      level?: FeelingsLevel;
      /** Shared on the projector (anonymised) once the teacher reveals it. */
      shareable?: boolean;
    }
  /** The Studio, in pairs or solo. */
  | { kind: 'studio'; grouping: 'pairs' | 'solo'; label: string }
  /** Students offer their project; the teacher features one. */
  | { kind: 'share'; label: string }
  /** The room reset checklist. */
  | { kind: 'reset'; label: string }
  | { kind: 'blank'; label: string };

const blank: SectionAddOption = { kind: 'blank', label: 'Blank slide' };

export const SECTION_ADD_OPTIONS: Readonly<
  Record<SlideSection, readonly SectionAddOption[]>
> = {
  connect: [
    {
      kind: 'response',
      type: 'check-in',
      level: 'simple',
      label: 'Feelings check-in',
    },
    { kind: 'response', type: 'choice', label: 'Poll', shareable: true },
    { kind: 'response', type: 'text', label: 'Question', shareable: true },
    { kind: 'template', templateId: 'song', label: 'Song of the day' },
    blank,
  ],
  showcase: [
    { kind: 'template', templateId: 'song', label: 'Song or artist' },
    { kind: 'template', templateId: 'pathways', label: 'Genre tour' },
    { kind: 'template', templateId: 'regionsCities', label: 'Region or city' },
    { kind: 'template', templateId: 'events', label: 'Event in history' },
    { kind: 'template', templateId: 'eras', label: 'Era' },
    { kind: 'template', templateId: 'genre', label: 'Genre lesson' },
    blank,
  ],
  groupProject: [
    { kind: 'studio', grouping: 'pairs', label: 'Studio in pairs' },
    { kind: 'template', templateId: 'theory', label: 'Learn lesson together' },
    { kind: 'template', templateId: 'studio', label: 'Studio tutorial' },
    { kind: 'template', templateId: 'pathways', label: 'Globe tour' },
    {
      kind: 'response',
      type: 'text',
      label: 'Turn and talk',
      shareable: true,
    },
    blank,
  ],
  individualProject: [
    { kind: 'studio', grouping: 'solo', label: 'Studio on my own' },
    { kind: 'template', templateId: 'studio', label: 'Studio tutorial' },
    { kind: 'template', templateId: 'theory', label: 'Learn lesson' },
    { kind: 'template', templateId: 'genre', label: 'Genre lesson' },
    blank,
  ],
  present: [
    { kind: 'share', label: 'Share your work' },
    {
      kind: 'response',
      type: 'text',
      label: 'Progress question',
      shareable: false,
    },
    blank,
  ],
  reflect: [
    {
      kind: 'response',
      type: 'text',
      label: 'Exit question',
      shareable: true,
    },
    {
      kind: 'response',
      type: 'check-in',
      level: 'simple',
      label: 'Feelings check-out',
    },
    { kind: 'reset', label: 'Reset the room' },
    blank,
  ],
};
