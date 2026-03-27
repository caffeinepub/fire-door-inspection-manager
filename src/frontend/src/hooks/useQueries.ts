import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Door, DoorId, Inspection, UserProfile } from "../backend";
import { useActor } from "./useActor";

export function useGetAllDoors() {
  const { actor, isFetching } = useActor();
  return useQuery<Door[]>({
    queryKey: ["doors"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllDoors();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetDoorCount() {
  const { actor, isFetching } = useActor();
  return useQuery<bigint>({
    queryKey: ["doorCount"],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      return actor.getDoorCount();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetDoor(doorId: DoorId | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Door | null>({
    queryKey: ["door", doorId?.toString()],
    queryFn: async () => {
      if (!actor || doorId === null) return null;
      return actor.getDoor(doorId);
    },
    enabled: !!actor && !isFetching && doorId !== null,
  });
}

export function useGetInspectionsForDoor(doorId: DoorId | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Inspection[]>({
    queryKey: ["inspections", doorId?.toString()],
    queryFn: async () => {
      if (!actor || doorId === null) return [];
      return actor.getInspectionsForDoor(doorId);
    },
    enabled: !!actor && !isFetching && doorId !== null,
  });
}

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();
  const query = useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });
  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["isAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
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
