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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Camera, CheckCircle2, ChevronLeft, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { type Checklist, InspectionStatus } from "../backend";
import {
  useAddInspection,
  useAddInspectionPhotos,
  useGetAllDoors,
} from "../hooks/useQueries";
import { useStorageClient } from "../hooks/useStorageClient";
import type { LastInspectionInfo } from "../types";
import { CompanyInspectionWizard } from "./CompanyInspectionWizard";

type Page =
  | "dashboard"
  | "doors"
  | "door-detail"
  | "inspect"
  | "company-report";

interface InspectionFormProps {
  preselectedDoorId?: bigint | null;
  inspectorName?: string;
  onNavigate: (
    page: Page,
    doorId?: bigint,
    inspectionId?: bigint,
    companyName?: string,
  ) => void;
  lastInspectionMap?: Record<string, LastInspectionInfo | undefined>;
}

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

export function InspectionForm({
  preselectedDoorId,
  inspectorName = "",
  onNavigate,
  lastInspectionMap = {},
}: InspectionFormProps) {
  const { data: allDoors = [], isLoading } = useGetAllDoors();
  const doors = allDoors.filter((d) => d.active);
  const addInspection = useAddInspection();
  const addInspectionPhotos = useAddInspectionPhotos();
  const { data: storageClient } = useStorageClient();

  const [activeTab, setActiveTab] = useState<"single" | "company">("single");

  const [selectedDoorId, setSelectedDoorId] = useState<string>(
    preselectedDoorId ? preselectedDoorId.toString() : "",
  );
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
  const [submitted, setSubmitted] = useState(false);

  // Photo state
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (preselectedDoorId) setSelectedDoorId(preselectedDoorId.toString());
  }, [preselectedDoorId]);

  // Cleanup preview URLs on unmount
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

  const passedCount = Object.values(checklist).filter(Boolean).length;
  const totalCount = Object.keys(checklist).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoorId) {
      toast.error("Please select a door");
      return;
    }
    if (!inspector.trim()) {
      toast.error("Inspector name is required");
      return;
    }
    try {
      // Upload photos
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
      const selectedDoor = doors.find(
        (d) => d.id.toString() === selectedDoorId,
      );
      const inspectionId = await addInspection.mutateAsync({
        id: BigInt(0),
        doorId: BigInt(selectedDoorId),
        inspectorName: inspector.trim(),
        inspectionDate,
        createdAt: BigInt(Date.now()) * 1000000n,
        notes: notes.trim(),
        checklist,
        overallStatus,
        company: selectedDoor?.company ?? "",
      });
      if (photoHashes.length > 0) {
        await addInspectionPhotos.mutateAsync({
          inspectionId,
          hashes: photoHashes,
        });
      }
      toast.success("Inspection submitted successfully!");
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit inspection");
    }
  };

  const submittedDoor = submitted
    ? doors.find((d) => d.id.toString() === selectedDoorId)
    : null;

  const isSubmitting = uploadingPhotos || addInspection.isPending;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate("dashboard")}
          data-ocid="inspection.back.button"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <h1 className="text-xl font-bold">New Inspection</h1>
      </div>

      {/* Tab switcher */}
      <div className="flex border-b border-border mb-5">
        <button
          type="button"
          onClick={() => {
            setActiveTab("single");
            setSubmitted(false);
          }}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "single"
              ? "border-[#1e3a5f] text-[#1e3a5f]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          data-ocid="inspection.single_door.tab"
        >
          Single Door
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("company")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "company"
              ? "border-[#1e3a5f] text-[#1e3a5f]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          data-ocid="inspection.by_company.tab"
        >
          By Company
        </button>
      </div>

      {/* Company wizard */}
      {activeTab === "company" ? (
        <CompanyInspectionWizard
          doors={allDoors}
          lastInspectionMap={lastInspectionMap}
          inspectorName={inspector || inspectorName}
          onNavigate={onNavigate}
        />
      ) : submitted ? (
        /* Single-door success screen */
        <div
          className="bg-card rounded-[10px] shadow-card p-8 max-w-lg mx-auto text-center"
          data-ocid="inspection.success_state"
        >
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Inspection Submitted!</h2>
          <p className="text-muted-foreground mb-6">
            {submittedDoor
              ? `${submittedDoor.building}, ${submittedDoor.floor} — ${submittedDoor.location}`
              : ""}
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => onNavigate("dashboard")}
              data-ocid="inspection.back_dashboard.button"
            >
              Dashboard
            </Button>
            {submittedDoor && (
              <Button
                className="bg-fire-red hover:bg-fire-red-dark text-white"
                onClick={() => onNavigate("door-detail", submittedDoor.id)}
                data-ocid="inspection.view_door.button"
              >
                View Door
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* Single-door form */
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Door & Inspector */}
          <div className="bg-card rounded-[10px] shadow-card p-5 space-y-4">
            <h2 className="font-semibold">Inspection Details</h2>
            <div className="space-y-1.5">
              <Label>Door *</Label>
              {isLoading ? (
                <Skeleton className="h-10" />
              ) : (
                <Select
                  value={selectedDoorId}
                  onValueChange={setSelectedDoorId}
                >
                  <SelectTrigger data-ocid="inspection.door.select">
                    <SelectValue placeholder="Select a door..." />
                  </SelectTrigger>
                  <SelectContent>
                    {doors.map((d) => (
                      <SelectItem key={d.id.toString()} value={d.id.toString()}>
                        #{d.id.toString().padStart(3, "0")} — {d.building},{" "}
                        {d.floor} — {d.location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Inspector Name *</Label>
                <Input
                  value={inspector}
                  onChange={(e) => setInspector(e.target.value)}
                  placeholder="Your name"
                  data-ocid="inspection.inspector_name.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Inspection Date *</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  data-ocid="inspection.date.input"
                />
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div className="bg-card rounded-[10px] shadow-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Checklist</h2>
                <p className="text-sm text-muted-foreground">
                  {passedCount} / {totalCount} items passed
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toggleAll(true)}
                  data-ocid="inspection.check_all.button"
                >
                  All Pass
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toggleAll(false)}
                  data-ocid="inspection.uncheck_all.button"
                >
                  Clear
                </Button>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {(Object.keys(defaultChecklist) as Array<keyof Checklist>).map(
                (key, idx) => (
                  <div
                    key={key}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      checklist[key]
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50/50 border-red-100"
                    }`}
                    data-ocid={`inspection.checklist.item.${idx + 1}`}
                  >
                    <Label
                      htmlFor={`chk-${key}`}
                      className="cursor-pointer text-sm font-medium"
                    >
                      {checklistLabels[key]}
                    </Label>
                    <Switch
                      id={`chk-${key}`}
                      checked={checklist[key]}
                      onCheckedChange={(v) =>
                        setChecklist((prev) => ({ ...prev, [key]: v }))
                      }
                      data-ocid={`inspection.checklist.switch.${idx + 1}`}
                    />
                  </div>
                ),
              )}
            </div>
          </div>

          {/* Status & Notes */}
          <div className="bg-card rounded-[10px] shadow-card p-5 space-y-4">
            <h2 className="font-semibold">Overall Assessment</h2>
            <div className="space-y-1.5">
              <Label>Overall Status *</Label>
              <Select
                value={overallStatus}
                onValueChange={(v) => setOverallStatus(v as InspectionStatus)}
              >
                <SelectTrigger data-ocid="inspection.overall_status.select">
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
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any observations, defects found, or remediation required..."
                rows={4}
                data-ocid="inspection.notes.textarea"
              />
            </div>
          </div>

          {/* Photos */}
          <div
            className="bg-card rounded-[10px] shadow-card p-5 space-y-4"
            data-ocid="inspection.photos.panel"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Photos</h2>
                <p className="text-sm text-muted-foreground">
                  Capture or upload photos of the door during inspection
                </p>
              </div>
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
              data-ocid="inspection.photos.upload_button"
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
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white"
                onClick={() => photoInputRef.current?.click()}
              >
                <Camera className="w-4 h-4 mr-2" />
                Take Photo
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => galleryInputRef.current?.click()}
              >
                Choose from Gallery
              </Button>
            </div>

            {/* Photo thumbnails */}
            {photoPreviewUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {photoPreviewUrls.map((url, idx) => (
                  <div
                    key={url}
                    className="relative aspect-square rounded-lg overflow-hidden border border-border group"
                    data-ocid={`inspection.photos.item.${idx + 1}`}
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
                      data-ocid={`inspection.photos.delete_button.${idx + 1}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {photoFiles.length === 0 && (
              <div
                className="border-2 border-dashed border-border rounded-lg p-6 text-center text-muted-foreground text-sm"
                data-ocid="inspection.photos.dropzone"
              >
                <Camera className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No photos added yet</p>
                <p className="text-xs mt-0.5">
                  Tap "Take Photo" to use the camera or choose from your gallery
                </p>
              </div>
            )}

            {uploadingPhotos && (
              <div
                className="flex items-center gap-2 text-sm text-muted-foreground"
                data-ocid="inspection.photos.loading_state"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading {photoFiles.length} photo
                {photoFiles.length !== 1 ? "s" : ""}...
              </div>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-fire-red hover:bg-fire-red-dark text-white py-3 text-base font-semibold"
            disabled={isSubmitting}
            data-ocid="inspection.submit.primary_button"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {uploadingPhotos
              ? "Uploading Photos..."
              : addInspection.isPending
                ? "Submitting..."
                : "Submit Inspection"}
          </Button>
        </form>
      )}
    </div>
  );
}
