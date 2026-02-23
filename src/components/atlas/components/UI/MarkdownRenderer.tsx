import ReactMarkdown from 'react-markdown'

interface Props {
  content: string
}

export function MarkdownRenderer({ content }: Props) {
  return (
    <ReactMarkdown
      components={{
        h2: ({ children }) => (
          <h2 className="text-lg font-semibold text-teal-400 mt-6 mb-2 first:mt-0">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-base font-medium text-zinc-200 mt-4 mb-1.5">
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className="text-sm text-zinc-300 leading-relaxed mb-3">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="text-white font-semibold">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="text-zinc-200 italic">{children}</em>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside space-y-1 mb-3 text-sm text-zinc-300">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside space-y-1 mb-3 text-sm text-zinc-300">
            {children}
          </ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        hr: () => <hr className="border-zinc-700/50 my-4" />,
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
