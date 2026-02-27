import toWav from 'audiobuffer-to-wav'

/** Convert an AudioBuffer to a WAV Blob suitable for upload */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const wavData = toWav(buffer)
  return new Blob([new DataView(wavData)], { type: 'audio/wav' })
}
