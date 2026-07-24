import {
  AudioWaveform,
  NotebookPen,
  Orbit,
  Rainbow,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import { AuthRoutes, MarketingRoutes, StudioRoutes } from '@/constants/routes';
import { ProductPageTemplate } from '../ProductPageTemplate';
import type { ProductPageData } from '../content/types';

const data: ProductPageData = {
  slug: 'studio',
  accent: '#7ecfcf',
  seo: {
    title: 'Studio — Make music in your browser | Music Atlas',
    description:
      'A full music studio in your browser: compose, produce, mix, master and score — powered by the UNISON engine. No download required.',
    canonicalPath: '/features/studio',
  },
  hero: {
    eyebrow: 'Studio',
    headline: 'A full music studio in your browser.',
    subtext:
      'Compose, produce, mix and master — no download, no setup. Music Atlas Studio runs in your browser and on the devices you already have.',
    primaryCta: { label: 'Start free', href: AuthRoutes.signIn() },
    secondaryCta: { label: 'Open the Studio', href: StudioRoutes.root() },
    artSeed: 'studio',
  },
  featuresHeading: 'Everything you need to make a track',
  features: [
    {
      title: 'Create',
      body: 'Lay down ideas on a timeline with instruments, a piano roll, samples and effects.',
      icon: <SlidersHorizontal />,
    },
    {
      title: 'Prism',
      body: 'Build progressions by color with the circle-of-fifths chord helper, right inside Create.',
      icon: <Rainbow />,
    },
    {
      title: 'Master',
      body: 'Mix and master to a release-ready sound without leaving the browser.',
      icon: <AudioWaveform />,
    },
    {
      title: 'Score',
      body: 'Turn your ideas into clean notation and lead sheets.',
      icon: <NotebookPen />,
    },
    {
      title: 'Collaborate',
      body: 'Invite others into a shared project and create together in real time.',
      icon: <Users />,
    },
    {
      title: 'Modal Sphere',
      body: 'Spin a 3D map of the modes to find your next sound.',
      icon: <Orbit />,
    },
  ],
  how: {
    heading: 'From idea to finished track',
    steps: [
      {
        title: 'Create',
        body: 'Start a project and lay down chords, melodies and beats.',
      },
      {
        title: 'Arrange & mix',
        body: 'Shape the arrangement, then mix and master to taste.',
      },
      {
        title: 'Export or share',
        body: 'Bounce a file, or share it into a lesson or a collaboration.',
      },
    ],
  },
  crossLinks: {
    links: [
      {
        label: 'Learn',
        description: 'Theory, technique & real songs',
        href: MarketingRoutes.learn(),
      },
      {
        label: 'Arcade',
        description: 'Train your ear through play',
        href: MarketingRoutes.arcade(),
      },
      {
        label: 'Globe',
        description: 'Explore the world of music',
        href: MarketingRoutes.globe(),
      },
    ],
  },
  cta: {
    headline: 'Make your first track today.',
    subtext: 'Free to start — no download required.',
    primaryCta: { label: 'Start free', href: AuthRoutes.signIn() },
    secondaryCta: { label: 'Open the Studio', href: StudioRoutes.root() },
  },
};

export const StudioPage = () => <ProductPageTemplate data={data} />;
