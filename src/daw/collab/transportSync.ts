// ── Transport Sync ───────────────────────────────────────────────────────
// Handles RTT measurement and latency-compensated transport synchronization
// between collaborating clients.

/**
 * RTT (Round-Trip Time) measurement via PartyKit ping/pong.
 * Maintains a rolling average for latency compensation.
 */
export class RttMeasurer {
  private samples: number[] = [];
  // Rolling estimates of (serverClock − localClock) in ms, one per pong.
  private offsets: number[] = [];
  private maxSamples = 10;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private ws: WebSocket | null = null;
  private pendingPings = new Map<number, number>(); // clientTimestamp → sentAt

  /** Current estimated RTT in milliseconds. */
  get rtt(): number {
    if (this.samples.length === 0) return 50; // default estimate
    const sum = this.samples.reduce((a, b) => a + b, 0);
    return sum / this.samples.length;
  }

  /**
   * Estimated offset to add to a local `Date.now()` to get server time.
   * Uses the median sample to stay robust against jittery outliers.
   */
  get clockOffset(): number {
    if (this.offsets.length === 0) return 0;
    const sorted = [...this.offsets].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }

  /** Best estimate of the server's current wall-clock time, in ms. */
  serverNow(): number {
    return Date.now() + this.clockOffset;
  }

  /** Start periodic RTT measurement. */
  start(ws: WebSocket, intervalMs = 5000): void {
    this.ws = ws;
    this.stop(); // clear any existing interval
    this.ping(); // immediate first ping
    this.intervalId = setInterval(() => this.ping(), intervalMs);
  }

  /** Stop measuring. */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.pendingPings.clear();
  }

  /** Send a ping to the server. */
  private ping(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const now = Date.now();
    this.pendingPings.set(now, now);
    this.ws.send(JSON.stringify({ type: 'ping', clientTimestamp: now }));
  }

  /**
   * Process a pong response from the server.
   * @param clientTimestamp - The send time we stamped on the matching ping.
   * @param serverTimestamp - When the server processed it (enables clock sync).
   */
  handlePong(clientTimestamp: number, serverTimestamp?: number): void {
    const sentAt = this.pendingPings.get(clientTimestamp);
    if (sentAt === undefined) return;
    this.pendingPings.delete(clientTimestamp);

    const rtt = Date.now() - sentAt;
    this.samples.push(rtt);
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }

    if (serverTimestamp !== undefined) {
      // The server stamped the pong ~halfRtt after we sent the ping, so
      // serverTimestamp ≈ sentAt + rtt/2 in server time. The difference is
      // the offset between the two clocks.
      const offset = serverTimestamp - (sentAt + rtt / 2);
      this.offsets.push(offset);
      if (this.offsets.length > this.maxSamples) {
        this.offsets.shift();
      }
    }
  }

  /**
   * Calculate the adjusted tick position for a remote play command,
   * compensating for network latency.
   *
   * @param serverTimestamp - When the server processed the command
   * @param tick - The tick position at the time of the command
   * @param bpm - Beats per minute at the time of the command
   * @returns Adjusted tick position accounting for elapsed time
   */
  compensatePlayPosition(
    serverTimestamp: number,
    tick: number,
    bpm: number,
  ): number {
    const halfRtt = this.rtt / 2;
    const now = Date.now();
    const elapsedMs = now - serverTimestamp + halfRtt;
    // Convert elapsed milliseconds to ticks: (ms / 60000) * bpm * ppq
    const elapsedTicks = (elapsedMs / 60000) * bpm * 480;
    return tick + elapsedTicks;
  }

  destroy(): void {
    this.stop();
    this.ws = null;
  }
}
