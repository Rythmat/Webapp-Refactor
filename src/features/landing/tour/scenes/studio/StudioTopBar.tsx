import { useTransform, type MotionValue } from 'framer-motion';
import { Download, Metronome, Settings } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { Logo } from '@/components/Logo';
import { MotionFixedDigits } from '@/components/common/FixedDigits';
import { cn } from '@/components/utilities';
import {
  BackToStartGlyph,
  LoopGlyph,
  PauseGlyph,
  PlayGlyph,
  RecordGlyph,
  RedoGlyph,
  UndoGlyph,
} from '@/daw/ui/icons/frameIcons';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import { KEY_CENTERS } from '../../../music';
import { PRESS, SHELL, type ShellLayout } from './shellTokens';
import { BPM, formatPosition } from './studioSong';

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80';

const keyName = (pc: number) =>
  displayAccidentals(KEY_CENTERS.find((k) => k.pitchClass === pc)?.name ?? '');

/** A top-bar pill: fully round, `#141417`, sitting straight on the page. */
const Pill = ({
  layout,
  children,
  className,
  style,
}: {
  layout: ShellLayout;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) => (
  <span
    className={cn('flex shrink-0 items-center rounded-full px-1', className)}
    style={{ height: layout.pillH, background: SHELL.pill, ...style }}
  >
    {children}
  </span>
);

/**
 * The Studio's top bar (`daw/shell/topbar/TopBar.tsx`), trimmed for the
 * demo: logo + project name and Undo/Redo on the left, the transport pill and
 * the position in the window's centre, the song pill (key · tempo · metre)
 * on the right. Only Back to start and Play/Pause are real controls. Compact
 * keeps the transport and the key.
 */
export const StudioTopBar = ({
  layout,
  compact,
  keyPc,
  keyColor,
  playing,
  pressPlay,
  position,
  onPlay,
  onRewind,
  onKey,
  keyLabel,
  playTarget = 'play',
  minimal = compact,
}: {
  layout: ShellLayout;
  compact: boolean;
  keyPc: number | null;
  keyColor: string | null;
  playing: boolean;
  /** The auto cursor's press on Play. */
  pressPlay: boolean;
  position: MotionValue<number>;
  onPlay: () => void;
  onRewind: () => void;
  /** Makes the key pill a button (the Connected demo plays its chord). */
  onKey?: () => void;
  /** What the key button does, for screen readers. */
  keyLabel?: string;
  /** The `data-tour-target` on Play. */
  playTarget?: string;
  /** Only the transport and the key (a narrow host). Default: `compact`. */
  minimal?: boolean;
}) => {
  const counter = useTransform(position, formatPosition);
  const icon = compact ? 'size-[18px]' : 'size-3.5';
  const button = compact ? 'size-9' : 'size-7';
  const { font } = layout;

  const transport = (
    <div className="flex items-center gap-1.5">
      <Pill layout={layout} className="gap-0.5">
        {!compact && (
          <span
            aria-hidden
            className={cn('grid place-items-center', button)}
            style={{ color: SHELL.pillText }}
          >
            <Metronome className={icon} />
          </span>
        )}
        <button
          type="button"
          aria-label="Back to start"
          onClick={onRewind}
          className={cn(
            'grid place-items-center rounded-full hover:bg-white/[0.08]',
            button,
            FOCUS,
          )}
          style={{ color: SHELL.pillText }}
        >
          <BackToStartGlyph className={icon} />
        </button>
        <span
          aria-hidden
          className={cn('grid place-items-center', button)}
          style={{ color: SHELL.pillText }}
        >
          <RecordGlyph className={compact ? 'size-3' : 'size-2.5'} />
        </span>
        <button
          type="button"
          aria-label={playing ? 'Pause' : 'Play'}
          aria-pressed={playing}
          data-tour-target={playTarget}
          onClick={onPlay}
          className={cn(
            'grid place-items-center rounded-full transition-[transform,background-color] duration-150',
            button,
            !playing && 'hover:bg-white/[0.08]',
            FOCUS,
          )}
          style={{
            background: pressPlay
              ? PRESS.overlay
              : playing
                ? SHELL.pillOn
                : 'transparent',
            boxShadow: pressPlay ? PRESS.ring : undefined,
            transform: pressPlay ? `scale(${PRESS.scale})` : undefined,
            color: '#ffffff',
          }}
        >
          {playing ? (
            <PauseGlyph className={icon} />
          ) : (
            <PlayGlyph className={icon} />
          )}
        </button>
        {!compact && (
          <span
            aria-hidden
            className={cn('grid place-items-center', button)}
            style={{ color: SHELL.pillText }}
          >
            <LoopGlyph className={icon} />
          </span>
        )}
      </Pill>
      <Pill layout={layout} className="px-3">
        <MotionFixedDigits
          value={counter}
          role="timer"
          aria-label="Position"
          className="min-w-[3.4em] text-center"
          style={{ color: SHELL.text, fontSize: font.body }}
        />
      </Pill>
    </div>
  );

  const keyed = keyPc !== null && keyColor !== null;
  const keyText = keyed ? `${keyName(keyPc)} major` : null;
  const KeyTag = onKey ? 'button' : 'span';
  const keyButton = (
    <KeyTag
      {...(onKey
        ? {
            type: 'button' as const,
            onClick: onKey,
            'aria-label': `Key: ${keyText ?? 'none'}. ${keyLabel ?? ''}`.trim(),
          }
        : {
            role: 'status',
            'aria-label': keyText ? `Key: ${keyText}` : 'No key yet',
          })}
      className={cn(
        'flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5',
        onKey && cn('hover:bg-white/[0.08]', FOCUS),
      )}
      style={{
        height: layout.pillH - 8,
        fontSize: font.body,
        color: keyed ? SHELL.text : SHELL.text3,
        // Dashed until Prism sets a key, as the Studio's.
        border: `1px ${keyed ? 'solid transparent' : `dashed ${SHELL.outline}`}`,
      }}
    >
      <span
        aria-hidden
        className="rounded-full transition-colors duration-300"
        style={{
          width: compact ? 10 : 8,
          height: compact ? 10 : 8,
          background: keyed ? keyColor : 'transparent',
          boxShadow: keyed ? undefined : `inset 0 0 0 1px ${SHELL.text3}`,
        }}
      />
      {keyText ?? 'Key'}
    </KeyTag>
  );

  return (
    <div
      className="absolute inset-x-0 top-0 grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-2"
      style={{ height: layout.topH }}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        {!minimal && (
          <>
            <span aria-hidden className="grid size-8 place-items-center">
              <Logo className="size-5" />
            </span>
            <Pill layout={layout} className="px-3">
              <span
                aria-hidden
                className="whitespace-nowrap"
                style={{ color: SHELL.text, fontSize: font.body }}
              >
                Untitled Session
              </span>
            </Pill>
            <Pill layout={layout} className="gap-0.5">
              {[UndoGlyph, RedoGlyph].map((Icon, i) => (
                <span
                  key={i}
                  aria-hidden
                  className={cn('grid place-items-center', button)}
                  style={{ color: SHELL.pillText }}
                >
                  <Icon className={icon} />
                </span>
              ))}
            </Pill>
          </>
        )}
      </div>
      {transport}
      <div className="flex items-center justify-end gap-1.5">
        <Pill layout={layout} className="gap-1">
          {keyButton}
          {!minimal && (
            <span
              aria-hidden
              className="flex items-center gap-2.5 whitespace-nowrap pl-1 pr-2.5"
              style={{ fontSize: font.body }}
            >
              <span>
                <b className="font-bold" style={{ color: SHELL.text }}>
                  {BPM}
                </b>{' '}
                <span style={{ color: SHELL.text3 }}>BPM</span>
              </span>
              <span style={{ color: SHELL.text2 }}>4/4</span>
            </span>
          )}
        </Pill>
        {!minimal && (
          <>
            <Pill layout={layout}>
              <span
                aria-hidden
                className={cn('grid place-items-center', button)}
                style={{ color: SHELL.pillText }}
              >
                <Settings className={icon} />
              </span>
            </Pill>
            <span
              aria-hidden
              className={cn('grid place-items-center', button)}
              style={{ color: SHELL.pillText }}
            >
              <Download className={icon} />
            </span>
          </>
        )}
      </div>
    </div>
  );
};
