import { WelcomeHeader } from '@/components/ClassroomLayout/dashboard/WelcomeHeader';

/**
 * Learn Home Welcome banner — the personalized greeting shown at the top of the
 * Learn Home dashboard. Tab navigation lives in the persistent `LearnTabBar`
 * (rendered once at the top of the Learn page by `LearnInlet`), not here.
 */
export const LearnQuickStart = () => {
  return (
    // Match the Home dashboard font: `.learn-root` forces Inter, but this
    // greeting copies Home's (which uses the app's Glacial Indifference), so its
    // text must use it too.
    <div
      style={{
        fontFamily: "'Glacial Indifference', 'Haskoy', system-ui, sans-serif",
      }}
    >
      <WelcomeHeader format={(name) => `${name}'s Learning Dashboard`} />
    </div>
  );
};
