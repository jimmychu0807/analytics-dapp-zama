import { useEffect, useState } from "react";
import { usePublicClient, useWalletClient } from "wagmi";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { type QuestionSet, QuestionState } from "@/types";
import { analyticContract } from "@/utils";

export function QuestionSetCard({ qId }: { qId: number }) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [questionSet, setQuestionSet] = useState<QuestionSet>();
  const [ansLen, setAnsLen] = useState<bigint>();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      if (!publicClient || !walletClient) return;

      const address = walletClient.account.address;

      const [_questionSet, _ansLen, _isAdmin] = await Promise.all([
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
      ]);

      console.log("questionSet", _questionSet);

      if (isMounted) {
        setQuestionSet(_questionSet as QuestionSet);
        setAnsLen(_ansLen as bigint);
        setIsAdmin(_isAdmin as boolean);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [publicClient, walletClient, qId]);

  if (!questionSet) return <div />;

  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>{questionSet.main.text}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-gray-600">
          isAdmin: {isAdmin ? "true" : "false"}
        </div>
        <div className="text-sm text-gray-600">answer period:</div>
        <div className="text-sm text-gray-500">
          state:
          <span className="text-gray-800">
            {QuestionState[Number(questionSet.state)]}
          </span>
        </div>
        <div className="text-sm text-gray-600">
          answers: <strong>{ansLen}</strong> /{" "}
          <strong>{questionSet.queryThreshold}</strong>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">Answer</Button>
        <Button variant="outline">Close</Button>
        <Button variant="outline">Query</Button>
      </CardFooter>
    </Card>
  );
}
