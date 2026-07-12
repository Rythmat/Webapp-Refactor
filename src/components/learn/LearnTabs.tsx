import type { FC, ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUISound } from '@/hooks/useUISound';

type LearnTabKey = 'Songs' | 'Genre' | 'Theory' | 'Technique';

const LEARN_TABS: LearnTabKey[] = ['Songs', 'Genre', 'Theory', 'Technique'];

// Maps the user-facing tab label to the URL `tab` searchParam value.
// `Songs` is the default (no param).
const TAB_TO_PARAM: Record<LearnTabKey, string | null> = {
  Songs: null,
  Genre: 'Genre',
  Theory: 'Theory',
  Technique: 'Technique',
};

export const LearnTabs: FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { play } = useUISound();
  const currentParam = searchParams.get('tab');

  const isActive = (tab: LearnTabKey) => {
    const target = TAB_TO_PARAM[tab];
    if (target === null) {
      return !currentParam || currentParam === 'Songs';
    }
    return currentParam === target;
  };

  const handleClick = (tab: LearnTabKey) => {
    play('click');
    const target = TAB_TO_PARAM[tab];
    const next = new URLSearchParams(searchParams);
    if (target === null) {
      next.delete('tab');
    } else {
      next.set('tab', target);
    }
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="flex items-center" style={{ gap: 4 }}>
      {LEARN_TABS.map((tab) => {
        const active = isActive(tab);
        return (
          <button
            key={tab}
            type="button"
            onClick={() => handleClick(tab)}
            className="rounded-full transition-colors"
            style={{
              height: 28,
              padding: '0 14px',
              fontSize: 12,
              fontWeight: 500,
              background: active ? '#ffffff' : 'transparent',
              color: active ? '#000000' : 'rgba(255,255,255,0.55)',
            }}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
};

interface LearnSubheaderProps {
  title: string;
  right?: ReactNode;
}

export const LearnSubheader: FC<LearnSubheaderProps> = ({ title, right }) => (
  // Title on the left, optional view-toggle on the right. The pill bar that
  // used to sit in the middle column moved to `LearnNav` (secondary sidebar).
  <div
    className="flex items-center justify-between"
    style={{ marginBottom: 14 }}
  >
    <h1
      style={{
        fontSize: 22,
        fontWeight: 500,
        color: '#e8e8e8',
        margin: 0,
      }}
    >
      {title}
    </h1>
    <div className="flex justify-end">{right}</div>
  </div>
);
