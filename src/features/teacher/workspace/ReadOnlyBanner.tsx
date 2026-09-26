/**
 * The visible half of the role model.
 *
 * Two states, both of which must be SAID rather than implied:
 *
 *   - `viewer` — a co-teacher who can open every surface but change nothing.
 *     Disabled buttons alone do not explain why, and a teacher who cannot tell
 *     "broken" from "not mine to change" files the first as a bug.
 *   - `degraded` — the role could not be determined (the classroom list or the
 *     co-teacher lookup failed). The guards deliberately do NOT eject anyone on
 *     a failed lookup, so the honest thing is to admit the uncertainty instead
 *     of presenting a confidently wrong surface.
 */
import { Eye, ShieldAlert } from 'lucide-react';

interface ReadOnlyBannerProps {
  role: 'viewer' | null;
  /** The role lookup failed; permissions shown may be wrong. */
  degraded?: boolean;
}

export const ReadOnlyBanner = ({ role, degraded }: ReadOnlyBannerProps) => {
  if (degraded) {
    return (
      <div
        role="status"
        className="flex items-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] px-4 py-2 text-sm text-amber-200"
      >
        <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden />
        Your access level for this classroom could not be confirmed. You can
        keep working, but some controls may not save.
      </div>
    );
  }

  if (role !== 'viewer') return null;

  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-2 text-sm text-white/60"
    >
      <Eye className="h-4 w-4 shrink-0" aria-hidden />
      You have <span className="text-white/85">view-only</span> access to this
      classroom. Ask the owner for Editor access to make changes.
    </div>
  );
};
