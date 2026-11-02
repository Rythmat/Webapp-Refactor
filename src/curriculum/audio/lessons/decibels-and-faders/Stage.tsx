import { useEffect, useMemo } from 'react';
import { STEMS, type StemId } from '../../mix/stems';
import type { StageProps } from '../../player/LessonPlayer';
import { ChannelStrip, faderGainDb, Toggle } from '../stage/ChannelStrip';
import { MixWave } from '../stage/MixWave';
import type { DeskScene } from './script';

/** Which fader each face of the stage has live. */
const LIVE: Record<string, readonly (StemId | 'master')[]> = {
  all: ['kick', 'snare', 'hats', 'bass', 'master'],
  snare: ['snare'],
  kick: ['kick'],
  hats: ['hats'],
  master: ['master'],
  doubled: [],
};

const FOCUS: Record<string, StemId | 'master'> = {
  all: 'master',
  snare: 'snare',
  kick: 'kick',
  hats: 'hats',
  master: 'master',
  doubled: 'snare',
  wave: 'master',
  'snare-wave': 'snare',
};

export function DecibelsStage({
  scene,
  setScene,
  screen,
  accent,
  mix,
  locked,
}: StageProps<DeskScene>) {
  useEffect(() => {
    mix.apply(
      {
        kick: { faderDb: faderGainDb(scene.faders.kick) },
        snare: {
          faderDb: faderGainDb(scene.faders.snare),
          // A second copy in step is exactly twice the height.
          inputDb: scene.doubled ? 20 * Math.log10(2) : 0,
        },
        hats: { faderDb: faderGainDb(scene.faders.hats) },
        bass: { faderDb: faderGainDb(scene.faders.bass) },
      },
      { masterDb: faderGainDb(scene.master) },
    );
  }, [mix.apply, scene]);

  const live = LIVE[screen.view] ?? [];
  const focus = FOCUS[screen.view] ?? 'master';
  const gains = useMemo(
    () => ({
      kick: faderGainDb(scene.faders.kick),
      hats: faderGainDb(scene.faders.hats),
      bass: faderGainDb(scene.faders.bass),
      snare: faderGainDb(scene.faders.snare) + (scene.doubled ? 6.02 : 0),
    }),
    [scene.doubled, scene.faders],
  );

  return (
    <div className="flex flex-col gap-3" data-stage="desk">
      {screen.view !== 'doubled' && (
        <MixWave
          mix={mix}
          focus={focus}
          gains={gains}
          masterDb={faderGainDb(scene.master)}
          accent={accent}
        />
      )}
      {!screen.view.endsWith('wave') && (
        <div className="flex items-stretch justify-center gap-1 rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-3 sm:gap-2">
          {STEMS.map((stem) => (
            <ChannelStrip
              key={stem.id}
              label={stem.label}
              db={scene.faders[stem.id]}
              disabled={locked || !live.includes(stem.id)}
              dim={!live.includes(stem.id) && live.length > 0}
              point={{ stem: stem.id, at: 'output' }}
              resetKey={String(scene.doubled)}
              mix={mix}
              accent={accent}
              onChange={(db) =>
                setScene({ faders: { ...scene.faders, [stem.id]: db } })
              }
            />
          ))}
          <span aria-hidden className="mx-1 w-px self-stretch bg-white/10" />
          <ChannelStrip
            label="Master"
            db={scene.master}
            disabled={locked || !live.includes('master')}
            dim={!live.includes('master') && live.length > 0}
            point={{ bus: 'pre' }}
            resetKey={`${JSON.stringify(scene.faders)}${scene.doubled}`}
            mix={mix}
            accent={accent}
            onChange={(db) => setScene({ master: db })}
          />
        </div>
      )}
      {screen.view === 'doubled' && (
        <div className="flex justify-center">
          <Toggle
            on={scene.doubled}
            disabled={locked}
            onChange={(doubled) => setScene({ doubled })}
          >
            Second snare
          </Toggle>
        </div>
      )}
    </div>
  );
}
