function createAudioContext(): AudioContext {
  const Ctor =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) {
    throw new Error('AudioContext is not supported in this browser');
  }
  return new Ctor();
}

export async function getBlobDuration(blob: Blob): Promise<number> {
  const ctx = createAudioContext();
  const arrayBuffer = await blob.arrayBuffer();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  const duration = audioBuffer.duration;
  ctx.close?.();
  return duration;
}

function floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output;
}

export async function transcodeToMp3(blob: Blob, kbps = 128): Promise<Blob> {
  const ctx = createAudioContext();
  const arrayBuffer = await blob.arrayBuffer();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

  const numChannels = Math.min(2, audioBuffer.numberOfChannels || 1);
  const sampleRate = audioBuffer.sampleRate;

  const left = audioBuffer.getChannelData(0);
  const right = numChannels > 1 ? audioBuffer.getChannelData(1) : null;

  const { Mp3Encoder } = await import('lamejs');
  const encoder = new Mp3Encoder(numChannels, sampleRate, kbps);

  const blockSize = 1152;
  const mp3Parts: BlobPart[] = [];

  for (let i = 0; i < left.length; i += blockSize) {
    const leftChunk = floatTo16BitPCM(left.subarray(i, i + blockSize));
    let mp3buf: Int8Array;

    if (numChannels === 2 && right) {
      const rightChunk = floatTo16BitPCM(right.subarray(i, i + blockSize));
      mp3buf = encoder.encodeBuffer(leftChunk, rightChunk);
    } else {
      mp3buf = encoder.encodeBuffer(leftChunk);
    }

    if (mp3buf.length > 0) {
      mp3Parts.push(
        (mp3buf.buffer as ArrayBuffer).slice(
          mp3buf.byteOffset,
          mp3buf.byteOffset + mp3buf.byteLength,
        ),
      );
    }
  }

  const end = encoder.flush();
  if (end.length > 0) {
    mp3Parts.push(
      (end.buffer as ArrayBuffer).slice(
        end.byteOffset,
        end.byteOffset + end.byteLength,
      ),
    );
  }

  ctx.close?.();
  return new Blob(mp3Parts, { type: 'audio/mpeg' });
}
