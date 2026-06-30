export interface RecordingResult {
  /** Decoded PCM, used for playback + waveform rendering. */
  buffer: AudioBuffer;
  /** Compressed bytes as produced by MediaRecorder (typically Opus in WebM). */
  originalBytes: ArrayBuffer;
  /** MIME type of `originalBytes` — e.g. "audio/webm;codecs=opus". */
  originalContentType: string;
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private recording = false;

  async startRecording(stream: MediaStream): Promise<void> {
    this.chunks = [];
    this.recording = true;

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    this.mediaRecorder = new MediaRecorder(stream, { mimeType });
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.mediaRecorder.start(100); // collect data every 100ms
  }

  /**
   * Stop recording and resolve with the decoded buffer plus the original
   * compressed bytes. Callers should stash both in AudioBufferStore (via
   * setAudioBuffer + setOriginalAudio) so cloud save can upload the small
   * compressed form rather than re-encoding to WAV.
   */
  async stopRecording(ctx: AudioContext): Promise<RecordingResult> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No active recording'));
        return;
      }

      this.mediaRecorder.onstop = async () => {
        this.recording = false;
        const originalContentType = this.mediaRecorder!.mimeType;
        const blob = new Blob(this.chunks, { type: originalContentType });
        const arrayBuffer = await blob.arrayBuffer();
        // decodeAudioData may neuter its input in some browsers; clone first
        // so we still have the original bytes to upload later.
        const originalBytes = arrayBuffer.slice(0);
        const buffer = await ctx.decodeAudioData(arrayBuffer);
        resolve({ buffer, originalBytes, originalContentType });
      };

      this.mediaRecorder.stop();
    });
  }

  isRecording(): boolean {
    return this.recording;
  }

  dispose(): void {
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.stop();
    }
    this.mediaRecorder = null;
    this.chunks = [];
  }
}
