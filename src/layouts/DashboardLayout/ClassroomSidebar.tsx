import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';
// import {  type ReactNode } from 'react';
import { Logo } from '@/components/Logo';
// import { usePage, useChapter, useCollection } from '@/hooks/data';
import { BetaHelp } from '@/components/ui/beta-help';
import { ChaptersIcon } from '@/components/ui/icons/chapters-icon';
import { PlayAlongIcon } from '@/components/ui/icons/play-along-icon';
import { cn } from '@/components/utilities';
import {  ClassroomRoutes, GameRoutes, ProfileRoutes, StudioRoutes } from '@/constants/routes';
// import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
// import { ClassroomSwitcher } from '@/features/teacher/components/ClassroomSwitcher';
import { SidebarMainNavItem } from './SidebarMainNavItem';
import { SidebarSecondaryNavItem } from './SidebarSecondaryNavItem';
import { UserWidget } from './UserWidget';
import { NoteIcon } from '@/components/ui/icons/note-icon';
import { MarketIcon }  from '@/components/ui/icons/market-icon';
import { RhythmIcon } from '@/components/ui/icons/rhythm-icon';
import { StudentIcon } from '@/components/ui/icons/student-icon';
import { HomeIcon } from '@/components/ui/icons/home-icon';
interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
  view?: 'home' | 'collection' | 'lesson';
  ids?: {
    classroomId?: string;
    collectionId?: string;
    lessonId?: string;
  };
}

export const ClassroomSidebar = ({
  className,
  isCollapsed = false,
  onToggleCollapse,
  view,
  ids
}: SidebarProps) => {
  // const { role } = useAuthContext();

  // const { data: collection } = useCollection(ids?.collectionId);
  // const { data: page } = usePage(ids?.lessonId);
  // const chapterId = page?.chapterId;
  // const { data: chapter } = useChapter(chapterId);

  // let sidebar: ReactNode = null;

  // switch (view) {
  //   case 'home':
  //     sidebar =  (
  //       <ul className="flex flex-1 flex-col gap-y-1 pt-4">
  //         <SidebarMainNavItem
  //           icon={<TeacherIcon />}
  //           isCollapsed={isCollapsed}
  //           label="Classrooms"
  //           to={ClassroomRoutes.root()}
  //         />
  //       </ul>
  //       )
  //       break;

  //   case 'collection':
  //     sidebar =  (
  //       <ul className="flex flex-1 flex-col gap-y-1 pt-4">
  //         <SidebarMainNavItem
  //           icon={<CollectionsIcon />}
  //           isCollapsed={isCollapsed}
  //           label="Collection"
  //           to={ClassroomRoutes.home({ classroomId: ids?.classroomId! })}
  //         />
  //       </ul> 
  //     )
  //     break;

  //   case 'lesson':

  //     sidebar =  (
  //       <ul className="flex flex-1 flex-col gap-y-1 pt-4">
  //         <SidebarMainNavItem
  //         icon={<CollectionsIcon />}
  //         isCollapsed={isCollapsed}
  //         label="Collection"
  //         to={ClassroomRoutes.home({ classroomId: ids?.classroomId! })}
  //         />
  //         <SidebarMainNavItem
  //           icon={<ChaptersIcon />}
  //           isCollapsed={isCollapsed}
  //           label={collection?.name!}
  //           to={ClassroomRoutes.collection({classroomId: ids?.classroomId!, collectionId: ids?.collectionId! })}
  //         />
  //         {!isCollapsed && (
  //         <>
  //           <h2 className="text-zinc-500 font-bold text-lg">{chapter?.name ?? 'Current Chapter'}</h2>
  //           {chapter?.pages.map(p => (
  //             <SidebarSecondaryNavItem
  //               label={p.name!}
  //               to={ClassroomRoutes.lesson({classroomId: ids?.classroomId!, collectionId: ids?.collectionId!, lessonId: p.id })}
  //             />
  //           ))}
  //         </>
  //       )}
          
  //       </ul>
  //     )
  //     break;

  //   default:
  //     sidebar = null;
  //     break;
  // }

  switch(view){
    default:
      ids;
  }

  return (
    <aside
      className={cn(
        'relative flex h-full animate-fade-in-bottom flex-col space-y-4',
        className,
      )}
    >
      <div className="relative z-10 flex flex-1 flex-col space-y-4 p-6 text-gray-800">
        {/* Header */}
        <div className="relative">
          <div className="flex items-center">
            <Logo className={cn('relative transition-all')} />
            {/* {!isCollapsed && (
              <span className="text-xl font-semibold text-white transition-all">
                Music Atlas
              </span>
            )} */}
          </div>

          <div className="group pointer-events-none absolute -top-8 right-[-4.5rem] p-8">
            <button
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="pointer-events-auto flex size-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 opacity-0 transition-all duration-200 hover:bg-gray-200 group-hover:opacity-100"
              onClick={onToggleCollapse}
            >
              {isCollapsed ? <HiChevronRight /> : <HiChevronLeft />}
            </button>
          </div>
        </div>

        {/* Classroom switcher for teachers
        {role === 'teacher' && !isCollapsed && (
          <div className="mb-4">
            <ClassroomSwitcher />
          </div>
        )} */}


        
        <ul className="flex flex-1 flex-col gap-y-1 pt-4">
          <SidebarMainNavItem
                      icon={<HomeIcon/>}
                      isCollapsed={isCollapsed}
                      label="Home"
                      to={ProfileRoutes.root()}
                    />
          <SidebarMainNavItem
                      icon={<NoteIcon />}
                      isCollapsed={isCollapsed}
                      label="Learn"
                      to={ClassroomRoutes.root()}
                    />
          <SidebarMainNavItem
                      icon={<ChaptersIcon />}
                      isCollapsed={isCollapsed}
                      label="Studio"
                      to={StudioRoutes.root()}
                    />
          <SidebarMainNavItem
                      icon={<PlayAlongIcon />}
                      isCollapsed={isCollapsed}
                      label="Games"
                      to={GameRoutes.root()}
                    />
          <SidebarMainNavItem
                      icon={<RhythmIcon />}
                      isCollapsed={isCollapsed}
                      label="Library"
                      to={GameRoutes.root()}
                    />
          <SidebarMainNavItem
                      icon={<MarketIcon />}
                      isCollapsed={isCollapsed}
                      label="Market"
                      to={ClassroomRoutes.root()}
                    />
          <SidebarMainNavItem
                      icon={<StudentIcon />}
                      isCollapsed={isCollapsed}
                      label="Creatives"
                      to={ClassroomRoutes.root()}
                    />
        </ul>
        

        {!isCollapsed && (
                  <>
                    <ul className="flex flex-col space-y-1 text-sm">
                      <SidebarSecondaryNavItem
                        external
                        label="Changelog"
                        to="https://www.musicatlas.io/policies/change-log"
                      />
                      <SidebarSecondaryNavItem
                        external
                        label="Support"
                        to="mailto:aaron@musicatlas.io"
                      />
                      <SidebarSecondaryNavItem
                        external
                        label="Licensing"
                        to="https://www.musicatlas.io/policies/licensing"
                      />
                      <SidebarSecondaryNavItem
                        external
                        label="Privacy Policy"
                        to="https://www.musicatlas.io/policies/privacy"
                      />
                      <SidebarSecondaryNavItem
                        external
                        label="Terms of Use"
                        to="https://www.musicatlas.io/policies/terms"
                      />
                    </ul>
                  </>
                )}


        <UserWidget className="z-0 mt-2" isCollapsed={isCollapsed} />

        {!isCollapsed && <BetaHelp />}
      </div>
    </aside>
  );
};
