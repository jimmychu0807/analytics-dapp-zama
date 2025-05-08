import { Button } from "@/components/ui/button";
import { useFhevm } from "@/contexts/FhevmContext";
import { type QuestionSet, type QueryResult, type QueryRequest, QuestionType } from "@/types";
import { formatPercent, formatNumber } from "@/utils";
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
                <div className="text-sm text-gray-400 font-medium">Question</div>
                <div className="text-base text-gray-800 font-semibold">{questionSet.main.text}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400 font-medium">Predicates</div>
                {queryRequest.predicates.length > 0 ? (
                  queryRequest.predicates.map((predicate, i) => (
                    <div key={`pred-${i}`} className="text-sm text-gray-800 font-semibold">
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
                    <div className="text-sm text-gray-400 font-medium">Result</div>
                    <div className="text-sm text-gray-800 font-medium">
                      {questionSet.main.t === QuestionType.Option ? (
                        questionSet.main.options.map((optText, idx) =>
                          <div key={`${optText}-${idx}`}>
                            <span className="w-24 inline-block">{optText}</span>
                            <span className="font-semibold">
                              {queryResult.acc[idx]} ({formatPercent(queryResult.acc[idx], queryResult.filteredAnsCount)})
                            </span>
                          </div>
                        )
                      ) : (
                        <>
                          <div>
                            <span className="w-16 inline-block">min</span>
                            <span className="font-semibold">{formatNumber(queryResult.acc[0])}</span>
                          </div>
                          <div>
                            <span className="w-16 inline-block">sum</span>
                            <span className="font-semibold">{formatNumber(queryResult.acc[1])}</span>
                          </div>
                          <div>
                            <span className="w-16 inline-block">mean</span>
                            <span className="font-semibold">{formatNumber((Number(queryResult.acc[1])/Number(queryResult.filteredAnsCount)))}</span>
                          </div>
                          <div>
                            <span className="w-16 inline-block">max</span>
                            <span className="font-semibold">{formatNumber(queryResult.acc[2])}</span>
                          </div>
                        </>
                      )}{" "}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 font-medium">
                      Answers that match predicates
                    </div>
                    <div className="text-sm text-gray-800 font-semibold">
                      {queryResult.filteredAnsCount} / {ansLen}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-400 font-medium">resolving...</div>
              )}
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
