import { useMemo, type FC } from 'react';
import { HexWaveBackground } from '@/components/ui/hex-wave-background';
import { type EvaluatedAward, useAwards } from '@/hooks/data/useAwards';
import { AWARD_CATEGORY_ORDER } from '@/lib/awards/catalog';
import { generateStudioTileSvg } from '@/lib/studioProjectTile';
import { WelcomeHeader } from '../ClassroomLayout/dashboard/WelcomeHeader';

const AwardCard: FC<{ award: EvaluatedAward }> = ({ award }) => {
  const { title, description, unlocked, current, target, progress } = award;
  const tile = useMemo(
    () => generateStudioTileSvg(`award:${award.id}`, 480, 280),
    [award.id],
  );

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border transition-colors ${
        unlocked
          ? 'border-white/15 bg-white/[0.04]'
          : 'border-white/10 bg-white/[0.02]'
      }`}
    >
      <div className="relative h-40 overflow-hidden bg-[#101012]">
        {/* Interactive hex tile (dimmed until unlocked). pointer-events-none so
            it never blocks the card; the canvas paints toward the cursor. */}
        <div
          className={`absolute inset-0 transition-all ${
            unlocked ? '' : 'opacity-25 grayscale'
          }`}
        >
          <HexWaveBackground
            src={tile}
            drain={false}
            ambient
            backgroundColor="#101012"
            colorThreshold={0.05}
            brushRadius={45}
            className="pointer-events-none absolute inset-0 h-full w-full"
          />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        {unlocked && (
          <span className="absolute right-3 top-3 z-10 rounded-full border border-emerald-400/40 bg-emerald-400/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300 backdrop-blur-sm">
            Unlocked
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5 p-4">
        <h3 className="font-serif text-base text-white">{title}</h3>
        <p className="text-xs text-white/50">{description}</p>
        {!unlocked && (
          <div className="mt-1.5 flex flex-col gap-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#7ecfcf] transition-[width] duration-500"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <span className="text-[11px] tabular-nums text-white/40">
              {Math.min(current, target)} / {target}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Awards page — real achievement badges earned from the user's progress (streak,
 * level, lessons, arcade, connections), each on an interactive hex tile. Unlocked
 * badges are in colour; locked ones are dimmed with a progress bar. See `useAwards`.
 */
export const AwardsInlet: FC = () => {
  const { awards, unlockedCount, total } = useAwards();

  return (
    <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-8 px-6 py-6 md:gap-12 md:px-10 md:py-10">
      <WelcomeHeader format={(name) => `${name}'s Awards`} />

      <div className="flex flex-col gap-8">
        <p className="text-sm text-white/60">
          <span className="font-semibold text-white tabular-nums">
            {unlockedCount}
          </span>{' '}
          of {total} unlocked
        </p>

        {AWARD_CATEGORY_ORDER.map((category) => {
          const items = awards.filter((a) => a.category === category);
          if (items.length === 0) return null;
          return (
            <section key={category} className="flex flex-col gap-4">
              <h2 className="text-lg font-medium text-white">{category}</h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                {items.map((award) => (
                  <AwardCard key={award.id} award={award} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
