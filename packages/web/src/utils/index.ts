import { http, cookieStorage, createConfig, createStorage } from "wagmi";
import { sepolia, baseSepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

export const ethRpcUrl = process.env.NEXT_PUBLIC_ETH_RPC_URL;

export function getConfig() {
  return createConfig({
    chains: [sepolia, baseSepolia],
    connectors: [injected()],
    storage: createStorage({
      storage: cookieStorage,
    }),
    ssr: true,
    transports: {
      [sepolia.id]: http(ethRpcUrl),
      [baseSepolia.id]: http(ethRpcUrl),
    },
  });
}
