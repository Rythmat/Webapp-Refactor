export type InstrumentType = 'synth' | 'bass' | 'drums' | 'keys' | 'guitar';

export type Note = {
  id: string;
  time: string;
  note: string;
  duration: string;
};

export type MidiClipType = {
  id: string;
  type: 'midi';
  start: number;
  duration: number;
  notes: Note[];
};

export type AudioClipType = {
  id: string;
  type: 'audio';
  start: number;
  duration: number;
  audioUrl: string;
  gainDb?: number; // Non-destructive per-clip gain
  offsetSec?: number; // Non-destructive trim from the start of the source
  fadeInSec?: number; // Smooth fade in
  fadeOutSec?: number; // Smooth fade out
};

export type Clip = MidiClipType | AudioClipType;

export type Track = {
  id: string;
  name: string;
  trackType: 'midi' | 'audio';
  instrument?: InstrumentType; // Only used for MIDI tracks
  volume: number;
  pan: number;
  isMuted: boolean;
  isSoloed: boolean;
  clips: Clip[];
  isArmedForRecording?: boolean;
};

export type Project = {
  id?: string;
  name: string;
  project_data: {
    tracks: Track[];
    bpm: number;
  };
};

export type Message = {
  sender: 'user' | 'ai';
  text: string;
  visualization?: {
    type: 'piano';
    data: {
      name: string;
      notes: (number | number[])[];
    };
  };
};

// Lesson-specific types
export type PianoVisualization = {
  name: string;
  notes: (number | number[])[];
};

export type LessonItem = {
  type: 'title' | 'text' | 'piano' | 'activity';
  value: string;
  visualization?: PianoVisualization;
};

export type SubTopic = {
  id: string;
  title: string;
  description: string;
  content: LessonItem[];
};

export type Topic = {
  id: string;
  title: string;
  description: string;
  subTopics: SubTopic[];
};
