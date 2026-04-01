import { CheckCircle } from "lucide-react";
import { motion } from "motion/react";
import { useEffect } from "react";

interface PaymentSuccessPageProps {
  onContinue: () => void;
}

export function PaymentSuccessPage({ onContinue }: PaymentSuccessPageProps) {
  useEffect(() => {
    localStorage.setItem("hsf_payment_complete", "true");
    const timer = setTimeout(() => {
      onContinue();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onContinue]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="bg-card rounded-2xl shadow-card-hover p-10 max-w-sm w-full text-center space-y-6"
      >
        <div className="flex flex-col items-center gap-4">
          <img
            src="/assets/screenshot_2026-03-27_at_16.18.34-019d4309-6f13-7322-af88-702e125e6e33.png"
            alt="HSF Compliance"
            className="h-12 w-auto"
          />
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-9 h-9 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Payment Successful!
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Welcome to HSF Compliance – Fire Door Inspection
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Redirecting you to the dashboard in a moment…
        </p>
        <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 3, ease: "linear" }}
            className="h-full bg-green-500"
          />
        </div>
      </motion.div>
    </div>
  );
}
