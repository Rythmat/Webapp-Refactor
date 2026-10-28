// ── The art contact sheet (DEV only) ───────────────────────────────────────
// Every cover kind in every palette, the kit's pieces and every Arcade game
// with its cover, on one page to look at before anything ships (the
// generative-art rule: render a contact sheet and actually look at it).
// /dev/art/contact-sheet; App.tsx loads it behind a literal
// import.meta.env.DEV, and verify:prod:scan fails a build that ships it.

import { Lock, Play, Shuffle } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  ARCADE_GAMES,
  artForGame,
  FEATURED_GAME,
} from '@/components/Games/arcadeGames';
import { ArcadeHero } from '@/components/Games/dashboard/ArcadeHero';
import { GameCard } from '@/components/Games/dashboard/GameCard';
import { ArtCover, type ArtMotion } from '@/components/art/ArtCover';
import {
  HorizonFlare,
  SpectrumBar,
  SpectrumRim,
} from '@/components/art/light/SpectrumLight';
import {
  COVER_ASPECT,
  CoverTile,
  DisplayHeading,
  HeroArt,
  MicroLabel,
  microLabel,
  OUTLINE_PILL,
  RainbowWriteIn,
  SectionCard,
  UnderlineTabs,
  WHITE_PILL,
} from '@/components/kit';
import { cn } from '@/components/utilities';
import { Chip } from '@/daw/ui/Chip';
import {
  ART_PALETTE_NAMES,
  ART_PALETTES,
  buildArtScene,
  type ArtDensity,
  type ArtKind,
  type ChladniMode,
  type RingsVariant,
} from '@/lib/art';

const ROWS: { label: string; kind: ArtKind; variant?: RingsVariant }[] = [
  { label: 'Strands', kind: 'strands' },
  { label: 'Rings · ripple', kind: 'rings', variant: 'ripple' },
  { label: 'Rings · orbit', kind: 'rings', variant: 'orbit' },
  { label: 'Contours', kind: 'contours' },
  { label: 'Helix', kind: 'helix' },
];

const DENSITIES: ArtDensity[] = ['thumb', 'tile', 'hero'];
const MOTIONS: ArtMotion[] = ['none', 'hover', 'drift'];

const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;

function Toggle<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex items-center gap-2"
    >
      <MicroLabel>{label}</MicroLabel>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={option === value}
          onClick={() => onChange(option)}
          className={cn(
            'h-8 rounded-full px-3 text-sm transition-colors',
            option === value
              ? 'bg-white/15 text-white'
              : 'bg-white/[0.03] text-white/60 hover:text-white',
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

/** The comet once round, again on each press (the prompt bar's Go). */
function RimRunDemo() {
  const [runs, setRuns] = useState(1);
  return (
    <button
      type="button"
      onClick={() => setRuns((n) => n + 1)}
      className="relative grid h-40 w-56 place-items-center rounded-[var(--daw-radius-2xl)] bg-daw-surface-1"
    >
      <MicroLabel>Rim · run (press)</MicroLabel>
      <SpectrumRim key={runs} state="run" />
    </button>
  );
}

/** Every mode worth a look: n 2–7, m below it, both signs. */
const CHLADNI_MODES: ChladniMode[] = [];
for (let n = 2; n <= 7; n++)
  for (let m = 0; m < n; m++)
    for (const sign of [1, -1] as const) CHLADNI_MODES.push({ n, m, sign });
const CHLADNI_HUES = ['#5B7BD9', '#2BB5A0', '#9D7FCE', '#F07A5A', '#62B4F7'];

const WRITE_IN_WORDS = ['Arcade', 'Ear Training', 'Rhythm', 'Sound Lab'];

/** A title that writes itself in again each time it changes. */
function WriteInDemo() {
  const [i, setI] = useState(0);
  return (
    <div className="flex flex-col items-start gap-3">
      <h3 className="text-[clamp(2.25rem,4.4vw,3.5rem)] font-normal leading-[1.02] text-daw-text">
        <RainbowWriteIn text={WRITE_IN_WORDS[i]} />
      </h3>
      <button
        type="button"
        onClick={() => setI((n) => (n + 1) % WRITE_IN_WORDS.length)}
        className={OUTLINE_PILL}
      >
        Next title
      </button>
    </div>
  );
}

export function ArtContactSheet() {
  const [seed, setSeed] = useState('contact-sheet');
  const [density, setDensity] = useState<ArtDensity>('tile');
  const [motion, setMotion] = useState<ArtMotion>('hover');
  const [reduced, setReduced] = useState<'off' | 'on'>('off');
  const [tab, setTab] = useState('creations');

  const shuffle = () => setSeed(`seed-${Math.floor(Math.random() * 1e6)}`);

  const stats = useMemo(() => {
    const started = performance.now();
    let bytes = 0;
    for (const row of ROWS) {
      for (const palette of ART_PALETTE_NAMES) {
        bytes += buildArtScene({
          seed: `${seed}:${row.label}:${palette}`,
          kind: row.kind,
          variant: row.variant,
          palette,
          density,
          aspect: COVER_ASPECT.portrait,
        }).bytes;
      }
    }
    return { bytes, ms: performance.now() - started };
  }, [seed, density]);

  return (
    <div
      id="art-contact-sheet"
      data-art-reduced-motion={reduced === 'on' ? '' : undefined}
      className="min-h-screen overflow-y-auto bg-[#101012] text-[#e8e8f0]"
    >
      <div className="mx-auto flex max-w-[90rem] flex-col gap-12 px-6 py-10 md:px-10">
        <DisplayHeading
          eyebrow="Dev · redesign wave 1"
          title="Art contact sheet"
          sub="Every cover kind in every palette, the kit, and the Arcade's games. Hover a tile to breathe it."
        />

        {/* Chladni modes (GRM's Atelier figures): pick each game's. */}
        <section id="chladni-modes" className="flex flex-col gap-3">
          <MicroLabel>Chladni modes · n, m, ±</MicroLabel>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-10">
            {CHLADNI_MODES.map((mode, i) => (
              <figure
                key={`${mode.n},${mode.m},${mode.sign}`}
                className="flex flex-col gap-1"
              >
                <div className="relative aspect-square overflow-hidden rounded-xl bg-[#141416]">
                  <ArtCover
                    seed="chladni"
                    kind="chladni"
                    mode={mode}
                    colors={[CHLADNI_HUES[i % CHLADNI_HUES.length]]}
                    density="tile"
                    aspect={1}
                    fade="none"
                  />
                </div>
                <figcaption className="text-xs text-white/50">
                  {mode.n},{mode.m},{mode.sign > 0 ? '+' : '−'}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <label className="flex items-center gap-2">
            <MicroLabel>Seed</MicroLabel>
            <input
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              className="h-8 w-48 rounded-full bg-white/[0.06] px-3 text-sm text-white outline-none focus:ring-2 focus:ring-white/40"
            />
          </label>
          <button
            type="button"
            onClick={shuffle}
            className="inline-flex h-8 items-center gap-2 rounded-full bg-white/[0.06] px-3 text-sm text-white/80 hover:text-white"
          >
            <Shuffle className="size-4" /> Shuffle
          </button>
          <Toggle
            label="Density"
            value={density}
            options={DENSITIES}
            onChange={setDensity}
          />
          <Toggle
            label="Motion"
            value={motion}
            options={MOTIONS}
            onChange={setMotion}
          />
          <Toggle
            label="Reduced motion"
            value={reduced}
            options={['off', 'on'] as const}
            onChange={setReduced}
          />
          <MicroLabel>
            {kb(stats.bytes)} for {ROWS.length * ART_PALETTE_NAMES.length}{' '}
            covers · built in {stats.ms.toFixed(1)} ms
          </MicroLabel>
        </div>

        {/* Kinds × palettes. */}
        <section className="flex flex-col gap-6">
          <DisplayHeading size="section" title="Kinds × palettes" />
          <div className="overflow-x-auto">
            <table className="border-separate border-spacing-3">
              <thead>
                <tr>
                  <th />
                  {ART_PALETTE_NAMES.map((name) => (
                    <th key={name} className="text-left align-bottom">
                      <div className="flex flex-col gap-2">
                        <MicroLabel>{name}</MicroLabel>
                        <div
                          className="h-1.5 w-32 rounded-full"
                          style={{
                            background: `linear-gradient(90deg, ${ART_PALETTES[name].join(',')})`,
                          }}
                        />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.label}>
                    <th className="pr-3 text-left align-middle">
                      <MicroLabel>{row.label}</MicroLabel>
                    </th>
                    {ART_PALETTE_NAMES.map((palette) => {
                      const cellSeed = `${seed}:${row.label}:${palette}`;
                      const scene = buildArtScene({
                        seed: cellSeed,
                        kind: row.kind,
                        variant: row.variant,
                        palette,
                        density,
                        aspect: COVER_ASPECT.portrait,
                      });
                      return (
                        <td key={palette}>
                          <div className="art-host flex w-32 flex-col gap-1.5">
                            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-[#151518]">
                              <ArtCover
                                seed={cellSeed}
                                kind={row.kind}
                                variant={row.variant}
                                palette={palette}
                                density={density}
                                aspect={COVER_ASPECT.portrait}
                                motion={motion}
                              />
                            </div>
                            <span className="text-xs text-white/40">
                              {kb(scene.bytes)} · {scene.layers.length} paths
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Heroes. */}
        <section className="flex flex-col gap-6">
          <DisplayHeading
            size="section"
            title="Heroes"
            sub="Drifting: flowing kinds slide one frame along; the rest sway."
          />
          <ArcadeHero game={FEATURED_GAME} locked={false} onPlay={() => {}} />
          <div className="grid gap-6 lg:grid-cols-2">
            {(['helix', 'rings', 'contours', 'strands'] as const).map(
              (kind, i) => (
                <HeroArt
                  key={kind}
                  ariaLabel={`Hero: ${kind}`}
                  eyebrow={microLabel('Hero', kind)}
                  title={
                    ['Groove Lab', 'Chroma', 'Major Arcanum', 'Wave Sculptor'][
                      i
                    ]
                  }
                  blurb="A line about the game, under its name."
                  className="min-h-80 md:min-h-[22rem]"
                  art={
                    <ArtCover
                      seed={`${seed}:hero:${kind}`}
                      kind={kind}
                      palette={
                        (['lagoon', 'nebula', 'infra', 'tide'] as const)[i]
                      }
                      density="hero"
                      aspect={1.6}
                      motion="drift"
                      fade={270}
                    />
                  }
                  cta={{
                    label: i === 1 ? 'Unlock Chroma' : 'Play',
                    icon:
                      i === 1 ? (
                        <Lock className="size-[1.125rem]" />
                      ) : (
                        <Play className="size-[1.125rem]" fill="currentColor" />
                      ),
                    onClick: () => {},
                  }}
                />
              ),
            )}
          </div>
        </section>

        {/* Googlebook's light. */}
        <section className="flex flex-col gap-6">
          <DisplayHeading
            size="section"
            title="Light"
            sub="Colour only as light, in the key rainbow: rims, the working bar, the horizon."
          />
          <div className="flex flex-wrap items-start gap-6">
            {(
              [
                ['hover', 'all', 'Rim · hover me'],
                ['on', 'all', 'Rim · on'],
                ['on', 'bottom', 'Rim · bottom edge'],
              ] as const
            ).map(([state, edge, label]) => (
              <div
                key={label}
                tabIndex={0}
                className="art-host relative grid h-40 w-56 place-items-center rounded-[var(--daw-radius-2xl)] bg-daw-surface-1 outline-none"
              >
                <MicroLabel>{label}</MicroLabel>
                <SpectrumRim state={state} edge={edge} />
              </div>
            ))}
            <RimRunDemo />
          </div>
          <div className="flex flex-col gap-3">
            <MicroLabel>Working bar</MicroLabel>
            <SpectrumBar label="Working" className="w-72" />
          </div>
          <div className="relative h-64 overflow-hidden rounded-[var(--daw-radius-2xl)] bg-[#0b0b0d]">
            <HorizonFlare core="58%" />
          </div>
        </section>

        {/* The Studio's text interactions. */}
        <section className="flex flex-col gap-6">
          <DisplayHeading
            size="section"
            title="Text"
            sub="Titles written in with the rainbow, as the prompt bar's suggestion; pills and tabs as the Studio's."
          />
          <WriteInDemo />
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className={WHITE_PILL}>
              <Play fill="currentColor" /> Play
            </button>
            <button type="button" className={OUTLINE_PILL}>
              Relaxation
            </button>
            <Chip>very relaxing</Chip>
            <Chip>pleasant</Chip>
          </div>
        </section>

        {/* The reference's stacked cards. */}
        <section className="flex max-w-md flex-col gap-2">
          <DisplayHeading size="section" title="Section cards" />
          <SectionCard title="Sleep" sub="by Alison S" onOpen={() => {}}>
            <div className="flex gap-1.5">
              <Chip>very relaxing</Chip>
              <Chip>pleasant</Chip>
              <Chip>deep</Chip>
            </div>
          </SectionCard>
          <SectionCard title="Timer" sub="40 min" onOpen={() => {}} />
          <SectionCard title="Foundation" onOpen={() => {}}>
            <div className="flex gap-2">
              <button type="button" className={OUTLINE_PILL}>
                Relaxation
              </button>
              <button type="button" className={OUTLINE_PILL}>
                Trance
              </button>
            </div>
          </SectionCard>
          <SectionCard title="Motive" onOpen={() => {}}>
            <CoverTile
              layout="tray"
              fluid
              title="Northern Sky"
              eyebrow={microLabel('Pop', 'Epic')}
              ariaLabel="Play Northern Sky"
              className="bg-daw-bg"
              art={
                <ArtCover
                  seed={`${seed}:motive`}
                  kind="rings"
                  density="thumb"
                  aspect={1}
                />
              }
            />
          </SectionCard>
          <button type="button" className={cn(WHITE_PILL, 'mt-2 h-11 w-full')}>
            Play
          </button>
        </section>

        {/* The kit. */}
        <section className="flex flex-col gap-8">
          <DisplayHeading size="section" title="The kit" />
          <div className="flex flex-col gap-3">
            <MicroLabel>{microLabel('Display heading', 'page')}</MicroLabel>
            <DisplayHeading
              title="How do you want to play today?"
              sub="Choose where to start: you can change it any time."
            />
          </div>
          <div className="flex flex-col gap-3">
            <MicroLabel>Underline tabs</MicroLabel>
            <div
              onClickCapture={(e) => {
                const key = (e.target as HTMLElement)
                  .closest('[data-tab]')
                  ?.getAttribute('data-tab');
                if (key) {
                  e.preventDefault();
                  setTab(key);
                }
              }}
            >
              <UnderlineTabs
                label="Profile"
                activeKey={tab}
                items={[
                  { key: 'creations', label: 'My creations', to: '#' },
                  { key: 'favourites', label: 'Favourites', to: '#' },
                  { key: 'awards', label: 'Awards', to: '#' },
                ]}
              />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <MicroLabel>Cover tiles: portrait, wide, tray</MicroLabel>
            <div className="flex flex-wrap items-start gap-6">
              {(['portrait', 'wide', 'tray'] as const).map((layout, i) => {
                const kinds = ['strands', 'contours', 'rings'] as const;
                return (
                  <CoverTile
                    key={layout}
                    layout={layout}
                    title={['Sleep', 'Yoga 20 min', 'Northern Sky'][i]}
                    eyebrow={microLabel('Pop', 'Epic')}
                    sub={
                      ['Relaxation', 'Created yesterday', 'Last played 2h ago'][
                        i
                      ]
                    }
                    ariaLabel={`Open ${layout}`}
                    art={
                      <ArtCover
                        seed={`${seed}:kit:${layout}`}
                        kind={kinds[i]}
                        density={layout === 'tray' ? 'thumb' : 'tile'}
                        aspect={COVER_ASPECT[layout]}
                        motion="hover"
                      />
                    }
                  />
                );
              })}
            </div>
          </div>
        </section>

        {/* The Arcade's games. */}
        <section className="flex flex-col gap-6">
          <DisplayHeading
            size="section"
            title="The Arcade's games"
            sub="Each by its category's kind, in its own palette."
          />
          <div
            className="grid grid-cols-[repeat(auto-fill,minmax(12.5rem,1fr))] gap-x-5 gap-y-8"
            // The page's glow colours, as the Arcade sets them.
            style={
              {
                '--home-glow-a': '#5B7BD9',
                '--home-glow-b': '#E0A33A',
              } as React.CSSProperties
            }
          >
            {ARCADE_GAMES.map((game) => {
              const art = artForGame(game);
              return (
                <div key={game.title} className="flex flex-col gap-2">
                  <GameCard
                    game={game}
                    showFreeBadge={false}
                    locked={false}
                    onLaunch={() => {}}
                  />
                  <span className="px-1 text-xs text-white/35">
                    {art.kind}
                    {art.variant ? ` · ${art.variant}` : ''} ·{' '}
                    {art.palette ?? 'seeded'}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
