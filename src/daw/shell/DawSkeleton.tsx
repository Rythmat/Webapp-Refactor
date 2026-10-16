// ── The editor's placeholder while its code loads (milestone 1.12a) ────────
//
// What /studio/editor shows until the editor's chunk has arrived, in the
// shell's own proportions (milestones 2.4 and 2.5), so nothing jumps when
// it replaces it: the 44 px top bar with its three zones, the 200 px track
// headers beside the timeline, its rulers (62 px) and lanes (80 px), and
// the dock at its default 36% of the body, with the Inspector column beside
// them from 1440 px (it starts closed on a smaller window). The Opening
// overlay then covers the editor while a session opens.
//
// CSS only, with no editor imports, in the app theme's colours (the DAW
// tokens alias them, and arrive with the editor): ClassroomDashboard renders
// it from the app's entry chunk (bundle-load-06).

const BORDER = 'border-white/[0.08]';
const SURFACE = 'bg-card';
const BLOCK = 'rounded-full bg-white/[0.06]';
const LANES = [0, 1, 2];

export function DawSkeleton() {
  return (
    <div
      className="relative grid min-h-0 w-full flex-1 overflow-hidden bg-background motion-safe:animate-pulse"
      style={{
        gridTemplateAreas: '"top top" "main inspector" "dock inspector"',
        gridTemplateRows: '44px minmax(0, 1fr) calc((100vh - 44px) * 0.36)',
        gridTemplateColumns: 'minmax(0, 1fr) auto',
      }}
      role="status"
      aria-busy="true"
      aria-label="Opening the Studio"
      data-testid="daw-skeleton"
    >
      <div
        className={`flex items-center gap-1 border-b px-2 ${BORDER}`}
        style={{ gridArea: 'top' }}
      >
        <div className={`size-7 ${BLOCK}`} />
        <div className={`h-7 w-20 ${BLOCK}`} />
        <div className={`h-7 w-[150px] ${BLOCK}`} />
        <div className="flex-1" />
        <div className={`size-7 ${BLOCK}`} />
        <div className={`size-9 ${BLOCK}`} />
        <div className={`size-7 ${BLOCK}`} />
        <div className={`h-7 w-20 ${BLOCK}`} />
        <div className="flex-1" />
        <div className={`h-7 w-36 ${BLOCK}`} />
        <div className={`h-7 w-56 ${BLOCK}`} />
        <div className={`size-7 ${BLOCK}`} />
      </div>

      <div
        className="flex min-h-0 overflow-hidden"
        style={{ gridArea: 'main' }}
      >
        <div
          className={`flex w-[200px] shrink-0 flex-col border-r ${BORDER} ${SURFACE}`}
        >
          <div className={`h-[62px] shrink-0 border-b ${BORDER}`} />
          {LANES.map((lane) => (
            <div
              key={lane}
              className={`flex h-20 shrink-0 flex-col justify-center gap-2 border-b px-3 ${BORDER}`}
            >
              <div className={`h-3 w-24 ${BLOCK}`} />
              <div className={`h-2 w-32 ${BLOCK}`} />
            </div>
          ))}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className={`h-[62px] shrink-0 border-b ${BORDER}`} />
          {LANES.map((lane) => (
            <div
              key={lane}
              className={`flex h-20 shrink-0 items-center border-b px-2 ${BORDER}`}
            >
              <div
                className="h-14 rounded-md bg-white/[0.04]"
                style={{ width: `${40 - lane * 8}%` }}
              />
            </div>
          ))}
        </div>
      </div>

      <div
        className={`hidden w-[200px] border-l min-[1440px]:block ${BORDER} ${SURFACE}`}
        style={{ gridArea: 'inspector' }}
      />

      <div
        className={`flex flex-col border-t ${BORDER} ${SURFACE}`}
        style={{ gridArea: 'dock' }}
      >
        <div className="flex h-8 shrink-0 items-center gap-1 px-3">
          <div className={`h-4 w-16 ${BLOCK}`} />
          <div className={`h-4 w-10 ${BLOCK}`} />
          <div className={`h-4 w-14 ${BLOCK}`} />
        </div>
      </div>
      <span className="sr-only">Opening the Studio…</span>
    </div>
  );
}
