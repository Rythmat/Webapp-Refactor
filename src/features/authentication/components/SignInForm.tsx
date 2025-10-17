import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import { useCallback, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { z } from 'zod';
import { ErrorBox } from '@/components/ErrorBox';
import { Button } from '@/components/ui/button';
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  EmailMelody,
  PasswordMelody,
  SuccessProgression,
  FailureProgression,
  AutofillProgression,
} from '@/constants/musicalConstants';
import { AuthRoutes } from '@/constants/routes';
import { useAuthActions } from '@/contexts/AuthContext';
import { useMusicalForm } from '@/hooks/useMusicalForm';

type SignInMode = 'teacher' | 'student';

const FUNNY_MUSIC_RELATED_USERNAMES = [
  'bachStreetBoy',
  'mozartManiac',
  'beethovenBuddy',
  'chopinChampion',
  'pianoPirate',
];

// Define schemas dynamically
const createFormSchema = (mode: SignInMode) => {
  return z.object({
    identifier: z
      .string()
      .min(1, `Please enter your ${mode === 'teacher' ? 'email' : 'username'}`)
      .refine(
        (val) =>
          mode === 'student' || z.string().email().safeParse(val).success,
        {
          message: 'Please enter a valid email address',
          // Only apply this refine rule in teacher mode
          params: { mode }, // Pass mode to potentially check inside refine if needed, although condition is outside
        },
      ),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  });
};

interface SignInFormProps {
  mode: SignInMode;
  onSwitchMode: (mode?: SignInMode) => void;
}

export const SignInForm = ({ mode, onSwitchMode }: SignInFormProps) => {
  const navigate = useNavigate();
  const { signInWithEmailAndPassword, signInWithUsernameAndPassword, error } =
    useAuthActions();

  // Memoize the schema based on the mode
  const formSchema = useMemo(() => createFormSchema(mode), [mode]);
  type FormData = z.infer<typeof formSchema>;

  // Musical form hooks (adjust melodies if needed)
  const identifierForm = useMusicalForm({
    typingMelody: EmailMelody,
    successProgression: SuccessProgression,
    failureProgression: FailureProgression,
    autofillProgression: AutofillProgression,
  });

  const passwordForm = useMusicalForm({
    typingMelody: PasswordMelody,
    successProgression: SuccessProgression,
    failureProgression: FailureProgression,
    autofillProgression: AutofillProgression,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
    context: { mode }, // Pass mode to zod resolver context if needed by refine
  });

  const onSubmit = useCallback(
    async (data: FormData) => {
      try {
        if (mode === 'teacher') {
          await signInWithEmailAndPassword(data.identifier, data.password);
        } else {
          await signInWithUsernameAndPassword(data.identifier, data.password);
        }
      } catch (err) {
        // Error is handled by the useAuthActions hook and displayed below
        identifierForm.playFailureProgression();
        console.error('Sign in failed:', err);
      }
    },
    [
      mode,
      signInWithEmailAndPassword,
      signInWithUsernameAndPassword,
      identifierForm,
    ],
  );

  const identifierLabel = mode === 'teacher' ? 'Email' : 'Username';

  const studentPlaceholder = useRef(
    FUNNY_MUSIC_RELATED_USERNAMES[
      Math.floor(Math.random() * FUNNY_MUSIC_RELATED_USERNAMES.length)
    ],
  ).current;

  const identifierPlaceholder =
    mode === 'teacher' ? 'teacher@example.com' : studentPlaceholder;

  const identifierAutoComplete = mode === 'teacher' ? 'email' : 'username';

  return (
    <div className="animate-fade-in-bottom">
      <CardHeader className="relative">
        <Button
          aria-label="Go back to mode selection"
          className="absolute left-2 top-2 size-8"
          size="icon"
          variant="ghost"
          onClick={() => onSwitchMode()}
        >
          <ArrowLeft className="size-5" />
        </Button>
        <CardTitle className="text-center text-2xl">
          Sign In as {mode === 'teacher' ? 'Teacher' : 'Student'}
        </CardTitle>
        <CardDescription className="text-center">
          Enter your {identifierLabel.toLowerCase()} and password below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="identifier"
              render={({ field }) => {
                const {
                  onKeyDown: _ignoreKeyDown,
                  ...identifierInputProps
                } = identifierForm.createInputProps(field.onChange);

                return (
                  <FormItem>
                    <FormLabel>{identifierLabel}</FormLabel>
                    <FormControl>
                      <Input
                        autoComplete={identifierAutoComplete}
                        placeholder={identifierPlaceholder}
                        {...field}
                        {...identifierInputProps}
                        onKeyDown={() => {
                          identifierForm.playTypingNote();
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => {
                const {
                  onKeyDown: _ignoreKeyDown,
                  ...passwordInputProps
                } = passwordForm.createInputProps(field.onChange);

                return (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        autoComplete="current-password"
                        type="password"
                        {...field}
                        {...passwordInputProps}
                        onKeyDown={() => {
                          passwordForm.playTypingNote();
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <div className="text-right text-sm">
              <Button
                className="h-auto p-0 font-medium"
                type="button" // Prevent form submission
                variant="link"
                onClick={() => navigate(AuthRoutes.forgotPassword())}
              >
                Forgot password?
              </Button>
            </div>

            <Button
              className="w-full"
              disabled={form.formState.isSubmitting}
              type="submit"
            >
              {form.formState.isSubmitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </Form>

        {error && (
          <div className="my-4">
            <ErrorBox message={error} />
          </div>
        )}

        <div className="mt-4 text-center text-sm">
          <Button
            className="h-auto p-0"
            type="button"
            variant="link"
            onClick={() =>
              onSwitchMode(mode === 'teacher' ? 'student' : 'teacher')
            }
          >
            Not a {mode}? Sign in as a{' '}
            {mode === 'teacher' ? 'student' : 'teacher'}.
          </Button>
        </div>
      </CardContent>
    </div>
  );
};
