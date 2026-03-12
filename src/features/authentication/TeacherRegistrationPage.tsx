import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle } from 'lucide-react';
import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { z } from 'zod';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  AutofillProgression,
  EmailMelody,
  FailureProgression,
  SuccessProgression,
} from '@/constants/musicalConstants';
import { useAuthActions, useAuthContext } from '@/contexts/AuthContext';
import { GetTeachersInvitationsByCodeData } from '@/contexts/MusicAtlasContext';
import { useTeacherInvitationDetails } from '@/hooks/data';
import { useMusicalForm } from '@/hooks/useMusicalForm';
import { TeacherInvitationCard } from './components/TeacherInvitationCard';

const formSchema = z.object({
  nickname: z.string().min(2, 'Nickname must be at least 2 characters'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
});

export const TeacherRegistrationPage = () => {
  const { code } = useParams<{ code: string }>();
  const { appUser } = useAuthContext();
  const {
    signUp,
    signUpAsTeacher,
    error: signUpError,
    isPending: isSigningUp,
  } = useAuthActions();

  const { isPending, error: invitationError } =
    useTeacherInvitationDetails(code);

  const fullNameForm = useMusicalForm({
    typingMelody: EmailMelody,
    successProgression: SuccessProgression,
    failureProgression: FailureProgression,
    autofillProgression: AutofillProgression,
  });

  const nicknameForm = useMusicalForm({
    typingMelody: EmailMelody,
    successProgression: SuccessProgression,
    failureProgression: FailureProgression,
    autofillProgression: AutofillProgression,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nickname: '',
      fullName: '',
    },
  });

  const onInvitationLoad = useCallback(
    (_invite: GetTeachersInvitationsByCodeData) => {
      if (appUser?.nickname) {
        form.setValue('nickname', appUser.nickname);
      }

      if (appUser?.fullName) {
        form.setValue('fullName', appUser.fullName);
      }
    },
    [appUser?.fullName, appUser?.nickname, form],
  );

  const onSubmit = useCallback(
    async (data: z.infer<typeof formSchema>) => {
      if (!code) {
        return;
      }

      try {
        await signUpAsTeacher({
          code,
          fullName: data.fullName,
          nickname: data.nickname,
        });

        fullNameForm.playSuccessProgression();
      } catch {
        fullNameForm.playFailureProgression();
      }
    },
    [code, fullNameForm, signUpAsTeacher],
  );

  if (!code) {
    return (
      <div className="animate-fade-in-bottom">
        <CardHeader>
          <CardTitle className="text-2xl">Invalid Invitation</CardTitle>
          <CardDescription>
            This invitation link is invalid or has expired.
          </CardDescription>
        </CardHeader>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-bottom space-y-6">
      <TeacherInvitationCard code={code} onLoad={onInvitationLoad} />

      {!isPending && !invitationError && !appUser && (
        <div className="animate-fade-in-bottom">
          <CardHeader>
            <CardTitle className="text-2xl">
              Create Your Auth0 Account
            </CardTitle>
            <CardDescription>
              Continue with Auth0 first, then finish teacher setup.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => {
                void signUp();
              }}
              type="button"
            >
              Continue with Auth0
            </Button>
          </CardContent>
        </div>
      )}

      {!isPending && !invitationError && appUser && (
        <div className="animate-fade-in-bottom">
          <CardHeader>
            <CardTitle className="text-2xl">Complete Registration</CardTitle>
            <CardDescription>
              Complete your teacher account setup
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                className="space-y-4"
                onSubmit={form.handleSubmit(onSubmit)}
              >
                <FormItem>
                  <FormLabel>Signed In Email</FormLabel>
                  <FormControl>
                    <Input value={appUser.email ?? ''} disabled readOnly />
                  </FormControl>
                </FormItem>

                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input
                          autoComplete="name"
                          placeholder="e.g. Johann Sebastian Bach"
                          {...field}
                          {...fullNameForm.createInputProps(field.onChange)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nickname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What may we call you?</FormLabel>
                      <FormControl>
                        <Input
                          autoComplete="nickname"
                          placeholder="Your first name or nickname"
                          {...field}
                          {...nicknameForm.createInputProps(field.onChange)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button className="w-full" disabled={isSigningUp} type="submit">
                  {isSigningUp ? 'Completing...' : 'Complete Registration'}
                </Button>
              </form>
            </Form>
            {signUpError && (
              <Alert className="mt-4" variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription>
                  {signUpError || 'Failed to complete registration'}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </div>
      )}
    </div>
  );
};
