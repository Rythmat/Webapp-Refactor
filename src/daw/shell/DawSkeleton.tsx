// ── The editor's placeholder while its code loads (milestone 1.12a) ────────
//
// What /studio/editor shows until the editor's chunk has arrived, in the
// editor's own proportions, so nothing jumps when it replaces it: the 48 px
// transport bar, the 200 px track headers beside the timeline, its rulers
// (62 px) and lanes (80 px), the 200 px library column and the dock's 32 px
// tab bar. The Opening overlay then covers the editor while a session opens.
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
      className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-background motion-safe:animate-pulse"
      role="status"
      aria-busy="true"
      aria-label="Opening the Studio"
      data-testid="daw-skeleton"
    >
      <div
        className={`flex h-12 shrink-0 items-center gap-2 border-b px-3 ${BORDER}`}
      >
        <div className={`h-7 w-20 ${BLOCK}`} />
        <div className={`h-7 w-28 ${BLOCK}`} />
        <div className="flex-1" />
        <div className={`size-8 ${BLOCK}`} />
        <div className={`size-8 ${BLOCK}`} />
        <div className={`size-8 ${BLOCK}`} />
        <div className="flex-1" />
        <div className={`h-7 w-24 ${BLOCK}`} />
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
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

        <div className={`w-[200px] shrink-0 border-l ${BORDER} ${SURFACE}`} />
      </div>

      <div
        className={`flex h-8 shrink-0 items-center gap-1 border-t px-3 ${BORDER} ${SURFACE}`}
      >
        <div className={`h-4 w-16 ${BLOCK}`} />
        <div className={`h-4 w-10 ${BLOCK}`} />
        <div className={`h-4 w-14 ${BLOCK}`} />
      </div>
      <span className="sr-only">Opening the Studio…</span>
    </div>
  );
}
