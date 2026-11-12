/** The dashboard's shape while its courses load: the hero and week side by
 *  side, then a row of cards, so nothing jumps when they arrive. */
export function DashboardSkeleton() {
  const block =
    'animate-pulse rounded-[1.25rem] bg-white/[0.05] motion-reduce:animate-none';
  return (
    <div
      aria-busy="true"
      aria-label="Loading your Learn"
      className="flex flex-col gap-10"
    >
      <div className="grid grid-cols-1 gap-4 @[52rem]:grid-cols-12">
        <div className={`${block} h-60 @[52rem]:col-span-8`} />
        <div className={`${block} h-60 @[52rem]:col-span-4`} />
      </div>
      {[0, 1].map((row) => (
        <div key={row} className="flex flex-col gap-3">
          <div className={`${block} h-5 w-48 rounded-full`} />
          <div className="flex gap-4 overflow-hidden">
            {[0, 1, 2, 3, 4, 5].map((card) => (
              <div
                key={card}
                className={`${block} aspect-square w-[10.5rem] shrink-0 rounded-2xl`}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
