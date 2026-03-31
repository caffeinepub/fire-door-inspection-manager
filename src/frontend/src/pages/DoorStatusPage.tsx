import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Flame,
  MapPin,
  XCircle,
} from "lucide-react";
import { Loader2, LogIn } from "lucide-react";
import type { Checklist } from "../backend.d";
import { useActor } from "../hooks/useActor";
import {
  useGetPublicDoor,
  useGetPublicInspectionsForDoor,
} from "../hooks/useQueries";

interface DoorStatusPageProps {
  doorId: bigint;
  onLogin: () => void;
  isLoggingIn: boolean;
}

const fireRatingLabel: Record<string, string> = {
  thirtyMinutes: "30 Minutes",
  sixtyMinutes: "60 Minutes",
  ninetyMinutes: "90 Minutes",
  oneHundredTwentyMinutes: "120 Minutes",
};

const checklistLabels: Array<{ key: keyof Checklist; label: string }> = [
  { key: "frame", label: "Frame Condition" },
  { key: "glazing", label: "Glazing" },
  { key: "certificatePlate", label: "Certificate Plate" },
  { key: "doorCloser", label: "Door Closer" },
  { key: "threshold", label: "Threshold" },
  { key: "signage", label: "Signage" },
  { key: "hinges", label: "Hinges" },
  { key: "latch", label: "Latch" },
  { key: "seals", label: "Seals" },
  { key: "intumescentStrip", label: "Intumescent Strip" },
  { key: "doorLeaf", label: "Door Leaf" },
  { key: "noObstructions", label: "No Obstructions" },
  { key: "selfClosing", label: "Self Closing" },
  { key: "visionPanel", label: "Vision Panel" },
];

function StatusDisplay({ status }: { status: string }) {
  if (status === "pass") {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <span className="text-2xl font-bold text-green-700">PASS</span>
      </div>
    );
  }
  if (status === "fail") {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
          <XCircle className="w-10 h-10 text-red-600" />
        </div>
        <span className="text-2xl font-bold text-red-700">FAIL</span>
      </div>
    );
  }
  if (status === "actionRequired") {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-amber-600" />
        </div>
        <span className="text-2xl font-bold text-amber-700">
          ACTION REQUIRED
        </span>
      </div>
    );
  }
  return null;
}

function ChecklistSection({ checklist }: { checklist: Checklist }) {
  const passed = checklistLabels.filter((item) => checklist[item.key]).length;
  const total = checklistLabels.length;

  return (
    <div className="bg-card rounded-[10px] shadow-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Inspection Checklist</h2>
        <span className="text-xs text-muted-foreground">
          {passed}/{total} passed
        </span>
      </div>
      <div className="divide-y divide-border">
        {checklistLabels.map(({ key, label }) => {
          const ok = checklist[key];
          return (
            <div key={key} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-foreground">{label}</span>
              {ok ? (
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500 shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DoorStatusPage({
  doorId,
  onLogin,
  isLoggingIn,
}: DoorStatusPageProps) {
  const { actor } = useActor();
  const { data: door, isLoading: doorLoading } = useGetPublicDoor(doorId);
  const { data: inspections = [], isLoading: inspLoading } =
    useGetPublicInspectionsForDoor(doorId);

  const isLoading = !actor || doorLoading || inspLoading;

  const latestInspection =
    [...inspections].sort((a, b) =>
      Number(b.inspectionDate - a.inspectionDate),
    )[0] ?? null;

  const formatDate = (ts: bigint) => {
    const ms = Number(ts / 1000000n);
    return new Date(ms).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const statusKey = latestInspection
    ? Object.keys(latestInspection.overallStatus)[0]
    : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-fire-red text-white shadow-md">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-2.5">
          <Flame className="w-5 h-5" />
          <span className="font-bold text-lg">Fire Door Inspector</span>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-8 space-y-5">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-32" />
          </div>
        ) : !door ? (
          <div className="bg-card rounded-[10px] shadow-card p-8 text-center">
            <p className="text-muted-foreground">Door not found.</p>
          </div>
        ) : (
          <>
            {/* Door info */}
            <div className="bg-card rounded-[10px] shadow-card p-5 space-y-3">
              <h1 className="text-lg font-bold text-foreground">
                #{door.id.toString().padStart(3, "0")} — Fire Door Status
              </h1>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="w-4 h-4 shrink-0" />
                  <span className="font-medium text-foreground">
                    {door.building}
                  </span>
                  <span>·</span>
                  <span>{door.floor}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span className="font-medium text-foreground">
                    {door.location}
                  </span>
                </div>
                <div className="text-muted-foreground">
                  Fire Rating:{" "}
                  <span className="font-medium text-foreground">
                    {fireRatingLabel[door.fireRating] ?? door.fireRating}
                  </span>
                </div>
                {door.company && (
                  <div className="text-muted-foreground">
                    Company:{" "}
                    <span className="font-medium text-foreground">
                      {door.company}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Inspection status */}
            <div className="bg-card rounded-[10px] shadow-card p-6">
              <h2 className="font-semibold text-foreground mb-5">
                Latest Inspection
              </h2>
              {!latestInspection ? (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No inspections recorded yet.
                </p>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  {statusKey && <StatusDisplay status={statusKey} />}
                  <div className="w-full border-t border-border pt-4 space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>
                        Inspected on{" "}
                        <span className="font-medium text-foreground">
                          {formatDate(latestInspection.inspectionDate)}
                        </span>
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      Inspector:{" "}
                      <span className="font-medium text-foreground">
                        {latestInspection.inspectorName}
                      </span>
                    </div>
                    {latestInspection.notes && (
                      <p className="text-muted-foreground italic mt-2">
                        "{latestInspection.notes}"
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Inspection checklist breakdown */}
            {latestInspection && (
              <ChecklistSection checklist={latestInspection.checklist} />
            )}

            {/* Login prompt for inspectors */}
            <div className="bg-muted/50 rounded-[10px] border border-border p-5 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Are you an inspector? Log in to submit a new inspection.
              </p>
              <Button
                onClick={onLogin}
                disabled={isLoggingIn}
                className="bg-fire-red hover:bg-fire-red-dark text-white"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    Login to Inspect
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()}. Built with ❤️ using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
