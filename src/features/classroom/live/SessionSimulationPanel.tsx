/**
 * DEV-ONLY simulation harness for TeacherSessionDashboard. Renders `null`
 * outside `import.meta.env.DEV` so Vite tree-shakes the panel + all sim-store
 * calls from production bundles.
 */
import { Beaker, Bot, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useMe } from '@/hooks/data';
import type { PhaseKey } from '../phases';
import type { PublishedDay } from '../publish/usePublishedDays';
import {
  autoRespondForUser,
  clearSimulationForUser,
  readSimStoreForUser,
  seedStudentsForUser,
} from './simulationStore';

export interface SessionSimulationPanelProps {
  classroomId: string;
  sessionId: string;
  publishedDay: PublishedDay | undefined;
  currentPhase: PhaseKey;
}

export const SessionSimulationPanel = ({
  classroomId,
  sessionId,
  publishedDay,
  currentPhase,
}: SessionSimulationPanelProps) => {
  const { data: me } = useMe();
  const userId = me?.id ?? null;
  const [count, setCount] = useState(5);
  const [message, setMessage] = useState<string | null>(null);

  const seededIds = () =>
    readSimStoreForUser(userId).bySession[sessionId] ?? [];

  const handleSeed = () => {
    const { createdEnrollmentIds } = seedStudentsForUser(userId, sessionId, {
      classroomId,
      count,
    });
    setMessage(`Seeded ${createdEnrollmentIds.length} student(s).`);
  };

  const handleAutoRespond = () => {
    if (!publishedDay) {
      setMessage('No published Day for this session yet.');
      return;
    }
    const enrollmentIds = seededIds();
    if (enrollmentIds.length === 0) {
      setMessage('No seeded students — click "Seed" first.');
      return;
    }
    const { dispatched } = autoRespondForUser(userId, {
      sessionId,
      phaseKey: currentPhase,
      publishedDay,
      enrollmentIds,
    });
    setMessage(
      `Dispatched ${dispatched} response(s) for phase ${currentPhase}.`,
    );
  };

  const handleClear = () => {
    const { removedEnrollmentIds } = clearSimulationForUser(userId, sessionId);
    setMessage(`Cleared ${removedEnrollmentIds.length} seeded student(s).`);
  };

  return (
    <section className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-400/[0.03] p-4 text-white">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-amber-300">
        <Beaker className="h-3.5 w-3.5" />
        DEV ONLY — Multi-user simulation
      </div>
      <p className="mt-1 text-xs text-white/60">
        Seed fake students, auto-respond to the current phase, and clean up.
        Tree-shakes out of prod builds.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-2 text-xs text-white/70">
          Count
          <input
            type="number"
            min={1}
            max={40}
            value={count}
            onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))}
            className="w-16 rounded-md border border-white/10 bg-white/[0.02] px-2 py-1 text-xs text-white focus:border-white/25 focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={handleSeed}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/80 hover:border-white/25 hover:text-white"
        >
          Seed {count} students
        </button>
        <button
          type="button"
          onClick={handleAutoRespond}
          className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1.5 text-xs font-medium text-black hover:bg-amber-300"
        >
          <Bot className="h-3.5 w-3.5" />
          Auto-respond to current phase
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/80 hover:border-white/25 hover:text-white"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear simulation
        </button>
      </div>
      {message && (
        <p className="mt-2 text-xs text-white/60" role="status">
          {message}
        </p>
      )}
    </section>
  );
};
