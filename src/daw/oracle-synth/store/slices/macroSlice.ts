import { StateCreator } from 'zustand';
import { MacroParams, MACRO_COUNT } from '../../audio/types';

export function defaultMacros(): MacroParams[] {
  return Array.from({ length: MACRO_COUNT }, (_, i) => ({
    name: `MACRO ${i + 1}`,
    value: 0,
  }));
}

export interface MacroSlice {
  macros: MacroParams[];
  setMacroValue: (index: number, value: number) => void;
  setMacroName: (index: number, name: string) => void;
}

export const createMacroSlice: StateCreator<MacroSlice, [], [], MacroSlice> = (
  set,
) => ({
  macros: defaultMacros(),

  setMacroValue: (index, value) =>
    set((state) => ({
      macros: state.macros.map((m, i) => (i === index ? { ...m, value } : m)),
    })),

  setMacroName: (index, name) =>
    set((state) => ({
      macros: state.macros.map((m, i) => (i === index ? { ...m, name } : m)),
    })),
});
