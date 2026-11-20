import { ArrowRight, Check } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import {
  AppIcons,
  AppListIcons,
  type AppIconComponent,
} from '@/components/icons/appIcons';
import { PROMPT_SURFACE } from '@/components/promptBox/PromptBoxParts';
import { cn } from '@/components/utilities';
import { getSong } from '@/curriculum/data/songs';
import { pickLocalized } from '../../presentation/localized';
import type { Interaction, LocalizedText, StudentLanguage } from '../../types';
import { ROLE_NAME } from '../cortex/copy';
import type { GroupRole } from '../cortex/types';
import { describeRef } from '../describeRef';
import type { InteractionSlide, SlideSurface } from '../types';

// ── The class's vote for its Group Project (owner, 2026-11-16) ─────────────
// The slide before the Group Project: a column for each role, Promoter ·
// Producer · Performer, side by side (owner, 2026-11-16: no logo, no
// lines). Each is its picture, its role and the activity the class would do.
//
//   a student        a column is their vote; theirs reads "Your vote"
//   Present          a column goes to that Group Project; the leader is marked
//   room's screen    the columns alone; the counts once the teacher shows them
//   a phone          the columns as a list

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

interface GroupVoteMenuProps {
  slide: InteractionSlide;
  /** The vote's options (its interaction's `choice.options`). */
  options: readonly LocalizedText[];
  surface: SlideSurface;
  language: StudentLanguage;
  vote?: VoteSlot;
  /** A thumbnail: nothing to tap. */
  still?: boolean;
  /** A phone's column: the cards as a list. */
  stacked?: boolean;
  /** The box's size, in canvas px. */
  width?: number;
  height?: number;
  /** The surface's live status (Present's count and Show results). */
  statusChip?: ReactNode;
}

const votesText = (n: number, language: StudentLanguage) =>
  `${n} ${
    language === 'es'
      ? n === 1
        ? 'voto'
        : 'votos'
      : n === 1
        ? 'vote'
        : 'votes'
  }`;

// Home's Progress column's size (owner, 2026-11-16): 358.5 × 500 px with a
// 26.4px gap on Home, so 319 × 444 and 24 on the canvas, which Present
// draws at 1.125×; 20px in, its full-width "See more" pill at the foot.
// The glass of Home's prompt box (`PROMPT_SURFACE`): 20px corners, a
// hairline edge, a soft shadow and a light wash over the page's glow.
export const VOTE_CARD_W = 319;
export const VOTE_CARD_H = 444;
const VOTE_GAP = 24;

const FRAME = cn(
  PROMPT_SURFACE,
  'text-white transition-[background-color,border-color] duration-150',
);
const PILL =
  'inline-flex h-[32px] shrink-0 items-center gap-[6px] rounded-full border px-[14px] text-[0.64em] leading-none transition-colors duration-75';
/** The pill across the card's foot, as Progress's "See more". */
const WIDE_PILL =
  'flex h-[44px] w-full items-center justify-center gap-[6px] rounded-full border text-[0.7em] leading-none transition-colors duration-75';

/**
 * A card's pill, Home's "New project": the votes once shown (the leader's
 * filled), else a student's vote, else the teacher's Go.
 */
const CardPill = ({
  card,
  vote,
  leader,
  canPick,
  language,
  wide = false,
}: {
  card: VoteCard;
  vote: VoteSlot | undefined;
  leader: number | null;
  canPick: boolean;
  language: StudentLanguage;
  /** Across the card's foot. */
  wide?: boolean;
}) => {
  const PILL_ = wide ? WIDE_PILL : PILL;
  const counts = vote?.counts;
  if (counts) {
    const leads = leader === card.option;
    return (
      <span
        className={`${PILL_} ${
          leads
            ? 'border-white bg-white text-black'
            : 'border-white/15 text-white/80'
        }`}
      >
        {leads && <span>{language === 'es' ? 'Adelante' : 'Leading'} ·</span>}
        <span data-vote-count={card.option} className="tabular-nums">
          {votesText(counts[card.option] ?? 0, language)}
        </span>
      </span>
    );
  }
  if (vote?.mine === card.option)
    return (
      <span className={`${PILL_} border-white bg-white text-black`}>
        <Check className="size-[1.1em]" aria-hidden />
        {language === 'es' ? 'Tu voto' : 'Your vote'}
      </span>
    );
  if (!canPick) return null;
  return (
    <span
      className={`${PILL_} border-white/15 text-[#FCFBF9] group-hover:bg-white/[0.04] group-active:bg-white/[0.08]`}
    >
      {vote?.pickAction === 'go' ? (
        <>
          {language === 'es' ? 'Ir' : 'Go'}
          <ArrowRight className="size-[1.1em]" aria-hidden />
        </>
      ) : language === 'es' ? (
        'Votar'
      ) : (
        'Vote'
      )}
    </span>
  );
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
  height = 492,
  statusChip,
}: GroupVoteMenuProps) => {
  const cards = cardsOf(slide, options, vote?.activities, language);
  const total = vote?.counts?.reduce((a, b) => a + b, 0) ?? 0;
  const leader = vote?.leader ?? null;
  const pick = surface === 'projector' || still ? undefined : vote?.onPick;
  const label = (card: VoteCard) =>
    vote?.pickAction === 'go'
      ? `Go to the ${card.name} Group Project`
      : `Vote for ${card.name}`;

  const roleIcon = (card: VoteCard) => {
    if (!card.role) return null;
    const Icon = ROLE_ICON[card.role];
    return (
      <span data-vote-role={card.role} className="flex shrink-0">
        <Icon className="size-[24px]" aria-hidden />
      </span>
    );
  };

  /** The picture, with the card's share of the votes along its foot. */
  const picture = (card: VoteCard, className: string) => {
    const share =
      vote?.counts && total > 0 ? (vote.counts[card.option] ?? 0) / total : 0;
    return (
      <span
        data-vote-art={card.option}
        className={`relative block overflow-hidden border border-white/[0.08] bg-[#101012] ${className}`}
      >
        {card.image && (
          <img
            src={card.image}
            alt=""
            draggable={false}
            className="absolute inset-0 size-full object-cover"
          />
        )}
        {vote?.counts && (
          <span className="absolute inset-x-0 bottom-0 h-[5px] bg-black/50">
            <span
              className="block h-full bg-white transition-[width] duration-500"
              style={{ width: `${share * 100}%` }}
            />
          </span>
        )}
      </span>
    );
  };

  const control = (
    card: VoteCard,
    className: string,
    inner: ReactNode,
    style?: CSSProperties,
  ) => {
    const chosen = vote?.mine === card.option || leader === card.option;
    // Chosen, the box's focus look, brighter.
    const classes = cn(className, chosen && 'border-white/40 bg-white/[0.08]');
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
          style={style}
          className={cn(
            'group text-left outline-none hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-white/50',
            classes,
          )}
        >
          {inner}
        </button>
      );
    return (
      <div key={card.option} className={classes} style={style}>
        {inner}
      </div>
    );
  };

  /** The card's name and what the class would do, under its icon's line. */
  const heading = (card: VoteCard) => (
    <span className="flex min-w-0 flex-col gap-[4px]">
      <span className="text-[0.82em] leading-tight text-white">
        {card.name}
      </span>
      <span className="truncate text-[0.62em] leading-tight text-white/55">
        {card.detail}
      </span>
    </span>
  );

  const pill = (card: VoteCard, wide = false) => (
    <CardPill
      card={card}
      vote={vote}
      leader={leader}
      canPick={Boolean(pick)}
      language={language}
      wide={wide}
    />
  );

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
            `${FRAME} flex w-full items-center gap-3 p-2 pr-3`,
            <>
              {picture(card, 'size-14 shrink-0 rounded-xl')}
              <span
                data-vote-card={card.option}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                {/* The picture says the role: no icon beside it on a phone. */}
                <span className="min-w-0 flex-1">{heading(card)}</span>
                {pill(card)}
              </span>
            </>,
          ),
        )}
        {statusChip && <div className="self-center">{statusChip}</div>}
      </div>
    );

  // Three of Home's Progress columns side by side (owner, 2026-11-16): the
  // picture, the role and what the class would do, the pill across the
  // foot; the screen's own status under them.
  return (
    <div
      data-vote-menu=""
      className="flex flex-col items-center gap-[12px]"
      style={{ width, height, fontSize: 'var(--slide-body-fz)' }}
    >
      <div className="flex shrink-0 justify-center" style={{ gap: VOTE_GAP }}>
        {cards.map((card) =>
          control(
            card,
            `${FRAME} flex flex-col gap-[16px] p-[20px]`,
            <>
              {picture(
                card,
                'min-h-0 w-full flex-1 rounded-[12px] transition-[border-color,transform] duration-200 ease-out group-hover:border-white/15 motion-safe:group-hover:scale-[1.01]',
              )}
              <span
                data-vote-card={card.option}
                className="flex shrink-0 flex-col gap-[16px]"
              >
                <span className="flex min-w-0 items-center gap-[12px]">
                  {roleIcon(card)}
                  {heading(card)}
                </span>
                {pill(card, true)}
              </span>
            </>,
            { width: VOTE_CARD_W, height: VOTE_CARD_H },
          ),
        )}
      </div>
      {statusChip && (
        <div data-vote-status="" className="flex shrink-0 justify-center">
          {statusChip}
        </div>
      )}
    </div>
  );
};
