/**
 * The class's activity, big (owner, 2026-11-10): its cover and its name, as
 * the whole of a Group or Individual Project slide. The name comes from the
 * activity itself (`describeRef`), so the slide carries no copy of its own.
 */
import { getSong } from '@/curriculum/data/songs';
import { IdCover } from '@/features/office/ui/ClassCover';
import { describeRef } from '../describeRef';

export const ActivityHero = ({
  activityRef,
  compact = false,
}: {
  activityRef: string;
  /** A student's device: smaller, above the launch. */
  compact?: boolean;
}) => {
  const { title, imageUrl } = describeRef(activityRef, { getSong });
  const cover = compact ? 'size-[120px]' : 'size-[232px]';
  return (
    <div
      data-activity-hero=""
      className={`flex items-center ${compact ? 'gap-6' : 'gap-10'}`}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          draggable={false}
          className={`${cover} shrink-0 rounded-[28px] object-cover`}
        />
      ) : (
        <IdCover id={activityRef} className={`${cover} rounded-[28px]`} />
      )}
      <p
        className="min-w-0 font-semibold leading-[1.05] text-white"
        style={{
          fontSize: compact
            ? 'var(--slide-question-fz)'
            : 'calc(var(--slide-question-fz) * 1.1)',
        }}
      >
        {title}
      </p>
    </div>
  );
};
