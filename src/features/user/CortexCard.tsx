import { lazy, Suspense } from 'react';
import { PerStudent } from '@/components/ui/PerStudent';

// The map and its catalogues load with this card, not with the User page.
const CortexPanel = lazy(() => import('@/features/cortex/CortexPanel'));

/** The student's Cortex, a map of everything they've done and how it connects
 *  (owner, 2026-11-01), on the User page since 2026-11-04, on the app's own
 *  background as the console's Cortex is. */
export function CortexCard() {
  return (
    <section className="flex flex-col gap-4" data-cortex-card>
      <h2 className="text-2xl font-medium text-white">Your Cortex</h2>
      <div className="relative h-[34rem] overflow-hidden rounded-3xl border border-white/10 bg-[hsl(var(--ui-background))]">
        <div className="absolute inset-0">
          <PerStudent label="Your Cortex" className="h-full">
            <Suspense fallback={null}>
              <CortexPanel />
            </Suspense>
          </PerStudent>
        </div>
      </div>
    </section>
  );
}
