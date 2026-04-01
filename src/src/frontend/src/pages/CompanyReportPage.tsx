import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import { useEffect } from "react";
import { InspectionStatus } from "../backend";
import type { Door, Inspection } from "../backend";

const FIRE_RATING_LABELS: Record<string, string> = {
  thirtyMinutes: "30 min",
  sixtyMinutes: "60 min",
  ninetyMinutes: "90 min",
  oneHundredTwentyMinutes: "120 min",
};

interface CompanyReportPageProps {
  company: string;
  doors: Door[];
  allInspections: Inspection[];
  onBack: () => void;
}

export function CompanyReportPage({
  company,
  doors,
  allInspections,
  onBack,
}: CompanyReportPageProps) {
  // Build latest inspection map for doors in this company
  const latestByDoor: Record<string, Inspection> = {};
  for (const insp of allInspections) {
    const key = insp.doorId.toString();
    if (
      !latestByDoor[key] ||
      insp.inspectionDate > latestByDoor[key].inspectionDate
    ) {
      latestByDoor[key] = insp;
    }
  }

  useEffect(() => {
    const style = document.createElement("style");
    style.id = "company-report-print-style";
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
      const el = document.getElementById("company-report-print-style");
      if (el) el.remove();
    };
  }, []);

  const formatDate = (ts: bigint) => {
    const ms = Number(ts / 1000000n);
    return new Date(ms).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const stats = doors.reduce(
    (acc, door) => {
      const insp = latestByDoor[door.id.toString()];
      if (!insp) {
        acc.notInspected++;
        return acc;
      }
      if (insp.overallStatus === InspectionStatus.pass) acc.passed++;
      else if (insp.overallStatus === InspectionStatus.fail) acc.failed++;
      else if (insp.overallStatus === InspectionStatus.actionRequired)
        acc.actionRequired++;
      return acc;
    },
    { passed: 0, failed: 0, actionRequired: 0, notInspected: 0 },
  );

  const sortedDoors = [...doors].sort(
    (a, b) =>
      a.building.localeCompare(b.building) ||
      a.floor.localeCompare(b.floor) ||
      a.location.localeCompare(b.location),
  );

  const getStatusConfig = (status: InspectionStatus | undefined) => {
    if (!status)
      return {
        label: "Not Inspected",
        cls: "bg-gray-100 text-gray-500 border-gray-200",
      };
    const map: Record<InspectionStatus, { label: string; cls: string }> = {
      [InspectionStatus.pass]: {
        label: "Pass",
        cls: "bg-green-100 text-green-700 border-green-200",
      },
      [InspectionStatus.fail]: {
        label: "Fail",
        cls: "bg-red-100 text-red-700 border-red-200",
      },
      [InspectionStatus.actionRequired]: {
        label: "Action Required",
        cls: "bg-amber-100 text-amber-700 border-amber-200",
      },
    };
    return (
      map[status] ?? {
        label: "Not Inspected",
        cls: "bg-gray-100 text-gray-500 border-gray-200",
      }
    );
  };

  return (
    <div className="print-report-container max-w-5xl mx-auto py-4 px-2 sm:px-4">
      {/* Action bar — hidden on print */}
      <div
        className="no-print flex items-center gap-3 mb-6"
        data-ocid="company_report.panel"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          data-ocid="company_report.back.button"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back
        </Button>
        <Button
          size="sm"
          className="bg-[#1e3a5f] hover:bg-[#162d4e] text-white"
          onClick={() => window.print()}
          data-ocid="company_report.print.button"
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
        {/* Header */}
        <div className="bg-[#1e3a5f] text-white px-6 py-5">
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
            <p className="text-white/80 text-sm mt-0.5">{company}</p>
            <div className="text-right text-sm text-white/80">
              <p>Date Printed</p>
              <p className="font-semibold text-white">{today}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Summary row */}
          <div className="report-section grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              {
                label: "Total Doors",
                value: doors.length,
                cls: "bg-slate-50 border-slate-200 text-slate-700",
              },
              {
                label: "Passed",
                value: stats.passed,
                cls: "bg-green-50 border-green-200 text-green-700",
              },
              {
                label: "Failed",
                value: stats.failed,
                cls: "bg-red-50 border-red-200 text-red-700",
              },
              {
                label: "Action Required",
                value: stats.actionRequired,
                cls: "bg-amber-50 border-amber-200 text-amber-700",
              },
              {
                label: "Not Inspected",
                value: stats.notInspected,
                cls: "bg-gray-50 border-gray-200 text-gray-500",
              },
            ].map(({ label, value, cls }) => (
              <div key={label} className={`rounded-lg p-3 border ${cls}`}>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs font-medium mt-0.5 opacity-80">{label}</p>
              </div>
            ))}
          </div>

          {/* Door table */}
          <div className="report-section overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#1e3a5f] text-white">
                  {[
                    "Door ID",
                    "Building",
                    "Floor / Location",
                    "Fire Rating",
                    "Last Inspection",
                    "Inspector",
                    "Checklist",
                    "Status",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2.5 text-left font-semibold text-xs whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedDoors.map((door, idx) => {
                  const insp = latestByDoor[door.id.toString()];
                  const statusCfg = getStatusConfig(insp?.overallStatus);
                  const checklistPassed = insp
                    ? Object.values(insp.checklist).filter(Boolean).length
                    : 0;
                  const checklistTotal = insp
                    ? Object.values(insp.checklist).length
                    : 14;

                  return (
                    <tr
                      key={door.id.toString()}
                      className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
                      data-ocid={`company_report.row.item.${idx + 1}`}
                    >
                      <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground whitespace-nowrap">
                        #FD-{door.id.toString().padStart(3, "0")}
                      </td>
                      <td className="px-3 py-2.5 font-medium whitespace-nowrap">
                        {door.building}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        <span className="block">{door.floor}</span>
                        <span className="text-xs">{door.location}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                        {FIRE_RATING_LABELS[door.fireRating] ?? door.fireRating}
                      </td>
                      <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                        {insp ? formatDate(insp.inspectionDate) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                        {insp?.inspectorName ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                        {insp ? `${checklistPassed}/${checklistTotal}` : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-block text-xs px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${statusCfg.cls}`}
                        >
                          {statusCfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
