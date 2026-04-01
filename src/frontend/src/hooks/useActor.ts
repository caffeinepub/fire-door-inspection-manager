import { useQuery } from "@tanstack/react-query";
import type { backendInterface } from "../backend";
import { createActorWithConfig } from "../config";
import { getSecretParameter } from "../utils/urlParams";
import { useInternetIdentity } from "./useInternetIdentity";

export function useActor() {
  const { identity } = useInternetIdentity();
  const actorQuery = useQuery<backendInterface>({
    queryKey: ["actor", identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!identity) {
        return await createActorWithConfig();
      }
      const actor = await createActorWithConfig({ agentOptions: { identity } });
      const adminToken = getSecretParameter("caffeineAdminToken") || "";
      await actor._initializeAccessControlWithSecret(adminToken);
      return actor;
    },
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    enabled: true,
  });

  return {
    actor: actorQuery.data || null,
    isFetching: actorQuery.isFetching,
  };
}
