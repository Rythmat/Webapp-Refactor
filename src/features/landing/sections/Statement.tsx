import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/components/utilities';
import { KEY_CENTERS } from '../music';

/**
 * The lead's reveal strip, three phrase-widths wide: white | the rainbow brand
 * motif (all 12 key-center colors in circle-of-fifths order) | the dim
 * "hidden" white. Sliding it right-to-left sweeps the rainbow across the lead
 * and leaves it white. The edge blends stay inside the middle third so the
 * start (dim) and end (white) frames are untinted.
 */
const RAINBOW_STOPS = KEY_CENTERS.map(
  (k, i) => `${k.color} ${37 + (i / (KEY_CENTERS.length - 1)) * 26}%`,
).join(', ');
const LEAD_SWEEP = `linear-gradient(90deg, #fff 0%, #fff 33.4%, ${RAINBOW_STOPS}, rgba(255, 255, 255, 0.08) 66.6%, rgba(255, 255, 255, 0.08) 100%)`;

/**
 * Attio-style two-tone statement: a white lead phrase followed by a dimmed
 * continuation. As it scrolls into view a rainbow sweeps across the lead,
 * settling on white, then the continuation is revealed word by word.
 */
export const Statement = ({
  lead,
  rest,
  as: Tag = 'h2',
  id,
  className,
}: {
  lead: string;
  rest: string;
  as?: 'h2' | 'h3';
  id?: string;
  className?: string;
}) => {
  const reduce = useReducedMotion();
  const cls = cn(
    'max-w-[30ch] text-2xl leading-[1.2] tracking-[-0.01em] md:text-[2rem]',
    className,
  );

  if (reduce) {
    return (
      <Tag id={id} className={cls}>
        <span className="text-white">{lead}</span>{' '}
        <span className="text-white/45">{rest}</span>
      </Tag>
    );
  }

  return (
    <Tag id={id} className={cls}>
      <span className="sr-only">
        {lead} {rest}
      </span>
      <motion.span
        aria-hidden
        initial="hidden"
        whileInView="shown"
        viewport={{ once: true, margin: '0px 0px -15% 0px' }}
      >
        {/* One inline span, so the strip runs continuously across wrapped lines. */}
        <motion.span
          className="inline bg-clip-text text-transparent [-webkit-background-clip:text]"
          style={{ backgroundImage: LEAD_SWEEP, backgroundSize: '300% 100%' }}
          variants={{
            hidden: { backgroundPosition: '100% 0%' },
            shown: { backgroundPosition: '0% 0%' },
          }}
          transition={{ duration: 1.1, ease: [0.45, 0, 0.25, 1] }}
        >
          {lead}{' '}
        </motion.span>
        {rest.split(' ').map((w, i) => (
          <motion.span
            key={i}
            className="inline text-white/45"
            variants={{
              hidden: { opacity: 0.08 },
              shown: { opacity: 1 },
            }}
            transition={{ duration: 0.4, delay: 0.45 + i * 0.035 }}
          >
            {w}{' '}
          </motion.span>
        ))}
      </motion.span>
    </Tag>
  );
};
