// ── EngineClock ─────────────────────────────────────────────────────────
// The editor's one requestAnimationFrame loop. Everything that has to look
// at the audio graph or the transport once a frame (the playhead, the
// meters, live chord detection, visualizers) runs as a task here instead of
// owning a loop of its own, and the loop runs only while some task is
// registered: an idle editor whose tasks have all stopped makes no rAF call.
//
// A task asks for a rate (fps). The loop runs at the display's rate and
// calls each task when its interval has passed, with the time since its last
// call, so a 30 fps meter and a 20 Hz chord detector share one frame.

export interface FrameTaskOptions {
  /** Highest rate the task wants, in calls per second. Default: every frame. */
  fps?: number;
  /** A name for dev tools and tests. */
  name?: string;
}

/** `now` is the frame's rAF timestamp, `dt` the ms since this task last ran. */
export type FrameTask = (now: number, dt: number) => void;

interface TaskEntry {
  run: FrameTask;
  intervalMs: number;
  last: number;
  name: string;
}

const tasks = new Set<TaskEntry>();
let rafId = 0;

// A frame that comes a little early (display jitter) still counts: without
// the slack a 30 fps task on a 60 Hz display would skip to 20 fps.
const SLACK_MS = 4;

function frame(now: number): void {
  rafId = 0;
  for (const entry of Array.from(tasks)) {
    // A task removed by an earlier one in this frame doesn't run.
    if (!tasks.has(entry)) continue;
    const dt = entry.last === 0 ? 0 : now - entry.last;
    if (entry.last !== 0 && dt + SLACK_MS < entry.intervalMs) continue;
    entry.last = now;
    try {
      entry.run(now, dt);
    } catch (err) {
      console.error(`[engineClock] task ${entry.name} failed`, err);
    }
  }
  if (tasks.size > 0 && rafId === 0) rafId = requestAnimationFrame(frame);
}

/**
 * Runs `task` on the shared frame loop until the returned function is
 * called. The first call comes on the next frame.
 */
export function addFrameTask(
  task: FrameTask,
  options: FrameTaskOptions = {},
): () => void {
  const entry: TaskEntry = {
    run: task,
    intervalMs: options.fps ? 1000 / options.fps : 0,
    last: 0,
    name: options.name ?? 'task',
  };
  tasks.add(entry);
  if (rafId === 0) rafId = requestAnimationFrame(frame);
  return () => {
    if (!tasks.delete(entry)) return;
    if (tasks.size === 0 && rafId !== 0) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  };
}

/** The names of the running tasks (dev tools, tests). */
export function frameTaskNames(): string[] {
  return Array.from(tasks, (t) => t.name);
}

/** True while the loop has a frame requested. */
export function isEngineClockRunning(): boolean {
  return rafId !== 0;
}
