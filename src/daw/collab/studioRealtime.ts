// ── Studio Realtime Bus ─────────────────────────────────────────────────────
// A tiny module-level singleton that carries EPHEMERAL, real-time messages
// between Studio collaborators over the existing PartyKit WebSocket — live MIDI
// notes and WebRTC signaling. It is deliberately decoupled from React so any
// producer (MIDI input routing) or consumer (audio playback, RTC manager) can
// reach it without prop/context plumbing.
//
// CollabProvider owns the socket: it calls setSender / setLocalClientId on join
// and clears them on leave, and routes incoming `studio:*` messages in via
// dispatch(). When no session is active the sender is null and send() no-ops,
// so callers can fire messages unconditionally.

// ── Message types ──────────────────────────────────────────────────────────

export interface StudioNoteMessage {
  type: 'studio:note';
  action: 'on' | 'off';
  note: number;
  velocity: number;
  /** The sender's track this note is played on (exists locally via doc sync). */
  trackId: string;
  /** Awareness clientID of the sender (filled by send()). */
  from: number;
}

export type RtcSignalKind = 'offer' | 'answer' | 'ice';

export interface StudioRtcMessage {
  type: 'studio:rtc';
  kind: RtcSignalKind;
  from: number;
  /** Target peer's awareness clientID. */
  to: number;
  /** SessionDescription JSON or ICE candidate JSON. */
  payload: unknown;
}

export type StudioMessage = StudioNoteMessage | StudioRtcMessage;

export function isStudioMessage(data: unknown): data is StudioMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as { type?: unknown }).type === 'string' &&
    (data as { type: string }).type.startsWith('studio:')
  );
}

// ── Singleton ────────────────────────────────────────────────────────────

type Sender = (json: string) => void;
type Handler = (msg: StudioMessage) => void;

class StudioRealtime {
  private sender: Sender | null = null;
  private localClientId = 0;
  private peerCount = 0;
  private handlers = new Set<Handler>();

  setSender(sender: Sender | null): void {
    this.sender = sender;
    if (!sender) this.peerCount = 0;
  }

  /** Number of remote collaborators currently in the room (driven by presence). */
  setPeerCount(count: number): void {
    this.peerCount = count;
  }

  setLocalClientId(id: number): void {
    this.localClientId = id;
  }

  getLocalClientId(): number {
    return this.localClientId;
  }

  /** True when a live collaborative session is connected. */
  isActive(): boolean {
    return this.sender !== null;
  }

  /**
   * Whether outgoing live MIDI is worth sending: connected AND at least one
   * remote peer is present to hear it. (We gate on peer presence rather than
   * each peer's mute/listen choice, which is intentionally local & private —
   * so we never leak "who muted whom" just to save messages.)
   */
  shouldBroadcast(): boolean {
    return this.sender !== null && this.peerCount > 0;
  }

  /** Send a message, stamping the local clientID as `from`. No-op when idle. */
  send(
    msg: Omit<StudioNoteMessage, 'from'> | Omit<StudioRtcMessage, 'from'>,
  ): void {
    if (!this.sender) return;
    this.sender(JSON.stringify({ ...msg, from: this.localClientId }));
  }

  /** Route an incoming message to all subscribers (called by CollabProvider). */
  dispatch(msg: StudioMessage): void {
    // Ignore our own echoes (the server shouldn't echo, but guard anyway).
    if (msg.from === this.localClientId) return;
    this.handlers.forEach((h) => h(msg));
  }

  subscribe(handler: Handler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }
}

export const studioRealtime = new StudioRealtime();
