import {
  type PublicClient,
  type TransactionReceipt,
  type WalletClient,
} from "viem";

import { type QuestionSpec } from "@/types";
import { AnalyticContract } from "@/utils";

export async function submitNewQuestionTx(
  publicClient: PublicClient,
  walletClient: WalletClient,
  qObj: {
    main: QuestionSpec;
    metas: QuestionSpec[];
    startTime: number;
    endTime: number;
    queryThreshold: number;
  }
): Promise<TransactionReceipt> {
  // simulate the tx to confirm it works first
  const { account } = walletClient;
  const { address, abi } = AnalyticContract;
  const { main, metas, startTime, endTime, queryThreshold } = qObj;

  const { request } = await publicClient.simulateContract({
    account,
    address,
    abi,
    functionName: "newQuestion",
    args: [main, metas, startTime, endTime, queryThreshold],
  });
  const hash = await walletClient.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return receipt;
}
