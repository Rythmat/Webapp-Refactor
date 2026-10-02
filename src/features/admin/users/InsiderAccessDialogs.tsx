import { Loader2 } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/components/utilities';
import {
  useCreateFreeAccessRule,
  useDeleteFreeAccessRule,
  useFreeAccessRules,
  useUpdateFreeAccessRule,
  type FreeAccessRule,
} from '@/hooks/data/admin/useAdminFreeAccess';
import type { AdminUser } from '@/hooks/data/admin/useAdminUsers';
import { ConsoleCallout } from '../ui/ConsoleCallout';
import { CONSOLE_LABEL, consoleTabClass } from '../ui/styles';
import {
  displayName,
  plural,
  type AccessModel,
  type InsiderDialog,
} from './accessModel';
import {
  PUBLIC_EMAIL_DOMAINS,
  accountsCoveredBy,
  classifyAccessError,
  describeAccessError,
  describeEnd,
  emailDomain,
  findExistingRule,
  formatRuleDate,
  isRuleActive,
  isServerInsider,
  isValidExpiryInput,
  laterEnd,
  minExpiryDateInputValue,
  parseRuleInput,
  rulesForUser,
  toCreateBody,
  toDateInputValue,
  toUpdateBody,
  type Expiry,
  type RuleType,
} from './insiderAccess';

type OpenDialog = (dialog: InsiderDialog) => void;
type ErrorCopy = { title: string; description: string };

const lowerFirst = (text: string) =>
  text.charAt(0).toLowerCase() + text.slice(1);

/** How a rule reads in copy: "sam@x.com" or "@school.edu". */
const ruleLabel = (rule: Pick<FreeAccessRule, 'type' | 'value'>) =>
  rule.type === 'domain' ? `@${rule.value}` : rule.value;

/** "Sam Lee, Jo Park and 3 others". */
const nameList = (accounts: AdminUser[]) => {
  const names = accounts.slice(0, 2).map(displayName);
  const rest = accounts.length - names.length;
  if (rest <= 0) return names.join(' and ');
  return `${names.join(', ')} and ${plural(rest, 'other')}`;
};

/** Does this account still have access from a rule other than `rule`? */
const keepsAccessWithout = (
  account: AdminUser,
  rule: FreeAccessRule,
  model: AccessModel,
) => {
  const access = rulesForUser(account.email, model.index, model.now);
  const other = rule.type === 'email' ? access.domain : access.email;
  return !!other && isRuleActive(other, model.now);
};

/**
 * Close only when idle. A save's outcome is reported by callbacks on the
 * dialog's own mutation, so closing mid-save would drop the toast or error.
 */
const closeUnlessPending =
  (pending: boolean, onClose: () => void) => (open: boolean) => {
    if (!open && !pending) onClose();
  };

// ── Duration ───────────────────────────────────────────────────────────────

interface DurationState {
  mode: 'perpetual' | 'temporary';
  date: string;
}

const PERPETUAL: DurationState = { mode: 'perpetual', date: '' };

/** A rule's current duration; renewing starts on an empty date. */
const durationOf = (rule: FreeAccessRule, renew: boolean): DurationState =>
  renew
    ? { mode: 'temporary', date: '' }
    : rule.expiresAt
      ? { mode: 'temporary', date: toDateInputValue(rule.expiresAt) }
      : PERPETUAL;

/**
 * `null` while "Until a date" has no valid future date. Callers pass a fresh
 * `new Date()`: a dialog can sit open past UTC midnight.
 */
const toExpiry = (state: DurationState, now: Date): Expiry | null => {
  if (state.mode === 'perpetual') return { duration: 'perpetual' };
  return isValidExpiryInput(state.date, now)
    ? { duration: 'temporary', date: state.date }
    : null;
};

const sameDuration = (a: DurationState, b: DurationState) =>
  a.mode === b.mode && (a.mode === 'perpetual' || a.date === b.date);

const endPhrase = (expiry: Expiry) =>
  expiry.duration === 'temporary'
    ? `, ending ${formatRuleDate(new Date(expiry.date))}`
    : '';

const DurationFields = ({
  value,
  onChange,
}: {
  value: DurationState;
  onChange: (next: DurationState) => void;
}) => {
  const legendId = useId();
  const dateId = useId();
  const hintId = useId();
  const now = new Date();
  const invalid =
    value.mode === 'temporary' &&
    value.date !== '' &&
    !isValidExpiryInput(value.date, now);
  return (
    <fieldset aria-labelledby={legendId} className="space-y-3">
      <legend className={CONSOLE_LABEL} id={legendId}>
        How long
      </legend>
      {/* Two toggle buttons rather than a radio group: each says whether
          it's on, and Tab reaches both without a roving-focus model. */}
      <div className="flex gap-2">
        {(
          [
            ['perpetual', 'No end date'],
            ['temporary', 'Until a date'],
          ] as const
        ).map(([mode, label]) => (
          <button
            key={mode}
            aria-pressed={value.mode === mode}
            className={consoleTabClass(value.mode === mode, 'sm')}
            type="button"
            onClick={() => onChange({ ...value, mode })}
          >
            {label}
          </button>
        ))}
      </div>
      {value.mode === 'temporary' && (
        <div className="space-y-1.5">
          <Label htmlFor={dateId}>Ends on</Label>
          <Input
            aria-describedby={hintId}
            aria-invalid={invalid}
            id={dateId}
            min={minExpiryDateInputValue(now)}
            type="date"
            value={value.date}
            onChange={(event) =>
              onChange({ ...value, date: event.target.value })
            }
          />
          <p
            aria-live="polite"
            className={cn(
              'text-xs',
              invalid ? 'text-red-300' : 'text-white/45',
            )}
            id={hintId}
          >
            {invalid
              ? 'Pick a day after today (UTC).'
              : 'Access stops as this day begins (UTC).'}
          </p>
        </div>
      )}
    </fieldset>
  );
};

// ── Saving ─────────────────────────────────────────────────────────────────

/** True until the component unmounts — guards work that outlives a dialog. */
const useMounted = () => {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return mounted;
};

/**
 * Create or update a rule, surfacing failures in the dialog. A create that
 * fails because the rule already exists (the server answers a duplicate with
 * a raw 500) refetches the rules and hands over to editing the one it found.
 */
const useSaveRule = (onClose: () => void, onOpen: OpenDialog) => {
  const create = useCreateFreeAccessRule();
  const update = useUpdateFreeAccessRule();
  const rulesQuery = useFreeAccessRules();
  const mounted = useMounted();
  const [error, setError] = useState<ErrorCopy | null>(null);
  // Covers the refetch after a failed create, so the dialog stays busy (and
  // can't be closed or resubmitted) until the handover is decided.
  const [resolving, setResolving] = useState(false);

  const save = (args: {
    existing: FreeAccessRule | undefined;
    type: RuleType;
    value: string;
    expiry: Expiry;
    success: ErrorCopy;
  }) => {
    setError(null);
    const label = ruleLabel(args);
    const done = () => {
      toast.success(args.success.title, {
        description: args.success.description,
      });
      if (mounted.current) onClose();
    };

    if (args.existing) {
      update.mutate(toUpdateBody(args.existing.id, args.expiry), {
        onSuccess: done,
        onError: (err) => {
          if (mounted.current) {
            setError(
              describeAccessError(err, { action: 'update', value: label }),
            );
          }
        },
      });
      return;
    }

    create.mutate(toCreateBody(args.type, args.value, args.expiry), {
      onSuccess: done,
      onError: async (err) => {
        const kind = classifyAccessError(err);
        if (kind === 'duplicate' || kind === 'server') {
          setResolving(true);
          const { data } = await rulesQuery.refetch();
          if (!mounted.current) return;
          setResolving(false);
          const found = findExistingRule(data ?? [], args.type, args.value);
          if (found) {
            toast(`${label} already has a rule`, {
              description: 'Change it here instead.',
            });
            onOpen({
              kind: 'edit',
              rule: found,
              renew: !isRuleActive(found, new Date()),
            });
            return;
          }
        }
        if (mounted.current) {
          setError(describeAccessError(err, { action: 'grant', value: label }));
        }
      },
    });
  };

  return {
    save,
    error,
    pending: create.isPending || update.isPending || resolving,
  };
};

const ErrorNote = ({ error }: { error: ErrorCopy | null }) =>
  error ? (
    <div role="alert">
      <ConsoleCallout title={error.title} tone="danger">
        {error.description}
      </ConsoleCallout>
    </div>
  ) : null;

const SubmitLabel = ({
  pending,
  children,
}: {
  pending: boolean;
  children: ReactNode;
}) =>
  pending ? (
    <>
      <Loader2 className="mr-2 size-4 animate-spin" />
      Saving…
    </>
  ) : (
    <>{children}</>
  );

// ── Add (header) ───────────────────────────────────────────────────────────

const AddDialog = ({
  model,
  onClose,
  onOpen,
}: {
  model: AccessModel;
  onClose: () => void;
  onOpen: OpenDialog;
}) => {
  const inputId = useId();
  const readBackId = useId();
  const [raw, setRaw] = useState('');
  const [chosen, setChosen] = useState<DurationState | null>(null);
  const { save, error, pending } = useSaveRule(onClose, onOpen);
  const now = new Date();

  const parsed = raw.trim() ? parseRuleInput(raw) : null;
  const valid = parsed?.value ? parsed : null;
  const isPublic =
    valid?.type === 'domain' && PUBLIC_EMAIL_DOMAINS.has(valid.value);
  const existing = valid
    ? findExistingRule(model.rules, valid.type, valid.value)
    : undefined;
  const existingActive = existing ? isRuleActive(existing, now) : false;
  const existingDuration = existing
    ? durationOf(existing, !existingActive)
    : PERPETUAL;
  // An existing rule's duration shows until the admin picks another.
  const duration = chosen ?? existingDuration;
  const expiry = toExpiry(duration, now);
  // Editing an active rule means changing something.
  const changed =
    !existing || !existingActive || !sameDuration(duration, existingDuration);

  let readBack: ReactNode = null;
  if (parsed?.error) {
    readBack = <span className="text-red-300">{parsed.error}</span>;
  } else if (isPublic && valid) {
    readBack = (
      <span className="text-red-300">
        {valid.value} is a public email provider — a domain rule would give
        insider access to anyone with an address there.
      </span>
    );
  } else if (valid?.type === 'email') {
    const account = model.everyone?.find(
      (user) => user.email?.toLowerCase() === valid.value,
    );
    const domainRule = rulesForUser(valid.value, model.index, now).domain;
    const covered = !!domainRule && isRuleActive(domainRule, now);
    readBack = account
      ? `Gives ${displayName(account)}’s account insider access.${
          covered
            ? ` They already have it through @${domainRule.value}; this adds their own rule.`
            : ''
        }`
      : model.everyone
        ? 'No account yet — they’ll get insider access when they sign up with this email.'
        : null;
  } else if (valid?.type === 'domain') {
    const count = model.everyone
      ? accountsCoveredBy(valid, model.everyone).length
      : null;
    readBack = `Everyone with an @${valid.value} email${
      count === null
        ? ''
        : count
          ? ` (${plural(count, 'account')} now)`
          : ' (no accounts yet)'
    }, plus future sign-ups. Subdomains like @mail.${valid.value} aren’t included.`;
  }

  const canSubmit =
    model.ready && !!valid && !isPublic && !!expiry && changed && !pending;

  const submit = () => {
    const fresh = toExpiry(duration, new Date());
    if (!canSubmit || !valid || !fresh) return;
    const label = ruleLabel(valid);
    const account =
      valid.type === 'email'
        ? model.everyone?.find(
            (user) => user.email?.toLowerCase() === valid.value,
          )
        : undefined;
    save({
      existing,
      type: valid.type,
      value: valid.value,
      expiry: fresh,
      success: existing
        ? {
            title: existingActive
              ? 'Insider access updated'
              : 'Insider access renewed',
            description: `${label} has insider access${endPhrase(fresh)}.`,
          }
        : {
            title: 'Insider access granted',
            description:
              valid.type === 'domain'
                ? `Everyone ${label} now has insider access${endPhrase(fresh)}.`
                : account
                  ? `${displayName(account)} now has insider access${endPhrase(fresh)}.`
                  : `${label} will get insider access when they sign up${endPhrase(fresh)}.`,
          },
    });
  };

  return (
    <Dialog open onOpenChange={closeUnlessPending(pending, onClose)}>
      <DialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          model.restoreFocus();
        }}
      >
        <DialogHeader>
          <DialogTitle>Add insider access</DialogTitle>
          <DialogDescription>
            Give an email address or a whole domain full access without a
            subscription. It works for people who haven’t signed up yet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <div className="space-y-1.5">
            <Label htmlFor={inputId}>Email or domain</Label>
            <Input
              autoFocus
              aria-describedby={readBack ? readBackId : undefined}
              aria-invalid={!!parsed?.error || isPublic}
              id={inputId}
              placeholder="sam@school.edu or school.edu"
              value={raw}
              onChange={(event) => setRaw(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submit();
              }}
            />
            {readBack && (
              <p
                aria-live="polite"
                className="text-xs text-white/55"
                id={readBackId}
              >
                {readBack}
              </p>
            )}
          </div>

          {/* Hidden while saving: the rule being created would otherwise
              show up here as "already has access" before the dialog closes. */}
          {existing && valid && !isPublic && !pending && (
            <ConsoleCallout>
              {ruleLabel(valid)}{' '}
              {existingActive
                ? `already has insider access (${lowerFirst(describeEnd(existing, now))}, added ${formatRuleDate(existing.createdAt)}). Saving changes it.`
                : `had insider access (${lowerFirst(describeEnd(existing, now))}). Saving renews it.`}
            </ConsoleCallout>
          )}

          <DurationFields value={duration} onChange={setChosen} />
          <ErrorNote error={error} />
        </div>

        <DialogFooter>
          <Button disabled={pending} variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!canSubmit} onClick={submit}>
            <SubmitLabel pending={pending}>
              {!model.ready
                ? 'Checking existing grants…'
                : existing
                  ? existingActive
                    ? 'Save changes'
                    : 'Renew'
                  : 'Add'}
            </SubmitLabel>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ── Grant (from a user row) ────────────────────────────────────────────────

const GrantDialog = ({
  user,
  emailOnly,
  model,
  onClose,
  onOpen,
}: {
  user: AdminUser;
  emailOnly?: boolean;
  model: AccessModel;
  onClose: () => void;
  onOpen: OpenDialog;
}) => {
  const legendId = useId();
  const now = new Date();
  const email = (user.email ?? '').toLowerCase();
  const domain = emailDomain(email);
  const access = rulesForUser(email, model.index, now);
  const domainRule = access.domain;
  const domainActive = !!domainRule && isRuleActive(domainRule, now);
  const isPublic = PUBLIC_EMAIL_DOMAINS.has(domain);
  const domainBlocked = isPublic || domainActive;
  const domainCount = model.everyone
    ? accountsCoveredBy({ type: 'domain', value: domain }, model.everyone)
        .length
    : null;

  const [scope, setScope] = useState<RuleType>('email');
  const [duration, setDuration] = useState<DurationState>(PERPETUAL);
  const { save, error, pending } = useSaveRule(onClose, onOpen);
  const expiry = toExpiry(duration, now);

  const existing =
    scope === 'email' ? (access.email ?? undefined) : (domainRule ?? undefined);
  const canSubmit =
    model.ready &&
    !!email &&
    !!expiry &&
    !pending &&
    !(scope === 'domain' && domainBlocked);

  const submit = () => {
    const fresh = toExpiry(duration, new Date());
    if (!canSubmit || !fresh) return;
    save({
      existing,
      type: scope,
      value: scope === 'email' ? email : domain,
      expiry: fresh,
      success: {
        title: existing ? 'Insider access renewed' : 'Insider access granted',
        description:
          scope === 'email'
            ? `${displayName(user)} now has insider access${endPhrase(fresh)}.`
            : `Everyone @${domain} now has insider access${endPhrase(fresh)}${
                domainCount !== null
                  ? ` (${plural(domainCount, 'account')})`
                  : ''
              }.`,
      },
    });
  };

  return (
    <Dialog open onOpenChange={closeUnlessPending(pending, onClose)}>
      <DialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          model.restoreFocus();
        }}
      >
        <DialogHeader>
          <DialogTitle>Grant insider access</DialogTitle>
          <DialogDescription>
            {emailOnly
              ? `Gives ${email} insider access that doesn’t depend on @${domain}.`
              : `${displayName(user)} · ${email}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {!emailOnly && (
            <fieldset className="space-y-3">
              <legend className={CONSOLE_LABEL} id={legendId}>
                Who gets it
              </legend>
              <RadioGroup
                aria-labelledby={legendId}
                value={scope}
                onValueChange={(value) => setScope(value as RuleType)}
              >
                <label className="flex items-start gap-3 text-sm">
                  <RadioGroupItem className="mt-0.5" value="email" />
                  <span>Just {email}</span>
                </label>
                <label className="flex items-start gap-3 text-sm">
                  <RadioGroupItem
                    className={cn('mt-0.5', domainBlocked && 'opacity-50')}
                    disabled={domainBlocked}
                    value="domain"
                  />
                  <span>
                    <span className={cn(domainBlocked && 'text-white/45')}>
                      Everyone @{domain}
                    </span>
                    {/* The reason stays readable even when the option is off:
                        it's the only place the dialog says why. */}
                    <span
                      className={cn(
                        'block text-xs',
                        domainBlocked ? 'text-amber-200/80' : 'text-white/55',
                      )}
                    >
                      {isPublic
                        ? `${domain} is a public email provider, so it can’t be granted as a domain.`
                        : domainActive
                          ? `Already covered by the @${domain} rule.`
                          : domainRule
                            ? `Renews the expired @${domain} rule.`
                            : `${
                                domainCount === null
                                  ? 'Every account'
                                  : `${plural(domainCount, 'account')} now`
                              }, plus anyone who signs up with an @${domain} email. Subdomains aren’t included.`}
                    </span>
                  </span>
                </label>
              </RadioGroup>
            </fieldset>
          )}

          {user.hasPaidAccess && !isServerInsider(user) && (
            <ConsoleCallout>
              They have a paid subscription. Insider access doesn’t cancel it.
            </ConsoleCallout>
          )}

          <DurationFields value={duration} onChange={setDuration} />
          <ErrorNote error={error} />
        </div>

        <DialogFooter>
          <Button disabled={pending} variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!canSubmit} onClick={submit}>
            <SubmitLabel pending={pending}>
              {existing ? 'Renew' : 'Grant access'}
            </SubmitLabel>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ── Change duration / Renew ────────────────────────────────────────────────

/** "For Sam Lee (sam@x.com)", "For sam@x.com (no account yet)", "For everyone @x.edu (3 accounts)". */
const scopeLine = (rule: FreeAccessRule, model: AccessModel) => {
  if (rule.type === 'email') {
    const account = model.everyone?.find(
      (user) => user.email?.toLowerCase() === rule.value,
    );
    if (account) return `For ${displayName(account)} (${rule.value}).`;
    return model.everyone
      ? `For ${rule.value} (no account yet).`
      : `For ${rule.value}.`;
  }
  const count = model.everyone
    ? accountsCoveredBy(rule, model.everyone).length
    : null;
  return `For everyone @${rule.value}${
    count === null ? '' : ` (${plural(count, 'account')})`
  }.`;
};

const EditDialog = ({
  rule,
  renew,
  model,
  onClose,
  onOpen,
}: {
  rule: FreeAccessRule;
  renew: boolean;
  model: AccessModel;
  onClose: () => void;
  onOpen: OpenDialog;
}) => {
  const [initial] = useState(() => durationOf(rule, renew));
  const [duration, setDuration] = useState<DurationState>(initial);
  const { save, error, pending } = useSaveRule(onClose, onOpen);
  const expiry = toExpiry(duration, new Date());
  const changed = !sameDuration(duration, initial);
  const canSubmit = model.ready && !!expiry && changed && !pending;

  const submit = () => {
    const fresh = toExpiry(duration, new Date());
    if (!canSubmit || !fresh) return;
    save({
      existing: rule,
      type: rule.type,
      value: rule.value,
      expiry: fresh,
      success: {
        title: renew ? 'Insider access renewed' : 'Insider access updated',
        description: `${ruleLabel(rule)} has insider access${endPhrase(fresh)}.`,
      },
    });
  };

  return (
    <Dialog open onOpenChange={closeUnlessPending(pending, onClose)}>
      <DialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          model.restoreFocus();
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {renew ? 'Renew insider access' : 'Change insider access'}
          </DialogTitle>
          <DialogDescription>
            {scopeLine(rule, model)} Currently:{' '}
            {lowerFirst(describeEnd(rule, model.now))}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-1">
          <DurationFields value={duration} onChange={setDuration} />
          <ErrorNote error={error} />
        </div>
        <DialogFooter>
          <Button disabled={pending} variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!canSubmit} onClick={submit}>
            <SubmitLabel pending={pending}>
              {renew ? 'Renew' : 'Save'}
            </SubmitLabel>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ── Remove ─────────────────────────────────────────────────────────────────

const removeCopy = (
  rule: FreeAccessRule,
  model: AccessModel,
  fromUser: AdminUser | undefined,
): { title: string; body: string; action: string } => {
  const active = isRuleActive(rule, model.now);
  const label = ruleLabel(rule);
  if (!active) {
    return {
      title: 'Delete expired rule?',
      body: rule.expiresAt
        ? `The ${label} rule ended on ${formatRuleDate(rule.expiresAt)}, so no one loses access.`
        : `The ${label} rule no longer applies, so no one loses access.`,
      action: 'Delete rule',
    };
  }

  const covered = model.everyone ? accountsCoveredBy(rule, model.everyone) : [];

  if (rule.type === 'email') {
    // Opened from a row, that row is the account — even if the full list
    // hasn't loaded to find it.
    const account = covered[0] ?? fromUser;
    if (!account) {
      return {
        title: 'Remove insider access?',
        body: `${rule.value} won’t get insider access when they sign up.`,
        action: 'Remove',
      };
    }
    return {
      title: 'Remove insider access?',
      body: keepsAccessWithout(account, rule, model)
        ? `${displayName(account)} keeps insider access through @${emailDomain(rule.value)}. This only removes their own rule.`
        : `${displayName(account)} (${rule.value}) loses insider access right away. Unless they have a paid subscription, they’ll be on the free plan.`,
      action: 'Remove',
    };
  }

  const prefix = fromUser
    ? `It can’t be removed for just ${displayName(fromUser)} — the rule covers the whole domain. `
    : '';
  const future = ` New sign-ups on ${label} won’t get it either.`;
  if (!model.everyone) {
    return {
      title: 'Remove insider access?',
      body: `${prefix}Every account on ${label} without its own email rule loses insider access.${future}`,
      action: 'Remove',
    };
  }
  const keepers = covered.filter((account) =>
    keepsAccessWithout(account, rule, model),
  );
  const losing = covered.filter(
    (account) => !keepsAccessWithout(account, rule, model),
  );
  const lose = losing.length
    ? `${plural(losing.length, 'account')} ${losing.length === 1 ? 'loses' : 'lose'} insider access: ${nameList(losing)}.`
    : 'No account loses insider access right away.';
  const keep = keepers.length
    ? ` ${nameList(keepers)} ${keepers.length === 1 ? 'keeps' : 'keep'} it through their own email rule.`
    : '';
  return {
    title: 'Remove insider access?',
    body: `${prefix}${lose}${keep}${future}`,
    action:
      losing.length > 1
        ? `Remove for ${plural(losing.length, 'account')}`
        : 'Remove',
  };
};

const RemoveDialog = ({
  rule,
  fromUser,
  model,
  onClose,
}: {
  rule: FreeAccessRule;
  fromUser?: AdminUser;
  model: AccessModel;
  onClose: () => void;
}) => {
  const remove = useDeleteFreeAccessRule();
  const mounted = useMounted();
  const [error, setError] = useState<ErrorCopy | null>(null);
  const [copy] = useState(() => removeCopy(rule, model, fromUser));

  const confirm = () => {
    setError(null);
    remove.mutate(rule.id, {
      onSuccess: () => {
        toast.success('Insider access removed', {
          description: `The ${ruleLabel(rule)} rule is gone.`,
        });
        if (mounted.current) onClose();
      },
      onError: (err) => {
        if (classifyAccessError(err) === 'not_found') {
          toast('Already removed', {
            description: `The ${ruleLabel(rule)} rule was already gone.`,
          });
          model.refresh();
          if (mounted.current) onClose();
          return;
        }
        if (mounted.current) {
          setError(
            describeAccessError(err, {
              action: 'remove',
              value: ruleLabel(rule),
            }),
          );
        }
      },
    });
  };

  return (
    <AlertDialog
      open
      onOpenChange={closeUnlessPending(remove.isPending, onClose)}
    >
      <AlertDialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          model.restoreFocus();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy.body}</AlertDialogDescription>
        </AlertDialogHeader>
        <ErrorNote error={error} />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-danger-base text-grey-lightest hover:bg-danger-light"
            disabled={remove.isPending}
            onClick={(event) => {
              event.preventDefault();
              confirm();
            }}
          >
            {remove.isPending ? 'Removing…' : copy.action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// ── Fix a rule that can never match ────────────────────────────────────────

const expiryOf = (end: Date | null): Expiry =>
  end
    ? { duration: 'temporary', date: toDateInputValue(end) }
    : { duration: 'perpetual' };

/**
 * Older rules could be saved in shapes the server never matches (a domain as
 * `@school.edu`, say). Fixing saves the corrected rule with the broken one's
 * end date — merged into the corrected rule if that already exists, keeping
 * whichever lasts longer — and then deletes the broken one.
 */
const FixDialog = ({
  rule,
  model,
  onClose,
}: {
  rule: FreeAccessRule;
  model: AccessModel;
  onClose: () => void;
}) => {
  const create = useCreateFreeAccessRule();
  const update = useUpdateFreeAccessRule();
  const remove = useDeleteFreeAccessRule();
  const rulesQuery = useFreeAccessRules();
  const mounted = useMounted();
  const [error, setError] = useState<ErrorCopy | null>(null);
  const [busy, setBusy] = useState(false);
  const fixed = parseRuleInput(rule.value);
  const blocked =
    fixed.type === 'domain' && PUBLIC_EMAIL_DOMAINS.has(fixed.value);
  const fixedLabel = fixed.value ? ruleLabel(fixed) : '';
  const target = fixed.value
    ? findExistingRule(model.rules, fixed.type, fixed.value)
    : undefined;

  const confirm = async () => {
    if (!fixed.value || blocked) return;
    setError(null);
    setBusy(true);
    try {
      let end = rule.expiresAt;
      if (target) {
        end = laterEnd(target.expiresAt, rule.expiresAt);
        const lengthens =
          end === null ? target.expiresAt !== null : end > target.expiresAt!;
        if (lengthens) {
          await update.mutateAsync(toUpdateBody(target.id, expiryOf(end)));
        } else {
          end = target.expiresAt;
        }
      } else {
        await create.mutateAsync(
          toCreateBody(fixed.type, fixed.value, expiryOf(end)),
        );
      }
      await remove.mutateAsync(rule.id);
      const active = !end || end.getTime() > Date.now();
      if (active) {
        toast.success('Rule fixed', {
          description: `${fixedLabel} has insider access${end ? `, ending ${formatRuleDate(end)}` : ''}.`,
        });
      } else {
        toast('Rule fixed, but expired', {
          description: `${fixedLabel} ended ${formatRuleDate(end!)} — renew it to restore access.`,
        });
      }
      if (mounted.current) onClose();
    } catch (err) {
      // A duplicate means the corrected rule appeared meanwhile; refetch so
      // trying again takes the merge path.
      const kind = classifyAccessError(err);
      if (kind === 'duplicate' || kind === 'server') {
        await rulesQuery.refetch();
      }
      if (mounted.current) {
        setError(
          describeAccessError(err, { action: 'update', value: fixedLabel }),
        );
      }
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  return (
    <AlertDialog open onOpenChange={closeUnlessPending(busy, onClose)}>
      <AlertDialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          model.restoreFocus();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Fix this rule?</AlertDialogTitle>
          <AlertDialogDescription>
            It was saved as the {rule.type === 'domain' ? 'domain' : 'email'} “
            {rule.value}”, which matches no one.{' '}
            {blocked
              ? `Fixed, it would cover everyone at the public provider ${fixed.value}, so it can only be removed.`
              : target
                ? `A ${fixed.type} rule for ${fixedLabel} already exists; this keeps the longer of the two end dates there and deletes the broken one.`
                : `This replaces it with a ${fixed.type} rule for ${fixedLabel}, keeping its end date.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ErrorNote error={error} />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy || blocked || !model.ready || !fixed.value}
            onClick={(event) => {
              event.preventDefault();
              void confirm();
            }}
          >
            {busy ? 'Fixing…' : 'Fix rule'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// ── Page-level switch ──────────────────────────────────────────────────────

/** Renders the open insider-access dialog, if any. Each open mounts fresh. */
export const InsiderAccessDialogs = ({
  dialog,
  model,
  onClose,
  onOpen,
}: {
  dialog: InsiderDialog | null;
  model: AccessModel;
  onClose: () => void;
  onOpen: OpenDialog;
}) => {
  if (!dialog) return null;
  switch (dialog.kind) {
    case 'add':
      return <AddDialog model={model} onClose={onClose} onOpen={onOpen} />;
    case 'grant':
      return (
        <GrantDialog
          key={dialog.user.id}
          emailOnly={dialog.emailOnly}
          model={model}
          user={dialog.user}
          onClose={onClose}
          onOpen={onOpen}
        />
      );
    case 'edit':
      return (
        <EditDialog
          key={`${dialog.rule.id}-${dialog.renew}`}
          model={model}
          renew={dialog.renew}
          rule={dialog.rule}
          onClose={onClose}
          onOpen={onOpen}
        />
      );
    case 'remove':
      return (
        <RemoveDialog
          key={dialog.rule.id}
          fromUser={dialog.fromUser}
          model={model}
          rule={dialog.rule}
          onClose={onClose}
        />
      );
    case 'fix':
      return (
        <FixDialog
          key={dialog.rule.id}
          model={model}
          rule={dialog.rule}
          onClose={onClose}
        />
      );
  }
};
