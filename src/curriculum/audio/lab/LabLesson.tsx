import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LearnRoutes } from '@/constants/routes';
import { GuitarLessonHeader } from '@/curriculum/guitar/layout/GuitarLessonHeader';
import { LessonFrame } from '@/curriculum/guitar/layout/LessonFrame';
import { LessonTabStrip } from '@/curriculum/guitar/layout/LessonTabStrip';
import {
  GuitarSheet,
  SettingsSection,
} from '@/curriculum/guitar/layout/settingsControls';
import type {
  GuitarStepStatus,
  HeaderModel,
  StepNavModel,
} from '@/curriculum/guitar/layout/types';
import { useTutorialProgressStore } from '@/features/tutorials/useTutorialProgressStore';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { colorForKeyMode } from '@/lib/modeColorShift';
import {
  LAB_STEPS,
  type AudioModule,
  type LabLesson as LabUnit,
  type LabStepId,
} from '../catalog';
import { LAB_TOPIC_PAGES } from '../labPages';
import { LabVolumeRow } from './LabControls';
import type { LabFollowing } from './LabDone';
import {
  audioStepId,
  nextStepIn,
  resumePoint,
  useAudioProgress,
} from './audioProgress';

const isStep = (value: string | null): value is LabStepId =>
  LAB_STEPS.some((step) => step.id === value);

export interface LabTopicProps {
  step: LabStepId;
  accent: string;
  /** Counts this step as done and opens the next. */
  next: () => void;
  /** Counts the last step as done, finishing the topic. */
  complete: () => void;
  /** The next topic, or null on the unit's last. */
  following: LabFollowing | null;
  /** For the topic's own Insight panel: its About cards. */
  about: {
    open: boolean;
    onClose: () => void;
    name: string;
    title: string;
  };
}

/**
 * A unit's page: the lesson frame, every topic's steps on the rail, the topics
 * in the tab row, each with a line of its steps (Theory's tabs), and the open
 * topic under them. `?topic=` and `?step=` open any of it, and with neither it
 * opens where the student left off. Everything stays open to jump to, so a
 * teacher can go straight to a step. A topic's sound stops on leaving its step,
 * and with the topic's page when the topic changes.
 */
export function LabLesson({
  module,
  lesson,
}: {
  module: AudioModule;
  lesson: LabUnit;
}) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const narrow = !useMediaQuery('(min-width: 640px)');
  const accent = colorForKeyMode(module.accentKey);
  const completedAt = useTutorialProgressStore((s) => s.completedAt);

  // Fixed on opening: finishing a step must not move the student along.
  const [resume] = useState(() =>
    resumePoint(
      useTutorialProgressStore.getState().completedAt,
      module.id,
      lesson,
    ),
  );
  const named = lesson.topics.find((t) => t.id === params.get('topic'));
  const topic =
    named ??
    lesson.topics.find((t) => t.id === resume.topicId) ??
    lesson.topics[0];
  const stepParam = params.get('step');
  const step: LabStepId = isStep(stepParam)
    ? stepParam
    : named
      ? 'hear'
      : resume.step;
  const stepIndex = LAB_STEPS.findIndex((s) => s.id === step);
  const topicIndex = lesson.topics.indexOf(topic);

  const goTo = useCallback(
    (topicId: string, next: LabStepId) =>
      setParams(
        (prev) => {
          const out = new URLSearchParams(prev);
          out.set('topic', topicId);
          if (next === 'hear') out.delete('step');
          else out.set('step', next);
          return out;
        },
        { replace: true },
      ),
    [setParams],
  );

  // Each step starts at its top, not where the last one was left.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo?.({ top: 0 });
  }, [topic.id, step]);

  const statusOf = useCallback(
    (topicId: string, id: LabStepId): GuitarStepStatus =>
      completedAt[audioStepId(module.id, lesson.id, topicId, id)] != null
        ? 'passed'
        : 'todo',
    [completedAt, module.id, lesson.id],
  );

  const header: HeaderModel = {
    crumbs: [{ label: 'Audio', onClick: () => navigate(LearnRoutes.audio()) }],
    keyLabel: lesson.title,
    keyColor: accent,
    subsection: '',
    activity: LAB_STEPS[stepIndex].label,
  };
  const { stepDone } = useAudioProgress(module.id, lesson);
  // The rail: all the unit's steps, under their topics.
  const rows = useMemo(
    () =>
      lesson.topics.flatMap((t) =>
        LAB_STEPS.map((s) => ({ topic: t, step: s })),
      ),
    [lesson],
  );
  const nav: StepNavModel = useMemo(
    () => ({
      sections: [],
      onSection: () => {},
      steps: rows.map((row) => ({
        code: '',
        title: row.step.label,
        subsection: row.topic.title,
        status: statusOf(row.topic.id, row.step.id),
      })),
      index: topicIndex * LAB_STEPS.length + stepIndex,
      goToStep: (i: number) => goTo(rows[i].topic.id, rows[i].step.id),
      pager: false,
      practiceTrack: null,
    }),
    [rows, statusOf, topicIndex, stepIndex, goTo],
  );

  const Page = LAB_TOPIC_PAGES[topic.id];
  const nextTopic = lesson.topics[topicIndex + 1];

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
      data-audio-lab={lesson.id}
      data-audio-topic={topic.id}
    >
      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden"
      >
        <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-5 px-6 pb-10 pt-5 max-[639px]:px-4">
          <GuitarLessonHeader header={header} section={topic.title} />
          <LessonTabStrip
            label="Topics"
            keyColor={accent}
            tabs={lesson.topics.map((t, i) => ({
              id: t.id,
              label: narrow ? String(i + 1) : t.tab,
              name: t.title,
              // A phone's tab has room for only a number: the header names it.
              sub: narrow ? undefined : t.sub,
              active: t === topic,
              // The open topic's tab stays put; another's opens what's left.
              onSelect: () => {
                if (t === topic) return;
                goTo(
                  t.id,
                  nextStepIn(completedAt, module.id, lesson.id, t.id) ?? 'hear',
                );
              },
              steps: LAB_STEPS.map((s) => ({
                status: statusOf(t.id, s.id),
                current: t === topic && s.id === step,
                label: `${t.title}: ${s.label}`,
                onSelect: () => goTo(t.id, s.id),
              })),
            }))}
          />
          <Suspense fallback={null}>
            {/* By topic: a new topic starts fresh, and its sound can't carry. */}
            <Page
              key={topic.id}
              step={step}
              accent={accent}
              next={() => {
                stepDone(topic.id, step);
                const following = LAB_STEPS[stepIndex + 1];
                if (following) goTo(topic.id, following.id);
              }}
              complete={() => stepDone(topic.id, 'try')}
              following={
                nextTopic
                  ? {
                      title: nextTopic.title,
                      open: () => goTo(nextTopic.id, 'hear'),
                    }
                  : null
              }
              about={{
                open: aboutOpen,
                onClose: () => setAboutOpen(false),
                name: 'about',
                title: `About ${topic.title}`,
              }}
            />
          </Suspense>
        </div>
      </div>

      <GuitarSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        modal={false}
        name="settings"
        title="Lesson settings"
        width={400}
      >
        <SettingsSection label="Sound">
          <LabVolumeRow />
        </SettingsSection>
      </GuitarSheet>
    </LessonFrame>
  );
}
