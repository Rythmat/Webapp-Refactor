import {
  Dumbbell,
  Flame,
  GraduationCap,
  ListMusic,
  Music,
  Unlock,
} from 'lucide-react';
import { AuthRoutes, LearnRoutes, MarketingRoutes } from '@/constants/routes';
import { ProductPageTemplate } from '../ProductPageTemplate';
import type { ProductPageData } from '../content/types';

const data: ProductPageData = {
  slug: 'learn',
  accent: '#34d399',
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
    artSeed: 'learn',
  },
  stats: [
    { value: '14', label: 'genres' },
    { value: '3 levels', label: 'per genre' },
    { value: '650+', label: 'songs' },
  ],
  featuresHeading: 'Four ways to grow',
  features: [
    {
      title: 'Theory',
      body: 'Understand scales, chords and modes — and why they work.',
      icon: <GraduationCap />,
    },
    {
      title: 'Technique',
      body: 'Build real playing skills with guided, hands-on exercises.',
      icon: <Dumbbell />,
    },
    {
      title: 'Style',
      body: 'Learn to play 14 genres across 3 levels each.',
      icon: <Music />,
    },
    {
      title: 'Songs',
      body: 'Learn 650+ real songs with chord charts.',
      icon: <ListMusic />,
    },
    {
      title: 'Progress',
      body: 'XP, streaks and awards keep the momentum going.',
      icon: <Flame />,
    },
    {
      title: 'Free to start',
      body: 'Piano Fundamentals and intro theory are free.',
      icon: <Unlock />,
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
        description: 'Make music in your browser',
        href: MarketingRoutes.studio(),
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
    headline: 'Start learning today.',
    subtext: 'Free to begin — no experience needed.',
    primaryCta: { label: 'Start free', href: AuthRoutes.signIn() },
    secondaryCta: { label: 'Browse lessons', href: LearnRoutes.root() },
  },
};

export const LearnPage = () => <ProductPageTemplate data={data} />;
