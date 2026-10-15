/**
 * What the globe's area shows before it can draw: a spinner while the engine
 * and the outlines load, or why it failed. Both engines use it, and so does
 * the Suspense boundary that loads them.
 */
export function GlobeStatus({ error }: { error?: string | null }) {
  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center p-8">
        <p className="text-sm text-atlas-danger">
          Failed to load globe: {error}
        </p>
      </div>
    );
  }
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div
          aria-hidden
          className="size-10 animate-spin rounded-full border-[3px] border-atlas-accent border-t-transparent"
        />
        <p className="text-base font-medium text-atlas-text">
          Loading globe...
        </p>
      </div>
    </div>
  );
}
