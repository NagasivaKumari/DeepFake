import { useState } from "react";
import { Shield, Wallet } from "lucide-react";
import {
  useWallet,
  WalletProvider,
  usePeraWallet,
} from "../hooks/useWallet";
// Using wallet context convenience sendPayment instead of manual build/sign
import { Button } from "./ui/button";

const ConnectedHeader = () => {
  const {
    connected,
    providers,
    activeAccount,
    connect,
    disconnect,
  } = useWallet();
  const { peraWallet } = usePeraWallet();
  const [showAddress, setShowAddress] = useState(false);

  const handleConnect = async (provider) => {
    try {
      await connect(provider);
      // activeAccount may not be set immediately after connect (state update async)
      const addr = activeAccount?.address;
      if (!addr) return; // user sees connected state; can trigger payment explicitly later if desired
      // Example automatic payment (can be removed if undesired)
      const recipient = "SL5PBMXBUSOP5IBJDL6ZKB5KSCXV5NGF6KRBZS37UPWRSXKV6GXJZAWQYM"; // Deployer address
      const amount = 1_000_000; // 1 Algo in microAlgos
      if (!recipient || recipient.length < 10) {
        console.warn("Recipient address appears invalid, skipping payment auto-send");
        return;
      }
      if (amount <= 0 || !Number.isInteger(amount)) {
        console.warn("Amount invalid, skipping payment auto-send");
        return;
      }
      const res = await sendPayment({ to: recipient, amount, note: "Registration Fee" });
      if (res) console.log("Payment successful", res.txid);
    } catch (e) {
      console.error("Auto payment after connect failed", e);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-border">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold text-foreground">ProofChain</div>
              <div className="text-xs text-muted-foreground">Media Verification</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {connected && activeAccount ? (
              <div className="relative">
                <button
                  className="flex items-center gap-2"
                  onClick={() => setShowAddress((prev) => !prev)}
                >
                  <Wallet className="w-5 h-5 text-primary" />
                </button>
                {showAddress && (
                  <div className="absolute top-full mt-2 bg-white border border-gray-200 rounded shadow-lg p-2">
                    <span className="font-mono text-sm">
                      {`${activeAccount.address.slice(0, 6)}...${activeAccount.address.slice(-4)}`}
                    </span>
                    <button
                      className="ml-2 text-red-500 text-sm"
                      onClick={disconnect}
                    >
                      Disconnect
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>Connect Wallet</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {providers.map((provider) => (
                    <DropdownMenuItem
                      key={provider.metadata.id}
                      onClick={() => handleConnect(provider)}
                    >
                      <img
                        src={provider.metadata.icon}
                        alt={provider.metadata.name}
                        className="w-6 h-6 mr-2"
                      />
                      {provider.metadata.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default ConnectedHeader;
