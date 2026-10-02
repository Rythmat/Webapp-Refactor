import { cn } from '@/components/utilities';
import { defaultGraphSettings, SLIDER_RANGES } from '../model/graphSettings';
import {
  TAG_FAMILIES,
  TAG_FAMILY_LABEL,
  type TagFamily,
} from '../model/nodeRoles';
import {
  PANEL_FOCUS_RING,
  SettingSearch,
  SettingSlider,
  SettingToggle,
  type GraphFilterSettings,
  type GraphMode,
} from './SettingControls';

/**
 * The Filters section: what the graph draws.
 *
 * It follows Obsidian's Filters in order and wording, with the Atlas's
 * words for its things: the search box, then (in a local graph) Depth and
 * the three link switches, then Tags, Curriculum (Obsidian's
 * "Attachments") and "Existing items only". The Atlas adds a switch each
 * for guessed and unconfirmed links, and, while Tags is on, a row of chips
 * that turn each tag family on or off; tags are hidden at first because
 * genres, years and keys each link to hundreds of items and would pull the
 * layout into stars. Orphans is the global graph's alone, as in Obsidian.
 *
 * Settings a mode does not have are read as Obsidian's defaults, so the
 * section draws correctly from either mode's settings.
 *
 * The local graph's depth can live outside the settings: the Mind Map keeps
 * it in the URL so a copied link opens at the same depth. The page then
 * passes `depth` and `onDepthChange`, and the slider follows the URL alone.
 */

/** Obsidian's defaults, read where a mode's settings lack a field. */
const DEFAULTS = defaultGraphSettings();
const LOCAL_DEFAULTS = DEFAULTS.local.filters;
const GLOBAL_DEFAULTS = DEFAULTS.global.filters;

export interface FiltersSectionProps {
  mode: GraphMode;
  filters: GraphFilterSettings;
  onChange: (patch: Partial<GraphFilterSettings>) => void;
  /**
   * The local graph's depth from outside the settings (the Mind Map's URL).
   * Given, it wins over `filters.depth`, and the slider reports through
   * `onDepthChange` instead of `onChange`.
   */
  depth?: number;
  onDepthChange?: (depth: number) => void;
}

export function FiltersSection({
  mode,
  filters,
  onChange,
  depth: outsideDepth,
  onDepthChange,
}: FiltersSectionProps) {
  const local = mode === 'local';
  const depth = outsideDepth ?? filters.depth ?? LOCAL_DEFAULTS.depth;
  const setDepth = (next: number) =>
    onDepthChange ? onDepthChange(next) : onChange({ depth: next });
  return (
    <>
      <SettingSearch
        label="Search items"
        placeholder="Search items…"
        value={filters.search}
        onCommit={(search) => onChange({ search })}
      />
      {local ? (
        <>
          <SettingSlider
            label="Depth"
            description="Show items this number of links away"
            value={depth}
            {...SLIDER_RANGES.depth}
            onValueChange={setDepth}
          />
          <SettingToggle
            label="Incoming links"
            description="Show links from other items"
            checked={filters.incoming ?? LOCAL_DEFAULTS.incoming}
            onCheckedChange={(incoming) => onChange({ incoming })}
          />
          <SettingToggle
            label="Outgoing links"
            description="Show links to other items"
            checked={filters.outgoing ?? LOCAL_DEFAULTS.outgoing}
            onCheckedChange={(outgoing) => onChange({ outgoing })}
          />
          <SettingToggle
            label="Neighbor links"
            description="Show links between neighbors"
            checked={filters.neighborLinks ?? LOCAL_DEFAULTS.neighborLinks}
            onCheckedChange={(neighborLinks) => onChange({ neighborLinks })}
          />
        </>
      ) : null}
      <SettingToggle
        label="Tags"
        description="Genres, years, keys, instruments and regions, linked to the items that carry them"
        checked={filters.tags}
        onCheckedChange={(tags) => onChange({ tags })}
      />
      {filters.tags ? (
        <TagFamilyChips
          families={filters.tagFamilies}
          onChange={(tagFamilies) => onChange({ tagFamilies })}
        />
      ) : null}
      <SettingToggle
        label="Curriculum"
        description="Show teach days and pathways"
        checked={filters.curriculum}
        onCheckedChange={(curriculum) => onChange({ curriculum })}
      />
      <SettingToggle
        label="Existing items only"
        description="When enabled, links to items that do not exist yet are not shown"
        checked={filters.existingOnly}
        onCheckedChange={(existingOnly) => onChange({ existingOnly })}
      />
      <SettingToggle
        label="Guessed links"
        description="Show links guessed from a name"
        checked={filters.guessed}
        onCheckedChange={(guessed) => onChange({ guessed })}
      />
      <SettingToggle
        label="Unconfirmed links"
        description="Show links nobody has confirmed yet"
        checked={filters.unconfirmed}
        onCheckedChange={(unconfirmed) => onChange({ unconfirmed })}
      />
      {local ? null : (
        <SettingToggle
          label="Orphans"
          description="Show items that are not linked to any other item"
          checked={filters.orphans ?? GLOBAL_DEFAULTS.orphans}
          onCheckedChange={(orphans) => onChange({ orphans })}
        />
      )}
    </>
  );
}

interface TagFamilyChipsProps {
  families: Readonly<Record<TagFamily, boolean>>;
  onChange: (families: Record<TagFamily, boolean>) => void;
}

/**
 * The tag families as a row of pressable chips under the Tags switch. A
 * pressed chip draws that family. Each change hands back the whole set, so
 * the settings never hold half a record.
 */
function TagFamilyChips({ families, onChange }: TagFamilyChipsProps) {
  return (
    <div
      role="group"
      aria-label="Tag families"
      className="flex flex-wrap gap-1.5 pb-1.5 pt-0.5"
    >
      {TAG_FAMILIES.map((family) => {
        const on = families[family] ?? true;
        return (
          <button
            key={family}
            type="button"
            aria-pressed={on}
            onClick={() => onChange({ ...families, [family]: !on })}
            className={cn(
              'rounded-full border px-2 py-0.5 text-xs leading-4 transition-colors',
              PANEL_FOCUS_RING,
              on
                ? 'border-white/50 bg-white/[0.14] text-foreground hover:bg-white/20'
                : 'border-input text-muted-foreground hover:border-white/25 hover:text-foreground',
            )}
          >
            {TAG_FAMILY_LABEL[family]}
          </button>
        );
      })}
    </div>
  );
}
