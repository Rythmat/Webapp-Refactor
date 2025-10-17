import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AuthRoutes } from '@/constants/routes';

interface SignInModeSelectorProps {
  onSelectMode: (mode: 'teacher' | 'student') => void;
}

export const SignInModeSelector = ({
  onSelectMode,
}: SignInModeSelectorProps) => {
  return (
    <div className="animate-fade-in-bottom">
      <CardHeader>
        <CardTitle className="text-2xl">Welcome back!</CardTitle>
        <CardDescription>Are you a Teacher or a Student?</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col space-y-4">
        <Button className="w-full" onClick={() => onSelectMode('student')}>
          Sign in as Student
        </Button>
        <Button
          className="w-full"
          variant="outline"
          onClick={() => onSelectMode('teacher')}
        >
          Sign in as Teacher
        </Button>
        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-surface-box px-2 text-muted-foreground">
              Or
            </span>
          </div>
        </div>
        <Button asChild className="w-full" variant="outline">
          <Link to={AuthRoutes.signUpAsStudent()}>Join a classroom</Link>
        </Button>
      </CardContent>
    </div>
  );
};
