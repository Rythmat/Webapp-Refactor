import ReactMarkdown from 'react-markdown';

interface Props {
  content: string;
}

export function MarkdownRenderer({ content }: Props) {
  return (
    <ReactMarkdown
      components={{
        h2: ({ children }) => (
          <h2 className="mb-2 mt-6 text-lg font-semibold text-teal-400 first:mt-0">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="mb-1.5 mt-4 text-base font-medium text-zinc-200">
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className="mb-3 text-sm leading-relaxed text-zinc-300">
            {children}
          </p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-white">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-zinc-200">{children}</em>
        ),
        ul: ({ children }) => (
          <ul className="mb-3 list-inside list-disc space-y-1 text-sm text-zinc-300">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-3 list-inside list-decimal space-y-1 text-sm text-zinc-300">
            {children}
          </ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        hr: () => <hr className="my-4 border-zinc-700/50" />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
