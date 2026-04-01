import type { LucideIcon } from 'lucide-react';

export type ItemType = 'equipment' | 'cable';

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  icon: LucideIcon;
  description: string;
  color?: string;
  iconClassName?: string;
  iconSize?: number;
  iconFill?: string;
}

export interface Slot {
  id: string;
  type: 'equipment';
  required: string;
  col: number;
  row: number;
  label: string;
}

export interface Connection {
  id: string;
  from: string;
  to: string;
  required: string;
  label: string;
}

export interface Level {
  id: number;
  title: string;
  brief: string;
  slots: Slot[];
  connections: Connection[];
  toolbox: string[];
}

export type SlotStatus = 'empty' | 'filled' | 'highlight' | 'target';
export type ConnectionStatus =
  | 'locked'
  | 'ready'
  | 'connected'
  | 'highlight'
  | 'target';
export type GameState = 'intro' | 'playing' | 'success';
