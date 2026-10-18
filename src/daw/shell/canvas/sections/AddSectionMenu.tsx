import { BookOpen, Pencil, Plus } from 'lucide-react';
import { forwardRef, useState, type CSSProperties } from 'react';
import { cn } from '@/components/utilities';
import {
  SECTION_TYPES,
  sectionTypeInfo,
  type SectionType,
} from '@/daw/model/sections';
import { Button } from '@/daw/ui/Button';
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
} from '@/daw/ui/Menu';
import { TYPE_CLASS } from '@/daw/ui/styles';
import {
  addNamedSection,
  addSectionOfType,
  openSongFormLesson,
} from './sectionActions';

// ── + Section (milestone 2.13) ─────────────────────────────────────────────
//
// The sections lane's add button and its list: the six kinds most songs use,
// then the rest, then a name of the student's own (Soundtrap's list, anatomy
// §3, on UNISON's vocabulary). The kind under the pointer or the focus says
// what it does in a song on the line under the list, so the list stays
// short enough for a Chromebook. A new section is 8 bars, after the last.

const COMMON = SECTION_TYPES.filter((t) => t.common);
const MORE = SECTION_TYPES.filter((t) => !t.common);

interface AddSectionMenuProps {
  /** Where the button sits in the lane (SectionsLane places it). */
  style?: CSSProperties;
  onAdded?: (id: string) => void;
}

export const AddSectionMenu = forwardRef<
  HTMLButtonElement,
  AddSectionMenuProps
>(function AddSectionMenu({ style, onAdded }, ref) {
  const [hint, setHint] = useState<SectionType | null>(null);
  const item = (type: SectionType, name: string) => (
    <MenuItem
      key={type}
      data-item={`add:${type}`}
      onFocus={() => setHint(type)}
      onSelect={() => onAdded?.(addSectionOfType(type))}
    >
      {name}
    </MenuItem>
  );
  const info = hint ? sectionTypeInfo(hint) : null;
  return (
    <Menu onOpenChange={(open) => !open && setHint(null)}>
      <MenuTrigger asChild>
        <Button
          ref={ref}
          size="sm"
          variant="ghost"
          data-testid="add-section"
          aria-label="Add a section"
          className="absolute top-0 bg-daw-surface-1"
          style={style}
        >
          <Plus aria-hidden />
          Section
        </Button>
      </MenuTrigger>
      <MenuContent
        align="start"
        data-ds="v2"
        data-testid="add-section-menu"
        aria-label="Add a section"
        className="max-h-[var(--radix-dropdown-menu-content-available-height)] w-64 overflow-y-auto"
      >
        {COMMON.map((t) => item(t.type, t.name))}
        <MenuSeparator />
        <MenuLabel>More</MenuLabel>
        {MORE.map((t) => item(t.type, t.name))}
        <MenuSeparator />
        <MenuItem
          data-item="add:custom"
          icon={<Pencil aria-hidden />}
          onFocus={() => setHint('custom')}
          onSelect={() => {
            void addNamedSection().then((id) => id && onAdded?.(id));
          }}
        >
          Custom name…
        </MenuItem>
        <MenuItem
          data-item="learnSections"
          icon={<BookOpen aria-hidden />}
          onFocus={() => setHint(null)}
          onSelect={openSongFormLesson}
        >
          About song sections
        </MenuItem>
        <MenuSeparator />
        <p
          aria-live="polite"
          data-testid="add-section-hint"
          className={cn(
            TYPE_CLASS.label,
            'min-h-[2.5rem] px-2 pb-1 pt-1 text-daw-text-2',
          )}
        >
          {info
            ? `${info.name}: ${info.purpose}`
            : 'A new section is 8 bars, after the last one.'}
        </p>
      </MenuContent>
    </Menu>
  );
});
