import { OFFICE_PAGE_TITLE } from '@/features/office/ui/styles';

interface SettingsSectionHeaderProps {
  title: string;
  description?: string;
}

/**
 * A Settings page's title and one grey line, in the Account area's look
 * (owner, 2026-11-10, Samply's): the Classroom page's title, 48px over the
 * page.
 */
export const SettingsSectionHeader = ({
  title,
  description,
}: SettingsSectionHeaderProps) => {
  return (
    <div className="flex flex-col gap-2">
      <h1 className={OFFICE_PAGE_TITLE}>{title}</h1>
      {description && (
        <p className="text-[0.795rem] leading-[1.136rem] text-white/[0.48]">
          {description}
        </p>
      )}
    </div>
  );
};
