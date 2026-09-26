import { useEffect } from 'react';
import { DemoSection } from '@/features/landing/sections/ModuleBlock';
import { CrossLinks } from './components/CrossLinks';
import { CtaBand } from './components/CtaBand';
import { HowItWorks } from './components/HowItWorks';
import { MarketingHelmet } from './components/MarketingHelmet';
import { MarketingHero } from './components/MarketingHero';
import { StatStrip } from './components/StatStrip';
import { ValueProps } from './components/ValueProps';
import type { ProductPageData } from './content/types';

/**
 * Renders a marketing product page from a `ProductPageData` object, in the
 * landing's look: hero horizon → stats → features bento → live demos →
 * how-it-works → cross-links → closing CTA, as hairline-divided bands inside
 * the landing's framed column (`LandingShell`, via `MarketingLayout`).
 */
export const ProductPageTemplate = ({ data }: { data: ProductPageData }) => {
  // Marketing pages are full-document-scroll: open at the top, or at the
  // section a deep link points to (e.g. `/features/learn#songs`).
  useEffect(() => {
    const id = window.location.hash.slice(1);
    const target = id ? document.getElementById(id) : null;
    if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [data.slug]);

  return (
    <>
      <MarketingHelmet {...data.seo} />
      <MarketingHero {...data.hero} />
      {data.stats && data.stats.length > 0 && <StatStrip items={data.stats} />}
      <ValueProps heading={data.featuresHeading} items={data.features} />
      {data.demos?.map((d) => (
        <DemoSection
          key={d.id}
          id={d.id}
          tag={d.tag}
          statement={d.statement}
          script={d.script}
          Scene={d.Scene}
        />
      ))}
      {data.how && (
        <HowItWorks heading={data.how.heading} steps={data.how.steps} />
      )}
      {data.crossLinks && (
        <CrossLinks
          heading={data.crossLinks.heading}
          links={data.crossLinks.links}
        />
      )}
      <CtaBand {...data.cta} />
    </>
  );
};
