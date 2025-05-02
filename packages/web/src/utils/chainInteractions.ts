import { analyticContract } from "@/utils";
import { type PublicClient, type TransactionReceipt, type WalletClient } from "viem";

export async function sendAnalyticTransaction(
  publicClient: PublicClient,
  walletClient: WalletClient,
  functionName: string,
  params: Array<unknown>,
): Promise<TransactionReceipt> {
  const { account } = walletClient;
  const { address, abi } = analyticContract;

  // simulate the tx to confirm it works first
  const { request } = await publicClient.simulateContract({
    account,
    address,
    abi,
    functionName,
    args: [...params],
  });
  const hash = await walletClient.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return receipt;
}
