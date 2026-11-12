import { motion } from 'framer-motion';
import { ArrowUp, ChevronDown, Dices } from 'lucide-react';
import { rainbowSweep, SETTLED } from '@/components/promptBox/PromptBoxParts';
import { PRESS, SHELL, type ShellLayout } from './shellTokens';
import { DEMO_PROMPT } from './studioScript';

/** The visitor's words write in with the key colors and settle to white. */
const ASKED_SWEEP = rainbowSweep('rgba(255, 255, 255, 0.92)');

/**
 * The Studio's prompt bar — the new Prism (`daw/shell/prompt/PromptBar.tsx`,
 * look from `components/promptBox`): a 20px opaque card floating over the
 * lanes, the request written in with the 12 key-center colors, then the
 * style chip, the dice and Create. Display only; the tour's cursor "types"
 * and presses Create.
 */
export const StudioPromptBar = ({
  layout,
  compact,
  staticMode,
  asked,
  pressPrompt,
  pressCreate,
}: {
  layout: ShellLayout;
  compact: boolean;
  staticMode: boolean;
  asked: boolean;
  pressPrompt: boolean;
  pressCreate: boolean;
}) => {
  const { font } = layout;
  const lanesW = layout.card.w - layout.trackW;
  const text = compact ? 20 : 15;
  const control = compact ? 40 : 30;
  return (
    <div
      aria-hidden
      className="absolute z-20 flex flex-col gap-3 border px-4 pb-3 pt-3.5"
      style={{
        left: layout.trackW + (lanesW - layout.prompt.w) / 2,
        bottom: layout.prompt.bottom,
        width: layout.prompt.w,
        borderRadius: 20,
        background: SHELL.popover,
        borderColor: pressPrompt ? 'rgba(255, 255, 255, 0.2)' : SHELL.outline,
        boxShadow: SHELL.shadow,
        transition: 'border-color 150ms',
      }}
    >
      <div
        data-tour-target="prompt"
        className="flex items-center gap-3"
        style={{ height: text * 1.75 }}
      >
        {asked ? (
          <motion.span
            key="asked"
            className="min-w-0 truncate bg-clip-text text-transparent [-webkit-background-clip:text]"
            style={{
              fontSize: text,
              backgroundImage: ASKED_SWEEP,
              backgroundSize: '300% 100%',
            }}
            initial={
              staticMode
                ? { backgroundPosition: '0% 0%' }
                : { backgroundPosition: '100% 0%' }
            }
            animate={{ backgroundPosition: '0% 0%' }}
            transition={{ duration: 1.1, ease: [0.45, 0, 0.25, 1] }}
          >
            {DEMO_PROMPT}
          </motion.span>
        ) : (
          <>
            <span
              className="min-w-0 truncate"
              style={{ fontSize: text, color: SETTLED }}
            >
              Describe a part, a style, a feel
            </span>
            {!compact && (
              <kbd
                className="flex h-6 shrink-0 items-center rounded border border-white/10 bg-white/[0.06] px-1.5 font-[inherit] text-xs"
                style={{ color: SHELL.pillText }}
              >
                Tab
              </kbd>
            )}
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span
          className="flex items-center gap-1 rounded-full border px-3"
          style={{
            height: control,
            fontSize: font.body,
            color: SHELL.text,
            background: SHELL.chip,
            borderColor: 'rgba(255, 255, 255, 0.2)',
          }}
        >
          Pop
          <ChevronDown className={compact ? 'size-4' : 'size-3'} />
        </span>
        <span
          className="ml-auto grid place-items-center rounded-full border border-white/10 bg-white/[0.04]"
          style={{ width: control, height: control, color: SHELL.text2 }}
        >
          <Dices className={compact ? 'size-5' : 'size-4'} />
        </span>
        <span
          data-tour-target="create"
          className="flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 font-medium transition-[transform,background-color] duration-150"
          style={{
            height: control,
            fontSize: font.title,
            color: asked ? '#FCFBF9' : 'rgba(255, 255, 255, 0.4)',
            background: pressCreate ? PRESS.overlay : undefined,
            boxShadow: pressCreate ? PRESS.ring : undefined,
            transform: pressCreate ? `scale(${PRESS.scale})` : undefined,
          }}
        >
          <ArrowUp className={compact ? 'size-5' : 'size-4'} />
          Create
        </span>
      </div>
    </div>
  );
};
