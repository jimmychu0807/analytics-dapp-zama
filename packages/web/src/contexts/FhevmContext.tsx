"use client";

import { initFhevm, createInstance, type FhevmInstance } from "fhevmjs/bundle";
import { type ReactNode, createContext, useContext, useEffect, useState } from "react";

export const FhevmContext = createContext<FhevmInstance | undefined>(undefined);

export function FhevmProvider({ children }: { children: ReactNode }) {
  const [instance, setInstance] = useState<FhevmInstance>();

  useEffect(() => {
    (async () => {
      // Refer to:
      //   - https://docs.zama.ai/fhevm/frontend/webapp#step-3-create-an-instance
      //   - mocked frontend: https://github.com/zama-ai/fhevm-react-template/blob/mockedFrontend
      await initFhevm();

      const _instance = await createInstance({
        kmsContractAddress: "0x9D6891A6240D6130c54ae243d8005063D05fE14b",
        aclContractAddress: "0xFee8407e2f5e3Ee68ad77cAE98c434e637f516e5",
        // TODO: is this right?
        network: window.ethereum,
        gatewayUrl: "https://gateway.sepolia.zama.ai/",
      });

      setInstance(_instance);
    })();
  }, []);

  return <FhevmContext.Provider value={instance}>{children}</FhevmContext.Provider>;
}

export function useFhevm() {
  return useContext(FhevmContext);
}
