/**
 * The prompt's mark (owner, 2026-10-23): a triangle, ∆, drawn as a line,
 * on the side rail's button that opens and folds the prompt bar.
 */
export function PromptDeltaIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {/* Raised a pixel: a triangle's weight sits low in its box. */}
      <path d="M10 2.75 17.25 15.5H2.75Z" />
    </svg>
  );
}
