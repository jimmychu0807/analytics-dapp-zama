"use client";

import { Button as FatButton } from "@/components/ui/button2";
import { formatEther } from "@/utils";
import { useAccount, useBalance, useConnect, useDisconnect, useSwitchChain } from "wagmi";

export function WalletConnect({ requiredChainId }: { requiredChainId: number }) {
  const walletAccount = useAccount();
  const { data: walletBalance } = useBalance({
    address: walletAccount?.address,
    query: { refetchInterval: 10000 },
  });
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  return (
    <div className="flex flex-col justify-center items-center">
      <div className="py-3 w-7/8">
        {walletAccount.status === "connected" || walletAccount.status === "reconnecting" ? (
          <>
            <div className="text-center my-2 font-semibold">Your Wallet Account</div>
            <div className="text-center text-sm py-1.5 my-2">
              {walletAccount.address}
              {walletBalance && ` (${formatEther(walletBalance.value)} ${walletBalance.symbol})`}
            </div>
            <div className="flex flex-row gap-x-4 justify-center">
              {walletAccount.chainId !== requiredChainId && (
                <FatButton
                  buttonText="Switch Network"
                  onClick={() => switchChain({ chainId: requiredChainId })}
                />
              )}
              <FatButton buttonText="Disconnect" onClick={() => disconnect()} />
            </div>
          </>
        ) : (
          <>
            <div className="text-center my-2 font-semibold">Connect Wallet</div>
            <div className="flex flex-row gap-x-4 justify-center">
              {connectors.map((c) => (
                <FatButton
                  key={c.uid}
                  buttonText={c.name}
                  onClick={() => connect({ connector: c })}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
