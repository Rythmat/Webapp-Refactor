/**
 * Student "eyes on the projector" panel — shown on media slides (and after
 * submitting) while the shared screen carries the content. Subtle looping
 * pulse around an eye glyph; renders static under prefers-reduced-motion.
 */
import { motion, useReducedMotion } from 'framer-motion';
import { Eye } from 'lucide-react';
import { pickLocalized, secondaryLine } from '../../presentation/localized';
import type { LocalizedText, StudentLanguage } from '../../types';

const WATCH_LABEL: LocalizedText = {
  en: 'Watch the screen',
  es: 'Mira la pantalla',
};

interface WatchTheScreenProps {
  language: StudentLanguage;
  className?: string;
}

export const WatchTheScreen = ({
  language,
  className,
}: WatchTheScreenProps) => {
  const reduce = useReducedMotion();
  const label = pickLocalized(WATCH_LABEL, language);
  const labelAlt = secondaryLine(WATCH_LABEL, language);

  return (
    <div
      className={`flex w-full flex-col items-center gap-5 rounded-3xl border border-white/10 bg-white/[0.03] px-8 py-10 text-center ${className ?? ''}`}
    >
      <div className="relative flex size-20 items-center justify-center">
        {!reduce && (
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full border border-[#7ecfcf]/40"
            animate={{ scale: [1, 1.35], opacity: [0.6, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
        <motion.span
          className="flex size-16 items-center justify-center rounded-full bg-[#7ecfcf]/10 text-[#7ecfcf]"
          animate={
            reduce
              ? undefined
              : { scale: [1, 1.06, 1], opacity: [0.85, 1, 0.85] }
          }
          transition={
            reduce
              ? undefined
              : { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }
          }
        >
          <Eye aria-hidden className="size-8" />
        </motion.span>
      </div>

      <div className="flex flex-col gap-1">
        <p
          className="font-semibold text-white/90"
          style={{ fontSize: 'var(--slide-prompt-fz)' }}
        >
          {label}
        </p>
        {labelAlt && (
          <p
            className="text-white/50"
            style={{ fontSize: 'calc(var(--slide-prompt-fz) * 0.8)' }}
          >
            {labelAlt}
          </p>
        )}
      </div>
    </div>
  );
};
