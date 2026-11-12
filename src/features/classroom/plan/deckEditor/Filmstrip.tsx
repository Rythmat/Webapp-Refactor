/**
 * Filmstrip — the slide rail beneath the canvas, in the lesson's six sections
 * (Connect → Reflect). Each section is a labelled group of pixel-faithful
 * thumbnails (SlideThumbnail) with its own "Add" menu offering what that
 * section is for, so a new slide always lands in its place. Arrows reorder
 * within a section; moving between sections is the Inspector's Section field.
 * A quiet banner offers "Sort by section" if a deck drifts out of order.
 */
import { ArrowLeftRight, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { MicroLabel } from '@/components/kit';
import { cn } from '@/components/utilities';
import {
  Button,
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuTrigger,
} from '@/daw/ui';
import type { DaySnapshot } from '../../publish/publishDay';
import {
  findDanglingInteractionIds,
  interactionsForSlide,
  slideInteractionIds,
} from '../../slides/deck';
import {
  SECTION_HINT,
  SECTION_LABEL,
  groupSlidesBySection,
  sectionNumber,
  sectionOf,
  slidesAreSectionOrdered,
  type SlideSection,
} from '../../slides/sections';
import type { Slide } from '../../slides/types';
import { SlideThumbnail } from './SlideThumbnail';
import { SECTION_ADD_OPTIONS, type SectionAddOption } from './sectionMenu';

interface FilmstripProps {
  slides: Slide[];
  selectedIndex: number;
  /** Published snapshot for the current draft — used to flag dangling refs. */
  snapshot: DaySnapshot;
  onSelect: (index: number) => void;
  onAdd: (section: SlideSection, option: SectionAddOption) => void;
  onDuplicate: (index: number) => void;
  onDelete: (index: number) => void;
  onMove: (index: number, delta: number) => void;
  onSortBySection: () => void;
}

const sectionTitle = (section: SlideSection) =>
  `${sectionNumber(section)} · ${SECTION_LABEL[section].en}`;

const SectionAdd = ({
  section,
  empty,
  onAdd,
}: {
  section: SlideSection;
  empty: boolean;
  onAdd: FilmstripProps['onAdd'];
}) => (
  <Menu>
    <MenuTrigger asChild>
      <button
        type="button"
        aria-label={`Add a slide to ${SECTION_LABEL[section].en}`}
        className={cn(
          'flex shrink-0 flex-col items-center justify-center gap-1 rounded-[0.75rem] border border-dashed border-white/15 text-daw-text-3 transition-colors hover:border-white/35 hover:text-daw-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
          empty ? 'aspect-video w-40' : 'h-[5.625rem] w-10',
        )}
      >
        <Plus className="size-4" />
        {empty && <span className="text-[0.75rem]">Add a slide</span>}
      </button>
    </MenuTrigger>
    <MenuContent align="start" side="top" sideOffset={6} className="w-56">
      <MenuLabel>Add to {SECTION_LABEL[section].en}</MenuLabel>
      {SECTION_ADD_OPTIONS[section].map((option) => (
        <MenuItem key={option.label} onSelect={() => onAdd(section, option)}>
          {option.label}
        </MenuItem>
      ))}
    </MenuContent>
  </Menu>
);

export const Filmstrip = ({
  slides,
  selectedIndex,
  snapshot,
  onSelect,
  onAdd,
  onDuplicate,
  onDelete,
  onMove,
  onSortBySection,
}: FilmstripProps) => {
  const danglingIds = new Set(findDanglingInteractionIds(snapshot));
  const ordered = slidesAreSectionOrdered(slides);
  const groups = groupSlidesBySection(slides);
  const sameSection = (a: number, b: number) =>
    slides[a] !== undefined &&
    slides[b] !== undefined &&
    sectionOf(slides[a]) === sectionOf(slides[b]);

  return (
    <div className="flex flex-col gap-2">
      {!ordered && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[0.8125rem] text-daw-text-2">
          <span>Some slides are out of section order.</span>
          <Button variant="secondary" size="md" onClick={onSortBySection}>
            <ArrowLeftRight />
            Sort by section
          </Button>
        </div>
      )}

      <div className="flex items-start overflow-x-auto pb-1">
        {groups.map(({ section, slides: inSection }, g) => (
          <section
            key={section}
            aria-label={sectionTitle(section)}
            data-section={section}
            className={cn(
              'flex shrink-0 flex-col gap-2 px-3',
              g === 0 ? 'pl-0' : 'border-l border-white/[0.08]',
            )}
          >
            <header
              className="flex items-baseline gap-2"
              title={SECTION_HINT[section]}
            >
              <MicroLabel className="text-daw-text-2">
                {sectionTitle(section)}
              </MicroLabel>
              <span className="text-[0.6875rem] text-daw-text-3 max-2xl:hidden">
                {inSection.length === 0 ? SECTION_HINT[section] : null}
              </span>
            </header>
            <div className="flex items-start gap-2">
              {inSection.map(({ slide, index }) => (
                <div key={slide.id} className="flex flex-col gap-1">
                  <SlideThumbnail
                    slide={slide}
                    index={index}
                    selected={index === selectedIndex}
                    interactions={interactionsForSlide(snapshot, slide)}
                    dangling={slideInteractionIds(slide).some((id) =>
                      danglingIds.has(id),
                    )}
                    canDelete={slides.length > 1}
                    onSelect={() => onSelect(index)}
                    onDuplicate={() => onDuplicate(index)}
                    onDelete={() => onDelete(index)}
                  />
                  {inSection.length > 1 && (
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => onMove(index, -1)}
                        disabled={!sameSection(index, index - 1)}
                        aria-label="Move slide earlier"
                        className="rounded p-0.5 text-daw-text-3 hover:text-daw-text disabled:opacity-20"
                      >
                        <ChevronLeft className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onMove(index, 1)}
                        disabled={!sameSection(index, index + 1)}
                        aria-label="Move slide later"
                        className="rounded p-0.5 text-daw-text-3 hover:text-daw-text disabled:opacity-20"
                      >
                        <ChevronRight className="size-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <SectionAdd
                section={section}
                empty={inSection.length === 0}
                onAdd={onAdd}
              />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
