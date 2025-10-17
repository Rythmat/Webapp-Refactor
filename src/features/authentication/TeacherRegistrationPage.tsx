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
  EmailMelody,
  SuccessProgression,
  FailureProgression,
  AutofillProgression,
  PasswordMelody,
} from '@/constants/musicalConstants';
import { useAuthActions } from '@/contexts/AuthContext';
import { GetTeachersInvitationsByCodeData } from '@/contexts/MusicAtlasContext';
import { useTeacherInvitationDetails } from '@/hooks/data';
import { useMusicalForm } from '@/hooks/useMusicalForm';
import { TeacherInvitationCard } from './components/TeacherInvitationCard';

const formSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    nickname: z.string().min(2, 'Nickname must be at least 2 characters'),
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const TeacherRegistrationPage = () => {
  const { code } = useParams<{ code: string }>();
  const { signInWithEmailAndPassword } = useAuthActions();
  const {
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

  const passwordForm = useMusicalForm({
    typingMelody: PasswordMelody,
    successProgression: SuccessProgression,
    failureProgression: FailureProgression,
    autofillProgression: AutofillProgression,
  });

  const confirmPasswordForm = useMusicalForm({
    typingMelody: PasswordMelody,
    successProgression: SuccessProgression,
    failureProgression: FailureProgression,
    autofillProgression: AutofillProgression,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      nickname: '',
      fullName: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onInvitationLoad = useCallback(
    (invite: GetTeachersInvitationsByCodeData) => {
      form.setValue('email', invite.email);
    },
    [form],
  );

  const onSubmit = useCallback(
    async (data: z.infer<typeof formSchema>) => {
      if (!code) {
        return;
      }

      try {
        await signUpAsTeacher({
          code: code,
          fullName: data.fullName,
          password: data.password,
          email: data.email,
          nickname: data.nickname,
        });

        fullNameForm.playSuccessProgression();
        await signInWithEmailAndPassword(data.email, data.password);
      } catch (error) {
        fullNameForm.playFailureProgression();
      }
    },
    [code, signInWithEmailAndPassword, signUpAsTeacher, fullNameForm],
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

      {!isPending && !invitationError && (
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
                          placeholder="Your first name or nickname, e.g. 'Bach'"
                          {...field}
                          {...nicknameForm.createInputProps(field.onChange)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          autoComplete="new-password"
                          type="password"
                          {...field}
                          {...passwordForm.createInputProps(field.onChange)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          autoComplete="new-password"
                          type="password"
                          {...field}
                          {...confirmPasswordForm.createInputProps(
                            field.onChange,
                          )}
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
                  Failed to complete registration
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </div>
      )}
    </div>
  );
};
