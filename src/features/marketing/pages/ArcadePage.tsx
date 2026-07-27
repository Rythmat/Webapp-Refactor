import { AudioWaveform, Ear, Flame, Puzzle, Users, Waves } from 'lucide-react';
import { AuthRoutes, GameRoutes, MarketingRoutes } from '@/constants/routes';
import { ProductPageTemplate } from '../ProductPageTemplate';
import type { ProductPageData } from '../content/types';

const data: ProductPageData = {
  slug: 'arcade',
  accent: '#a78bfa',
  seo: {
    title: 'Arcade — Level up your ears and skills | Music Atlas',
    description:
      '13 music games that turn ear training, theory, rhythm and sound design into play — and earn XP as you drill.',
    canonicalPath: '/features/arcade',
  },
  hero: {
    eyebrow: 'Arcade',
    headline: 'Level up your ears and skills.',
    subtext:
      '13 music games that turn ear training, theory and technique into play — earn XP as you drill.',
    primaryCta: { label: 'Start free', href: AuthRoutes.signIn() },
    secondaryCta: { label: 'Play the Arcade', href: GameRoutes.root() },
    artSeed: 'arcade',
  },
  stats: [
    { value: '13', label: 'games' },
    { value: 'Solo & multiplayer', label: 'modes' },
    { value: 'XP', label: 'on every play' },
  ],
  featuresHeading: 'Play your way to better',
  features: [
    {
      title: 'Ear training',
      body: 'Chroma and Constellations sharpen your ear for pitch and interval.',
      icon: <Ear />,
    },
    {
      title: 'Theory & chords',
      body: 'Puzzle games that make harmony and progressions stick.',
      icon: <Puzzle />,
    },
    {
      title: 'Rhythm',
      body: 'Foli and Groove Lab train your timing and feel.',
      icon: <Waves />,
    },
    {
      title: 'Sound design',
      body: 'Wave Sculptor and Signal Flow — a playground for sound.',
      icon: <AudioWaveform />,
    },
    {
      title: 'Multiplayer Jam',
      body: 'Jump into a live Jam Room and play together.',
      icon: <Users />,
    },
    {
      title: 'XP & streaks',
      body: 'Every game feeds your progress across Music Atlas.',
      icon: <Flame />,
    },
  ],
  how: {
    heading: 'How it works',
    steps: [
      { title: 'Pick a game', body: 'Choose a skill you want to sharpen.' },
      { title: 'Drill it', body: 'Short, focused rounds that adapt to you.' },
      {
        title: 'Earn XP & climb',
        body: 'Every round feeds your streak and level.',
      },
    ],
  },
  crossLinks: {
    links: [
      {
        label: 'Studio',
        description: 'Make music in your browser',
        href: MarketingRoutes.studio(),
      },
      {
        label: 'Learn',
        description: 'Theory, technique & real songs',
        href: MarketingRoutes.learn(),
      },
      {
        label: 'Globe',
        description: 'Explore the world of music',
        href: MarketingRoutes.globe(),
      },
    ],
  },
  cta: {
    headline: 'Start playing today.',
    subtext: 'Free to play — train your ear the fun way.',
    primaryCta: { label: 'Start free', href: AuthRoutes.signIn() },
    secondaryCta: { label: 'Play the Arcade', href: GameRoutes.root() },
  },
};

export const ArcadePage = () => <ProductPageTemplate data={data} />;
