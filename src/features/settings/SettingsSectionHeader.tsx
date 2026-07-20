interface SettingsSectionHeaderProps {
  title: string;
  description?: string;
}

/**
 * Big display H1 + one-line description for each Settings section, matching
 * the WelcomeHeader typography scale from the Home Dashboard for visual
 * continuity with the rest of the app.
 */
export const SettingsSectionHeader = ({
  title,
  description,
}: SettingsSectionHeaderProps) => {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-4xl font-medium leading-tight text-white md:text-5xl">
        {title}
      </h1>
      {description && (
        <p className="text-base text-white/60 md:text-lg">{description}</p>
      )}
    </div>
  );
};
