/**
 * Learn → Technique → Guitar Harmonics: the guitar's natural harmonics,
 * drawn to scale and heard. Four tabs: the Node map (every node of
 * partials 2–12 on the string, nut to bridge), String ratios (press vs
 * touch on a fretless string), Geometry (the string's divisions as circles,
 * on a guitar built from them) and Play it (the microphone checks each
 * harmonic on the student's own guitar). `?tab=` opens one.
 *
 * Free (the route is ungated, as every Technique tile is shown unlocked).
 * Opening it makes guitar this device's Learn instrument.
 */

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { learnTabRoute } from '@/features/learn/learnPaths';
import { useInstrumentStore } from '@/features/learn/useInstrumentStore';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import {
  harmonicNodes,
  midiToHz,
  PLAYABLE_PARTIALS,
  type HarmonicNode,
} from '@/lib/guitar/harmonics';
import type { GuitarStringNumber } from '@/lib/guitar/types';
import { colorForKeyMode } from '@/lib/modeColorShift';
import { GuitarLessonHeader } from '../layout/GuitarLessonHeader';
import { VolumeRow } from '../layout/GuitarSettingsSheet';
import { LessonFrame } from '../layout/LessonFrame';
import { LessonTabStrip } from '../layout/LessonTabStrip';
import {
  GuitarSheet,
  SegmentedControl,
  SettingsRow,
  SettingsSection,
  SettingsSwitchRow,
} from '../layout/settingsControls';
import type { HeaderModel, StepNavModel } from '../layout/types';
import { HarmonicsAbout } from './HarmonicsAbout';
import { openMidiOf, stringLetter } from './HarmonicsControls';
import { HarmonistView } from './HarmonistView';
import { NodeMapTab } from './NodeMapTab';
import { PartialDetail } from './PartialDetail';
import { StringRatiosTab } from './StringRatiosTab';
import { useHarmonicTone } from './useHarmonicTone';

// The microphone and the guitar input engine load with the Play it tab only.
const PlayItTab = lazy(() => import('./PlayItTab'));

// `short` fits under a phone's numbered tabs; `label` is the full name.
const TABS = [
  {
    id: 'nodes',
    label: 'Node map',
    short: 'Nodes',
    sub: 'Every harmonic, to scale',
  },
  {
    id: 'ratios',
    label: 'String ratios',
    short: 'Ratios',
    sub: 'Press vs touch',
  },
  {
    id: 'geometry',
    label: 'Geometry',
    short: 'Geo',
    sub: 'Circles of the string',
  },
  { id: 'play', label: 'Play it', short: 'Play it', sub: 'On your guitar' },
] as const;
type TabId = (typeof TABS)[number]['id'];

const isTab = (value: string | null): value is TabId =>
  TABS.some((t) => t.id === value);

/** How long a chime rings, for the string's swing on the neck. */
const RING_MS = 2600;

export default function GuitarHarmonicsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab');
  const tab: TabId = isTab(tabParam) ? tabParam : 'nodes';
  const setTab = (next: TabId) =>
    setParams(
      (prev) => {
        const out = new URLSearchParams(prev);
        if (next === 'nodes') out.delete('tab');
        else out.set('tab', next);
        return out;
      },
      { replace: true },
    );

  const setInstrument = useInstrumentStore((s) => s.setInstrument);
  const leftHanded = useInstrumentStore((s) => s.leftHanded);
  const setLeftHanded = useInstrumentStore((s) => s.setLeftHanded);
  useEffect(() => setInstrument('guitar'), [setInstrument]);

  // The A string first: the reference values (110 Hz) are on it.
  const [string, setString] = useState<GuitarStringNumber>(5);
  const [partials, setPartials] = useState<Set<number>>(
    () => new Set(PLAYABLE_PARTIALS),
  );
  const [selected, setSelected] = useState<HarmonicNode>(
    () => harmonicNodes(3)[0],
  );
  const [geometryPartial, setGeometryPartial] = useState(3);
  const [ringing, setRinging] = useState<number | null>(null);
  const [labels, setLabels] = useState<'fret' | 'ratio'>('fret');
  const [showBody, setShowBody] = useState(true);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [playDone, setPlayDone] = useState(false);

  const openMidi = openMidiOf(string);
  const letter = stringLetter(string);
  // Keys are colours: the string's open note is the accent.
  const keyColor = colorForKeyMode(letter);
  const tone = useHarmonicTone();
  const narrow = !useMediaQuery('(min-width: 640px)');

  useEffect(() => {
    if (ringing == null) return;
    const id = window.setTimeout(() => setRinging(null), RING_MS);
    return () => window.clearTimeout(id);
  }, [ringing]);

  const hearNode = useCallback(
    (node: HarmonicNode) => {
      tone.play(midiToHz(openMidi) * node.partial, 'chime');
      setRinging(null);
      // A new ring restarts the swing.
      requestAnimationFrame(() => setRinging(node.partial));
    },
    [openMidi, tone],
  );

  const pressGeometryNode = (node: HarmonicNode) => {
    setSelected(node);
    hearNode(node);
  };

  const geometrySelected =
    selected.partial === geometryPartial ? selected : null;

  const tabIndex = TABS.findIndex((t) => t.id === tab);
  const header: HeaderModel = {
    crumbs: [
      {
        label: 'Technique',
        onClick: () => navigate(learnTabRoute('guitar', 'Technique')),
      },
    ],
    keyLabel: 'Guitar Harmonics',
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
        status: t.id === 'play' && playDone ? 'passed' : 'todo',
      })),
      index: tabIndex,
      goToStep: (i: number) => setTab(TABS[i].id),
      pager: false,
      practiceTrack: null,
    }),
    // setTab is a fresh closure each render; the index and status matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tabIndex, playDone],
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
      data-harmonics-page
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-5 px-6 pb-10 pt-5 max-[639px]:px-4">
          <GuitarLessonHeader header={header} section="Technique" />
          <LessonTabStrip
            label="Harmonics activities"
            keyColor={keyColor}
            // On a phone, as the strip's own short labels: the number, and
            // the short name under it.
            tabs={TABS.map((t, i) => ({
              id: t.id,
              label: narrow ? String(i + 1) : t.label,
              name: t.label,
              sub: narrow ? t.short : t.sub,
              active: t.id === tab,
              onSelect: () => setTab(t.id),
            }))}
          />
          {tab === 'nodes' && (
            <NodeMapTab
              string={string}
              onStringChange={setString}
              partials={partials}
              onPartialsChange={setPartials}
              selected={selected}
              onSelect={setSelected}
              ringing={ringing}
              onHear={hearNode}
              keyColor={keyColor}
              mirrored={leftHanded}
              showBody={showBody}
              labels={labels}
            />
          )}
          {tab === 'ratios' && (
            <StringRatiosTab
              string={string}
              onStringChange={setString}
              keyColor={keyColor}
              mirrored={leftHanded}
              onPress={(hz) => tone.play(hz, 'pluck')}
              onTouch={(hz) => tone.play(hz, 'chime')}
            />
          )}
          {tab === 'geometry' && (
            <HarmonistView
              string={string}
              onStringChange={setString}
              partial={geometryPartial}
              onPartialChange={setGeometryPartial}
              selected={geometrySelected}
              onNodePress={pressGeometryNode}
              keyColor={keyColor}
              mirrored={leftHanded}
              detail={
                geometrySelected ? (
                  <PartialDetail
                    openMidi={openMidi}
                    stringName={letter}
                    node={geometrySelected}
                    keyColor={keyColor}
                    onPickNode={pressGeometryNode}
                    onHear={() => hearNode(geometrySelected)}
                  />
                ) : (
                  <p className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-5 text-sm leading-5 text-white/55">
                    {geometryPartial === 1
                      ? 'The fundamental: the whole string, one circle from nut to bridge. Choose a partial to divide it.'
                      : `Press a node (where two circles touch) to hear partial ${geometryPartial}.`}
                  </p>
                )
              }
            />
          )}
          {tab === 'play' && (
            <Suspense fallback={null}>
              <PlayItTab
                string={string}
                onStringChange={setString}
                keyColor={keyColor}
                mirrored={leftHanded}
                labels={labels}
                onHear={(hz) => tone.play(hz, 'chime')}
                onDone={() => setPlayDone(true)}
              />
            </Suspense>
          )}
        </div>
      </div>

      <HarmonicsAbout open={aboutOpen} onClose={() => setAboutOpen(false)} />
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
            <SettingsRow label="Node labels" forControl={false}>
              {({ labelId }) => (
                <SegmentedControl
                  labelledBy={labelId}
                  value={labels}
                  onChange={setLabels}
                  options={[
                    { value: 'fret', label: 'Fret' },
                    { value: 'ratio', label: 'Ratio' },
                  ]}
                />
              )}
            </SettingsRow>
            <SettingsSwitchRow
              label="Nodes over the body"
              helper="Past the 24th fret, toward the bridge"
              checked={showBody}
              onCheckedChange={setShowBody}
            />
            <SettingsSwitchRow
              label="Left-handed"
              helper="Mirror the neck"
              checked={leftHanded}
              onCheckedChange={setLeftHanded}
            />
          </SettingsSection>
          <SettingsSection label="Sound">
            <VolumeRow />
          </SettingsSection>
        </div>
      </GuitarSheet>
    </LessonFrame>
  );
}
