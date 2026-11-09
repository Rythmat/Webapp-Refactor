import { Library, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MicroLabel } from '@/components/kit';
import { OfficeRoutes } from '@/constants/routes';
import { Button } from '@/daw/ui/Button';
import { EmptyState } from '@/daw/ui/EmptyState';
import { OFFICE_CARD, OFFICE_PAGE, OFFICE_PAGE_TITLE } from './ui/styles';

const PAGES: Record<
  'library',
  { title: string; icon: LucideIcon; description: string }
> = {
  library: {
    title: 'Library',
    icon: Library,
    description:
      'Saved lessons, lesson seeds, activities, learning goals and themes, ready to drop into any class. Until then, the lesson editor has the activity and goal pickers.',
  },
};

/**
 * An Office page that's being built in the overhaul's later phases: it says
 * what it will be and where to go meanwhile, rather than an empty frame.
 */
export const ComingSoonPage = ({ page }: { page: keyof typeof PAGES }) => {
  const { title, icon: Icon, description } = PAGES[page];
  return (
    <div className={OFFICE_PAGE}>
      <header className="flex flex-col gap-1.5">
        <MicroLabel>Office</MicroLabel>
        <h1 className={OFFICE_PAGE_TITLE}>{title}</h1>
      </header>
      <div className={OFFICE_CARD}>
        <EmptyState
          className="py-16"
          titleAs="h2"
          icon={<Icon />}
          title="Coming in this overhaul"
          description={description}
          actions={
            <Button asChild size="lg">
              <Link to={OfficeRoutes.classes()}>Go to Classes</Link>
            </Button>
          }
        />
      </div>
    </div>
  );
};
