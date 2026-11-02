import { ACOUSTIC_BASS_MODEL, ACOUSTIC_MODEL } from './acousticModel';
import type { ModelKind, InstrumentModel } from './anatomyTypes';
import { SOLID_STATE_AMP_MODEL, TUBE_AMP_MODEL } from './comboAmpModel';
import { compile, type CompiledModel } from './compileCore';
import { ELECTRIC_BASS_MODEL } from './electricBassModel';
import { ELECTRIC_MODEL } from './electricModel';
import { GRAND_PIANO_MODEL } from './grandPianoModel';
import { HEADPHONES_MODEL } from './headphonesModel';
import { KEYBOARD_MODEL } from './keyboardModel';
import { MICROPHONE_MODEL } from './microphoneModel';
import { SYNTH_MODEL } from './synthModel';
import { UKULELE_MODEL } from './ukuleleModel';
import { UPRIGHT_PIANO_MODEL } from './uprightPianoModel';

export {
  compile,
  reachOf,
  type Box,
  type CompiledModel,
  type CompiledPart,
} from './compileCore';

const MODELS: Readonly<Record<ModelKind, InstrumentModel>> = {
  electric: ELECTRIC_MODEL,
  acoustic: ACOUSTIC_MODEL,
  electricBass: ELECTRIC_BASS_MODEL,
  acousticBass: ACOUSTIC_BASS_MODEL,
  ukulele: UKULELE_MODEL,
  grandPiano: GRAND_PIANO_MODEL,
  uprightPiano: UPRIGHT_PIANO_MODEL,
  keyboard: KEYBOARD_MODEL,
  synth: SYNTH_MODEL,
  headphones: HEADPHONES_MODEL,
  microphone: MICROPHONE_MODEL,
  tubeAmp: TUBE_AMP_MODEL,
  solidStateAmp: SOLID_STATE_AMP_MODEL,
};

const cache = new Map<string, CompiledModel>();

/** Compiled once per instrument and hand. */
export function compiledInstrument(
  kind: ModelKind,
  leftHanded: boolean,
): CompiledModel {
  const key = `${kind}:${leftHanded}`;
  let model = cache.get(key);
  if (!model) {
    model = compile(MODELS[kind], leftHanded);
    cache.set(key, model);
  }
  return model;
}

/** The instrument in words: "an acoustic bass", "a ukulele". */
export const describe = ({ label, noun, kind }: CompiledModel) => {
  if (kind === 'ukulele') return `a ${noun}`;
  if (kind === 'headphones') return 'a pair of headphones';
  const name = `${label.toLowerCase()} ${noun}`;
  return /^[aeiou]/.test(name) ? `an ${name}` : `a ${name}`;
};

export { termAnchor } from './termAnchor';
