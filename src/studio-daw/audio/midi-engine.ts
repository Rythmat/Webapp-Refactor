import {
  SpessaSynthProcessor,
  SoundBankLoader,
  SpessaSynthLogging,
} from 'spessasynth_core';

// Suppress verbose spessasynth logs
SpessaSynthLogging(false, false, false);

/** A single MIDI note event */
export interface MidiNote {
  note: number;       // MIDI note number 0-127
  velocity: number;   // 0-127
  startTime: number;  // seconds from clip start
  duration: number;   // seconds
  channel: number;    // MIDI channel 0-15
}

/** MIDI clip data (stored instead of audio buffer for MIDI tracks) */
export interface MidiClipData {
  notes: MidiNote[];
  program: number;      // GM instrument number 0-127
  bankMSB: number;      // bank select MSB (usually 0)
  bankLSB: number;      // bank select LSB (usually 0)
  totalDuration: number; // total duration in seconds
}

// Common GM instrument names for UI display
export const GM_INSTRUMENTS: { id: number; name: string; category: string }[] = [
  // Piano
  { id: 0, name: 'Acoustic Grand Piano', category: 'Piano' },
  { id: 1, name: 'Bright Acoustic Piano', category: 'Piano' },
  { id: 4, name: 'Electric Piano 1', category: 'Piano' },
  { id: 5, name: 'Electric Piano 2', category: 'Piano' },
  { id: 6, name: 'Harpsichord', category: 'Piano' },
  { id: 7, name: 'Clavinet', category: 'Piano' },
  // Chromatic Percussion
  { id: 8, name: 'Celesta', category: 'Chromatic Perc' },
  { id: 9, name: 'Glockenspiel', category: 'Chromatic Perc' },
  { id: 10, name: 'Music Box', category: 'Chromatic Perc' },
  { id: 11, name: 'Vibraphone', category: 'Chromatic Perc' },
  { id: 12, name: 'Marimba', category: 'Chromatic Perc' },
  { id: 13, name: 'Xylophone', category: 'Chromatic Perc' },
  { id: 14, name: 'Tubular Bells', category: 'Chromatic Perc' },
  // Organ
  { id: 16, name: 'Drawbar Organ', category: 'Organ' },
  { id: 19, name: 'Church Organ', category: 'Organ' },
  // Guitar
  { id: 24, name: 'Acoustic Guitar (nylon)', category: 'Guitar' },
  { id: 25, name: 'Acoustic Guitar (steel)', category: 'Guitar' },
  { id: 26, name: 'Electric Guitar (jazz)', category: 'Guitar' },
  { id: 27, name: 'Electric Guitar (clean)', category: 'Guitar' },
  // Bass
  { id: 32, name: 'Acoustic Bass', category: 'Bass' },
  { id: 33, name: 'Electric Bass (finger)', category: 'Bass' },
  { id: 38, name: 'Synth Bass 1', category: 'Bass' },
  { id: 39, name: 'Synth Bass 2', category: 'Bass' },
  // Strings
  { id: 40, name: 'Violin', category: 'Strings' },
  { id: 41, name: 'Viola', category: 'Strings' },
  { id: 42, name: 'Cello', category: 'Strings' },
  { id: 43, name: 'Contrabass', category: 'Strings' },
  { id: 48, name: 'String Ensemble 1', category: 'Strings' },
  { id: 49, name: 'String Ensemble 2', category: 'Strings' },
  { id: 50, name: 'Synth Strings 1', category: 'Strings' },
  // Choir/Voice
  { id: 52, name: 'Choir Aahs', category: 'Choir' },
  { id: 53, name: 'Voice Oohs', category: 'Choir' },
  { id: 54, name: 'Synth Choir', category: 'Choir' },
  // Brass
  { id: 56, name: 'Trumpet', category: 'Brass' },
  { id: 57, name: 'Trombone', category: 'Brass' },
  { id: 60, name: 'French Horn', category: 'Brass' },
  { id: 61, name: 'Brass Section', category: 'Brass' },
  // Reed/Woodwind
  { id: 64, name: 'Soprano Sax', category: 'Reed' },
  { id: 65, name: 'Alto Sax', category: 'Reed' },
  { id: 68, name: 'Oboe', category: 'Reed' },
  { id: 71, name: 'Clarinet', category: 'Reed' },
  { id: 73, name: 'Flute', category: 'Pipe' },
  { id: 75, name: 'Pan Flute', category: 'Pipe' },
  { id: 76, name: 'Blown Bottle', category: 'Pipe' },
  { id: 77, name: 'Shakuhachi', category: 'Pipe' },
  { id: 79, name: 'Ocarina', category: 'Pipe' },
  // Synth Lead
  { id: 80, name: 'Lead 1 (square)', category: 'Synth Lead' },
  { id: 81, name: 'Lead 2 (sawtooth)', category: 'Synth Lead' },
  { id: 82, name: 'Lead 3 (calliope)', category: 'Synth Lead' },
  // Synth Pad
  { id: 88, name: 'Pad 1 (new age)', category: 'Synth Pad' },
  { id: 89, name: 'Pad 2 (warm)', category: 'Synth Pad' },
  { id: 90, name: 'Pad 3 (polysynth)', category: 'Synth Pad' },
  { id: 91, name: 'Pad 4 (choir)', category: 'Synth Pad' },
  { id: 92, name: 'Pad 5 (bowed)', category: 'Synth Pad' },
  { id: 93, name: 'Pad 6 (metallic)', category: 'Synth Pad' },
  { id: 94, name: 'Pad 7 (halo)', category: 'Synth Pad' },
  { id: 95, name: 'Pad 8 (sweep)', category: 'Synth Pad' },
  // Synth Effects
  { id: 96, name: 'FX 1 (rain)', category: 'Synth FX' },
  { id: 98, name: 'FX 3 (crystal)', category: 'Synth FX' },
  { id: 100, name: 'FX 5 (brightness)', category: 'Synth FX' },
  // Ethnic
  { id: 104, name: 'Sitar', category: 'Ethnic' },
  { id: 105, name: 'Banjo', category: 'Ethnic' },
  { id: 107, name: 'Koto', category: 'Ethnic' },
  { id: 108, name: 'Kalimba', category: 'Ethnic' },
  // Percussive
  { id: 112, name: 'Tinkle Bell', category: 'Percussive' },
  { id: 114, name: 'Steel Drums', category: 'Percussive' },
  { id: 115, name: 'Woodblock', category: 'Percussive' },
  { id: 116, name: 'Taiko Drum', category: 'Percussive' },
  // Drum Kits (virtual IDs: 128 + GM program on bank 128, channel 9)
  { id: 128, name: 'Standard Kit', category: 'Drum Kit' },
  { id: 136, name: 'Room Kit', category: 'Drum Kit' },
  { id: 144, name: 'Power Kit', category: 'Drum Kit' },
  { id: 152, name: 'Electronic Kit', category: 'Drum Kit' },
  { id: 153, name: 'TR-808 Kit', category: 'Drum Kit' },
  { id: 160, name: 'Jazz Kit', category: 'Drum Kit' },
  { id: 168, name: 'Brush Kit', category: 'Drum Kit' },
  { id: 176, name: 'Orchestra Kit', category: 'Drum Kit' },
  { id: 184, name: 'SFX Kit', category: 'Drum Kit' },
  // Sound Effects
  { id: 120, name: 'Guitar Fret Noise', category: 'Sound FX' },
  { id: 121, name: 'Breath Noise', category: 'Sound FX' },
  { id: 122, name: 'Seashore', category: 'Sound FX' },
  { id: 123, name: 'Bird Tweet', category: 'Sound FX' },
  { id: 125, name: 'Helicopter', category: 'Sound FX' },
  { id: 126, name: 'Applause', category: 'Sound FX' },
];

/** Check if a virtual program ID represents a drum kit (>= 128) */
export function isDrumKitProgram(program: number): boolean {
  return program >= 128;
}

/** Decode a virtual drum kit program ID to actual GM program (bank 128) */
export function decodeDrumKitProgram(virtualProgram: number): number {
  return virtualProgram - 128;
}

/** Encode a GM drum kit program (bank 128) to virtual program ID */
export function encodeDrumKitProgram(gmProgram: number): number {
  return gmProgram + 128;
}

// GeneralUser GS SoundFont (~30MB) - served from same origin (public/ dir)
// No CORS issues since it's the same domain as the app
const SOUNDFONT_URL = '/GeneralUser_GS.sf2';

let synthInstance: SpessaSynthProcessor | null = null;
let soundBankLoaded = false;
let loadingPromise: Promise<void> | null = null;

/** Initialize the MIDI synthesizer and load the SoundFont */
export async function initMidiEngine(): Promise<SpessaSynthProcessor> {
  if (synthInstance && soundBankLoaded) return synthInstance;

  if (loadingPromise) {
    await loadingPromise;
    return synthInstance!;
  }

  loadingPromise = (async () => {
    const synth = new SpessaSynthProcessor(44100);
    await synth.processorInitialized;

    try {
      console.log('[MidiEngine] Loading SoundFont...');
      const response = await fetch(SOUNDFONT_URL);
      if (!response.ok) throw new Error(`SoundFont fetch failed: ${response.status}`);
      const sfData = await response.arrayBuffer();
      const soundBank = SoundBankLoader.fromArrayBuffer(sfData);
      synth.soundBankManager.addSoundBank(soundBank, 'gm');
      console.log('[MidiEngine] SoundFont loaded successfully');
    } catch (err) {
      console.warn('[MidiEngine] SoundFont load failed, synth will use basic sounds:', err);
    }
    soundBankLoaded = true;

    synthInstance = synth;
  })();

  await loadingPromise;
  return synthInstance!;
}

/** Get the current synth instance (must call initMidiEngine first) */
export function getMidiSynth(): SpessaSynthProcessor | null {
  return synthInstance;
}

/** Render MIDI note data to an AudioBuffer for use in the timeline */
export async function renderMidiToAudioBuffer(
  midiData: MidiClipData,
  sampleRate: number = 44100
): Promise<AudioBuffer> {
  const synth = await initMidiEngine();

  // Reset all controllers before rendering
  synth.resetAllControllers();

  // Set bank and instrument program
  const channel = midiData.notes[0]?.channel ?? 0;
  if (midiData.bankMSB) {
    synth.controllerChange(channel, 0 as any, midiData.bankMSB); // CC0 = Bank Select MSB
  }
  synth.programChange(channel, midiData.program);

  const totalSamples = Math.ceil(midiData.totalDuration * sampleRate) + sampleRate; // +1s tail for release
  const blockSize = 128;
  const numBlocks = Math.ceil(totalSamples / blockSize);
  const outputL = new Float32Array(numBlocks * blockSize);
  const outputR = new Float32Array(numBlocks * blockSize);
  const reverbL = new Float32Array(blockSize);
  const reverbR = new Float32Array(blockSize);
  const chorusL = new Float32Array(blockSize);
  const chorusR = new Float32Array(blockSize);
  const blockL = new Float32Array(blockSize);
  const blockR = new Float32Array(blockSize);

  // Sort notes by start time
  const sortedNotes = [...midiData.notes].sort((a, b) => a.startTime - b.startTime);

  // Schedule noteOn/noteOff events by sample position
  interface NoteEvent {
    samplePos: number;
    type: 'on' | 'off';
    note: number;
    velocity: number;
    channel: number;
  }

  const events: NoteEvent[] = [];
  for (const note of sortedNotes) {
    events.push({
      samplePos: Math.floor(note.startTime * sampleRate),
      type: 'on',
      note: note.note,
      velocity: note.velocity,
      channel: note.channel,
    });
    events.push({
      samplePos: Math.floor((note.startTime + note.duration) * sampleRate),
      type: 'off',
      note: note.note,
      velocity: 0,
      channel: note.channel,
    });
  }
  events.sort((a, b) => a.samplePos - b.samplePos);

  let eventIdx = 0;

  for (let block = 0; block < numBlocks; block++) {
    const blockStart = block * blockSize;
    const blockEnd = blockStart + blockSize;

    // Process MIDI events that fall within this block
    while (eventIdx < events.length && events[eventIdx].samplePos < blockEnd) {
      const evt = events[eventIdx];
      if (evt.type === 'on') {
        synth.noteOn(evt.channel, evt.note, evt.velocity);
      } else {
        synth.noteOff(evt.channel, evt.note);
      }
      eventIdx++;
    }

    // Render one block
    blockL.fill(0);
    blockR.fill(0);
    reverbL.fill(0);
    reverbR.fill(0);
    chorusL.fill(0);
    chorusR.fill(0);

    synth.renderAudio([blockL, blockR], [reverbL, reverbR], [chorusL, chorusR]);

    // Mix reverb and chorus into output
    for (let i = 0; i < blockSize; i++) {
      outputL[blockStart + i] = blockL[i] + reverbL[i] * 0.3 + chorusL[i] * 0.2;
      outputR[blockStart + i] = blockR[i] + reverbR[i] * 0.3 + chorusR[i] * 0.2;
    }
  }

  // Stop all notes
  synth.stopAllChannels(true);

  // Create AudioBuffer
  const ctx = new OfflineAudioContext(2, outputL.length, sampleRate);
  const audioBuffer = ctx.createBuffer(2, outputL.length, sampleRate);
  audioBuffer.getChannelData(0).set(outputL);
  audioBuffer.getChannelData(1).set(outputR);

  return audioBuffer;
}

/** Clean up the MIDI engine */
export function destroyMidiEngine(): void {
  if (synthInstance) {
    synthInstance.stopAllChannels(true);
    synthInstance.destroySynthProcessor();
    synthInstance = null;
    soundBankLoaded = false;
    loadingPromise = null;
  }
}

/**
 * Convert MidiClipData to a standard MIDI file (Type 0)
 * Returns an ArrayBuffer containing the .mid file data
 */
export function midiClipToMidiFile(midiData: MidiClipData, bpm: number = 120): ArrayBuffer {
  const ticksPerBeat = 480;
  const microsecondsPerBeat = Math.round(60000000 / bpm);

  // Helper to write variable-length quantity
  function writeVLQ(value: number): number[] {
    if (value === 0) return [0];
    const bytes: number[] = [];
    while (value > 0) {
      bytes.unshift(value & 0x7f);
      value >>= 7;
    }
    // Set continuation bits
    for (let i = 0; i < bytes.length - 1; i++) {
      bytes[i] |= 0x80;
    }
    return bytes;
  }

  // Convert time in seconds to MIDI ticks
  function secondsToTicks(seconds: number): number {
    const beats = seconds * (bpm / 60);
    return Math.round(beats * ticksPerBeat);
  }

  // Build track events
  interface MidiEvent {
    tick: number;
    data: number[];
  }

  const events: MidiEvent[] = [];

  // Tempo event at tick 0
  events.push({
    tick: 0,
    data: [0xff, 0x51, 0x03,
      (microsecondsPerBeat >> 16) & 0xff,
      (microsecondsPerBeat >> 8) & 0xff,
      microsecondsPerBeat & 0xff
    ]
  });

  // Bank select + Program change at tick 0
  const midiChannel = midiData.notes[0]?.channel ?? 0;
  if (midiData.bankMSB) {
    events.push({
      tick: 0,
      data: [0xb0 | midiChannel, 0x00, midiData.bankMSB] // CC0 = Bank Select MSB
    });
  }
  events.push({
    tick: 0,
    data: [0xc0 | midiChannel, midiData.program]
  });

  // Note events
  for (const note of midiData.notes) {
    const channel = note.channel & 0x0f;
    const startTick = secondsToTicks(note.startTime);
    const endTick = secondsToTicks(note.startTime + note.duration);

    // Note On
    events.push({
      tick: startTick,
      data: [0x90 | channel, note.note, note.velocity]
    });

    // Note Off
    events.push({
      tick: endTick,
      data: [0x80 | channel, note.note, 0]
    });
  }

  // End of track
  const lastTick = secondsToTicks(midiData.totalDuration);
  events.push({
    tick: lastTick,
    data: [0xff, 0x2f, 0x00]
  });

  // Sort by tick, then note-off before note-on at same tick
  events.sort((a, b) => {
    if (a.tick !== b.tick) return a.tick - b.tick;
    // Note off (0x8x) before note on (0x9x)
    const aIsNoteOff = (a.data[0] & 0xf0) === 0x80;
    const bIsNoteOff = (b.data[0] & 0xf0) === 0x80;
    if (aIsNoteOff && !bIsNoteOff) return -1;
    if (!aIsNoteOff && bIsNoteOff) return 1;
    return 0;
  });

  // Build track data with delta times
  const trackData: number[] = [];
  let prevTick = 0;
  for (const event of events) {
    const delta = event.tick - prevTick;
    trackData.push(...writeVLQ(delta), ...event.data);
    prevTick = event.tick;
  }

  // Build file
  const headerChunk = [
    0x4d, 0x54, 0x68, 0x64, // "MThd"
    0x00, 0x00, 0x00, 0x06, // chunk length = 6
    0x00, 0x00,             // format = 0 (single track)
    0x00, 0x01,             // number of tracks = 1
    (ticksPerBeat >> 8) & 0xff, ticksPerBeat & 0xff // ticks per beat
  ];

  const trackLength = trackData.length;
  const trackChunk = [
    0x4d, 0x54, 0x72, 0x6b, // "MTrk"
    (trackLength >> 24) & 0xff,
    (trackLength >> 16) & 0xff,
    (trackLength >> 8) & 0xff,
    trackLength & 0xff,
    ...trackData
  ];

  const fileData = new Uint8Array([...headerChunk, ...trackChunk]);
  return fileData.buffer;
}
