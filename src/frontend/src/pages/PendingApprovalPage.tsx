import { Button } from "@/components/ui/button";
import { Clock, LogOut, Mail } from "lucide-react";
import { motion } from "motion/react";

interface PendingApprovalPageProps {
  onLogout: () => void;
}

export function PendingApprovalPage({ onLogout }: PendingApprovalPageProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-card rounded-2xl shadow-card-hover p-10 max-w-md w-full text-center space-y-6"
      >
        <div className="flex flex-col items-center gap-3">
          <img
            src="/assets/screenshot_2026-03-27_at_16.18.34-019d4309-6f13-7322-af88-702e125e6e33.png"
            alt="HSF Compliance"
            className="h-16 w-auto"
          />
          <h1 className="text-xl font-bold text-foreground">
            HSF Compliance – Fire Door Inspection
          </h1>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
            <Clock className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Awaiting Approval
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your account registration has been received. An administrator needs
            to approve your access before you can use the system.
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            You will be notified once your account has been reviewed. Please
            check back later or contact your HSF Compliance administrator.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3 text-left">
          <Mail className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Your approval request has been submitted automatically. The system
            administrator will review your account shortly.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={onLogout}
          className="w-full"
          data-ocid="pending_approval.logout.button"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </motion.div>

      <footer className="mt-8 text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} HSF Compliance. All rights reserved.
      </footer>
    </div>
  );
}
