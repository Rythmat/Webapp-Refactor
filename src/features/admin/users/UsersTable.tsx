import { format } from 'date-fns';
import { ChevronDown, Globe, Mail } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/components/utilities';
import type { FreeAccessRule } from '@/hooks/data/admin/useAdminFreeAccess';
import type { AdminUser } from '@/hooks/data/admin/useAdminUsers';
import { ConsoleBadge } from '../ui/ConsoleBadge';
import { CONSOLE_LABEL, CONSOLE_TABLE_HEAD } from '../ui/styles';
import { RuleSubscriptionCell, UserSubscriptionCell } from './SubscriptionCell';
import { plural, type AccessModel, type InsiderDialog } from './accessModel';
import type { RuleRow, UserAccess } from './insiderAccess';

const DATE_FORMAT = 'MMM d, yyyy';

/**
 * Roles an admin can assign. `admin` is not among them — the API refuses to
 * reassign an admin account, and there is no promotion path to one here.
 */
export const ASSIGNABLE_ROLES = ['student', 'teacher', 'editor'] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export const ROLE_LABELS: Record<AssignableRole, string> = {
  student: 'Student',
  teacher: 'Teacher',
  editor: 'Content editor',
};

function roleBadge(role: AdminUser['role']) {
  switch (role) {
    case 'admin':
      return <ConsoleBadge tone="neutral">Admin</ConsoleBadge>;
    case 'teacher':
      return <ConsoleBadge tone="neutral">Teacher</ConsoleBadge>;
    case 'student':
      return <ConsoleBadge tone="neutral">Student</ConsoleBadge>;
    case 'editor':
      return <ConsoleBadge tone="neutral">Content editor</ConsoleBadge>;
  }
}

type ChangeRole = (
  user: AdminUser,
  role: AssignableRole,
  trigger: HTMLElement | null,
) => void;

const RoleCell = ({
  user,
  onChangeRole,
}: {
  user: AdminUser;
  onChangeRole: ChangeRole;
}) => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  if (user.role === 'admin') return roleBadge(user.role);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          ref={triggerRef}
          variant="ghost"
          className="h-auto gap-1 px-2 py-1"
        >
          {roleBadge(user.role)}
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="bg-popover backdrop-blur">
        {/* The role name alone. The dropdown hangs off the user's current
            role badge, so "change this to X" is already what it means —
            spelling that out made every option longer without saying
            anything. */}
        {ASSIGNABLE_ROLES.filter((role) => role !== user.role).map((role) => (
          <DropdownMenuItem
            key={role}
            onSelect={() => onChangeRole(user, role, triggerRef.current)}
          >
            {ROLE_LABELS[role]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const Dash = () => <span className="text-white/25">—</span>;

/**
 * Users, with insider access managed from their Subscription cell. Rules
 * that no account row can hold — every domain rule and each email granted
 * before its owner signed up — sit above them as rows of their own.
 */
export const UsersTable = ({
  users,
  ruleRows,
  accessFor,
  model,
  onOpen,
  onShowAccounts,
  onChangeRole,
}: {
  users: AdminUser[];
  ruleRows: RuleRow[];
  accessFor: (user: AdminUser) => UserAccess | null;
  model: AccessModel;
  onOpen: (dialog: InsiderDialog) => void;
  onShowAccounts: (rule: FreeAccessRule) => void;
  onChangeRole: ChangeRole;
}) => (
  <Table>
    <TableHeader className={CONSOLE_TABLE_HEAD}>
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
      {ruleRows.map((row, i) => {
        const { rule } = row;
        const last = i === ruleRows.length - 1 && users.length > 0;
        return (
          <TableRow
            key={rule.id}
            className={cn('bg-white/[0.015]', last && 'border-b-white/15')}
          >
            <TableCell>
              <span className="inline-flex items-center gap-2 text-white/80">
                {row.kind === 'domain' ? (
                  <>
                    <Globe className="size-4 text-white/45" />
                    {row.health === 'unmatchable'
                      ? `“${rule.value}”`
                      : `Everyone @${rule.value}`}
                  </>
                ) : (
                  <>
                    <Mail className="size-4 text-white/45" />
                    <span className="text-white/45">No account yet</span>
                  </>
                )}
              </span>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {row.kind === 'pre-granted' ? (
                rule.value
              ) : row.health === 'unmatchable' ? (
                'Matches no one'
              ) : row.accountCount ? (
                <button
                  aria-label={`Show the ${plural(row.accountCount, 'account')} on @${rule.value}`}
                  className="underline decoration-white/20 underline-offset-4 hover:text-white hover:decoration-white/50"
                  type="button"
                  onClick={() => onShowAccounts(rule)}
                >
                  {plural(row.accountCount, 'account')}
                </button>
              ) : row.accountCount === 0 ? (
                'No accounts yet'
              ) : (
                <Dash />
              )}
            </TableCell>
            <TableCell>
              <span className={CONSOLE_LABEL}>
                {row.kind === 'domain' ? 'Domain' : 'Pre-granted'}
              </span>
            </TableCell>
            <TableCell>
              <RuleSubscriptionCell
                model={model}
                row={row}
                onOpen={onOpen}
                onShowAccounts={onShowAccounts}
              />
            </TableCell>
            <TableCell>
              <Dash />
            </TableCell>
            <TableCell>
              <Dash />
            </TableCell>
          </TableRow>
        );
      })}
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
          <TableCell>
            <RoleCell user={user} onChangeRole={onChangeRole} />
          </TableCell>
          <TableCell>
            <UserSubscriptionCell
              access={accessFor(user)}
              model={model}
              user={user}
              onOpen={onOpen}
            />
          </TableCell>
          <TableCell className="capitalize">{user.subscriptionTier}</TableCell>
          <TableCell className="text-muted-foreground">
            {format(new Date(user.createdAt), DATE_FORMAT)}
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

/** Landing-style stat strip: hairline bento cells, regular-weight figures. */
export const StatStrip = ({
  stats,
}: {
  stats: { label: string; value: string; hint?: string }[];
}) => (
  <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.08] lg:grid-cols-4">
    {stats.map((stat) => (
      <div key={stat.label} className="bg-background px-5 py-4">
        <dt className={CONSOLE_LABEL}>{stat.label}</dt>
        <dd className="mt-2 text-3xl tabular-nums tracking-[-0.02em] text-white">
          {stat.value}
        </dd>
        {stat.hint && (
          <dd className="mt-1 text-sm text-white/55">{stat.hint}</dd>
        )}
      </div>
    ))}
  </dl>
);
