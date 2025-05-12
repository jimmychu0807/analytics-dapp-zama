import { NewQueryRequestDialog } from "@/components/NewQueryRequestDialog";
import { QueryResultDialog } from "@/components/QueryResultDialog";
import { Button } from "@/components/ui/button";
import { useWatchAndPerform } from "@/hooks";
import { type QuestionSet, RequestState, type QueryRequest } from "@/types";
import { analyticContract, querySteps } from "@/utils";
import { sendAnalyticTransaction } from "@/utils/chainInteractions";
import { showToastMessage } from "@/utils/toast";
import { Dialog, DialogPanel, DialogTitle, DialogBackdrop } from "@headlessui/react";
import { type MouseEvent, useState, useEffect } from "react";
import { usePublicClient, useWalletClient } from "wagmi";

export function QueryRequestsDialog({
  qId,
  questionSet,
  ansLen,
}: {
  qId: number;
  questionSet: QuestionSet;
  ansLen: bigint;
}) {
  const [isDialogOpen, setDialogOpen] = useState<boolean>(false);
  const [isLoading, setLoading] = useState<bigint>();
  const [queryRequestIds, setQueryRequestIds] = useState<bigint[]>([]);
  const [queryRequests, setQueryRequests] = useState<QueryRequest[]>([]);
  const [toRefetch, setToRefetch] = useState<boolean>(true);

  useWatchAndPerform({
    eventName: "QueryRequestCreated",
    action: (logs) => setToRefetch(true),
  });

  useWatchAndPerform({
    eventName: "QueryExecutionRunning",
    action: (logs) => setToRefetch(true),
  });

  useWatchAndPerform({
    eventName: "QueryExecutionCompleted",
    action: (logs) => setToRefetch(true),
  });

  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const processQueryRequest = async ({
    ev,
    qr,
  }: {
    ev: MouseEvent<HTMLElement>;
    qr: QueryRequest;
  }) => {
    ev.preventDefault();

    if (!publicClient || !walletClient) return;

    setLoading(qr.id);

    try {
      const receipt = await sendAnalyticTransaction(
        publicClient,
        walletClient,
        "executeQuery",
        [qr.id, querySteps],
        false,
      );

      showToastMessage("success", { tx: receipt.transactionHash });
    } catch (err) {
      showToastMessage("failed", { message: (err as Error).message });
      console.error("Error on processQueryRequest:", (err as Error).message);
    }
    setLoading(undefined);
  };

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!publicClient || !walletClient || !toRefetch) return;

      const { address } = walletClient.account;

      try {
        const _queryRequestIds = await publicClient.readContract({
          ...analyticContract,
          functionName: "getUserQueryRequestList",
          args: [address, qId],
        });

        if (isMounted) {
          setQueryRequestIds(_queryRequestIds as bigint[]);
          setToRefetch(false);
        }
      } catch (err) {
        console.error("getUserQueryRequestList error:", err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [publicClient, walletClient, qId, toRefetch]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!queryRequestIds || queryRequestIds.length === 0 || !publicClient) return;

      const _queryRequests = await Promise.all(
        queryRequestIds.map((id) =>
          publicClient.readContract({
            ...analyticContract,
            functionName: "getQueryRequest",
            args: [id as bigint],
          }),
        ),
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const processed = _queryRequests.map((qr: any, idx) => ({
        ...qr,
        id: queryRequestIds[idx],
      })) as QueryRequest[];

      if (isMounted) {
        setQueryRequests(processed);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [publicClient, walletClient, queryRequestIds]);

  return (
    <>
      <Button variant="outline" onClick={() => setDialogOpen(true)}>
        Query
      </Button>
      <Dialog
        transition
        open={isDialogOpen}
        onClose={() => setDialogOpen(false)}
        className="relative z-50 transition duration-300 ease-out data-closed:opacity-0"
      >
        <DialogBackdrop className="fixed inset-0 bg-black/30" />
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
          <DialogPanel className="flex flex-col items-center max-w-lg w-1/2 max-h-4/5 overflow-y-auto space-y-4 border bg-white p-6 rounded-lg shadow-xl">
            <DialogTitle className="font-bold text-center">Query Requests</DialogTitle>
            <NewQueryRequestDialog qId={qId} questionSet={questionSet} />

            <div className="flex flex-col w-full gap-4">
              {queryRequests.map((qr) => (
                <div key={`qr-${qr.id}`} className="flex flex-row justify-between">
                  <div className="self-center text-sm">
                    Request #{qr.id}:&nbsp;
                    <span className="text-gray-800 font-medium">
                      {qr.state !== RequestState.Completed
                        ? `${qr.accSteps} / ${ansLen.toString()}`
                        : RequestState[qr.state]}
                    </span>
                  </div>
                  {qr.state !== RequestState.Completed ? (
                    <Button
                      variant="outline"
                      className="min-w-22"
                      onClick={(ev: MouseEvent<HTMLElement>) => processQueryRequest({ ev, qr })}
                      isLoading={isLoading === qr.id}
                      disabled={isLoading !== undefined}
                    >
                      Process
                    </Button>
                  ) : (
                    <QueryResultDialog
                      questionSet={questionSet}
                      queryRequest={qr}
                      ansLen={ansLen}
                    />
                  )}
                </div>
              ))}
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
