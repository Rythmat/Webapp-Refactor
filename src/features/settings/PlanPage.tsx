import { Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCreditsBalance, useStripeCheckout, useStripePortal } from '@/hooks/data/credits';

const TIER_ALLOWANCES: Record<string, number> = {
  free: 50,
  artist: 100,
  studio: 200,
};

const TIERS = [
  {
    id: 'free' as const,
    name: 'Free',
    price: '$0',
    period: 'forever',
    credits: '50 credits (one-time)',
    features: ['AI chord generation', 'Basic MIDI export', 'Community access'],
  },
  {
    id: 'artist' as const,
    name: 'Artist',
    price: '$10',
    period: '/month',
    credits: '100 credits/month',
    features: ['Everything in Free', 'Monthly credit refresh', 'Priority support'],
  },
  {
    id: 'studio' as const,
    name: 'Studio',
    price: '$20',
    period: '/month',
    credits: '200 credits/month',
    features: ['Everything in Artist', 'Double monthly credits', 'Early access to features'],
  },
];

export const PlanPage = () => {
  const { data: credits, isLoading } = useCreditsBalance();
  const checkout = useStripeCheckout();
  const portal = useStripePortal();

  const currentTier = credits?.tier || 'free';
  const balance = credits?.balance ?? 0;
  const allowance = TIER_ALLOWANCES[currentTier] ?? 50;
  const usagePercent = Math.min(100, Math.round((balance / allowance) * 100));

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Subscription Plan</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your subscription and credits.
        </p>
      </div>

      {/* Credit usage */}
      <div className="rounded-lg border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-amber-500" />
            <span className="font-medium">Credits</span>
          </div>
          <span className="text-sm text-muted-foreground capitalize">
            {currentTier} plan
          </span>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-sm">
            <span>{balance} remaining</span>
            <span className="text-muted-foreground">{allowance} total</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </div>
        {credits?.lifetimeUsed !== undefined && (
          <p className="mt-2 text-xs text-muted-foreground">
            {credits.lifetimeUsed} credits used all time
          </p>
        )}
      </div>

      {/* Tier cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {TIERS.map((tier) => {
          const isCurrent = currentTier === tier.id;
          const canUpgrade = tier.id !== 'free' && !isCurrent && TIERS.findIndex(t => t.id === tier.id) > TIERS.findIndex(t => t.id === currentTier);

          return (
            <div
              key={tier.id}
              className={`flex flex-col rounded-lg border p-6 ${
                isCurrent ? 'border-primary ring-1 ring-primary' : 'border-border'
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{tier.name}</h3>
                {isCurrent && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    Current
                  </span>
                )}
              </div>
              <div className="mt-2">
                <span className="text-3xl font-bold">{tier.price}</span>
                <span className="text-sm text-muted-foreground">{tier.period}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{tier.credits}</p>

              <ul className="mt-4 flex-1 space-y-2">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {isCurrent ? (
                  <Button className="w-full" disabled variant="outline">
                    Current plan
                  </Button>
                ) : canUpgrade ? (
                  <Button
                    className="w-full"
                    disabled={checkout.isPending}
                    onClick={() => checkout.mutate({ tier: tier.id as 'artist' | 'studio' })}
                  >
                    Upgrade to {tier.name}
                  </Button>
                ) : (
                  <Button className="w-full" disabled variant="outline">
                    {tier.id === 'free' ? 'Free plan' : 'Current or lower'}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Manage billing */}
      {currentTier !== 'free' && (
        <div className="rounded-lg border p-6">
          <h3 className="font-medium">Billing</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your payment method, view invoices, or cancel your subscription.
          </p>
          <Button
            className="mt-4"
            disabled={portal.isPending}
            variant="outline"
            onClick={() => portal.mutate()}
          >
            Manage billing
          </Button>
        </div>
      )}
    </div>
  );
};
