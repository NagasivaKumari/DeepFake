import { Shield, Check } from "lucide-react";
import {
  useWallet,
  WalletProvider,
  usePeraWallet,
} from "../hooks/useWallet";
// Using wallet context convenience sendPayment instead of manual build/sign
import { Button } from "./ui/button";

const ConnectedHeader = () => {
  const {
    accounts,
    connected,
    providers,
    activeAccount,
    signTransactions,
    connect,
    disconnect,
  } = useWallet();
  const { peraWallet } = usePeraWallet();

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
          
          <nav className="hidden lg:flex items-center gap-6">
            <a href="#dashboard" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </a>
            <a href="#register" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Register Media
            </a>
            <a href="#verify" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Verify Media
            </a>
            <a href="#my-dashboard" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              My Dashboard
            </a>
            <a href="#trust-graph" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Trust Graph
            </a>
            <a href="#docs" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              Docs/API
            </a>
            <a href="#faq" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-4">
            {connected && activeAccount ? (
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm bg-gray-100 p-2 rounded">{activeAccount.address}</span>
                <Check className="w-4 h-4 text-green-600" />
                <Button onClick={disconnect} variant="outline">Disconnect</Button>
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
