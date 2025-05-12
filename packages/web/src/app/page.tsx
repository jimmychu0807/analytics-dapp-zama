"use client";

import { NewQuestionDialog } from "@/components/NewQuestionDialog";
import { QuestionSetCard } from "@/components/QuestionSetCard";
import { WalletConnect } from "@/components/WalletConnect";
import { useWatchAndInvalidateQuery } from "@/hooks";
import { analyticContract, requiredChainId } from "@/utils";
import { useReadContract } from "wagmi";

export default function Home() {
  const {
    data: nextQuestionId,
    isSuccess,
    error,
    status,
    queryKey,
  } = useReadContract({
    ...analyticContract,
    functionName: "nextQuestionId",
  });

  useWatchAndInvalidateQuery({ eventName: "QuestionCreated", queryKey });

  if (status === "error") console.error("Read contract error:", error);

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
