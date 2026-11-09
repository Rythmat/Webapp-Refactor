import { StateCreator } from 'zustand';
import {
  LFOParams,
  LFONode,
  RateDiv,
  QuarterRates,
  RateModifier,
} from '../../audio/types';

export interface LFOSlice {
  lfos: [LFOParams, LFOParams, LFOParams, LFOParams];
  setLFOQuarterRateDiv: (
    lfoIndex: number,
    barIndex: number,
    quarterIndex: number,
    rateDiv: RateDiv,
  ) => void;
  setLFORateModifier: (
    lfoIndex: number,
    barIndex: number,
    modifier: RateModifier,
  ) => void;
  setLFOBarSmooth: (lfoIndex: number, barIndex: number, smooth: number) => void;
  setLFOSync: (index: number, sync: boolean) => void;
  /** An LFO loops (false) or plays once from each note-on (true). */
  setLFOOnce: (index: number, once: boolean) => void;
  setLFONodes: (lfoIndex: number, barIndex: number, nodes: LFONode[]) => void;
  /**
   * Every bar's shape and every quarter's rate at once (the dock's shape
   * and rate pickers): one update, so the engine rebuilds once.
   */
  setLFOPattern: (
    lfoIndex: number,
    pattern: Pick<LFOParams, 'bars' | 'rateDivs'>,
  ) => void;
}

// Default triangle waveform nodes (unipolar 0..1)
// 4 peaks to match default 1/4 rate (4 cycles per bar)
const defaultTriangleNodes = (): LFONode[] => [
  { time: 0, value: 0 },
  { time: 0.125, value: 1 },
  { time: 0.25, value: 0 },
  { time: 0.375, value: 1 },
  { time: 0.5, value: 0 },
  { time: 0.625, value: 1 },
  { time: 0.75, value: 0 },
  { time: 0.875, value: 1 },
  { time: 1, value: 0 },
];

const defaultQuarterRates = (): QuarterRates => ['1/4', '1/4', '1/4', '1/4'];

export const defaultLFO = (): LFOParams => ({
  rateDivs: [
    defaultQuarterRates(),
    defaultQuarterRates(),
    defaultQuarterRates(),
    defaultQuarterRates(),
  ],
  rateModifiers: ['normal', 'normal', 'normal', 'normal'],
  smooths: [0, 0, 0, 0],
  sync: false,
  bars: [
    defaultTriangleNodes(),
    defaultTriangleNodes(),
    defaultTriangleNodes(),
    defaultTriangleNodes(),
  ],
});

export const createLFOSlice: StateCreator<LFOSlice, [], [], LFOSlice> = (
  set,
) => ({
  lfos: [defaultLFO(), defaultLFO(), defaultLFO(), defaultLFO()],

  setLFOQuarterRateDiv: (lfoIndex, barIndex, quarterIndex, rateDiv) =>
    set((state) => {
      const newLfos = [...state.lfos] as [
        LFOParams,
        LFOParams,
        LFOParams,
        LFOParams,
      ];
      const newRateDivs = [...newLfos[lfoIndex].rateDivs] as [
        QuarterRates,
        QuarterRates,
        QuarterRates,
        QuarterRates,
      ];
      const newQuarter = [...newRateDivs[barIndex]] as QuarterRates;
      newQuarter[quarterIndex] = rateDiv;
      newRateDivs[barIndex] = newQuarter;
      newLfos[lfoIndex] = { ...newLfos[lfoIndex], rateDivs: newRateDivs };
      return { lfos: newLfos };
    }),

  setLFORateModifier: (lfoIndex, barIndex, modifier) =>
    set((state) => {
      const newLfos = [...state.lfos] as [
        LFOParams,
        LFOParams,
        LFOParams,
        LFOParams,
      ];
      const newMods = [...newLfos[lfoIndex].rateModifiers] as [
        RateModifier,
        RateModifier,
        RateModifier,
        RateModifier,
      ];
      newMods[barIndex] = modifier;
      newLfos[lfoIndex] = { ...newLfos[lfoIndex], rateModifiers: newMods };
      return { lfos: newLfos };
    }),

  setLFOBarSmooth: (lfoIndex, barIndex, smooth) =>
    set((state) => {
      const newLfos = [...state.lfos] as [
        LFOParams,
        LFOParams,
        LFOParams,
        LFOParams,
      ];
      const newSmooths = [...newLfos[lfoIndex].smooths] as [
        number,
        number,
        number,
        number,
      ];
      newSmooths[barIndex] = smooth;
      newLfos[lfoIndex] = { ...newLfos[lfoIndex], smooths: newSmooths };
      return { lfos: newLfos };
    }),

  setLFOOnce: (index, once) =>
    set((state) => {
      const lfos = [...state.lfos] as [
        LFOParams,
        LFOParams,
        LFOParams,
        LFOParams,
      ];
      lfos[index] = { ...lfos[index], once };
      return { lfos };
    }),

  setLFOSync: (index, sync) =>
    set((state) => {
      const newLfos = [...state.lfos] as [
        LFOParams,
        LFOParams,
        LFOParams,
        LFOParams,
      ];
      newLfos[index] = { ...newLfos[index], sync };
      return { lfos: newLfos };
    }),

  setLFONodes: (lfoIndex, barIndex, nodes) =>
    set((state) => {
      const newLfos = [...state.lfos] as [
        LFOParams,
        LFOParams,
        LFOParams,
        LFOParams,
      ];
      const newBars = [...newLfos[lfoIndex].bars] as [
        LFONode[],
        LFONode[],
        LFONode[],
        LFONode[],
      ];
      newBars[barIndex] = nodes;
      newLfos[lfoIndex] = { ...newLfos[lfoIndex], bars: newBars };
      return { lfos: newLfos };
    }),

  setLFOPattern: (lfoIndex, pattern) =>
    set((state) => {
      const lfos = [...state.lfos] as [
        LFOParams,
        LFOParams,
        LFOParams,
        LFOParams,
      ];
      lfos[lfoIndex] = {
        ...lfos[lfoIndex],
        bars: pattern.bars,
        rateDivs: pattern.rateDivs,
      };
      return { lfos };
    }),
});
