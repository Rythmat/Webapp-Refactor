import { useEffect, useMemo } from 'react';
import { AnatomyStage } from '@/curriculum/anatomy/AnatomyStage';
import { TUBE_AMP_MODEL } from '@/curriculum/anatomy/comboAmpModel';
import { compile } from '@/curriculum/anatomy/compileCore';
import { LabReadout } from '../../lab/LabControls';
import { renderedRmsDb } from '../../mix/mixMath';
import { stemNamed } from '../../mix/stems';
import type { StageProps } from '../../player/LessonPlayer';
import { faderGainDb } from '../stage/ChannelStrip';
import { MixWave } from '../stage/MixWave';
import { DeskChannel } from '../stage/gear/DeskChannel';
import { PaSpeaker, PowerAmp } from '../stage/gear/PowerAmp';
import {
  SignalChain,
  type CableId,
  type GearId,
} from '../stage/gear/SignalChain';
import {
  AMP_GAIN_DB,
  AMP_OFF,
  AMP_TARGET,
  ampPeak,
  ampVolts,
  ampWatts,
  DESK_TARGET,
  deskOut,
  deskPeak,
  deskVolts,
  GAIN_MAX,
  SOURCE_PEAK,
  type PathScene,
} from './script';

const COMBO = compile(TUBE_AMP_MODEL, false);

/** Where matched playback sits, after the amp. */
const MATCH_RMS_DB = -30;

const SOURCE_NAMES = { snare: 'Snare mic', bass: 'Bass DI' } as const;

/** The recording branch, picked out on its own screens. */
const RECORDING: readonly (GearId | CableId)[] = [
  'interface',
  'laptop',
  'recLine',
  'usb',
];
const LIVE_SIDE: readonly (GearId | CableId)[] = [
  'amp',
  'speaker',
  'line',
  'speakerCable',
];

/** A voltage as it's usually said: millivolts below a volt. */
export function formatVolts(volts: number): string {
  if (!Number.isFinite(volts) || volts <= 0) return '0 V';
  if (volts < 1) {
    const mv = volts * 1000;
    return `${mv < 10 ? mv.toFixed(1).replace('.0', '') : Math.round(mv)} mV`;
  }
  return `${volts < 10 ? volts.toFixed(1).replace('.0', '') : Math.round(volts)} V`;
}

/** What each cable carries now: the clip caps what a stage can put out. */
function cableLevels(scene: PathScene): Record<CableId, string> {
  const peak = ampPeak(scene);
  return {
    xlr: formatVolts(deskVolts(SOURCE_PEAK[scene.stem])),
    line: formatVolts(deskVolts(Math.min(0, deskOut(scene)))),
    speakerCable: Number.isFinite(peak) ? formatVolts(ampVolts(peak)) : '0 V',
    recLine: formatVolts(deskVolts(Math.min(0, deskPeak(scene)))),
    usb: 'numbers',
  };
}

export function PathStage({
  scene,
  setScene,
  screen,
  accent,
  mix,
  locked,
  onIdentify,
}: StageProps<PathScene>) {
  const stem = stemNamed(scene.stem);
  const inputDb = deskPeak(scene) - stem.peakDb;
  const faderDb = faderGainDb(scene.fader);
  const masterDb = scene.amp <= AMP_OFF ? -Infinity : AMP_GAIN_DB + scene.amp;
  const peak = ampPeak(scene);

  const channel = useMemo(
    () => mix.buffers?.get(scene.stem)?.getChannelData(0) ?? null,
    [mix.buffers, scene.stem],
  );
  const monitorDb = useMemo(() => {
    if (!Number.isFinite(peak)) return 0;
    if (scene.matched && channel) {
      // After the amp's clip, so that both sides of a question sound as loud.
      return MATCH_RMS_DB - renderedRmsDb(channel, peak - stem.peakDb, true);
    }
    // Past the band, it's the student's own ears getting the extra.
    return -Math.max(0, peak - AMP_TARGET[1]) * 0.7;
  }, [channel, peak, scene.matched, stem.peakDb]);

  useEffect(() => {
    const on = (id: 'snare' | 'bass') => ({
      solo: scene.stem === id,
      inputDb: scene.stem === id ? inputDb : 0,
      faderDb: scene.stem === id ? faderDb : 0,
    });
    mix.apply(
      { snare: on('snare'), bass: on('bass') },
      { masterDb, monitorDb },
    );
  }, [faderDb, inputDb, masterDb, mix.apply, monitorDb, scene.stem]);

  const finding =
    screen.kind === 'anatomy' && screen.mode === 'identify' && !locked;
  const answer =
    locked && screen.kind === 'anatomy' && screen.mode === 'identify'
      ? screen.target
      : null;

  if (screen.view === 'combo') {
    return (
      <AnatomyStage
        model={COMBO}
        term={answer}
        apart={1}
        locked={locked}
        onPressTerm={finding ? onIdentify : undefined}
        listLabel={finding ? 'Choose from a list' : undefined}
        label="A tube combo amp"
      />
    );
  }

  if (
    screen.view === 'chain' ||
    screen.view === 'cables' ||
    screen.view === 'record'
  ) {
    const record = screen.view === 'record';
    const lit: (GearId | CableId)[] = record ? [...RECORDING] : [];
    if (answer === 'speakerCable') lit.push('speakerCable');
    else if (answer) lit.push(answer as GearId);
    const dim = record
      ? LIVE_SIDE
      : screen.kind === 'takeaway' || screen.kind === 'hook'
        ? []
        : RECORDING;
    return (
      <div className="flex flex-col gap-3" data-stage={screen.view}>
        <SignalChain
          levels={cableLevels(scene)}
          lit={lit}
          dim={dim}
          pressable={
            finding ? (screen.view === 'cables' ? 'cables' : 'gear') : null
          }
          onPress={onIdentify}
          flowing={mix.playing}
          accent={accent}
        />
        {record && (
          <div className="flex flex-col gap-1">
            <span className="text-[0.8125rem] text-white/55">
              The take, as the laptop stored it
            </span>
            <MixWave
              mix={mix}
              focus={scene.stem}
              gains={{ [scene.stem]: 0 }}
              inputs={{ [scene.stem]: inputDb }}
              masterDb={0}
              accent={accent}
            />
          </div>
        )}
      </div>
    );
  }

  if (screen.view === 'amp') {
    // Blind until it's answered: the knob and the lights would give it away.
    if (screen.kind === 'ab' && !locked) {
      return (
        <div
          className="flex flex-col items-center gap-2"
          data-stage="amp-blind"
        >
          <PaSpeaker mix={mix} accent={accent} />
        </div>
      );
    }
    const quiet = !Number.isFinite(peak);
    return (
      <div className="flex flex-col gap-4" data-stage="amp">
        <PowerAmp
          amp={scene.amp}
          ampMin={AMP_OFF}
          masterDb={masterDb}
          target={screen.kind === 'do' ? AMP_TARGET : undefined}
          mix={mix}
          accent={accent}
          live={!locked && screen.kind !== 'ab'}
          onAmp={(amp) => setScene({ amp })}
        />
        <div className="flex flex-wrap gap-2">
          <LabReadout
            label="From the desk"
            value={formatVolts(deskVolts(Math.min(0, deskOut(scene))))}
          />
          <LabReadout
            label="To the speaker"
            value={
              quiet
                ? '0 V'
                : `${formatVolts(ampVolts(peak))}${peak > 0 ? ', clipping' : ''}`
            }
            accent={accent}
          />
          <LabReadout
            label="Power, at the peaks"
            value={quiet ? '0 W' : `${Math.round(ampWatts(peak))} W`}
          />
        </div>
      </div>
    );
  }

  // The desk.
  const level = deskPeak(scene);
  return (
    <div
      className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-center sm:gap-6"
      data-stage="desk"
    >
      <DeskChannel
        source={SOURCE_NAMES[scene.stem]}
        gain={scene.gain}
        gainMax={GAIN_MAX}
        fader={scene.fader}
        inputPoint={{ stem: scene.stem, at: 'input' }}
        outputPoint={{ stem: scene.stem, at: 'output' }}
        gainTrackDb={inputDb}
        target={DESK_TARGET}
        mix={mix}
        accent={accent}
        live={locked ? [] : ['gain', 'fader']}
        identify={finding}
        onPress={onIdentify}
        onGain={(gain) => setScene({ gain })}
        onFader={(fader) => setScene({ fader })}
      />
      {/* While a part's being found, the numbers would give the answer away. */}
      {!finding && (
        <div className="flex w-full max-w-72 flex-col gap-2 sm:pt-8">
          <LabReadout
            label={scene.stem === 'snare' ? 'At the mic' : 'From the DI'}
            value={formatVolts(deskVolts(SOURCE_PEAK[scene.stem]))}
          />
          <LabReadout
            label="After the gain"
            value={
              level > 0
                ? `${formatVolts(deskVolts(0))}, clipping`
                : formatVolts(deskVolts(level))
            }
            accent={accent}
          />
          <LabReadout
            label="After the fader, to the PA"
            value={
              faderDb === -Infinity
                ? 'Off'
                : formatVolts(deskVolts(Math.min(0, level) + scene.fader))
            }
          />
          <p className="text-[0.8125rem] leading-5 text-white/55">
            Line level is about 1.2 V: where the meter’s marked band sits.
          </p>
        </div>
      )}
    </div>
  );
}
