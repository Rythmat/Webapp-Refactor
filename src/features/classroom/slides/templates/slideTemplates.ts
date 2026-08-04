/**
 * Add-slide TEMPLATES — the 8 content-optimized slide starters shown in the
 * filmstrip "Add slide" menu. Each maps to one content-picker domain; after the
 * teacher picks a specific item, `buildTemplateSlide` seeds a `content` slide
 * pre-populated with the right blocks (media / side-media / launch-tile pill)
 * and a layout tuned for that content type.
 *
 * Pure + React-free (like `songSession.ts`) so it unit-tests without a tree.
 * All derived body copy is filtered line-by-line through the publish firewall
 * (`refFirewallCollision`) so a stray forbidden substring can never make the
 * Day un-publishable — the colliding line is dropped, the slide still ships.
 */
import { REGION_HINTS } from '@/components/ClassroomLayout/globe/data/regionHints';
import { CITIES, MUSICAL_ERAS, REGIONS } from '@/components/atlas/data';
import { HISTORICAL_MODULES } from '@/components/atlas/data/historicalModules';
import { KEY_OF_COLORS } from '@/constants/theme';
import { MUSIC_HISTORY } from '@/content/contentStore';
import { getSong } from '@/content/songStore';
import {
  CURRICULUM_GENRE_SLUGS,
  type CurriculumGenreId,
} from '@/curriculum/bridge/genreIdMap';
import { getGenreProfile } from '@/curriculum/data/genreProfiles';
import { getProjectTemplate } from '@/daw/data/projectTemplates';
import type { PhaseKey } from '../../phases';
import type { PickerDomain } from '../../plan/deckEditor/contentPicker/ContentPickerDialog';
import type {
  PickedTile,
  SlideMediaEmbed,
} from '../../plan/deckEditor/contentPicker/catalog';
import type { LocalizedText } from '../../types';
import { refFirewallCollision } from '../contentRefs';
import { slideUid } from '../deckEdit';
import type { ContentSlide, SlideLayout, SlideMedia } from '../types';

export type SlideTemplateId =
  | 'song'
  | 'theory'
  | 'genre'
  | 'studio'
  | 'events'
  | 'regionsCities'
  | 'pathways'
  | 'eras';

export interface SlideTemplateDef {
  id: SlideTemplateId;
  label: string;
  pickerDomain: PickerDomain;
}

/** Menu order (matches the filmstrip Add-slide menu). */
export const SLIDE_TEMPLATES: SlideTemplateDef[] = [
  { id: 'song', label: 'Song', pickerDomain: 'songs' },
  { id: 'theory', label: 'Theory', pickerDomain: 'theory' },
  { id: 'genre', label: 'Genre', pickerDomain: 'genre' },
  { id: 'studio', label: 'Studio', pickerDomain: 'studio' },
  { id: 'events', label: 'Events', pickerDomain: 'events' },
  {
    id: 'regionsCities',
    label: 'Regions & Cities',
    pickerDomain: 'regionsCities',
  },
  { id: 'pathways', label: 'Pathways', pickerDomain: 'globe' },
  { id: 'eras', label: 'Eras', pickerDomain: 'eras' },
];

export interface TemplatePick {
  tile: PickedTile;
  embed?: SlideMediaEmbed;
}

const tileUid = (): string =>
  `lt-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36).slice(-4)}`;

/** Pitch class (0=C … 11=B) → the `KEY_OF_COLORS` note spelling. */
const PITCH_TO_KEY: (keyof typeof KEY_OF_COLORS)[] = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'F#',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
];

/** The circle-of-fifths color for a song's key center (a MIDI `keyRoot`). */
const keyCenterColor = (keyRoot: number): string | undefined => {
  if (!Number.isFinite(keyRoot)) return undefined;
  const pc = ((Math.round(keyRoot) % 12) + 12) % 12;
  return KEY_OF_COLORS[PITCH_TO_KEY[pc]];
};

/** Theory key URL token → pitch class (chromatic index; matches catalog KEYS). */
const TOKEN_PC: Record<string, number> = {
  c: 0,
  csharp: 1,
  d: 2,
  eflat: 3,
  e: 4,
  f: 5,
  fsharp: 6,
  g: 7,
  aflat: 8,
  a: 9,
  bflat: 10,
  b: 11,
};

/** Each era's accent glow (hex only — firewall-safe). */
const ERA_ACCENT_HEX: Record<string, string> = {
  ancient: '#fbbf24',
  renaissance: '#fb923c',
  'classical-romantic': '#fb7185',
  'early-modern': '#a78bfa',
  postwar: '#60a5fa',
  'electronic-hiphop': '#22d3ee',
  'global-digital': '#2dd4bf',
};

// ── Per-template layouts (canvas 1280×720, margin 64) ───────────────────────
const LAYOUTS: Record<SlideTemplateId, SlideLayout> = {
  song: {
    title: { x: 64, y: 96, w: 1152, h: 100 },
    // The Song template carries no prompt copy — hide the block so the editor
    // doesn't show an empty "Prompt or instruction…" box (re-addable from tray).
    prompt: { x: 64, y: 200, w: 1152, h: 52, hidden: true },
    media: { x: 64, y: 224, w: 624, h: 351 }, // YouTube video — left (16:9)
    sideMedia: { x: 768, y: 200, w: 336, h: 448 }, // Artist image — right (3:4)
    launchTiles: { x: 64, y: 604, w: 624, h: 92 }, // Chord-chart pill
  },
  theory: {
    title: { x: 64, y: 64, w: 1152, h: 84 },
    media: { x: 64, y: 168, w: 1152, h: 420 }, // Overview scale keyboard + text
    launchTiles: { x: 64, y: 612, w: 1152, h: 88 },
    // Theory copy lives inside the keyboard card — hide the empty text boxes so
    // the editor doesn't show empty "Prompt/Body" placeholders (re-addable).
    prompt: { x: 64, y: 300, w: 1152, h: 60, hidden: true },
    body: { x: 64, y: 300, w: 1152, h: 60, hidden: true },
  },
  genre: {
    title: { x: 64, y: 104, w: 1152, h: 120 },
    body: { x: 64, y: 248, w: 1152, h: 290 },
    launchTiles: { x: 64, y: 568, w: 1152, h: 110 },
  },
  studio: {
    title: { x: 64, y: 120, w: 1152, h: 130 },
    body: { x: 64, y: 274, w: 1152, h: 230 },
    launchTiles: { x: 64, y: 560, w: 1152, h: 110 },
  },
  events: {
    title: { x: 64, y: 100, w: 664, h: 120 },
    body: { x: 64, y: 236, w: 664, h: 300 },
    media: { x: 748, y: 130, w: 452, h: 452 },
    launchTiles: { x: 64, y: 600, w: 664, h: 96 },
  },
  regionsCities: {
    title: { x: 64, y: 96, w: 648, h: 96 },
    body: { x: 64, y: 210, w: 648, h: 230 },
    launchTiles: { x: 64, y: 470, w: 648, h: 110 },
    media: { x: 744, y: 132, w: 472, h: 472 },
  },
  pathways: {
    title: { x: 64, y: 104, w: 600, h: 120 },
    body: { x: 64, y: 240, w: 600, h: 290 },
    media: { x: 700, y: 120, w: 500, h: 480 },
    launchTiles: { x: 64, y: 596, w: 600, h: 96 },
  },
  eras: {
    title: { x: 64, y: 150, w: 1152, h: 150 },
    body: { x: 64, y: 330, w: 820, h: 210 },
    launchTiles: { x: 64, y: 576, w: 820, h: 110 },
  },
};

/** Keep only firewall-safe lines; join them, or return undefined if none. */
const safeBody = (
  lines: string[],
  joiner = '\n',
): LocalizedText | undefined => {
  const safe = lines
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => refFirewallCollision('', s) === null);
  return safe.length ? { en: safe.join(joiner) } : undefined;
};

const idAfter = (ref: string, n: number): string =>
  ref.split(':').slice(n).join(':');

/** Resolve the seeded body + accent for a template from its picked ref. */
const deriveContent = (
  templateId: SlideTemplateId,
  ref: string,
): { body?: LocalizedText; accent?: string; media?: SlideMedia } => {
  const parts = ref.split(':');
  switch (templateId) {
    case 'song': {
      // No body — the artist image card already labels the artist, and the
      // present surface doesn't render a body block (keeps edit == present).
      // Accent defaults to the song's key-center color (circle of fifths).
      const song = getSong(parts[1] ?? '');
      if (!song) return {};
      return { accent: keyCenterColor(song.keyRoot) };
    }
    case 'theory': {
      // ref = `learn:<mode>:<token>`. Accent = the key-center color; embed the
      // Overview "Scale" keyboard for the mode in that key.
      const mode = parts[1] ?? 'ionian';
      const token = parts[2] ?? 'c';
      return {
        accent: keyCenterColor(TOKEN_PC[token] ?? 0),
        media: { type: 'scaleKeyboard', mode, key: token },
      };
    }
    case 'genre': {
      const gid = parts[1] as CurriculumGenreId;
      const slug = CURRICULUM_GENRE_SLUGS[gid];
      const profile = slug ? getGenreProfile(slug) : null;
      if (!profile) return {};
      const lines: string[] = [];
      if (profile.tagline && profile.tagline !== '[NOTE]')
        lines.push(profile.tagline);
      lines.push(...profile.characteristics.slice(0, 4));
      return { body: safeBody(lines, ' · '), accent: profile.accentColor };
    }
    case 'studio': {
      const t = getProjectTemplate(parts[2] ?? '');
      if (!t) return {};
      const line = `${t.bpm} BPM · ${t.tracks.map((tr) => tr.name).join(' · ')}`;
      return { body: safeBody([line]), accent: t.color };
    }
    case 'events': {
      const ev = MUSIC_HISTORY.find((e) => e.id === idAfter(ref, 2));
      if (!ev) return {};
      return {
        body: safeBody([
          `${ev.year} · ${ev.location.city}, ${ev.location.country}`,
          ev.description,
        ]),
      };
    }
    case 'pathways': {
      const mod = HISTORICAL_MODULES.find((m) => m.id === idAfter(ref, 2));
      return { body: mod ? safeBody([mod.description]) : undefined };
    }
    case 'regionsCities': {
      const id = idAfter(ref, 2);
      const region = REGIONS.find((r) => r.id === id);
      const city = CITIES.find((c) => c.id === id);
      const line = region
        ? (REGION_HINTS[region.id] ?? '')
        : (city?.description ?? '');
      return { body: safeBody([line]) };
    }
    case 'eras': {
      const era = MUSICAL_ERAS.find((e) => e.id === idAfter(ref, 2));
      if (!era) return {};
      return {
        body: safeBody([
          `${era.yearStart}–${era.yearEnd} · Explore this era's music on the globe.`,
        ]),
        accent: ERA_ACCENT_HEX[era.id],
      };
    }
  }
};

/**
 * Build a pre-seeded content slide for a template from the teacher's pick. The
 * launch-tile pill is always added; media/side-media come from `pick.embed`
 * (Song → youtube + artistImage; Events/Regions → globePreview; Pathways →
 * globePathway). Body + accent are derived from the ref, firewall-filtered.
 */
export const buildTemplateSlide = (
  templateId: SlideTemplateId,
  phase: PhaseKey,
  pick: TemplatePick,
): ContentSlide => {
  const { tile, embed } = pick;
  const {
    body,
    accent,
    media: derivedMedia,
  } = deriveContent(templateId, tile.activityRef);
  // Media comes from the picker embed (Song/Events/Regions/Pathways) or, when
  // the picker emits no embed (Theory), from the ref-derived media.
  const media = embed?.media ?? derivedMedia;
  return {
    id: slideUid(),
    kind: 'content',
    variant: 'plain',
    phase,
    title: tile.label ?? { en: '' },
    ...(body ? { body } : {}),
    ...(media ? { media } : {}),
    ...(embed?.sideMedia ? { sideMedia: embed.sideMedia } : {}),
    ...(accent ? { accent } : {}),
    launchTiles: [{ id: tileUid(), ...tile }],
    layout: LAYOUTS[templateId],
  };
};
