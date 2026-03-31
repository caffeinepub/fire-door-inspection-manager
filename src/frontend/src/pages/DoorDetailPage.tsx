import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  ClipboardList,
  ExternalLink,
  FileText,
  Loader2,
  Paperclip,
  Printer,
  QrCode,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { QRCodeSVG } from "../components/QRCode";
import { QRCodeDialog } from "../components/QRCodeDialog";
import { StatusBadge } from "../components/StatusBadge";
import {
  useAddDoorAttachment,
  useGetDoor,
  useGetDoorAttachments,
  useGetInspectionsForDoor,
  useRemoveDoorAttachment,
} from "../hooks/useQueries";
import type { DoorAttachment } from "../hooks/useQueries";
import { useStorageClient } from "../hooks/useStorageClient";

type Page = "dashboard" | "doors" | "door-detail" | "inspect" | "report";

interface DoorDetailPageProps {
  doorId: bigint;
  onNavigate: (page: Page, doorId?: bigint, inspectionId?: bigint) => void;
}

export function DoorDetailPage({ doorId, onNavigate }: DoorDetailPageProps) {
  const { data: door, isLoading: doorLoading } = useGetDoor(doorId);
  const { data: inspections = [], isLoading: inspLoading } =
    useGetInspectionsForDoor(doorId);
  const { data: attachments = [], isLoading: attachmentsLoading } =
    useGetDoorAttachments(doorId);
  const { data: storageClient } = useStorageClient();
  const addAttachment = useAddDoorAttachment();
  const removeAttachment = useRemoveDoorAttachment();

  const [qrOpen, setQrOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [openingId, setOpeningId] = useState<bigint | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!storageClient) {
      toast.error("Storage not available. Please try again.");
      return;
    }
    setUploadProgress(0);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { hash } = await storageClient.putFile(bytes, (pct) =>
        setUploadProgress(pct),
      );
      await addAttachment.mutateAsync({
        doorId,
        filename: file.name,
        blobHash: hash,
      });
      toast.success("Attachment uploaded successfully");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleOpenAttachment = async (attachment: DoorAttachment) => {
    if (!storageClient) {
      toast.error("Storage not available");
      return;
    }
    setOpeningId(attachment.id);
    try {
      const url = await storageClient.getDirectURL(attachment.blobHash);
      window.open(url, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Failed to open attachment");
    } finally {
      setOpeningId(null);
    }
  };

  const handleDeleteAttachment = async (attachment: DoorAttachment) => {
    try {
      await removeAttachment.mutateAsync({
        doorId,
        attachmentId: attachment.id,
      });
      toast.success("Attachment removed");
    } catch (err: any) {
      toast.error(err.message || "Failed to remove attachment");
    }
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

  const infoRows: [string, string][] = [
    ["Building", door.building],
    ["Floor", door.floor],
    ["Location", door.location],
    ...(door.dimensions
      ? [["Dimensions", door.dimensions] as [string, string]]
      : []),
    ["Door Type", door.doorType],
    ["Leaf Config", door.leafConfig],
    ["Door Material", door.doorMaterial],
    ["Frame Material", door.frameMaterial],
    ["Fire Rating", fireRatingLabel[door.fireRating] ?? door.fireRating],
    ["Status", door.active ? "Active" : "Inactive"],
  ];

  const sortedAttachments = [...attachments].sort((a, b) =>
    Number(b.uploadedAt - a.uploadedAt),
  );

  const isUploading = uploadProgress !== null;

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
            {infoRows.map(([label, value]) => (
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

      {/* Certification & Attachments */}
      <div
        className="bg-card rounded-[10px] shadow-card overflow-hidden"
        data-ocid="door_detail.attachments.panel"
      >
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-[#1e3a5f]" />
                Certification &amp; Attachments
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Fire Door Certification Data Sheet and other documents
              </p>
            </div>
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={handleFileUpload}
              data-ocid="door_detail.attachments.upload_button"
            />
            <Button
              size="sm"
              className="bg-[#1e3a5f] hover:bg-[#162d4e] text-white shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || !storageClient}
              data-ocid="door_detail.attachments.open_upload.button"
            >
              {isUploading ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5 mr-1.5" />
              )}
              {isUploading ? "Uploading..." : "Attach File"}
            </Button>
          </div>

          {/* Upload progress */}
          {isUploading && (
            <div
              className="mt-3 space-y-1"
              data-ocid="door_detail.attachments.loading_state"
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Uploading...</span>
                <span>{uploadProgress ?? 0}%</span>
              </div>
              <Progress value={uploadProgress ?? 0} className="h-1.5" />
            </div>
          )}
        </div>

        {/* Attachments list */}
        {attachmentsLoading ? (
          <div className="p-5 space-y-3">
            {[1, 2].map((n) => (
              <Skeleton key={n} className="h-12" />
            ))}
          </div>
        ) : sortedAttachments.length === 0 ? (
          <div
            className="px-5 py-10 text-center"
            data-ocid="door_detail.attachments.empty_state"
          >
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
              <Paperclip className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-sm text-foreground mb-1">
              No attachments yet
            </p>
            <p className="text-xs text-muted-foreground">
              Attach the Fire Door Certification Data Sheet or other supporting
              documents.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || !storageClient}
              data-ocid="door_detail.attachments.empty.upload_button"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Attach File
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sortedAttachments.map((attachment, idx) => (
              <div
                key={attachment.id.toString()}
                className="px-5 py-3.5 flex items-center gap-3 hover:bg-muted/30 transition-colors"
                data-ocid={`door_detail.attachments.item.${idx + 1}`}
              >
                <div className="w-8 h-8 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-[#1e3a5f]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {attachment.filename}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(attachment.uploadedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenAttachment(attachment)}
                    disabled={openingId === attachment.id}
                    data-ocid={`door_detail.attachments.open.button.${idx + 1}`}
                  >
                    {openingId === attachment.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ExternalLink className="w-3.5 h-3.5 mr-1" />
                    )}
                    {openingId === attachment.id ? "" : "Open"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDeleteAttachment(attachment)}
                    disabled={removeAttachment.isPending}
                    data-ocid={`door_detail.attachments.delete_button.${idx + 1}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Drop zone hint (visible when there are already attachments) */}
        {sortedAttachments.length > 0 && (
          <button
            type="button"
            className="mx-5 mb-4 mt-2 w-[calc(100%-2.5rem)] border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-[#1e3a5f]/40 hover:bg-[#1e3a5f]/5 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || !storageClient}
            data-ocid="door_detail.attachments.dropzone"
          >
            <Upload className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">
              Click to attach another file &mdash; PDF or image files accepted
            </p>
          </button>
        )}
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
                        &ldquo;{insp.notes}&rdquo;
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
