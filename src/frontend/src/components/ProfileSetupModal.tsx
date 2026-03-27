import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Flame } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import { useSaveProfile } from "../hooks/useQueries";

interface ProfileSetupModalProps {
  open: boolean;
}

export function ProfileSetupModal({ open }: ProfileSetupModalProps) {
  const [name, setName] = useState("");
  const { mutateAsync, isPending } = useSaveProfile();
  const { actor } = useActor();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      if (actor) {
        await actor._initializeAccessControlWithSecret("");
      }
      await mutateAsync({ name: name.trim() });
    } catch (err: any) {
      toast.error(err.message || "Failed to set up profile");
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" data-ocid="profile_setup.dialog">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-lg bg-[#1e3a5f] flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <DialogTitle className="text-xl">
              Welcome to Fire Door Inspector
            </DialogTitle>
          </div>
          <DialogDescription>
            Please enter your name to get started. This will appear on
            inspection reports.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="inspector-name">Your Name</Label>
            <Input
              id="inspector-name"
              placeholder="e.g. John Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-ocid="profile_setup.input"
              autoFocus
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-[#1e3a5f] hover:bg-[#162d4a] text-white"
            disabled={!name.trim() || isPending}
            data-ocid="profile_setup.submit_button"
          >
            {isPending ? "Saving..." : "Get Started"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
