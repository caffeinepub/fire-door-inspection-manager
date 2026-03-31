import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Door,
  DoorId,
  Inspection,
  InspectionId,
  UserProfile,
} from "../backend";
import { useActor } from "./useActor";

// Attachment types (pending backend regeneration)
export type AttachmentId = bigint;
export interface DoorAttachment {
  id: AttachmentId;
  doorId: DoorId;
  filename: string;
  blobHash: string;
  uploadedAt: bigint;
}

export function useGetAllDoors() {
  const { actor } = useActor();
  return useQuery<Door[]>({
    queryKey: ["doors"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllDoors();
    },
    enabled: !!actor,
    refetchOnMount: "always",
  });
}

export function useGetDoorCount() {
  const { actor } = useActor();
  return useQuery<bigint>({
    queryKey: ["doorCount"],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      return actor.getDoorCount();
    },
    enabled: !!actor,
  });
}

export function useGetDoor(doorId: DoorId | null) {
  const { actor } = useActor();
  const query = useQuery<Door | null>({
    queryKey: ["door", doorId?.toString()],
    queryFn: async () => {
      if (!actor || doorId === null) return null;
      return actor.getDoor(doorId);
    },
    enabled: !!actor && doorId !== null,
  });
  return query;
}

export function useGetInspection(id: InspectionId | null) {
  const { actor } = useActor();
  const query = useQuery<Inspection | null>({
    queryKey: ["inspection", id?.toString()],
    queryFn: async () => {
      if (!actor || id === null) return null;
      return actor.getInspection(id);
    },
    enabled: !!actor && id !== null,
  });
  return query;
}

export function useGetInspectionsForDoor(doorId: DoorId | null) {
  const { actor } = useActor();
  const query = useQuery<Inspection[]>({
    queryKey: ["inspections", doorId?.toString()],
    queryFn: async () => {
      if (!actor || doorId === null) return [];
      return actor.getInspectionsForDoor(doorId);
    },
    enabled: !!actor && doorId !== null,
  });
  return {
    ...query,
    data: query.data ?? [],
  };
}

export function useGetCallerUserProfile() {
  const { actor } = useActor();
  const query = useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerUserProfile();
    },
    enabled: !!actor,
    retry: false,
  });
  return {
    ...query,
    isFetched: !!actor && query.isFetched,
  };
}

export function useIsCallerAdmin() {
  const { actor } = useActor();
  return useQuery<boolean>({
    queryKey: ["isAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor,
  });
}

export function useAddDoor() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (door: Door) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addDoor(door);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doors"] });
      qc.invalidateQueries({ queryKey: ["doorCount"] });
    },
  });
}

export function useEditDoor() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ doorId, door }: { doorId: DoorId; door: Door }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.editDoor(doorId, door);
    },
    onSuccess: (_, { doorId }) => {
      qc.invalidateQueries({ queryKey: ["doors"] });
      qc.invalidateQueries({ queryKey: ["door", doorId.toString()] });
    },
  });
}

export function useDeleteDoor() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (doorId: DoorId) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteDoor(doorId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doors"] });
      qc.invalidateQueries({ queryKey: ["doorCount"] });
    },
  });
}

export function useAddInspection() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (inspection: Inspection) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addInspection(inspection);
    },
    onSuccess: (_, inspection) => {
      qc.invalidateQueries({
        queryKey: ["inspections", inspection.doorId.toString()],
      });
      qc.invalidateQueries({ queryKey: ["doors"] });
    },
  });
}

export function useSaveProfile() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Actor not available");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

export function useGetPublicDoor(doorId: bigint | null) {
  const { actor } = useActor();
  const query = useQuery<Door | null>({
    queryKey: ["publicDoor", doorId?.toString()],
    queryFn: async () => {
      if (!actor || doorId === null) return null;
      return actor.getPublicDoor(doorId);
    },
    enabled: !!actor && doorId !== null,
  });
  return query;
}

export function useGetPublicInspectionsForDoor(doorId: bigint | null) {
  const { actor } = useActor();
  const query = useQuery<Inspection[]>({
    queryKey: ["publicInspections", doorId?.toString()],
    queryFn: async () => {
      if (!actor || doorId === null) return [];
      return actor.getPublicInspectionsForDoor(doorId);
    },
    enabled: !!actor && doorId !== null,
  });
  return {
    ...query,
    data: query.data ?? [],
  };
}

export function useGetDoorAttachments(doorId: DoorId | null) {
  const { actor } = useActor();
  return useQuery<DoorAttachment[]>({
    queryKey: ["doorAttachments", doorId?.toString()],
    queryFn: async () => {
      if (!actor || doorId === null) return [];
      return (actor as any).getDoorAttachments(doorId) as Promise<
        DoorAttachment[]
      >;
    },
    enabled: !!actor && doorId !== null,
  });
}

export function useAddDoorAttachment() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      doorId,
      filename,
      blobHash,
    }: {
      doorId: DoorId;
      filename: string;
      blobHash: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return (actor as any).addDoorAttachment(
        doorId,
        filename,
        blobHash,
      ) as Promise<AttachmentId>;
    },
    onSuccess: (_, { doorId }) => {
      qc.invalidateQueries({
        queryKey: ["doorAttachments", doorId.toString()],
      });
    },
  });
}

export function useRemoveDoorAttachment() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      doorId,
      attachmentId,
    }: {
      doorId: DoorId;
      attachmentId: AttachmentId;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return (actor as any).removeDoorAttachment(
        doorId,
        attachmentId,
      ) as Promise<void>;
    },
    onSuccess: (_, { doorId }) => {
      qc.invalidateQueries({
        queryKey: ["doorAttachments", doorId.toString()],
      });
    },
  });
}
