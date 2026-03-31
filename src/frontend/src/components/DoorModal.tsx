import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Door } from "../backend";
import {
  DoorMaterial,
  DoorType,
  FireRating,
  FrameMaterial,
  LeafConfig,
} from "../backend";
import { useAddDoor, useEditDoor } from "../hooks/useQueries";

interface DoorModalProps {
  open: boolean;
  onClose: () => void;
  editDoor?: Door | null;
}

const defaultForm = {
  company: "",
  building: "",
  floor: "",
  location: "",
  dimensions: "",
  doorType: DoorType.single,
  doorMaterial: DoorMaterial.timber,
  frameMaterial: FrameMaterial.metal,
  fireRating: FireRating.sixtyMinutes,
  leafConfig: LeafConfig.singleLeaf,
  notes: "",
  active: true,
};

export function DoorModal({ open, onClose, editDoor }: DoorModalProps) {
  const [form, setForm] = useState(defaultForm);
  const addDoor = useAddDoor();
  const editDoorMutation = useEditDoor();

  // biome-ignore lint/correctness/useExhaustiveDependencies: open is used to reset form
  useEffect(() => {
    if (editDoor) {
      setForm({
        company: editDoor.company ?? "",
        building: editDoor.building,
        floor: editDoor.floor,
        location: editDoor.location,
        dimensions: editDoor.dimensions ?? "",
        doorType: editDoor.doorType,
        doorMaterial: editDoor.doorMaterial,
        frameMaterial: editDoor.frameMaterial,
        fireRating: editDoor.fireRating,
        leafConfig: editDoor.leafConfig,
        notes: editDoor.notes,
        active: editDoor.active,
      });
    } else {
      setForm(defaultForm);
    }
  }, [editDoor, open]);

  const isPending = addDoor.isPending || editDoorMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.building || !form.floor || !form.location) {
      toast.error("Building, floor, and location are required");
      return;
    }
    if (!form.company.trim()) {
      toast.error("Company is required");
      return;
    }
    try {
      if (editDoor) {
        await editDoorMutation.mutateAsync({
          doorId: editDoor.id,
          door: { ...editDoor, ...form },
        });
        toast.success("Door updated successfully");
      } else {
        await addDoor.mutateAsync({
          id: BigInt(0),
          createdAt: BigInt(Date.now()) * BigInt(1000000),
          ...form,
        });
        toast.success("Door added successfully");
      }
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to save door");
    }
  };

  const field = (key: keyof typeof form, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
        data-ocid="door_modal.dialog"
      >
        <DialogHeader>
          <DialogTitle>{editDoor ? "Edit Door" : "Add New Door"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Company *</Label>
            <Input
              value={form.company}
              onChange={(e) => field("company", e.target.value)}
              placeholder="e.g. Acme Property Management"
              data-ocid="door_modal.company.input"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Building *</Label>
              <Input
                value={form.building}
                onChange={(e) => field("building", e.target.value)}
                placeholder="e.g. Block A"
                data-ocid="door_modal.building.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Floor *</Label>
              <Input
                value={form.floor}
                onChange={(e) => field("floor", e.target.value)}
                placeholder="e.g. Ground"
                data-ocid="door_modal.floor.input"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Location / Description *</Label>
            <Input
              value={form.location}
              onChange={(e) => field("location", e.target.value)}
              placeholder="e.g. Main entrance, Stairwell A"
              data-ocid="door_modal.location.input"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Dimensions</Label>
            <Input
              value={form.dimensions}
              onChange={(e) => field("dimensions", e.target.value)}
              placeholder="e.g. 900mm x 2100mm"
              data-ocid="door_modal.dimensions.input"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Door Type</Label>
              <Select
                value={form.doorType}
                onValueChange={(v) => field("doorType", v as DoorType)}
              >
                <SelectTrigger data-ocid="door_modal.door_type.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DoorType.single}>Single</SelectItem>
                  <SelectItem value={DoorType.double_}>Double</SelectItem>
                  <SelectItem value={DoorType.hinged}>Hinged</SelectItem>
                  <SelectItem value={DoorType.sliding}>Sliding</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Leaf Config</Label>
              <Select
                value={form.leafConfig}
                onValueChange={(v) => field("leafConfig", v as LeafConfig)}
              >
                <SelectTrigger data-ocid="door_modal.leaf_config.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={LeafConfig.singleLeaf}>
                    Single Leaf
                  </SelectItem>
                  <SelectItem value={LeafConfig.doubleLeaf}>
                    Double Leaf
                  </SelectItem>
                  <SelectItem value={LeafConfig.astragalBar}>
                    Astragal Bar
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Door Material</Label>
              <Select
                value={form.doorMaterial}
                onValueChange={(v) => field("doorMaterial", v as DoorMaterial)}
              >
                <SelectTrigger data-ocid="door_modal.door_material.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(DoorMaterial).map((m) => (
                    <SelectItem key={m} value={m}>
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Frame Material</Label>
              <Select
                value={form.frameMaterial}
                onValueChange={(v) =>
                  field("frameMaterial", v as FrameMaterial)
                }
              >
                <SelectTrigger data-ocid="door_modal.frame_material.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(FrameMaterial).map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Fire Rating</Label>
            <Select
              value={form.fireRating}
              onValueChange={(v) => field("fireRating", v as FireRating)}
            >
              <SelectTrigger data-ocid="door_modal.fire_rating.select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={FireRating.thirtyMinutes}>
                  30 Minutes
                </SelectItem>
                <SelectItem value={FireRating.sixtyMinutes}>
                  60 Minutes
                </SelectItem>
                <SelectItem value={FireRating.ninetyMinutes}>
                  90 Minutes
                </SelectItem>
                <SelectItem value={FireRating.oneHundredTwentyMinutes}>
                  120 Minutes
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => field("notes", e.target.value)}
              placeholder="Any additional notes..."
              rows={3}
              data-ocid="door_modal.notes.textarea"
            />
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={form.active}
              onCheckedChange={(v) => field("active", v)}
              data-ocid="door_modal.active.switch"
            />
            <Label>Active</Label>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-ocid="door_modal.cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#1e3a5f] hover:bg-[#162d4a] text-white"
              disabled={isPending}
              data-ocid="door_modal.submit_button"
            >
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editDoor ? "Save Changes" : "Add Door"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
