import { zodResolver } from '@hookform/resolvers/zod';
import { REGEXP_ONLY_DIGITS_AND_CHARS } from 'input-otp';
import { AlertCircle } from 'lucide-react';
import { useCallback, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation } from 'react-router-dom';
import { z } from 'zod';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
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
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { cn } from '@/components/utilities';
import {
  EmailMelody,
  SuccessProgression,
  FailureProgression,
  AutofillProgression,
  PasswordMelody,
} from '@/constants/musicalConstants';
import { AuthRoutes } from '@/constants/routes';
import { useAuthActions } from '@/contexts/AuthContext';
import { useClassroomDetailsByCode } from '@/hooks/data';
import { useMusicalForm } from '@/hooks/useMusicalForm';

const codeFormSchema = z.object({
  classroomCode: z
    .string()
    .length(8, 'Classroom code must be exactly 8 characters')
    .regex(
      new RegExp(REGEXP_ONLY_DIGITS_AND_CHARS),
      'Invalid classroom code format',
    ),
});

const registrationFormSchema = z
  .object({
    firstName: z
      .string()
      .min(1, 'First name is required')
      .regex(/^\S*$/, 'First name cannot contain spaces'),
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(20, 'Username must be at most 20 characters')
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        'Username can only contain letters, numbers, underscores, and hyphens',
      ),
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Please enter a valid date')
      .refine((date) => {
        const dob = new Date(date);
        const now = new Date();
        const age = now.getFullYear() - dob.getFullYear();
        return age >= 13;
      }, 'You must be at least 13 years old to register'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const StudentRegistrationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [classroomCode, setClassroomCode] = useState<string>();
  const {
    data: classroom,
    error: classroomError,
    isFetching: isFetchingClassroom,
  } = useClassroomDetailsByCode(classroomCode);

  const {
    signUpAsStudent,
    error: signUpError,
    isPending: isSigningUp,
  } = useAuthActions();

  const codeForm = useForm<z.infer<typeof codeFormSchema>>({
    resolver: zodResolver(codeFormSchema),
    defaultValues: {
      classroomCode: '',
    },
  });

  // Get code from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const codeFromUrl = params.get('code');

    if (codeFromUrl && codeFromUrl.length === 8) {
      codeForm.setValue('classroomCode', codeFromUrl);
      setClassroomCode(codeFromUrl);
    }
  }, [location.search, codeForm]);

  const classroomCodeForm = useMusicalForm({
    typingMelody: EmailMelody,
  });

  const onCodeSubmit = useCallback(
    async (data: z.infer<typeof codeFormSchema>) => {
      try {
        setClassroomCode(data.classroomCode);
        classroomCodeForm.playSuccessProgression();
      } catch (error) {
        classroomCodeForm.playFailureProgression();
      }
    },
    [classroomCodeForm],
  );

  const registrationForm = useForm<z.infer<typeof registrationFormSchema>>({
    resolver: zodResolver(registrationFormSchema),
    defaultValues: {
      firstName: '',
      username: '',
      dateOfBirth: '',
      password: '',
      confirmPassword: '',
    },
  });

  const firstNameForm = useMusicalForm({
    typingMelody: EmailMelody,
    successProgression: SuccessProgression,
    failureProgression: FailureProgression,
    autofillProgression: AutofillProgression,
  });

  const usernameForm = useMusicalForm({
    typingMelody: EmailMelody,
    successProgression: SuccessProgression,
    failureProgression: FailureProgression,
    autofillProgression: AutofillProgression,
  });

  const dateOfBirthForm = useMusicalForm({
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

  const onRegistrationSubmit = useCallback(
    async (data: z.infer<typeof registrationFormSchema>) => {
      if (!classroomCode) return;

      try {
        await signUpAsStudent({
          username: data.username,
          birthDate: new Date(data.dateOfBirth),
          code: classroomCode,
          password: data.password,
          nickname: data.firstName,
        });

        usernameForm.playSuccessProgression();
        navigate(AuthRoutes.root());
      } catch (error) {
        usernameForm.playFailureProgression();
      }
    },
    [classroomCode, navigate, signUpAsStudent, usernameForm],
  );

  if (!classroomCode || !classroom) {
    return (
      <div className="animate-fade-in-bottom">
        <CardHeader>
          <CardTitle className="text-2xl">Join Your Music Class</CardTitle>
          <CardDescription>
            Enter the class code from your teacher to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...codeForm}>
            <form
              className={cn('space-y-4', isFetchingClassroom && 'opacity-50')}
              onSubmit={codeForm.handleSubmit(onCodeSubmit)}
            >
              <FormField
                control={codeForm.control}
                name="classroomCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class Code</FormLabel>
                    <FormControl>
                      <InputOTP
                        maxLength={8}
                        pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
                        value={field.value}
                        onChange={(value) => {
                          field.onChange(value);
                          classroomCodeForm.playTypingNote();
                        }}
                        onComplete={() => {
                          codeForm.handleSubmit(onCodeSubmit)();
                        }}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                        </InputOTPGroup>
                        <InputOTPGroup>
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                          <InputOTPSlot index={6} />
                          <InputOTPSlot index={7} />
                        </InputOTPGroup>
                      </InputOTP>
                    </FormControl>
                    <FormMessage />
                    <p className="text-sm text-muted-foreground">
                      Enter the 8-character code your teacher gave you
                    </p>
                  </FormItem>
                )}
              />

              <Button
                className="w-full"
                disabled={isFetchingClassroom}
                type="submit"
              >
                Continue
              </Button>
            </form>
          </Form>
          {classroomError && (
            <Alert className="mt-4" variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>Invalid classroom code</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-bottom space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-lg">Joining {classroom.name}</CardTitle>
          <CardDescription>
            Teacher: {classroom.teacherName}
            <br />
            Year: {classroom.year}
            {classroom.description && (
              <>
                <br />
                {classroom.description}
              </>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      <div>
        <CardHeader>
          <CardTitle className="text-2xl">Create Your Account</CardTitle>
          <CardDescription>
            Set up your account to start your musical journey!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...registrationForm}>
            <form
              className="space-y-4"
              onSubmit={registrationForm.handleSubmit(onRegistrationSubmit)}
            >
              <FormField
                control={registrationForm.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input
                        autoComplete="given-name"
                        placeholder="John"
                        {...field}
                        {...firstNameForm.createInputProps(field.onChange)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={registrationForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input
                        autoComplete="username"
                        placeholder="coolmusician123"
                        {...field}
                        {...usernameForm.createInputProps(field.onChange)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={registrationForm.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input
                        autoComplete="bday"
                        max={new Date().toISOString().split('T')[0]}
                        type="date"
                        {...field}
                        {...dateOfBirthForm.createInputProps(field.onChange)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={registrationForm.control}
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
                control={registrationForm.control}
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
                {isSigningUp ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>
          </Form>
          {signUpError && (
            <Alert className="mt-4" variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>Failed to create account</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </div>
    </div>
  );
};
