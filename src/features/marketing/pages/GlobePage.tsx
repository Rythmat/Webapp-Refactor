import {
  GraduationCap,
  History,
  Map,
  Music,
  Route,
  Globe as GlobeIcon,
} from 'lucide-react';
import { AtlasRoutes, AuthRoutes, MarketingRoutes } from '@/constants/routes';
import { ProductPageTemplate } from '../ProductPageTemplate';
import type { ProductPageData } from '../content/types';

const data: ProductPageData = {
  slug: 'globe',
  accent: '#60a5fa',
  seo: {
    title: 'Globe — Explore the world of music | Music Atlas',
    description:
      'An interactive 3D globe of music history and geography — travel by place and era to discover how the music you love came to be.',
    canonicalPath: '/features/globe',
  },
  hero: {
    eyebrow: 'Globe',
    headline: 'Explore the world of music.',
    subtext:
      'An interactive 3D globe of music history and geography — travel by place and era to discover how the music you love came to be.',
    primaryCta: { label: 'Start free', href: AuthRoutes.signIn() },
    secondaryCta: { label: 'Open the Globe', href: AtlasRoutes.root() },
    artSeed: 'globe',
  },
  featuresHeading: 'A living map of music',
  features: [
    {
      title: 'Travel by place',
      body: 'Spin the globe to explore regional traditions and scenes.',
      icon: <GlobeIcon />,
    },
    {
      title: 'Journey by era',
      body: 'Follow music through time, from roots to today.',
      icon: <History />,
    },
    {
      title: 'Instruments & traditions',
      body: 'Meet the instruments and sounds of each culture.',
      icon: <Music />,
    },
    {
      title: 'Guided tours',
      body: 'Follow curated pathways through music history.',
      icon: <Route />,
    },
    {
      title: 'Connects to Learn',
      body: 'Jump from a place straight into its lessons and songs.',
      icon: <GraduationCap />,
    },
    {
      title: 'Discovery, not a textbook',
      body: 'Explore by curiosity — the map rewards wandering.',
      icon: <Map />,
    },
  ],
  how: {
    heading: 'How to explore',
    steps: [
      { title: 'Spin the globe', body: 'Grab the world and start anywhere.' },
      {
        title: 'Pick a place or era',
        body: 'Zoom into a region or a moment in time.',
      },
      {
        title: 'Dive into the music',
        body: 'Open its traditions, songs and lessons.',
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
        label: 'Studio',
        description: 'Make music in your browser',
        href: MarketingRoutes.studio(),
      },
      {
        label: 'Arcade',
        description: 'Train your ear through play',
        href: MarketingRoutes.arcade(),
      },
    ],
  },
  cta: {
    headline: 'Start exploring today.',
    subtext: 'Free to explore — the whole world of music, one globe.',
    primaryCta: { label: 'Start free', href: AuthRoutes.signIn() },
    secondaryCta: { label: 'Open the Globe', href: AtlasRoutes.root() },
  },
};

export const GlobePage = () => <ProductPageTemplate data={data} />;
