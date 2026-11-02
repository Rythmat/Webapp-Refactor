import { useNavigate } from 'react-router-dom';
import { WHITE_PILL } from '@/components/kit/pills';
import { LearnRoutes } from '@/constants/routes';
import { LabText } from './LabControls';

/** The next topic in the unit, which a topic's last screen leads on to. */
export interface LabFollowing {
  title: string;
  open: () => void;
}

/** A topic's last screen: what the student just did, and what comes next. */
export function LabDone({
  following,
  title,
  children,
}: {
  following: LabFollowing | null;
  title: string;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-4" data-lab-done>
      <p className="text-lg leading-7 text-white">{title}</p>
      <LabText>{children}</LabText>
      <div className="flex justify-end">
        <button
          type="button"
          className={WHITE_PILL}
          onClick={() =>
            following ? following.open() : navigate(LearnRoutes.audio())
          }
        >
          {following ? `Next: ${following.title}` : 'Back to Audio'}
        </button>
      </div>
    </div>
  );
}
