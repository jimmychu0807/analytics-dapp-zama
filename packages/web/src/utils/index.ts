import { formatEther as viemFormatEther } from "viem";
import { http, cookieStorage, createConfig, createStorage } from "wagmi";
import { sepolia, baseSepolia, hardhat } from "wagmi/chains";
import { injected } from "wagmi/connectors";

export const MAX_METAS = 4;
export const ethRpcUrl = process.env.NEXT_PUBLIC_ETH_RPC_URL;
export const REQUIRED_CHAIN_ID = hardhat.id;

export function getConfig() {
  return createConfig({
    chains: [sepolia, baseSepolia, hardhat],
    connectors: [injected()],
    storage: createStorage({
      storage: cookieStorage,
    }),
    ssr: true,
    transports: {
      [sepolia.id]: http(ethRpcUrl),
      [baseSepolia.id]: http(ethRpcUrl),
      [hardhat.id]: http(ethRpcUrl),
    },
  });
}

export function formatEther(value: bigint, decimal: number = 3): string {
  return Number(viemFormatEther(value)).toFixed(decimal).toString();
}
