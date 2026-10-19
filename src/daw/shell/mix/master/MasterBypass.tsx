import { useStore } from '@/daw/store';
import { Toggle } from '@/daw/ui/Toggle';

// ── Master's Bypass (milestones 1.2, 2.10) ─────────────────────────────────
//
// Hear the mix without the master chain, as a listening A/B: exports keep
// the mastering unless the Export dialog leaves it out.

export function MasterBypass({
  testId = 'master-bypass',
}: {
  testId?: string;
}) {
  const bypass = useStore((s) => s.masteringBypass);
  const toggle = useStore((s) => s.toggleMasteringBypass);
  return (
    <Toggle
      label="Bypass mastering: hear the mix without it (exports keep it)"
      size="sm"
      pressed={bypass}
      onPressedChange={toggle}
      data-testid={testId}
    >
      Bypass
    </Toggle>
  );
}
