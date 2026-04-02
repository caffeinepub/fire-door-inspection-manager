import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Building2,
  Camera,
  CheckCircle2,
  ChevronRight,
  FileText,
  Loader2,
  Printer,
  SkipForward,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { type Checklist, type Door, InspectionStatus } from "../backend";
import { useAddInspection, useAddInspectionPhotos } from "../hooks/useQueries";
import { useStorageClient } from "../hooks/useStorageClient";
import type { LastInspectionInfo } from "../types";

const defaultChecklist: Checklist = {
  frame: false,
  glazing: false,
  certificatePlate: false,
  doorCloser: false,
  threshold: false,
  signage: false,
  hinges: false,
  latch: false,
  seals: false,
  intumescentStrip: false,
  doorLeaf: false,
  noObstructions: false,
  selfClosing: false,
  visionPanel: false,
};

const checklistLabels: Record<keyof Checklist, string> = {
  frame: "Frame condition",
  glazing: "Glazing / Vision panels OK",
  certificatePlate: "Certificate plate present",
  doorCloser: "Door closer functioning",
  threshold: "Threshold condition",
  signage: "Signage correct",
  hinges: "Hinges secure & undamaged",
  latch: "Latch/lock functioning",
  seals: "Seals intact",
  intumescentStrip: "Intumescent strip present",
  doorLeaf: "Door leaf undamaged",
  noObstructions: "No obstructions",
  selfClosing: "Self-closing correctly",
  visionPanel: "Vision panel intact",
};

const fireRatingLabel: Record<string, string> = {
  thirtyMinutes: "30 min",
  sixtyMinutes: "60 min",
  ninetyMinutes: "90 min",
  oneHundredTwentyMinutes: "120 min",
};

type DoorOutcome = {
  door: Door;
  result: InspectionStatus | "skipped";
};

type Phase = "picker" | "wizard" | "summary";

interface CompanyInspectionWizardProps {
  doors: Door[];
  lastInspectionMap: Record<string, LastInspectionInfo | undefined>;
  inspectorName: string;
  onNavigate: (
    page: "dashboard" | "doors" | "door-detail" | "inspect" | "company-report",
    doorId?: bigint,
    inspectionId?: bigint,
    companyName?: string,
  ) => void;
}

export function CompanyInspectionWizard({
  doors,
  lastInspectionMap,
  inspectorName,
  onNavigate,
}: CompanyInspectionWizardProps) {
  const addInspection = useAddInspection();
  const addInspectionPhotos = useAddInspectionPhotos();
  const { data: storageClient } = useStorageClient();

  const [phase, setPhase] = useState<Phase>("picker");
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [currentDoorIndex, setCurrentDoorIndex] = useState(0);
  const [doorOutcomes, setDoorOutcomes] = useState<DoorOutcome[]>([]);

  // Per-door form state
  const [inspector, setInspector] = useState(inspectorName);
  const [date, setDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [checklist, setChecklist] = useState<Checklist>({
    ...defaultChecklist,
  });
  const [overallStatus, setOverallStatus] = useState<InspectionStatus>(
    InspectionStatus.pass,
  );
  const [notes, setNotes] = useState("");

  // Photo state (per door)
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Cleanup preview URLs when component unmounts
  useEffect(() => {
    return () => {
      for (const url of photoPreviewUrls) {
        URL.revokeObjectURL(url);
      }
    };
  }, [photoPreviewUrls]);

  const handlePhotosSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files);
    const newUrls = newFiles.map((f) => URL.createObjectURL(f));
    setPhotoFiles((prev) => [...prev, ...newFiles]);
    setPhotoPreviewUrls((prev) => [...prev, ...newUrls]);
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviewUrls[index]);
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const activeDoors = doors.filter((d) => d.active);
  const companies = Array.from(new Set(activeDoors.map((d) => d.company)))
    .filter(Boolean)
    .sort();

  const companyDoors = selectedCompany
    ? activeDoors
        .filter((d) => d.company === selectedCompany)
        .sort(
          (a, b) =>
            a.building.localeCompare(b.building) ||
            a.floor.localeCompare(b.floor) ||
            a.location.localeCompare(b.location),
        )
    : [];

  const currentDoor = companyDoors[currentDoorIndex] ?? null;
  const isLastDoor = currentDoorIndex === companyDoors.length - 1;
  const passedCount = Object.values(checklist).filter(Boolean).length;
  const totalCount = Object.keys(checklist).length;
  const progressPercent =
    companyDoors.length > 0
      ? Math.round((currentDoorIndex / companyDoors.length) * 100)
      : 0;

  const resetDoorForm = () => {
    setChecklist({ ...defaultChecklist });
    setOverallStatus(InspectionStatus.pass);
    setNotes("");
    // Reset photos
    for (const url of photoPreviewUrls) {
      URL.revokeObjectURL(url);
    }
    setPhotoFiles([]);
    setPhotoPreviewUrls([]);
  };

  const toggleAll = (val: boolean) => {
    setChecklist({
      frame: val,
      glazing: val,
      certificatePlate: val,
      doorCloser: val,
      threshold: val,
      signage: val,
      hinges: val,
      latch: val,
      seals: val,
      intumescentStrip: val,
      doorLeaf: val,
      noObstructions: val,
      selfClosing: val,
      visionPanel: val,
    });
  };

  const handleSelectCompany = (company: string) => {
    setSelectedCompany(company);
    setCurrentDoorIndex(0);
    setDoorOutcomes([]);
    resetDoorForm();
    setPhase("wizard");
  };

  const handleSkip = () => {
    if (!currentDoor) return;
    const outcome: DoorOutcome = { door: currentDoor, result: "skipped" };
    const next = [...doorOutcomes, outcome];
    setDoorOutcomes(next);
    if (isLastDoor) {
      setPhase("summary");
    } else {
      setCurrentDoorIndex((i) => i + 1);
      resetDoorForm();
    }
  };

  const handleSubmit = async () => {
    if (!currentDoor) return;
    if (!inspector.trim()) {
      toast.error("Inspector name is required");
      return;
    }
    try {
      // Upload photos first
      let photoHashes: string[] = [];
      if (photoFiles.length > 0) {
        if (!storageClient) {
          toast.error("Storage not ready, please try again");
          return;
        }
        setUploadingPhotos(true);
        try {
          const uploadResults = await Promise.all(
            photoFiles.map(async (file) => {
              const bytes = new Uint8Array(await file.arrayBuffer());
              const { hash } = await storageClient.putFile(bytes, () => {});
              return hash;
            }),
          );
          photoHashes = uploadResults;
        } finally {
          setUploadingPhotos(false);
        }
      }

      const inspectionDate = BigInt(new Date(date).getTime()) * 1000000n;
      const inspectionId = await addInspection.mutateAsync({
        id: BigInt(0),
        doorId: currentDoor.id,
        inspectorName: inspector.trim(),
        inspectionDate,
        createdAt: BigInt(Date.now()) * 1000000n,
        notes: notes.trim(),
        checklist,
        overallStatus,
        company: currentDoor.company,
      });
      if (photoHashes.length > 0) {
        await addInspectionPhotos.mutateAsync({
          inspectionId,
          hashes: photoHashes,
        });
      }
      toast.success(`Door ${currentDoorIndex + 1} inspection saved`);
      const outcome: DoorOutcome = { door: currentDoor, result: overallStatus };
      const next = [...doorOutcomes, outcome];
      setDoorOutcomes(next);
      if (isLastDoor) {
        setPhase("summary");
      } else {
        setCurrentDoorIndex((i) => i + 1);
        resetDoorForm();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to submit inspection");
    }
  };

  const isSubmitting = uploadingPhotos || addInspection.isPending;

  // ── Phase 0: Company picker ───────────────────────────────────────────
  if (phase === "picker") {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold">Select Company to Inspect</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Choose a company to step through all its active doors in one
            session.
          </p>
        </div>

        {companies.length === 0 ? (
          <div
            className="bg-card rounded-[10px] shadow-card p-10 text-center text-muted-foreground"
            data-ocid="company_wizard.empty_state"
          >
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No active doors found</p>
            <p className="text-sm mt-1">
              Add doors before running a company inspection.
            </p>
          </div>
        ) : (
          <div
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
            data-ocid="company_wizard.list"
          >
            {companies.map((company, idx) => {
              const compDoors = activeDoors.filter(
                (d) => d.company === company,
              );
              const passed = compDoors.filter(
                (d) =>
                  lastInspectionMap[d.id.toString()]?.status ===
                  InspectionStatus.pass,
              );
              const inspected = compDoors.filter(
                (d) => !!lastInspectionMap[d.id.toString()],
              );
              const passRate =
                compDoors.length > 0
                  ? Math.round((passed.length / compDoors.length) * 100)
                  : 0;

              return (
                <button
                  key={company}
                  type="button"
                  onClick={() => handleSelectCompany(company)}
                  className="bg-card rounded-[10px] shadow-card p-5 text-left hover:shadow-card-hover transition-shadow group border border-border"
                  data-ocid={`company_wizard.item.${idx + 1}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-[#1e3a5f]" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1 leading-snug">
                    {company}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    {compDoors.length} door{compDoors.length !== 1 ? "s" : ""}
                    {inspected.length > 0
                      ? ` · ${passRate}% pass rate`
                      : " · Not yet inspected"}
                  </p>
                  {/* Progress bar */}
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#1e3a5f] rounded-full transition-all"
                      style={{ width: `${passRate}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Phase: Summary ───────────────────────────────────────────────
  if (phase === "summary") {
    const passedDoors = doorOutcomes.filter(
      (o) => o.result === InspectionStatus.pass,
    );
    const failedDoors = doorOutcomes.filter(
      (o) => o.result === InspectionStatus.fail,
    );
    const actionDoors = doorOutcomes.filter(
      (o) => o.result === InspectionStatus.actionRequired,
    );
    const skippedDoors = doorOutcomes.filter((o) => o.result === "skipped");

    return (
      <div className="space-y-5" data-ocid="company_wizard.summary.panel">
        {/* Header */}
        <div className="bg-[#1e3a5f] text-white rounded-[10px] p-6">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-5 h-5 text-green-300" />
            <h2 className="text-lg font-bold">Company Inspection Complete</h2>
          </div>
          <p className="text-white/70 text-sm">{selectedCompany}</p>
        </div>

        {/* Count cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Passed",
              count: passedDoors.length,
              cls: "bg-green-50 border-green-200 text-green-700",
            },
            {
              label: "Failed",
              count: failedDoors.length,
              cls: "bg-red-50 border-red-200 text-red-700",
            },
            {
              label: "Action Req.",
              count: actionDoors.length,
              cls: "bg-amber-50 border-amber-200 text-amber-700",
            },
            {
              label: "Skipped",
              count: skippedDoors.length,
              cls: "bg-gray-50 border-gray-200 text-gray-500",
            },
          ].map(({ label, count, cls }) => (
            <div key={label} className={`rounded-[10px] border p-3 ${cls}`}>
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs font-medium">{label}</p>
            </div>
          ))}
        </div>

        {/* Results table */}
        <div
          className="bg-card rounded-[10px] shadow-card overflow-hidden"
          data-ocid="company_wizard.summary.table"
        >
          <Table>
            <TableHeader>
              <TableRow className="bg-[#1e3a5f] hover:bg-[#1e3a5f]">
                <TableHead className="text-white font-semibold">Door</TableHead>
                <TableHead className="text-white font-semibold">
                  Location
                </TableHead>
                <TableHead className="text-white font-semibold">
                  Result
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {doorOutcomes.map(({ door, result }, idx) => (
                <TableRow
                  key={door.id.toString()}
                  data-ocid={`company_wizard.summary.row.item.${idx + 1}`}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    #FD-{door.id.toString().padStart(3, "0")}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{door.building}</div>
                    <div className="text-xs text-muted-foreground">
                      {door.floor} — {door.location}
                    </div>
                  </TableCell>
                  <TableCell>
                    {result === "skipped" && (
                      <Badge
                        variant="secondary"
                        className="text-gray-500 bg-gray-100"
                      >
                        Skipped
                      </Badge>
                    )}
                    {result === InspectionStatus.pass && (
                      <Badge className="bg-green-100 text-green-700 border border-green-200 hover:bg-green-100">
                        Pass
                      </Badge>
                    )}
                    {result === InspectionStatus.fail && (
                      <Badge className="bg-red-100 text-red-700 border border-red-200 hover:bg-red-100">
                        Fail
                      </Badge>
                    )}
                    {result === InspectionStatus.actionRequired && (
                      <Badge className="bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-100">
                        Action Required
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button
            className="bg-[#1e3a5f] hover:bg-[#162d4e] text-white"
            onClick={() => onNavigate("dashboard")}
            data-ocid="company_wizard.summary.dashboard.button"
          >
            Back to Dashboard
          </Button>
          <Button
            variant="outline"
            onClick={() => window.print()}
            data-ocid="company_wizard.summary.print.button"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Summary
          </Button>
          <Button
            variant="outline"
            className="border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white"
            onClick={() =>
              onNavigate(
                "company-report",
                undefined,
                undefined,
                selectedCompany ?? "",
              )
            }
            data-ocid="company_wizard.summary.export_report.button"
          >
            <FileText className="w-4 h-4 mr-2" />
            Export Client Report
          </Button>
        </div>
      </div>
    );
  }

  // ── Phase: Wizard (door form) ─────────────────────────────────────────────
  if (!currentDoor) return null;

  return (
    <div className="space-y-4" data-ocid="company_wizard.wizard.panel">
      {/* Progress header */}
      <div className="bg-[#1e3a5f] text-white rounded-[10px] p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs text-white/60 font-medium uppercase tracking-wide">
              {selectedCompany}
            </p>
            <h2 className="text-base font-bold mt-0.5">
              Door {currentDoorIndex + 1} of {companyDoors.length}
            </h2>
          </div>
          <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-medium">
            {progressPercent}% complete
          </span>
        </div>
        <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Door details summary */}
      <div className="bg-card rounded-[10px] shadow-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="w-4 h-4 text-[#1e3a5f] flex-shrink-0" />
          <h3 className="font-semibold text-sm">
            #{currentDoor.id.toString().padStart(3, "0")} —{" "}
            {currentDoor.location}
          </h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
              Building
            </p>
            <p className="text-sm font-medium">{currentDoor.building}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
              Floor
            </p>
            <p className="text-sm font-medium">{currentDoor.floor}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
              Fire Rating
            </p>
            <p className="text-sm font-medium">
              {fireRatingLabel[currentDoor.fireRating] ??
                currentDoor.fireRating}
            </p>
          </div>
        </div>
      </div>

      {/* Inspector & date */}
      <div className="bg-card rounded-[10px] shadow-card p-4 space-y-3">
        <h3 className="font-semibold text-sm">Inspector Details</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Inspector Name *</Label>
            <Input
              value={inspector}
              onChange={(e) => setInspector(e.target.value)}
              placeholder="Your name"
              className="h-9 text-sm"
              data-ocid="company_wizard.inspector_name.input"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Date *</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-9 text-sm"
              data-ocid="company_wizard.date.input"
            />
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="bg-card rounded-[10px] shadow-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">Checklist</h3>
            <p className="text-xs text-muted-foreground">
              {passedCount} / {totalCount} passed
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => toggleAll(true)}
              data-ocid="company_wizard.check_all.button"
            >
              All Pass
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => toggleAll(false)}
              data-ocid="company_wizard.clear.button"
            >
              Clear
            </Button>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {(Object.keys(defaultChecklist) as Array<keyof Checklist>).map(
            (key, idx) => (
              <div
                key={key}
                className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                  checklist[key]
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50/50 border-red-100"
                }`}
                data-ocid={`company_wizard.checklist.item.${idx + 1}`}
              >
                <Label
                  htmlFor={`wiz-chk-${key}`}
                  className="cursor-pointer text-xs font-medium leading-snug"
                >
                  {checklistLabels[key]}
                </Label>
                <Switch
                  id={`wiz-chk-${key}`}
                  checked={checklist[key]}
                  onCheckedChange={(v) =>
                    setChecklist((prev) => ({ ...prev, [key]: v }))
                  }
                  data-ocid={`company_wizard.checklist.switch.${idx + 1}`}
                />
              </div>
            ),
          )}
        </div>
      </div>

      {/* Overall status & notes */}
      <div className="bg-card rounded-[10px] shadow-card p-4 space-y-3">
        <h3 className="font-semibold text-sm">Overall Assessment</h3>
        <div className="space-y-1.5">
          <Label className="text-xs">Overall Status *</Label>
          <Select
            value={overallStatus}
            onValueChange={(v) => setOverallStatus(v as InspectionStatus)}
          >
            <SelectTrigger
              className="h-9 text-sm"
              data-ocid="company_wizard.overall_status.select"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={InspectionStatus.pass}>✅ Pass</SelectItem>
              <SelectItem value={InspectionStatus.fail}>❌ Fail</SelectItem>
              <SelectItem value={InspectionStatus.actionRequired}>
                ⚠️ Action Required
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any observations, defects found, or remediation required..."
            rows={3}
            className="text-sm"
            data-ocid="company_wizard.notes.textarea"
          />
        </div>
      </div>

      {/* Photos */}
      <div
        className="bg-card rounded-[10px] shadow-card p-4 space-y-3"
        data-ocid="company_wizard.photos.panel"
      >
        <div>
          <h3 className="font-semibold text-sm">Photos</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Capture or upload photos of this door
          </p>
        </div>

        {/* Hidden file inputs */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => handlePhotosSelected(e.target.files)}
          data-ocid="company_wizard.photos.upload_button"
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handlePhotosSelected(e.target.files)}
        />

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white"
            onClick={() => photoInputRef.current?.click()}
          >
            <Camera className="w-4 h-4 mr-1.5" />
            Camera
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => galleryInputRef.current?.click()}
          >
            Gallery
          </Button>
        </div>

        {/* Thumbnails */}
        {photoPreviewUrls.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {photoPreviewUrls.map((url, idx) => (
              <div
                key={url}
                className="relative aspect-square rounded-lg overflow-hidden border border-border group"
                data-ocid={`company_wizard.photos.item.${idx + 1}`}
              >
                <img
                  src={url}
                  alt={`Door capture ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(idx)}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                  data-ocid={`company_wizard.photos.delete_button.${idx + 1}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {photoFiles.length === 0 && (
          <p
            className="text-xs text-muted-foreground italic text-center py-2"
            data-ocid="company_wizard.photos.empty_state"
          >
            No photos yet — tap Camera to take a photo
          </p>
        )}

        {uploadingPhotos && (
          <div
            className="flex items-center gap-2 text-xs text-muted-foreground"
            data-ocid="company_wizard.photos.loading_state"
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Uploading photos...
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 pb-4">
        <Button
          variant="outline"
          onClick={handleSkip}
          disabled={isSubmitting}
          className="flex-1"
          data-ocid="company_wizard.skip.button"
        >
          <SkipForward className="w-4 h-4 mr-2" />
          Skip
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-1 bg-[#1e3a5f] hover:bg-[#162d4e] text-white"
          data-ocid="company_wizard.submit.primary_button"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {uploadingPhotos
            ? "Uploading..."
            : isLastDoor
              ? "Submit & Finish"
              : "Submit & Next"}
        </Button>
      </div>
    </div>
  );
}
