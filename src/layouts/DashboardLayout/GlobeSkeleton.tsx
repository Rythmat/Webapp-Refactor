import { SpectrumBar } from '@/components/art/light/SpectrumLight';

// ── The Globe's placeholder while its code and content load ───────────────
//
// What /globe shows until the page's chunk and the content bundle have
// arrived, in the frame's own proportions so nothing jumps when it replaces
// it: the 44 px top rail (Home and Back at the left, the search pill
// centred, History and Share at the right), the stage card with an 8 px
// gutter, the 48 px side rail of icons at the right and the 44 px bottom
// rail with the view tabs centred. The working line sits on the stage.
//
// CSS only, in the app theme's colours (the Globe's tokens arrive with its
// chunk): ClassroomDashboard renders it from the app's entry chunk.

const BLOCK = 'rounded-full bg-white/[0.06]';
const RAIL_ICONS = [0, 1, 2, 3, 4];

export function GlobeSkeleton() {
  return (
    <div
      className="relative grid min-h-0 w-full flex-1 overflow-hidden bg-background"
      style={{
        gridTemplateAreas: '"top top" "stage rail" "bottom bottom"',
        gridTemplateRows: '44px minmax(0, 1fr) 44px',
        gridTemplateColumns: 'minmax(0, 1fr) 48px',
      }}
      aria-busy="true"
      data-testid="globe-skeleton"
    >
      <div
        className="grid items-center gap-2 px-2"
        style={{
          gridArea: 'top',
          gridTemplateColumns:
            'minmax(max-content, 1fr) minmax(0, 30rem) minmax(max-content, 1fr)',
        }}
      >
        <div className="flex gap-2">
          <div className={`h-9 w-24 ${BLOCK}`} />
          <div className={`h-9 w-20 ${BLOCK}`} />
        </div>
        <div className={`h-9 w-full ${BLOCK}`} />
        <div className="flex justify-end gap-2">
          <div className={`h-9 w-20 ${BLOCK}`} />
          <div className={`h-9 w-24 ${BLOCK}`} />
        </div>
      </div>

      <div
        className="mx-2 flex min-h-0 items-center justify-center rounded-xl bg-card"
        style={{ gridArea: 'stage' }}
      >
        <SpectrumBar label="Opening the Globe" />
      </div>

      <div
        className="flex flex-col items-center gap-1 py-2"
        style={{ gridArea: 'rail' }}
      >
        {RAIL_ICONS.map((icon) => (
          <div key={icon} className="size-8 rounded bg-white/[0.06]" />
        ))}
      </div>

      <div
        className="flex items-center justify-center px-2"
        style={{ gridArea: 'bottom' }}
      >
        <div className={`h-9 w-80 ${BLOCK}`} />
      </div>
    </div>
  );
}
