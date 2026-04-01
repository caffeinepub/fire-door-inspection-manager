import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import type { backendInterface } from "../backend";
import { createActorWithConfig } from "../config";
import { getSecretParameter } from "../utils/urlParams";
import { useInternetIdentity } from "./useInternetIdentity";

const ACTOR_QUERY_KEY = "actor";

// Module-level cache so the actor survives React Query GC
let _cachedActor: backendInterface | null = null;
let _cachedIdentityKey: string | null = null;

export function useActor() {
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const identityKey = identity?.getPrincipal().toString() ?? "anonymous";

  // Track the last identity key we invalidated queries for, so we only
  // invalidate when the user actually logs in/out — not on every background refetch.
  const lastInvalidatedIdentityKey = useRef<string | null>(null);

  const actorQuery = useQuery<backendInterface>({
    queryKey: [ACTOR_QUERY_KEY, identityKey],
    queryFn: async () => {
      // Reuse cached actor if identity hasn't changed
      if (_cachedIdentityKey === identityKey && _cachedActor) {
        return _cachedActor;
      }

      const isAuthenticated = !!identity;
      let actor: backendInterface;

      if (!isAuthenticated) {
        actor = await createActorWithConfig();
      } else {
        const actorOptions = { agentOptions: { identity } };
        actor = await createActorWithConfig(actorOptions);
        const adminToken = getSecretParameter("caffeineAdminToken") || "";
        await actor._initializeAccessControlWithSecret(adminToken);
      }

      _cachedActor = actor;
      _cachedIdentityKey = identityKey;
      return actor;
    },
    // Never consider stale, never garbage collect
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    enabled: true,
    // Use module-level cache as initial data when identity matches
    initialData:
      _cachedIdentityKey === identityKey && _cachedActor
        ? _cachedActor
        : undefined,
  });

  // Only invalidate/refetch other queries when the identity actually changes
  // (i.e. user logs in or logs out). Ignore background refetches that return
  // the same cached actor — they were the source of the recurring buffering.
  useEffect(() => {
    if (actorQuery.data && lastInvalidatedIdentityKey.current !== identityKey) {
      lastInvalidatedIdentityKey.current = identityKey;
      queryClient.invalidateQueries({
        predicate: (query) => !query.queryKey.includes(ACTOR_QUERY_KEY),
      });
      queryClient.refetchQueries({
        predicate: (query) => !query.queryKey.includes(ACTOR_QUERY_KEY),
      });
    }
  }, [actorQuery.data, identityKey, queryClient]);

  // Prefer live query data, fall back to module-level cache
  const actor =
    actorQuery.data ??
    (_cachedIdentityKey === identityKey ? _cachedActor : null);

  // Only report fetching (for spinner purposes) when we truly have no actor at all
  const isFetching = actorQuery.isFetching && !actor;

  return { actor, isFetching };
}
