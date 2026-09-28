import type { ComponentType, ReactNode } from 'react';
import type { SceneProps } from '@/features/landing/tour/scenes/sceneTypes';
import type { TourScript } from '@/features/landing/tour/tourSteps';

export interface Cta {
  label: string;
  href: string;
}

export interface HowItWorksStep {
  title: string;
  body: string;
}

export interface ValueProp {
  title: string;
  body: string;
  icon?: ReactNode;
  /** In-page anchor (e.g. "#songs"): the bento cell jumps to that demo. */
  href?: string;
}

export interface CrossLink {
  label: string;
  description: string;
  href: string;
  /** The module's app icon (`MODULE_ICONS`). */
  icon?: ReactNode;
}

export interface Stat {
  value: string;
  label: string;
}

/** A live guided demo section, built on the landing's product tour. */
interface ProductDemo {
  /** Section id, and the in-page anchor features can link to. */
  id: string;
  /** Small tag above the statement, e.g. "Songs". */
  tag: string;
  /** Two-tone statement: white lead + dimmed continuation. */
  statement: { lead: string; rest: string };
  script: TourScript;
  Scene: ComponentType<SceneProps>;
}

/** Data model for a template-driven marketing product page. */
export interface ProductPageData {
  slug: string;
  seo: { title: string; description: string; canonicalPath: string };
  hero: {
    eyebrow?: string;
    headline: string;
    subtext: string;
    primaryCta: Cta;
    secondaryCta?: Cta;
  };
  /** Real catalog stats only (no fabricated metrics). */
  stats?: Stat[];
  featuresHeading?: string;
  features: ValueProp[];
  /** Live demos, shown after the features. */
  demos?: ProductDemo[];
  how?: { heading?: string; steps: HowItWorksStep[] };
  crossLinks?: { heading?: string; links: CrossLink[] };
  cta: {
    headline: string;
    subtext?: string;
    primaryCta: Cta;
    secondaryCta?: Cta;
  };
}
