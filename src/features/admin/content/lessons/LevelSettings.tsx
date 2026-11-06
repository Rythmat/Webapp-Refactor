/* eslint-disable react/jsx-sort-props */
import type { FC } from 'react';
import { SCALES } from '@/curriculum/engine/genreGeneration/scaleRegistry';
import type { ActivitySectionId } from '@/curriculum/types/activity';
import type { ActivityFlowV2 } from '@/curriculum/types/activity.v2';
import { CONSOLE_LABEL } from '../../ui/styles';
import {
  DetailCell,
  InlineNumber,
  InlineSelect,
  InlineText,
} from '../visual/Editable';
import { renameGroup, renameSection, sectionGroups } from './lessonEdits';

const SCALE_OPTIONS = Object.keys(SCALES).sort();

/**
 * What the whole level shares, in the in-place lesson editor: its title and
 * defaults (a step's own key, tempo and swing win over them), its sections'
 * names, and the names of the groups of steps in the section the editor is
 * on. A group renamed is renamed on every step in it.
 */
export const LevelSettings: FC<{
  flow: ActivityFlowV2;
  section: ActivitySectionId;
  onChange: (flow: ActivityFlowV2) => void;
}> = ({ flow, section, onChange }) => {
  const params = (next: Partial<ActivityFlowV2['params']>) =>
    onChange({ ...flow, params: { ...flow.params, ...next } });
  const [low, high] = flow.params.tempoRange;
  const groups = sectionGroups(flow, section);
  const sectionName = flow.sections.find((s) => s.id === section)?.name;

  return (
    <div className="flex flex-col gap-5 p-4">
      <section className="grid grid-cols-2 gap-x-6 gap-y-3">
        <DetailCell label="Level title" className="col-span-2">
          <InlineText
            value={flow.title}
            onChange={(title) => onChange({ ...flow, title })}
            placeholder="Blues"
            ariaLabel="Level title"
            className="text-base font-medium tracking-[-0.01em] text-white"
          />
        </DetailCell>
        <DetailCell label="Key">
          <InlineText
            value={flow.params.defaultKey}
            onChange={(defaultKey) => params({ defaultKey })}
            placeholder="C major"
            ariaLabel="Level key"
            className="text-sm"
          />
        </DetailCell>
        <DetailCell label="Scale">
          <InlineSelect
            value={flow.params.defaultScaleId ?? ''}
            onChange={(id) =>
              params({ defaultScaleId: id, defaultScale: SCALES[id] })
            }
            options={SCALE_OPTIONS}
            placeholder="Select…"
            ariaLabel="Level scale"
            className="text-sm"
          />
        </DetailCell>
        <DetailCell label="Tempo range">
          <span className="inline-flex items-center gap-1 text-sm">
            <InlineNumber
              value={low}
              onChange={(value) => params({ tempoRange: [value ?? low, high] })}
              min={20}
              max={300}
              ariaLabel="Slowest tempo"
            />
            <span className="text-white/25">–</span>
            <InlineNumber
              value={high}
              onChange={(value) => params({ tempoRange: [low, value ?? high] })}
              min={20}
              max={300}
              suffix=" bpm"
              ariaLabel="Fastest tempo"
            />
          </span>
        </DetailCell>
        <DetailCell label="Swing">
          <InlineNumber
            value={flow.params.swing}
            onChange={(swing) => params({ swing: swing ?? 0 })}
            min={0}
            max={75}
            suffix="%"
            ariaLabel="Level swing"
            className="text-sm"
          />
          <p className="text-xs text-white/40">
            Below 50 plays straight; a step’s own swing wins.
          </p>
        </DetailCell>
      </section>

      <section>
        <h4 className={`mb-2 ${CONSOLE_LABEL}`}>Sections</h4>
        <div className="flex flex-col gap-1.5">
          {flow.sections.map((s) => (
            <div key={s.id} className="flex items-baseline gap-3">
              <span className="w-4 text-xs text-white/45">{s.id}</span>
              <InlineText
                value={s.name}
                onChange={(name) => onChange(renameSection(flow, s.id, name))}
                placeholder="Melody"
                ariaLabel={`Section ${s.id} name`}
                className="text-sm"
              />
              <span className="text-xs text-white/35 tabular-nums">
                {s.steps.length} steps
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h4 className={`mb-2 ${CONSOLE_LABEL}`}>
          Groups in {section} {sectionName}
        </h4>
        <div className="flex flex-col gap-1.5">
          {groups.map((group) => (
            <div key={group.name} className="flex items-baseline gap-3">
              <InlineText
                value={group.name}
                onChange={(name) =>
                  onChange(renameGroup(flow, section, group.name, name))
                }
                placeholder="B1: Shells"
                ariaLabel={`Group ${group.name}`}
                className="min-w-0 flex-1 text-sm"
              />
              <span className="shrink-0 text-xs text-white/35 tabular-nums">
                {group.steps} step{group.steps === 1 ? '' : 's'}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
