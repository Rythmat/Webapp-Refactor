import { useEffect } from 'react';
import { CrossLinks } from './components/CrossLinks';
import { CtaBand } from './components/CtaBand';
import { HowItWorks } from './components/HowItWorks';
import { MarketingHelmet } from './components/MarketingHelmet';
import { MarketingHero } from './components/MarketingHero';
import { StatStrip } from './components/StatStrip';
import { ValueProps } from './components/ValueProps';
import type { ProductPageData } from './content/types';

/**
 * Renders a marketing product page from a `ProductPageData` object:
 * hero → stats → value props → how-it-works → cross-links → closing CTA.
 */
export const ProductPageTemplate = ({ data }: { data: ProductPageData }) => {
  // Marketing pages are full-document-scroll; reset to top on mount.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [data.slug]);

  return (
    <>
      <MarketingHelmet {...data.seo} />
      <MarketingHero accent={data.accent} {...data.hero} />
      {data.stats && data.stats.length > 0 && <StatStrip items={data.stats} />}
      <ValueProps
        heading={data.featuresHeading}
        items={data.features}
        accent={data.accent}
      />
      {data.how && (
        <HowItWorks
          heading={data.how.heading}
          steps={data.how.steps}
          accent={data.accent}
        />
      )}
      {data.crossLinks && (
        <CrossLinks
          heading={data.crossLinks.heading}
          links={data.crossLinks.links}
        />
      )}
      <CtaBand accent={data.accent} {...data.cta} />
    </>
  );
};
