import { WelcomeHeader } from '@/components/ClassroomLayout/dashboard/WelcomeHeader';

/**
 * Learn Home Welcome banner — the personalized greeting shown at the top of the
 * Learn Home dashboard. Tab navigation lives in the persistent `LearnTabBar`
 * (rendered once at the top of the Learn page by `LearnInlet`), not here.
 */
export const LearnQuickStart = () => {
  return (
    // Match the Home dashboard's greeting, which sets Glacial Indifference
    // explicitly (as `.learn-root` now does too).
    <div
      style={{
        fontFamily: "'Glacial Indifference', 'Haskoy', system-ui, sans-serif",
      }}
    >
      <WelcomeHeader format={(name) => `${name}'s Compass`} />
    </div>
  );
};
