import { Button } from "@/components/ui/button";
import { RefreshCw, XCircle } from "lucide-react";
import { motion } from "motion/react";

interface PaymentFailurePageProps {
  onRetry: () => void;
}

export function PaymentFailurePage({ onRetry }: PaymentFailurePageProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-card rounded-2xl shadow-card-hover p-10 max-w-sm w-full text-center space-y-6"
      >
        <div className="flex flex-col items-center gap-4">
          <img
            src="/assets/screenshot_2026-03-27_at_16.18.34-019d4309-6f13-7322-af88-702e125e6e33.png"
            alt="HSF Compliance"
            className="h-12 w-auto"
          />
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <XCircle className="w-9 h-9 text-red-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Payment Cancelled
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Your payment was not completed. No charges have been made.
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          You can try again whenever you're ready.
        </p>
        <Button
          onClick={onRetry}
          className="w-full bg-fire-red hover:bg-fire-red-dark text-white"
          data-ocid="payment_failure.retry.primary_button"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </motion.div>
    </div>
  );
}
