import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GuitarLessonHeader } from '@/curriculum/guitar/layout/GuitarLessonHeader';
import { LessonFrame } from '@/curriculum/guitar/layout/LessonFrame';
import { LessonTabStrip } from '@/curriculum/guitar/layout/LessonTabStrip';
import {
  GuitarSheet,
  SettingsSection,
  SettingsSwitchRow,
} from '@/curriculum/guitar/layout/settingsControls';
import type {
  HeaderModel,
  StepNavModel,
} from '@/curriculum/guitar/layout/types';
import { learnTabRoute } from '@/features/learn/learnPaths';
import {
  useInstrumentStore,
  type LearnInstrument,
} from '@/features/learn/useInstrumentStore';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { AnatomyAbout } from './AnatomyAbout';
import { BuildTab } from './BuildTab';
import { ExploreTab } from './ExploreTab';
import type {
  AnatomyInstrument,
  AnatomyOption,
  ModelKind,
} from './anatomyTypes';
import { compiledInstrument } from './compileModel';

// ── An anatomy lesson ──────────────────────────────────────────────────────
// Learn → Technique → each instrument's Anatomy: its parts, as
// an exploded diagram that moves with the student's choices. Two tabs: Explore
// (choose a part and it lifts clear while the rest reassembles) and Build it
// (put it back together, part by named part). `?tab=build`, `?kind=acoustic`
// and `?part=saddle` open any of it.
//
// Free (the route is ungated, as every Technique tile is shown unlocked).
// Opening it makes this device's Learn instrument the lesson's.

const TABS = [
  {
    id: 'explore',
    label: 'Explore',
    short: 'Explore',
    sub: 'Every part, taken apart',
  },
  {
    id: 'build',
    label: 'Build it',
    short: 'Build',
    sub: 'Put it back together',
  },
] as const;
type TabId = (typeof TABS)[number]['id'];

const isTab = (value: string | null): value is TabId =>
  TABS.some((t) => t.id === value);

/** Learn's instrument for each lesson: a keyboard and a synth are both taught
 *  under Keyboard, as a piano is. */
const learnInstrumentOf = (instrument: AnatomyInstrument): LearnInstrument =>
  instrument === 'guitar' || instrument === 'bass' || instrument === 'ukulele'
    ? instrument
    : 'piano';

const paramOf = (option: AnatomyOption) =>
  option.param ?? option.label.toLowerCase();

export function AnatomyLesson({
  instrument,
  title,
  options,
}: {
  instrument: AnatomyInstrument;
  title: string;
  /** The default first; the URL names the other by its label. */
  options: readonly AnatomyOption[];
}) {
  const learnInstrument = learnInstrumentOf(instrument);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab');
  const kindParam = params.get('kind');
  const tab: TabId = isTab(tabParam) ? tabParam : 'explore';
  const kind: ModelKind = (
    options.find((option) => paramOf(option) === kindParam) ?? options[0]
  ).value;

  const leftHanded = useInstrumentStore((s) => s.leftHanded);
  const setLeftHanded = useInstrumentStore((s) => s.setLeftHanded);
  const setInstrument = useInstrumentStore((s) => s.setInstrument);
  useEffect(
    () => setInstrument(learnInstrument),
    [learnInstrument, setInstrument],
  );

  const model = compiledInstrument(kind, leftHanded);
  const partParam = params.get('part');
  const term = partParam && model.termById[partParam] ? partParam : null;

  const update = useCallback(
    (change: (out: URLSearchParams) => void) =>
      setParams(
        (prev) => {
          const out = new URLSearchParams(prev);
          change(out);
          return out;
        },
        { replace: true },
      ),
    [setParams],
  );

  const setTab = (next: TabId) =>
    update((out) => {
      if (next === 'explore') out.delete('tab');
      else out.set('tab', next);
    });
  const setKind = (next: ModelKind) =>
    update((out) => {
      const option = options.find((o) => o.value === next);
      if (!option || option === options[0]) out.delete('kind');
      else out.set('kind', paramOf(option));
      // A word both instruments have stays chosen, to compare them.
      const part = out.get('part');
      if (part && !compiledInstrument(next, leftHanded).termById[part]) {
        out.delete('part');
      }
    });
  const setTerm = useCallback(
    (next: string | null) =>
      update((out) => {
        if (next) out.set('part', next);
        else out.delete('part');
      }),
    [update],
  );

  const [labels, setLabels] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [built, setBuilt] = useState<ReadonlySet<ModelKind>>(new Set());
  const narrow = !useMediaQuery('(min-width: 640px)');

  const keyColor = model.accent;
  const tabIndex = TABS.findIndex((t) => t.id === tab);
  const header: HeaderModel = {
    crumbs: [
      {
        label: 'Technique',
        onClick: () => navigate(learnTabRoute(learnInstrument, 'Technique')),
      },
    ],
    keyLabel: title,
    keyColor,
    subsection: '',
    activity: TABS[tabIndex].label,
  };
  const nav: StepNavModel = useMemo(
    () => ({
      sections: [],
      onSection: () => {},
      steps: TABS.map((t, i) => ({
        code: String(i + 1),
        title: t.label,
        subsection: '',
        status: t.id === 'build' && built.size > 0 ? 'passed' : 'todo',
      })),
      index: tabIndex,
      goToStep: (i: number) => setTab(TABS[i].id),
      pager: false,
      practiceTrack: null,
    }),
    // setTab is a fresh closure each render; the index and status matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tabIndex, built.size],
  );

  return (
    <LessonFrame
      header={header}
      nav={nav}
      tools={{
        about: { open: aboutOpen, onToggle: () => setAboutOpen(!aboutOpen) },
        settings: {
          open: settingsOpen,
          onToggle: () => setSettingsOpen(!settingsOpen),
        },
      }}
      data-anatomy-page
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-5 px-6 pb-10 pt-5 max-[639px]:px-4">
          <GuitarLessonHeader header={header} section="Technique" />
          <LessonTabStrip
            label="Anatomy activities"
            keyColor={keyColor}
            tabs={TABS.map((t, i) => ({
              id: t.id,
              label: narrow ? String(i + 1) : t.label,
              name: t.label,
              sub: narrow ? t.short : t.sub,
              active: t.id === tab,
              onSelect: () => setTab(t.id),
            }))}
          />
          {tab === 'explore' && (
            <ExploreTab
              kind={kind}
              options={options}
              onKindChange={setKind}
              term={term}
              onTermChange={setTerm}
              leftHanded={leftHanded}
              labels={labels}
              onLabelsChange={setLabels}
            />
          )}
          {tab === 'build' && (
            <BuildTab
              kind={kind}
              options={options}
              onKindChange={setKind}
              leftHanded={leftHanded}
              onDone={(done) => setBuilt((prev) => new Set(prev).add(done))}
            />
          )}
        </div>
      </div>

      <AnatomyAbout
        instrument={instrument}
        open={aboutOpen}
        onClose={() => setAboutOpen(false)}
      />
      <GuitarSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        modal={false}
        name="settings"
        title="Lesson settings"
        width={400}
      >
        <div className="flex flex-col divide-y divide-white/[0.08]">
          <SettingsSection label="Display">
            <SettingsSwitchRow
              label="Labels"
              helper="Name every part on the diagram"
              checked={labels}
              onCheckedChange={setLabels}
            />
            {learnInstrument !== 'piano' && (
              <SettingsSwitchRow
                label="Left-handed"
                helper={`Build the ${instrument} the other way round`}
                checked={leftHanded}
                onCheckedChange={setLeftHanded}
              />
            )}
          </SettingsSection>
        </div>
      </GuitarSheet>
    </LessonFrame>
  );
}
