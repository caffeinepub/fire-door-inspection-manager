import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { backendInterface } from "../backend";
import { createActorWithConfig } from "../config";
import { getSecretParameter } from "../utils/urlParams";
import { useInternetIdentity } from "./useInternetIdentity";

// Module-level cache so the actor is never lost between renders
let cachedActor: backendInterface | null = null;
let cachedPrincipal: string | null = null;

export function useActor() {
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const principal = identity?.getPrincipal().toString() ?? null;
  const [actor, setActor] = useState<backendInterface | null>(cachedActor);
  const [isFetching, setIsFetching] = useState(cachedActor === null);
  const creatingRef = useRef(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: identity and queryClient.invalidateQueries are intentionally omitted; principal is the correct trigger
  useEffect(() => {
    // Skip if we already have the right actor
    if (cachedPrincipal === principal && cachedActor !== null) {
      setActor(cachedActor);
      setIsFetching(false);
      return;
    }
    if (creatingRef.current) return;
    creatingRef.current = true;
    setIsFetching(cachedActor === null); // only show spinner if no actor at all

    const create = async () => {
      try {
        let newActor: backendInterface;
        if (!identity) {
          newActor = await createActorWithConfig();
        } else {
          newActor = await createActorWithConfig({
            agentOptions: { identity },
          });
          const adminToken = getSecretParameter("caffeineAdminToken") || "";
          await newActor._initializeAccessControlWithSecret(adminToken);
        }
        cachedActor = newActor;
        cachedPrincipal = principal;
        setActor(newActor);
        setIsFetching(false);
        // Invalidate all data queries so they reload with the new actor
        queryClient.invalidateQueries({
          predicate: (q) => !q.queryKey.includes("actor"),
        });
      } catch (e) {
        console.error("Failed to create actor", e);
        setIsFetching(false);
      } finally {
        creatingRef.current = false;
      }
    };

    create();
  }, [principal]);

  return { actor, isFetching };
}
