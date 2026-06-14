// ── StudioRtcManager ────────────────────────────────────────────────────────
// A small WebRTC audio mesh for collaborative live monitoring. Each peer gets
// one RTCPeerConnection carrying this user's "live monitor" stream (mic /
// instrument FX, captured by AudioEngine.getMonitorStream). Incoming peer audio
// is played into the local master bus through a per-peer gain node, so the
// listen/mute decision can silence a peer without renegotiating.
//
// Signaling rides the studioRealtime bus (`studio:rtc` messages). Glare is
// avoided deterministically: of any two peers, the one with the lower awareness
// clientID is the offerer.

import { audioEngine } from '@/daw/audio/AudioEngine';
import { studioRealtime, type StudioMessage } from './studioRealtime';
import { FALLBACK_ICE_SERVERS, fetchTurnIceServers } from './turnCredentials';

interface PeerEntry {
  pc: RTCPeerConnection;
  gain: GainNode;
  analyser: AnalyserNode;
  levelBuf: Float32Array;
  audioEl: HTMLAudioElement | null;
  source: MediaStreamAudioSourceNode | null;
  /** ICE candidates received before the remote description was applied. */
  pendingCandidates: RTCIceCandidateInit[];
  remoteSet: boolean;
}

export class StudioRtcManager {
  private peers = new Map<number, PeerEntry>();
  private unsub: (() => void) | null = null;
  private started = false;

  // ICE config. Starts STUN-only and is upgraded to Cloudflare TURN once the
  // credential fetch resolves. Peer creation is deferred until then so the first
  // connection already has TURN available (see loadIceServers / syncPeers).
  private iceServers: RTCIceServer[] = FALLBACK_ICE_SERVERS;
  private iceLoad: Promise<void> | null = null;
  private iceReady = false;
  /** Latest desired peer set requested before ICE config finished loading. */
  private pendingPeerSync: number[] | null = null;
  /** Periodic audio-flow diagnostics (temporary; pinpoints where audio dies). */
  private statsTimer: ReturnType<typeof setInterval> | null = null;

  /** Reads the current auth token lazily so creds use a fresh token at start. */
  constructor(private getToken: () => string | null) {}

  private get supported(): boolean {
    return typeof RTCPeerConnection !== 'undefined';
  }

  start(): void {
    if (this.started || !this.supported) return;
    this.started = true;
    this.unsub = studioRealtime.subscribe((msg) => this.onMessage(msg));
    this.iceLoad = this.loadIceServers();
    this.statsTimer = setInterval(() => void this.pollAudioFlow(), 5000);
  }

  stop(): void {
    this.unsub?.();
    this.unsub = null;
    if (this.statsTimer !== null) {
      clearInterval(this.statsTimer);
      this.statsTimer = null;
    }
    for (const id of [...this.peers.keys()]) this.removePeer(id);
    this.started = false;
    this.pendingPeerSync = null;
  }

  /** Fetch TURN credentials, then flush any peer sync that arrived meanwhile. */
  private async loadIceServers(): Promise<void> {
    try {
      const servers = await fetchTurnIceServers(this.getToken());
      if (servers.length) this.iceServers = servers;
      const hasTurn = servers.some((s) => {
        const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
        return urls.some(
          (u) => u.startsWith('turn:') || u.startsWith('turns:'),
        );
      });
      console.log(
        `[StudioRtc] ICE config ready (${hasTurn ? 'TURN + STUN' : 'STUN only'})`,
      );
    } finally {
      this.iceReady = true;
      if (this.started && this.pendingPeerSync) {
        const ids = this.pendingPeerSync;
        this.pendingPeerSync = null;
        this.syncPeers(ids);
      }
    }
  }

  /** Ensure exactly the given peers have connections; drop any others. */
  syncPeers(peerIds: number[]): void {
    if (!this.started) return;
    // Hold off creating peers until we know whether TURN is available, so we
    // don't build the first (often only) connection with STUN-only ICE.
    if (!this.iceReady) {
      this.pendingPeerSync = peerIds;
      return;
    }
    const wanted = new Set(peerIds);
    for (const id of [...this.peers.keys()]) {
      if (!wanted.has(id)) this.removePeer(id);
    }
    for (const id of peerIds) {
      if (!this.peers.has(id)) this.addPeer(id);
    }
  }

  /** Set a peer's playback gain (0 = silent). Used to honour mute/listen. */
  setPeerGain(peerId: number, value: number): void {
    const entry = this.peers.get(peerId);
    if (entry) entry.gain.gain.value = value;
  }

  /** Current peer audio level (0..1 RMS) for the pulse indicator. */
  getPeerLevel(peerId: number): number {
    const entry = this.peers.get(peerId);
    if (!entry || !entry.source) return 0;
    entry.analyser.getFloatTimeDomainData(
      entry.levelBuf as Float32Array<ArrayBuffer>,
    );
    let sum = 0;
    for (let i = 0; i < entry.levelBuf.length; i++) {
      sum += entry.levelBuf[i] * entry.levelBuf[i];
    }
    return Math.min(1, Math.sqrt(sum / entry.levelBuf.length) * 4);
  }

  // ── Internals ────────────────────────────────────────────────────────────

  private addPeer(peerId: number): void {
    if (!audioEngine.getIsInitialized()) return;
    const ctx = audioEngine.getContext();
    const master = audioEngine.getMasterGain();
    if (!ctx || !master) return;

    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    const gain = ctx.createGain();
    gain.gain.value = 1;
    gain.connect(master);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.3;

    const entry: PeerEntry = {
      pc,
      gain,
      analyser,
      levelBuf: new Float32Array(analyser.fftSize),
      audioEl: null,
      source: null,
      pendingCandidates: [],
      remoteSet: false,
    };
    this.peers.set(peerId, entry);

    // Send our live monitor stream to the peer.
    const stream = audioEngine.getMonitorStream();
    if (stream) {
      for (const track of stream.getAudioTracks()) pc.addTrack(track, stream);
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        studioRealtime.send({
          type: 'studio:rtc',
          kind: 'ice',
          to: peerId,
          payload: e.candidate.toJSON(),
        });
      }
    };

    pc.ontrack = (e) => this.attachRemoteStream(peerId, e);

    pc.oniceconnectionstatechange = () => {
      console.log(`[StudioRtc] peer ${peerId} ICE → ${pc.iceConnectionState}`);
    };

    pc.onconnectionstatechange = () => {
      console.log(
        `[StudioRtc] peer ${peerId} connection → ${pc.connectionState}`,
      );
      if (pc.connectionState === 'connected') {
        // Report whether the live path is a direct hole-punch or a TURN relay —
        // the single most useful signal for diagnosing "no live audio".
        void this.logSelectedCandidate(peerId, pc);
      }
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        // Leave cleanup to syncPeers / awareness; just stop audio on hard fail.
        if (pc.connectionState === 'failed') this.teardownAudio(entry);
      }
    };

    // The lower clientID initiates; the higher waits for the offer.
    if (studioRealtime.getLocalClientId() < peerId) {
      void this.makeOffer(peerId);
    }
  }

  private async makeOffer(peerId: number): Promise<void> {
    const entry = this.peers.get(peerId);
    if (!entry) return;
    try {
      const offer = await entry.pc.createOffer();
      await entry.pc.setLocalDescription(offer);
      studioRealtime.send({
        type: 'studio:rtc',
        kind: 'offer',
        to: peerId,
        payload: offer,
      });
    } catch (err) {
      console.warn('[StudioRtc] makeOffer failed', err);
    }
  }

  private async onMessage(msg: StudioMessage): Promise<void> {
    if (msg.type !== 'studio:rtc') return;
    if (msg.to !== studioRealtime.getLocalClientId()) return;

    // An offer can arrive before syncPeers created the connection. Wait for the
    // ICE config (TURN) to load first so the answering peer isn't built STUN-only.
    if (msg.kind === 'offer' && !this.peers.has(msg.from)) {
      if (!this.iceReady && this.iceLoad) await this.iceLoad;
      if (!this.started) return;
      this.addPeer(msg.from);
    }
    const entry = this.peers.get(msg.from);
    if (!entry) return;
    const pc = entry.pc;

    try {
      if (msg.kind === 'offer') {
        await pc.setRemoteDescription(
          new RTCSessionDescription(msg.payload as RTCSessionDescriptionInit),
        );
        entry.remoteSet = true;
        await this.flushCandidates(entry);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        studioRealtime.send({
          type: 'studio:rtc',
          kind: 'answer',
          to: msg.from,
          payload: answer,
        });
      } else if (msg.kind === 'answer') {
        await pc.setRemoteDescription(
          new RTCSessionDescription(msg.payload as RTCSessionDescriptionInit),
        );
        entry.remoteSet = true;
        await this.flushCandidates(entry);
      } else if (msg.kind === 'ice') {
        const candidate = msg.payload as RTCIceCandidateInit;
        if (entry.remoteSet) {
          await pc.addIceCandidate(candidate);
        } else {
          entry.pendingCandidates.push(candidate);
        }
      }
    } catch (err) {
      console.warn('[StudioRtc] signaling error', err);
    }
  }

  private async flushCandidates(entry: PeerEntry): Promise<void> {
    for (const c of entry.pendingCandidates) {
      try {
        await entry.pc.addIceCandidate(c);
      } catch {
        /* ignore late/invalid candidate */
      }
    }
    entry.pendingCandidates = [];
  }

  private attachRemoteStream(peerId: number, e: RTCTrackEvent): void {
    const entry = this.peers.get(peerId);
    if (!entry) return;
    const ctx = audioEngine.getContext();
    const stream = e.streams[0] ?? new MediaStream([e.track]);

    // A muted <audio> element keeps the MediaStream pulling in browsers that
    // won't run a MediaStreamSource otherwise; the audible path is Web Audio.
    const el = new Audio();
    el.srcObject = stream;
    el.muted = true;
    void el.play().catch(() => {});
    entry.audioEl = el;

    entry.source = ctx.createMediaStreamSource(stream);
    entry.source.connect(entry.gain);
    entry.source.connect(entry.analyser);
  }

  /**
   * Temporary diagnostic: every 5s, for each connected peer, log where audio is
   * (or isn't) flowing. Reads four numbers that together locate any break:
   *   outLevel — level of OUR audio entering the outgoing track (the monitor
   *              bus). ~0 ⇒ our capture/monitor-tap is dead (send-graph bug).
   *   sent     — bytes we've sent on the audio track. Not rising ⇒ encode/send.
   *   inLevel  — level of the audio we're RECEIVING. ~0 with sent>0 on their
   *              side ⇒ they're sending silence; >0 here but no sound ⇒ our
   *              local playback graph is the problem.
   *   recv     — bytes received. Not rising ⇒ nothing arriving (transport).
   */
  private async pollAudioFlow(): Promise<void> {
    const fmt = (n: number | undefined) =>
      typeof n === 'number' ? n.toFixed(4) : '—';
    const kb = (n: number) => `${Math.round(n / 1024)}kB`;
    for (const [peerId, entry] of this.peers) {
      if (entry.pc.connectionState !== 'connected') continue;
      try {
        const stats = await entry.pc.getStats();
        let sent = 0;
        let recv = 0;
        let outLevel: number | undefined;
        let inLevel: number | undefined;
        stats.forEach((r) => {
          const s = r as unknown as {
            type: string;
            kind?: string;
            bytesSent?: number;
            bytesReceived?: number;
            audioLevel?: number;
          };
          if (s.type === 'outbound-rtp' && s.kind === 'audio') {
            sent = s.bytesSent ?? 0;
          } else if (s.type === 'inbound-rtp' && s.kind === 'audio') {
            recv = s.bytesReceived ?? 0;
            inLevel = s.audioLevel;
          } else if (s.type === 'media-source' && s.kind === 'audio') {
            outLevel = s.audioLevel;
          }
        });
        console.log(
          `[StudioRtc] peer ${peerId} audio: outLevel=${fmt(outLevel)} ` +
            `sent=${kb(sent)} | inLevel=${fmt(inLevel)} recv=${kb(recv)}`,
        );
      } catch {
        /* stats are best-effort diagnostics */
      }
    }
  }

  /** Log whether the connected media path is direct or routed through TURN. */
  private async logSelectedCandidate(
    peerId: number,
    pc: RTCPeerConnection,
  ): Promise<void> {
    try {
      const stats = await pc.getStats();
      let pair: RTCIceCandidatePairStats | undefined;
      stats.forEach((report) => {
        if (
          report.type === 'candidate-pair' &&
          (report as RTCIceCandidatePairStats & { selected?: boolean })
            .selected === true
        ) {
          pair = report as RTCIceCandidatePairStats;
        }
      });
      // Some browsers don't flag `selected`; fall back to the transport's pointer.
      if (!pair) {
        stats.forEach((report) => {
          if (report.type === 'transport') {
            const id = (report as { selectedCandidatePairId?: string })
              .selectedCandidatePairId;
            if (id)
              pair = stats.get(id) as RTCIceCandidatePairStats | undefined;
          }
        });
      }
      if (!pair) return;
      const local = stats.get(pair.localCandidateId ?? '') as
        | { candidateType?: string }
        | undefined;
      const remote = stats.get(pair.remoteCandidateId ?? '') as
        | { candidateType?: string }
        | undefined;
      const relayed =
        local?.candidateType === 'relay' || remote?.candidateType === 'relay';
      console.log(
        `[StudioRtc] peer ${peerId} media path: local=${local?.candidateType} ` +
          `remote=${remote?.candidateType} → ${relayed ? 'TURN relay' : 'direct P2P'}`,
      );
    } catch {
      /* stats are best-effort diagnostics */
    }
  }

  private teardownAudio(entry: PeerEntry): void {
    try {
      entry.source?.disconnect();
    } catch {
      /* ok */
    }
    entry.source = null;
    if (entry.audioEl) {
      entry.audioEl.srcObject = null;
      entry.audioEl = null;
    }
  }

  private removePeer(peerId: number): void {
    const entry = this.peers.get(peerId);
    if (!entry) return;
    this.teardownAudio(entry);
    try {
      entry.gain.disconnect();
    } catch {
      /* ok */
    }
    try {
      entry.pc.close();
    } catch {
      /* ok */
    }
    this.peers.delete(peerId);
  }
}
