import { Cable, Mic } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/components/utilities';
import {
  getAudioInputs,
  probeDeviceChannelCount,
  type AudioInputDevice,
} from '@/daw/midi/AudioInputEnumerator';
import { useStore, type Track } from '@/daw/store';
import type { AudioInputChannel } from '@/daw/store/tracksSlice';
import {
  MenuItem,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
} from '@/daw/ui/Menu';
import { TYPE_CLASS } from '@/daw/ui/styles';

// ── A track's input: a submenu of its settings menu (2026-10-22) ─────────
//
// A MIDI track plays what one MIDI device sends, or every device's (All
// Devices, the default): the track's midiInputId, which this person keeps
// for themself on this device (a device's id means nothing on another
// computer). Notes from a device the track isn't listening to never reach
// it, live or in a take (midi/liveTarget.ts); the computer keyboard and the
// on-screen keys reach every track.
//
// An audio track records from the audio input the Studio uses (one device
// for every track, as the dock's Input shows it) and its own channel of it.

const ALL_DEVICES = '';

const CHANNELS: { value: string; label: string; config: AudioInputChannel }[] =
  [
    { value: 'mono:0', label: 'Input 1', config: { mode: 'mono', channel: 0 } },
    { value: 'mono:1', label: 'Input 2', config: { mode: 'mono', channel: 1 } },
    {
      value: 'stereo:0:1',
      label: 'Inputs 1–2',
      config: { mode: 'stereo', left: 0, right: 1 },
    },
  ];

const channelValue = (c: AudioInputChannel | null) =>
  !c
    ? 'mono:0'
    : c.mode === 'mono'
      ? `mono:${c.channel}`
      : `stereo:${c.left}:${c.right}`;

/** Words for the MIDI status when there is no device to pick. */
const MIDI_NOTE: Record<string, string> = {
  idle: 'Looking for MIDI devices…',
  'no-device': 'No MIDI device connected',
  unsupported: 'This browser has no MIDI',
  denied: 'MIDI was blocked for this page',
};

/**
 * The track's input, as a submenu of its settings menu (TrackMenu): its
 * MIDI device, or its audio input and channel, with the current one beside
 * the name. It was a ▾ of its own at the end of the header until the owner
 * folded it into the menu (2026-10-22).
 */
export function TrackInputSub({
  track,
  disabled = false,
}: {
  track: Track;
  disabled?: boolean;
}) {
  const midi = track.type === 'midi';
  const current = useStore((s) =>
    midi ? midiInputName(s, track) : channelLabel(track),
  );
  return (
    <MenuSub>
      <MenuSubTrigger
        icon={midi ? <Cable /> : <Mic />}
        disabled={disabled}
        data-testid="track-menu-input"
      >
        <span className="flex-1">{midi ? 'MIDI input' : 'Audio input'}</span>
        <span
          className={cn(
            TYPE_CLASS.label,
            'ml-4 max-w-24 truncate text-daw-text-3',
          )}
        >
          {current}
        </span>
      </MenuSubTrigger>
      <MenuSubContent
        data-ds="v2"
        data-testid="track-input-menu"
        className="w-64"
        onClick={(e) => e.stopPropagation()}
      >
        {midi ? <MidiInputs track={track} /> : <AudioInputs track={track} />}
      </MenuSubContent>
    </MenuSub>
  );
}

/** The MIDI device a track listens to, in words. */
function midiInputName(
  s: { inputs: { id: string; name: string }[] },
  track: Track,
): string {
  if (!track.midiInputId) return 'All Devices';
  return (
    s.inputs.find((i) => i.id === track.midiInputId)?.name ??
    'Disconnected device'
  );
}

/** The audio channel a track records from, in words. */
function channelLabel(track: Track): string {
  const value = channelValue(track.audioInputChannel);
  return CHANNELS.find((c) => c.value === value)?.label ?? 'Input 1';
}

function MidiInputs({ track }: { track: Track }) {
  const inputs = useStore((s) => s.inputs);
  const status = useStore((s) => s.midiStatus);
  // A device that went away still shows, so the student sees why the track
  // is quiet and can pick another.
  const missing =
    track.midiInputId && !inputs.some((i) => i.id === track.midiInputId)
      ? track.midiInputId
      : null;
  return (
    <MenuRadioGroup
      label="MIDI input"
      value={track.midiInputId ?? ALL_DEVICES}
      onValueChange={(id) =>
        useStore.getState().updateTrack(track.id, {
          midiInputId: id === ALL_DEVICES ? null : id,
        })
      }
    >
      <MenuRadioItem value={ALL_DEVICES} data-item="midi:all">
        All Devices
      </MenuRadioItem>
      {inputs.map((input) => (
        <MenuRadioItem
          key={input.id}
          value={input.id}
          data-item={`midi:${input.id}`}
        >
          {input.name}
        </MenuRadioItem>
      ))}
      {missing ? (
        <MenuRadioItem value={missing} data-item="midi:missing">
          Disconnected device
        </MenuRadioItem>
      ) : null}
      {inputs.length === 0 ? (
        <MenuItem disabled data-item="midi:none">
          {MIDI_NOTE[status] ?? MIDI_NOTE['no-device']}
        </MenuItem>
      ) : null}
    </MenuRadioGroup>
  );
}

function AudioInputs({ track }: { track: Track }) {
  const deviceId = useStore((s) => s.inputDeviceId);
  const [devices, setDevices] = useState<AudioInputDevice[] | null>(null);
  useEffect(() => {
    let live = true;
    void getAudioInputs().then((list) => {
      if (live) setDevices(list);
    });
    return () => {
      live = false;
    };
  }, []);

  const pickDevice = async (id: string) => {
    const s = useStore.getState();
    try {
      s.setInputDevice(id, await probeDeviceChannelCount(id));
    } catch {
      s.setInputDevice(id, 2);
    }
  };

  return (
    <>
      <MenuRadioGroup
        label="Audio input"
        value={deviceId ?? ''}
        onValueChange={(id) => void pickDevice(id)}
      >
        {devices === null ? (
          <MenuItem disabled>Looking for inputs…</MenuItem>
        ) : devices.length === 0 ? (
          <MenuItem disabled>No audio input found</MenuItem>
        ) : (
          devices.map((d) => (
            <MenuRadioItem key={d.id} value={d.id} data-item={`audio:${d.id}`}>
              {d.label || 'Audio input'}
            </MenuRadioItem>
          ))
        )}
      </MenuRadioGroup>
      <MenuSeparator />
      <MenuLabel>Channel</MenuLabel>
      <MenuRadioGroup
        aria-label="Input channel"
        value={channelValue(track.audioInputChannel)}
        onValueChange={(value) => {
          const pick = CHANNELS.find((c) => c.value === value);
          if (pick) {
            useStore
              .getState()
              .updateTrack(track.id, { audioInputChannel: pick.config });
          }
        }}
      >
        {CHANNELS.map((c) => (
          <MenuRadioItem
            key={c.value}
            value={c.value}
            data-item={`channel:${c.value}`}
          >
            {c.label}
          </MenuRadioItem>
        ))}
      </MenuRadioGroup>
    </>
  );
}
