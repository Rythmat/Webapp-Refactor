import { PrismStudio } from './PrismStudio';

// ── Component ────────────────────────────────────────────────────────────
//
// The dock's Prism tab. A maximized dock gives it the room its pop-out
// window did (milestone 2.9).

export function PrismPanel() {
  return (
    <div className="relative h-full overflow-y-auto p-3">
      <PrismStudio />
    </div>
  );
}
