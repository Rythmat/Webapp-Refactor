import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/components/utilities';

/**
 * Attio-style two-tone statement: a white lead phrase followed by a dimmed
 * continuation, revealed word by word as it scrolls into view.
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
  const words = [
    ...lead.split(' ').map((w) => ({ w, dim: false })),
    ...rest.split(' ').map((w) => ({ w, dim: true })),
  ];
  const cls = cn(
    'max-w-[30ch] text-2xl font-semibold leading-[1.2] tracking-[-0.01em] md:text-[2rem]',
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
        {words.map(({ w, dim }, i) => (
          <motion.span
            key={i}
            className={cn('inline', dim ? 'text-white/45' : 'text-white')}
            variants={{
              hidden: { opacity: 0.08 },
              shown: { opacity: 1 },
            }}
            transition={{ duration: 0.4, delay: i * 0.035 }}
          >
            {w}{' '}
          </motion.span>
        ))}
      </motion.span>
    </Tag>
  );
};
