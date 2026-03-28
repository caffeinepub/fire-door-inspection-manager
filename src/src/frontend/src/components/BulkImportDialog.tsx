import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, CheckCircle2, Download, Upload } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import {
  DoorMaterial,
  DoorType,
  FireRating,
  FrameMaterial,
  LeafConfig,
} from "../backend";
import type { Door } from "../backend";
import { useAddDoor } from "../hooks/useQueries";

const TEMPLATE_CSV = `building,floor,location,door_type,door_material,frame_material,fire_rating,leaf_config,notes
Block A,Ground,Main Entrance,single,timber,metal,60,singleLeaf,
Block B,Level 1,Stairwell B,double,steel,metal,30,doubleLeaf,Needs signage check
`;

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "fire-doors-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function fuzzyFireRating(val: string): FireRating {
  const v = val.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (v.includes("30") || v === "thirtyminutes")
    return FireRating.thirtyMinutes;
  if (v.includes("90") || v === "ninetyminutes")
    return FireRating.ninetyMinutes;
  if (v.includes("120") || v === "onehundredtwentyminutes")
    return FireRating.oneHundredTwentyMinutes;
  return FireRating.sixtyMinutes;
}

function fuzzyDoorType(val: string): DoorType {
  const v = val.toLowerCase().trim();
  if (v.includes("double")) return DoorType.double_;
  if (v.includes("hinge") || v.includes("hinged")) return DoorType.hinged;
  if (v.includes("slide") || v.includes("sliding")) return DoorType.sliding;
  return DoorType.single;
}

function fuzzyDoorMaterial(val: string): DoorMaterial {
  const v = val.toLowerCase().trim();
  if (v.includes("alumin")) return DoorMaterial.aluminium;
  if (v.includes("hybrid")) return DoorMaterial.hybrid;
  if (v.includes("steel")) return DoorMaterial.steel;
  return DoorMaterial.timber;
}

function fuzzyFrameMaterial(val: string): FrameMaterial {
  const v = val.toLowerCase().trim();
  if (v.includes("timber") || v.includes("wood")) return FrameMaterial.timber;
  if (v.includes("upvc") || v.includes("pvc")) return FrameMaterial.uPVC;
  if (v.includes("hybrid")) return FrameMaterial.hybrid;
  return FrameMaterial.metal;
}

function fuzzyLeafConfig(val: string): LeafConfig {
  const v = val.toLowerCase().trim();
  if (v.includes("double")) return LeafConfig.doubleLeaf;
  if (v.includes("astragal") || v.includes("bar"))
    return LeafConfig.astragalBar;
  return LeafConfig.singleLeaf;
}

interface ParsedRow {
  rowKey: string;
  building: string;
  floor: string;
  location: string;
  doorType: DoorType;
  doorMaterial: DoorMaterial;
  frameMaterial: FrameMaterial;
  fireRating: FireRating;
  leafConfig: LeafConfig;
  notes: string;
  valid: boolean;
  errors: string[];
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const rawHeaders = lines[0].split(",").map((h) => h.trim().toLowerCase());

  const colMap: Record<string, number> = {};
  rawHeaders.forEach((h, i) => {
    colMap[h] = i;
  });

  const get = (row: string[], aliases: string[]): string => {
    for (const alias of aliases) {
      const idx = colMap[alias];
      if (idx !== undefined && row[idx] !== undefined) {
        return row[idx].trim();
      }
    }
    return "";
  };

  return lines
    .slice(1)
    .map((line, lineIdx) => {
      if (!line.trim()) return null;
      const row = line.split(",").map((c) => c.trim());
      const errors: string[] = [];

      const building = get(row, ["building"]);
      const floor = get(row, ["floor"]);
      const location = get(row, ["location"]);

      if (!building) errors.push("Missing building");
      if (!floor) errors.push("Missing floor");
      if (!location) errors.push("Missing location");

      const doorTypeRaw = get(row, ["door_type", "doortype"]);
      const doorMaterialRaw = get(row, ["door_material", "doormaterial"]);
      const frameMaterialRaw = get(row, ["frame_material", "framematerial"]);
      const fireRatingRaw = get(row, ["fire_rating", "firerating"]);
      const leafConfigRaw = get(row, ["leaf_config", "leafconfig"]);
      const notes = get(row, ["notes"]);

      return {
        rowKey: `row-${lineIdx}-${building}-${floor}-${location}`,
        building,
        floor,
        location,
        doorType: doorTypeRaw ? fuzzyDoorType(doorTypeRaw) : DoorType.single,
        doorMaterial: doorMaterialRaw
          ? fuzzyDoorMaterial(doorMaterialRaw)
          : DoorMaterial.timber,
        frameMaterial: frameMaterialRaw
          ? fuzzyFrameMaterial(frameMaterialRaw)
          : FrameMaterial.metal,
        fireRating: fireRatingRaw
          ? fuzzyFireRating(fireRatingRaw)
          : FireRating.sixtyMinutes,
        leafConfig: leafConfigRaw
          ? fuzzyLeafConfig(leafConfigRaw)
          : LeafConfig.singleLeaf,
        notes,
        valid: errors.length === 0,
        errors,
      };
    })
    .filter(Boolean) as ParsedRow[];
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function BulkImportDialog({ open, onClose }: Props) {
  const [step, setStep] = useState<"upload" | "preview">("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const [importTotal, setImportTotal] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addDoor = useAddDoor();

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a .csv file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        toast.error("No valid rows found in CSV");
        return;
      }
      setRows(parsed);
      setStep("preview");
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleImport = async () => {
    const validRows = rows.filter((r) => r.valid);
    setImportTotal(validRows.length);
    setImportProgress(0);

    let succeeded = 0;
    let failed = 0;
    for (let i = 0; i < validRows.length; i++) {
      const r = validRows[i];
      const door: Door = {
        id: BigInt(0),
        createdAt: BigInt(Date.now()) * BigInt(1000000),
        active: true,
        building: r.building,
        floor: r.floor,
        location: r.location,
        doorType: r.doorType,
        doorMaterial: r.doorMaterial,
        frameMaterial: r.frameMaterial,
        fireRating: r.fireRating,
        leafConfig: r.leafConfig,
        notes: r.notes,
        company: (r as any).company ?? "",
      };
      try {
        await addDoor.mutateAsync(door);
        succeeded++;
      } catch {
        failed++;
      }
      setImportProgress(i + 1);
    }

    if (failed === 0) {
      toast.success(
        `Successfully imported ${succeeded} door${succeeded !== 1 ? "s" : ""}`,
      );
    } else {
      toast.error(`Imported ${succeeded}, failed ${failed}`);
    }
    handleClose();
  };

  const handleClose = () => {
    setStep("upload");
    setRows([]);
    setImportProgress(null);
    setImportTotal(0);
    onClose();
  };

  const validCount = rows.filter((r) => r.valid).length;
  const invalidCount = rows.length - validCount;
  const isImporting = importProgress !== null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] flex flex-col"
        data-ocid="bulk_import.dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-fire-red" />
            {step === "upload" ? "Import Doors from CSV" : "Preview Import"}
          </DialogTitle>
          <DialogDescription>
            {step === "upload"
              ? "Upload a CSV file to bulk import fire doors."
              : `${rows.length} rows detected — ${validCount} valid, ${invalidCount} invalid.`}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4 py-2">
            <label
              htmlFor="csv-file-input"
              className={`block border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
                isDragging
                  ? "border-fire-red bg-fire-red/5"
                  : "border-border hover:border-fire-red/50 hover:bg-muted/30"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              data-ocid="bulk_import.dropzone"
            >
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium text-foreground">
                Drag &amp; drop a CSV file here
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                or click to browse
              </p>
              <input
                id="csv-file-input"
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
                data-ocid="bulk_import.upload_button"
              />
            </label>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                CSV must include:{" "}
                <code className="bg-muted px-1 py-0.5 rounded text-xs">
                  building
                </code>
                ,{" "}
                <code className="bg-muted px-1 py-0.5 rounded text-xs">
                  floor
                </code>
                ,{" "}
                <code className="bg-muted px-1 py-0.5 rounded text-xs">
                  location
                </code>
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadTemplate}
                className="gap-1.5"
                data-ocid="bulk_import.download_template.button"
              >
                <Download className="w-4 h-4" />
                Download template
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="flex-1 overflow-auto min-h-0 space-y-3">
            <div className="flex gap-3">
              <div className="flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="font-medium text-green-700">
                  {validCount} valid
                </span>
              </div>
              {invalidCount > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="font-medium text-red-600">
                    {invalidCount} invalid (will be skipped)
                  </span>
                </div>
              )}
            </div>

            <div
              className="rounded-lg border border-border overflow-auto max-h-72"
              data-ocid="bulk_import.preview.table"
            >
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs">Building</TableHead>
                    <TableHead className="text-xs">Floor</TableHead>
                    <TableHead className="text-xs">Location</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Rating</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, idx) => (
                    <TableRow
                      key={row.rowKey}
                      className={
                        row.valid ? "" : "bg-red-50 dark:bg-red-950/20"
                      }
                      data-ocid={`bulk_import.preview.item.${idx + 1}`}
                    >
                      <TableCell className="text-sm py-2">
                        {row.building || (
                          <span className="text-red-500 italic">missing</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm py-2">
                        {row.floor || (
                          <span className="text-red-500 italic">missing</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm py-2">
                        {row.location || (
                          <span className="text-red-500 italic">missing</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm py-2 capitalize">
                        {row.doorType}
                      </TableCell>
                      <TableCell className="text-sm py-2">
                        {row.fireRating === "thirtyMinutes"
                          ? "30 min"
                          : row.fireRating === "sixtyMinutes"
                            ? "60 min"
                            : row.fireRating === "ninetyMinutes"
                              ? "90 min"
                              : "120 min"}
                      </TableCell>
                      <TableCell className="text-sm py-2">
                        {row.valid ? (
                          <span className="inline-flex items-center gap-1 text-green-700 text-xs font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-600 text-xs font-medium">
                            <AlertCircle className="w-3.5 h-3.5" />{" "}
                            {row.errors.join(", ")}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {isImporting && (
          <div className="space-y-2 py-2" data-ocid="bulk_import.loading_state">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Importing doors…</span>
              <span className="font-medium">
                {importProgress} of {importTotal}
              </span>
            </div>
            <Progress
              value={(importProgress! / importTotal) * 100}
              className="h-2"
            />
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === "upload" ? (
            <Button
              variant="outline"
              onClick={handleClose}
              data-ocid="bulk_import.cancel_button"
            >
              Cancel
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setStep("upload");
                  setRows([]);
                }}
                disabled={isImporting}
                data-ocid="bulk_import.back_button"
              >
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={validCount === 0 || isImporting}
                className="bg-fire-red hover:bg-fire-red-dark text-white"
                data-ocid="bulk_import.import.primary_button"
              >
                {isImporting
                  ? `Importing ${importProgress} of ${importTotal}…`
                  : `Import ${validCount} door${validCount !== 1 ? "s" : ""}`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
