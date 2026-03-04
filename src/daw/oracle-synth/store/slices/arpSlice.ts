import { StateCreator } from 'zustand';
import type { ArpParams } from '../../audio/types';

export const DEFAULT_ARP: ArpParams = {
  enabled: false,
  rate: '1/8',
  style: 'up',
  distance: 12,
  step: 1,
};

export interface ArpSlice {
  arp: ArpParams;
  setArpParam: <K extends keyof ArpParams>(key: K, value: ArpParams[K]) => void;
}

export const createArpSlice: StateCreator<ArpSlice, [], [], ArpSlice> = (set) => ({
  arp: structuredClone(DEFAULT_ARP),

  setArpParam: (key, value) =>
    set((state) => ({
      arp: { ...state.arp, [key]: value },
    })),
});
