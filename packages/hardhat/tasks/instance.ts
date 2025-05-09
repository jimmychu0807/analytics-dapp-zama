import { createInstance as createFhevmInstance } from "fhevmjs/node";
import { FhevmInstance } from "fhevmjs/node";

import { ACL_ADDRESS, GATEWAY_URL, KMSVERIFIER_ADDRESS } from "../test/constants";

const kmsAdd = KMSVERIFIER_ADDRESS;
const aclAdd = ACL_ADDRESS;
const localhost = "http://127.0.0.1:8545";

export const createInstance = async (): Promise<FhevmInstance> => {
  const instance = await createFhevmInstance({
    kmsContractAddress: kmsAdd,
    aclContractAddress: aclAdd,
    networkUrl: localhost,
    gatewayUrl: GATEWAY_URL,
  });
  return instance;
};
