/**
 * The Home prompt bar's suggestions: plenty for every destination, no repeats,
 * and every route a real place in the app — the templates, tutorials, demos,
 * songs, Theory lessons, curriculum genres, globe ids and games are checked
 * against the app's own data, so a renamed id fails here instead of
 * dead-ending a prompt once they're routed.
 */
import { describe, expect, it } from 'vitest';
import { ARTIST_REGISTRY } from '@/components/atlas/data/artistRegistry';
import { GENRE_CHIP_IDS } from '@/components/atlas/data/genreChipIds';
import { HISTORICAL_MODULES } from '@/components/atlas/data/historicalModules';
import { MUSICAL_ERAS } from '@/components/atlas/data/musicalEras';
import { REGIONS } from '@/components/atlas/data/regions';
import { GameRoutes } from '@/constants/routes';
import { TUTORIAL_CATALOG } from '@/daw/components/Tutorial/tutorialCatalog';
import { DEMO_PROJECTS } from '@/daw/data/demoProjects';
import { PROJECT_TEMPLATES } from '@/daw/data/projectTemplates';
import {
  parseMusicPrompt,
  PROMPT_TEXT_MAX,
} from '@/features/promptSong/parseMusicPrompt';
import {
  PROMPT_NEEDS,
  PROMPT_SUGGESTIONS,
  PROMPT_TARGETS,
  rotationFor,
  suggestionsFor,
} from '../promptSuggestions';

const SONG_IDS = new Set(
  Object.keys(import.meta.glob('/src/curriculum/data/songs/*.ts')).map((p) =>
    p.replace(/^.*\/(.+)\.ts$/, '$1'),
  ),
);

/** The Theory tab's tiles (LearnInlet.tsx) these suggestions open. */
const THEORY_MODES = new Set([
  'lydian',
  'ionian',
  'mixolydian',
  'dorian',
  'aeolian',
  'phrygian',
  'locrian',
  'majorpentatonic',
  'minorpentatonic',
  'majorblues',
  'minorblues',
  'harmonicminor',
  'phrygiandominant',
  'melodicminor',
]);
const KEYS = new Set([
  'c',
  'g',
  'd',
  'a',
  'e',
  'b',
  'fsharp',
  'dflat',
  'aflat',
  'eflat',
  'bflat',
  'f',
]);
/** CurriculumRoutes.genre's genres. */
const CURRICULUM_GENRES = new Set([
  'pop',
  'rock',
  'hip-hop',
  'rnb',
  'jazz',
  'blues',
  'folk',
  'funk',
  'neo-soul',
  'electronic',
  'latin',
  'reggae',
  'jam-band',
  'african',
]);
const LEARN_TABS = new Set([
  'StartHere',
  'Songs',
  'Genre',
  'Theory',
  'Technique',
  'WorldHarmony',
]);
const CONTINENTS = new Set(['americas', 'europe', 'africa-me', 'asia-pacific']);
const REGION_IDS = new Set(REGIONS.map((r) => r.id as string));
const GAME_PATHS = new Set(
  Object.values(GameRoutes).map(
    (r) => (r as { definition: string }).definition,
  ),
);

/** Why a route isn't a real place, or null when it is. */
function problem(route: string): string | null {
  const url = new URL(route, 'https://app.test');
  const q = url.searchParams;
  const path = url.pathname;

  if (path === '/studio/editor') {
    const [key] = [...q.keys()];
    const value = q.get(key) ?? '';
    switch (key) {
      case 'template':
        return PROJECT_TEMPLATES.some((t) => t.id === value)
          ? null
          : `no template ${value}`;
      case 'tutorial':
        return TUTORIAL_CATALOG.some((t) => t.id === value)
          ? null
          : `no tutorial ${value}`;
      case 'demo':
        return DEMO_PROJECTS.some((d) => d.id === value)
          ? null
          : `no demo ${value}`;
      case 'song':
        return SONG_IDS.has(value) ? null : `no song ${value}`;
      case 'practiceGenre':
        return CURRICULUM_GENRES.has(value) ? null : `no genre ${value}`;
      case 'practiceMode': {
        const root = q.get('practiceRoot');
        if (root !== null && !KEYS.has(root)) return `no root ${root}`;
        return THEORY_MODES.has(value) ? null : `no mode ${value}`;
      }
      case 'new':
        return null;
      case 'prompt':
        // A song idea from the words (features/promptSong): words it reads.
        if (!value.trim() || value.length > PROMPT_TEXT_MAX)
          return 'bad prompt';
        return parseMusicPrompt(value).matched.length
          ? null
          : `nothing to read in “${value}”`;
      default:
        return `unknown Studio param ${key}`;
    }
  }

  let m = path.match(/^\/songs\/([^/]+)$/);
  if (m) return SONG_IDS.has(m[1]) ? null : `no song ${m[1]}`;

  m = path.match(/^\/curriculum\/([^/]+)$/);
  if (m) {
    return CURRICULUM_GENRES.has(m[1]) || m[1] === 'music-literacy'
      ? null
      : `no course ${m[1]}`;
  }

  if (path === '/learn') {
    const tab = q.get('tab') ?? '';
    return LEARN_TABS.has(tab) ? null : `no Learn tab ${tab}`;
  }
  m = path.match(/^\/learn\/(relative|parallel)\/([^/]+)$/);
  if (m) return KEYS.has(m[2]) ? null : `no key ${m[2]}`;
  m = path.match(/^\/learn\/(?:guitar\/)?([^/]+)(?:\/([^/]+))?$/);
  if (m) {
    if (!THEORY_MODES.has(m[1])) return `no Theory lesson ${m[1]}`;
    return m[2] === undefined || KEYS.has(m[2]) ? null : `no key ${m[2]}`;
  }

  if (path === '/atlas/globe') {
    for (const [key, value] of q) {
      const list = value.split(',');
      switch (key) {
        case 'open':
          if (!list.every((id) => CONTINENTS.has(id) || REGION_IDS.has(id)))
            return `no place in ${value}`;
          break;
        case 'genres':
          if (
            !list.every((id) =>
              (GENRE_CHIP_IDS as readonly string[]).includes(id),
            )
          )
            return `no genre chip in ${value}`;
          break;
        case 'era':
          if (!MUSICAL_ERAS.some((e) => e.id === value))
            return `no era ${value}`;
          break;
        case 'tour':
          if (!REGION_IDS.has(value.replace(/^region-/, '')))
            return `no tour ${value}`;
          break;
        case 'lens':
          if (!['places', 'pathways', 'instruments'].includes(value))
            return `no lens ${value}`;
          break;
        case 'view':
          if (value !== 'timeline') return `no view ${value}`;
          break;
        case 'from':
        case 'to':
          if (!/^\d{4}$/.test(value)) return `bad year ${value}`;
          break;
        case 'pathway':
          if (!HISTORICAL_MODULES.some((m) => m.id === value))
            return `no pathway ${value}`;
          break;
        case 'artist':
          if (!ARTIST_REGISTRY.some((a) => a.name === value))
            return `no artist ${value}`;
          break;
        case 'q':
          break;
        default:
          return `unknown globe param ${key}`;
      }
    }
    return null;
  }

  if (path.startsWith('/arcade/')) {
    return GAME_PATHS.has(path) ? null : `no game at ${path}`;
  }
  return `no known place at ${path}`;
}

describe('the Home prompt suggestions', () => {
  it('give every destination plenty to rotate through', () => {
    for (const t of PROMPT_TARGETS) {
      expect(suggestionsFor(t.id).length).toBeGreaterThanOrEqual(25);
    }
  });

  it('never repeat a suggestion', () => {
    const texts = PROMPT_SUGGESTIONS.map((s) => s.text.toLowerCase());
    expect(new Set(texts).size).toBe(texts.length);
  });

  it('each route to a real place in the app', () => {
    const broken = PROMPT_SUGGESTIONS.map((s) => ({
      text: s.text,
      why: problem(s.route),
    })).filter((s) => s.why !== null);
    expect(broken).toEqual([]);
  });

  it('are checked by a checker that catches a broken route', () => {
    for (const route of [
      '/songs/let_it_be',
      '/studio/editor?template=project-jazz',
      '/studio/editor?tutorial=nope',
      '/studio/editor?bpm=100',
      '/learn/chords',
      '/learn/dorian/h',
      '/curriculum/polka',
      '/atlas/globe?era=baroque',
      '/atlas/globe?tour=region-mars',
      '/atlas/globe?pathway=disco-moon',
      '/studio/editor?practiceMode=dorian&practiceRoot=h',
      '/arcade/tetris',
      '/studio/editor?prompt=',
      '/studio/editor?prompt=asdf%20qwerty',
    ]) {
      expect(problem(route), route).not.toBeNull();
    }
    expect(problem('/arcade/jam')).toBeNull();
    expect(problem('/songs/superstition')).toBeNull();
  });

  it('name only needs that are in the build list', () => {
    const used = new Set(PROMPT_SUGGESTIONS.flatMap((s) => s.needs ?? []));
    for (const need of used) expect(PROMPT_NEEDS).toHaveProperty(need);
  });

  it('start with the word that sends a prompt to their destination', () => {
    const lead = {
      studio: /^Make /,
      learn: /^Teach /,
      globe: /^(Show|How) /,
      arcade: /^Play /,
    };
    const off = PROMPT_SUGGESTIONS.filter((s) => !lead[s.target].test(s.text));
    expect(off.map((s) => s.text)).toEqual([]);
  });

  it('route each to its own destination', () => {
    const area: Record<string, RegExp> = {
      studio: /^\/studio\//,
      learn: /^\/(learn|songs|curriculum)\b/,
      globe: /^\/atlas\/globe\b/,
      arcade: /^\/arcade\//,
    };
    for (const s of PROMPT_SUGGESTIONS) {
      expect(s.route, s.text).toMatch(area[s.target]);
    }
  });

  it('rotate in a fresh order, every suggestion still there, the mix interleaved', () => {
    const all = rotationFor(null);
    expect(all).toHaveLength(PROMPT_SUGGESTIONS.length);
    expect(new Set(all)).toEqual(new Set(PROMPT_SUGGESTIONS));
    expect(all.slice(0, 4).map((s) => s.target)).toEqual(
      PROMPT_TARGETS.map((t) => t.id),
    );
    const firsts = new Set(
      Array.from({ length: 8 }, () => rotationFor('learn')[0].text),
    );
    expect(firsts.size).toBeGreaterThan(1);
  });
});
