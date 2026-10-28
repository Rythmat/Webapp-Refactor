import type { ReactNode } from 'react';
import { cn } from '@/components/utilities';

/**
 * Metadata in small caps over a title: "FEATURED — MULTIPLAYER" (the
 * Muzaic "POP — EPIC" line). The Studio's micro step (bold, uppercase,
 * 0.08em, its dimmest text, src/daw/ui/tokens.ts) in rem, so it follows
 * the app's 110% scale.
 */
export const MICRO_LABEL =
  'text-[0.6875rem] font-bold uppercase leading-[1.27] tracking-[0.08em] text-daw-text-3';

/** "Featured — Multiplayer": the parts, empty ones dropped. */
export const microLabel = (
  ...parts: (string | false | null | undefined)[]
): string => parts.filter(Boolean).join(' — ');

export function MicroLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={cn(MICRO_LABEL, className)}>{children}</span>;
}
