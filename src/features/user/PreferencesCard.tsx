import { SlidersHorizontal } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import { useCustomCursorEnabled } from '@/hooks/useCustomCursorEnabled';
import { useLoginSoundEnabled } from '@/hooks/useLoginSoundEnabled';
import { PreferenceToggleRow } from './PreferenceToggleRow';

/**
 * User-page preferences card. Exposes the custom hexagon cursor toggle (off by
 * default; desktop/mouse devices only) and the login sound toggle (on by
 * default; the jingle is a first-run welcome, and switching this back on
 * re-arms it for the next sign-in).
 */
export const PreferencesCard = () => {
  const { userId } = useAuthContext();
  const [cursorEnabled, setCursorEnabled] = useCustomCursorEnabled();
  const [loginSoundEnabled, setLoginSoundEnabled] =
    useLoginSoundEnabled(userId);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-white">
        <SlidersHorizontal size={20} />
        <h2 className="text-2xl font-medium">Preferences</h2>
      </div>
      <div
        className="glass-panel-sm relative rounded-3xl p-6"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="flex flex-col divide-y divide-white/10">
          <PreferenceToggleRow
            label="Custom cursor"
            description="A white hexagon cursor with a hover animation. Desktop only."
            checked={cursorEnabled}
            onCheckedChange={setCursorEnabled}
          />
          <PreferenceToggleRow
            label="Login sound"
            description="A short welcome jingle the first time you sign in. Turn this back on to hear it once more next time."
            checked={loginSoundEnabled}
            onCheckedChange={setLoginSoundEnabled}
          />
        </div>
      </div>
    </section>
  );
};
