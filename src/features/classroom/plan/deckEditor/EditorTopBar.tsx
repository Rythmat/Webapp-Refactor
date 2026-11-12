/**
 * EditorTopBar — the slide editor's chrome: Back, the inline lesson name, the
 * Settings pill (student-language selector), the `textTool` slot
 * (per-block font size / bold / alignment), and the `chooseContent` slot (the
 * "+ Choose content" affordance for content slides). The old action cluster
 * (Assign / Preview / Publish / Start Session / Present) now lives elsewhere in
 * the app.
 */
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { OFFICE_LESSONS_SCOPE } from '@/constants/officeScopes';
import { OfficeRoutes, TeacherRoutes } from '@/constants/routes';
import type { StudentLanguage } from '../../types';
import { EditorSettingsMenu } from './EditorSettingsMenu';

interface EditorTopBarProps {
  classroomId: string;
  label: string;
  onLabelChange: (v: string) => void;
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
  language,
  onLanguageChange,
  textTool,
  chooseContent,
}: EditorTopBarProps) => (
  // The editor's own toolbar, under the Office's top rail: back to Plan and
  // the lesson's name, then the slide tools in one pill zone (Saved and the
  // lesson's verbs live on the top rail).
  <header className="flex flex-wrap items-center gap-2 px-4 pb-1 pt-4 md:px-6">
    <Link
      to={
        classroomId === OFFICE_LESSONS_SCOPE
          ? OfficeRoutes.lessons()
          : TeacherRoutes.plan({ classroomId })
      }
      aria-label={
        classroomId === OFFICE_LESSONS_SCOPE
          ? 'Back to Lessons'
          : 'Back to Plan'
      }
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-daw-text-3 transition-colors hover:bg-white/[0.06] hover:text-daw-text"
    >
      <ArrowLeft className="h-4 w-4" />
    </Link>

    <input
      type="text"
      value={label}
      onChange={(e) => onLabelChange(e.target.value)}
      placeholder="Untitled lesson"
      aria-label="Lesson name"
      className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-[1.25rem] tracking-[-0.01em] text-daw-text placeholder:text-daw-text-3 hover:border-white/10 focus:border-white/25 focus:outline-none"
    />

    <div className="flex flex-wrap items-center gap-1.5">
      <EditorSettingsMenu
        language={language}
        onLanguageChange={onLanguageChange}
      />
      {textTool}
      {chooseContent}
    </div>
  </header>
);
