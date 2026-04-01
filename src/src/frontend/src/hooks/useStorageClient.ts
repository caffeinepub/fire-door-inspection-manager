import { HttpAgent } from "@icp-sdk/core/agent";
import { useQuery } from "@tanstack/react-query";
import { loadConfig } from "../config";
import { StorageClient } from "../utils/StorageClient";
import { useInternetIdentity } from "./useInternetIdentity";

export function useStorageClient() {
  const { identity } = useInternetIdentity();
  return useQuery({
    queryKey: [
      "storageClient",
      identity?.getPrincipal().toString() ?? "anonymous",
    ],
    queryFn: async () => {
      const config = await loadConfig();
      const agent = new HttpAgent({
        host: config.backend_host,
        identity: identity ?? undefined,
      });
      if (config.backend_host?.includes("localhost")) {
        await agent.fetchRootKey().catch(console.warn);
      }
      return new StorageClient(
        config.bucket_name,
        config.storage_gateway_url,
        config.backend_canister_id,
        config.project_id,
        agent,
      );
    },
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });
}
