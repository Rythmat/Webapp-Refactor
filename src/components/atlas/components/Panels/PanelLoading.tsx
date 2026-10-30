import { SpectrumBar } from '@/components/art/light/SpectrumLight';
import { ATLAS_EYEBROW } from '@/components/atlas/components/UI/primitives';

/** A panel on its way: its name, and the app's working line. */
export function PanelLoading({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <p className={ATLAS_EYEBROW}>{title}</p>
      <SpectrumBar label={`Loading ${title}`} className="w-32" />
    </div>
  );
}
