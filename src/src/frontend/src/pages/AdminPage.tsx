import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Principal } from "@icp-sdk/core/principal";
import {
  CheckCircle,
  CreditCard,
  Loader2,
  Settings,
  UserCheck,
  UserX,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  ApprovalStatus,
  useIsStripeConfigured,
  useListApprovals,
  useSetApproval,
  useSetStripeConfiguration,
} from "../hooks/useQueries";

export function AdminPage() {
  const {
    data: approvals = [],
    isLoading: approvalsLoading,
    refetch: refetchApprovals,
  } = useListApprovals();
  const { data: stripeConfigured, refetch: refetchStripe } =
    useIsStripeConfigured();
  const setApproval = useSetApproval();
  const setStripeConfig = useSetStripeConfiguration();

  const [stripeKey, setStripeKey] = useState("");
  const [stripeCountries, setStripeCountries] = useState("GB");
  const [savingStripe, setSavingStripe] = useState(false);

  const handleApprove = async (principal: Principal) => {
    try {
      await setApproval.mutateAsync({
        user: principal,
        status: ApprovalStatus.approved,
      });
      toast.success("User approved");
      refetchApprovals();
    } catch {
      toast.error("Failed to approve user");
    }
  };

  const handleReject = async (principal: Principal) => {
    try {
      await setApproval.mutateAsync({
        user: principal,
        status: ApprovalStatus.rejected,
      });
      toast.success("User rejected");
      refetchApprovals();
    } catch {
      toast.error("Failed to reject user");
    }
  };

  const handleSaveStripe = async () => {
    if (!stripeKey.trim()) {
      toast.error("Please enter a Stripe secret key");
      return;
    }
    setSavingStripe(true);
    try {
      const countries = stripeCountries
        .split(",")
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean);
      await setStripeConfig.mutateAsync({
        secretKey: stripeKey.trim(),
        allowedCountries: countries,
      });
      toast.success("Stripe configured successfully");
      setStripeKey("");
      refetchStripe();
    } catch {
      toast.error("Failed to configure Stripe");
    } finally {
      setSavingStripe(false);
    }
  };

  const statusBadge = (status: ApprovalStatus) => {
    if (status === ApprovalStatus.approved)
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          Approved
        </Badge>
      );
    if (status === ApprovalStatus.rejected)
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200">
          Rejected
        </Badge>
      );
    return (
      <Badge className="bg-amber-100 text-amber-800 border-amber-200">
        Pending
      </Badge>
    );
  };

  const pendingCount = approvals.filter(
    (a) => a.status === ApprovalStatus.pending,
  ).length;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-fire-red" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-muted-foreground text-sm">
            Manage user approvals and payment configuration
          </p>
        </div>
      </div>

      {/* User Approvals */}
      <Card data-ocid="admin.approvals.card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserCheck className="w-5 h-5 text-fire-red" />
            User Approvals
            {pendingCount > 0 && (
              <Badge className="bg-amber-100 text-amber-800 border-amber-200 ml-1">
                {pendingCount} pending
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {approvalsLoading ? (
            <div
              className="flex items-center justify-center py-8"
              data-ocid="admin.approvals.loading_state"
            >
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : approvals.length === 0 ? (
            <div
              className="text-center py-8 text-muted-foreground text-sm"
              data-ocid="admin.approvals.empty_state"
            >
              No users have requested access yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-ocid="admin.approvals.table">
                <TableHeader>
                  <TableRow className="bg-fire-red">
                    <TableHead className="text-white font-semibold">
                      Principal
                    </TableHead>
                    <TableHead className="text-white font-semibold">
                      Status
                    </TableHead>
                    <TableHead className="text-white font-semibold text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvals.map((a, i) => (
                    <TableRow
                      key={a.principal.toString()}
                      data-ocid={`admin.approvals.item.${i + 1}`}
                    >
                      <TableCell className="font-mono text-xs max-w-[180px] truncate">
                        {a.principal.toString()}
                      </TableCell>
                      <TableCell>{statusBadge(a.status)}</TableCell>
                      <TableCell className="text-right">
                        {a.status === ApprovalStatus.pending && (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(a.principal)}
                              disabled={setApproval.isPending}
                              className="bg-green-600 hover:bg-green-700 text-white h-7 px-3"
                              data-ocid={`admin.approve.button.${i + 1}`}
                            >
                              <UserCheck className="w-3 h-3 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(a.principal)}
                              disabled={setApproval.isPending}
                              className="h-7 px-3"
                              data-ocid={`admin.reject.button.${i + 1}`}
                            >
                              <UserX className="w-3 h-3 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                        {a.status === ApprovalStatus.approved && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(a.principal)}
                            disabled={setApproval.isPending}
                            className="h-7 px-3"
                            data-ocid={`admin.revoke.button.${i + 1}`}
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            Revoke
                          </Button>
                        )}
                        {a.status === ApprovalStatus.rejected && (
                          <Button
                            size="sm"
                            onClick={() => handleApprove(a.principal)}
                            disabled={setApproval.isPending}
                            className="h-7 px-3 bg-green-600 hover:bg-green-700 text-white"
                            data-ocid={`admin.reinstate.button.${i + 1}`}
                          >
                            <UserCheck className="w-3 h-3 mr-1" />
                            Reinstate
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stripe Configuration */}
      <Card data-ocid="admin.stripe.card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="w-5 h-5 text-fire-red" />
            Stripe Payment Configuration
            {stripeConfigured && (
              <Badge className="bg-green-100 text-green-800 border-green-200 ml-1">
                <CheckCircle className="w-3 h-3 mr-1" />
                Configured
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {stripeConfigured ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                Stripe is configured. Users without an active subscription will
                be redirected to the payment page. To update your Stripe
                configuration, enter a new secret key below.
              </p>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                Stripe is not yet configured. Without Stripe, all approved users
                can access the app for free. Add your Stripe secret key below to
                enable subscription payments.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="stripe-key">Stripe Secret Key</Label>
              <Input
                id="stripe-key"
                type="password"
                placeholder="sk_live_..."
                value={stripeKey}
                onChange={(e) => setStripeKey(e.target.value)}
                data-ocid="admin.stripe_key.input"
              />
              <p className="text-xs text-muted-foreground">
                Your Stripe secret key from the Stripe Dashboard.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stripe-countries">
                Allowed Countries (comma-separated)
              </Label>
              <Input
                id="stripe-countries"
                placeholder="GB, US, IE"
                value={stripeCountries}
                onChange={(e) => setStripeCountries(e.target.value)}
                data-ocid="admin.stripe_countries.input"
              />
            </div>
            <Button
              onClick={handleSaveStripe}
              disabled={savingStripe || !stripeKey.trim()}
              className="bg-fire-red hover:bg-fire-red-dark text-white"
              data-ocid="admin.stripe.save.primary_button"
            >
              {savingStripe ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  {stripeConfigured
                    ? "Update Stripe Configuration"
                    : "Configure Stripe"}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
