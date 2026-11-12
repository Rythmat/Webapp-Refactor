/**
 * The layout presets, derived from the teacher's own decks.
 *
 * A preset is a ZONE PLAN, not a set of elements. Elements stay derived —
 * `migrateSlideV1` reads the slide's own `title`/`prompt`/`body`/`media`/tiles
 * and asks the preset only WHERE each one goes. That is what keeps a single
 * source of truth: the editor patches slide-level fields and every surface sees
 * the change immediately. Authored elements would make the two diverge, and the
 * editor has no element-mode path yet (P2 task 8).
 *
 * `presetId` is therefore authoring-time sugar: a snapshot carrying an id this
 * build does not recognise falls back to the derived layout rather than
 * rendering blank, which is why `presetFor` returns undefined instead of
 * throwing.
 *
 * Provenance: "Template General Lesson Slide Deck.pptx" (ten slides), the song
 * session and genre lesson templates, and the Idea Bank spotlight arc.
 */
import type { ZoneName } from '../slideGrid';
import type { SlideKind } from '../types';

/**
 * Kinds whose MIDDLE BAND is owned by the surface, not the author.
 *
 * `SlideStage` paints the live layer — the student's input, the projected
 * question, the showcase frame, the pairing action — only over an EMPTY band
 * (`hasBandContent`). A preset that puts body copy or a picture in the band of
 * one of these kinds silently removes the thing the slide exists for. Any
 * preset listing one of these kinds must be `bandFree`, and `presets.test.ts`
 * asserts it.
 */
export const LIVE_LAYER_KINDS: readonly SlideKind[] = [
  'interaction',
  'app-route',
  'studio-collab',
  'showcase',
];

/**
 * `'off'` HIDES the field rather than dropping it.
 *
 * A preset has to say what happens to content it has no zone for, or the
 * unplaced field falls through to its derived zone and produces a
 * mixed-families layout — a hero image beside a body column, say, which
 * `validateLayout` refuses. Hiding (not deleting) means switching preset back
 * restores the copy: the slide keeps its fields, the preset decides what shows.
 */
export type ZonePlacement<T> = T | 'off';

export interface PresetZones {
  /** Where the slide's visuals go, in order. */
  visuals?: ZonePlacement<readonly ZoneName[]>;
  /** Where the title goes, when not its own `title` zone (the Showcase's
   *  name sits over its photo). */
  title?: ZoneName;
  /** Where body copy goes. */
  body?: ZonePlacement<ZoneName>;
  /** Where launch tiles go. */
  tiles?: ZonePlacement<ZoneName>;
  /** `'off'` hides the prompt rather than dropping it. */
  subtitle?: 'off';
  /**
   * Hide the title element. `SlideCommon.title` is REQUIRED and
   * `migrateSlideV1` always emits it, but `CENTRESTACK_EXCLUDES` forbids a
   * title on a centre-stack slide — so the centre-stack presets hide it rather
   * than producing a layout `validateLayout` refuses. `validateLayout` skips
   * hidden elements, and the title survives in the slide for the day the
   * teacher switches preset back.
   */
  hideTitle?: boolean;
}

export interface SlidePreset {
  id: SlidePresetId;
  /** Editor-facing name. */
  label: string;
  /** Slide kinds this preset may be applied to. */
  kinds: readonly SlideKind[];
  /** True when the preset authors NOTHING into the middle band. */
  bandFree: boolean;
  /** Draw the left accent bar (a slide flag — `accentBar` is a chrome zone). */
  accentBar?: boolean;
  /**
   * Where the live layer goes, when not in the middle band: a chrome zone of
   * its own beside the slide's content (the portrait's check-in, bottom
   * left). A preset that has one may author into the band and still claim a
   * live-layer kind: the two never share space.
   */
  liveRect?: ZoneName;
  zones: PresetZones;
}

const ALL_KINDS: readonly SlideKind[] = [
  'content',
  'media',
  'interaction',
  'app-route',
  'studio-collab',
  'showcase',
];

/** Kinds whose band the author owns. */
const AUTHORED_KINDS: readonly SlideKind[] = ['content', 'media'];

export const PRESETS = {
  // ── Band-free: title/subtitle only, the band left to the surface ─────────
  title: {
    id: 'title',
    label: 'Title',
    kinds: ALL_KINDS,
    bandFree: true,
    zones: { subtitle: 'off', body: 'off', tiles: 'off', visuals: 'off' },
  },
  section: {
    id: 'section',
    label: 'Section break',
    kinds: ALL_KINDS,
    bandFree: true,
    zones: { body: 'off', tiles: 'off', visuals: 'off' },
  },
  question: {
    id: 'question',
    label: 'Question',
    kinds: ['interaction'],
    bandFree: true,
    zones: { body: 'off', tiles: 'off', visuals: 'off' },
  },
  'greeting-check-in': {
    id: 'greeting-check-in',
    label: 'Greeting / check-in',
    kinds: ['interaction'],
    bandFree: true,
    zones: { body: 'off', tiles: 'off', visuals: 'off' },
  },
  // pptx slide 3 — "Turn & Talk / Parar y anotar", the questions answered on
  // student devices. Band-free so the input has somewhere to render.
  'turn-and-talk': {
    id: 'turn-and-talk',
    label: 'Turn & talk',
    kinds: ['interaction'],
    bandFree: true,
    zones: { body: 'off', tiles: 'off', visuals: 'off' },
  },
  // pptx slide 9 — "Sharing Project Drafts". The showcase frame owns the band.
  'share-day': {
    id: 'share-day',
    label: 'Share day',
    kinds: ['showcase', 'content'],
    bandFree: true,
    zones: { body: 'off', tiles: 'off', visuals: 'off' },
  },
  // pptx slide 7 — "Personal Project Time". The launch affordance owns the band.
  'personal-project-time': {
    id: 'personal-project-time',
    label: 'Personal project time',
    kinds: ['app-route', 'studio-collab', 'content'],
    bandFree: true,
    zones: { body: 'off', tiles: 'off', visuals: 'off' },
  },

  // ── Authored band ───────────────────────────────────────────────────────
  media: {
    id: 'media',
    label: 'Full-bleed media',
    kinds: AUTHORED_KINDS,
    bandFree: false,
    zones: {
      visuals: ['heroMedia'],
      subtitle: 'off',
      body: 'off',
      tiles: 'off',
    },
  },
  // pptx slide 2 — "Sonic Spotlight": the artist/video left, the copy right.
  'artist-spotlight': {
    id: 'artist-spotlight',
    label: 'Artist spotlight',
    kinds: AUTHORED_KINDS,
    bandFree: false,
    zones: { visuals: ['mediaLeft'], body: 'right', tiles: 'right' },
  },
  // The lesson's Showcase (owner, 2026-11-10): the globe on the left half,
  // flying to the subject's place, the photo on the right with the name and
  // the facts over its foot. The two visuals are painted by the stage as
  // chrome (`halfLeft` / `halfRight`), so their elements stay hidden here.
  showcase: {
    id: 'showcase',
    label: 'Showcase',
    kinds: AUTHORED_KINDS,
    bandFree: false,
    zones: {
      title: 'captionTitle',
      visuals: 'off',
      subtitle: 'off',
      body: 'captionBody',
      tiles: 'captionBody',
    },
  },
  // ── The stage presets (owner, 2026-11-10: one idea per slide, no extra
  // text). Each paints one thing big; `slides/stage.ts` says how.
  //
  // `hero`: the live layer alone, centred and large: the question (or the
  // class's activity) is the slide.
  hero: {
    id: 'hero',
    label: 'Big question',
    kinds: ['interaction', 'app-route', 'studio-collab', 'showcase'],
    bandFree: true,
    zones: {
      hideTitle: true,
      subtitle: 'off',
      body: 'off',
      tiles: 'off',
      visuals: 'off',
    },
  },
  // `bleed`: the slide's visual, edge to edge (a video, a globe). On an
  // interaction slide the question is asked on the students' devices only.
  bleed: {
    id: 'bleed',
    label: 'Full screen',
    kinds: ['content', 'media', 'interaction'],
    bandFree: true,
    zones: {
      hideTitle: true,
      subtitle: 'off',
      body: 'off',
      tiles: 'off',
      visuals: 'off',
    },
  },
  // `portrait`: the subject's photo edge to edge, the name and a short bio
  // over its darkened left side.
  portrait: {
    id: 'portrait',
    label: 'Portrait',
    kinds: AUTHORED_KINDS,
    bandFree: false,
    zones: {
      title: 'portraitTitle',
      visuals: 'off',
      subtitle: 'off',
      body: 'portraitBody',
      tiles: 'off',
    },
  },
  // The portrait with the class's check-in (owner, 2026-11-10: the check-in
  // on the Showcase's first page, a slider at its bottom left).
  'portrait-check-in': {
    id: 'portrait-check-in',
    label: 'Portrait + check-in',
    kinds: ['interaction'],
    bandFree: false,
    liveRect: 'checkInLive',
    zones: {
      title: 'checkInTitle',
      visuals: 'off',
      subtitle: 'off',
      body: 'checkInBody',
      tiles: 'off',
    },
  },
  // A song beside the class's questions (owner, 2026-11-12): the video on
  // the left half (painted by the stage, `SPLIT_MEDIA_RECT`), the questions on
  // the right, answered on the students' devices.
  'listen-questions': {
    id: 'listen-questions',
    label: 'Song + questions',
    kinds: ['interaction'],
    bandFree: true,
    liveRect: 'halfRight',
    zones: {
      hideTitle: true,
      visuals: 'off',
      subtitle: 'off',
      body: 'off',
      tiles: 'off',
    },
  },
  'chord-chart': {
    id: 'chord-chart',
    label: 'Chord chart',
    kinds: AUTHORED_KINDS,
    bandFree: false,
    zones: {
      visuals: ['heroMedia'],
      subtitle: 'off',
      body: 'off',
      tiles: 'off',
    },
  },
  // pptx slide 5 — "The Grid", the rhythmic table of time.
  //
  // The spec names this "hero + footer draw", but it deliberately does NOT
  // claim `interaction`. Two reasons, both current: the draw overlay has no
  // renderer (`drawTargetElementId` is declared, re-keyed and published, and
  // nothing consumes it — P11 owns that), and a hero fills the middle band, so
  // an interaction slide using this preset would have its live layer
  // suppressed and leave the student with no way to answer. Add `interaction`
  // here only once the draw overlay renders at the hero's rect.
  'rhythm-grid': {
    id: 'rhythm-grid',
    label: 'Rhythm grid',
    kinds: AUTHORED_KINDS,
    bandFree: false,
    zones: {
      visuals: ['heroMedia'],
      subtitle: 'off',
      body: 'off',
      tiles: 'off',
    },
  },
  'tone-set': {
    id: 'tone-set',
    label: 'Tone set',
    kinds: AUTHORED_KINDS,
    bandFree: false,
    zones: { visuals: ['mediaLeft'], body: 'right', tiles: 'right' },
  },
  // pptx slide 6 — "Group Practice: Class Project" + the project-menu tiles.
  'group-practice': {
    id: 'group-practice',
    label: 'Group practice',
    kinds: AUTHORED_KINDS,
    bandFree: false,
    zones: { body: 'bodyShort', tiles: 'tileRow', visuals: 'off' },
  },
  // pptx slide 4 — "IMPACT Practice Objectives", What / Why / How as three
  // rows against the accent bar.
  objectives: {
    id: 'objectives',
    label: 'Objectives',
    kinds: AUTHORED_KINDS,
    bandFree: false,
    accentBar: true,
    // The `rows` family replaces the subtitle band (SUBTITLE_COMPATIBLE), which
    // matches the source slide: "IMPACT Practice Objectives" is a title over
    // What / Why / How, with no subtitle line.
    zones: {
      body: 'rowA',
      tiles: 'rowB',
      visuals: 'off',
      subtitle: 'off',
    },
  },
  // pptx slide 8 — "Project Stations Rotation". Rows, not a timetable: the
  // original's wall-clock times are one classroom's schedule, not a template.
  'stations-rotation': {
    id: 'stations-rotation',
    label: 'Stations rotation',
    kinds: AUTHORED_KINDS,
    bandFree: false,
    zones: {
      body: 'rowA',
      tiles: 'rowB',
      visuals: 'off',
      subtitle: 'off',
    },
  },
  // pptx slide 4 footer + slide 6/7 — "Explore the Project Menu".
  // `ctaCenter` was widened from one slot to a row of four for exactly this.
  'project-menu': {
    id: 'project-menu',
    label: 'Project menu',
    kinds: AUTHORED_KINDS,
    bandFree: false,
    zones: {
      tiles: 'ctaCenter',
      subtitle: 'off',
      body: 'off',
      visuals: 'off',
    },
  },
  // pptx slide 10 — "Last 5". Centre stack, which excludes the title zone.
  'last-5': {
    id: 'last-5',
    label: 'Last 5',
    kinds: AUTHORED_KINDS,
    bandFree: false,
    zones: {
      body: 'centerStackTop',
      tiles: 'centerStackBottom',
      subtitle: 'off',
      visuals: 'off',
      hideTitle: true,
    },
  },
} as const satisfies Record<string, Omit<SlidePreset, 'id'> & { id: string }>;

export type SlidePresetId = keyof typeof PRESETS;

/** The registry read through the interface — `PRESETS` itself is narrowed by
 *  `as const`, so `PRESETS.title.accentBar` is a type error rather than
 *  `undefined`. Callers that iterate every preset want this view. */
export const PRESET_LIST: readonly SlidePreset[] = Object.values(
  PRESETS,
) as unknown as SlidePreset[];

export const PRESET_IDS = Object.keys(PRESETS) as SlidePresetId[];

export const isPresetId = (v: unknown): v is SlidePresetId =>
  typeof v === 'string' && (PRESET_IDS as string[]).includes(v);

/**
 * The preset for an id, or undefined.
 *
 * Undefined rather than a throw or a default: a snapshot published last term
 * can name a preset this build has renamed, and the honest fallback is the
 * derived layout the slide would have had anyway.
 */
export const presetFor = (id: string | undefined): SlidePreset | undefined =>
  isPresetId(id) ? (PRESETS[id] as SlidePreset) : undefined;
