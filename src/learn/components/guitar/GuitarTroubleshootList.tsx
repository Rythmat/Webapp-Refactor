// ── GuitarTroubleshootList ─────────────────────────────────────────────────
// What to try when a take comes back "Couldn't hear that clearly": the most
// likely and quickest fixes first. Each says how in one line and, where the
// setup can do it, offers the button that does.

import { Button } from '@/components/ui/button';
import type { GuitarSetupStep } from './GuitarInputSetup';

export interface GuitarTroubleshootListProps {
  /** Measure the room again. Defaults to setup's room step. */
  onRecalibrate?: () => void;
  /** Open GuitarInputSetup at a step. */
  onOpenSetup?: (step: GuitarSetupStep) => void;
}

interface Fix {
  id: string;
  title: string;
  how: string;
  action?: { label: string; run: () => void };
}

export function GuitarTroubleshootList({
  onRecalibrate,
  onOpenSetup,
}: GuitarTroubleshootListProps) {
  const setupAt = (label: string, step: GuitarSetupStep) =>
    onOpenSetup && { label, run: () => onOpenSetup(step) };
  const recalibrate = onRecalibrate
    ? { label: 'Recalibrate', run: onRecalibrate }
    : setupAt('Recalibrate', 'quiet');

  const fixes: Fix[] = [
    {
      id: 'tune',
      title: 'Tune your guitar.',
      how: 'Strings out of tune sound like wrong notes.',
      action: setupAt('Open tuner', 'tuner'),
    },
    {
      id: 'headphones',
      title: 'Use headphones, or turn the speakers down.',
      how: 'The mic may be hearing the app instead of you.',
      action: setupAt('Test for echo', 'bleed'),
    },
    {
      id: 'effects',
      title: 'Turn effects off.',
      how: 'Use a clean amp sound. Distortion and echo blur the notes.',
    },
    {
      id: 'permission',
      title: 'Check the microphone permission.',
      how: 'Your browser must let this site use the mic.',
      action: setupAt('Check the mic', 'mic'),
    },
    {
      id: 'device',
      title: 'Check the device and input channel.',
      how: 'Pick the input your guitar is plugged into.',
      action: setupAt('Choose input', 'level'),
    },
    {
      id: 'recalibrate',
      title: 'Recalibrate.',
      how: 'Stay quiet for 2 seconds so we can measure your room again.',
      action: recalibrate,
    },
  ];

  return (
    <ol aria-label="Things to try" className="flex flex-col gap-2 text-sm">
      {fixes.map((fix, i) => (
        <li key={fix.id} className="flex items-start gap-3">
          <span
            aria-hidden
            className="flex size-5 shrink-0 items-center justify-center rounded-full border border-white/30 text-[11px] text-white/70"
          >
            {i + 1}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-medium text-white">{fix.title}</span>
            <span className="text-white/60">{fix.how}</span>
          </span>
          {fix.action && (
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={fix.action.run}
            >
              {fix.action.label}
            </Button>
          )}
        </li>
      ))}
    </ol>
  );
}
