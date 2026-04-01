import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, CreditCard, Loader2, LogOut } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";

interface SubscriptionPageProps {
  onLogout: () => void;
}

const FEATURES = [
  "Unlimited fire door inspections",
  "QR code generation & scanning",
  "PDF inspection reports",
  "Multi-company management",
  "Certification attachment storage",
  "By-company batch inspections",
];

export function SubscriptionPage({ onLogout }: SubscriptionPageProps) {
  const { actor } = useActor();
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!actor) return;
    setLoading(true);
    try {
      const successUrl = `${window.location.origin}/payment-success`;
      const cancelUrl = `${window.location.origin}/payment-failure`;
      const items = [
        {
          currency: "gbp",
          productName: "HSF Compliance - Fire Door Inspection",
          productDescription:
            "Monthly subscription for fire door inspection software",
          priceInCents: 2999n,
          quantity: 1n,
        },
      ];
      const resultStr = (await (actor as any).createCheckoutSession(
        items,
        successUrl,
        cancelUrl,
      )) as string;
      const session = JSON.parse(resultStr) as { id: string; url: string };
      window.location.href = session.url;
    } catch (err: any) {
      toast.error(
        err?.message ?? "Failed to start checkout. Please try again.",
      );
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full space-y-6"
      >
        <div className="text-center space-y-2">
          <img
            src="/assets/screenshot_2026-03-27_at_16.18.34-019d4309-6f13-7322-af88-702e125e6e33.png"
            alt="HSF Compliance"
            className="h-14 w-auto mx-auto"
          />
          <h1 className="text-xl font-bold text-foreground">
            HSF Compliance – Fire Door Inspection
          </h1>
        </div>

        <Card className="shadow-card-hover">
          <CardHeader className="bg-fire-red text-white rounded-t-xl pb-4">
            <CardTitle className="text-center">
              <div className="text-3xl font-bold">£29.99</div>
              <div className="text-sm font-normal opacity-90">per month</div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <ul className="space-y-2">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <Button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full bg-fire-red hover:bg-fire-red-dark text-white py-3"
              data-ocid="subscription.subscribe.primary_button"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Redirecting to payment…
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Subscribe Now
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Secure payment via Stripe. Cancel anytime.
            </p>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="text-muted-foreground"
            data-ocid="subscription.logout.button"
          >
            <LogOut className="w-4 h-4 mr-1.5" />
            Sign Out
          </Button>
        </div>
      </motion.div>

      <footer className="mt-8 text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} HSF Compliance. All rights reserved.
      </footer>
    </div>
  );
}
