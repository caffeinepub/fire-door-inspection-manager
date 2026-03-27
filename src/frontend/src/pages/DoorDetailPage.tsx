import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  ClipboardList,
  FileText,
  Printer,
  QrCode,
} from "lucide-react";
import { useState } from "react";
import { InspectionStatus } from "../backend";
import { QRCodeSVG } from "../components/QRCode";
import { QRCodeDialog } from "../components/QRCodeDialog";
import { StatusBadge } from "../components/StatusBadge";
import { useGetDoor, useGetInspectionsForDoor } from "../hooks/useQueries";

type Page = "dashboard" | "doors" | "door-detail" | "inspect" | "report";

interface DoorDetailPageProps {
  doorId: bigint;
  onNavigate: (page: Page, doorId?: bigint, inspectionId?: bigint) => void;
}

export function DoorDetailPage({ doorId, onNavigate }: DoorDetailPageProps) {
  const { data: door, isLoading: doorLoading } = useGetDoor(doorId);
  const { data: inspections = [], isLoading: inspLoading } =
    useGetInspectionsForDoor(doorId);
  const [qrOpen, setQrOpen] = useState(false);

  // QR points to public status page (no login required)
  const qrValue = `${window.location.origin}${window.location.pathname}?doorId=${doorId.toString()}&page=status`;

  const formatDate = (ts: bigint) => {
    const ms = Number(ts / 1000000n);
    return new Date(ms).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const fireRatingLabel: Record<string, string> = {
    thirtyMinutes: "30 Minutes",
    sixtyMinutes: "60 Minutes",
    ninetyMinutes: "90 Minutes",
    oneHundredTwentyMinutes: "120 Minutes",
  };

  const checklistLabels: Record<string, string> = {
    frame: "Frame",
    glazing: "Glazing",
    certificatePlate: "Certificate Plate",
    doorCloser: "Door Closer",
    threshold: "Threshold",
    signage: "Signage",
    hinges: "Hinges",
    latch: "Latch",
    seals: "Seals",
    intumescentStrip: "Intumescent Strip",
    doorLeaf: "Door Leaf",
    noObstructions: "No Obstructions",
    selfClosing: "Self Closing",
    visionPanel: "Vision Panel",
  };

  if (doorLoading) {
    return (
      <div className="space-y-4" data-ocid="door_detail.loading_state">
        <Skeleton className="h-8 w-40" />
        <div className="grid md:grid-cols-3 gap-4">
          <Skeleton className="h-64 md:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!door) {
    return (
      <div
        className="bg-card rounded-[10px] shadow-card p-8 text-center"
        data-ocid="door_detail.error_state"
      >
        <p className="text-muted-foreground">Door not found</p>
        <Button
          variant="outline"
          onClick={() => onNavigate("doors")}
          className="mt-4"
        >
          Back to Doors
        </Button>
      </div>
    );
  }

  const sortedInspections = [...inspections].sort((a, b) =>
    Number(b.inspectionDate - a.inspectionDate),
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate("doors")}
          data-ocid="door_detail.back.button"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <h1 className="text-xl font-bold text-foreground">
          #{door.id.toString().padStart(3, "0")} — {door.building}, {door.floor}
        </h1>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {/* Door Info */}
        <div className="md:col-span-2 bg-card rounded-[10px] shadow-card p-5 space-y-4">
          <h2 className="font-semibold text-foreground">Door Information</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {[
              ["Building", door.building],
              ["Floor", door.floor],
              ["Location", door.location],
              ["Door Type", door.doorType],
              ["Leaf Config", door.leafConfig],
              ["Door Material", door.doorMaterial],
              ["Frame Material", door.frameMaterial],
              [
                "Fire Rating",
                fireRatingLabel[door.fireRating] ?? door.fireRating,
              ],
              ["Status", door.active ? "Active" : "Inactive"],
            ].map(([label, value]) => (
              <div key={label}>
                <span className="text-xs text-muted-foreground uppercase tracking-wide block mb-0.5">
                  {label}
                </span>
                <span className="font-medium capitalize">{value}</span>
              </div>
            ))}
          </div>
          {door.notes && (
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wide block mb-1">
                Notes
              </span>
              <p className="text-sm text-foreground bg-muted/50 rounded-lg p-3">
                {door.notes}
              </p>
            </div>
          )}
          <Button
            className="bg-fire-red hover:bg-fire-red-dark text-white w-full sm:w-auto"
            onClick={() => onNavigate("inspect", door.id)}
            data-ocid="door_detail.inspect.primary_button"
          >
            <ClipboardList className="w-4 h-4 mr-2" />
            Start Inspection
          </Button>
        </div>

        {/* QR Code */}
        <div className="bg-card rounded-[10px] shadow-card p-5 flex flex-col items-center gap-4">
          <h2 className="font-semibold text-foreground self-start">QR Code</h2>
          <div className="p-3 bg-white rounded-xl border-2 border-border shadow-sm">
            <QRCodeSVG value={qrValue} size={180} level="H" />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Scan to view door status (no login required)
          </p>
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setQrOpen(true)}
              data-ocid="door_detail.view_qr.button"
            >
              <QrCode className="w-4 h-4 mr-1.5" />
              Enlarge
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.print()}
              data-ocid="door_detail.print_qr.button"
            >
              <Printer className="w-4 h-4 mr-1.5" />
              Print
            </Button>
          </div>
        </div>
      </div>

      {/* Inspection History */}
      <div className="bg-card rounded-[10px] shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Inspection History</h2>
          <p className="text-sm text-muted-foreground">
            {inspections.length} inspections recorded
          </p>
        </div>
        {inspLoading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3].map((n) => (
              <Skeleton key={n} className="h-12" />
            ))}
          </div>
        ) : sortedInspections.length === 0 ? (
          <div
            className="px-5 py-10 text-center text-muted-foreground"
            data-ocid="door_detail.inspections.empty_state"
          >
            No inspections yet. Start the first one!
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sortedInspections.map((insp, idx) => {
              const passed = Object.values(insp.checklist).filter(
                Boolean,
              ).length;
              const total = Object.values(insp.checklist).length;
              return (
                <div
                  key={insp.id.toString()}
                  className="px-5 py-4 flex flex-wrap gap-3 items-start justify-between"
                  data-ocid={`door_detail.inspections.item.${idx + 1}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={insp.overallStatus} size="sm" />
                      <span className="text-sm font-medium">
                        {insp.inspectorName}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(insp.inspectionDate)} &bull; Checklist:{" "}
                      {passed}/{total} items passed
                    </div>
                    {insp.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        "{insp.notes}"
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {Object.entries(insp.checklist).map(([key, val]) => (
                        <span
                          key={key}
                          className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${
                            val
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          }`}
                        >
                          {checklistLabels[key] ?? key}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigate("report", door.id, insp.id)}
                    data-ocid={`door_detail.inspections.report.button.${idx + 1}`}
                  >
                    <FileText className="w-3.5 h-3.5 mr-1" />
                    Report
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <QRCodeDialog
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        doorId={door.id}
        doorLabel={`${door.building} — ${door.floor} — ${door.location}`}
      />
    </div>
  );
}
