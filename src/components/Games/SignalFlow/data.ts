import {
  Mic,
  Speaker,
  Zap,
  Settings,
  Cable,
  Guitar,
  Box,
  Keyboard,
  Laptop,
  Sliders,
  Circle,
  Disc,
  Layers,
} from 'lucide-react';
import type { Item, Level } from './types';

// --- Equipment & Cable Definitions ---
// Icons are stored as component references, not JSX elements.
// Render at use site: <item.icon size={20} />

export const ITEMS: Record<string, Item> = {
  // Equipment
  MIC: { id: 'mic', name: 'Shure SM58', type: 'equipment', icon: Mic, description: 'Dynamic Vocal Mic' },
  SPEAKER: { id: 'speaker', name: 'Active Monitor', type: 'equipment', icon: Speaker, description: 'Powered Speaker' },
  GUITAR: { id: 'guitar', name: 'Stratocaster', type: 'equipment', icon: Guitar, description: 'Electric Guitar' },
  AMP: { id: 'amp', name: 'Tube Combo', type: 'equipment', icon: Box, description: 'Guitar Amp' },
  MIDI_KEYBOARD: { id: 'midi_keyboard', name: 'MIDI Controller', type: 'equipment', icon: Keyboard, description: 'USB Keyboard' },
  LAPTOP: { id: 'laptop', name: 'MacBook Pro', type: 'equipment', icon: Laptop, description: 'DAW Host' },
  INTERFACE: { id: 'interface', name: 'Audio Interface', type: 'equipment', icon: Settings, description: 'USB-C Interface' },
  MIXER: { id: 'mixer', name: 'Live Mixer', type: 'equipment', icon: Sliders, description: 'Mixing Console' },
  FOH_SPEAKER: { id: 'foh_speaker', name: 'Main PA', type: 'equipment', icon: Speaker, description: 'Front of House' },
  STAGE_MONITOR: { id: 'stage_monitor', name: 'Stage Wedge', type: 'equipment', icon: Speaker, iconClassName: 'rotate-90', description: 'Floor Monitor' },

  // Drum Kit
  KICK: { id: 'kick', name: 'Kick Drum', type: 'equipment', icon: Circle, iconSize: 22, iconFill: 'currentColor', iconClassName: 'text-zinc-400', description: 'Beta 52A Mic' },
  SNARE: { id: 'snare', name: 'Snare Drum', type: 'equipment', icon: Circle, iconSize: 18, iconClassName: 'border-2 rounded-full', description: 'SM57 Mic' },
  HIHAT: { id: 'hihat', name: 'Hi-Hats', type: 'equipment', icon: Disc, iconSize: 18, description: 'Small Diaphragm Condenser' },
  RACK_TOM: { id: 'rack_tom', name: 'Rack Tom', type: 'equipment', icon: Circle, iconSize: 16, description: 'Dynamic Clip-on' },
  FLOOR_TOM: { id: 'floor_tom', name: 'Floor Tom', type: 'equipment', icon: Circle, iconSize: 20, description: 'Dynamic Clip-on' },
  SNAKE_BOX: { id: 'snake_box', name: 'Stage Snake', type: 'equipment', icon: Layers, description: '16-Channel Stage Box' },

  // Cables
  XLR_CABLE: { id: 'xlr_cable', name: 'XLR Cable', type: 'cable', icon: Cable, color: 'indigo', iconClassName: 'text-indigo-400', description: 'Balanced Audio' },
  IEC_CABLE: { id: 'iec_cable', name: 'IEC Power', type: 'cable', icon: Zap, color: 'amber', iconClassName: 'text-amber-400', description: 'AC Power' },
  TS_CABLE: { id: 'ts_cable', name: 'TS Instrument', type: 'cable', icon: Cable, color: 'emerald', iconClassName: 'text-emerald-400', description: 'Unbalanced Audio' },
  USB_B_CABLE: { id: 'usb_b_cable', name: 'USB-B Data', type: 'cable', icon: Cable, color: 'blue', iconClassName: 'text-blue-400', description: 'MIDI/Data' },
  USB_C_CABLE: { id: 'usb_c_cable', name: 'USB-C Data', type: 'cable', icon: Cable, color: 'sky', iconClassName: 'text-sky-200', description: 'High Speed Data' },
  SNAKE_MULTI: { id: 'snake_multi', name: 'Multicore Snake', type: 'cable', icon: Cable, color: 'purple', iconClassName: 'text-purple-400', description: 'Multi-channel Trunk' },
};

// --- Level Definitions ---

export const LEVELS: Level[] = [
  {
    id: 1,
    title: 'Basic Signal Chain',
    brief: 'Connect the microphone to the speaker and provide power.',
    slots: [
      { id: 'slot_mic', type: 'equipment', required: 'mic', col: 1, row: 2, label: 'Input' },
      { id: 'slot_speaker', type: 'equipment', required: 'speaker', col: 5, row: 2, label: 'Output' },
    ],
    connections: [
      { id: 'conn_mic_spk', from: 'slot_mic', to: 'slot_speaker', required: 'xlr_cable', label: 'Signal' },
      { id: 'conn_spk_pwr', from: 'slot_speaker', to: 'POWER', required: 'iec_cable', label: 'Power' },
    ],
    toolbox: ['mic', 'speaker', 'xlr_cable', 'iec_cable'],
  },
  {
    id: 2,
    title: 'Instrument Setup',
    brief: 'Connect the guitar to the amplifier.',
    slots: [
      { id: 'slot_guitar', type: 'equipment', required: 'guitar', col: 1, row: 2, label: 'Inst' },
      { id: 'slot_amp', type: 'equipment', required: 'amp', col: 4, row: 2, label: 'Amp' },
    ],
    connections: [
      { id: 'conn_gtr_amp', from: 'slot_guitar', to: 'slot_amp', required: 'ts_cable', label: 'Signal' },
      { id: 'conn_amp_pwr', from: 'slot_amp', to: 'POWER', required: 'iec_cable', label: 'Power' },
    ],
    toolbox: ['guitar', 'amp', 'ts_cable', 'iec_cable'],
  },
  {
    id: 3,
    title: 'Digital Studio',
    brief: 'Connect the MIDI controller, Computer, Interface, and Monitors.',
    slots: [
      { id: 'slot_keys', type: 'equipment', required: 'midi_keyboard', col: 1, row: 1, label: 'MIDI' },
      { id: 'slot_laptop', type: 'equipment', required: 'laptop', col: 3, row: 1, label: 'DAW' },
      { id: 'slot_interface', type: 'equipment', required: 'interface', col: 3, row: 3, label: 'I/O' },
      { id: 'slot_speaker', type: 'equipment', required: 'speaker', col: 5, row: 2, label: 'Mon' },
    ],
    connections: [
      { id: 'conn_keys_lap', from: 'slot_keys', to: 'slot_laptop', required: 'usb_b_cable', label: 'USB' },
      { id: 'conn_lap_int', from: 'slot_laptop', to: 'slot_interface', required: 'usb_c_cable', label: 'USB-C' },
      { id: 'conn_int_spk', from: 'slot_interface', to: 'slot_speaker', required: 'xlr_cable', label: 'Main Out' },
      { id: 'conn_int_pwr', from: 'slot_interface', to: 'POWER', required: 'iec_cable', label: 'Power' },
      { id: 'conn_spk_pwr', from: 'slot_speaker', to: 'POWER', required: 'iec_cable', label: 'Power' },
    ],
    toolbox: ['midi_keyboard', 'laptop', 'interface', 'speaker', 'usb_b_cable', 'usb_c_cable', 'xlr_cable', 'iec_cable'],
  },
  {
    id: 4,
    title: 'Live Sound Stage',
    brief: 'Route the vocal mic to the mixer, then split the signal to FOH Mains and Stage Monitors.',
    slots: [
      { id: 'slot_mic', type: 'equipment', required: 'mic', col: 1, row: 3, label: 'Vocals' },
      { id: 'slot_mon', type: 'equipment', required: 'stage_monitor', col: 2, row: 4, label: 'Wedge' },
      { id: 'slot_foh', type: 'equipment', required: 'foh_speaker', col: 5, row: 1, label: 'Main PA' },
      { id: 'slot_mixer', type: 'equipment', required: 'mixer', col: 8, row: 3, label: 'FOH Mixer' },
    ],
    connections: [
      { id: 'conn_mic_mix', from: 'slot_mic', to: 'slot_mixer', required: 'xlr_cable', label: 'Input 1' },
      { id: 'conn_mix_pwr', from: 'slot_mixer', to: 'POWER', required: 'iec_cable', label: 'Power' },
      { id: 'conn_mix_foh', from: 'slot_mixer', to: 'slot_foh', required: 'xlr_cable', label: 'Main Out' },
      { id: 'conn_mix_mon', from: 'slot_mixer', to: 'slot_mon', required: 'xlr_cable', label: 'Aux Out' },
      { id: 'conn_foh_pwr', from: 'slot_foh', to: 'POWER', required: 'iec_cable', label: 'Power' },
      { id: 'conn_mon_pwr', from: 'slot_mon', to: 'POWER', required: 'iec_cable', label: 'Power' },
    ],
    toolbox: ['mic', 'mixer', 'foh_speaker', 'stage_monitor', 'xlr_cable', 'iec_cable'],
  },
  {
    id: 5,
    title: 'Full Band Layout',
    brief: 'Wire the full drum kit into the stage snake, then run the multicore to FOH and route returns to monitors.',
    slots: [
      { id: 'slot_kick', type: 'equipment', required: 'kick', col: 1, row: 4, label: 'Kick' },
      { id: 'slot_snare', type: 'equipment', required: 'snare', col: 1, row: 3, label: 'Snare' },
      { id: 'slot_hh', type: 'equipment', required: 'hihat', col: 0, row: 3, label: 'Hats' },
      { id: 'slot_rack', type: 'equipment', required: 'rack_tom', col: 1, row: 2, label: 'Rack' },
      { id: 'slot_floor', type: 'equipment', required: 'floor_tom', col: 0, row: 4, label: 'Floor' },
      { id: 'slot_snake', type: 'equipment', required: 'snake_box', col: 3, row: 3, label: 'Snake' },
      { id: 'slot_mon', type: 'equipment', required: 'stage_monitor', col: 1, row: 5, label: 'Wedge' },
      { id: 'slot_foh', type: 'equipment', required: 'foh_speaker', col: 5, row: 2, label: 'Main PA' },
      { id: 'slot_mixer', type: 'equipment', required: 'mixer', col: 8, row: 3, label: 'FOH Mix' },
    ],
    connections: [
      { id: 'conn_kick_snake', from: 'slot_kick', to: 'slot_snake', required: 'xlr_cable', label: 'Ch 1' },
      { id: 'conn_snare_snake', from: 'slot_snare', to: 'slot_snake', required: 'xlr_cable', label: 'Ch 2' },
      { id: 'conn_hh_snake', from: 'slot_hh', to: 'slot_snake', required: 'xlr_cable', label: 'Ch 3' },
      { id: 'conn_rack_snake', from: 'slot_rack', to: 'slot_snake', required: 'xlr_cable', label: 'Ch 4' },
      { id: 'conn_floor_snake', from: 'slot_floor', to: 'slot_snake', required: 'xlr_cable', label: 'Ch 5' },
      { id: 'conn_snake_mixer', from: 'slot_snake', to: 'slot_mixer', required: 'snake_multi', label: 'Trunk' },
      { id: 'conn_mix_foh', from: 'slot_mixer', to: 'slot_foh', required: 'xlr_cable', label: 'Main L/R' },
      { id: 'conn_mix_mon', from: 'slot_mixer', to: 'slot_mon', required: 'xlr_cable', label: 'Aux 1' },
      { id: 'conn_mix_pwr', from: 'slot_mixer', to: 'POWER', required: 'iec_cable', label: 'Power' },
      { id: 'conn_foh_pwr', from: 'slot_foh', to: 'POWER', required: 'iec_cable', label: 'Power' },
      { id: 'conn_mon_pwr', from: 'slot_mon', to: 'POWER', required: 'iec_cable', label: 'Power' },
    ],
    toolbox: ['kick', 'snare', 'hihat', 'rack_tom', 'floor_tom', 'snake_box', 'mixer', 'foh_speaker', 'stage_monitor', 'xlr_cable', 'snake_multi', 'iec_cable'],
  },
];
