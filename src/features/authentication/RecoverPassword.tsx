import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { ErrorBox } from '@/components/ErrorBox';
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
import { AuthRoutes } from '@/constants/routes';
import { useRecoverPassword } from '@/hooks/data/auth/useRecoverPassword';

// Define the schema for the email
const formSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type FormData = z.infer<typeof formSchema>;

export const RecoverPassword = () => {
  const navigate = useNavigate();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    mutate: recoverPassword,
    isPending,
    error: mutationError,
  } = useRecoverPassword();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = useCallback(
    (data: FormData) => {
      recoverPassword(
        { email: data.email },
        {
          onSuccess: () => {
            setSuccessMessage(
              'If an account exists for this email, a password reset link has been sent.',
            );
            form.reset(); // Clear the form on success
          },
          // onError is handled by the mutationError state
        },
      );
    },
    [recoverPassword, form],
  );

  if (successMessage) {
    return (
      <Card className="mx-auto mt-10 w-full max-w-md animate-fade-in-bottom">
        <CardHeader>
          <CardTitle className="text-2xl">Check Your Email</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-green-600">{successMessage}</p>
          <Button
            className="mt-4 w-full"
            onClick={() => navigate(AuthRoutes.signIn())}
          >
            Back to Sign In
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto mt-10 w-full max-w-md animate-fade-in-bottom">
      <CardHeader>
        <CardTitle className="text-2xl">Forgot Your Password?</CardTitle>
        <CardDescription>
          Enter your email address below and we&apos;ll send you a link to reset
          your password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="email"
                      placeholder="example@email.com"
                      type="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button className="w-full" disabled={isPending} type="submit">
              {isPending ? 'Sending Reset Link...' : 'Send Password Reset Link'}
            </Button>
          </form>
        </Form>

        {mutationError && (
          <div className="my-4">
            {/* We typically don't show specific errors here for security reasons */}
            {/* but display a generic message or log the error */}
            <ErrorBox
              message={
                mutationError.message ||
                'An error occurred while sending the reset link.'
              }
            />
          </div>
        )}

        <div className="mt-4 text-center text-sm">
          Remembered your password?{' '}
          <Button
            className="p-0 text-sm font-medium"
            variant="link"
            onClick={() => navigate(AuthRoutes.signIn())}
          >
            Sign In
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
