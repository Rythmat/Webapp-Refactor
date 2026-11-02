import { RotateCcw, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { WHITE_PILL } from '@/components/kit/pills';
import { AirStage } from '../../lab/AirStage';
import { LabReadout, LabSlider, TapToHear } from '../../lab/LabControls';
import { PulseStage } from '../../lab/PulseStage';
import { MEDIA, medium } from '../../lab/physics/particles';
import { useLabTone } from '../../lab/useLabTone';
import type { ChannelSettings } from '../../mix/mixEngine';
import type { StageProps } from '../../player/LessonPlayer';
import { Toggle } from '../stage/ChannelStrip';
import { TakesStage } from '../stage/TakesStage';
import type { FarTake } from '../stage/takes';
import { lateMs, MARK_MOMENTS, offsetMs, type AirScene } from './script';

const SEND_HZ = 660;
const ARRIVE_HZ = 990;
const AIR_HZ = 440;

const ROOM_GAIN_DB = -6;
const BOTTOM_GAIN_DB = -1;
const BOTTOM_LOWPASS_HZ = 2000;
/** Leaves room for a copy on top of the kit without hitting the ceiling. */
const MASTER_DB = -3;

const AIR_LANE = [{ medium: medium('air') }];
const RACE_LANES = MEDIA.map((m) => ({ medium: m, label: m.name }));

const ROOM_NAMES = ['Close mic', 'Room mic'] as const;

const ms = (value: number) => `${value.toFixed(1)} ms`;

/** A snare from the side: why a hit reaches its two mics the opposite way up. */
function SnareSides({ accent }: { accent: string }) {
  return (
    <svg
      viewBox="0 0 360 172"
      className="mx-auto h-[clamp(12rem,42dvh,24rem)] w-full max-w-2xl"
      role="img"
      aria-label="A snare drum from the side. As the top head moves down, it moves away from the mic above it and toward the mic below it."
    >
      <g fill="none" stroke="#ffffff" strokeWidth="1.5">
        <rect x="110" y="70" width="140" height="36" />
        <path d="M110 70 Q180 88 250 70" stroke={accent} strokeWidth="2.5" />
        <path d="M110 106h140" />
        <path d="M172 8h16l-3 28h-10z" />
        <path d="M172 164h16l-3-28h-10z" />
        <path d="M180 44v22m-5-6 5 6 5-6" stroke={accent} strokeWidth="2" />
        <path d="M180 112v20m-5-6 5 6 5-6" stroke={accent} strokeWidth="2" />
      </g>
      <g fill="#ffffff" fontSize="12" textAnchor="start">
        <text x="198" y="26">
          Top mic
        </text>
        <text x="198" y="42" opacity="0.6">
          air pulled away
        </text>
        <text x="198" y="146">
          Bottom mic
        </text>
        <text x="198" y="162" opacity="0.6">
          air pushed in
        </text>
      </g>
    </svg>
  );
}

export function PhysicsStage({
  scene,
  setScene,
  screen,
  accent,
  mix,
  locked,
}: StageProps<AirScene>) {
  const tone = useLabTone();
  const { stopAll } = tone;
  const [fire, setFire] = useState(0);
  const view = screen.view;
  const polarity = view === 'polarity';

  // Each screen starts with no pulse on its way, and its own tone off.
  useEffect(() => {
    setFire(0);
    stopAll();
  }, [stopAll, view]);

  const offset = offsetMs(scene);

  useEffect(() => {
    const roomCopy: ChannelSettings = scene.room
      ? {
          copy: { delayMs: Math.max(0, offset), gainDb: ROOM_GAIN_DB },
          dryDelayMs: Math.max(0, -offset),
        }
      : {};
    mix.apply(
      polarity
        ? {
            kick: {},
            hats: {},
            snare: {
              solo: true,
              copy: {
                delayMs: 0,
                gainDb: BOTTOM_GAIN_DB,
                invert: !scene.polarityFixed,
                lowpassHz: BOTTOM_LOWPASS_HZ,
              },
            },
          }
        : { kick: roomCopy, snare: roomCopy, hats: roomCopy },
      { masterDb: MASTER_DB },
    );
  }, [mix.apply, offset, polarity, scene.polarityFixed, scene.room]);

  const snare = mix.buffers?.get('snare');
  const samples = useMemo(() => snare?.getChannelData(0) ?? null, [snare]);
  const far: FarTake | null = polarity
    ? {
        delayMs: 0,
        gainDb: BOTTOM_GAIN_DB,
        invert: !scene.polarityFixed,
        lowpassHz: BOTTOM_LOWPASS_HZ,
      }
    : scene.room
      ? { delayMs: offset, gainDb: ROOM_GAIN_DB }
      : null;

  const takes = (showSum: boolean, names: readonly [string, string]) => (
    <TakesStage
      samples={samples}
      sampleRate={snare?.sampleRate ?? 48000}
      far={far}
      names={names}
      showSum={showSum}
      accent={accent}
    />
  );

  const send = () => {
    tone.blip(SEND_HZ);
    setFire((n) => n + 1);
  };
  const sendButton = (
    <div className="flex items-center gap-3">
      <button type="button" className={WHITE_PILL} onClick={send}>
        {fire > 0 ? <RotateCcw aria-hidden /> : <Zap aria-hidden />}
        {fire > 0 ? 'Send another' : 'Send a pulse'}
      </button>
      <TapToHear show={tone.needsTap} />
    </div>
  );

  if (view === 'none') return null;

  if (view === 'pulse' || view === 'race') {
    return (
      <div className="flex flex-col gap-3" data-stage="pulse">
        <PulseStage
          key={view}
          lanes={view === 'race' ? RACE_LANES : AIR_LANE}
          fire={fire}
          accent={accent}
          onArrive={() => tone.blip(ARRIVE_HZ)}
          className={
            view === 'race' ? 'h-[clamp(11rem,30dvh,17rem)]' : undefined
          }
        />
        {sendButton}
      </div>
    );
  }

  if (view === 'air-mark' || view === 'air-mark-2') {
    const moment = MARK_MOMENTS[view];
    return (
      <div className="flex flex-col gap-3" data-stage="air-mark">
        <AirStage
          hz={moment.hz}
          accent={accent}
          frozenPhase={moment.phase}
          marker={scene.mark}
          onMark={(mark) => {
            if (!locked) setScene({ mark });
          }}
        />
        <LabSlider
          label="Your mark"
          accent={accent}
          value={scene.mark ?? 0.5}
          valueText={`${Math.round((scene.mark ?? 0.5) * 100)} percent across`}
          onChange={(mark) => {
            if (!locked) setScene({ mark });
          }}
        />
      </div>
    );
  }

  if (view === 'air') {
    const on = tone.sounding.has('air');
    return (
      <div className="flex flex-col gap-3" data-stage="air">
        <AirStage hz={AIR_HZ} accent={accent} pressure labels />
        <div className="flex items-center gap-3">
          <Toggle
            on={on}
            onChange={(next) =>
              next ? tone.set('air', AIR_HZ) : tone.stop('air')
            }
          >
            Hear this tone
          </Toggle>
          <TapToHear show={tone.needsTap} />
        </div>
      </div>
    );
  }

  if (view === 'snare') return <SnareSides accent={accent} />;

  if (polarity) {
    return (
      <div className="flex flex-col gap-3" data-stage="polarity">
        {takes(locked, ['Top mic', 'Bottom mic'])}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3" data-stage="takes">
      {takes(view !== 'room' && view !== 'distance', ROOM_NAMES)}
      {view === 'room' && (
        <div className="flex justify-center">
          <Toggle on={scene.room} onChange={(room) => setScene({ room })}>
            Room mic
          </Toggle>
        </div>
      )}
      {view === 'distance' && (
        <>
          <LabSlider
            label="How far back the room mic is"
            min={0.5}
            max={12}
            step={0.1}
            low="0.5 m"
            high="12 m"
            accent={accent}
            value={scene.metres}
            valueText={`${scene.metres.toFixed(1)} metres, ${ms(lateMs(scene.metres))} late`}
            onChange={(metres) => {
              if (!locked) setScene({ metres });
            }}
          />
          <div className="flex flex-wrap gap-3">
            <LabReadout
              label="Room mic"
              value={`${scene.metres.toFixed(1)} m back`}
            />
            <LabReadout
              label="Arrives"
              value={`${ms(lateMs(scene.metres))} late`}
            />
          </div>
        </>
      )}
      {view === 'align' && (
        <>
          <LabSlider
            label="Nudge the room track"
            min={-20}
            max={0}
            step={0.1}
            low="Earlier"
            high="Where it landed"
            accent={accent}
            value={scene.nudgeMs}
            valueText={`${ms(Math.abs(scene.nudgeMs))} earlier`}
            onChange={(nudgeMs) => {
              if (!locked) setScene({ nudgeMs });
            }}
          />
          <div className="flex flex-wrap gap-3">
            <LabReadout
              label="Nudged"
              value={`${ms(Math.abs(scene.nudgeMs))} earlier`}
            />
            <LabReadout
              label="Room mic’s hit"
              value={
                Math.abs(offset) < 0.05
                  ? 'Lined up'
                  : `${ms(Math.abs(offset))} ${offset > 0 ? 'late' : 'early'}`
              }
            />
          </div>
        </>
      )}
    </div>
  );
}
