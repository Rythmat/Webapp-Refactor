/**
 * EditorSettingsMenu — the slide editor's "Settings" pill: the language the
 * slides are previewed in (EN / ES / both), in the Studio's popover.
 */
import { Settings } from 'lucide-react';
import { MicroLabel } from '@/components/kit';
import { Button } from '@/daw/ui/Button';
import { Popover, PopoverContent, PopoverTrigger } from '@/daw/ui/Popover';
import { Segmented, type SegmentedOption } from '@/daw/ui/Segmented';
import type { StudentLanguage } from '../../types';

const LANGUAGE_OPTIONS: SegmentedOption<StudentLanguage>[] = [
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
      <Button variant="pill" size="pill" aria-label="Editor settings">
        <Settings aria-hidden />
        Settings
      </Button>
    </PopoverTrigger>
    <PopoverContent align="end" className="flex flex-col gap-2">
      <MicroLabel>Language</MicroLabel>
      <Segmented<StudentLanguage>
        label="Language"
        options={LANGUAGE_OPTIONS}
        value={language}
        onValueChange={onLanguageChange}
      />
    </PopoverContent>
  </Popover>
);
