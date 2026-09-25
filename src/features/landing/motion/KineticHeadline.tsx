import { motion, useReducedMotion } from 'framer-motion';
import { Fragment } from 'react';
import { cn } from '@/components/utilities';

type HeadingTag = 'h1' | 'h2' | 'h3' | 'p';

const EASE = [0.2, 0.8, 0.2, 1] as const;

/**
 * Kinetic headline — the text assembles itself word by word (or letter by
 * letter): each piece rises, un-tilts and un-blurs into place with a stagger.
 *
 * The real heading text stays in the DOM (visually hidden) for SEO and screen
 * readers; the animated pieces are `aria-hidden`. Glacial Indifference has no
 * variable axes, so motion comes from transforms, not font weight.
 *
 * `whenInView` defers the animation until the heading scrolls into view (for
 * section headings); otherwise it plays on mount (the hero H1). Only
 * transform/filter animate — the pieces start at near-zero opacity (not 0) so
 * the hero H1 still counts as the LCP element on first paint.
 */
export const KineticHeadline = ({
  text,
  as = 'h2',
  split = 'word',
  delay = 0,
  stagger = 0.06,
  whenInView = false,
  className,
  id,
}: {
  text: string;
  as?: HeadingTag;
  split?: 'word' | 'char';
  delay?: number;
  stagger?: number;
  whenInView?: boolean;
  className?: string;
  id?: string;
}) => {
  const reduce = useReducedMotion();
  const Tag = as;
  const words = text.split(' ');

  if (reduce) {
    return (
      <Tag id={id} className={className}>
        {words.map((w, i) => (
          <Fragment key={`${w}-${i}`}>
            {i > 0 && ' '}
            <span>{w}</span>
          </Fragment>
        ))}
      </Tag>
    );
  }

  const hidden = {
    opacity: 0.001,
    y: '0.55em',
    rotateX: -50,
    filter: 'blur(8px)',
  };
  const shown = { opacity: 1, y: '0em', rotateX: 0, filter: 'blur(0px)' };
  const trigger = whenInView
    ? {
        whileInView: 'shown',
        viewport: { once: true, margin: '0px 0px -10% 0px' },
      }
    : { animate: 'shown' };

  let pieceIndex = 0;
  const piece = (content: string, key: string) => {
    const i = pieceIndex++;
    return (
      <motion.span
        key={key}
        className="inline-block will-change-transform"
        variants={{ hidden, shown }}
        transition={{
          duration: 0.8,
          ease: EASE,
          delay: delay + i * (split === 'char' ? stagger / 2.5 : stagger),
        }}
      >
        {content}
      </motion.span>
    );
  };

  return (
    <Tag id={id} className={cn('[perspective:800px]', className)}>
      <span className="sr-only">{text}</span>
      <motion.span aria-hidden initial="hidden" {...trigger}>
        {words.map((w, wi) => {
          return (
            <Fragment key={`${w}-${wi}`}>
              {wi > 0 && ' '}
              {split === 'word' ? (
                piece(w, `w${wi}`)
              ) : (
                <span className="inline-block whitespace-nowrap">
                  {Array.from(w).map((ch, ci) => piece(ch, `c${wi}-${ci}`))}
                </span>
              )}
            </Fragment>
          );
        })}
      </motion.span>
    </Tag>
  );
};
