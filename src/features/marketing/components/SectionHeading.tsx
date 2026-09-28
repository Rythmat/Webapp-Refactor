import { KineticHeadline } from '@/features/landing/motion/KineticHeadline';

/**
 * A section's heading row above its hairline grid, set like the landing's
 * two-tone statements and assembling itself as it scrolls into view.
 */
export const SectionHeading = ({ id, text }: { id: string; text: string }) => (
  <div className="px-6 pb-10 pt-20 md:px-10 md:pt-28">
    <KineticHeadline
      as="h2"
      id={id}
      text={text}
      whenInView
      className="max-w-[30ch] text-2xl font-semibold leading-[1.2] tracking-[-0.01em] text-white md:text-[2rem]"
    />
  </div>
);
