/**
 * The Mind Map's layout worker. It runs the force layout off the main thread,
 * as Obsidian does, so the page can draw at full frame rate while thousands
 * of nodes settle.
 *
 * Everything it does is the layout engine in `layoutProtocol.ts`; this file
 * only connects that engine to the worker's messages. The page creates it as
 * a module worker:
 * `new Worker(new URL('./layout.worker.ts', import.meta.url), { type: 'module' })`.
 */
import {
  createLayoutEngine,
  type LayoutMessage,
  type LayoutRequest,
  type LayoutScheduler,
} from './layoutProtocol';

interface WorkerScope {
  postMessage(message: LayoutMessage, transfer: Transferable[]): void;
  onmessage: ((event: MessageEvent<LayoutRequest>) => void) | null;
}

const scope = self as unknown as WorkerScope;

/**
 * Runs a task as soon as the worker is free, without the 4 ms floor that
 * browsers put on repeated zero-delay timers: a message to its own channel
 * queues behind any message from the page, so a pin is never kept waiting.
 * Delays longer than zero use an ordinary timer.
 */
function createWorkerScheduler(): LayoutScheduler {
  const timer: LayoutScheduler = (task, delayMs) => {
    const id = setTimeout(task, delayMs);
    return () => clearTimeout(id);
  };
  if (typeof MessageChannel === 'undefined') return timer;
  const channel = new MessageChannel();
  const queue: { task: () => void; cancelled: boolean }[] = [];
  channel.port1.onmessage = () => {
    const entry = queue.shift();
    if (entry && !entry.cancelled) entry.task();
  };
  return (task, delayMs) => {
    if (delayMs > 0) return timer(task, delayMs);
    const entry = { task, cancelled: false };
    queue.push(entry);
    channel.port2.postMessage(null);
    return () => {
      entry.cancelled = true;
    };
  };
}

const engine = createLayoutEngine({
  post: (message, transfer) => scope.postMessage(message, transfer),
  schedule: createWorkerScheduler(),
  now: () => performance.now(),
});

scope.onmessage = (event) => engine.handle(event.data);
