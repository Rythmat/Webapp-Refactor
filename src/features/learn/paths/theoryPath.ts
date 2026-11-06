import { getNoteSpelling } from '@/components/learn/noteSpellingLookup';
import { discRatio } from '@/components/learn/path/pathGeometry';
import type {
  PathCourse,
  PathLevel,
  PathFigure,
  PathOption,
  PathRow,
} from '@/components/learn/path/types';
import { sigilFor } from '@/components/learn/sigil/sigilSpec';
import { LearnRoutes } from '@/constants/routes';
import type { GuitarTheoryEntry } from '@/curriculum/data/guitar/theoryCatalog';
import { exploreHref } from '@/features/learn/catalog/exploreState';
import { learnTabRoute } from '@/features/learn/learnPaths';
import type { LearnInstrument } from '@/features/learn/useInstrumentStore';
import type { PrismModeSlug } from '@/hooks/data';
import { parentOf } from '@/lib/learn/scalePitches';
import { colorForKeyMode } from '@/lib/modeColorShift';
import { keyLabelToUrlParam } from '@/lib/musicKeyUrl';
import {
  DIATONIC_BY_DEGREE,
  familyModes,
  familyOfMode,
  KEY_SIGNATURE_TITLES,
  relativeRoot,
  THEORY_FAMILIES,
  THEORY_KEYS,
  type TheoryFamily,
} from './theoryFamilies';
import type { TheoryProgress } from './theoryProgress';

// ── A Theory family as a path ──────────────────────────────────────────────

const INSTRUMENT_NAME: Readonly<Record<LearnInstrument, string>> = {
  piano: 'Keyboard',
  guitar: 'Guitar',
  bass: 'Bass',
  ukulele: 'Ukulele',
};

/** A family's path page; `select` names the disc to open on. */
export function theoryFamilyRoute(
  instrument: LearnInstrument,
  family: string,
  select?: string,
) {
  const path = `${learnTabRoute(instrument, 'Theory')}/${family}`;
  return select ? `${path}?select=${encodeURIComponent(select)}` : path;
}

/** The disc a mode (and maybe a key) is on, in its family's path. */
const keyRowId = (slug: string, key: string) =>
  `${slug}:${keyLabelToUrlParam(key)}`;

/** Where a mode's lessons go back to: its disc, in its family's path. */
export function theoryBackRoute(
  instrument: LearnInstrument,
  slug: string,
  key?: string,
) {
  const family = familyOfMode(slug);
  if (!family) return learnTabRoute(instrument, 'Theory');
  const select = family.parent === slug ? keyRowId(slug, key ?? 'C') : slug;
  return theoryFamilyRoute(instrument, family.id, select);
}

export function theoryLessonRoute(
  instrument: LearnInstrument,
  slug: string,
  key: string,
) {
  const params = { mode: slug, key: keyLabelToUrlParam(key) };
  if (instrument === 'guitar') return LearnRoutes.guitarLesson(params);
  if (instrument === 'bass') return LearnRoutes.bassLesson(params);
  if (instrument === 'ukulele') return LearnRoutes.ukuleleLesson(params);
  return LearnRoutes.keyboardLesson(params);
}

const KEY_PITCH: Readonly<Record<string, number>> = {
  C: 0,
  'D♭': 1,
  D: 2,
  'E♭': 3,
  E: 4,
  F: 5,
  'F♯': 6,
  G: 7,
  'A♭': 8,
  A: 9,
  'B♭': 10,
  B: 11,
};

/**
 * A mode in a key as the key wheel's page draws it: the same star, the same notes
 * dotted (its root and its parent scale's), and the same colour.
 */
export function modeFigure(slug: string, key: string): PathFigure | undefined {
  const spec = sigilFor({ mode: slug });
  if (spec?.kind !== 'scale') return undefined;
  const parent = parentOf(slug);
  return {
    pcs: spec.pcs,
    stars: spec.stars,
    tonic: KEY_PITCH[key] ?? 0,
    marked: [0, parent ? (12 - parent.above) % 12 : 0],
    accent: colorForKeyMode(key, slug as PrismModeSlug),
    label: key,
    notes: getNoteSpelling(slug, key),
  };
}

const named = (figure: PathFigure | undefined, label: string) =>
  figure && { ...figure, label };

/** Free for everyone: C Ionian, on every instrument. */
const isFree = (slug: string, key: string) => slug === 'ionian' && key === 'C';

interface Context {
  instrument: LearnInstrument;
  isPremium: boolean;
  progress: TheoryProgress;
}

const keyOptions = (
  instrument: LearnInstrument,
  slug: string,
  title: string,
): readonly PathOption[] =>
  THEORY_KEYS.map((key) => ({
    label: key,
    route: theoryLessonRoute(instrument, slug, key),
    figure: named(modeFigure(slug, key), `${key} ${title}`),
  }));

function modeRows(family: TheoryFamily, ctx: Context) {
  const modes = familyModes(ctx.instrument, family);
  const parent: GuitarTheoryEntry | undefined = modes[0];
  const rest = modes.slice(1);
  const rows: PathRow[] = [];
  if (parent) {
    THEORY_KEYS.forEach((key) => {
      rows.push({
        id: keyRowId(parent.slug, key),
        title: `${key} ${parent.name}`,
        blurb: `${parent.title} in the key of ${key}`,
        ratio: discRatio(rows.length),
        levelId: 'parent',
        route: theoryLessonRoute(ctx.instrument, parent.slug, key),
        percent: ctx.progress.keyPercent(parent, key),
        tracked: true,
        locked: !ctx.isPremium && !isFree(parent.slug, key),
        figure: named(modeFigure(parent.slug, key), `${key} ${parent.name}`),
      });
    });
  }
  rest.forEach((entry) => {
    rows.push({
      id: entry.slug,
      title: entry.title,
      blurb: 'Choose a key to start in',
      ratio: discRatio(rows.length),
      levelId: 'modes',
      route: theoryLessonRoute(ctx.instrument, entry.slug, THEORY_KEYS[0]),
      percent: ctx.progress.modePercent(entry),
      tracked: true,
      locked: !ctx.isPremium,
      options: keyOptions(ctx.instrument, entry.slug, entry.name),
      figure: named(
        modeFigure(entry.slug, THEORY_KEYS[0]),
        `${THEORY_KEYS[0]} ${entry.name}`,
      ),
      optionsLabel: 'Key',
    });
  });
  const levels: PathLevel[] = parent
    ? [
        {
          id: 'parent',
          kicker: 'Level 1',
          title: parent.title,
          goals: family.parentGoals ?? [],
        },
        ...(rest.length
          ? [
              {
                id: 'modes',
                kicker: 'Level 2',
                title:
                  family.id === 'pentatonic-blues'
                    ? 'The other scales'
                    : 'The other modes',
                goals: family.goals,
              },
            ]
          : []),
      ]
    : [];
  return { rows, levels };
}

/** Relative and Parallel: a disc per key, each opening onto seven modes. */
function linkRows(family: TheoryFamily, ctx: Context) {
  const relative = family.id === 'relative';
  const rows: PathRow[] = THEORY_KEYS.map((key, i) => {
    const modes = DIATONIC_BY_DEGREE.map((mode, degree) => {
      const root = relative ? relativeRoot(key, degree) : key;
      return {
        label: `${root} ${mode.title}`,
        route: theoryLessonRoute(ctx.instrument, mode.slug, root),
        figure: named(modeFigure(mode.slug, root), `${root} ${mode.title}`),
      };
    });
    // Keyboard, and guitar's Relative, have a page laying out the seven.
    const overview =
      ctx.instrument === 'piano'
        ? relative
          ? LearnRoutes.relativeOverview({ key: keyLabelToUrlParam(key) })
          : LearnRoutes.parallelOverview({ key: keyLabelToUrlParam(key) })
        : ctx.instrument === 'guitar' && relative
          ? LearnRoutes.guitarRelativeOverview({
              key: keyLabelToUrlParam(key),
            })
          : null;
    return {
      id: keyLabelToUrlParam(key),
      title: relative ? (KEY_SIGNATURE_TITLES[key] ?? key) : key,
      blurb: relative
        ? `The seven modes of ${key} major`
        : `The seven modes on ${key}`,
      ratio: discRatio(i),
      levelId: 'keys',
      figure: named(modeFigure('ionian', key), `${key} Ionian`),
      route: overview ?? modes[0].route,
      percent: 0,
      tracked: false,
      locked: !ctx.isPremium,
      options: overview ? undefined : modes,
      optionsLabel: 'Mode',
    };
  });
  return {
    rows,
    levels: [
      {
        id: 'keys',
        kicker: 'Level 1',
        title: relative ? 'By key signature' : 'By root',
        goals: family.goals,
      },
    ],
  };
}

const ratioOf = (familyIndex: number) => discRatio(familyIndex + 1);

/** A Theory family, as its path page draws it. */
export function theoryFamilyPath(
  family: TheoryFamily,
  accent: string,
  ctx: Context,
): PathCourse {
  const { rows, levels } = family.parent
    ? modeRows(family, ctx)
    : linkRows(family, ctx);
  const index = THEORY_FAMILIES.indexOf(family);
  const next = THEORY_FAMILIES[index + 1];
  return {
    id: family.id,
    title: family.title,
    description: family.description,
    accent,
    ratio: ratioOf(index),
    stats: [`${rows.length} lessons`, INSTRUMENT_NAME[ctx.instrument]],
    back: {
      label: 'Learn',
      to: exploreHref(ctx.instrument, 'theory'),
    },
    levels,
    rows,
    upNext: next
      ? {
          title: next.title,
          blurb: next.description,
          to: theoryFamilyRoute(ctx.instrument, next.id),
        }
      : undefined,
  };
}
