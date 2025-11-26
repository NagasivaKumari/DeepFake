import { useState } from "react";
import { Wallet } from "lucide-react";
import { useWallet } from "../hooks/useWallet";
import { Button } from "./ui/button";

const ConnectedHeader = () => {
  const {
    connected,
    activeAccount,
    connect,
    disconnect,
    providers,
  } = useWallet();
  const [showAddress, setShowAddress] = useState(false);

  const handleConnect = async (provider) => {
    try {
      await connect(provider);
    } catch (e) {
      console.error("Wallet connection failed", e);
    }
  };

  const connectedProvider = providers.find(
    (provider) => provider.metadata.id === activeAccount?.providerId
  );

  console.log("Providers:", providers);
  console.log("Active Account:", activeAccount);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-border">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              {connectedProvider ? (
                <img
                  src={connectedProvider.metadata.icon || "/default-wallet-icon.png"}
                  alt={connectedProvider.metadata.name || "Wallet"}
                  className="w-6 h-6"
                />
              ) : (
                <Wallet className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <div className="text-lg font-bold text-foreground">ProofChain</div>
              <div className="text-xs text-muted-foreground">
                Media Verification
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {connected && activeAccount ? (
              <button
                className="flex items-center gap-2"
                onClick={() => setShowAddress((prev) => !prev)}
              >
                {connectedProvider ? (
                  <img
                    src={connectedProvider.metadata.icon || "/default-wallet-icon.png"}
                    alt={connectedProvider.metadata.name || "Wallet"}
                    className="w-5 h-5"
                  />
                ) : (
                  <Wallet className="w-5 h-5 text-primary" />
                )}
              </button>
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
                        src={provider.metadata.icon || "/default-wallet-icon.png"}
                        alt={provider.metadata.name || "Wallet"}
                        className="w-6 h-6 mr-2"
                      />
                      {provider.metadata.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {showAddress && connected && activeAccount && (
              <div className="absolute top-full mt-2 bg-white border border-gray-200 rounded shadow-lg p-2">
                <span className="font-mono text-sm">
                  {`${activeAccount.address.slice(0, 6)}...${activeAccount.address.slice(
                    -4
                  )}`}
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
        </div>
      </div>
    </header>
  );
};

export default ConnectedHeader;
