import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import { useEffect } from "react";
import { InspectionStatus } from "../backend";
import { useGetDoor, useGetInspection } from "../hooks/useQueries";

const CHECKLIST_LABELS: Record<string, string> = {
  frame: "Frame Condition",
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

const FIRE_RATING_LABELS: Record<string, string> = {
  thirtyMinutes: "30 Minutes",
  sixtyMinutes: "60 Minutes",
  ninetyMinutes: "90 Minutes",
  oneHundredTwentyMinutes: "120 Minutes",
};

interface InspectionReportPageProps {
  doorId: bigint;
  inspectionId: bigint;
  onBack: () => void;
}

export function InspectionReportPage({
  doorId,
  inspectionId,
  onBack,
}: InspectionReportPageProps) {
  const { data: door, isLoading: doorLoading } = useGetDoor(doorId);
  const { data: inspection, isLoading: inspLoading } =
    useGetInspection(inspectionId);

  useEffect(() => {
    const style = document.createElement("style");
    style.id = "report-print-style";
    style.textContent = `
      @media print {
        body { background: white !important; }
        .no-print, header, footer, nav { display: none !important; }
        .print-report-container { padding: 0 !important; }
        .report-card { box-shadow: none !important; border: 1px solid #e5e7eb !important; }
        .report-section { page-break-inside: avoid; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      const el = document.getElementById("report-print-style");
      if (el) el.remove();
    };
  }, []);

  const formatDate = (ts: bigint) => {
    const ms = Number(ts / 1000000n);
    return new Date(ms).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  if (doorLoading || inspLoading) {
    return (
      <div
        className="flex items-center justify-center py-20"
        data-ocid="report.loading_state"
      >
        <div className="text-muted-foreground">Loading report...</div>
      </div>
    );
  }

  if (!door || !inspection) {
    return (
      <div
        className="bg-card rounded-[10px] shadow-card p-8 text-center"
        data-ocid="report.error_state"
      >
        <p className="text-muted-foreground">Report data not found.</p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  const checklistEntries = Object.entries(inspection.checklist) as [
    keyof typeof inspection.checklist,
    boolean,
  ][];
  const mid = Math.ceil(checklistEntries.length / 2);
  const leftCol = checklistEntries.slice(0, mid);
  const rightCol = checklistEntries.slice(mid);

  const statusConfig = {
    [InspectionStatus.pass]: {
      label: "PASS",
      bg: "bg-green-100",
      text: "text-green-800",
      border: "border-green-300",
    },
    [InspectionStatus.fail]: {
      label: "FAIL",
      bg: "bg-red-100",
      text: "text-red-800",
      border: "border-red-300",
    },
    [InspectionStatus.actionRequired]: {
      label: "ACTION REQUIRED",
      bg: "bg-amber-100",
      text: "text-amber-800",
      border: "border-amber-300",
    },
  };

  const status =
    statusConfig[inspection.overallStatus] ??
    statusConfig[InspectionStatus.fail];

  const doorReferenceFields: [string, string][] = [
    ["Door ID", `#${door.id.toString().padStart(3, "0")}`],
    ["Building", door.building],
    ["Floor", door.floor],
    ["Location", door.location],
    ...(door.dimensions
      ? [["Dimensions", door.dimensions] as [string, string]]
      : []),
    ["Door Type", door.doorType],
    ["Leaf Configuration", door.leafConfig],
    ["Door Material", door.doorMaterial],
    ["Frame Material", door.frameMaterial],
    ["Fire Rating", FIRE_RATING_LABELS[door.fireRating] ?? door.fireRating],
  ];

  const renderChecklistCol = (entries: [string, boolean][]) =>
    entries.map(([key, val]) => (
      <div
        key={key}
        className="flex items-center justify-between py-2 border-b border-border/60 last:border-0 text-sm"
      >
        <span className="text-foreground">{CHECKLIST_LABELS[key] ?? key}</span>
        <span
          className={`font-bold text-base ml-4 ${
            val ? "text-green-600" : "text-red-600"
          }`}
        >
          {val ? "\u2713" : "\u2717"}
        </span>
      </div>
    ));

  return (
    <div className="print-report-container max-w-3xl mx-auto py-4 px-2 sm:px-4">
      {/* Action buttons - hidden on print */}
      <div
        className="no-print flex items-center gap-3 mb-6"
        data-ocid="report.panel"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          data-ocid="report.back.button"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back
        </Button>
        <Button
          size="sm"
          className="bg-fire-red hover:bg-fire-red-dark text-white"
          onClick={() => window.print()}
          data-ocid="report.print.button"
        >
          <Printer className="w-4 h-4 mr-1.5" />
          Print / Save as PDF
        </Button>
        <span className="text-sm text-muted-foreground ml-auto">
          Use your browser&#39;s print dialog to save as PDF
        </span>
      </div>

      {/* Report */}
      <div className="report-card bg-white rounded-xl shadow-md border border-border overflow-hidden">
        {/* Header bar */}
        <div className="bg-fire-red text-white px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3 mb-1">
              <img
                src="/assets/screenshot_2026-03-27_at_16.18.34-019d4309-6f13-7322-af88-702e125e6e33.png"
                alt="HSF Compliance"
                className="h-10 w-auto bg-white rounded p-0.5 shrink-0"
              />
              <h1 className="text-xl font-bold tracking-tight">
                Fire Door Inspection Report
              </h1>
            </div>
            <p className="text-white/80 text-sm mt-0.5">{door.company}</p>
            <div className="text-right text-sm text-white/80">
              <p>Date Printed</p>
              <p className="font-semibold text-white">{today}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Door Reference */}
          <div className="report-section">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 pb-1 border-b border-border">
              Door Reference
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
              {doorReferenceFields.map(([label, value]) => (
                <div key={label}>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                    {label}
                  </span>
                  <span className="font-medium text-foreground capitalize">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Inspection Details */}
          <div className="report-section">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 pb-1 border-b border-border">
              Inspection Details
            </h2>
            <div className="flex flex-wrap gap-6 items-start">
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm flex-1 min-w-0">
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                    Inspection Date
                  </span>
                  <span className="font-medium">
                    {formatDate(inspection.inspectionDate)}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                    Inspector
                  </span>
                  <span className="font-medium">
                    {inspection.inspectorName}
                  </span>
                </div>
                {inspection.company && (
                  <div>
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                      Company
                    </span>
                    <span className="font-medium">{inspection.company}</span>
                  </div>
                )}
              </div>
              <div
                className={`px-5 py-3 rounded-xl border-2 font-bold text-lg text-center min-w-[140px] ${status.bg} ${status.text} ${status.border}`}
              >
                {status.label}
              </div>
            </div>
            {inspection.notes && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                  Notes
                </span>
                <p className="text-sm text-foreground">{inspection.notes}</p>
              </div>
            )}
          </div>

          {/* Checklist */}
          <div className="report-section">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 pb-1 border-b border-border">
              Inspection Checklist
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              <div>{renderChecklistCol(leftCol)}</div>
              <div>{renderChecklistCol(rightCol)}</div>
            </div>
          </div>

          {/* Summary bar */}
          <div className="report-section bg-muted/40 rounded-lg px-4 py-3 flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Items Passed: </span>
              <span className="font-semibold text-green-700">
                {checklistEntries.filter(([, v]) => v).length}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Items Failed: </span>
              <span className="font-semibold text-red-700">
                {checklistEntries.filter(([, v]) => !v).length}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Total Items: </span>
              <span className="font-semibold">{checklistEntries.length}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-muted/30 border-t border-border text-xs text-muted-foreground flex flex-wrap justify-between gap-2">
          <span>Report generated on {today}</span>
          <span>HSF Compliance Fire - Door Inspection Software</span>
        </div>
      </div>
    </div>
  );
}
