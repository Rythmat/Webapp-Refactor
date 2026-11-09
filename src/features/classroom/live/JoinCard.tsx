/**
 * The class's join code, large enough to read from the back of the room, for
 * the projector's waiting screens (owner, 2026-11-09: Kahoot and Nearpod put
 * the code first). It's the code a student types to join the CLASS; once in,
 * they see the live session on their Classroom page. No student data.
 */
export const JoinCard = ({
  code,
  tone = 'dark',
}: {
  code: string;
  /** 'light' on the cream legacy board, 'dark' on the deck's. */
  tone?: 'dark' | 'light';
}) => {
  const light = tone === 'light';
  return (
    <div
      className={
        light
          ? 'flex flex-col items-center gap-2 rounded-3xl border border-black/10 bg-white/60 px-10 py-6 text-[#1a1a1a]'
          : 'flex flex-col items-center gap-2 rounded-3xl border border-white/10 bg-white/[0.04] px-10 py-6 text-white'
      }
    >
      <span
        className={light ? 'text-lg text-black/60' : 'text-lg text-white/60'}
      >
        Join the class · Únete a la clase
      </span>
      <span className="text-6xl font-bold tracking-[0.18em]">{code}</span>
      <span
        className={
          light ? 'text-base text-black/50' : 'text-base text-white/45'
        }
      >
        Classroom → Join Classroom
      </span>
    </div>
  );
};
