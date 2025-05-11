import { QueryResult } from "@/types";
import { analyticContract } from "@/utils";
import { type MockedFhevmInstance } from "@/utils/fhevmjsMocked";
import { reencryptEuint32 } from "@/utils/reencrypt";
import { type FhevmInstance } from "fhevmjs/web";
import {
  toHex,
  type Account,
  type PublicClient,
  type TransactionReceipt,
  type WalletClient,
} from "viem";
import { type UseConfigReturnType } from "wagmi";

export async function sendAnalyticTransaction(
  publicClient: PublicClient,
  walletClient: WalletClient,
  functionName: string,
  params: Array<unknown>,
  bSimulate: boolean = true,
): Promise<TransactionReceipt> {
  const { account } = walletClient;
  const { address, abi } = analyticContract;

  let hash = undefined;
  // simulate the tx to confirm it works first
  if (bSimulate) {
    const { request } = await publicClient.simulateContract({
      account,
      address,
      abi,
      functionName,
      args: [...params],
    });

    hash = await walletClient.writeContract(request);
  } else {
    hash = await walletClient.writeContract({
      account: account as Account,
      address,
      abi,
      functionName,
      args: [...params],
      chain: null,
    });
  }

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return receipt;
}

export async function submitAnswerTx(
  publicClient: PublicClient,
  walletClient: WalletClient,
  fhevm: FhevmInstance | MockedFhevmInstance,
  qId: number,
  ansObj: { ans: number; metaAns: Array<number> },
): Promise<TransactionReceipt> {
  const { account } = walletClient;
  if (!account) throw new Error("walletClient account does not exist");

  const input = fhevm.createEncryptedInput(analyticContract.address, account.address);
  const { ans, metaAns } = ansObj;
  const inputs = await metaAns.reduce((acc, ma) => acc.add32(ma), input.add32(ans)).encrypt();

  // converting to hex string
  const inputHexStr = {
    handles: inputs.handles.map((h) => toHex(h)),
    inputProof: toHex(inputs.inputProof),
  };

  const receipt = await sendAnalyticTransaction(publicClient, walletClient, "answer", [
    qId,
    inputHexStr.handles[0],
    inputHexStr.handles.slice(1),
    inputHexStr.inputProof,
  ]);

  // CHECK: In sepolia network, should we wait for decryption?
  // await awaitAllDecryptionResults();

  return receipt;
}

export async function getAndClearQueryResult(
  publicClient: PublicClient,
  walletClient: WalletClient,
  fhevm: FhevmInstance | MockedFhevmInstance,
  config: UseConfigReturnType,
  qrId: bigint,
) {
  const { account } = walletClient;

  if (!account) return;

  const queryResult = (await publicClient.readContract({
    ...analyticContract,
    functionName: "getQueryResult",
    args: [qrId],
    account,
  })) as QueryResult;

  const clearAcc = await Promise.all(
    queryResult.acc.map((handle) =>
      reencryptEuint32(config, account, fhevm, handle, analyticContract.address),
    ),
  );

  const clearFilteredAnsCount = await reencryptEuint32(
    config,
    account,
    fhevm,
    queryResult.filteredAnsCount,
    analyticContract.address,
  );

  return {
    acc: clearAcc,
    filteredAnsCount: clearFilteredAnsCount,
    ttlAnsCount: queryResult.ttlAnsCount,
  };
}
