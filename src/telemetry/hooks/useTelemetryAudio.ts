import { Env } from '@/constants/env';
import { telemetryClient } from '../client';
import { AudioEvents } from '../types';

function isAudioTelemetryEnabled(): boolean {
  const value = Env.get('VITE_TELEMETRY_AUDIO_ENABLED', { nullable: true });
  return value !== 'false';
}

export function trackKeyboardInput(note: string, route?: string): void {
  try {
    if (!isAudioTelemetryEnabled()) return;

    telemetryClient.track({
      category: 'audio',
      eventName: AudioEvents.KEYBOARD_INPUT_RECEIVED,
      route: route ?? null,
      attributesJson: { note },
    });
  } catch {
    // Silent failure
  }
}

export function trackAudioTrigger(
  note: string,
  success: boolean,
  latencyMs?: number,
  route?: string,
  lessonId?: string,
  activityId?: string,
): void {
  try {
    if (!isAudioTelemetryEnabled()) return;

    telemetryClient.track({
      category: 'audio',
      eventName: success
        ? AudioEvents.AUDIO_TRIGGER_STARTED
        : AudioEvents.AUDIO_TRIGGER_FAILED,
      success,
      durationMs: latencyMs ?? null,
      route: route ?? null,
      lessonId: lessonId ?? null,
      activityId: activityId ?? null,
      attributesJson: { note },
    });
  } catch {
    // Silent failure
  }
}

export function trackAudioRelease(note: string, success: boolean, route?: string): void {
  try {
    if (!isAudioTelemetryEnabled()) return;

    telemetryClient.track({
      category: 'audio',
      eventName: success
        ? AudioEvents.AUDIO_RELEASE_REQUESTED
        : AudioEvents.AUDIO_RELEASE_FAILED,
      success,
      route: route ?? null,
      attributesJson: { note },
    });
  } catch {
    // Silent failure
  }
}

export function trackMidiNoteOn(note: string, velocity: number, route?: string): void {
  try {
    if (!isAudioTelemetryEnabled()) return;

    telemetryClient.track({
      category: 'audio',
      eventName: AudioEvents.MIDI_NOTE_ON_RECEIVED,
      route: route ?? null,
      attributesJson: { note, velocity },
    });
  } catch {
    // Silent failure
  }
}

export function trackMidiNoteOff(note: string, route?: string): void {
  try {
    if (!isAudioTelemetryEnabled()) return;

    telemetryClient.track({
      category: 'audio',
      eventName: AudioEvents.MIDI_NOTE_OFF_RECEIVED,
      route: route ?? null,
      attributesJson: { note },
    });
  } catch {
    // Silent failure
  }
}
