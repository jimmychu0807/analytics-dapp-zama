"use client";

import { NewQuestionDialog } from "@/components/NewQuestionDialog";
import { QuestionSetCard } from "@/components/QuestionSetCard";
import { WalletConnect } from "@/components/WalletConnect";
import { useListenEventsAndAct } from "@/contexts/ListenEventsAndActContext";
import { analyticContract, requiredChainId } from "@/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useReadContract } from "wagmi";

export default function Home() {
  const queryClient = useQueryClient();

  const {
    data: nextQuestionId,
    isSuccess,
    status,
    queryKey,
  } = useReadContract({
    ...analyticContract,
    functionName: "nextQuestionId",
  });

  const listenEventAndAct = useListenEventsAndAct();

  useEffect(() => {
    if (!listenEventAndAct || !queryClient || !queryKey) return;

    listenEventAndAct({
      eventName: "QuestionCreated",
      action: () => {
        queryClient.invalidateQueries({ queryKey });
      },
    });
  }, [listenEventAndAct, queryClient, queryKey]);

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center gap-8">
        Reading smart contract error.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-8">
      <div>
        <WalletConnect requiredChainId={requiredChainId} />
      </div>
      <div>
        <NewQuestionDialog />
      </div>
      {!isSuccess ? (
        <div className="self-center">Loading...</div>
      ) : nextQuestionId === BigInt(0) ? (
        <div className="self-center">No question. Create a question now 🙋</div>
      ) : (
        <div className="self-start px-6 flex gap-8 flex-wrap">
          {[...Array(Number(nextQuestionId)).keys()].map((qId) => (
            <QuestionSetCard key={`q-${qId}`} qId={qId} />
          ))}
        </div>
      )}
    </div>
  );
}
