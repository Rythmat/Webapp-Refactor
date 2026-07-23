import type { ReactNode } from 'react';

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
}

export interface CrossLink {
  label: string;
  description: string;
  href: string;
}

export interface Stat {
  value: string;
  label: string;
}

/** Data model for a template-driven marketing product page. */
export interface ProductPageData {
  slug: string;
  seo: { title: string; description: string; canonicalPath: string };
  /** CSS accent color for the page (per-module). */
  accent: string;
  hero: {
    eyebrow?: string;
    headline: string;
    subtext: string;
    primaryCta: Cta;
    secondaryCta?: Cta;
    /** Seed for the hex-art hero visual (generateStudioTileSvg). */
    artSeed: string;
  };
  /** Real catalog stats only (no fabricated metrics). */
  stats?: Stat[];
  featuresHeading?: string;
  features: ValueProp[];
  how?: { heading?: string; steps: HowItWorksStep[] };
  crossLinks?: { heading?: string; links: CrossLink[] };
  cta: {
    headline: string;
    subtext?: string;
    primaryCta: Cta;
    secondaryCta?: Cta;
  };
}
