"use client";

import { FhevmProvider } from "@/contexts/FhevmContext";
import { ListenEventsAndActProvider } from "@/contexts/ListenEventsAndActContext";
import { getConfig } from "@/utils";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { type State, WagmiProvider } from "wagmi";

export function Providers(props: { children: ReactNode; initialState?: State }) {
  const [config] = useState(() => getConfig());
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config} initialState={props.initialState}>
      <QueryClientProvider client={queryClient}>
        <ListenEventsAndActProvider>
          <FhevmProvider>{props.children}</FhevmProvider>
        </ListenEventsAndActProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
