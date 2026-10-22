import { Plus, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/components/utilities';
import { BUNDLED_MODELS } from '@/daw/audio/nam/NamModelStore';
import { PitchCorrectionControls } from '@/daw/components/Controls/PitchCorrectionControls';
import { RotaryKnob } from '@/daw/components/Controls/RotaryKnob';
import {
  CARD_GAP_PX,
  CARD_HEADER_PX,
  cardLayout,
  PowerDot,
} from '@/daw/components/Effects/FxCards';
import { TONE_LABEL } from '@/daw/data/audioEffects';
import { FxRack } from '@/daw/shell/mix/FxRack';
import { useStore } from '@/daw/store';
import { MAX_RACK_EFFECTS } from '@/daw/store/effectRack';
import { IconButton } from '@/daw/ui/IconButton';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';
import { COLOR } from '@/daw/ui/tokens';
import { ADD_CARD_CLASS, ADD_EFFECT_CARD_PX } from './AddEffectSlot';

// ── A plain Audio track's dock: its own chain and its effects, one row ─────
//
// An Audio track's Instrument and Effects share one dock and one rail
// button (owner, 2026-10-22): after its Tuner (GuitarBassView), one row of
// device cards, as the dock's Effects draw them (FxCards): first its own
// chain, the amp and pitch correction the engine plays its clips through,
// then its effects (the same as a MIDI track's), then one dashed Add card.
// While its chain is empty, Add offers an amp or pitch correction
// (AudioEffectPicker), with its effects as a link; once either is in, Add
// offers its effects (the Add effect picker), and a link adds the audio
// effect not yet in. A track holds one amp (audioChain.ts); the amp's card
// shows its gem in the graph's place, and a click there swaps it.

export interface AudioFxBlock {
  id: string;
  type: string;
  enabled: boolean;
  params: Record<string, number>;
  namModelId?: string | null;
}

export interface AudioTrackFxProps {
  trackId: string;
  chain: readonly AudioFxBlock[];
  onToggle(blockId: string): void;
  onRemove(blockId: string): void;
  onParam(blockId: string, key: string, value: number): void;
  /** An amp or pitch correction: opens the AudioEffectPicker. */
  onAddAudio(): void;
  /** The amp card's gem, at `size` px. */
  renderAmpIcon(modelId: string | null, size: number): ReactNode;
  /** The gem's colour for each amp model. */
  ampColor(modelId: string | null): string;
}

/** The amp's controls, as the classic amp's faceplate names them. */
const AMP_KNOBS = [
  { key: 'inputLevel', label: 'Input', default: 0.5 },
  { key: 'bass', label: 'Bass', default: 0.5 },
  { key: 'mid', label: 'Mid', default: 0.5 },
  { key: 'treble', label: 'Treble', default: 0.5 },
  { key: 'presence', label: 'Presence', default: 0.5 },
  { key: 'outputLevel', label: 'Output', default: 0.5 },
  { key: 'volume', label: 'Volume', default: 0.7 },
];

/** Pitch correction's mark: the text white, as on the Voice track. */
const PITCH_COLOR = COLOR.text.value;

/** Add effects: the Add effect picker, on this track's effects. */
const addEffects = () => useStore.getState().openEffectsLibrary();

/** The whole row: its chain's cards, its effects' cards, one Add card. */
export function AudioTrackFx({
  trackId,
  onAddAudio,
  ...chainProps
}: AudioTrackFxProps) {
  const fxCount = useStore(
    (s) => s.tracks.find((t) => t.id === trackId)?.activeEffects.length ?? 0,
  );
  const setMaximized = useStore((s) => s.setDockMaximized);
  return (
    <FxRack
      target={{ kind: 'track', id: trackId }}
      onShowAll={() => setMaximized(true)}
      leading={(rowH) => (
        <AudioChainCards {...chainProps} rowH={rowH} onSwapAmp={onAddAudio} />
      )}
      addSlot={
        <AudioAddCard
          chain={chainProps.chain}
          fxCount={fxCount}
          onAddAudio={onAddAudio}
        />
      }
    />
  );
}

/** The track's own chain as device cards, at the row's height `rowH`. */
function AudioChainCards({
  chain,
  rowH,
  onToggle,
  onRemove,
  onParam,
  onSwapAmp,
  renderAmpIcon,
  ampColor,
}: Omit<AudioTrackFxProps, 'trackId' | 'onAddAudio'> & {
  rowH: number;
  onSwapAmp(): void;
}) {
  const layout = cardLayout(rowH);
  return (
    <>
      {chain.map((block) => {
        const isAmp = block.type === 'nam-amp';
        const model = isAmp
          ? BUNDLED_MODELS.find((m) => m.id === block.namModelId)
          : undefined;
        const label = isAmp
          ? (model?.name ?? 'Amp')
          : block.type === 'pitch-correction'
            ? 'Pitch Correction'
            : block.type;
        const color = isAmp ? ampColor(block.namModelId ?? null) : PITCH_COLOR;
        const wellH = Math.min(layout.bodyH, 160);
        return (
          <section
            key={block.id}
            aria-label={label}
            data-testid={`audio-fx-card-${block.type}`}
            data-enabled={block.enabled}
            className="flex h-full shrink-0 flex-col overflow-hidden rounded-[var(--daw-radius-card)] bg-daw-device"
          >
            <header
              className="flex shrink-0 items-center gap-2 px-2"
              style={{ height: CARD_HEADER_PX }}
            >
              <PowerDot
                label={label}
                on={block.enabled}
                color={color}
                onToggle={() => onToggle(block.id)}
              />
              <h3
                className={cn(
                  TYPE_CLASS.body,
                  'min-w-0 flex-1 truncate text-daw-text',
                )}
              >
                {label}
              </h3>
              {model ? (
                <span
                  className={cn(TYPE_CLASS.label, 'shrink-0 text-daw-text-3')}
                >
                  {TONE_LABEL[model.toneType as keyof typeof TONE_LABEL] ??
                    model.toneType}{' '}
                  {model.forInstrument === 'bass' ? 'bass amp' : 'amp'}
                </span>
              ) : null}
              <IconButton
                label={`Remove ${label}`}
                icon={<X />}
                size="sm"
                variant="bare"
                tooltipSide="top"
                data-testid={`audio-fx-remove-${block.type}`}
                onClick={() => onRemove(block.id)}
              />
            </header>
            {/* A switched-off effect dims, all but its switch. */}
            <div
              className={cn(
                'flex min-h-0 flex-1 items-center gap-3 px-2',
                !block.enabled && 'opacity-50',
                TRANSITION,
              )}
              style={{ paddingBottom: CARD_GAP_PX }}
            >
              {isAmp ? (
                <>
                  {layout.graph ? (
                    <button
                      type="button"
                      aria-label={`Swap ${label} for another amp`}
                      data-testid="audio-fx-amp-swap"
                      onClick={onSwapAmp}
                      className={cn(
                        'group flex shrink-0 flex-col items-center justify-center gap-1 rounded-[var(--daw-radius-md)] bg-daw-surface-2 hover:bg-daw-hover',
                        TRANSITION,
                        FOCUS_RING,
                      )}
                      style={{
                        width: Math.round(wellH * 1.1),
                        height: wellH,
                      }}
                    >
                      <span className="transition-transform duration-daw-fast group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100">
                        {renderAmpIcon(
                          block.namModelId ?? null,
                          Math.round(wellH * 0.42),
                        )}
                      </span>
                      <span
                        className={cn(
                          TYPE_CLASS.label,
                          'text-daw-text-3 group-hover:text-daw-text-2',
                        )}
                      >
                        Swap amp
                      </span>
                    </button>
                  ) : null}
                  <div
                    className="grid h-full min-w-max shrink-0 content-center items-center justify-items-center gap-x-3 gap-y-1"
                    style={{
                      gridAutoFlow: 'column',
                      gridTemplateRows: `repeat(${layout.rows}, auto)`,
                    }}
                  >
                    {AMP_KNOBS.map((k) => (
                      <RotaryKnob
                        key={k.key}
                        label={k.label}
                        value={block.params[k.key] ?? k.default}
                        min={0}
                        max={1}
                        size={layout.knob}
                        arcColor={color}
                        // An amp's 0 to 10.
                        formatValue={(v) => (v * 10).toFixed(1)}
                        onChange={(v) => onParam(block.id, k.key, v)}
                      />
                    ))}
                  </div>
                </>
              ) : block.type === 'pitch-correction' ? (
                <PitchCorrectionControls
                  params={block.params}
                  color={color}
                  knobSize={layout.knob}
                  rows={layout.rows}
                  onParam={(key, value) => onParam(block.id, key, value)}
                />
              ) : null}
            </div>
          </section>
        );
      })}
    </>
  );
}

/**
 * The one Add card. Empty chain: an amp or pitch correction, its effects as
 * a link. With either in: its effects, the audio effect not yet in as a
 * link. A full chain of effects says so.
 */
function AudioAddCard({
  chain,
  fxCount,
  onAddAudio,
}: {
  chain: readonly AudioFxBlock[];
  fxCount: number;
  onAddAudio(): void;
}) {
  // One amp at a time (audioChain.ts).
  const hasAmp = chain.some((b) => b.type === 'nam-amp');
  const hasPitch = chain.some((b) => b.type === 'pitch-correction');
  const hasAudioFx = hasAmp || hasPitch;
  const fxFull = fxCount >= MAX_RACK_EFFECTS;
  const missing = !hasPitch
    ? 'Add pitch correction'
    : !hasAmp
      ? 'Add an amp'
      : null;
  const width = { width: `clamp(160px, 40%, ${ADD_EFFECT_CARD_PX}px)` };
  const primary = cn(
    'flex flex-col items-center gap-1 rounded-[var(--daw-radius-md)] px-4 py-2 text-daw-text-2 hover:bg-daw-device hover:text-daw-text [&_svg]:size-4',
    TRANSITION,
    FOCUS_RING,
  );
  const link = cn(
    TYPE_CLASS.label,
    'rounded-[var(--daw-radius-sm)] px-1.5 text-daw-text-3 underline-offset-2 hover:text-daw-text hover:underline',
    TRANSITION,
    FOCUS_RING,
  );

  if (hasAudioFx && fxFull && !missing) {
    return (
      <div
        data-testid="audio-fx-add-card"
        data-state="full"
        className={cn(ADD_CARD_CLASS, 'border-daw-slot-edge')}
        style={width}
      >
        <span className={cn(TYPE_CLASS.label, 'text-daw-text-2')}>
          Chain full
        </span>
        <span className={cn(TYPE_CLASS.label, 'text-daw-text-3')}>
          {fxCount} of {MAX_RACK_EFFECTS} effects
        </span>
      </div>
    );
  }

  return (
    <div
      data-testid="audio-fx-add-card"
      className={cn(ADD_CARD_CLASS, 'border-daw-slot-edge')}
      style={width}
    >
      {hasAudioFx && !fxFull ? (
        <>
          <button
            type="button"
            data-testid="audio-fx-add-effects"
            aria-haspopup="dialog"
            onClick={addEffects}
            className={primary}
          >
            <Plus aria-hidden />
            <span className={TYPE_CLASS.label}>Add effects</span>
            <span className={cn(TYPE_CLASS.label, 'text-daw-text-3')}>
              Reverb, delay, EQ and more
            </span>
          </button>
          {missing ? (
            <button
              type="button"
              data-testid="audio-fx-add"
              aria-haspopup="dialog"
              onClick={onAddAudio}
              className={link}
            >
              {missing}
            </button>
          ) : null}
        </>
      ) : (
        <>
          <button
            type="button"
            data-testid="audio-fx-add"
            aria-haspopup="dialog"
            onClick={onAddAudio}
            className={primary}
          >
            <Plus aria-hidden />
            <span className={TYPE_CLASS.label}>
              {hasAudioFx ? missing : 'Add amp or pitch correction'}
            </span>
          </button>
          {fxFull ? (
            <span className={cn(TYPE_CLASS.label, 'text-daw-text-3')}>
              {fxCount} of {MAX_RACK_EFFECTS} effects
            </span>
          ) : (
            <button
              type="button"
              data-testid="audio-fx-add-effects"
              aria-haspopup="dialog"
              onClick={addEffects}
              className={link}
            >
              Add effects
            </button>
          )}
        </>
      )}
    </div>
  );
}
