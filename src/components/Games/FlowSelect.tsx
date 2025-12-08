import { useEffect, useMemo, useState } from "react";
import { ActivityFlow } from "./ActivityFlow";
import { usePrismModes } from "@/hooks/data/prism/usePrismModes";
import { usePrismMode } from "@/hooks/data/prism/usePrismMode";
import { HeaderBar } from "../ClassroomLayout/HeaderBar";

type KeyOption = { label: string; midi: number };

const KEY_OPTIONS: KeyOption[] = [
  { label: "C", midi: 60 },
  { label: "C#", midi: 61 },
  { label: "D", midi: 62 },
  { label: "D#", midi: 63 },
  { label: "E", midi: 64 },
  { label: "F", midi: 65 },
  { label: "F#", midi: 66 },
  { label: "G", midi: 67 },
  { label: "G#", midi: 68 },
  { label: "A", midi: 69 },
  { label: "A#", midi: 70 },
  { label: "B", midi: 71 },
];

const DEFAULT_INTERVALS = [0, 2, 4, 5, 7, 9, 11, 12];
const DEFAULT_MODE_SLUG = "ionian";
const FALLBACK_MODES = [
  "ionian",
  "dorian",
  "phrygian",
  "lydian",
  "mixolydian",
  "aeolian",
  "locrian",
];

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

export const FlowSelect = () => {
  const [selectedKey, setSelectedKey] = useState<KeyOption>(KEY_OPTIONS[0]);
  const { data: modesData } = usePrismModes();
  const [started, setStarted] = useState(false);
  const [label, setLabel] = useState(['', '']);

  const modeOptions = useMemo(() => {
    const raw = modesData?.modes;
    if (raw && typeof raw === "object") {
      return Object.keys(raw);
    }
    return FALLBACK_MODES;
  }, [modesData]);

  const [selectedMode, setSelectedMode] = useState<string>(DEFAULT_MODE_SLUG);

  useEffect(() => {
    if (modeOptions.length === 0) return;
    if (!modeOptions.includes(selectedMode)) {
      setSelectedMode(modeOptions[0]);
    }
  }, [modeOptions, selectedMode]);

  const { data: modeDetail } = usePrismMode(selectedMode as any);

  const stepsFromModesMap = useMemo(() => {
    const raw = modesData?.modes as Record<string, unknown> | undefined;
    if (!raw || !selectedMode) return undefined;
    const modeValue = raw[selectedMode];
    if (Array.isArray(modeValue)) {
      return modeValue as number[];
    }
    return undefined;
  }, [modesData, selectedMode]);

  const scaleSteps = modeDetail?.steps ?? stepsFromModesMap ?? DEFAULT_INTERVALS;
  const scaleMidis = useMemo(
    () => buildScaleMidis(selectedKey.midi, scaleSteps),
    [selectedKey, scaleSteps],
  );

  const SelectionShell = () => (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 shadow-xl">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">Choose your flow</h1>
          <p className="text-sm text-neutral-400">
            Pick a key center and scale, then start your practice sequence.
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-wide text-neutral-400">
              Key Center
            </label>
            <select
              className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
              value={selectedKey.label}
              onChange={(e) => {
                const key = KEY_OPTIONS.find((k) => k.label === e.target.value);
                if (key) setSelectedKey(key);
              }}
            >
              {KEY_OPTIONS.map((key) => (
                <option key={key.label} value={key.label}>
                  {key.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-wide text-neutral-400">
              Scale / Mode
            </label>
            <select
              className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
            >
              {modeOptions.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm text-neutral-400">
          <span>
            Ready for {selectedKey.label} {selectedMode}
          </span>
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
        <HeaderBar title="Flow Select" context="learn" showProfile={false} className="bg-neutral-900/60" />
        <SelectionShell />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-neutral-50 flex flex-col">
      <HeaderBar title="Flow Select" context="learn" showProfile={false} className="bg-neutral-900/60" />
      <div className="border-b border-neutral-800 bg-neutral-900/60 px-4 py-3 flex items-center justify-between">
        <div className="text-sm text-neutral-300">
          {label[1]}
        </div>
        <div className="text-sm text-neutral-300">
          {label[0]}
        </div>
        <div className="text-sm text-neutral-300">
          Playing flow for <span className="font-semibold text-neutral-100">{selectedKey.label}</span>{" "}
          <span className="font-semibold text-neutral-100">{selectedMode}</span>{":   "}

          <button
            type="button"
            onClick={() => setStarted(false)}
            className="rounded-full border border-neutral-700 px-4 py-2 text-xs font-semibold text-neutral-100 hover:border-neutral-500 hover:text-white"
          >
            Change selection
          </button>
        </div>
      </div>
      <div className="p-3 sm:p-4 flex-1">
        <ActivityFlow
          scaleMidis={scaleMidis}
          onComplete={() => setStarted(false)}
          labelChange={(newLabel) => setLabel(newLabel)}
        />
      </div>
    </div>
  );
};
