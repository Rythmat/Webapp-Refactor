import { Sparkles } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useBillingConfig,
  useCreditsBalance,
  useStripeCheckout,
  useStripePortal,
} from '@/hooks/data/credits';
import {
  trackCheckoutStarted,
  trackPaywallViewed,
} from '@/telemetry/hooks/useTelemetryProduct';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FALLBACK_TIERS = [
  {
    id: 'free' as const,
    name: 'Free',
    price: '$0',
    credits: '50 one-time',
    description: 'Get started with AI generation',
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    price: '$10/mo',
    credits: 'Access to all content',
    description: 'Access to all content',
  },
];

export const UpgradeModal = ({ open, onOpenChange }: UpgradeModalProps) => {
  const { data: billingConfig } = useBillingConfig();
  const { data: credits } = useCreditsBalance();
  const checkout = useStripeCheckout();
  const portal = useStripePortal();
  const paywallReportedRef = useRef(false);

  const tiers = billingConfig?.tiers ?? FALLBACK_TIERS;
  const currentTier = credits?.tier || 'free';

  useEffect(() => {
    if (open && !paywallReportedRef.current) {
      paywallReportedRef.current = true;
      trackPaywallViewed(window.location.pathname);
    }
    if (!open) {
      paywallReportedRef.current = false;
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-amber-100">
            <Sparkles className="size-6 text-amber-600" />
          </div>
          <DialogTitle className="text-center">Out of credits</DialogTitle>
          <DialogDescription className="text-center">
            Upgrade your plan to get more AI generation credits every month.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-3">
          {tiers.map((tier) => {
            const isCurrent = currentTier === tier.id;
            const canUpgrade = tier.id !== 'free' && !isCurrent;

            return (
              <div
                key={tier.id}
                className={`flex items-center justify-between rounded-lg border p-4 ${
                  isCurrent ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{tier.name}</span>
                    {isCurrent && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {tier.credits}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{tier.price}</span>
                  {canUpgrade && (
                    <Button
                      disabled={checkout.isPending}
                      size="sm"
                      onClick={() => {
                        trackCheckoutStarted();
                        checkout.mutate();
                      }}
                    >
                      Upgrade
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {currentTier !== 'free' && (
          <div className="mt-4 text-center">
            <Button
              className="h-auto p-0 text-sm"
              disabled={portal.isPending}
              variant="link"
              onClick={() => portal.mutate()}
            >
              Manage subscription
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
