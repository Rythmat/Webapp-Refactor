import { useCountUp } from '@/components/atlas/hooks/useCountUp';

/**
 * A number counting up as its card lands. Readers hear the final number
 * once (sr-only), not the digits in between.
 */
export function CountUp({
  value,
  delayMs = 0,
}: {
  value: number;
  delayMs?: number;
}) {
  const shown = useCountUp(value, delayMs);
  return (
    <>
      <span aria-hidden className="tabular-nums">
        {shown.toLocaleString('en')}
      </span>
      <span className="sr-only">{value.toLocaleString('en')}</span>
    </>
  );
}
