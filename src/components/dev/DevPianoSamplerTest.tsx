import { useState } from "react";
import {
  startPianoSampler,
  triggerPianoAttackRelease,
} from "@/audio/pianoSampler";

export const DevPianoSamplerTest = () => {
  const [status, setStatus] = useState<"idle" | "loading" | "played" | "error">(
    "idle",
  );

  const handleStart = async () => {
    try {
      setStatus("loading");
      await startPianoSampler();
      await triggerPianoAttackRelease("A3", 0.5, 0.8);
      setStatus("played");
    } catch (error) {
      console.error("Failed to play piano sampler test", error);
      setStatus("error");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-950 text-neutral-50">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Piano Sampler Test</h1>
        <p className="mt-2 text-sm text-neutral-300">
          Click Start to load samples and play A3 for 0.5 seconds.
        </p>
      </div>
      <button
        type="button"
        onClick={handleStart}
        className="rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400"
      >
        Start
      </button>
      <p className="text-sm text-neutral-300">
        Status:{" "}
        {status === "idle" && "waiting for click"}
        {status === "loading" && "loading samples"}
        {status === "played" && "played A3"}
        {status === "error" && "error, check console"}
      </p>
    </div>
  );
};
