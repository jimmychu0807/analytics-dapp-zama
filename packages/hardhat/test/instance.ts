import { type FhevmInstance, createEIP712, createInstance as createFhevmInstance, generateKeypair } from "fhevmjs/node";
import { network } from "hardhat";
import { type HttpNetworkConfig } from "hardhat/types";

import { ACL_ADDRESS, GATEWAY_URL, KMSVERIFIER_ADDRESS } from "./constants";
import { createEncryptedInputMocked, reencryptRequestMocked } from "./fhevmjsMocked";

const kmsAdd = KMSVERIFIER_ADDRESS;
const aclAdd = ACL_ADDRESS;

export type MockedFhevmInstance = {
  reencrypt: typeof reencryptRequestMocked;
  createEncryptedInput: typeof createEncryptedInputMocked;
  getPublicKey: () => string;
  generateKeypair: typeof generateKeypair;
  createEIP712: ReturnType<typeof createEIP712>;
};

export const createInstance = async (): Promise<FhevmInstance | MockedFhevmInstance> => {
  if (network.name === "hardhat") {
    const instance = {
      reencrypt: reencryptRequestMocked,
      createEncryptedInput: createEncryptedInputMocked,
      getPublicKey: () => "0xFFAA44433",
      generateKeypair: generateKeypair,
      createEIP712: createEIP712(network.config.chainId!),
    };
    return instance;
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
