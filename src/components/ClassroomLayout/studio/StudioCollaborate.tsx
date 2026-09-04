import { UserPlus, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StudioRoutes } from '@/constants/routes';
import '@/features/settings/settings.css';

/**
 * Connect + Collaborate — starts a live collaborative Studio session.
 *
 * This card used to list your accepted connections and auto-invite the ones you
 * picked (`?collab=new&invite=<ids>`). Both halves of that are gone: the
 * connection graph never produced a mutual connection, and the invite inbox it
 * fed (`api/collab/invites`) stored invites under an id the recipient never read
 * from, so no invite was ever delivered. Sharing the room code — which is how
 * every working session has actually been joined — is what remains.
 */
export const StudioCollaborate = () => {
  const navigate = useNavigate();

  const startSession = () =>
    navigate(`${StudioRoutes.editor.definition}?collab=new`);

  return (
    <section
      aria-label="Connect and Collaborate"
      className="settings-root flex flex-col gap-4 md:gap-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 md:gap-3">
          <Users className="h-7 w-7 text-white/85 md:h-8 md:w-8" />
          <h2 className="text-xl font-medium text-white md:text-2xl">
            Connect &amp; Collaborate
          </h2>
        </div>
        <button
          type="button"
          onClick={startSession}
          className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-black transition-colors hover:bg-gray-200"
        >
          <UserPlus className="size-4" />
          Start a Session
        </button>
      </div>

      <div
        className="rounded-2xl border p-4 md:p-5"
        style={{
          background: 'rgba(255,255,255,0.03)',
          borderColor: 'var(--color-border)',
        }}
      >
        <p className="text-sm text-white/60">
          Start a live collaborative session, then share the room code from the
          Studio toolbar. Anyone with the code can join from{' '}
          <span className="text-white/80">Start Collaboration → Join Room</span>
          .
        </p>
      </div>
    </section>
  );
};
