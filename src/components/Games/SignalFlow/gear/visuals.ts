import type { InstrumentModel } from '@/curriculum/anatomy/anatomyTypes';
import { TUBE_AMP_MODEL } from '@/curriculum/anatomy/comboAmpModel';
import { compile, type CompiledModel } from '@/curriculum/anatomy/compileCore';
import { ELECTRIC_BASS_MODEL } from '@/curriculum/anatomy/electricBassModel';
import { ELECTRIC_MODEL } from '@/curriculum/anatomy/electricModel';
import { HEADPHONES_MODEL } from '@/curriculum/anatomy/headphonesModel';
import type { V2, V3 } from '@/curriculum/anatomy/iso';
import { KEYBOARD_MODEL } from '@/curriculum/anatomy/keyboardModel';
import { MICROPHONE_MODEL } from '@/curriculum/anatomy/microphoneModel';
import type { GearInstance, GearKind } from '../rig/rigTypes';
import {
  condenserVisual,
  diVisual,
  interfaceVisual,
  laptopVisual,
  mixerVisual,
  powerStripVisual,
  stageBoxVisual,
  stompboxVisual,
} from './desk';
import { drumKitVisual } from './drumKit';
import {
  boxOfDrawings,
  type GearMover,
  type GearPart,
  type GearVisual,
  type PortSpot,
} from './shapes';
import { monitorVisual, speakerVisual, wedgeVisual } from './speakers';

// ── Every piece of gear, ready to draw ─────────────────────────────────────
// The instruments are the Anatomy lessons' own drawings, assembled, so a
// student meets the same mic here. Their cables are hidden: here, the cables
// are the student's job. Each visual is compiled the first time it is needed.

interface Reused {
  model: InstrumentModel;
  hide?: readonly string[];
  /** Each jack: on a part's middle, or at a spot in the model's own space. */
  ports: Readonly<Record<string, { part: string; axis: V3; shift?: V2 }>>;
  scale: number;
  movers?: readonly GearMover[];
  nameGap?: number;
  /** Grilles and the like, drawn see-through so what's behind shows. */
  open?: readonly string[];
}

const fromModel = (spec: Reused): GearVisual => {
  const compiled: CompiledModel = compile(spec.model, false);
  const hidden = new Set(spec.hide ?? []);
  const open = new Set(spec.open ?? []);
  const parts: GearPart[] = compiled.parts
    .filter((part) => !hidden.has(part.id))
    .map((part) => ({
      id: part.id,
      layers: part.layers,
      tone: part.tone,
      lineWeight: part.lineWeight,
      open: open.has(part.id),
    }));
  const ports: Record<string, PortSpot> = {};
  for (const [id, { part, axis, shift = [0, 0] }] of Object.entries(
    spec.ports,
  )) {
    const { box } = compiled.partById[part];
    ports[id] = {
      at: [(box.x0 + box.x1) / 2 + shift[0], (box.y0 + box.y1) / 2 + shift[1]],
      axis,
    };
  }
  return {
    parts,
    ports,
    box: boxOfDrawings(parts.flatMap((part) => part.layers)),
    scale: spec.scale,
    movers: spec.movers,
    nameGap: spec.nameGap,
  };
};

const BUILDERS: Readonly<Record<Exclude<GearKind, 'mixer'>, () => GearVisual>> =
  {
    dynamicMic: () =>
      fromModel({
        model: MICROPHONE_MODEL,
        hide: ['cable'],
        ports: { out: { part: 'xlrConnector', axis: [-0.5, 0.4, -0.75] } },
        scale: 1,
        nameGap: 5,
      }),
    condenserMic: condenserVisual,
    guitar: () =>
      fromModel({
        model: ELECTRIC_MODEL,
        ports: { out: { part: 'outputJack', axis: [-0.4, 0.8, -0.2] } },
        scale: 0.82,
      }),
    bass: () =>
      fromModel({
        model: ELECTRIC_BASS_MODEL,
        ports: { out: { part: 'outputJack', axis: [-0.4, 0.8, -0.2] } },
        scale: 0.7,
      }),
    midiKeyboard: () =>
      fromModel({
        model: KEYBOARD_MODEL,
        ports: {
          out: { part: 'jacks', axis: [0.2, 0.8, 0.5], shift: [4, 2.4] },
          midiOut: { part: 'jacks', axis: [0.2, 0.8, 0.5], shift: [-4, -2.4] },
        },
        scale: 0.72,
      }),
    headphones: () =>
      fromModel({
        model: HEADPHONES_MODEL,
        hide: ['cable', 'plug'],
        ports: { in: { part: 'shellRight', axis: [-0.3, 0.5, -0.8] } },
        scale: 0.72,
      }),
    amp: () =>
      fromModel({
        model: TUBE_AMP_MODEL,
        ports: { in: { part: 'inputJack', axis: [-1, 0.2, -0.2] } },
        open: ['grille', 'baffle'],
        scale: 1,
        movers: [{ type: 'pump', part: 'cone', axis: [-1, 0, 0], reach: 0.7 }],
      }),
    drumKit: drumKitVisual,
    speaker: speakerVisual,
    wedge: wedgeVisual,
    monitor: monitorVisual,
    compressor: () => stompboxVisual(1),
    overdrive: () => stompboxVisual(3),
    delay: () => stompboxVisual(2),
    interface: interfaceVisual,
    laptop: laptopVisual,
    stageBox: stageBoxVisual,
    di: diVisual,
    powerStrip: powerStripVisual,
  };

const cache = new Map<string, GearVisual>();

export function gearVisual(
  gear: Pick<GearInstance, 'kind' | 'channels'>,
): GearVisual {
  const key = `${gear.kind}:${gear.channels ?? ''}`;
  let found = cache.get(key);
  if (!found) {
    found =
      gear.kind === 'mixer'
        ? mixerVisual(gear.channels ?? 4)
        : BUILDERS[gear.kind]();
    cache.set(key, found);
  }
  return found;
}
