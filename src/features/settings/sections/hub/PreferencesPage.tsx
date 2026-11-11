import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import { SegmentedControl } from '@/features/classroom/presentation/SegmentedControl';
import { useCustomCursorEnabled } from '@/hooks/useCustomCursorEnabled';
import { useLoginSoundEnabled } from '@/hooks/useLoginSoundEnabled';
import {
  CHORD_NOTATION_OPTIONS,
  formatProgression,
  useChordNotationSwitcher,
} from '@/lib/chordNotation';
import { MAX_OUTPUT_LATENCY_MS } from '../../latencyCalibration';
import {
  AccountPage,
  AccountSection,
  AccountSlider,
  AccountSubheading,
  AccountSwitch,
  SettingsGroup,
  SettingsRow,
} from '../../ui/accountKit';
import { useSettingsStore } from '../../useSettingsStore';
import { LatencyCalibration } from '../LatencyCalibration';
import { MidiSettings } from '../MidiSettings';

// ── Account › Preferences (owner, 2026-11-10: samply.app/preferences') ─────
// One page, as Samply's: Audio, Look & feel and MIDI as its sections, each a
// titled block over cards of rows, the title over its grey line and the
// control at the right. The old Settings pages' addresses land on their
// section (/settings/audio → #audio). Every control writes the same store
// the old pages did.

const EXAMPLE = '2 minor7 → 5 dominant7 → 1 major7';
const exampleIn = (notation: 'hybrid' | 'jazz' | 'roman') =>
  notation === 'hybrid'
    ? '2 min7 → 5 dom7 → 1 maj7'
    : formatProgression(EXAMPLE, notation, { keyRootPc: 0, mode: 'ionian' });

const VALUE =
  'min-w-[3.5rem] shrink-0 whitespace-nowrap text-right text-[0.795rem] text-white/70';

function AudioRows() {
  const outputDevice = useSettingsStore((s) => s.outputDevice);
  const outputChannel = useSettingsStore((s) => s.outputChannel);
  const outputLatencyMs = useSettingsStore((s) => s.outputLatencyMs);
  const volume = useSettingsStore((s) => s.volume);
  const setOutputLatencyMs = useSettingsStore((s) => s.setOutputLatencyMs);
  const setVolume = useSettingsStore((s) => s.setVolume);

  return (
    <>
      <AccountSubheading>Output</AccountSubheading>
      <SettingsGroup>
        <SettingsRow
          plain
          title="Device"
          description="Where Music Atlas plays."
          action={<span className={VALUE}>{outputDevice}</span>}
        />
        <SettingsRow
          plain
          title="Channel"
          action={<span className={VALUE}>{outputChannel}</span>}
        />
        <SettingsRow
          plain
          title="Main volume"
          action={<span className={VALUE}>{volume}</span>}
        >
          <AccountSlider
            aria-label="Main volume"
            value={[volume]}
            onValueChange={([v]) => setVolume(v)}
            min={0}
            max={100}
            step={1}
          />
        </SettingsRow>
      </SettingsGroup>

      <AccountSubheading>Timing</AccountSubheading>
      <SettingsGroup>
        <SettingsRow
          plain
          title="Output latency"
          description="Extra delay from Bluetooth headphones or speakers. Lesson playheads and scoring shift by this much so they match what you hear. Built-in speakers and wired headphones usually need 0."
          action={<span className={VALUE}>{outputLatencyMs} ms</span>}
        >
          <AccountSlider
            aria-label="Output latency"
            value={[outputLatencyMs]}
            onValueChange={([v]) => setOutputLatencyMs(v)}
            min={0}
            max={MAX_OUTPUT_LATENCY_MS}
            step={5}
          />
          <LatencyCalibration />
        </SettingsRow>
      </SettingsGroup>
    </>
  );
}

function LookAndFeelRows() {
  const { userId } = useAuthContext();
  const appSounds = useSettingsStore((s) => s.appSounds);
  const autoPreview = useSettingsStore((s) => s.autoPreview);
  const highContrast = useSettingsStore((s) => s.highContrast);
  const noteStreaks = useSettingsStore((s) => s.noteStreaks);
  const setAppSounds = useSettingsStore((s) => s.setAppSounds);
  const setAutoPreview = useSettingsStore((s) => s.setAutoPreview);
  const setHighContrast = useSettingsStore((s) => s.setHighContrast);
  const setNoteStreaks = useSettingsStore((s) => s.setNoteStreaks);
  const [cursorEnabled, setCursorEnabled] = useCustomCursorEnabled();
  const [loginSoundEnabled, setLoginSoundEnabled] =
    useLoginSoundEnabled(userId);
  const { enabled, setEnabled, notation, setNotation } =
    useChordNotationSwitcher();

  const toggle = (
    title: string,
    checked: boolean,
    set: (v: boolean) => void,
    description?: string,
  ) => (
    <SettingsRow
      plain
      title={title}
      description={description}
      action={
        <AccountSwitch label={title} checked={checked} onCheckedChange={set} />
      }
    />
  );

  return (
    <>
      <AccountSubheading>The app</AccountSubheading>
      <SettingsGroup>
        {toggle('App sounds', appSounds, setAppSounds)}
        {toggle('Auto preview', autoPreview, setAutoPreview)}
        {toggle('High contrast mode', highContrast, setHighContrast)}
        {toggle('Note streaks', noteStreaks, setNoteStreaks)}
        {toggle(
          'Custom cursor',
          cursorEnabled,
          setCursorEnabled,
          'A white hexagon cursor with a hover animation. Desktop only.',
        )}
        {toggle(
          'Login sound',
          loginSoundEnabled,
          setLoginSoundEnabled,
          'A short welcome jingle the first time you sign in. Turn this back on to hear it once more next time.',
        )}
      </SettingsGroup>

      <AccountSubheading>Chord symbols</AccountSubheading>
      <SettingsGroup>
        {toggle(
          'Chord notation switcher',
          enabled,
          setEnabled,
          'Show a Hybrid · Jazz · Roman switch at the top right of every screen.',
        )}
        {enabled && (
          <SettingsRow
            plain
            title="Notation"
            description={exampleIn(notation)}
            action={
              <SegmentedControl
                label="Chord notation"
                options={CHORD_NOTATION_OPTIONS}
                value={notation}
                onChange={setNotation}
              />
            }
          />
        )}
      </SettingsGroup>
    </>
  );
}

export const PreferencesPage = () => {
  const { hash } = useLocation();
  // An old Settings page's address lands on its section.
  useEffect(() => {
    if (!hash) return;
    document
      .getElementById(hash.slice(1))
      ?.scrollIntoView?.({ block: 'start' });
  }, [hash]);

  return (
    <AccountPage title="Preferences">
      <AccountSection
        id="audio"
        title="Audio"
        description="Output, volume and latency for the app."
        spacing="cards"
      >
        <AudioRows />
      </AccountSection>
      <AccountSection
        id="look-and-feel"
        title="Look & feel"
        description="App sounds, preview behaviour, contrast, note streaks, and how chord symbols are written."
        spacing="cards"
      >
        <LookAndFeelRows />
      </AccountSection>
      <AccountSection
        id="midi"
        title="MIDI"
        description="Connect your instrument, tune hit sensitivity, and manage mappings."
        spacing="cards"
      >
        <MidiSettings />
      </AccountSection>
    </AccountPage>
  );
};
