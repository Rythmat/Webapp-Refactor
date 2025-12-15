import { useEffect, useMemo, useState } from "react";
import { ActivityFlow } from "./ActivityFlow";
import { usePrismMode } from "@/hooks/data/prism/usePrismMode";
import { HeaderBar } from "../ClassroomLayout/HeaderBar";
import { PrismModeSlug } from "@/hooks/data";

type LessonContainerProps = {
  modeSlug: PrismModeSlug;
};

type KeyOption = { label: string; midi: number };

const KEY_C: KeyOption = { label: "C", midi: 60 };
const DEFAULT_INTERVALS = [0, 2, 4, 5, 7, 9, 11, 12];

const normalizeSteps = (steps?: number[]) => {
  if (!steps || steps.length === 0) return DEFAULT_INTERVALS;
  const unique = new Set<number>();
  steps.forEach((s) => {
    if (typeof s === "number" && Number.isFinite(s)) {
      unique.add(Math.round(s));
    }
  });
  if (!unique.has(0)) unique.add(0);
  if (!Array.from(unique).some((n) => n >= 12)) unique.add(12);
  return Array.from(unique).sort((a, b) => a - b);
};

const buildScaleMidis = (rootMidi: number, steps?: number[]) =>
  normalizeSteps(steps).map((interval) => rootMidi + interval);

export const LessonContainer = ({ modeSlug }: LessonContainerProps) => {
  const [started, setStarted] = useState(false);
  const [label, setLabel] = useState(["", ""]);

  const { data: modeDetail } = usePrismMode(modeSlug as any);
  const scaleSteps = modeDetail?.steps ?? DEFAULT_INTERVALS;
  const scaleMidis = useMemo(() => buildScaleMidis(KEY_C.midi, scaleSteps), [scaleSteps]);

  useEffect(() => {
    setStarted(false);
  }, [modeSlug]);

  const SelectionShell = () => (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 shadow-xl">
        <div className="flex flex-col gap-2 items-center text-center">
          <h1 className="text-2xl font-semibold">Ready to start?</h1>
          <p className="text-sm text-neutral-400">
            Practicing the <span className="font-semibold text-neutral-100">{modeSlug}</span> mode in the key of C.
          </p>
        </div>
        <div className="mt-4 flex items-center justify-center">
          <button
            type="button"
            onClick={() => setStarted(true)}
            className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400"
          >
            Start
          </button>
        </div>
      </div>
    </div>
  );

  if (!started) {
    return (
      <div className="min-h-screen w-full bg-neutral-950 text-neutral-50 flex flex-col">
        <HeaderBar title="Lesson" className="bg-neutral-900/60"
        />
        <SelectionShell />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-neutral-50 flex flex-col">
      <HeaderBar
        title="Lesson" className="bg-neutral-900/60"/>
      <div className="border-b border-neutral-800 bg-neutral-900/60 px-4 py-3 flex items-center justify-between">
        <div className="text-sm text-neutral-300">{label[1]}</div>
        <div className="text-sm text-neutral-300">{label[0]}</div>
        <div className="text-sm text-neutral-300">
          Playing flow for <span className="font-semibold text-neutral-100">{KEY_C.label}</span>{" "}
          <span className="font-semibold text-neutral-100">{modeSlug}</span>{" "}
        </div>
      </div>
      <div className="p-3 sm:p-4 flex-1">
        <ActivityFlow
          scaleMidis={scaleMidis}
          onComplete={() => setStarted(false)}
          labelChange={(newLabel) => setLabel(newLabel)}
          key={KEY_C.label}
          mode= {modeSlug}
        />
      </div>
    </div>
  );
};
