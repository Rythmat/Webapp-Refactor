/**
 * EditorTopBar — the slide editor's chrome: Back, the inline Day-label, a Saved
 * indicator, the language toggle (shared SegmentedControl, so the canvas
 * previews the exact scale students/teachers see), and the action cluster
 * (Preview / Publish / Start Session / Present) lifted from the old DayEditor.
 */
import { ArrowLeft, Check, Eye, Play, Radio, Send, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TeacherRoutes } from '@/constants/routes';
import { SegmentedControl } from '../../presentation/SegmentedControl';
import type { StudentLanguage } from '../../types';

const LANGUAGE_OPTIONS: { value: StudentLanguage; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'es', label: 'ES' },
  { value: 'both', label: 'EN / ES' },
];

interface EditorTopBarProps {
  classroomId: string;
  dayId: string;
  label: string;
  onLabelChange: (v: string) => void;
  savedLabel: string | null;
  language: StudentLanguage;
  onLanguageChange: (l: StudentLanguage) => void;
  publishError: string | null;
  assignActive: boolean;
  onAssign: () => void;
  onPublish: () => void;
  onStartSession: () => void;
}

export const EditorTopBar = ({
  classroomId,
  dayId,
  label,
  onLabelChange,
  savedLabel,
  language,
  onLanguageChange,
  publishError,
  assignActive,
  onAssign,
  onPublish,
  onStartSession,
}: EditorTopBarProps) => (
  <header className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] px-6 py-3">
    <Link
      to={TeacherRoutes.plan({ classroomId })}
      className="inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
    >
      <ArrowLeft className="h-4 w-4" />
      Lessons
    </Link>

    <input
      type="text"
      value={label}
      onChange={(e) => onLabelChange(e.target.value)}
      placeholder="Untitled Day"
      aria-label="Day label"
      className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-lg font-medium text-white placeholder:text-white/30 hover:border-white/10 focus:border-white/25 focus:outline-none"
    />

    {savedLabel && (
      <span className="inline-flex items-center gap-1.5 text-xs text-white/50">
        <Check className="h-3.5 w-3.5" />
        {savedLabel}
      </span>
    )}

    <SegmentedControl
      label="Language"
      options={LANGUAGE_OPTIONS}
      value={language}
      onChange={onLanguageChange}
    />

    <button
      type="button"
      onClick={onAssign}
      aria-pressed={assignActive}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
        assignActive
          ? 'border-emerald-400/50 bg-emerald-400/[0.12] text-emerald-100'
          : 'border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-200 hover:border-emerald-400/50'
      }`}
    >
      <Send className="h-4 w-4" />
      Assign
    </button>
    {publishError && (
      <span className="text-xs text-red-300" role="alert">
        {publishError}
      </span>
    )}

    <Link
      to={TeacherRoutes.dayPreview({ classroomId, dayId })}
      className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-sm text-white/80 transition-colors hover:border-white/25 hover:text-white"
    >
      <Eye className="h-4 w-4" />
      Preview
    </Link>
    <button
      type="button"
      onClick={onPublish}
      className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-sm text-white/80 transition-colors hover:border-white/25 hover:text-white"
    >
      <Upload className="h-4 w-4" />
      Publish
    </button>
    <button
      type="button"
      onClick={onStartSession}
      className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/[0.06] px-3 py-1.5 text-sm text-emerald-200 transition-colors hover:border-emerald-400 hover:text-emerald-100"
    >
      <Radio className="h-4 w-4" />
      Start Session
    </button>
    <Link
      to={TeacherRoutes.present({ classroomId, dayId })}
      className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-black transition-colors hover:bg-white/85"
    >
      <Play className="h-4 w-4" />
      Present
    </Link>
  </header>
);
