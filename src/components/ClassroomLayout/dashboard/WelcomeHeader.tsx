import { useMe } from '@/hooks/data';

/**
 * Welcome greeting card: "Welcome, {name}". The XP/Level/Streak/Awards/Share
 * stats cluster that used to live on the right side of this row moved into
 * the app-wide TopRail chrome and is no longer rendered here.
 */
export const WelcomeHeader = () => {
  const { data: user } = useMe();

  const name = user?.nickname || user?.username || 'friend';

  return (
    <header className="relative overflow-hidden rounded-2xl">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat opacity-40"
        style={{ backgroundImage: "url('/backgrounds/learn-bg.svg')" }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-b from-black/40 via-black/30 to-black/60"
      />
      <div className="flex flex-wrap items-end justify-between gap-4 p-5 md:p-6">
        <h1 className="text-4xl font-medium leading-tight text-white md:text-5xl lg:text-6xl">
          Welcome, {name}
        </h1>
      </div>
    </header>
  );
};
