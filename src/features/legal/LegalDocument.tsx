import Markdown from 'react-markdown';

/**
 * Renders a policy ported verbatim from the former Webflow site
 * (`./content/*.md`). The Markdown carries its own title and
 * "Last Updated" line.
 */
export const LegalDocument = ({ source }: { source: string }) => {
  return (
    // The page background is always dark (no `.dark` class to key off).
    <article className="prose prose-invert mx-auto max-w-4xl px-4 py-8">
      <Markdown
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              {...(href?.startsWith('http')
                ? { target: '_blank', rel: 'noreferrer' }
                : {})}
            >
              {children}
            </a>
          ),
        }}
      >
        {source}
      </Markdown>
    </article>
  );
};
