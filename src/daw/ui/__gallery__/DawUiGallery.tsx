import {
  Circle,
  Headphones,
  Lock,
  MoreHorizontal,
  Music,
  Pause,
  Play,
  Plus,
  Redo2,
  Repeat,
  Settings,
  Trash2,
  Undo2,
  VolumeX,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { KEY_OF_COLORS } from '@/constants/theme';
import { cn } from '@/components/utilities';
import { Button, type ButtonVariant } from '../Button';
import { Chip } from '../Chip';
import { contrastRatio, onColor } from '../color';
import { ConfirmDialog } from '../ConfirmDialog';
import {
  DawDialog,
  Sheet,
  type DawDialogSize,
  type SheetSide,
} from '../DawDialog';
import { confirmDialog, DialogHost, promptDialog } from '../DialogHost';
import { EmptyState } from '../EmptyState';
import { Fader } from '../Fader';
import { formatDb, formatGain } from '../format';
import { IconButton, type IconButtonVariant } from '../IconButton';
import { Kbd } from '../Kbd';
import { Knob } from '../Knob';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
} from '../Menu';
import {
  Meter,
  resetClipLights,
  type MeterLevels,
  type MeterSource,
} from '../Meter';
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from '../Popover';
import { PremiumBadge } from '../PremiumBadge';
import { PromptDialog } from '../PromptDialog';
import { Readout } from '../Readout';
import { Segmented } from '../Segmented';
import { Select } from '../Select';
import { TYPE_CLASS } from '../styles';
import { Tab, TabList, TabPanel, Tabs } from '../Tabs';
import { Toggle } from '../Toggle';
import { COLOR, dawVar, TYPE, Z, type DawColorName } from '../tokens';
import { Tooltip, TooltipGroup } from '../Tooltip';

/**
 * DEV only (/dev/studio/ui-gallery): every primitive in src/daw/ui in every
 * state, for review and for the Stage B screenshot checks (text floor,
 * 24×24 targets, 28 px controls, focus ring, opaque overlays, no accent
 * colour). App.tsx loads it lazily behind a literal import.meta.env.DEV, so
 * a production build never contains it.
 *
 * Overlays open one at a time: pick one under "Open overlay", or load the
 * page with ?open=popover (menu, select, tooltip, dialog, sheet, confirm,
 * prompt) to start with it open.
 */

const OVERLAYS = [
  'none',
  'popover',
  'menu',
  'select',
  'tooltip',
  'dialog',
  'sheet',
  'confirm',
  'prompt',
] as const;
type Overlay = (typeof OVERLAYS)[number];

const initialOverlay = (): Overlay => {
  const asked = new URLSearchParams(window.location.search).get('open');
  return OVERLAYS.find((o) => o === asked) ?? 'none';
};

function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label={title}
      className={cn(
        'flex flex-col gap-3 rounded-[var(--daw-radius-lg)] border border-daw-hairline bg-daw-surface-1 p-4',
        className,
      )}
    >
      <h2 className={cn(TYPE_CLASS.micro, 'text-daw-text-3')}>{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {label && (
        <span className={cn(TYPE_CLASS.label, 'w-24 shrink-0 text-daw-text-3')}>
          {label}
        </span>
      )}
      {children}
    </div>
  );
}

/** A stand-in for 1.7's MeterBus: a level that swings, one reading a frame. */
function useDemoMeter(swing: number, running: boolean): MeterSource | null {
  const source = useMemo<MeterSource>(() => {
    const listeners = new Set<(levels: MeterLevels) => void>();
    let frame = 0;
    const tick = (now: number) => {
      const t = now / 1000;
      const left = swing * Math.abs(Math.sin(t * 1.7) * Math.sin(t * 0.45));
      const right = swing * Math.abs(Math.sin(t * 1.3 + 1) * Math.sin(t * 0.4));
      listeners.forEach((cb) => cb({ peak: [left, right] }));
      frame = requestAnimationFrame(tick);
    };
    return {
      subscribe(cb) {
        listeners.add(cb);
        if (listeners.size === 1) frame = requestAnimationFrame(tick);
        return () => {
          listeners.delete(cb);
          if (listeners.size === 0) cancelAnimationFrame(frame);
        };
      },
    };
  }, [swing]);
  return running ? source : null;
}

const BUTTON_VARIANTS: ButtonVariant[] = [
  'primary',
  'secondary',
  'ghost',
  'danger',
  'quiet',
];
const ICON_VARIANTS: IconButtonVariant[] = [
  'ghost',
  'secondary',
  'primary',
  'danger',
];
const DIALOG_SIZES: DawDialogSize[] = ['sm', 'md', 'lg', 'full'];
const SHEET_SIDES: SheetSide[] = ['right', 'left', 'bottom'];
const DB_EXAMPLES = [-Infinity, -72, -24.4, -12, -9.96, -6, -0.04, 0, 3.5, 12];

/** The gallery, with one tooltip timing for the whole page, as the editor. */
export function DawUiGallery() {
  return (
    <TooltipGroup>
      <Gallery />
    </TooltipGroup>
  );
}

function Gallery() {
  const [overlay, setOverlay] = useState<Overlay>(initialOverlay);
  const [pressed, setPressed] = useState({
    loop: true,
    mute: false,
    arm: true,
  });
  const [tab, setTab] = useState('controls');
  const [snap, setSnap] = useState('1/16');
  const [tool, setTool] = useState('select');
  const [grid, setGrid] = useState('1/16');
  const [showGrid, setShowGrid] = useState(true);
  const [follow, setFollow] = useState('page');
  const [knobs, setKnobs] = useState({
    cutoff: 1200,
    pan: 0,
    mix: 0.35,
    semi: 0,
  });
  const [faders, setFaders] = useState({ track: 0.8, send: 0.25 });
  const [committed, setCommitted] = useState('—');
  const [metering, setMetering] = useState(true);
  const [dialogSize, setDialogSize] = useState<DawDialogSize>('md');
  const [sheetSide, setSheetSide] = useState<SheetSide>('right');
  const [answers, setAnswers] = useState<string[]>([]);
  const stereo = useDemoMeter(0.9, metering);
  const hot = useDemoMeter(1.15, metering);

  useEffect(() => {
    document.title = 'Studio UI gallery (DEV)';
  }, []);

  const close = (open: boolean) => {
    if (!open) setOverlay('none');
  };
  const commit = (name: string) => (value: number) =>
    setCommitted(`${name} → ${Number(value.toFixed(3))}`);
  const note = (text: string) =>
    setAnswers((list) => [text, ...list].slice(0, 4));

  return (
    <div
      id="daw-ui-gallery"
      className={cn(TYPE_CLASS.body, 'min-h-screen bg-daw-bg text-daw-text')}
    >
      <DialogHost />
      <header className="sticky top-0 z-[var(--daw-z-sticky)] flex flex-wrap items-center gap-4 border-b border-daw-hairline bg-daw-bg px-6 py-3">
        <h1 className={cn(TYPE_CLASS.heading, 'mr-auto')}>
          Studio UI primitives
          <span className={cn(TYPE_CLASS.label, 'ml-2 text-daw-text-3')}>
            src/daw/ui · DEV only
          </span>
        </h1>
        <span className={cn(TYPE_CLASS.label, 'text-daw-text-3')}>
          Open overlay
        </span>
        <Select
          label="Open overlay"
          value={overlay}
          onValueChange={(next) => setOverlay(next as Overlay)}
          options={OVERLAYS.map((o) => ({ value: o, label: o }))}
        />
      </header>

      <main className="grid grid-cols-1 gap-4 p-6 xl:grid-cols-2">
        <Section title="Colour tokens" className="xl:col-span-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-6">
            {(Object.keys(COLOR) as DawColorName[]).map((name) => (
              <div key={name} className="flex items-center gap-2">
                <span
                  className="size-6 shrink-0 rounded-[var(--daw-radius-sm)] border border-daw-hairline"
                  style={{ background: dawVar(name) }}
                />
                <span className="min-w-0">
                  <span className={cn(TYPE_CLASS.label, 'block truncate')}>
                    {name}
                  </span>
                  <span
                    className={cn(
                      TYPE_CLASS.label,
                      'block truncate text-daw-text-3',
                    )}
                  >
                    {COLOR[name].value}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Type scale and layers">
          {Object.entries(TYPE).map(([name, step]) => (
            <Row key={name} label={name}>
              <span
                className={TYPE_CLASS[name as keyof typeof TYPE_CLASS]}
              >{`${step.size}/${step.line} · The quick brown fox`}</span>
            </Row>
          ))}
          <Row label="z-index">
            <span className={cn(TYPE_CLASS.label, 'text-daw-text-2')}>
              {Object.entries(Z)
                .map(([layer, z]) => `${layer} ${z}`)
                .join(' · ')}
            </span>
          </Row>
        </Section>

        <Section title="Buttons">
          {(['sm', 'md', 'lg'] as const).map((size) => (
            <Row
              key={size}
              label={`${size} · ${{ sm: 24, md: 28, lg: 32 }[size]} px`}
            >
              {BUTTON_VARIANTS.map((variant) => (
                <Button key={variant} variant={variant} size={size}>
                  {variant}
                </Button>
              ))}
            </Row>
          ))}
          <Row label="disabled">
            {BUTTON_VARIANTS.map((variant) => (
              <Button key={variant} variant={variant} disabled>
                {variant}
              </Button>
            ))}
          </Row>
          <Row label="with icon">
            <Button variant="primary">
              <Plus /> Add track
            </Button>
            <Button variant="danger">
              <Trash2 /> Delete
            </Button>
          </Row>
        </Section>

        <Section title="Icon buttons (label required)">
          {(['sm', 'md', 'lg'] as const).map((size) => (
            <Row key={size} label={size}>
              {ICON_VARIANTS.map((variant) => (
                <IconButton
                  key={variant}
                  variant={variant}
                  size={size}
                  label={`Undo (${variant})`}
                  shortcut="⌘Z"
                  icon={<Undo2 />}
                />
              ))}
              <IconButton size={size} label="Redo" icon={<Redo2 />} disabled />
            </Row>
          ))}
          <Row label="transport">
            <IconButton
              size="play"
              variant="primary"
              label="Play"
              shortcut="Space"
              icon={<Play />}
            />
            <IconButton size="play" label="Pause" icon={<Pause />} />
          </Row>
        </Section>

        <Section title="Toggles">
          <Row label="neutral">
            <Toggle
              label="Loop"
              icon={<Repeat />}
              shortcut="L"
              pressed={pressed.loop}
              onPressedChange={(loop) => setPressed((p) => ({ ...p, loop }))}
            />
            <Toggle
              label="Mute"
              pressed={pressed.mute}
              onPressedChange={(mute) => setPressed((p) => ({ ...p, mute }))}
            >
              M
            </Toggle>
            <Toggle label="Solo">S</Toggle>
            <Toggle label="Monitor" icon={<Headphones />} />
            <Toggle label="Mute input" icon={<VolumeX />} disabled />
          </Row>
          <Row label="record tone">
            <Toggle
              label="Arm for recording"
              tone="record"
              icon={<Circle />}
              pressed={pressed.arm}
              onPressedChange={(arm) => setPressed((p) => ({ ...p, arm }))}
            />
            <Toggle label="Arm (off)" tone="record" icon={<Circle />} />
          </Row>
          <Row label="sizes">
            <Toggle label="Small" size="sm" defaultPressed>
              sm
            </Toggle>
            <Toggle label="Medium" size="md" defaultPressed>
              md
            </Toggle>
            <Toggle label="Large" size="lg" defaultPressed>
              lg
            </Toggle>
          </Row>
        </Section>

        <Section title="Tabs (a disabled tab keeps its reason)">
          <Tabs value={tab} onValueChange={setTab}>
            <TabList aria-label="Editor dock">
              <Tab value="controls">Instrument</Tab>
              <Tab value="fx">Effects</Tab>
              <Tab value="piano-roll" disabledReason="Notes needs a MIDI clip">
                Notes
              </Tab>
              <Tab value="prism">Prism</Tab>
              <Tab value="grooves" size="lg">
                Grooves (lg)
              </Tab>
            </TabList>
            {['controls', 'fx', 'piano-roll', 'prism', 'grooves'].map((v) => (
              <TabPanel key={v} value={v} className="pt-2 text-daw-text-3">
                Panel: {v}
              </TabPanel>
            ))}
          </Tabs>
        </Section>

        <Section title="Segmented">
          <Row label="text">
            <Segmented
              label="Snap"
              value={snap}
              onValueChange={setSnap}
              options={[
                { value: 'bar', label: 'Bar' },
                { value: '1/4', label: '1/4' },
                { value: '1/16', label: '1/16' },
                { value: 'off', label: 'Off' },
              ]}
            />
          </Row>
          <Row label="icons">
            <Segmented
              label="Tool"
              iconOnly
              value={tool}
              onValueChange={setTool}
              options={[
                { value: 'select', label: 'Select (V)', icon: <Music /> },
                { value: 'draw', label: 'Draw (B)', icon: <Plus /> },
                { value: 'cut', label: 'Cut (C)', icon: <Trash2 /> },
              ]}
            />
          </Row>
          <Row label="disabled">
            <Segmented
              label="Follow"
              disabled
              value={follow}
              onValueChange={setFollow}
              options={[
                { value: 'page', label: 'Page' },
                { value: 'smooth', label: 'Smooth' },
              ]}
            />
          </Row>
        </Section>

        <Section title="Select">
          <Row label="default">
            <Select
              label="Grid"
              value={grid}
              onValueChange={setGrid}
              options={[
                { value: '1/4', label: '1/4 note' },
                { value: '1/8', label: '1/8 note' },
                { value: '1/16', label: '1/16 note' },
                { value: '1/32', label: '1/32 note', disabled: true },
              ]}
            />
            <Select
              label="Input"
              placeholder="Choose an input"
              options={[
                {
                  label: 'Audio',
                  options: [
                    { value: 'mic', label: 'Built-in microphone' },
                    { value: 'usb', label: 'USB interface' },
                  ],
                },
                {
                  label: 'MIDI',
                  options: [{ value: 'keys', label: 'MIDI keyboard' }],
                },
              ]}
            />
          </Row>
          <Row label="sm · disabled">
            <Select
              label="Grid (small)"
              size="sm"
              defaultValue="1/8"
              options={[{ value: '1/8', label: '1/8 note' }]}
            />
            <Select
              label="Grid (disabled)"
              disabled
              defaultValue="1/8"
              options={[{ value: '1/8', label: '1/8 note' }]}
            />
          </Row>
        </Section>

        <Section title="Menus">
          <Row>
            <Menu>
              <MenuTrigger asChild>
                <Button>Project</Button>
              </MenuTrigger>
              <MenuContent align="start">
                <MenuLabel>Project</MenuLabel>
                <MenuItem icon={<Plus />} shortcut="⌘N">
                  New
                </MenuItem>
                <MenuItem shortcut="⌘S">Save</MenuItem>
                <MenuItem disabled>Export audio</MenuItem>
                <MenuSeparator />
                <MenuCheckboxItem
                  checked={showGrid}
                  onCheckedChange={(v) => setShowGrid(v === true)}
                >
                  Show grid
                </MenuCheckboxItem>
                <MenuSub>
                  <MenuSubTrigger icon={<Settings />}>Follow</MenuSubTrigger>
                  <MenuSubContent>
                    <MenuRadioGroup value={follow} onValueChange={setFollow}>
                      <MenuRadioItem value="page">Page</MenuRadioItem>
                      <MenuRadioItem value="smooth">Smooth</MenuRadioItem>
                    </MenuRadioGroup>
                  </MenuSubContent>
                </MenuSub>
                <MenuSeparator />
                <MenuItem danger icon={<Trash2 />} shortcut="⌫">
                  Delete project
                </MenuItem>
              </MenuContent>
            </Menu>
            <Menu>
              <MenuTrigger asChild>
                <IconButton label="More" icon={<MoreHorizontal />} />
              </MenuTrigger>
              <MenuContent>
                <MenuItem>Rename</MenuItem>
                <MenuItem>Duplicate</MenuItem>
              </MenuContent>
            </Menu>
            <ContextMenu>
              <ContextMenuTrigger
                className={cn(
                  TYPE_CLASS.label,
                  'flex h-16 w-56 items-center justify-center rounded-[var(--daw-radius-md)] border border-dashed border-daw-outline text-daw-text-3',
                )}
              >
                Right-click here
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem shortcut="⌘C">Copy</ContextMenuItem>
                <ContextMenuItem shortcut="⌘V">Paste</ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem danger>Delete clip</ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          </Row>
        </Section>

        <Section title="Popover and tooltip">
          <Row>
            <Popover>
              <PopoverTrigger asChild>
                <Chip asChild size="md" color={KEY_OF_COLORS.C}>
                  <button type="button">C major · 4/4 · 92</button>
                </Chip>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64">
                <p className={cn(TYPE_CLASS.title, 'mb-2')}>Song</p>
                <p className="mb-3 text-daw-text-2">
                  Key, mode, metre and tempo live here.
                </p>
                <PopoverClose asChild>
                  <Button variant="primary" size="sm">
                    Done
                  </Button>
                </PopoverClose>
              </PopoverContent>
            </Popover>
            <Tooltip content="Metronome" shortcut="K">
              <Button variant="ghost">Hover or focus me</Button>
            </Tooltip>
          </Row>
        </Section>

        <Section title="Dialogs">
          <Row label="dialog">
            {DIALOG_SIZES.map((size) => (
              <Button
                key={size}
                onClick={() => {
                  setDialogSize(size);
                  setOverlay('dialog');
                }}
              >
                {size}
              </Button>
            ))}
          </Row>
          <Row label="sheet">
            {SHEET_SIDES.map((side) => (
              <Button
                key={side}
                onClick={() => {
                  setSheetSide(side);
                  setOverlay('sheet');
                }}
              >
                {side}
              </Button>
            ))}
          </Row>
          <Row label="ask">
            <Button onClick={() => setOverlay('confirm')}>Confirm</Button>
            <Button onClick={() => setOverlay('prompt')}>Prompt</Button>
            <Button
              variant="danger"
              onClick={async () =>
                note(
                  `confirmDialog → ${await confirmDialog({
                    title: 'Delete this track?',
                    description: 'Its clips go too. You can undo this.',
                    confirmLabel: 'Delete',
                    danger: true,
                  })}`,
                )
              }
            >
              await confirmDialog()
            </Button>
            <Button
              onClick={async () =>
                note(
                  `promptDialog → ${JSON.stringify(
                    await promptDialog({
                      title: 'Rename marker',
                      label: 'Name',
                      defaultValue: 'Chorus',
                      validate: (v) => (v.trim() ? null : 'Give it a name.'),
                    }),
                  )}`,
                )
              }
            >
              await promptDialog()
            </Button>
          </Row>
          {answers.length > 0 && (
            <Row label="answers">
              <span className={cn(TYPE_CLASS.label, 'text-daw-text-2')}>
                {answers.join(' · ')}
              </span>
            </Row>
          )}
        </Section>

        <Section title="Knobs and faders (Shift for fine; Enter or double-click resets)">
          <Row>
            <Knob
              label="Cutoff"
              size="lg"
              min={20}
              max={20000}
              scale="log"
              step={1}
              resetValue={1200}
              value={knobs.cutoff}
              format={(v) =>
                v >= 1000
                  ? `${(v / 1000).toFixed(1)} kHz`
                  : `${Math.round(v)} Hz`
              }
              onChange={(cutoff) => setKnobs((k) => ({ ...k, cutoff }))}
              onCommit={commit('cutoff')}
            />
            <Knob
              label="Pan"
              bipolar
              min={-1}
              max={1}
              step={0.01}
              resetValue={0}
              value={knobs.pan}
              format={(v) =>
                v === 0
                  ? 'C'
                  : `${Math.round(Math.abs(v) * 100)}${v < 0 ? 'L' : 'R'}`
              }
              onChange={(pan) => setKnobs((k) => ({ ...k, pan }))}
              onCommit={commit('pan')}
            />
            <Knob
              label="Mix"
              size="sm"
              min={0}
              max={1}
              resetValue={0.35}
              value={knobs.mix}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(mix) => setKnobs((k) => ({ ...k, mix }))}
              onCommit={commit('mix')}
            />
            <Knob
              label="Transpose"
              min={-24}
              max={24}
              step={1}
              resetValue={0}
              value={knobs.semi}
              format={(v) => `${v > 0 ? '+' : ''}${v} st`}
              onChange={(semi) => setKnobs((k) => ({ ...k, semi }))}
              onCommit={commit('transpose')}
            />
            <Knob
              label="Drive"
              min={0}
              max={1}
              value={0.5}
              onChange={() => {}}
              disabled
            />
            <Fader
              label="Track volume"
              min={0}
              max={1}
              resetValue={0.8}
              value={faders.track}
              format={(v) => formatGain(v)}
              onChange={(track) => setFaders((f) => ({ ...f, track }))}
              onCommit={commit('volume')}
            />
            <Fader
              label="Send A"
              orientation="horizontal"
              min={0}
              max={1}
              value={faders.send}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(send) => setFaders((f) => ({ ...f, send }))}
              onCommit={commit('send')}
            />
            <Fader
              label="Locked"
              min={0}
              max={1}
              value={0.5}
              onChange={() => {}}
              disabled
            />
          </Row>
          <Row label="last commit">
            <Readout value={committed} tone="muted" />
          </Row>
        </Section>

        <Section title="Meters (canvas; no React render per frame)">
          <Row>
            <Meter label="Master" source={stereo} showPeak />
            <Meter label="Hot track" source={hot} showPeak />
            <Meter label="Silent" source={null} channels={1} />
            <Meter
              label="Send"
              source={stereo}
              orientation="horizontal"
              length={160}
            />
            <Toggle
              label={
                metering ? 'Stop the demo source' : 'Start the demo source'
              }
              icon={metering ? <Pause /> : <Play />}
              pressed={metering}
              onPressedChange={setMetering}
            />
            <Button onClick={resetClipLights}>Reset clip lights</Button>
          </Row>
        </Section>

        <Section title="Readouts and formatDb">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-5">
            {DB_EXAMPLES.map((db) => (
              <div key={String(db)} className="flex items-baseline gap-2">
                <span className={cn(TYPE_CLASS.label, 'w-12 text-daw-text-3')}>
                  {String(db)}
                </span>
                <Readout value={formatDb(db)} />
              </div>
            ))}
          </div>
          <Row label="tones">
            <Readout value="120.00" size="title" />
            <Readout value="−3.2 dB" tone="muted" />
            <Readout value="+0.4 dB" tone="record" />
            <Readout value="−1.0 dB" tone="warning" />
          </Row>
          <Row label="shortcut">
            <Kbd>⌘Z</Kbd>
            <Kbd>Shift</Kbd>
            <Kbd>Space</Kbd>
          </Row>
        </Section>

        <Section title="Chips">
          <Row label="tones">
            <Chip>4 tracks</Chip>
            <Chip tone="record" icon={<Circle />}>
              Rec
            </Chip>
            <Chip tone="warning">Unsaved</Chip>
            <Chip tone="success">Saved</Chip>
            <Chip dashed>No key</Chip>
            <Chip size="md">24 px</Chip>
          </Row>
          <Row label="premium">
            <PremiumBadge />
            <PremiumBadge locked />
            <Chip icon={<Lock />}>Locked</Chip>
          </Row>
          <Row label="key colour">
            {Object.entries(KEY_OF_COLORS)
              .slice(0, 4)
              .map(([key, color]) => (
                <Chip key={key} color={color}>
                  {key} major
                </Chip>
              ))}
            {Object.entries(KEY_OF_COLORS)
              .slice(4, 8)
              .map(([key, color]) => (
                <Chip key={key} color={color} fill>
                  {key} major
                </Chip>
              ))}
          </Row>
        </Section>

        <Section title="onColor: ink on every key colour (WCAG ratio)">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {Object.entries(KEY_OF_COLORS).map(([key, color]) => (
              <div
                key={key}
                className={cn(
                  TYPE_CLASS.label,
                  'flex h-12 flex-col items-center justify-center rounded-[var(--daw-radius-md)] font-bold',
                )}
                style={{ backgroundColor: color, color: onColor(color) }}
              >
                {key}
                <span className="font-normal">
                  {contrastRatio(onColor(color), color).toFixed(1)}:1
                </span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Empty state">
          <EmptyState
            icon={<Music />}
            title="No clips yet"
            description="Record, draw notes, or drag a loop from the browser to start."
            actions={
              <>
                <Button variant="primary">
                  <Plus /> Add track
                </Button>
                <Button>Open the browser</Button>
              </>
            }
          />
        </Section>
      </main>

      {/* Overlays, one at a time (see "Open overlay"). */}
      {overlay === 'popover' && (
        <div className="fixed bottom-6 left-6">
          <Popover open onOpenChange={close}>
            <PopoverTrigger asChild>
              <Button>Popover anchor</Button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start">
              An opaque popover, 8 px corners, above dialogs.
            </PopoverContent>
          </Popover>
        </div>
      )}
      {overlay === 'menu' && (
        <div className="fixed bottom-6 left-6">
          <Menu open onOpenChange={close} modal={false}>
            <MenuTrigger asChild>
              <Button>Menu anchor</Button>
            </MenuTrigger>
            <MenuContent side="top" align="start">
              <MenuLabel>Track</MenuLabel>
              <MenuItem shortcut="⌘D">Duplicate</MenuItem>
              <MenuItem disabled>Freeze</MenuItem>
              <MenuSeparator />
              <MenuItem danger icon={<Trash2 />}>
                Delete track
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>
      )}
      {overlay === 'tooltip' && (
        <div className="fixed bottom-6 left-6">
          <Tooltip content="Undo" shortcut="⌘Z">
            <Button autoFocus>Tooltip anchor (focused)</Button>
          </Tooltip>
        </div>
      )}
      {overlay === 'select' && (
        <OpenSelect onClose={() => setOverlay('none')} />
      )}
      <DawDialog
        open={overlay === 'dialog'}
        onOpenChange={close}
        size={dialogSize}
        title={`Export audio (${dialogSize})`}
        description="An opaque dialog: focus is trapped, Escape closes it, and focus returns to the button that opened it."
        footer={
          <>
            <Button onClick={() => setOverlay('none')}>Cancel</Button>
            <Button variant="primary" onClick={() => setOverlay('none')}>
              Export
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Select
            label="Format"
            defaultValue="wav"
            options={[
              { value: 'wav', label: 'WAV' },
              { value: 'mp3', label: 'MP3' },
            ]}
          />
          <Segmented
            label="Sample rate"
            value="48"
            onValueChange={() => {}}
            options={[
              { value: '44', label: '44.1 kHz' },
              { value: '48', label: '48 kHz' },
            ]}
          />
        </div>
      </DawDialog>
      <Sheet
        open={overlay === 'sheet'}
        onOpenChange={close}
        side={sheetSide}
        title="Add a track"
        description="A sheet is the same frame along one edge."
      >
        <div className="flex flex-col gap-2">
          {['Instrument', 'Drums', 'Audio', 'Guitar or bass'].map((kind) => (
            <Button key={kind} variant="ghost" className="justify-start">
              {kind}
            </Button>
          ))}
        </div>
      </Sheet>
      <ConfirmDialog
        open={overlay === 'confirm'}
        onOpenChange={close}
        title="Replace the recording?"
        description="Recording over this take replaces it. You can undo this."
        confirmLabel="Replace"
        danger
        onConfirm={() => note('ConfirmDialog → confirmed')}
        onCancel={() => note('ConfirmDialog → cancelled')}
      />
      <PromptDialog
        open={overlay === 'prompt'}
        onOpenChange={close}
        title="Add a marker"
        label="Marker name"
        defaultValue="Verse 2"
        validate={(v) => (v.trim() ? null : 'Give the marker a name.')}
        onSubmit={(v) => note(`PromptDialog → ${JSON.stringify(v)}`)}
        onCancel={() => note('PromptDialog → cancelled')}
      />
    </div>
  );
}

/** A Select opened from the start, for the screenshot of its list. */
function OpenSelect({ onClose }: { onClose(): void }) {
  const [value, setValue] = useState('1/16');
  return (
    <div className="fixed bottom-6 left-6">
      <Select
        label="Grid (open)"
        open
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        value={value}
        onValueChange={setValue}
        options={[
          { value: '1/4', label: '1/4 note' },
          { value: '1/8', label: '1/8 note' },
          { value: '1/16', label: '1/16 note' },
        ]}
      />
    </div>
  );
}
