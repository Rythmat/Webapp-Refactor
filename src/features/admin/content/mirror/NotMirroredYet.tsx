import { Link, useLocation } from 'react-router-dom';

/** Why a path is not mirrored, by its first segment. */
const OWNER: Record<string, string> = {
  studio: 'A student’s own Studio project — made in the editor, not content.',
  arcade:
    'An Arcade game. Games are built in code today; their metadata arrives with the catalog phase.',
  songs: 'A student’s own set lists.',
  home: 'A student’s own awards or plan.',
  settings: 'A user’s settings.',
  teacher: 'A teacher’s workspace — their own plan and classes.',
};

/**
 * An app page the console does not show. It names the page and why, so a
 * link followed inside the mirror never lands somewhere blank — and never
 * leaves /console.
 */
export const NotMirroredYet = () => {
  const { pathname, search } = useLocation();
  const segment = pathname.split('/')[1] ?? '';
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-3 px-6 py-24 text-center">
      <p className="text-xs uppercase tracking-wide text-white/40">
        Not shown in the console
      </p>
      <p className="break-all text-lg text-white">
        {pathname}
        {search}
      </p>
      <p className="text-sm text-white/55">
        {OWNER[segment] ?? 'This page has no content to edit here.'}
      </p>
      <Link
        to="/learn?tab=Songs"
        className="mt-2 rounded-full border border-white/15 px-4 py-1.5 text-sm text-white/80 hover:border-white/30"
      >
        Back to Learn
      </Link>
    </div>
  );
};
