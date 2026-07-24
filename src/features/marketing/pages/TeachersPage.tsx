import {
  ClipboardList,
  EyeOff,
  LineChart,
  Presentation,
  Users,
  Wifi,
} from 'lucide-react';
import { AuthRoutes, MarketingRoutes } from '@/constants/routes';
import { ProductPageTemplate } from '../ProductPageTemplate';
import type { ProductPageData } from '../content/types';

const CONTACT = 'mailto:hello@music-atlas.io';

const data: ProductPageData = {
  slug: 'teachers',
  accent: '#f472b6',
  seo: {
    title: 'For Teachers — Teach music in real time | Music Atlas',
    description:
      'Run live, synced music lessons where your projector leads and every student device follows — with rosters, assignments and progress built in.',
    canonicalPath: '/for-teachers',
  },
  hero: {
    eyebrow: 'For Educators',
    headline: 'Teach music in real time.',
    subtext:
      'Run live, synced lessons where your projector leads and every student device follows — with rosters, assignments and progress built in.',
    primaryCta: { label: 'Set up your classroom', href: AuthRoutes.signIn() },
    secondaryCta: { label: 'Book a demo', href: CONTACT },
    artSeed: 'teachers',
  },
  featuresHeading: 'A classroom that runs itself',
  features: [
    {
      title: 'Realtime sessions',
      body: 'Your projector and every student device stay in sync.',
      icon: <Wifi />,
    },
    {
      title: 'Rosters & join codes',
      body: 'Get a class up and running in minutes.',
      icon: <Users />,
    },
    {
      title: 'Assign anything',
      body: 'Assign lessons, games and songs from across Music Atlas.',
      icon: <ClipboardList />,
    },
    {
      title: 'Track progress',
      body: 'See XP, streaks and awards for every student.',
      icon: <LineChart />,
    },
    {
      title: 'Present to the class',
      body: 'Lead the room with a projector view built for teaching.',
      icon: <Presentation />,
    },
    {
      title: 'Anonymized mode',
      body: 'A projector overlay designed for shy or younger classes.',
      icon: <EyeOff />,
    },
  ],
  how: {
    heading: 'How a class works',
    steps: [
      {
        title: 'Create your class',
        body: 'Set up a roster and share a join code with students.',
      },
      {
        title: 'Run a live session',
        body: 'Present, lock screens, and collect answers in real time.',
      },
      {
        title: 'Assign & track',
        body: 'Send work home and follow each student’s progress.',
      },
    ],
  },
  crossLinks: {
    links: [
      {
        label: 'Learn',
        description: 'The curriculum you’ll assign',
        href: MarketingRoutes.learn(),
      },
      {
        label: 'Arcade',
        description: 'Games to drill skills in class',
        href: MarketingRoutes.arcade(),
      },
      {
        label: 'Studio',
        description: 'Creative projects for students',
        href: MarketingRoutes.studio(),
      },
    ],
  },
  cta: {
    headline: 'Bring Music Atlas to your classroom.',
    subtext: 'Start free, or book a demo for your school.',
    primaryCta: { label: 'Set up your classroom', href: AuthRoutes.signIn() },
    secondaryCta: { label: 'Book a demo', href: CONTACT },
  },
};

export const TeachersPage = () => <ProductPageTemplate data={data} />;
