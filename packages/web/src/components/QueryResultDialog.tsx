import { Button } from "@/components/ui/button";
import { useFhevm } from "@/contexts/FhevmContext";
import { type QuestionSet, type QueryResult, type QueryRequest, QuestionType } from "@/types";
import { formatPercent } from "@/utils";
import { getAndClearQueryResult } from "@/utils/chainInteractions";
import { Dialog, DialogPanel, DialogTitle, DialogBackdrop } from "@headlessui/react";
import { useState } from "react";
import { usePublicClient, useWalletClient, useConfig } from "wagmi";

export function QueryResultDialog({
  questionSet,
  queryRequest,
  ansLen,
}: {
  questionSet: QuestionSet;
  queryRequest: QueryRequest;
  ansLen: bigint;
}) {
  const [isDialogOpen, setDialogOpen] = useState<boolean>(false);
  const [queryResult, setQueryResult] = useState<QueryResult>();
  const fhevm = useFhevm();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const config = useConfig();

  const compareActions = ["==", "!=", ">", "<"];

  const openQueryResultDialog = async () => {
    setDialogOpen(true);

    if (!fhevm || !publicClient || !walletClient) return;

    const clearQueryResult = await getAndClearQueryResult(
      publicClient,
      walletClient,
      fhevm,
      config,
      queryRequest.id,
    );
    setQueryResult(clearQueryResult);
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
                <div className="text-base text-gray-800 font-semibold">{questionSet.main.text}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400 font-semibold">Predicates</div>
                {queryRequest.predicates.length > 0 ? (
                  queryRequest.predicates.map((predicate, i) => (
                    <div key={`pred-${i}`}>
                      <span>{questionSet.metas[predicate.metaOpt].text}</span>&nbsp;
                      <span>{compareActions[predicate.op]}</span>&nbsp;
                      <span>
                        {questionSet.metas[predicate.metaOpt].t === QuestionType.Option
                          ? questionSet.metas[predicate.metaOpt].options[predicate.metaVal]
                          : predicate.metaVal}{" "}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-800 font-semibold">No predicate</div>
                )}
              </div>
              {queryResult ? (
                <>
                  <div>
                    <div className="text-sm text-gray-400 font-semibold">Result</div>
                    <div>
                      {questionSet.main.t === QuestionType.Option ? (
                        questionSet.main.options.map((optText, idx) =>
                          <div key={`${optText}-${idx}`}>
                            {optText}: {queryResult.acc[idx]} (
                            {formatPercent(queryResult.acc[idx], queryResult.filteredAnsCount)})
                          </div>
                        )
                      ) : (
                        <>
                          <div>min: {queryResult.acc[0]}</div>
                          <div>sum: {queryResult.acc[1]}</div>
                          <div>mean:&nbsp;
                            {(Number(queryResult.acc[1])/Number(queryResult.filteredAnsCount)).toFixed(2)}
                          </div>
                          <div>max: {queryResult.acc[2]}</div>
                        </>
                      )}{" "}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 font-semibold">
                      Answers that match predicates
                    </div>
                    <div className="text-sm text-gray-800 font-semibold">
                      {queryResult.filteredAnsCount} / {ansLen}
                    </div>
                  </div>
                </>
              ) : (
                <div>resolving...</div>
              )}
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
