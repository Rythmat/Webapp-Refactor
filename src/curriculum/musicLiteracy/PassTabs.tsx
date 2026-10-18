import { Check } from 'lucide-react';
import { cn } from '@/components/utilities';
import type { LiteracyPass } from '@/curriculum/engine/musicLiteracy/passes';
import type { PassMark } from './stepDone';

// ── A step's passes ────────────────────────────────────────────────────────
// Part 2's echo steps are played twice: Pass 1, Echo (Atlas calls, the
// student plays it back), then Pass 2, Create (their own rhythm, then their
// repeat of it). The two sit in one segmented control beside the roll's
// view switch, each with its green check once passed.

export const PASS_LABEL: Readonly<Record<LiteracyPass, string>> = {
  echo: 'Echo',
  challenge: 'Challenge',
  create: 'Create',
};

export interface PassTab {
  pass: LiteracyPass;
  mark: PassMark;
}

export interface PassTabsProps {
  tabs: readonly PassTab[];
  current: LiteracyPass;
  onPick: (pass: LiteracyPass) => void;
  disabled?: boolean;
}

const MARK_WORDS: Record<PassMark, string> = {
  passed: ', passed',
  tried: ', tried',
  todo: '',
};

export function PassTabs({ tabs, current, onPick, disabled }: PassTabsProps) {
  return (
    <div
      role="group"
      aria-label="Passes"
      data-literacy-passes
      className="flex h-9 shrink-0 items-center rounded-full ring-1 ring-inset ring-white/10 max-[639px]:h-11"
    >
      {tabs.map((tab, i) => {
        const on = tab.pass === current;
        return (
          <button
            key={tab.pass}
            type="button"
            disabled={disabled}
            aria-pressed={on}
            aria-label={`Pass ${i + 1}: ${PASS_LABEL[tab.pass]}${MARK_WORDS[tab.mark]}`}
            data-pass={tab.pass}
            data-pass-mark={tab.mark}
            onClick={() => onPick(tab.pass)}
            className={cn(
              'inline-flex h-full items-center gap-1.5 rounded-full px-4 text-sm font-normal transition-colors duration-150 disabled:cursor-default',
              on
                ? 'bg-white text-[#101012]'
                : 'text-white/55 enabled:hover:text-[#e8e8f0]',
            )}
          >
            <span className="text-xs opacity-60">{i + 1}</span>
            {PASS_LABEL[tab.pass]}
            {tab.mark === 'passed' && (
              <Check
                aria-hidden
                className={cn(
                  'size-3.5 shrink-0',
                  on ? 'text-[#1f8f4e]' : 'text-success-base',
                )}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
