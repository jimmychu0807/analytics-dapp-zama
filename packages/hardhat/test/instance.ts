import { type FhevmInstance, createEIP712, createInstance as createFhevmInstance, generateKeypair } from "fhevmjs/node";
import { network } from "hardhat";
import { type HttpNetworkConfig } from "hardhat/types";

import { ACL_ADDRESS, GATEWAY_URL, KMSVERIFIER_ADDRESS } from "./constants";
import { createEncryptedInputMocked, reencryptRequestMocked } from "./fhevmjsMocked";

const kmsAdd = KMSVERIFIER_ADDRESS;
const aclAdd = ACL_ADDRESS;

export type MockedFhevmInstance = ReturnType<typeof getMockedFhevm>;

export function getMockedFhevm() {
  return {
    reencrypt: reencryptRequestMocked,
    createEncryptedInput: createEncryptedInputMocked,
    getPublicKey: () => "0xFFAA44433",
    generateKeypair,
    createEIP712: createEIP712(network.config.chainId!),
  };
}

export const createInstance = async (): Promise<FhevmInstance | MockedFhevmInstance> => {
  if (network.name === "hardhat") {
    return getMockedFhevm();
  } else {
    const instance = await createFhevmInstance({
      kmsContractAddress: kmsAdd,
      aclContractAddress: aclAdd,
      networkUrl: (network.config as HttpNetworkConfig).url,
      gatewayUrl: GATEWAY_URL,
    });
    return instance;
  }
};
