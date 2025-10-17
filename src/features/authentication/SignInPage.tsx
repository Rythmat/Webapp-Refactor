import { useCallback, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AuthRoutes } from '@/constants/routes';
import { SignInForm } from './components/SignInForm';
import { SignInModeSelector } from './components/SignInModeSelector';

type SignInMode = 'teacher' | 'student';

export const SignInPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialMode = searchParams.get('mode');
  const [signInMode, setSignInMode] = useState<SignInMode | null>(
    initialMode === 'teacher' || initialMode === 'student' ? initialMode : null,
  );

  useEffect(() => {
    const currentUrlMode = searchParams.get('mode');
    const validMode =
      currentUrlMode === 'teacher' || currentUrlMode === 'student'
        ? currentUrlMode
        : null;
    if (validMode !== signInMode) {
      setSignInMode(validMode);
    }
  }, [searchParams, signInMode]);

  const handleSelectMode = useCallback(
    (mode: SignInMode) => {
      setSignInMode(mode);
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set('mode', mode);
      setSearchParams(newSearchParams);
    },
    [searchParams, setSearchParams],
  );

  const handleSwitchMode = useCallback(
    (mode?: SignInMode) => {
      if (mode) {
        handleSelectMode(mode);
        return;
      }

      setSignInMode(null);
      searchParams.delete('mode');
      setSearchParams(searchParams);
    },
    [handleSelectMode, searchParams, setSearchParams],
  );

  return (
    <div className="w-full">
      {!signInMode ? (
        <SignInModeSelector onSelectMode={handleSelectMode} />
      ) : (
        <SignInForm mode={signInMode} onSwitchMode={handleSwitchMode} />
      )}

      {/* Conditionally render the sign-up/join link only for student mode */}
      {signInMode === 'student' && (
        <div className="mt-4 px-8 pb-8 text-center text-sm">
          Don&apos;t have an account?{' '}
          <Button
            className="h-auto p-0 text-sm font-medium"
            variant="link"
            onClick={() => navigate(AuthRoutes.signUpAsStudent())}
          >
            Join a classroom
          </Button>
        </div>
      )}
    </div>
  );
};
