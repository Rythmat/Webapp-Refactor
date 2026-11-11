import { MicroLabel } from '@/components/kit';
import type { FeelingsLevel } from '../types';
import { EnergyRail } from './EnergyRail';
import { FeelingFace } from './FeelingFace';
import { FeelingsWheel } from './FeelingsWheel';
import {
  ENERGY_ZONES,
  PRIMARY_IDS,
  blendLabel,
  buildClassMood,
  describeFeeling,
  energyColor,
  facesFor,
  primaryLabel,
  shadeOf,
  type FeelingAnswer,
  type PrimaryId,
} from './feelings';

// How the class is arriving, for the teacher only (Rule 2: a check-in never
// reaches the projector). The level's own tool, lit by how many chose each
// feeling, with who chose it underneath — names are the point: a teacher
// checks in with the student, not with a number.

const Names = ({ names }: { names: string[] }) =>
  names.length === 0 ? null : (
    <p className="text-[0.8125rem] leading-snug text-daw-text-2">
      {names.join(', ')}
    </p>
  );

const Count = ({ n }: { n: number }) => (
  <span className="ml-auto shrink-0 text-[0.8125rem] tabular-nums text-daw-text-3">
    {n}
  </span>
);

export const ClassMoodView = ({
  level,
  answers,
}: {
  level: FeelingsLevel;
  answers: readonly FeelingAnswer[];
}) => {
  const mood = buildClassMood(answers, level);

  return (
    <div className="flex flex-col gap-4">
      {level === 'energy' ? (
        <>
          <div style={{ fontSize: '1rem' }}>
            <EnergyRail points={mood.points} />
          </div>
          <ul className="flex flex-col gap-2">
            {ENERGY_ZONES.map((zone) => {
              const names =
                mood.faces.find((t) => t.key === zone.id)?.names ?? [];
              return (
                <li
                  key={zone.id}
                  className={names.length === 0 ? 'opacity-40' : undefined}
                >
                  <span className="flex items-center gap-2 text-[0.875rem] text-daw-text">
                    <span
                      aria-hidden
                      className="size-2.5 rounded-full"
                      style={{
                        background: energyColor((zone.from + zone.to) / 2),
                      }}
                    />
                    {zone.label.en}
                    <Count n={names.length} />
                  </span>
                  <Names names={names} />
                </li>
              );
            })}
          </ul>
        </>
      ) : level === 'complex' ? (
        <>
          <FeelingsWheel
            counts={
              Object.fromEntries(
                mood.primaries.map((p) => [p.key, p.names.length]),
              ) as Record<PrimaryId, number>
            }
            className="mx-auto w-full max-w-60"
          />
          {mood.blends.length > 0 && (
            <div className="flex flex-col gap-2">
              <MicroLabel>Blends</MicroLabel>
              <ul className="flex flex-col gap-2">
                {mood.blends.map((b) => (
                  <li key={b.key} className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-2 text-[0.875rem] text-daw-text">
                      {blendLabel(b.key).en}
                      <Count n={b.names.length} />
                    </span>
                    <Names names={b.names} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          <ul className="flex flex-col gap-2">
            {PRIMARY_IDS.map((id) => {
              const names =
                mood.primaries.find((p) => p.key === id)?.names ?? [];
              if (names.length === 0) return null;
              return (
                <li key={id} className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-2 text-[0.875rem] text-daw-text">
                    <span
                      aria-hidden
                      className="size-2.5 rounded-full"
                      style={{ background: shadeOf(id, 2).color }}
                    />
                    {primaryLabel(id).en}
                    <Count n={names.length} />
                  </span>
                  <Names names={names} />
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {facesFor(level).map((f) => {
            const names = mood.faces.find((t) => t.key === f.id)?.names ?? [];
            return (
              <li
                key={f.id}
                className={names.length === 0 ? 'opacity-40' : undefined}
              >
                <div className="flex items-center gap-2.5">
                  <FeelingFace face={f.face} color={f.color} size={28} />
                  <span className="text-[0.875rem] text-daw-text">
                    {f.label.en}
                  </span>
                  <Count n={names.length} />
                </div>
                {names.length > 0 && (
                  <div className="pl-[2.375rem]">
                    <Names names={names} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {mood.other.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <MicroLabel>Other answers</MicroLabel>
          {mood.other.map((o) => (
            <p key={o.key} className="text-[0.8125rem] text-daw-text-2">
              <span className="text-daw-text">
                {describeFeeling(o.key)?.label ?? o.key}
              </span>{' '}
              — {o.names.join(', ')}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};
