import { MousePointer2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useCustomCursorEnabled } from '@/hooks/useCustomCursorEnabled';

/**
 * User-page preferences card. Currently exposes the custom hexagon cursor toggle
 * (off by default; only takes effect on desktop/mouse devices).
 */
export const PreferencesCard = () => {
  const [cursorEnabled, setCursorEnabled] = useCustomCursorEnabled();

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-white">
        <MousePointer2 size={20} />
        <h2 className="text-2xl font-medium">Preferences</h2>
      </div>
      <div
        className="glass-panel-sm relative rounded-3xl p-6"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-col">
            <span className="text-sm text-white">Custom cursor</span>
            <span className="text-xs text-white/50">
              A white hexagon cursor with a hover animation. Desktop only.
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-xs font-medium text-white/60">
              {cursorEnabled ? 'On' : 'Off'}
            </span>
            <Switch
              checked={cursorEnabled}
              onCheckedChange={setCursorEnabled}
              className="data-[state=checked]:bg-white"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
