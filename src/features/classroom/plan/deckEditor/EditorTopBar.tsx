/**
 * EditorTopBar — the slide editor's chrome: Back, the inline Day-label, a Saved
 * indicator, the Settings pill (student-language selector), the `textTool` slot
 * (per-block font size / bold / alignment), and the `chooseContent` slot (the
 * "+ Choose content" affordance for content slides). The old action cluster
 * (Assign / Preview / Publish / Start Session / Present) now lives elsewhere in
 * the app.
 */
import { ArrowLeft, Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { TeacherRoutes } from '@/constants/routes';
import type { StudentLanguage } from '../../types';
import { EditorSettingsMenu } from './EditorSettingsMenu';

interface EditorTopBarProps {
  classroomId: string;
  label: string;
  onLabelChange: (v: string) => void;
  savedLabel: string | null;
  language: StudentLanguage;
  onLanguageChange: (l: StudentLanguage) => void;
  /** The text-format tool ("Text" pill) — formats the selected text block. */
  textTool?: ReactNode;
  /** The "+ Choose content" control — rendered only for content slides. */
  chooseContent?: ReactNode;
}

export const EditorTopBar = ({
  classroomId,
  label,
  onLabelChange,
  savedLabel,
  language,
  onLanguageChange,
  textTool,
  chooseContent,
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

    <EditorSettingsMenu
      language={language}
      onLanguageChange={onLanguageChange}
    />

    {textTool}

    {chooseContent}
  </header>
);
