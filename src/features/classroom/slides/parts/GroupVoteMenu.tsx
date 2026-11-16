import { useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Fragment, useId, useState, type ReactNode } from 'react';
import { Logo } from '@/components/Logo';
import {
  AppIcons,
  AppListIcons,
  type AppIconComponent,
} from '@/components/icons/appIcons';
import { getSong } from '@/curriculum/data/songs';
import { KEY_RAINBOW_COLORS } from '@/features/landing/rainbow';
import { pickLocalized } from '../../presentation/localized';
import type { Interaction, LocalizedText, StudentLanguage } from '../../types';
import { ROLE_NAME } from '../cortex/copy';
import type { GroupRole } from '../cortex/types';
import { describeRef } from '../describeRef';
import type { InteractionSlide, SlideSurface } from '../types';

// ── The class's vote for its Group Project (owner, 2026-11-16) ─────────────
// Slide 5's look for the slide before the Group Project: a card for each
// role, Promoter · Producer · Performer, a thin line from each into the
// Music Atlas logo above them with a short rainbow streak running along it.
// Each card is its role, the activity the class would do and its picture.
//
//   a student        a card is their vote; theirs reads "Your vote"
//   Present          a card goes to that Group Project; the leader is marked
//   room's screen    the cards alone; the counts once the teacher shows them
//   thumbnail, or    the lines without streaks
//   reduced motion
//   a phone          no lines: the cards as a list

/** What a surface hands the cards: each one's activity, the votes, a pick. */
export interface VoteSlot {
  /** Each option's activity: the first interaction of its Group Project. */
  activities?: readonly (Interaction | null)[];
  /** Each option's votes, once they may show on this screen. */
  counts?: readonly number[] | null;
  /** The option with the most votes, when the screen may say so. */
  leader?: number | null;
  /** A student's own vote. */
  mine?: number | null;
  /** A card's action: a student's vote, or the teacher's go. */
  onPick?: (option: number) => void;
  pickAction?: 'vote' | 'go';
}

const ROLE_ICON: Record<GroupRole, AppIconComponent> = {
  promoter: AppIcons.globe,
  producer: AppIcons.studio,
  performer: AppListIcons.artists,
};

/** Where each role works: its place's still, when the activity has no picture. */
const ROLE_STILL: Record<GroupRole, string> = {
  promoter: '/videos/places/globe.jpg',
  producer: '/videos/places/studio.jpg',
  performer: '/videos/places/learn.jpg',
};

const ROLE_BLURB: Record<GroupRole, LocalizedText> = {
  promoter: {
    en: 'Map the music’s world on the Globe',
    es: 'Mapea el mundo de la música en el Globo',
  },
  producer: {
    en: 'Build a track in the Studio',
    es: 'Crea una pista en el Studio',
  },
  performer: {
    en: 'Play a lesson together',
    es: 'Toquen una lección juntos',
  },
};

const ROLE_OF_MODULE: Partial<Record<string, GroupRole>> = {
  globe: 'promoter',
  studio: 'producer',
  learn: 'performer',
};

/**
 * An option's role: from its activity's module, else its Group Project
 * slide's id (`…-slide-group-producer`), else its name.
 */
export const roleOfOption = (
  option: LocalizedText,
  activity: Interaction | null | undefined,
  branchId: string | undefined,
): GroupRole | null => {
  const module = activity?.atlas?.module;
  const byModule = module ? ROLE_OF_MODULE[module] : undefined;
  if (byModule) return byModule;
  const byId = branchId?.match(/-group-(promoter|producer|performer)$/)?.[1];
  if (byId) return byId as GroupRole;
  return (
    (Object.keys(ROLE_NAME) as GroupRole[]).find(
      (role) => ROLE_NAME[role].en === option.en,
    ) ?? null
  );
};

interface VoteCard {
  option: number;
  name: string;
  role: GroupRole | null;
  /** The activity's name, else what the role does. */
  detail: string;
  image: string | null;
}

const cardsOf = (
  slide: InteractionSlide,
  options: readonly LocalizedText[],
  activities: readonly (Interaction | null)[] | undefined,
  language: StudentLanguage,
): VoteCard[] =>
  options.map((option, i) => {
    const activity = activities?.[i] ?? null;
    const role = roleOfOption(option, activity, slide.branches?.[i]);
    const ref = activity?.atlas?.activityRef;
    const described = ref ? describeRef(ref, { getSong }) : null;
    return {
      option: i,
      name: pickLocalized(option, language),
      role,
      detail:
        described?.title ??
        (role ? pickLocalized(ROLE_BLURB[role], language) : ''),
      image: described?.imageUrl ?? (role ? ROLE_STILL[role] : null),
    };
  });

/** A card's size, in canvas px; the logo's tile above them. */
export const VOTE_CARD_W = 344;
export const VOTE_CARD_H = 132;
const HUB = 112;
const GAP = 60;

interface GroupVoteMenuProps {
  slide: InteractionSlide;
  /** The vote's options (its interaction's `choice.options`). */
  options: readonly LocalizedText[];
  surface: SlideSurface;
  language: StudentLanguage;
  vote?: VoteSlot;
  /** A thumbnail: no streaks. */
  still?: boolean;
  /** A phone's column: the cards as a list, no lines. */
  stacked?: boolean;
  /** The box's size, in canvas px. */
  width?: number;
  height?: number;
  /** The surface's live status (Present's count and Show results). */
  statusChip?: ReactNode;
}

/** What a card says under its name: the votes, the student's own, the go. */
const CardFoot = ({
  card,
  vote,
  total,
  language,
}: {
  card: VoteCard;
  vote: VoteSlot | undefined;
  total: number;
  language: StudentLanguage;
}) => {
  const counts = vote?.counts;
  if (counts) {
    const n = counts[card.option] ?? 0;
    return (
      <span className="flex items-center gap-[8px]">
        <span className="relative h-[6px] flex-1 overflow-hidden rounded-full bg-white/10">
          <span
            className="absolute inset-y-0 left-0 rounded-full bg-white transition-[width] duration-500"
            style={{ width: `${total > 0 ? (n / total) * 100 : 0}%` }}
          />
        </span>
        <span
          data-vote-count={card.option}
          className="shrink-0 text-[0.62em] tabular-nums text-white/70"
        >
          {n}{' '}
          {language === 'es'
            ? n === 1
              ? 'voto'
              : 'votos'
            : n === 1
              ? 'vote'
              : 'votes'}
        </span>
      </span>
    );
  }
  if (vote?.mine === card.option)
    return (
      <span className="inline-flex items-center gap-[4px] text-[0.62em] text-white">
        <Check className="size-[1.1em]" aria-hidden />
        {language === 'es' ? 'Tu voto' : 'Your vote'}
      </span>
    );
  return null;
};

export const GroupVoteMenu = ({
  slide,
  options,
  surface,
  language,
  vote,
  still = false,
  stacked = false,
  width = 1152,
  height = 396,
  statusChip,
}: GroupVoteMenuProps) => {
  const reduce = useReducedMotion() ?? false;
  const streaks = !still && !reduce;
  const uid = useId().replace(/:/g, '');
  const [lit, setLit] = useState<number | null>(null);
  const cards = cardsOf(slide, options, vote?.activities, language);
  const total = vote?.counts?.reduce((a, b) => a + b, 0) ?? 0;
  const leader = vote?.leader ?? null;
  const pick = surface === 'projector' || still ? undefined : vote?.onPick;
  const label = (card: VoteCard) =>
    vote?.pickAction === 'go'
      ? `Go to the ${card.name} Group Project`
      : `Vote for ${card.name}`;

  const control = (card: VoteCard, className: string, style?: object) => {
    const chosen = vote?.mine === card.option || leader === card.option;
    const body = (
      <>
        <span
          data-vote-art={card.option}
          className={`relative block shrink-0 overflow-hidden border-white/10 bg-[#1b1b20] ${
            stacked ? 'size-14 rounded-lg' : 'h-full border-r'
          }`}
          style={stacked ? undefined : { width: VOTE_CARD_H }}
        >
          {card.image && (
            <img
              src={card.image}
              alt=""
              draggable={false}
              className="size-full object-cover"
            />
          )}
        </span>
        <span
          data-vote-card={card.option}
          className={`flex min-w-0 flex-1 flex-col justify-center gap-[6px] ${
            stacked ? '' : 'px-[18px]'
          }`}
        >
          <span className="flex items-center gap-[6px] text-[0.9em] leading-none text-white">
            {card.role &&
              (() => {
                const Icon = ROLE_ICON[card.role];
                return (
                  <span data-vote-role={card.role} className="flex shrink-0">
                    <Icon className="size-[1.1em]" aria-hidden />
                  </span>
                );
              })()}
            {card.name}
            {leader === card.option && (
              <span className="ml-auto rounded-full bg-white px-[8px] py-[3px] text-[0.55em] text-black">
                {language === 'es' ? 'Adelante' : 'Leading'}
              </span>
            )}
          </span>
          <span className="line-clamp-2 text-[0.62em] leading-tight text-white/55">
            {card.detail}
          </span>
          <CardFoot card={card} vote={vote} total={total} language={language} />
        </span>
      </>
    );
    const classes = `${className} ${
      chosen ? 'border-white/60' : 'border-white/10'
    }`;
    const hand = {
      onPointerEnter: () => setLit(card.option),
      onPointerLeave: () => setLit((was) => (was === card.option ? null : was)),
      onFocus: () => setLit(card.option),
      onBlur: () => setLit((was) => (was === card.option ? null : was)),
    };
    if (pick)
      return (
        <button
          key={card.option}
          type="button"
          aria-label={label(card)}
          aria-pressed={vote?.mine === card.option}
          // Present's arrow keys move the slides; a card keeps its own.
          onKeyDown={(e) => e.stopPropagation()}
          onClick={() => pick(card.option)}
          className={`${classes} text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white`}
          style={style}
          {...hand}
        >
          {body}
        </button>
      );
    return (
      <div key={card.option} className={classes} style={style}>
        {body}
      </div>
    );
  };

  if (stacked)
    return (
      <div
        data-vote-menu=""
        className="flex w-full flex-col gap-2"
        style={{ fontSize: 'var(--slide-body-fz)' }}
      >
        {cards.map((card) =>
          control(
            card,
            'flex w-full items-center gap-3 rounded-xl border bg-[#141418] p-2 pr-4 text-white',
          ),
        )}
        {statusChip && <div className="self-center">{statusChip}</div>}
      </div>
    );

  // A row of cards along the foot, the logo centred above them, a line from
  // the top of each card up into the logo.
  const n = cards.length;
  const rowW = n * VOTE_CARD_W + (n - 1) * GAP;
  const left0 = (width - rowW) / 2;
  const cardTop = height - VOTE_CARD_H;
  const hubX = width / 2;
  const hubBottom = HUB;
  const nodes = cards.map((card, i) => {
    const x = left0 + i * (VOTE_CARD_W + GAP) + VOTE_CARD_W / 2;
    const my = (cardTop + hubBottom) / 2;
    return {
      card,
      x,
      path: `M ${x} ${cardTop} C ${x} ${my}, ${hubX} ${my}, ${hubX} ${hubBottom}`,
    };
  });

  return (
    <div
      data-vote-menu=""
      className="relative"
      style={{ width, height, fontSize: 'var(--slide-body-fz)' }}
    >
      <svg
        aria-hidden
        className="pointer-events-none absolute left-0 top-0"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
      >
        <defs>
          {nodes.map((node) => (
            <linearGradient
              key={node.card.option}
              id={`${uid}-${node.card.option}`}
              gradientUnits="userSpaceOnUse"
              x1={node.x}
              y1={cardTop}
              x2={hubX}
              y2={hubBottom}
            >
              {KEY_RAINBOW_COLORS.map((color, i) => (
                <stop
                  key={color}
                  offset={`${((i / (KEY_RAINBOW_COLORS.length - 1)) * 100).toFixed(1)}%`}
                  stopColor={color}
                />
              ))}
            </linearGradient>
          ))}
        </defs>
        {nodes.map((node, index) => {
          const stroke = `url(#${uid}-${node.card.option})`;
          // A hand on a card, the student's vote, or the leader: its whole
          // line in the rainbow.
          const on =
            lit === node.card.option ||
            vote?.mine === node.card.option ||
            leader === node.card.option;
          return (
            <g key={node.card.option} data-vote-beam={node.card.option}>
              <path
                d={node.path}
                fill="none"
                stroke={on ? stroke : 'rgba(255,255,255,0.1)'}
                strokeWidth={on ? 2 : 1.5}
                className="transition-[stroke] duration-300"
              />
              {streaks && (
                <Fragment>
                  <path
                    d={node.path}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={7}
                    strokeLinecap="round"
                    pathLength={1}
                    strokeDasharray="0.26 1.3"
                    opacity={on ? 0 : 0.18}
                    className="place-beam"
                    style={{ animationDelay: `${(index * 0.55).toFixed(2)}s` }}
                  />
                  <path
                    d={node.path}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    pathLength={1}
                    strokeDasharray="0.26 1.3"
                    opacity={on ? 0 : 0.85}
                    className="place-beam"
                    style={{ animationDelay: `${(index * 0.55).toFixed(2)}s` }}
                  />
                </Fragment>
              )}
            </g>
          );
        })}
      </svg>

      <div
        className="absolute flex items-center justify-center rounded-[28px] border border-white/10 bg-[#141418] shadow-[0_10px_40px_rgba(0,0,0,0.45)]"
        style={{ left: hubX - HUB / 2, top: 0, width: HUB, height: HUB }}
      >
        <Logo className="size-[52px]" />
      </div>

      {/* Present's count and Show results; the room's participation. */}
      {statusChip && (
        <div
          data-vote-status=""
          className="absolute right-0 top-0 flex justify-end"
        >
          {statusChip}
        </div>
      )}

      {nodes.map((node) =>
        control(
          node.card,
          'absolute flex items-stretch overflow-hidden rounded-[20px] border bg-[#141418] text-white shadow-[0_10px_32px_rgba(0,0,0,0.4)] transition-[border-color,transform] duration-300',
          {
            left: node.x - VOTE_CARD_W / 2,
            top: cardTop,
            width: VOTE_CARD_W,
            height: VOTE_CARD_H,
          },
        ),
      )}
    </div>
  );
};
