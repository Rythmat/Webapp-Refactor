import { useCallback, useState } from 'react';
import { ErrorBox } from '@/components/ErrorBox';
import { Button } from '@/components/ui/button';
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { triggerHexDrain } from '@/components/ui/hex-wave-background';
import { cn } from '@/components/utilities';
import {
  EmailMelody,
  SuccessProgression,
  FailureProgression,
} from '@/constants/musicalConstants';
import { useAuthActions } from '@/contexts/AuthContext';
import { useMusicalForm } from '@/hooks/useMusicalForm';

export const SignInForm = () => {
  const { signInWithEmailAndPassword, signInWithProvider, signUp, error } =
    useAuthActions();

  // Flipped when a sign-in option is chosen (same moment the hexes drain), so
  // the title darkens to stay legible as the background fades to cream.
  const [drained, setDrained] = useState(false);

  const actionForm = useMusicalForm({
    typingMelody: EmailMelody,
    successProgression: SuccessProgression,
    failureProgression: FailureProgression,
  });

  const providerForm = useMusicalForm({
    typingMelody: EmailMelody,
    successProgression: SuccessProgression,
    failureProgression: FailureProgression,
  });

  const onSignIn = useCallback(async () => {
    triggerHexDrain();
    setDrained(true);
    try {
      await signInWithEmailAndPassword('ui', 'ui');
    } catch (err) {
      actionForm.playFailureProgression();
      console.error('Sign in failed:', err);
    }
  }, [signInWithEmailAndPassword, actionForm]);

  const onSignUp = useCallback(async () => {
    try {
      await signUp();
    } catch (err) {
      actionForm.playFailureProgression();
      console.error('Sign up failed:', err);
    }
  }, [actionForm, signUp]);

  const onProviderSignIn = useCallback(
    async (provider: 'google') => {
      triggerHexDrain();
      setDrained(true);
      try {
        await signInWithProvider(provider);
      } catch (err) {
        providerForm.playFailureProgression();
        console.error('Provider sign in failed:', err);
      }
    },
    [providerForm, signInWithProvider],
  );

  return (
    <div className="animate-fade-in-bottom">
      <CardHeader>
        <CardTitle
          className={cn(
            'text-4xl font-normal transition-colors duration-700',
            drained && 'text-black',
          )}
        >
          Music Atlas
        </CardTitle>
        {!drained && <CardDescription>Sign in to your account</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-col space-y-4">
        {/* OAuth buttons */}
        <Button
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#3a3535] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#726969] hover:text-white"
          onClick={() => {
            void onProviderSignIn('google');
          }}
          type="button"
          variant="ghost"
        >
          <svg className="size-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </Button>

        {/* Divider line */}
        <div className="my-2 border-t" />

        <Button
          className="w-full bg-[#4d3a49] text-white hover:bg-[#5c4657]"
          onClick={onSignIn}
          type="button"
        >
          Continue with email
        </Button>

        <Button
          className="w-full border-0 bg-[#3a3535] text-white hover:bg-[#726969]"
          variant="outline"
          onClick={onSignUp}
          type="button"
        >
          Create account
        </Button>

        {error && (
          <div className="my-4">
            <ErrorBox message={error} />
          </div>
        )}
      </CardContent>
    </div>
  );
};
