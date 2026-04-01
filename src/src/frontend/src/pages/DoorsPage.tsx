import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
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
import { Eye, FileUp, Image, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import type { Door } from "../backend";
import { BulkImportDialog } from "../components/BulkImportDialog";
import { DoorModal } from "../components/DoorModal";
import { QRCodeSVG } from "../components/QRCode";
import { QRCodeDialog } from "../components/QRCodeDialog";
import { useDeleteDoor, useGetAllDoors } from "../hooks/useQueries";
import type { LastInspectionInfo } from "../types";

type Page = "dashboard" | "doors" | "door-detail" | "inspect";

interface DoorsPageProps {
  isAdmin: boolean;
  onNavigate: (page: Page, doorId?: bigint) => void;
  lastInspectionMap: Record<string, LastInspectionInfo | undefined>;
}

const SKELETON_COL_KEYS = [
  "c1",
  "c2",
  "c3",
  "c4",
  "c5",
  "c6",
  "c7",
  "c8",
  "c9",
  "c10",
  "c11",
];

export function DoorsPage({
  isAdmin,
  onNavigate,
  lastInspectionMap: _lastInspectionMap,
}: DoorsPageProps) {
  const { data: doors = [], isLoading } = useGetAllDoors();
  const deleteDoor = useDeleteDoor();
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Door | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Door | null>(null);
  const [qrDoor, setQrDoor] = useState<Door | null>(null);

  const companies = useMemo(() => {
    const set = new Set<string>();
    for (const d of doors) if (d.company) set.add(d.company);
    return Array.from(set).sort();
  }, [doors]);

  const filtered = doors.filter((d) => {
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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoor.mutateAsync(deleteTarget.id);
      toast.success("Door deleted");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete door");
    }
    setDeleteTarget(null);
  };

  const fireRatingLabel: Record<string, string> = {
    thirtyMinutes: "30 min",
    sixtyMinutes: "60 min",
    ninetyMinutes: "90 min",
    oneHundredTwentyMinutes: "120 min",
  };

  const th =
    "text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-white whitespace-nowrap";

  return (
    <div className="space-y-5">
      <div className="bg-card rounded-[10px] shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex flex-wrap gap-3 items-center justify-between">
          <div>
            <h2 className="font-semibold text-foreground">All Fire Doors</h2>
            <p className="text-sm text-muted-foreground">
              {doors.length} doors registered
            </p>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            {companies.length > 0 && (
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger
                  className="w-48"
                  data-ocid="doors.company_filter.select"
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
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-52"
                data-ocid="doors.search.search_input"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setImportOpen(true)}
              data-ocid="doors.import_csv.secondary_button"
            >
              <FileUp className="w-4 h-4 mr-1.5" />
              Import CSV
            </Button>
            <Button
              className="bg-[#1e3a5f] hover:bg-[#162d4a] text-white"
              onClick={() => {
                setEditTarget(null);
                setModalOpen(true);
              }}
              data-ocid="doors.add_door.primary_button"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Door
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-ocid="doors.table">
            <thead>
              <tr className="bg-[#1e3a5f]">
                <th className={th}>Door ID</th>
                <th className={th}>Company</th>
                <th className={th}>ID</th>
                <th className={th}>Dimensions</th>
                <th className={th}>Rating</th>
                <th className={th}>Door Material</th>
                <th className={th}>Frame Material</th>
                <th className={th}>Door Type</th>
                <th className={th}>Location</th>
                <th className={th}>Pictures</th>
                <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider text-white">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                ["r1", "r2", "r3", "r4", "r5", "r6"].map((n) => (
                  <tr key={n}>
                    {SKELETON_COL_KEYS.map((k) => (
                      <td key={k} className="px-3 py-3">
                        <Skeleton className="h-4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-10 text-center text-muted-foreground"
                    data-ocid="doors.empty_state"
                  >
                    No doors found
                  </td>
                </tr>
              ) : (
                filtered.map((door, idx) => {
                  const qrValue = `${window.location.origin}${window.location.pathname}?doorId=${door.id.toString()}&page=status`;
                  return (
                    <tr
                      key={door.id.toString()}
                      className="hover:bg-muted/30 transition-colors"
                      data-ocid={`doors.row.item.${idx + 1}`}
                    >
                      {/* Door ID */}
                      <td className="px-3 py-3 font-mono text-xs font-medium text-muted-foreground">
                        #FD-{door.id.toString().padStart(3, "0")}
                      </td>
                      {/* Company */}
                      <td className="px-3 py-3 text-xs font-medium text-foreground whitespace-nowrap">
                        {door.company || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      {/* ID - QR code */}
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => setQrDoor(door)}
                          className="hover:opacity-70 transition-opacity"
                          data-ocid={`doors.qr.button.${idx + 1}`}
                        >
                          <QRCodeSVG value={qrValue} size={36} level="L" />
                        </button>
                      </td>
                      {/* Dimensions */}
                      <td className="px-3 py-3 text-muted-foreground text-xs whitespace-nowrap">
                        {door.dimensions || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      {/* Rating */}
                      <td className="px-3 py-3">
                        <Badge
                          variant="outline"
                          className="text-xs whitespace-nowrap"
                        >
                          {fireRatingLabel[door.fireRating] ?? door.fireRating}
                        </Badge>
                      </td>
                      {/* Door Material */}
                      <td className="px-3 py-3 capitalize text-muted-foreground text-xs">
                        {door.doorMaterial}
                      </td>
                      {/* Frame Material */}
                      <td className="px-3 py-3 text-muted-foreground text-xs">
                        {door.frameMaterial}
                      </td>
                      {/* Door Type */}
                      <td className="px-3 py-3 capitalize text-muted-foreground text-xs">
                        {door.doorType}
                      </td>
                      {/* Location */}
                      <td className="px-3 py-3">
                        <span className="font-medium text-xs">
                          {door.building}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {" "}
                          / {door.floor} / {door.location}
                        </span>
                      </td>
                      {/* Pictures */}
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => onNavigate("door-detail", door.id)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title="View door details"
                        >
                          <Image className="w-4 h-4" />
                        </button>
                      </td>
                      {/* Actions */}
                      <td className="px-3 py-3">
                        <div className="flex gap-1.5 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2"
                            onClick={() => onNavigate("door-detail", door.id)}
                            data-ocid={`doors.view.button.${idx + 1}`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          {isAdmin && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2"
                                onClick={() => {
                                  setEditTarget(door);
                                  setModalOpen(true);
                                }}
                                data-ocid={`doors.edit.edit_button.${idx + 1}`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                onClick={() => setDeleteTarget(door)}
                                data-ocid={`doors.delete.delete_button.${idx + 1}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
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

      <DoorModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditTarget(null);
        }}
        editDoor={editTarget}
      />

      <BulkImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
      />

      {qrDoor && (
        <QRCodeDialog
          open={!!qrDoor}
          onClose={() => setQrDoor(null)}
          doorId={qrDoor.id}
          doorLabel={`${qrDoor.building} — ${qrDoor.floor} — ${qrDoor.location}`}
        />
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <AlertDialogContent data-ocid="doors.delete.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Door?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete door #
              {deleteTarget?.id.toString().padStart(3, "0")} at{" "}
              {deleteTarget?.building}, {deleteTarget?.floor}. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="doors.delete.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
              data-ocid="doors.delete.confirm_button"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
