import { analyticContract } from "@/utils";
import { type ReactNode, createContext, useContext, useState, useCallback } from "react";
import { type Log } from "viem";
import { useWatchContractEvent } from "wagmi";

type EventAction = {
  eventName: string;
  args?: Record<string, unknown>;
  action: () => void;
};

const Context = createContext<((ea: EventAction) => void) | undefined>(undefined);
const listenedEvents = [
  "QuestionCreated",
  "ConfirmAnswer",
  "QuestionClosed",
  "QueryRequestCreated",
  "QueryExecutionRunning",
  "QueryExecutionCompleted",
] as const;

export function ListenEventsAndActProvider({ children }: { children: ReactNode }) {
  const [eventActions, setEventActions] = useState<Array<EventAction>>([]);

  const listenEventAndAct = useCallback(
    ({
      eventName,
      args,
      action,
    }: {
      eventName: string;
      args?: Record<string, unknown>;
      action: () => void;
    }) => {
      setEventActions((ea) => [...ea, { eventName, args, action }]);
    },
    [setEventActions],
  );

  // note: We listen to all events listed above and thus using a loop here
  for (const eventName of listenedEvents) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useWatchContractEvent({
      ...analyticContract,
      eventName,
      onLogs: (logs: Log[]) => {
        eventActions
          .filter((ea) => ea.eventName === eventName && (!ea.args || includeArgs(logs, ea.args)))
          .forEach((ea) => ea.action());
      },
    });
  }

  return <Context.Provider value={listenEventAndAct}>{children}</Context.Provider>;
}

export function useListenEventsAndAct() {
  return useContext(Context);
}

function includeArgs(logs: Log[], args: Record<string, unknown>): boolean {
  for (const log of logs as (Log & { args: Record<string, unknown> })[]) {
    let matched = true;

    for (const [key, val] of Object.entries(args)) {
      if (log.args[key] !== val) matched = false;
    }
    if (matched) return true;
  }
  return false;
}
