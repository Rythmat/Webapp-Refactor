import type { PhaseKey } from '../phases';
import type { LocalizedText } from '../types';
import type { Slide } from './types';

// ── A lesson's six sections (owner, 2026-11-09) ─────────────────────────────
// Every lesson runs Connect → Showcase → Group Project → Individual Project →
// Present → Reflect. The sections are a layer OVER the five IMPACT phases,
// not a replacement: the phase stays the key interactions are stored under,
// the key published snapshots are walked by, and the key the server and the
// live socket carry. Connect and Showcase share the first phase; every other
// section is one phase. So a slide's section can always be worked out from a
// lesson saved before sections existed, and nothing saved has to migrate.

export const SECTIONS = [
  'connect',
  'showcase',
  'groupProject',
  'individualProject',
  'present',
  'reflect',
] as const;

export type SlideSection = (typeof SECTIONS)[number];

/** The phase a section's slides (and their interactions) live under. */
export const SECTION_PHASE: Readonly<Record<SlideSection, PhaseKey>> = {
  connect: 'connectRegulate',
  showcase: 'connectRegulate',
  groupProject: 'groupPractice',
  individualProject: 'creativeProjects',
  present: 'presentPerform',
  reflect: 'respondReflectReset',
};

/** The section a phase's slides fall in when nothing says otherwise. */
export const PHASE_SECTION: Readonly<Record<PhaseKey, SlideSection>> = {
  connectRegulate: 'connect',
  groupPractice: 'groupProject',
  creativeProjects: 'individualProject',
  presentPerform: 'present',
  respondReflectReset: 'reflect',
};

/** Student-facing names, on every slide's chip. */
export const SECTION_LABEL: Readonly<Record<SlideSection, LocalizedText>> = {
  connect: { en: 'Connect', es: 'Conecta' },
  showcase: { en: 'Showcase', es: 'Muestra' },
  groupProject: { en: 'Group Project', es: 'Proyecto grupal' },
  individualProject: { en: 'Individual Project', es: 'Proyecto individual' },
  present: { en: 'Present', es: 'Presenta' },
  reflect: { en: 'Reflect', es: 'Reflexiona' },
};

/** What each section is for, in the teacher's words (editor headers). */
export const SECTION_HINT: Readonly<Record<SlideSection, string>> = {
  connect: 'How everyone is arriving',
  showcase: 'Who, what or where we explore',
  groupProject: 'Making something together',
  individualProject: 'Each student on their own work',
  present: 'Sharing what was made',
  reflect: 'Looking back, resetting the room',
};

export const isSlideSection = (value: unknown): value is SlideSection =>
  typeof value === 'string' && (SECTIONS as readonly string[]).includes(value);

export const sectionIndex = (section: SlideSection): number =>
  SECTIONS.indexOf(section);

/** 1-based, for "1 · Connect". */
export const sectionNumber = (section: SlideSection): number =>
  sectionIndex(section) + 1;

/** Presets that only ever spotlight something: a Showcase slide by design. */
const SHOWCASE_PRESETS = new Set(['artist-spotlight', 'showcase', 'portrait']);

/**
 * The section a slide belongs in.
 *
 * A slide authored since sections exist says so (`slide.section`). One saved
 * before has only its phase, and the first phase holds two sections; the
 * Showcase ones are the slides that spotlight something by construction — a
 * listening (`media`) slide, the artist-spotlight preset, or the default
 * deck's Showcase placeholder. Everything else in that phase is Connect.
 * Deliberately narrow: a Connect slide that happens to carry a song picture
 * stays Connect, rather than jumping sections and looking out of order.
 */
export const sectionOf = (
  slide: Pick<Slide, 'phase' | 'kind' | 'id' | 'presetId'> & {
    section?: SlideSection;
  },
): SlideSection => {
  if (slide.section && SECTION_PHASE[slide.section] === slide.phase) {
    return slide.section;
  }
  if (slide.phase === 'connectRegulate') {
    if (
      slide.kind === 'media' ||
      (slide.presetId && SHOWCASE_PRESETS.has(slide.presetId)) ||
      slide.id.endsWith('-slide-showcase')
    ) {
      return 'showcase';
    }
    return 'connect';
  }
  return PHASE_SECTION[slide.phase];
};

/** Whether the slides run in section order (the soft invariant). */
export const slidesAreSectionOrdered = (slides: readonly Slide[]): boolean => {
  let last = -1;
  for (const slide of slides) {
    const at = sectionIndex(sectionOf(slide));
    if (at < last) return false;
    last = at;
  }
  return true;
};

/** The slides in section order, keeping their order within a section. */
export const sortSlidesBySection = (slides: readonly Slide[]): Slide[] =>
  slides
    .map((slide, i) => ({ slide, i, at: sectionIndex(sectionOf(slide)) }))
    .sort((a, b) => a.at - b.at || a.i - b.i)
    .map((x) => x.slide);

/**
 * Where a new slide for `section` goes: after the section's last slide, or —
 * for an empty section — before the first slide of any later section.
 */
export const sectionInsertIndex = (
  slides: readonly Slide[],
  section: SlideSection,
): number => {
  const target = sectionIndex(section);
  let at = 0;
  slides.forEach((slide, i) => {
    if (sectionIndex(sectionOf(slide)) <= target) at = i + 1;
  });
  return at;
};

export interface SectionGroup {
  section: SlideSection;
  /** The section's slides, with their index in the deck. */
  slides: { slide: Slide; index: number }[];
}

/** All six sections, each with its slides (in deck order), empty ones too. */
export const groupSlidesBySection = (
  slides: readonly Slide[],
): SectionGroup[] => {
  const groups = SECTIONS.map(
    (section): SectionGroup => ({ section, slides: [] }),
  );
  slides.forEach((slide, index) => {
    groups[sectionIndex(sectionOf(slide))].slides.push({ slide, index });
  });
  return groups;
};

/** Every section a phase holds, named together: "Connect & Showcase" for
 *  the first phase, the one section's name for the rest. For places that
 *  speak about a whole phase (its notes, its block in a preview). */
export const phaseSectionsLabel = (phase: PhaseKey): LocalizedText => {
  const held = SECTIONS.filter((s) => SECTION_PHASE[s] === phase);
  return {
    en: held.map((s) => SECTION_LABEL[s].en).join(' & '),
    es: held.map((s) => SECTION_LABEL[s].es).join(' y '),
  };
};

/** A phase by its lesson section's name: for activities and seeds, which
 *  carry a phase ("Connect", "Group Project"…). */
export const phaseSectionLabel = (phase: PhaseKey): LocalizedText =>
  SECTION_LABEL[PHASE_SECTION[phase]];
