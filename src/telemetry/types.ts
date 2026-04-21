export type TelemetryCategory = 'api' | 'audio' | 'routing' | 'product';

export type TelemetryEventPayload = {
  timestamp?: string;
  category: TelemetryCategory;
  eventName: string;
  success?: boolean | null;
  durationMs?: number | null;
  route?: string | null;
  method?: string | null;
  statusCode?: number | null;
  sessionId?: string | null;
  anonymousId?: string | null;
  lessonId?: string | null;
  activityId?: string | null;
  traceId?: string | null;
  spanId?: string | null;
  attributesJson?: Record<string, unknown> | null;
  errorName?: string | null;
  errorMessage?: string | null;
};

export const ProductEvents = {
  SESSION_STARTED: 'session_started',
  PAGE_VIEWED: 'page_viewed',
  LESSON_STARTED: 'lesson_started',
  ACTIVITY_STARTED: 'activity_started',
  ACTIVITY_COMPLETED: 'activity_completed',
  ACTIVITY_FAILED: 'activity_failed',
  LESSON_COMPLETED: 'lesson_completed',
  PAYWALL_VIEWED: 'paywall_viewed',
  CHECKOUT_STARTED: 'checkout_started',
  SUBSCRIPTION_ACTIVATED: 'subscription_activated',
} as const;

export const AudioEvents = {
  KEYBOARD_INPUT_RECEIVED: 'keyboard_input_received',
  MIDI_NOTE_ON_RECEIVED: 'midi_note_on_received',
  MIDI_NOTE_OFF_RECEIVED: 'midi_note_off_received',
  AUDIO_TRIGGER_REQUESTED: 'audio_trigger_requested',
  AUDIO_TRIGGER_STARTED: 'audio_trigger_started',
  AUDIO_TRIGGER_FAILED: 'audio_trigger_failed',
  AUDIO_RELEASE_REQUESTED: 'audio_release_requested',
  AUDIO_RELEASE_FAILED: 'audio_release_failed',
} as const;

export const RoutingEvents = {
  PAGE_NAVIGATION: 'page_navigation',
} as const;

export const ApiEvents = {
  API_REQUEST: 'api_request',
} as const;
