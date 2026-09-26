import { Unlock } from 'lucide-react';
import { AuthRoutes, LearnRoutes, MarketingRoutes } from '@/constants/routes';
import { appIcon, MODULE_ICONS } from '@/features/landing/sections/moduleIcons';
import { SongsScene } from '@/features/landing/tour/scenes/SongsScene';
import { TheoryScene } from '@/features/landing/tour/scenes/TheoryScene';
import { SONGS_TOUR, THEORY_TOUR } from '@/features/landing/tour/tourSteps';
import { ProductPageTemplate } from '../ProductPageTemplate';
import type { ProductPageData } from '../content/types';

const data: ProductPageData = {
  slug: 'learn',
  seo: {
    title: 'Learn — A path from beginner to fluent | Music Atlas',
    description:
      'Structured music lessons across theory, technique, style and 650+ real songs — with a guided path that shows you what to practice next.',
    canonicalPath: '/features/learn',
  },
  hero: {
    eyebrow: 'Learn',
    headline: 'A path from beginner to fluent.',
    subtext:
      'Lessons across theory, technique, style and real songs — with a guided path that always shows you what to practice next.',
    primaryCta: { label: 'Start free', href: AuthRoutes.signIn() },
    secondaryCta: { label: 'Browse lessons', href: LearnRoutes.root() },
  },
  stats: [
    { value: '14', label: 'genres' },
    { value: '3 levels', label: 'per genre' },
    { value: '650+', label: 'songs' },
  ],
  featuresHeading: 'Four ways to grow',
  // The app's own Learn icons (sidebar Learn group).
  features: [
    {
      title: 'Theory',
      body: 'Understand scales, chords and modes — and why they work.',
      icon: appIcon('/icons/theory-icon.svg'),
      href: '#theory',
    },
    {
      title: 'Technique',
      body: 'Build real playing skills with guided, hands-on exercises.',
      icon: appIcon('/icons/technique-icon.svg'),
    },
    {
      title: 'Style',
      body: 'Learn to play 14 genres across 3 levels each.',
      icon: appIcon('/icons/genre-icon.svg'),
    },
    {
      title: 'Songs',
      body: 'Learn 650+ real songs with chord charts.',
      icon: appIcon('/icons/popular-releases-icon.svg'),
      href: '#songs',
    },
    {
      title: 'Progress',
      body: 'XP, streaks and awards keep the momentum going.',
      icon: appIcon('/icons/awards-icon.svg'),
    },
    {
      title: 'Free to start',
      body: 'Piano Fundamentals and intro theory are free.',
      icon: <Unlock />,
    },
  ],
  demos: [
    {
      id: 'theory',
      tag: 'Theory',
      statement: {
        lead: 'Theory you can see.',
        rest: 'Scales, chords and modes — each colored by the key it comes from, so you can see why they work.',
      },
      script: THEORY_TOUR,
      Scene: TheoryScene,
    },
    {
      id: 'songs',
      tag: 'Songs',
      statement: {
        lead: 'Learn the songs you love.',
        rest: '650+ real songs with chord charts — every chord colored so you can see where it comes from.',
      },
      script: SONGS_TOUR,
      Scene: SongsScene,
    },
  ],
  how: {
    heading: 'How the path works',
    steps: [
      {
        title: 'Start where you are',
        body: 'Begin at the fundamentals or jump to your genre and level.',
      },
      {
        title: 'Practice with guidance',
        body: 'Follow bite-size lessons that always tell you what’s next.',
      },
      {
        title: 'Level up',
        body: 'Earn XP, keep your streak, and unlock what comes next.',
      },
    ],
  },
  crossLinks: {
    links: [
      {
        label: 'Studio',
        icon: MODULE_ICONS.studio,
        description: 'Make music in your browser',
        href: MarketingRoutes.studio(),
      },
      {
        label: 'Arcade',
        icon: MODULE_ICONS.arcade,
        description: 'Train your ear through play',
        href: MarketingRoutes.arcade(),
      },
      {
        label: 'Globe',
        icon: MODULE_ICONS.globe,
        description: 'Explore the world of music',
        href: MarketingRoutes.globe(),
      },
    ],
  },
  cta: {
    headline: 'Start learning today.',
    subtext: 'Free to begin — no experience needed.',
    primaryCta: { label: 'Start free', href: AuthRoutes.signIn() },
    secondaryCta: { label: 'Browse lessons', href: LearnRoutes.root() },
  },
};

export const LearnPage = () => <ProductPageTemplate data={data} />;
