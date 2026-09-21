import { useMemo, type CSSProperties, type ReactNode } from 'react';
import type { NotationScore } from '@/lib/notation';
import { StaffView, type NoteStyle, type StaffViewProps } from './StaffView';

export type { NoteStyle };

export interface GrandStaffProps {
  score: NotationScore;
  /** Styles by piano-roll note id. */
  noteStyles?: ReadonlyMap<string, NoteStyle>;
  /** Tick to draw the playhead at; none when null/undefined. */
  playheadTick?: number | null;
  /** Shrink (down to 70%) so every system fits the height when possible. */
  fitHeight?: boolean;
  /** Called with the drawn layout, for positioning an overlay. */
  onLayout?: StaffViewProps['onLayout'];
  /** Drawn over the staves, scrolling with them — chord symbols, markers. */
  overlay?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** One part on its own staves — a lesson's notes, or a Studio clip. */
export function GrandStaff({ score, ...rest }: GrandStaffProps) {
  const parts = useMemo(() => [{ id: 'part', score }], [score]);
  return <StaffView parts={parts} {...rest} />;
}
