import { type Account } from "viem";
import { type FhevmInstance } from "fhevmjs/web";
import { signTypedData } from "@wagmi/core";
import { type UseConfigReturnType } from 'wagmi';

const EBOOL_T = 0;
const EUINT4_T = 1;
const EUINT8_T = 2;
const EUINT16_T = 3;
const EUINT32_T = 4;
const EUINT64_T = 5;
const EUINT128_T = 6;
const EUINT160_T = 7; // @dev It is the one for eaddresses.
const EUINT256_T = 8;
const EBYTES64_T = 9;
const EBYTES128_T = 10;
const EBYTES256_T = 11;

export function verifyType(handle: bigint, expectedType: number) {
  if (handle === 0n) {
    throw "Handle is not initialized";
  }

  if (handle.toString(2).length > 256) {
    throw "Handle is not a bytes32";
  }

  const typeCt = handle >> 8n;

  if (Number(typeCt % 256n) !== expectedType) {
    throw "Wrong encrypted type for the handle";
  }
}

export async function reencryptEuint32(
  config: UseConfigReturnType,
  account: Account,
  instance: FhevmInstance,
  handle: bigint,
  contractAddress: string,
): Promise<bigint> {
  verifyType(handle, EUINT32_T);
  return reencryptHandle(config, account, instance, handle, contractAddress);
}

async function reencryptHandle(
  config: UseConfigReturnType,
  account: Account,
  instance: FhevmInstance,
  handle: bigint,
  contractAddress: string,
): Promise<any> {
  const { publicKey, privateKey } = instance.generateKeypair();
  const eip712 = instance.createEIP712(publicKey, contractAddress);
  const signature = await signTypedData(config, eip712);
  const reencryptedHandle = await instance.reencrypt(
    handle,
    privateKey,
    publicKey,
    signature.replace("0x", ""),
    contractAddress,
    account.address,
  );

  return reencryptedHandle;
}
