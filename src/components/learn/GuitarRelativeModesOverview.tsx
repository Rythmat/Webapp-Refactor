/**
 * Learn → Theory → Relative Modes on guitar: one major key's seven modes as
 * its seven positions on the neck, named Ionian … Locrian (the lesson
 * Overview numbers the same shapes Position 1 … 7). Each opens its mode's
 * guitar lesson on its root.
 *
 * The premium gate is the route's, as on keyboard. Opening it makes guitar
 * this device's Learn instrument. Loaded on demand.
 */

import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  ModePositionsOverview,
  positionTabs,
} from '@/components/guitar/positions/ModePositionsOverview';
import { LearnRoutes } from '@/constants/routes';
import {
  keyPitchClass,
  keyScaleSpelling,
  toBookKey,
} from '@/curriculum/data/guitar/bookOne';
import { GuitarLessonHeader } from '@/curriculum/guitar/layout/GuitarLessonHeader';
import { LessonFrame } from '@/curriculum/guitar/layout/LessonFrame';
import { LessonInsightPanel } from '@/curriculum/guitar/layout/LessonInsightPanel';
import {
  GuitarSheet,
  SettingsSection,
  SettingsSwitchRow,
} from '@/curriculum/guitar/layout/settingsControls';
import type {
  HeaderModel,
  StepNavModel,
} from '@/curriculum/guitar/layout/types';
import { formatAccidentalsForDisplay } from '@/curriculum/utils/formatAccidentals';
import {
  INSIGHT_DIM,
  INSIGHT_TEXT,
  InsightCard,
} from '@/daw/components/Library/InsightCard';
import { learnTabRoute } from '@/features/learn/learnPaths';
import { useInstrumentStore } from '@/features/learn/useInstrumentStore';
import { colorForKeyMode } from '@/lib/modeColorShift';
import { guitarLessonRoute } from './guitarTheory';
import { findByUrlParam } from './relativeModeContent';

const THEORY_TAB_ROUTE = LearnRoutes.root(undefined, { tab: 'Theory' });

export default function GuitarRelativeModesOverview() {
  const navigate = useNavigate();
  const { key: keyParam = '' } = useParams<{ key: string }>();
  const entry = findByUrlParam(keyParam);
  const bookKey = entry ? toBookKey(entry.keyRoot) : null;

  const setInstrument = useInstrumentStore((s) => s.setInstrument);
  const leftHanded = useInstrumentStore((s) => s.leftHanded);
  const setLeftHanded = useInstrumentStore((s) => s.setLeftHanded);
  useEffect(() => {
    if (bookKey) setInstrument('guitar');
  }, [bookKey, setInstrument]);

  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [keyParam]);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const scale = useMemo(
    () =>
      bookKey
        ? {
            tonicPc: keyPitchClass(bookKey),
            mode: 'ionian' as const,
            spelling: keyScaleSpelling(bookKey),
          }
        : null,
    [bookKey],
  );

  if (!scale || !bookKey) return <Navigate replace to={THEORY_TAB_ROUTE} />;

  const keyName = formatAccidentalsForDisplay(bookKey);
  const keyColor = colorForKeyMode(keyName);
  const tabs = positionTabs({
    mode: 'ionian',
    labels: 'mode',
    index,
    onSelect: setIndex,
    narrow: false,
  });
  const header: HeaderModel = {
    crumbs: [
      {
        label: 'Theory',
        onClick: () => navigate(learnTabRoute('guitar', 'Theory')),
      },
    ],
    keyLabel: `${keyName} Major: Relative Modes`,
    keyColor,
    subsection: '',
    activity: `${formatAccidentalsForDisplay(scale.spelling[index])} ${tabs[index].name}`,
  };
  const nav: StepNavModel = {
    sections: [],
    onSection: () => {},
    steps: tabs.map((tab, i) => ({
      code: String(i + 1),
      title: tab.name ?? tab.label,
      subsection: '',
      status: 'todo',
    })),
    index,
    goToStep: setIndex,
    pager: false,
    practiceTrack: null,
  };

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
      data-relative-modes-page
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <div className="mx-auto flex w-full max-w-[1184px] flex-col gap-5 px-6 pb-10 pt-5 max-[639px]:px-4">
          <GuitarLessonHeader header={header} section="Relative Modes" />
          <ModePositionsOverview
            scale={scale}
            index={index}
            labels="mode"
            keyColor={keyColor}
            mirrored={leftHanded}
            onIndexChange={setIndex}
            onOpenMode={(position) =>
              navigate(
                guitarLessonRoute(
                  position.shapeMode,
                  formatAccidentalsForDisplay(position.rootName),
                ),
              )
            }
          />
        </div>
      </div>

      <LessonInsightPanel
        open={aboutOpen}
        onClose={() => setAboutOpen(false)}
        name="about"
        title="About relative modes"
      >
        <InsightCard title="One key, seven shapes">
          <p className={INSIGHT_TEXT}>
            The seven modes of {keyName} major use the same seven notes. Each
            starts on a different one, so each has its own shape on the neck.
          </p>
          <p className={INSIGHT_DIM}>
            Played one after another, the shapes tile the fretboard: where one
            ends, the next begins on the following note of the key.
          </p>
        </InsightCard>
        <InsightCard title="Reading the box">
          <p className={INSIGHT_TEXT}>
            The numbers are fingers, one finger per fret. Hollow dots are the
            mode's root.
          </p>
        </InsightCard>
      </LessonInsightPanel>
      <GuitarSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        modal={false}
        name="settings"
        title="Settings"
        width={400}
      >
        <SettingsSection label="Display">
          <SettingsSwitchRow
            label="Left-handed"
            helper="Mirror the neck"
            checked={leftHanded}
            onCheckedChange={setLeftHanded}
          />
        </SettingsSection>
      </GuitarSheet>
    </LessonFrame>
  );
}
