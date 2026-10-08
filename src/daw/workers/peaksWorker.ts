/**
 * The waveform peaks worker. It builds the min/max pyramid of a long audio
 * buffer off the main thread, from copies of the buffer's channels that the
 * page transfers here, and transfers the levels back.
 *
 * Everything it computes is buildPeakLevels in `audio/peakLevels.ts`; this
 * file only connects that to the worker's messages. The page creates it in
 * `audio/peaks.ts` as a module worker.
 */
import { buildPeakLevels } from '../audio/peakLevels';
import type { PeaksRequest, PeaksResponse } from '../audio/peaks';

interface WorkerScope {
  postMessage(message: PeaksResponse, transfer: Transferable[]): void;
  onmessage: ((event: MessageEvent<PeaksRequest>) => void) | null;
}

const scope = self as unknown as WorkerScope;

scope.onmessage = (event) => {
  const { id, length, channels } = event.data;
  try {
    const levels = buildPeakLevels(channels, length);
    const transfer = levels.flatMap((level) =>
      [...level.min, ...level.max].map(
        (values) => values.buffer as ArrayBuffer,
      ),
    );
    scope.postMessage({ id, levels }, transfer);
  } catch (error) {
    scope.postMessage(
      { id, error: error instanceof Error ? error.message : String(error) },
      [],
    );
  }
};
