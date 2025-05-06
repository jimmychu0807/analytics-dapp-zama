"use client";

import { mockedHardhat, fhevmConfig } from "@/utils";
import { type MockedFhevmInstance, getMockedFhevm } from "@/utils/fhevmjsMocked";
import { initFhevm, createInstance, type FhevmInstance } from "fhevmjs/bundle";
// import { initFhevm, createInstance, type FhevmInstance } from "fhevmjs/web";
import { type ReactNode, createContext, useContext, useEffect, useState } from "react";

export const FhevmContext = createContext<FhevmInstance | MockedFhevmInstance | undefined>(
  undefined,
);

async function initCreateInstance() {
  const { kmsContractAddress, aclContractAddress, gatewayUrl } = fhevmConfig;

  await initFhevm();
  return await createInstance({
    kmsContractAddress,
    aclContractAddress,
    network: window.ethereum,
    gatewayUrl,
  });
}

export function FhevmProvider({ children }: { children: ReactNode }) {
  const [instance, setInstance] = useState<FhevmInstance | MockedFhevmInstance>();

  useEffect(() => {
    (async () => {
      // Refer to:
      //   - https://docs.zama.ai/fhevm/frontend/webapp#step-3-create-an-instance
      //   - mocked frontend: https://github.com/zama-ai/fhevm-react-template/blob/mockedFrontend
      const _instance = mockedHardhat ? getMockedFhevm() : await initCreateInstance();
      setInstance(_instance);
    })();
  }, []);

  return <FhevmContext.Provider value={instance}>{children}</FhevmContext.Provider>;
}

export function useFhevm() {
  return useContext(FhevmContext);
}
