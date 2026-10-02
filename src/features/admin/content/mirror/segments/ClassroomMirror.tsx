/**
 * Classroom, in the console. A teacher's classroom holds their students and
 * the days they published — people's data, not Music Atlas content. What the
 * console will show here (Teach phase) is read-only: which published days use
 * which songs, artists and events, as a signal for the graph.
 */
export const ClassroomMirror = () => (
  <div className="mx-auto flex max-w-xl flex-col items-center gap-3 px-6 py-24 text-center">
    <p className="text-xs uppercase tracking-wide text-white/40">Classroom</p>
    <p className="text-lg text-white">Teachers’ classrooms</p>
    <p className="text-sm text-white/55">
      Classrooms belong to teachers and students. The console will show which
      published lessons use which songs, artists and events — read-only — when
      the Teach phase lands. The curriculum Music Atlas ships is under Office.
    </p>
  </div>
);
