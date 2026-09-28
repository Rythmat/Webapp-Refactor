import type { ComponentType, ReactNode } from 'react';
import {
  AtlasRoutes,
  ClassroomRoutes,
  GameRoutes,
  LearnRoutes,
  StudioRoutes,
} from '@/constants/routes';
import { ArcadeScene } from '../tour/scenes/ArcadeScene';
import { SongsScene } from '../tour/scenes/SongsScene';
import { StudioScene } from '../tour/scenes/StudioScene';
import { TeachScene } from '../tour/scenes/TeachScene';
import { TheoryScene } from '../tour/scenes/TheoryScene';
import type { SceneProps } from '../tour/scenes/sceneTypes';
import { SONGS_TOUR, type TourScript, type TourTabId } from '../tour/tourSteps';
import { MODULE_ICONS } from './moduleIcons';

export interface LandingModule {
  id: TourTabId;
  label: string;
  /** Same icon as the app sidebar (ClassroomSidebar). */
  icon: ReactNode;
  /** Where "Open" goes: the module in the app (its ClassroomSidebar route). */
  app: string;
  /** Two-tone statement: white lead + dimmed continuation. */
  statement: { lead: string; rest: string };
  /** Two feature cells under the demo (copy from the /features/* pages). */
  features?: [{ title: string; body: string }, { title: string; body: string }];
  /** Live demo scene (the Globe block renders its own layout). */
  Scene?: ComponentType<SceneProps>;
  /** More demos under the main one, each under its own statement. */
  more?: {
    statement: { lead: string; rest: string };
    script: TourScript;
    Scene: ComponentType<SceneProps>;
  }[];
  /** The demos fill the section edge to edge, with bento step boxes. */
  bleed?: boolean;
}

/** The five modules, in bento / table-of-contents order. */
export const LANDING_MODULES: LandingModule[] = [
  {
    id: 'learn',
    label: 'Learn',
    icon: MODULE_ICONS.learn,
    app: LearnRoutes.root(),
    statement: {
      lead: 'Chords are shapes. Keys are colors.',
      rest: 'Our color-coded music theory makes playing and composing easy for beginners and pros.',
    },
    Scene: TheoryScene,
    // The Learn page's Songs demo.
    more: [
      {
        statement: {
          lead: 'Learn the songs you love.',
          rest: 'Our library of 650+ popular songs equips you to record and perform.',
        },
        script: SONGS_TOUR,
        Scene: SongsScene,
      },
    ],
    bleed: true,
  },
  {
    id: 'studio',
    label: 'Studio',
    icon: MODULE_ICONS.studio,
    app: StudioRoutes.root(),
    statement: {
      lead: 'A studio that knows theory.',
      rest: 'Pick a key center and Prism suggests what comes next — every chord colored by the key it comes from.',
    },
    Scene: StudioScene,
    bleed: true,
  },
  {
    id: 'globe',
    label: 'Globe',
    icon: MODULE_ICONS.globe,
    app: AtlasRoutes.root(),
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
    app: GameRoutes.root(),
    statement: {
      lead: 'Level up your ears and skills.',
      rest: 'Short, focused games for pitch, rhythm and harmony that feed your progress across Music Atlas.',
    },
    Scene: ArcadeScene,
    bleed: true,
  },
  {
    id: 'teach',
    label: 'Teach',
    icon: MODULE_ICONS.teach,
    app: ClassroomRoutes.root(),
    statement: {
      lead: 'Teach music in real time.',
      rest: 'Your projector leads and every student device follows — with rosters, assignments and progress built in.',
    },
    Scene: TeachScene,
    bleed: true,
  },
];
