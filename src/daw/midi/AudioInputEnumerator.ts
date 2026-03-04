// ── Types ──────────────────────────────────────────────────────────────

export interface AudioInputDevice {
  id: string;
  label: string;
  groupId: string;
}

export interface AudioOutputDevice {
  id: string;
  label: string;
  groupId: string;
}

// ── Functions ──────────────────────────────────────────────────────────

/**
 * Enumerate available audio input devices (microphones, audio interfaces).
 *
 * Requests temporary microphone permission so the browser exposes device labels.
 * The permission stream is stopped immediately after enumeration.
 */
export async function getAudioInputs(): Promise<AudioInputDevice[]> {
  try {
    // Check if permission is already granted to avoid creating a temporary
    // stream that could interfere with an active audio input.
    let needsPermission = true;
    if (navigator.permissions) {
      try {
        const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        needsPermission = status.state !== 'granted';
      } catch {
        // permissions.query not supported for microphone in this browser
      }
    }

    if (needsPermission) {
      // Request permission to get device labels (browsers hide them without permission)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop immediately -- we only needed the permission grant
      stream.getTracks().forEach((t) => t.stop());
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((d) => d.kind === 'audioinput')
      .map((d) => ({
        id: d.deviceId,
        label: d.label || `Input ${d.deviceId.slice(0, 8)}`,
        groupId: d.groupId,
      }));
  } catch {
    console.warn('Could not enumerate audio inputs');
    return [];
  }
}

/**
 * Get a live MediaStream from a specific audio input device.
 * The caller is responsible for stopping the stream when done.
 *
 * @param deviceId - The device ID from getAudioInputs()
 */
export async function getAudioStream(deviceId: string): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: { deviceId: { exact: deviceId }, channelCount: { ideal: 32 } },
  });
}

/**
 * Probe the true channel count of an audio input device.
 *
 * Browsers (especially Chrome) often grant only 1–2 channels from getUserMedia
 * regardless of device capability. This function tries multiple strategies:
 * 1. getCapabilities().channelCount.max  (Firefox, future Chrome)
 * 2. Requesting exact channel counts in descending order (32→2) —
 *    if the browser supports the `exact` constraint, the first success
 *    reveals the device's true max.
 * 3. getSettings().channelCount          (granted count, often 1–2)
 * 4. Fallback to 2.
 */
export async function probeDeviceChannelCount(deviceId: string): Promise<number> {
  // Strategy 1 & 3: open a stream and check capabilities / settings
  let capsMax = 0;
  let settingsCount = 0;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: { exact: deviceId },
        channelCount: { ideal: 32 },
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
    const track = stream.getAudioTracks()[0];
    if (track) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const caps = (track as any).getCapabilities?.();
      capsMax = caps?.channelCount?.max ?? 0;
      settingsCount = track.getSettings()?.channelCount ?? 0;

      console.info('[AudioIO] Device probe:', {
        deviceId: deviceId.slice(0, 12) + '…',
        capabilities: caps?.channelCount ?? 'N/A',
        settings: track.getSettings(),
        capsMax,
        settingsCount,
      });
    }
    stream.getTracks().forEach((t) => t.stop());
  } catch (err) {
    console.warn('[AudioIO] Probe stream failed:', err);
  }

  // If capabilities reported a useful max, use it
  if (capsMax > 2) return capsMax;

  // Strategy 2: try exact channel counts in descending order
  const candidates = [32, 16, 8, 4];
  for (const n of candidates) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: deviceId },
          channelCount: { exact: n },
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      // Success — device supports at least n channels
      const granted = stream.getAudioTracks()[0]?.getSettings()?.channelCount ?? n;
      stream.getTracks().forEach((t) => t.stop());
      console.info(`[AudioIO] Exact probe: requested ${n}, granted ${granted}`);
      return Math.max(granted, n);
    } catch {
      // OverconstrainedError — device doesn't support this many channels
      continue;
    }
  }

  // Fall back to whatever we got from settings, or 2
  return Math.max(settingsCount, 2);
}

/**
 * Enumerate available audio output devices (speakers, headphones, interfaces).
 * Output labels are available once any audio permission has been granted.
 */
export async function getAudioOutputs(): Promise<AudioOutputDevice[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((d) => d.kind === 'audiooutput')
      .map((d) => ({
        id: d.deviceId,
        label: d.label || `Output ${d.deviceId.slice(0, 8)}`,
        groupId: d.groupId,
      }));
  } catch {
    console.warn('Could not enumerate audio outputs');
    return [];
  }
}
