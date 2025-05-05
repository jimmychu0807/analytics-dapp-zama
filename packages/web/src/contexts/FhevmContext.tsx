"use client";

import { initFhevm, createInstance, type FhevmInstance } from "fhevmjs/bundle";
import { type ReactNode, createContext, useContext, useEffect, useState } from "react";
import { mockedHardhat, fhevmConfig } from "@/utils";
import { getMockedFhevm } from "@/utils/fhevmjsMocked";

export const FhevmContext = createContext<FhevmInstance | undefined>(undefined);

export function FhevmProvider({ children }: { children: ReactNode }) {
  const [instance, setInstance] = useState<FhevmInstance>();

  useEffect(() => {
    (async () => {
      // Refer to:
      //   - https://docs.zama.ai/fhevm/frontend/webapp#step-3-create-an-instance
      //   - mocked frontend: https://github.com/zama-ai/fhevm-react-template/blob/mockedFrontend
      await initFhevm();

      const { kmsContractAddress, aclContractAddress, gatewayUrl } = fhevmConfig;

      const _instance = mockedHardhat
        ? getMockedFhevm()
        : await createInstance({
            kmsContractAddress,
            aclContractAddress,
            // TODO: is this right?
            network: window.ethereum,
            gatewayUrl,
          });

      setInstance(_instance);
    })();
  }, []);

  return <FhevmContext.Provider value={instance}>{children}</FhevmContext.Provider>;
}

export function useFhevm() {
  return useContext(FhevmContext);
}
