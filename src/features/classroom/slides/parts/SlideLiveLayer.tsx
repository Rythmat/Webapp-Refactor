/**
 * The live layer for the three module-routing slide kinds — `app-route`,
 * `studio-collab` and `showcase`.
 *
 * Like `InteractionBand`, this is surface-injected band content rather than an
 * element: none of it is authored, none of it is published, and all of it is
 * built from pre-gated slots. What the band holds is the only thing that
 * differs between surfaces; the zones above it are identical, which is what
 * makes "Present and the projector agree zone for zone" true.
 *
 * `present` is treated as `projector` throughout. The three components this
 * replaces each branched on `surface === 'projector'` alone, so Present fell
 * through to the TEACHER preview — a class in a single-screen room saw
 * "Offers appear in the teacher panel" where the featured project should have
 * been, and the module destination href instead of "open it on your device".
 *
 * Firewall unchanged: `showcaseFrame` is the single teacher-featured project
 * from `state.showcase` (raw offers are refused by `buildProjectorView` at any
 * depth), and the pairing action never reaches a projected surface because
 * pairs carry enrollment identifiers.
 */
import { getSong } from '@/curriculum/data/songs';
import { pickLocalized, secondaryLine } from '../../presentation/localized';
import type { Interaction, LocalizedText, StudentLanguage } from '../../types';
import type { SlideSlots } from '../SlideRenderer';
import { resolveActivityRefHref } from '../resolveContentHref';
import type { Slide, SlideSurface, StudioCollabSlide } from '../types';

const ON_YOUR_DEVICE: LocalizedText = {
  en: 'Open the activity on your own device.',
  es: 'Abre la actividad en tu propio dispositivo.',
};
const COME_BACK: LocalizedText = {
  en: "Come back here when you're done.",
  es: 'Vuelve aquí cuando termines.',
};
const NOT_READY: LocalizedText = {
  en: 'Ask your teacher — this activity is not ready.',
  es: 'Pregunta a tu maestro — esta actividad no está lista.',
};
const STUDIO_INSTRUCTION: LocalizedText = {
  en: 'Open the Studio on your device and build together.',
  es: 'Abre el Studio en tu dispositivo y creen juntos.',
};
const WAITING: LocalizedText = {
  en: 'Waiting for the teacher to feature a project…',
  es: 'Esperando a que el maestro muestre un proyecto…',
};

const BiLine = ({
  text,
  language,
  className,
}: {
  text: LocalizedText;
  language: StudentLanguage;
  className?: string;
}) => {
  const alt = secondaryLine(text, language);
  return (
    <p className={className} style={{ fontSize: 'var(--slide-body-fz)' }}>
      {pickLocalized(text, language)}
      {alt && <span className="text-white/40"> · {alt}</span>}
    </p>
  );
};

const Chip = ({ children }: { children: React.ReactNode }) => (
  <span
    className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-white/60"
    style={{ fontSize: 'var(--slide-body-fz)' }}
  >
    {children}
  </span>
);

const Centred = ({ children }: { children: React.ReactNode }) => (
  <div className="flex h-full w-full flex-col items-center justify-center gap-6 overflow-hidden text-center">
    {children}
  </div>
);

const Stacked = ({ children }: { children: React.ReactNode }) => (
  <div className="flex h-full w-full flex-col justify-center gap-4 overflow-hidden">
    {children}
  </div>
);

const appRouteLayer = (
  surface: SlideSurface,
  language: StudentLanguage,
  interaction: Interaction | undefined,
  slots: SlideSlots | undefined,
) => {
  if (surface === 'student') {
    return (
      <Stacked>
        {interaction ? (
          slots?.launch?.(interaction)
        ) : (
          <BiLine
            text={NOT_READY}
            language={language}
            className="text-white/60"
          />
        )}
      </Stacked>
    );
  }
  if (surface === 'teacher') {
    const href = interaction?.atlas
      ? resolveActivityRefHref(
          interaction.atlas.module,
          interaction.atlas.activityRef,
          { getSong },
        )
      : null;
    return (
      <Stacked>
        <BiLine
          text={COME_BACK}
          language={language}
          className="text-white/55"
        />
        {interaction?.atlas && (
          <Chip>
            <span className="text-[#7ecfcf]">{interaction.atlas.module}</span>
            <span className="text-white/40">
              {href ?? interaction.atlas.activityRef}
            </span>
          </Chip>
        )}
      </Stacked>
    );
  }
  return (
    <Centred>
      <BiLine
        text={ON_YOUR_DEVICE}
        language={language}
        className="text-white/60"
      />
      {slots?.statusChip}
    </Centred>
  );
};

const studioCollabLayer = (
  grouping: StudioCollabSlide['grouping'],
  surface: SlideSurface,
  language: StudentLanguage,
  slots: SlideSlots | undefined,
) => {
  if (surface === 'student') return <Stacked>{slots?.pairAction}</Stacked>;
  if (surface === 'teacher') {
    return (
      <Stacked>
        <Chip>
          {grouping === 'pairs'
            ? 'Students pair up in the Studio'
            : 'Students each open the Studio'}
        </Chip>
      </Stacked>
    );
  }
  return (
    <Centred>
      <BiLine
        text={STUDIO_INSTRUCTION}
        language={language}
        className="text-white/60"
      />
    </Centred>
  );
};

const showcaseLayer = (
  surface: SlideSurface,
  language: StudentLanguage,
  interaction: Interaction | undefined,
  slots: SlideSlots | undefined,
) => {
  if (surface === 'student') {
    return (
      <Stacked>{interaction ? slots?.input?.(interaction) : null}</Stacked>
    );
  }
  if (surface === 'teacher') {
    return (
      <Stacked>
        <Chip>Offers appear in the teacher panel</Chip>
      </Stacked>
    );
  }
  return (
    <Centred>
      {slots?.showcaseFrame ?? (
        <BiLine text={WAITING} language={language} className="text-white/50" />
      )}
    </Centred>
  );
};

export interface SlideLiveLayerInput {
  slide: Slide;
  surface: SlideSurface;
  language: StudentLanguage;
  interactions: Interaction[];
  slots?: SlideSlots;
}

/**
 * The band content for one slide, or null when the slide has no live layer.
 *
 * Exhaustive over `Slide['kind']` with no `default`, so a new slide kind is a
 * compile error here too rather than a silently blank band.
 */
export const slideLiveLayer = ({
  slide,
  surface,
  language,
  interactions,
  slots,
}: SlideLiveLayerInput): React.ReactNode => {
  switch (slide.kind) {
    // Pure layout, and `interaction` is handled by `InteractionBand`.
    case 'content':
    case 'media':
    case 'interaction':
      return null;
    case 'app-route':
      return appRouteLayer(surface, language, interactions[0], slots);
    case 'studio-collab':
      return studioCollabLayer(slide.grouping, surface, language, slots);
    case 'showcase':
      return showcaseLayer(surface, language, interactions[0], slots);
  }
};
