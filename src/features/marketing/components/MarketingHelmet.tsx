import { Helmet } from 'react-helmet';

const ORIGIN = 'https://music-atlas.io';

/** Per-page SEO tags for a public marketing page. */
export const MarketingHelmet = ({
  title,
  description,
  canonicalPath,
}: {
  title: string;
  description: string;
  canonicalPath: string;
}) => {
  const url = `${ORIGIN}${canonicalPath}`;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href={url} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
};
