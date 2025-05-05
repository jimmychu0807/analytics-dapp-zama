import { analyticContract } from "@/utils";
import { type FhevmInstance } from "fhevmjs/bundle";
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

export async function submitAnswerTx(
  publicClient: PublicClient,
  walletClient: WalletClient,
  fhevm: FhevmInstance,
  qId: number,
  ansObj: { ans: number; metaAns: Array<number> },
): Promise<TransactionReceipt> {
  const { account } = walletClient;
  if (!account) throw new Error("walletClient account does not exist");

  console.log("fhevm", fhevm);

  const input = fhevm.createEncryptedInput(analyticContract.address, account.address);

  console.log("completed encrypted input", input);

  const { ans, metaAns } = ansObj;
  const inputs = await metaAns.reduce((acc, ma) => acc.add32(ma), input.add32(ans)).encrypt();

  console.log("encrypted inputs:", inputs);

  const receipt = await sendAnalyticTransaction(publicClient, walletClient, "answer", [
    qId,
    inputs.handles[0],
    inputs.handles.slice(1),
    inputs.inputProof,
  ]);

  // CHECK: In sepolia network, we don't wait for decryption?
  // await awaitAllDecryptionResults();

  return receipt;
}
