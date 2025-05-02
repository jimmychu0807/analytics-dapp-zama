"use client";

import { NewQuestionDialog } from "@/components/NewQuestionDialog";
import { QuestionSetCard } from "@/components/QuestionSetCard";
import { WalletConnect } from "@/components/WalletConnect";
import { analyticContract, REQUIRED_CHAIN_ID } from "@/utils";
import { useReadContract } from "wagmi";

export default function Home() {
  const { data: nextQuestionId, isSuccess } = useReadContract({
    ...analyticContract,
    functionName: "nextQuestionId",
    query: { refetchInterval: 10000 },
  });

  return (
    <div className="flex flex-col items-center justify-center gap-8">
      <div>
        <WalletConnect requiredChainId={REQUIRED_CHAIN_ID} />
      </div>
      <div>
        <NewQuestionDialog />
      </div>
      {!isSuccess ? (
        <div>Loading...</div>
      ) : nextQuestionId === 0 ? (
        <div>No question. Create a question now 🙋</div>
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
