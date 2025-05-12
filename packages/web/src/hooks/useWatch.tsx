import { analyticContract } from "@/utils";
import { type QueryKey, useQueryClient } from "@tanstack/react-query";
import { type Log } from "viem";
import { useWatchContractEvent } from "wagmi";

export function useWatchAndInvalidateQuery({
  eventName,
  queryKey,
}: {
  eventName: string;
  queryKey: QueryKey;
}) {
  const queryClient = useQueryClient();

  useWatchContractEvent({
    ...analyticContract,
    eventName,
    onLogs: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useWatchAndPerform({
  eventName,
  args,
  action,
}: {
  eventName: string;
  args?: Record<string, unknown>;
  action: (logs: Log[]) => void;
}) {
  useWatchContractEvent({
    ...analyticContract,
    eventName,
    args,
    onLogs: (logs: Log[]) => {
      action(logs);
    },
  });
}
