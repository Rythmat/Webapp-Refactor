import { cn } from '@/components/utilities';
import { FxRack } from '@/daw/shell/mix/FxRack';
import { MasterGainFader } from '@/daw/shell/mix/master/MasterGainFader';
import { MasterOutputMeter } from '@/daw/shell/mix/master/MasterOutputMeter';
import { useStore } from '@/daw/store';
import { TYPE_CLASS } from '@/daw/ui/styles';

// ── Master, in the dock's slot (milestones 2.9, 2.10) ──────────────────────
//
// The bottom rail's Master opens this where a track's editor goes, as
// Soundtrap's Master drawer does (ST8): the gain at the left, the master
// chain in the middle (the same FxRack as a track's Effects tab and the Mix
// view's racks), and the output's peak at the right. The Mix view keeps the
// full mixer and its master column, built from the same parts
// (shell/mix/master). The lesson anchors mastering-section and master-strip
// stay in the Mix view; this body is dock-master.

const FADER_PX = 112;

export function DockMaster() {
  const roomy = useStore((s) => s.dockMaximized);
  return (
    <div
      data-tutorial-id="dock-master"
      data-testid="dock-master"
      className="flex h-full min-h-0"
    >
      <Column label="Gain">
        <MasterGainFader length={FADER_PX} />
      </Column>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden border-x border-daw-hairline">
        <FxRack
          target={MASTER}
          roomy={roomy}
          empty="Effects here shape the whole mix. Add effect opens the library."
        />
      </div>
      <Column label="Output">
        <MasterOutputMeter length={FADER_PX} />
      </Column>
    </div>
  );
}

const MASTER = { kind: 'master' } as const;

function Column({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-24 shrink-0 flex-col items-center justify-center gap-1.5 py-2">
      {children}
      <span className={cn(TYPE_CLASS.label, 'text-daw-text-2')}>{label}</span>
    </div>
  );
}
