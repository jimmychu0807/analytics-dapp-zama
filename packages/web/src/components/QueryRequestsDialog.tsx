import { NewQueryRequestDialog } from "@/components/NewQueryRequestDialog";
import { QueryResultDialog } from "@/components/QueryResultDialog";
import { Button } from "@/components/ui/button";
import { type QuestionSet, RequestState, type QueryRequest } from "@/types";
import { analyticContract, querySteps } from "@/utils";
import { sendAnalyticTransaction } from "@/utils/chainInteractions";
import { Dialog, DialogPanel, DialogTitle, DialogBackdrop } from "@headlessui/react";
import { type MouseEvent, useState, useEffect } from "react";
import { type Address } from "viem";
import { useAccount, useReadContract, usePublicClient, useWalletClient } from "wagmi";

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
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const [queryRequests, setQueryRequests] = useState<Array<QueryRequest>>([]);

  const {
    data: queryRequestIds,
    error,
    status,
  } = useReadContract({
    ...analyticContract,
    functionName: "getUserQueryRequestList",
    args: [address, qId],
  });

  if (status === "error") console.error("Read contract error:", error);

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
      const receipt = await sendAnalyticTransaction(publicClient, walletClient, "executeQuery", [
        qr.id,
        querySteps,
      ]);

      console.log("processQueryRequest", receipt);
    } catch (err) {
      console.error("Error on processQueryRequest:", (err as Error).message);
    }
    setLoading(undefined);
  };

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const castedReqIds = queryRequestIds as unknown as Array<bigint>;
      if (!castedReqIds || castedReqIds.length === 0 || !publicClient) return;

      const _queryRequests = (await Promise.all(
        castedReqIds.map((id) =>
          publicClient.readContract({
            ...analyticContract,
            functionName: "queryRequests",
            args: [id],
          }),
        ),
      )) as Array<[bigint, Address, bigint, number, number]>;

      const processed = _queryRequests.map((qr, idx) => ({
        id: castedReqIds[idx],
        qId: qr[0],
        accSteps: qr[3],
        state: Number(qr[4]),
      }));

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
                    <QueryResultDialog questionSet={questionSet} qrId={qr.id} ansLen={ansLen} />
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
