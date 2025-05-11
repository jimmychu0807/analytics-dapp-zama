import { AnswerDialog } from "@/components/AnswerDialog";
import { QueryRequestsDialog } from "@/components/QueryRequestsDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { type QuestionSet, QuestionState } from "@/types";
import { analyticContract, formatDatetime, clientQuestionState } from "@/utils";
import { sendAnalyticTransaction } from "@/utils/chainInteractions";
import { showToastMessage } from "@/utils/toast";
import { useEffect, useState } from "react";
import { usePublicClient, useWalletClient } from "wagmi";

export function QuestionSetCard({ qId }: { qId: number }) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [questionSet, setQuestionSet] = useState<QuestionSet>();
  const [ansLen, setAnsLen] = useState<bigint>();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [hasAnswered, setHasAnswered] = useState<boolean>(false);

  const closeQuestion = async () => {
    if (!publicClient || !walletClient) return;

    try {
      const receipt = await sendAnalyticTransaction(publicClient, walletClient, "closeQuestion", [
        qId,
      ]);

      showToastMessage("success", { tx: receipt.transactionHash });
    } catch (err) {
      showToastMessage("failed", { message: (err as Error).message });
      console.error("Error on closeQuestion:", (err as Error).message);
    }
  };

  useEffect(() => {
    let isMounted = true;

    (async () => {
      if (!publicClient || !walletClient) return;

      const address = walletClient.account.address;
      const [_questionSet, _ansLen, _isAdmin, _hasAnswered] = await Promise.all([
        publicClient.readContract({
          ...analyticContract,
          functionName: "getQuestion",
          args: [qId],
        }),
        publicClient.readContract({
          ...analyticContract,
          functionName: "getAnsLen",
          args: [qId],
        }),
        publicClient.readContract({
          ...analyticContract,
          functionName: "questionAdmins",
          args: [qId, address],
        }),
        publicClient.readContract({
          ...analyticContract,
          functionName: "hasAnswered",
          args: [qId, address],
        }),
      ]);

      if (isMounted) {
        setQuestionSet(_questionSet as QuestionSet);
        setAnsLen(_ansLen as bigint);
        setIsAdmin(_isAdmin as boolean);
        setHasAnswered(_hasAnswered as boolean);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [publicClient, walletClient, qId]);

  if (!questionSet) return <div />;

  const cqs = clientQuestionState(questionSet);

  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>{questionSet.main.text}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-gray-600">
          isAdmin:&nbsp;
          <span className="text-gray-800 font-medium">{isAdmin ? "true" : "false"}</span>
        </div>
        <div className="text-sm text-gray-600">answer period:</div>
        <div className="text-sm text-gray-800 ml-4 font-medium">
          <span>{formatDatetime(Number(questionSet.startTime))}</span>
          <span> - </span>
          <span>{formatDatetime(Number(questionSet.endTime))}</span>
        </div>
        <div className="text-sm text-gray-500">
          state:&nbsp;
          <span className="text-gray-800 font-medium">{QuestionState[cqs]}</span>
        </div>
        <div className="text-sm text-gray-600">
          answers:&nbsp;
          <span className="text-gray-800 font-medium">{ansLen}</span>
          <span> / </span>
          <span className="text-gray-800 font-medium">{questionSet.queryThreshold}</span>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center justify-center gap-x-4">
        {!hasAnswered && cqs !== QuestionState.Closed && (
          <AnswerDialog qId={qId} questionSet={questionSet} />
        )}
        {isAdmin && questionSet.state !== QuestionState.Closed && (
          <Button variant="outline" onClick={closeQuestion}>
            Close
          </Button>
        )}
        {isAdmin && (
          <QueryRequestsDialog qId={qId} questionSet={questionSet} ansLen={ansLen ?? 0n} />
        )}
      </CardFooter>
    </Card>
  );
}
