// ── y-partykit chunked messages ───────────────────────────────────────────
// The web app connects with y-partykit's provider, which splits any Yjs
// message over 1 MB (a big project's first sync) into chunks: a
// `y-pk-batch#{"type":"start",…}` string, the binary chunks, then a matching
// `end` string. y-partykit's server put them back together; y-partyserver has
// no notion of them, so the collab party does it here before the Yjs sync sees
// the message. Mirrors handleChunked in y-partykit 0.0.33.

import type { WSMessage } from 'partyserver';

const BATCH_SENTINEL = 'y-pk-batch';

interface BatchMarker {
  id: string;
  type: 'start' | 'end';
  size: number;
  count: number;
}

/** Whether a string message is one of y-partykit's chunk markers. */
export function isBatchMarker(message: string): boolean {
  return message.startsWith(BATCH_SENTINEL);
}

function parseBatchMarker(message: string): BatchMarker | null {
  try {
    const [sentinel, data] = message.split('#', 2);
    if (sentinel !== BATCH_SENTINEL) return null;
    const marker = JSON.parse(data) as BatchMarker;
    return marker.type === 'start' || marker.type === 'end' ? marker : null;
  } catch {
    return null;
  }
}

function toBytes(message: ArrayBuffer | ArrayBufferView): Uint8Array {
  return message instanceof ArrayBuffer
    ? new Uint8Array(message)
    : new Uint8Array(message.buffer, message.byteOffset, message.byteLength);
}

/**
 * A reader for one connection. Feed it every binary message and chunk marker
 * the socket sends; it calls `receive` with each whole Yjs message — at once
 * for an ordinary message, on the `end` marker for a chunked one. A batch that
 * doesn't add up is dropped, as y-partykit's reader did (it threw).
 */
export function createChunkedReader(
  receive: (message: Uint8Array) => void,
): (message: WSMessage) => void {
  let start: BatchMarker | null = null;
  let chunks: Uint8Array[] = [];

  return (message) => {
    if (typeof message !== 'string') {
      const bytes = toBytes(message);
      if (start) chunks.push(bytes);
      else receive(bytes);
      return;
    }

    const marker = parseBatchMarker(message);
    if (!marker) return;
    if (marker.type === 'start') {
      start = marker;
      chunks = [];
      return;
    }

    const batchStart = start;
    const batch = chunks;
    start = null;
    chunks = [];
    if (!batchStart) return;

    const size = batch.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    if (
      batchStart.id !== marker.id ||
      batchStart.count !== marker.count ||
      batch.length !== marker.count ||
      batchStart.size !== marker.size ||
      size !== marker.size
    ) {
      console.error('[collab] dropped a chunked message that did not add up', {
        start: batchStart,
        end: marker,
        received: { count: batch.length, size },
      });
      return;
    }

    const whole = new Uint8Array(size);
    let offset = 0;
    for (const chunk of batch) {
      whole.set(chunk, offset);
      offset += chunk.byteLength;
    }
    receive(whole);
  };
}
