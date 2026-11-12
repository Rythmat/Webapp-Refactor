/**
 * The class's join code, large enough to read from the back of the room, for
 * the projector's waiting screens (owner, 2026-11-09: Kahoot and Nearpod put
 * the code first). It's the code a student types to join the CLASS; once in,
 * they see the live session on their Classroom page. No student data.
 */
export const JoinCard = ({ code }: { code: string }) => (
  <div className="flex flex-col items-center gap-2 rounded-[1.25rem] border border-white/[0.06] bg-white/[0.04] px-10 py-6 text-white">
    <span className="text-lg text-white/60">
      Join the class · Únete a la clase
    </span>
    <span className="text-6xl font-bold tracking-[0.18em]">{code}</span>
    <span className="text-base text-white/45">Classroom → Join Classroom</span>
  </div>
);
