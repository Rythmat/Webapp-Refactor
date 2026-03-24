import { format } from 'date-fns';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useAdminUsers,
  type AdminUser,
} from '@/hooks/data/admin/useAdminUsers';

const DATE_FORMAT = 'MMM d, yyyy';
const DEBOUNCE_MS = 300;

function subscriptionBadge(user: AdminUser) {
  if (user.hasPaidAccess) {
    const label =
      user.subscriptionTier === 'free'
        ? 'Active'
        : user.subscriptionTier.charAt(0).toUpperCase() +
          user.subscriptionTier.slice(1);

    return (
      <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-600/30">
        {label}
        {user.cancelAtPeriodEnd ? ' (canceling)' : ''}
      </Badge>
    );
  }

  if (user.subscriptionStatus === 'past_due') {
    return (
      <Badge className="bg-amber-600/20 text-amber-400 border-amber-600/30">
        Past Due
      </Badge>
    );
  }

  if (user.subscriptionStatus === 'canceled') {
    return (
      <Badge className="bg-red-600/20 text-red-400 border-red-600/30">
        Canceled
      </Badge>
    );
  }

  return (
    <Badge
      variant="secondary"
      className="bg-white/5 text-white/50 border-white/10"
    >
      Free
    </Badge>
  );
}

function roleBadge(role: AdminUser['role']) {
  switch (role) {
    case 'admin':
      return (
        <Badge className="bg-purple-600/20 text-purple-400 border-purple-600/30">
          Admin
        </Badge>
      );
    case 'teacher':
      return (
        <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30">
          Teacher
        </Badge>
      );
    case 'student':
      return (
        <Badge className="bg-white/5 text-white/50 border-white/10">
          Student
        </Badge>
      );
  }
}

export const AdminUsersPage = () => {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>('all');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, DEBOUNCE_MS);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const { data: allUsers = [], isLoading } = useAdminUsers({
    search: debouncedSearch || undefined,
    role:
      roleFilter !== 'all'
        ? (roleFilter as 'admin' | 'teacher' | 'student')
        : undefined,
  });

  const users = subscriptionFilter === 'all'
    ? allUsers
    : allUsers.filter((user) => {
        switch (subscriptionFilter) {
          case 'active':
            return user.hasPaidAccess;
          case 'past_due':
            return user.subscriptionStatus === 'past_due';
          case 'canceled':
            return user.subscriptionStatus === 'canceled';
          case 'free':
            return !user.hasPaidAccess && user.subscriptionStatus !== 'past_due' && user.subscriptionStatus !== 'canceled';
          default:
            return true;
        }
      });

  return (
    <div className="animate-fade-in-bottom space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Users</h1>
        <p className="text-muted-foreground">
          View all registered users and their subscription status
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="w-64 rounded-full pl-9"
            placeholder="Search by name or email"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="teacher">Teacher</SelectItem>
            <SelectItem value="student">Student</SelectItem>
          </SelectContent>
        </Select>
        <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All subscriptions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subscriptions</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="past_due">Past Due</SelectItem>
            <SelectItem value="canceled">Canceled</SelectItem>
            <SelectItem value="free">Free</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          {debouncedSearch || roleFilter !== 'all' || subscriptionFilter !== 'all'
            ? 'No users found matching your filters'
            : 'No users found'}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Subscription</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  {user.fullName || user.nickname}
                  {user.username && (
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      @{user.username}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {user.email || '-'}
                </TableCell>
                <TableCell>{roleBadge(user.role)}</TableCell>
                <TableCell>{subscriptionBadge(user)}</TableCell>
                <TableCell className="capitalize">
                  {user.subscriptionTier}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(user.createdAt), DATE_FORMAT)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="text-xs text-muted-foreground">
        {users.length} user{users.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
};
