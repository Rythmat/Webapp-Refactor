/**
 * EditorSettingsMenu — the slide editor's "Settings" toolbar pill. A gear button
 * opens a popover holding per-editor options; for now that's the student-language
 * selector (EN / ES / bilingual), moved off the toolbar row to declutter it.
 */
import { Settings } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { SegmentedControl } from '../../presentation/SegmentedControl';
import type { StudentLanguage } from '../../types';

const LANGUAGE_OPTIONS: { value: StudentLanguage; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'es', label: 'ES' },
  { value: 'both', label: 'EN / ES' },
];

interface EditorSettingsMenuProps {
  language: StudentLanguage;
  onLanguageChange: (l: StudentLanguage) => void;
}

export const EditorSettingsMenu = ({
  language,
  onLanguageChange,
}: EditorSettingsMenuProps) => (
  <Popover>
    <PopoverTrigger asChild>
      <button
        type="button"
        aria-label="Editor settings"
        className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-sm text-white/80 transition-colors hover:border-white/25 hover:text-white"
      >
        <Settings className="h-4 w-4" />
        Settings
      </button>
    </PopoverTrigger>
    <PopoverContent
      align="end"
      className="w-auto rounded-2xl border-white/10 bg-neutral-950 p-4 text-white shadow-2xl"
    >
      <p className="mb-2 text-xs uppercase tracking-wider text-white/40">
        Language
      </p>
      <SegmentedControl
        label="Language"
        options={LANGUAGE_OPTIONS}
        value={language}
        onChange={onLanguageChange}
      />
    </PopoverContent>
  </Popover>
);
