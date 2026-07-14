import { Plus } from 'lucide-react';
import { useMemo, type FC } from 'react';
import { Link } from 'react-router-dom';
import { HexWaveBackground } from '@/components/ui/hex-wave-background';
import { ProfileRoutes } from '@/constants/routes';
import { type EvaluatedAward, useRecentAwards } from '@/hooks/data/useAwards';
import { generateStudioTileSvg } from '@/lib/studioProjectTile';

const RecentAwardTile: FC<{ award: EvaluatedAward }> = ({ award }) => {
  const tile = useMemo(
    () => generateStudioTileSvg(`award:${award.id}`, 320, 200),
    [award.id],
  );

  return (
    <Link
      to={ProfileRoutes.awards()}
      aria-label={`${award.title} — view all awards`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-all duration-200 hover:-translate-y-1 hover:border-white/25"
    >
      <div className="relative h-28 overflow-hidden bg-[#101012]">
        {/* Interactive hex tile — pointer-events-none so the whole card is one
            link target while the canvas paints toward the cursor. */}
        <HexWaveBackground
          src={tile}
          drain={false}
          ambient
          backgroundColor="#101012"
          colorThreshold={0.05}
          brushRadius={38}
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>
      <div className="flex flex-col gap-0.5 px-3 pb-3 pt-2">
        <span className="truncate text-sm font-semibold text-white">
          {award.title}
        </span>
        <span className="truncate text-[11px] text-white/45">
          {award.category}
        </span>
      </div>
    </Link>
  );
};

/**
 * Recent Awards card for the User page — the user's most-recently-earned
 * achievement badges (see `useRecentAwards`), each on the same interactive hex
 * tile used across the app, linking through to the full Awards page. Shows an
 * encouraging empty state until the first badge is unlocked.
 */
export const RecentAwardsCard: FC = () => {
  const recent = useRecentAwards(4);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="text-2xl font-medium text-white">Recent Awards</h2>
        <Link
          to={ProfileRoutes.awards()}
          className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 transition-colors hover:border-white/25 hover:text-white md:text-base"
        >
          <span>View All Awards</span>
          <Plus className="h-5 w-5" />
        </Link>
      </div>

      {recent.length === 0 ? (
        <div
          className="glass-panel-sm rounded-3xl px-6 py-10 text-center text-sm text-white/50"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--color-border)',
          }}
        >
          No awards yet — keep learning, playing the Arcade, and connecting with
          musicians to earn your first badge.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {recent.map((award) => (
            <RecentAwardTile key={award.id} award={award} />
          ))}
        </div>
      )}
    </section>
  );
};
