import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock,
  Eye,
  Search,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { LastInspectionInfo } from "../App";
import { type Door, InspectionStatus } from "../backend";
import { QRCodeSVG } from "../components/QRCode";
import { QRCodeDialog } from "../components/QRCodeDialog";
import { StatusBadge } from "../components/StatusBadge";
import { useGetAllDoors } from "../hooks/useQueries";

type Page = "dashboard" | "doors" | "door-detail" | "inspect";

interface DashboardProps {
  onNavigate: (page: Page, doorId?: bigint) => void;
  lastInspectionMap: Record<string, LastInspectionInfo | undefined>;
}

export function Dashboard({ onNavigate, lastInspectionMap }: DashboardProps) {
  const { data: doors = [], isLoading } = useGetAllDoors();
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [qrDoor, setQrDoor] = useState<Door | null>(null);

  const activeDoors = useMemo(() => doors.filter((d) => d.active), [doors]);

  const companies = useMemo(() => {
    const set = new Set<string>();
    for (const d of activeDoors) if (d.company) set.add(d.company);
    return Array.from(set).sort();
  }, [activeDoors]);

  const stats = useMemo(() => {
    let pass = 0;
    let fail = 0;
    let overdue = 0;
    const thirtyDaysMs = 30n * 24n * 60n * 60n * 1000n * 1000000n;
    const now = BigInt(Date.now()) * 1000000n;
    for (const d of activeDoors) {
      const last = lastInspectionMap[d.id.toString()];
      if (!last) {
        overdue++;
        continue;
      }
      if (last.status === InspectionStatus.pass) pass++;
      else if (last.status === InspectionStatus.fail) fail++;
      else overdue++;
      if (now - last.date > thirtyDaysMs) overdue++;
    }
    return { total: activeDoors.length, pass, fail, overdue };
  }, [activeDoors, lastInspectionMap]);

  const filtered = useMemo(() => {
    return activeDoors.filter((d) => {
      if (companyFilter !== "all" && d.company !== companyFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        d.building.toLowerCase().includes(q) ||
        d.floor.toLowerCase().includes(q) ||
        d.location.toLowerCase().includes(q) ||
        (d.company ?? "").toLowerCase().includes(q)
      );
    });
  }, [activeDoors, search, companyFilter]);

  const formatDate = (ts: bigint) => {
    const ms = Number(ts / 1000000n);
    return new Date(ms).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const kpiCards = [
    {
      label: "TOTAL DOORS",
      value: stats.total,
      icon: Building2,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "PASS RATE",
      value:
        stats.total > 0
          ? `${Math.round((stats.pass / stats.total) * 100)}%`
          : "N/A",
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "FAIL COUNT",
      value: stats.fail,
      icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "OVERDUE",
      value: stats.overdue,
      icon: Clock,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        data-ocid="dashboard.section"
      >
        {kpiCards.map((card, i) => (
          <div
            key={card.label}
            className="bg-card rounded-[10px] shadow-card p-5"
            data-ocid={`dashboard.kpi.item.${i + 1}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  {card.label}
                </p>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-3xl font-bold text-foreground">
                    {card.value}
                  </p>
                )}
              </div>
              <div className={`${card.bg} p-2.5 rounded-lg`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-card rounded-[10px] shadow-card p-5 flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h2 className="font-semibold text-foreground">Quick Actions</h2>
          <p className="text-sm text-muted-foreground">
            Start an inspection or manage doors
          </p>
        </div>
        <Button
          className="bg-gray-800 hover:bg-gray-900 text-white"
          onClick={() => onNavigate("inspect")}
          data-ocid="dashboard.start_inspection.primary_button"
        >
          <ClipboardList className="w-4 h-4 mr-2" />
          Start New Inspection
        </Button>
      </div>

      {/* Door Inventory */}
      <div className="bg-card rounded-[10px] shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex flex-wrap gap-3 items-center justify-between">
          <h2 className="font-semibold text-foreground">Door Inventory</h2>
          <div className="flex flex-wrap gap-3 items-center">
            {companies.length > 0 && (
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger
                  className="w-48"
                  data-ocid="dashboard.company_filter.select"
                >
                  <SelectValue placeholder="All Companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search building, floor, location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-60"
                data-ocid="dashboard.search.search_input"
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-ocid="dashboard.doors.table">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Door ID
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Location
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Type
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Last Inspection
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  QR Code
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                [1, 2, 3, 4, 5].map((n) => (
                  <tr key={n}>
                    {[1, 2, 3, 4, 5, 6, 7].map((m) => (
                      <td key={m} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-muted-foreground"
                    data-ocid="dashboard.doors.empty_state"
                  >
                    No doors found
                  </td>
                </tr>
              ) : (
                filtered.map((door, idx) => {
                  const last = lastInspectionMap[door.id.toString()];
                  const qrValue = `${window.location.origin}${window.location.pathname}?doorId=${door.id.toString()}&page=inspect`;
                  return (
                    <tr
                      key={door.id.toString()}
                      className="hover:bg-muted/30 transition-colors"
                      data-ocid={`dashboard.doors.row.item.${idx + 1}`}
                    >
                      <td className="px-4 py-3 font-mono text-xs font-medium text-muted-foreground">
                        #FD-{door.id.toString().padStart(3, "0")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">
                          {door.building}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {door.floor} — {door.location}
                        </div>
                      </td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">
                        {door.doorType}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {last ? (
                          formatDate(last.date)
                        ) : (
                          <span className="text-orange-600 text-xs font-medium">
                            Never
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {last ? (
                          <StatusBadge status={last.status} size="sm" />
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setQrDoor(door)}
                          className="p-1 hover:bg-muted rounded cursor-pointer transition-colors"
                          title="View QR Code"
                          data-ocid={`dashboard.qr_code.button.${idx + 1}`}
                        >
                          <QRCodeSVG value={qrValue} size={48} level="L" />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2.5"
                            onClick={() => onNavigate("door-detail", door.id)}
                            data-ocid={`dashboard.view.button.${idx + 1}`}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 text-xs px-2.5 bg-fire-red hover:bg-fire-red-dark text-white"
                            onClick={() => onNavigate("inspect", door.id)}
                            data-ocid={`dashboard.inspect.button.${idx + 1}`}
                          >
                            <ClipboardList className="w-3.5 h-3.5 mr-1" />
                            Inspect
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {qrDoor && (
        <QRCodeDialog
          open={!!qrDoor}
          onClose={() => setQrDoor(null)}
          doorId={qrDoor.id}
          doorLabel={`${qrDoor.building} — ${qrDoor.floor} — ${qrDoor.location}`}
        />
      )}
    </div>
  );
}
