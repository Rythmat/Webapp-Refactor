import { ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { CurriculumRoutes } from '@/constants/routes';
import { loadPianoFundamentals } from '@/curriculum/data/activityFlows';
import type { FundamentalsFlow } from '@/curriculum/types/fundamentals';
import './learn.css';

export function FundamentalsOverview() {
  const navigate = useNavigate();
  const [flow, setFlow] = useState<FundamentalsFlow | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadPianoFundamentals().then((data) => {
      if (!cancelled) setFlow(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!flow) {
    return (
      <div
        className="learn-root p-8"
        style={{ color: 'var(--color-text-dim)' }}
      >
        Loading...
      </div>
    );
  }

  const accentColor = '#7ecfcf';

  return (
    <div
      className="learn-root flex flex-col gap-6"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <h2
        className="ml-[10%] text-left text-2xl font-semibold md:text-3xl"
        style={{ color: 'var(--color-text)' }}
      >
        {flow.title}
      </h2>

      <p
        className="ml-[10%] text-left text-sm"
        style={{ color: 'var(--color-text-dim)' }}
      >
        Learn the piano keyboard from scratch — note names, octaves, hand
        positions, and chord finger placements.
      </p>

      <section className="mb-6 flex flex-col items-center">
        <div className="flex w-full max-w-3xl flex-col gap-3">
          {flow.sections.map((section) => (
            <div
              key={section.id}
              className="glass-panel-sm flex cursor-pointer items-center justify-between rounded-lg p-4 transition-colors duration-150"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--color-border)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              }}
              onClick={() =>
                navigate(
                  CurriculumRoutes.fundamentalsSection({
                    sectionId: section.id,
                  }),
                )
              }
            >
              <div className="flex items-center gap-4">
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{
                    background: 'rgba(126,207,207,0.15)',
                    color: accentColor,
                  }}
                >
                  {section.id}
                </span>
                <div>
                  <h3
                    className="text-sm font-semibold"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {section.name}
                  </h3>
                  <p
                    className="text-xs"
                    style={{ color: 'var(--color-text-dim)' }}
                  >
                    {section.steps.length}{' '}
                    {section.steps.length === 1 ? 'activity' : 'activities'}
                  </p>
                </div>
              </div>
              <ChevronRight
                size={16}
                style={{ color: 'var(--color-text-dim)' }}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
