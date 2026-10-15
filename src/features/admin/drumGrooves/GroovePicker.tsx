import { ExternalLink } from 'lucide-react';
import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { AdminRoutes } from '@/constants/routes';
import { CODE_GROOVES } from '@/curriculum/engine/drumGrooves/codeGrooves';
import { InlineSelect } from '../content/visual/Editable';
import { useGrooveList } from './grooveSession';

/** Radix Select can't hold an empty value; this stands for "no override". */
const INHERIT = '__inherit';

/**
 * A step's groove: inherit the style's, or name a designed or code groove.
 * Drafts are listed (marked) so a step can be pointed at one before it's
 * published, but lessons only play it once it is.
 */
export const GroovePicker: FC<{
  value: string | undefined;
  onChange: (grooveId: string | undefined) => void;
}> = ({ value, onChange }) => {
  const designed = useGrooveList();
  const designedIds = new Set(designed.map((g) => g.id));

  const options = [
    { value: INHERIT, label: 'inherit (style default)' },
    ...designed.map((g) => ({
      value: g.id,
      label: `${g.genre ? `${g.genre} · ` : ''}${g.name}${g.status === 'draft' ? ' (draft — plays the code until published)' : ''}`,
    })),
    ...CODE_GROOVES.filter((g) => !designedIds.has(g.id)).map((g) => ({
      value: g.id,
      label: `${g.label} (code)`,
    })),
  ];
  if (value && !options.some((o) => o.value === value)) {
    options.push({ value, label: `${value} (unknown — plays the default)` });
  }

  return (
    <span className="inline-flex items-center gap-1">
      <InlineSelect
        value={value ?? INHERIT}
        onChange={(next) => onChange(next === INHERIT ? undefined : next)}
        options={options}
        ariaLabel="Groove"
        className="text-xs"
      />
      {value && designedIds.has(value) && (
        <Link
          to={AdminRoutes.drumGroove({ id: value })}
          className="text-white/40 hover:text-white"
          aria-label="Open in the Drum Grooves designer"
          title="Open in the Drum Grooves designer"
        >
          <ExternalLink className="size-3.5" />
        </Link>
      )}
    </span>
  );
};
