import { User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthActions } from '@/contexts/AuthContext';
import { useMe } from '@/hooks/data';

export const StudentProfilePage = () => {
  const { signOut } = useAuthActions();
  const { data: user } = useMe();

  return (
    <div className="container px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">My Profile</h1>

      <Card className="mx-auto max-w-md">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
              <User className="size-8 text-primary" />
            </div>
            <CardTitle>
              {user?.username || user?.nickname || 'Student'}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {user?.email && (
            <div>
              <div className="text-sm text-muted-foreground">Email</div>
              <div>{user.email}</div>
            </div>
          )}

          <div>
            <div className="text-sm text-muted-foreground">Account Type</div>
            <div>Student</div>
          </div>

          <Button
            className="w-full"
            variant="outline"
            onClick={() => signOut()}
          >
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
