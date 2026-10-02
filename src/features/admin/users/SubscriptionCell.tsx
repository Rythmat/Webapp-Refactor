import { ChevronDown } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/components/utilities';
import type { FreeAccessRule } from '@/hooks/data/admin/useAdminFreeAccess';
import type { AdminUser } from '@/hooks/data/admin/useAdminUsers';
import { ConsoleBadge } from '../ui/ConsoleBadge';
import {
  displayName,
  plural,
  type AccessModel,
  type InsiderDialog,
} from './accessModel';
import {
  accountsCoveredBy,
  describeEnd,
  formatRuleDate,
  insiderSync,
  isRuleActive,
  isServerInsider,
  laterEnd,
  parseRuleInput,
  PUBLIC_EMAIL_DOMAINS,
  rulesForUser,
  type RuleRow,
  type UserAccess,
} from './insiderAccess';

const lowerFirst = (text: string) =>
  text.charAt(0).toLowerCase() + text.slice(1);

/** The subscription badge, from the server's own flag — what the account gets. */
export function subscriptionBadge(user: AdminUser) {
  if (isServerInsider(user)) {
    return <ConsoleBadge tone="neutral">Insider access</ConsoleBadge>;
  }

  if (user.hasPaidAccess) {
    const label =
      user.subscriptionTier === 'free'
        ? 'Active'
        : user.subscriptionTier.charAt(0).toUpperCase() +
          user.subscriptionTier.slice(1);

    return (
      <ConsoleBadge tone="success">
        {label}
        {user.cancelAtPeriodEnd ? ' (canceling)' : ''}
      </ConsoleBadge>
    );
  }

  if (user.subscriptionStatus === 'past_due') {
    return <ConsoleBadge tone="warning">Past Due</ConsoleBadge>;
  }

  if (user.subscriptionStatus === 'canceled') {
    return <ConsoleBadge tone="danger">Canceled</ConsoleBadge>;
  }

  return <ConsoleBadge tone="muted">Free</ConsoleBadge>;
}

interface MenuItem {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
}
interface MenuGroup {
  label?: string;
  items: MenuItem[];
}

/**
 * The badge as a menu trigger — the Role column's pattern — with a detail
 * line under it. Without groups it's just the badge.
 */
const CellMenu = ({
  badge,
  detail,
  detailTitle,
  groups,
  menuFor,
  plainTitle,
  onItemSelect,
}: {
  badge: ReactNode;
  detail?: ReactNode;
  detailTitle?: string;
  groups: MenuGroup[] | null;
  /** Who or what the menu is for — appended to the badge as hidden text. */
  menuFor: string;
  /** Tooltip for the plain badge, saying why there's no menu. */
  plainTitle?: string;
  /** Hands over the trigger, so focus can return to it after a dialog. */
  onItemSelect?: (trigger: HTMLElement | null) => void;
}) => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <div className="flex flex-col items-start gap-0.5">
      {groups && groups.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              ref={triggerRef}
              className="h-auto gap-1 px-2 py-1"
              variant="ghost"
            >
              {badge}
              {/* The badge stays in the button's name — it is the cell's
                  value — with what the menu does after it. */}
              <span className="sr-only">
                , insider access options for {menuFor}
              </span>
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="min-w-56 bg-popover backdrop-blur"
          >
            {groups.map((group, groupIndex) => (
              <DropdownMenuGroup key={group.label ?? groupIndex}>
                {groupIndex > 0 && <DropdownMenuSeparator />}
                {group.label && (
                  <DropdownMenuLabel className="normal-case tracking-normal text-white/45">
                    {group.label}
                  </DropdownMenuLabel>
                )}
                {group.items.map((item) => (
                  <DropdownMenuItem
                    key={item.label}
                    className={cn(
                      item.destructive && 'text-red-300 focus:text-red-200',
                    )}
                    onSelect={() => {
                      onItemSelect?.(triggerRef.current);
                      item.onSelect();
                    }}
                  >
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <span className="px-2 py-1" title={plainTitle}>
          {badge}
        </span>
      )}
      {detail && (
        <span className="px-2 text-xs text-white/45" title={detailTitle}>
          {detail}
        </span>
      )}
    </div>
  );
};

const UTC_NOTE = 'Dates are the UTC day access stops';

/** Destructive items last, as the menu reads top to bottom. */
const ordered = (items: MenuItem[]) => [
  ...items.filter((item) => !item.destructive),
  ...items.filter((item) => item.destructive),
];

const emailGroup = (
  rule: FreeAccessRule,
  model: AccessModel,
  onOpen: (dialog: InsiderDialog) => void,
  user: AdminUser,
): MenuGroup => {
  const active = isRuleActive(rule, model.now);
  return {
    label: `This email · added ${formatRuleDate(rule.createdAt)}`,
    items: ordered(
      active
        ? [
            {
              label: 'Change duration…',
              onSelect: () => onOpen({ kind: 'edit', rule, renew: false }),
            },
            {
              label: 'Remove insider access…',
              destructive: true,
              onSelect: () => onOpen({ kind: 'remove', rule, fromUser: user }),
            },
          ]
        : [
            {
              label: 'Renew insider access…',
              onSelect: () => onOpen({ kind: 'edit', rule, renew: true }),
            },
            {
              label: 'Delete expired rule…',
              destructive: true,
              onSelect: () => onOpen({ kind: 'remove', rule, fromUser: user }),
            },
          ],
    ),
  };
};

const domainGroup = (
  rule: FreeAccessRule,
  model: AccessModel,
  onOpen: (dialog: InsiderDialog) => void,
  user: AdminUser,
  hasOwnRule: boolean,
): MenuGroup => {
  const active = isRuleActive(rule, model.now);
  const domain = `@${rule.value}`;
  const count = model.everyone
    ? accountsCoveredBy(rule, model.everyone).length
    : null;
  const ownAccess: MenuItem[] = hasOwnRule
    ? []
    : [
        {
          label: 'Give this email its own access…',
          onSelect: () => onOpen({ kind: 'grant', user, emailOnly: true }),
        },
      ];
  return {
    label: count === null ? domain : `${domain} · ${plural(count, 'account')}`,
    items: ordered(
      active
        ? [
            {
              label: `Change ${domain} duration…`,
              onSelect: () => onOpen({ kind: 'edit', rule, renew: false }),
            },
            ...ownAccess,
            {
              label: `Remove ${domain} rule…`,
              destructive: true,
              onSelect: () => onOpen({ kind: 'remove', rule, fromUser: user }),
            },
          ]
        : [
            {
              label: `Renew for ${domain}…`,
              onSelect: () => onOpen({ kind: 'edit', rule, renew: true }),
            },
            ...ownAccess,
            {
              label: `Delete expired ${domain} rule…`,
              destructive: true,
              onSelect: () => onOpen({ kind: 'remove', rule, fromUser: user }),
            },
          ],
    ),
  };
};

const userDetail = (access: UserAccess, now: Date): string | undefined => {
  const { email, domain, active } = access;
  if (active) {
    if (access.both && email && domain) {
      return `Email + @${domain.value} · ${lowerFirst(
        describeEnd(
          { expiresAt: laterEnd(email.expiresAt, domain.expiresAt) },
          now,
        ),
      )}`;
    }
    return active.type === 'email'
      ? describeEnd(active, now)
      : `Via @${active.value} · ${lowerFirst(describeEnd(active, now))}`;
  }
  const lapsed = access.expired[0];
  if (!lapsed?.expiresAt) return undefined;
  return lapsed.type === 'email'
    ? `Insider access ended ${formatRuleDate(lapsed.expiresAt)}`
    : `@${lapsed.value} access ended ${formatRuleDate(lapsed.expiresAt)}`;
};

/** A user row's Subscription cell. `access` is `null` while rules are unknown. */
export const UserSubscriptionCell = ({
  user,
  access,
  model,
  onOpen,
}: {
  user: AdminUser;
  access: UserAccess | null;
  model: AccessModel;
  onOpen: (dialog: InsiderDialog) => void;
}) => {
  const badge = subscriptionBadge(user);
  const menuFor = displayName(user);

  if (!user.email) {
    return (
      <CellMenu
        menuFor={menuFor}
        onItemSelect={model.rememberFocus}
        badge={badge}
        groups={null}
        plainTitle="No email on this account, so insider access can't be granted"
      />
    );
  }
  // Until the rules load there's nothing safe to offer: "no rules yet" would
  // invite granting access that already exists.
  if (!model.ready || !access) {
    return (
      <CellMenu
        menuFor={menuFor}
        onItemSelect={model.rememberFocus}
        badge={badge}
        groups={null}
      />
    );
  }

  // The server set the flag when it served the list; judge it by the rules as
  // of then, so a rule that has expired since doesn't read as a mismatch.
  const sync = insiderSync(
    isServerInsider(user),
    rulesForUser(user.email, model.index, model.fetchedAt),
  );
  if (sync !== 'agree' && model.syncing) {
    return (
      <CellMenu
        menuFor={menuFor}
        onItemSelect={model.rememberFocus}
        badge={badge}
        detail="Updating…"
        groups={null}
      />
    );
  }
  if (sync === 'server-only') {
    // The account has insider access but no loaded rule explains it — stale
    // rules. Nothing destructive until they agree again.
    return (
      <CellMenu
        menuFor={menuFor}
        onItemSelect={model.rememberFocus}
        badge={badge}
        detail="Rule not loaded"
        groups={[{ items: [{ label: 'Refresh', onSelect: model.refresh }] }]}
      />
    );
  }

  const groups: MenuGroup[] = [];
  if (access.email) groups.push(emailGroup(access.email, model, onOpen, user));
  if (access.domain) {
    groups.push(
      domainGroup(access.domain, model, onOpen, user, !!access.email),
    );
  }
  if (groups.length === 0) {
    groups.push({
      items: [
        {
          label: 'Grant insider access…',
          onSelect: () => onOpen({ kind: 'grant', user }),
        },
      ],
    });
  }

  return (
    <CellMenu
      menuFor={menuFor}
      onItemSelect={model.rememberFocus}
      badge={badge}
      detail={userDetail(access, model.now)}
      detailTitle={UTC_NOTE}
      groups={groups}
    />
  );
};

/** A rule row's Subscription cell: a pre-granted email or a domain rule. */
export const RuleSubscriptionCell = ({
  row,
  model,
  onOpen,
  onShowAccounts,
}: {
  row: RuleRow;
  model: AccessModel;
  onOpen: (dialog: InsiderDialog) => void;
  onShowAccounts: (rule: FreeAccessRule) => void;
}) => {
  const { rule, health } = row;
  const isDomain = row.kind === 'domain';
  // A broken rule is named by what's stored — `@` + `@broken.edu` would read
  // as "@@broken.edu".
  const scope =
    isDomain && health !== 'unmatchable' ? `@${rule.value}` : rule.value;
  const menuFor = scope;
  const label = `${isDomain ? 'Domain' : 'Pre-granted'} · added ${formatRuleDate(rule.createdAt)}`;

  if (health === 'unmatchable') {
    const fixed = parseRuleInput(rule.value);
    return (
      <CellMenu
        menuFor={menuFor}
        onItemSelect={model.rememberFocus}
        badge={<ConsoleBadge tone="danger">Not working</ConsoleBadge>}
        detail={
          rule.value.startsWith('@')
            ? 'Saved with a leading @'
            : "Can't match any email"
        }
        groups={[
          {
            label,
            items: ordered([
              // Never "fix" a rule into a grant for a whole public provider.
              ...(fixed.value &&
              !(
                fixed.type === 'domain' && PUBLIC_EMAIL_DOMAINS.has(fixed.value)
              )
                ? [
                    {
                      label: `Fix: use ${fixed.type === 'domain' ? '@' : ''}${fixed.value}…`,
                      onSelect: () => onOpen({ kind: 'fix', rule }),
                    },
                  ]
                : []),
              {
                label: 'Remove…',
                destructive: true,
                onSelect: () => onOpen({ kind: 'remove', rule }),
              },
            ]),
          },
        ]}
      />
    );
  }

  const active = health === 'active';
  const accounts = row.kind === 'domain' ? row.accountCount : null;
  return (
    <CellMenu
      menuFor={menuFor}
      onItemSelect={model.rememberFocus}
      badge={
        active ? (
          <ConsoleBadge tone="neutral">Insider access</ConsoleBadge>
        ) : (
          <ConsoleBadge tone="danger">Expired</ConsoleBadge>
        )
      }
      detail={
        active
          ? `${isDomain ? 'Domain' : 'Pre-granted'} · ${lowerFirst(describeEnd(rule, model.now))}`
          : describeEnd(rule, model.now)
      }
      detailTitle={UTC_NOTE}
      groups={[
        {
          label,
          items: ordered(
            active
              ? [
                  {
                    label: 'Change duration…',
                    onSelect: () =>
                      onOpen({ kind: 'edit', rule, renew: false }),
                  },
                  ...(accounts
                    ? [
                        {
                          label: `Show ${plural(accounts, 'account')}`,
                          onSelect: () => onShowAccounts(rule),
                        },
                      ]
                    : []),
                  {
                    label: isDomain
                      ? `Remove ${scope} rule…`
                      : 'Remove pre-grant…',
                    destructive: true,
                    onSelect: () => onOpen({ kind: 'remove', rule }),
                  },
                ]
              : [
                  {
                    label: 'Renew…',
                    onSelect: () => onOpen({ kind: 'edit', rule, renew: true }),
                  },
                  {
                    label: 'Delete expired rule…',
                    destructive: true,
                    onSelect: () => onOpen({ kind: 'remove', rule }),
                  },
                ],
          ),
        },
      ]}
    />
  );
};
