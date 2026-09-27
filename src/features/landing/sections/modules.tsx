import type { ComponentType, ReactNode } from 'react';
import { ArcadeScene } from '../tour/scenes/ArcadeScene';
import { LearnScene } from '../tour/scenes/LearnScene';
import { StudioScene } from '../tour/scenes/StudioScene';
import { TeachScene } from '../tour/scenes/TeachScene';
import type { SceneProps } from '../tour/scenes/sceneTypes';
import type { TourTabId } from '../tour/tourSteps';
import { MODULE_ICONS } from './moduleIcons';

export interface LandingModule {
  id: TourTabId;
  label: string;
  /** Same icon as the app sidebar (ClassroomSidebar). */
  icon: ReactNode;
  /** Two-tone statement: white lead + dimmed continuation. */
  statement: { lead: string; rest: string };
  /** Two feature cells under the demo (copy from the /features/* pages). */
  features: [{ title: string; body: string }, { title: string; body: string }];
  /** Live demo scene (the Globe block renders its own layout). */
  Scene?: ComponentType<SceneProps>;
}

/** The five modules, in bento / table-of-contents order. */
export const LANDING_MODULES: LandingModule[] = [
  {
    id: 'learn',
    label: 'Learn',
    icon: MODULE_ICONS.learn,
    statement: {
      lead: 'Every key has a color.',
      rest: 'Theory, technique and real songs you can see, hear and play — from beginner to fluent.',
    },
    features: [
      {
        title: 'Theory you can see.',
        body: 'Understand scales, chords and modes — and why they work.',
      },
      {
        title: 'Real songs.',
        body: 'Learn 650+ real songs with chord charts.',
      },
    ],
    Scene: LearnScene,
  },
  {
    id: 'studio',
    label: 'Studio',
    icon: MODULE_ICONS.studio,
    statement: {
      lead: 'A studio that knows theory.',
      rest: 'Pick a key center and Prism suggests what comes next — every chord colored by the key it comes from.',
    },
    features: [
      {
        title: 'Build by color.',
        body: 'Build progressions by color with the circle-of-fifths chord helper, right inside Create.',
      },
      {
        title: 'Create together.',
        body: 'Invite others into a shared project and create together in real time.',
      },
    ],
    Scene: StudioScene,
  },
  {
    id: 'globe',
    label: 'Globe',
    icon: MODULE_ICONS.globe,
    statement: {
      lead: 'Hear where music came from.',
      rest: 'Follow it city to city.',
    },
    features: [
      {
        title: 'Journey by era.',
        body: 'Follow music through time, from roots to today.',
      },
      {
        title: 'Connects to Learn.',
        body: 'Jump from a place straight into its lessons and songs.',
      },
    ],
  },
  {
    id: 'arcade',
    label: 'Arcade',
    icon: MODULE_ICONS.arcade,
    statement: {
      lead: 'Level up your ears and skills.',
      rest: 'Short, focused games for pitch, rhythm and harmony that feed your progress across Music Atlas.',
    },
    features: [
      {
        title: 'Ear training.',
        body: 'Chroma and Constellations sharpen your ear for pitch and interval.',
      },
      {
        title: 'Rhythm.',
        body: 'Foli and Groove Lab train your timing and feel.',
      },
    ],
    Scene: ArcadeScene,
  },
  {
    id: 'teach',
    label: 'Teach',
    icon: MODULE_ICONS.teach,
    statement: {
      lead: 'Teach music in real time.',
      rest: 'Your projector leads and every student device follows — with rosters, assignments and progress built in.',
    },
    features: [
      {
        title: 'Rosters & join codes.',
        body: 'Get a class up and running in minutes.',
      },
      {
        title: 'Assign anything.',
        body: 'Assign lessons, games and songs from across Music Atlas.',
      },
    ],
    Scene: TeachScene,
  },
];
