import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { useResetPassword } from '@/hooks/data/auth/useResetPassword';

// Define the schema with password confirmation
const formSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'], // Set the error path to the confirmPassword field
  });

type FormData = z.infer<typeof formSchema>;

export const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    mutate: resetPassword,
    isPending,
    error: mutationError,
  } = useResetPassword();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = useCallback(
    (data: FormData) => {
      if (!token) {
        // This should ideally be handled earlier or with better UX
        form.setError('root', { message: 'Reset token is missing.' });
        return;
      }
      resetPassword(
        { password: data.password, token },
        {
          onSuccess: () => {
            setSuccessMessage(
              'Password reset successfully! Redirecting to login...',
            );
            setTimeout(() => navigate(AuthRoutes.signIn()), 3000); // Redirect after a delay
          },
          // onError is handled by the mutationError state
        },
      );
    },
    [resetPassword, token, navigate, form],
  );

  if (!token) {
    return (
      <Card className="mx-auto mt-10 w-full max-w-md animate-fade-in-bottom">
        <CardHeader>
          <CardTitle className="text-2xl">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorBox message="Password reset token is missing or invalid. Please request a new password reset link." />
          <Button
            className="mt-4"
            variant="link"
            onClick={() => navigate(AuthRoutes.forgotPassword())}
          >
            Request Reset Link
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (successMessage) {
    return (
      <Card className="mx-auto mt-10 w-full max-w-md animate-fade-in-bottom">
        <CardHeader>
          <CardTitle className="text-2xl">Success!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-green-600">{successMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto mt-10 w-full max-w-md animate-fade-in-bottom">
      <CardHeader>
        <CardTitle className="text-2xl">Reset Your Password</CardTitle>
        <CardDescription>Enter your new password below.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
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
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button className="w-full" disabled={isPending} type="submit">
              {isPending ? 'Resetting Password...' : 'Reset Password'}
            </Button>
          </form>
        </Form>

        {(mutationError || form.formState.errors.root) && (
          <div className="my-4">
            <ErrorBox
              message={
                mutationError?.message ||
                form.formState.errors.root?.message ||
                'An unknown error occurred.'
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
