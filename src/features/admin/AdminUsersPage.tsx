import { Plus, RotateCw, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
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
  useFreeAccessRules,
  type FreeAccessRule,
} from '@/hooks/data/admin/useAdminFreeAccess';
import {
  useAdminUsers,
  useUpdateUserRole,
  type AdminUser,
} from '@/hooks/data/admin/useAdminUsers';
import { ConsoleCallout } from './ui/ConsoleCallout';
import { ConsolePageHeader } from './ui/ConsolePageHeader';
import { InsiderAccessDialogs } from './users/InsiderAccessDialogs';
import {
  ROLE_LABELS,
  StatStrip,
  UsersTable,
  type AssignableRole,
} from './users/UsersTable';
import {
  plural,
  type AccessModel,
  type InsiderDialog,
} from './users/accessModel';
import {
  indexRules,
  isServerInsider,
  matchesSubscriptionFilter,
  parseSubscriptionFilter,
  ruleRowMatchesSearch,
  ruleRows,
  rulesForUser,
  showsRuleRows,
  type SubscriptionFilter,
} from './users/insiderAccess';

const DEBOUNCE_MS = 300;

/**
 * Everyone registered, with insider access managed where it shows: in each
 * account's Subscription cell. Rules no account row can hold — domain rules
 * and emails granted before their owner signed up — are rows of their own.
 * /console/free-access redirects here filtered to insider access.
 */
export const AdminUsersPage = () => {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  // In the URL, so the old Insider Access link can land pre-filtered.
  const [params, setParams] = useSearchParams();
  const subscriptionFilter = parseSubscriptionFilter(
    params.get('subscription'),
  );
  const setSubscriptionFilter = (next: SubscriptionFilter) =>
    setParams(
      (prev) => {
        const out = new URLSearchParams(prev);
        if (next === 'all') out.delete('subscription');
        else out.set('subscription', next);
        return out;
      },
      { replace: true },
    );

  // The role change is now an explicit destination rather than a toggle. With a
  // single "Revert to Student" item, an editor's row read as one click away
  // from demotion and the dialog never said which role it was moving them to.
  const [confirmChange, setConfirmChange] = useState<{
    user: AdminUser;
    role: AssignableRole;
  } | null>(null);
  const [dialog, setDialog] = useState<InsiderDialog | null>(null);

  const updateRole = useUpdateUserRole();

  // Dialogs here open from page state, so Radix can't return focus on close;
  // the control that opened one is remembered and refocused instead.
  const returnFocus = useRef<HTMLElement | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const restoreFocus = () => {
    const target = returnFocus.current;
    (target?.isConnected ? target : searchRef.current)?.focus();
  };

  const roleName = (user: AdminUser) => user.username ?? user.nickname;

  const handleConfirmRoleChange = () => {
    if (!confirmChange) return;
    const { user, role } = confirmChange;
    updateRole.mutate(
      { id: user.id, role },
      {
        onSuccess: () => {
          toast.success('Role updated', {
            description: `${roleName(user)} is now a ${ROLE_LABELS[role].toLowerCase()}. They may need to sign out and back in for it to take effect.`,
          });
          setConfirmChange(null);
        },
        onError: (err) => {
          toast.error('Could not change role', { description: err.message });
          setConfirmChange(null);
        },
      },
    );
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, DEBOUNCE_MS);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const usersQuery = useAdminUsers({
    search: debouncedSearch || undefined,
    role: roleFilter !== 'all' ? (roleFilter as AdminUser['role']) : undefined,
  });
  // Everyone, whatever the table is filtered to: the stats, domain counts and
  // "no account yet" all need the whole list. Unfiltered, it's the table's
  // own query (same key), so it costs nothing extra.
  const everyoneQuery = useAdminUsers({});
  const rulesQuery = useFreeAccessRules();

  const rules = useMemo(() => rulesQuery.data ?? [], [rulesQuery.data]);
  const index = useMemo(() => indexRules(rules), [rules]);
  const now = new Date();

  // The table's rows can be fresher than the unfiltered list (a sign-up
  // since); merge them in so a new account doesn't read as "no account yet".
  const knownAccounts = useMemo(() => {
    if (!everyoneQuery.data) return undefined;
    const byId = new Map(everyoneQuery.data.map((user) => [user.id, user]));
    for (const user of usersQuery.data ?? []) byId.set(user.id, user);
    return [...byId.values()];
  }, [everyoneQuery.data, usersQuery.data]);

  const model: AccessModel = {
    ready: !!rulesQuery.data,
    rules,
    index,
    everyone: knownAccounts,
    now,
    fetchedAt: usersQuery.dataUpdatedAt
      ? new Date(usersQuery.dataUpdatedAt)
      : now,
    syncing: usersQuery.isFetching || rulesQuery.isFetching,
    refresh: () => {
      void rulesQuery.refetch();
      void usersQuery.refetch();
    },
    rememberFocus: (element) => {
      returnFocus.current = element;
    },
    restoreFocus,
  };

  const allRuleRows =
    rulesQuery.data && knownAccounts ? ruleRows(rules, knownAccounts, now) : [];
  const visibleRuleRows = showsRuleRows(roleFilter, subscriptionFilter)
    ? allRuleRows.filter((row) =>
        ruleRowMatchesSearch(row.rule, debouncedSearch),
      )
    : [];

  const accessFor = (user: AdminUser) =>
    rulesQuery.data ? rulesForUser(user.email, index, now) : null;
  const users = (usersQuery.data ?? []).filter((user) =>
    matchesSubscriptionFilter(
      user,
      subscriptionFilter,
      accessFor(user) ?? { expired: [] },
    ),
  );

  const everyone = everyoneQuery.data;
  const preGranted = allRuleRows.filter(
    (row) =>
      row.health === 'active' &&
      (row.kind === 'pre-granted' || row.accountCount === 0),
  ).length;

  const usersLoading = usersQuery.isLoading;
  const usersFailed = usersQuery.isError && !usersQuery.data;
  const rulesFailed = rulesQuery.isError && !rulesQuery.data;
  const domainRuleCount = visibleRuleRows.filter(
    (row) => row.kind === 'domain',
  ).length;
  const preGrantedRowCount = visibleRuleRows.length - domainRuleCount;

  const showAccounts = (rule: FreeAccessRule) => {
    setSearchInput(`@${rule.value}`);
    setDebouncedSearch(`@${rule.value}`);
  };

  return (
    <div className="animate-fade-in-bottom space-y-6">
      <ConsolePageHeader
        title="Users"
        description="Everyone registered and their subscription. Grant or change insider access from the Subscription column."
        actions={
          <Button
            disabled={!model.ready}
            onClick={(event) => {
              returnFocus.current = event.currentTarget;
              setDialog({ kind: 'add' });
            }}
          >
            <Plus className="mr-2 size-4" />
            Add insider access
          </Button>
        }
      />

      <StatStrip
        stats={[
          {
            label: 'Total users',
            value: everyone ? everyone.length.toLocaleString() : '—',
          },
          {
            label: 'Paying',
            value: everyone
              ? everyone
                  .filter(
                    (user) => user.hasPaidAccess && !isServerInsider(user),
                  )
                  .length.toLocaleString()
              : '—',
          },
          {
            label: 'Insider access',
            value: everyone
              ? everyone.filter(isServerInsider).length.toLocaleString()
              : '—',
            hint: 'Accounts with access now',
          },
          {
            label: 'Pre-granted',
            value:
              rulesQuery.data && knownAccounts
                ? preGranted.toLocaleString()
                : '—',
            hint: 'Emails and domains waiting for a sign-up',
          },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
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
            <SelectItem value="editor">Content editor</SelectItem>
            <SelectItem value="teacher">Teacher</SelectItem>
            <SelectItem value="student">Student</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={subscriptionFilter}
          onValueChange={(value) =>
            setSubscriptionFilter(value as SubscriptionFilter)
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All subscriptions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subscriptions</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="insider_access">Insider Access</SelectItem>
            <SelectItem value="past_due">Past Due</SelectItem>
            <SelectItem value="canceled">Canceled</SelectItem>
            <SelectItem value="free">Free</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {rulesFailed && (
        // Not "no rules": that would invite re-granting access that exists.
        <ConsoleCallout
          title="Couldn’t load insider access rules"
          tone="warning"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>
              Badges still show, but insider access can’t be changed until the
              rules load.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void rulesQuery.refetch()}
            >
              <RotateCw className="mr-2 size-3.5" />
              Try again
            </Button>
          </div>
        </ConsoleCallout>
      )}

      {rulesQuery.data &&
        !knownAccounts &&
        !everyoneQuery.isLoading &&
        !usersFailed && (
          <p className="text-sm text-white/55">
            Emails granted before sign-up and domain rules appear once the full
            user list loads.{' '}
            <button
              className="underline underline-offset-4 hover:text-white"
              type="button"
              onClick={() => void everyoneQuery.refetch()}
            >
              Retry
            </button>
          </p>
        )}

      {usersLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : usersFailed ? (
        <ConsoleCallout tone="danger" title="Couldn’t load users">
          {usersQuery.error instanceof Error
            ? usersQuery.error.message
            : 'The users request failed.'}
        </ConsoleCallout>
      ) : users.length === 0 && visibleRuleRows.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          {debouncedSearch ||
          roleFilter !== 'all' ||
          subscriptionFilter !== 'all'
            ? 'Nothing matches these filters'
            : 'No users yet'}
        </div>
      ) : (
        <>
          {usersQuery.isRefetchError && (
            <p className="text-sm text-amber-200/80">
              Couldn’t refresh — showing earlier results.{' '}
              <button
                className="underline underline-offset-4 hover:text-white"
                type="button"
                onClick={() => void usersQuery.refetch()}
              >
                Retry
              </button>
            </p>
          )}
          <UsersTable
            accessFor={accessFor}
            model={model}
            ruleRows={visibleRuleRows}
            users={users}
            onChangeRole={(user, role, trigger) => {
              returnFocus.current = trigger;
              setConfirmChange({ user, role });
            }}
            onOpen={setDialog}
            onShowAccounts={showAccounts}
          />
          <div className="text-xs text-muted-foreground">
            {[
              plural(users.length, 'user'),
              domainRuleCount > 0 && plural(domainRuleCount, 'domain rule'),
              preGrantedRowCount > 0 &&
                plural(preGrantedRowCount, 'pre-granted email'),
            ]
              .filter(Boolean)
              .join(' · ')}
          </div>
        </>
      )}

      <InsiderAccessDialogs
        dialog={dialog}
        model={model}
        onClose={() => setDialog(null)}
        onOpen={setDialog}
      />

      <AlertDialog
        open={!!confirmChange}
        onOpenChange={(open) => {
          if (!open) setConfirmChange(null);
        }}
      >
        <AlertDialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            restoreFocus();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Change user role</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmChange
                ? `Change ${roleName(confirmChange.user)} from ${
                    ROLE_LABELS[confirmChange.user.role as AssignableRole] ??
                    confirmChange.user.role
                  } to ${ROLE_LABELS[confirmChange.role]}?${
                    confirmChange.role === 'editor'
                      ? ' A content editor sees only the Content tab of this console, and their saves wait for an admin to approve them.'
                      : ''
                  } The change may take a few minutes to reach them, or take effect immediately if they sign out and back in.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateRole.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmRoleChange();
              }}
              disabled={updateRole.isPending}
            >
              {updateRole.isPending ? 'Changing…' : 'Yes'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
