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

const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

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

  private get supported(): boolean {
    return typeof RTCPeerConnection !== 'undefined';
  }

  start(): void {
    if (this.started || !this.supported) return;
    this.started = true;
    this.unsub = studioRealtime.subscribe((msg) => this.onMessage(msg));
  }

  stop(): void {
    this.unsub?.();
    this.unsub = null;
    for (const id of [...this.peers.keys()]) this.removePeer(id);
    this.started = false;
  }

  /** Ensure exactly the given peers have connections; drop any others. */
  syncPeers(peerIds: number[]): void {
    if (!this.started) return;
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

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
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

    pc.onconnectionstatechange = () => {
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

    // An offer can arrive before syncPeers created the connection.
    if (msg.kind === 'offer' && !this.peers.has(msg.from)) {
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
