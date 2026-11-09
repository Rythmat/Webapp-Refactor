import { SpectrumBar } from '@/components/art/light/SpectrumLight';

/**
 * What the globe's area shows before it can draw: the app's working line
 * while the engine and the outlines load, or why it failed. Both engines use
 * it, and so does the Suspense boundary that loads them.
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
      <SpectrumBar label="Loading the map" className="w-40" />
    </div>
  );
}
