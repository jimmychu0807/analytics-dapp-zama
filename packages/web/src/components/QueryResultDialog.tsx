import { Button } from "@/components/ui/button";
import { useFhevm } from "@/contexts/FhevmContext";
import { type QuestionSet, RequestState, type QueryRequest } from "@/types";
import { getAndClearQueryResult } from "@/utils/chainInteractions";
import { Dialog, DialogPanel, DialogTitle, DialogBackdrop } from "@headlessui/react";
import { type MouseEvent, useState, useEffect } from "react";
import { usePublicClient, useWalletClient, useConfig } from "wagmi";

export function QueryResultDialog({
  qId,
  questionSet,
  qrId,
}: {
  qId: number;
  questionSet: QuestionSet;
  qrId: bigint;
}) {
  const [isDialogOpen, setDialogOpen] = useState<boolean>(false);
  const fhevm = useFhevm();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const config = useConfig();

  const openQueryResultDialog = async () => {
    setDialogOpen(true);

    if (!fhevm || !publicClient || !walletClient) return;

    const queryResult = getAndClearQueryResult(publicClient, walletClient, fhevm, config, qrId);
  };

  return (
    <>
      <Button variant="outline" className="min-w-22" onClick={openQueryResultDialog}>
        View
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
            <DialogTitle className="font-bold text-center">Query Result</DialogTitle>
            <div className="flex flex-col w-full gap-4">
              <div>
                <div className="text-sm text-gray-400 font-semibold">Question</div>
                <div>{questionSet.main.text}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400 font-semibold">Predicates</div>
              </div>
              <div>
                <div className="text-sm text-gray-400 font-semibold">Result</div>
              </div>
              <div>
                <div className="text-sm text-gray-400 font-semibold">
                  Answers that match predicates
                </div>
                <div>
                  {`x`} / {`y`}
                </div>
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
