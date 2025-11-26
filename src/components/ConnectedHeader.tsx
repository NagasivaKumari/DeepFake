import { useState } from "react";
import { useWallet } from "../hooks/useWallet";

const ConnectedHeader = () => {
  const {
    connected,
    activeAccount,
    connect,
    disconnect,
    providers,
  } = useWallet();
  const [showProviderSelection, setShowProviderSelection] = useState(false);

  const handleConnect = async (provider) => {
    try {
      await connect(provider);
      setShowProviderSelection(false);
    } catch (e) {
      console.error("Wallet connection failed", e);
    }
  };

  const connectedProvider = providers.find(
    (provider) => provider.metadata.id === activeAccount?.providerId
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-border">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              {connectedProvider && connectedProvider.metadata.icon ? (
                <img
                  src={connectedProvider.metadata.icon}
                  alt={connectedProvider.metadata.name}
                  className="w-6 h-6"
                />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6 text-white"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
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
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={disconnect}
              >
                {connectedProvider && connectedProvider.metadata.icon ? (
                  <img
                    src={connectedProvider.metadata.icon}
                    alt={connectedProvider.metadata.name}
                    className="w-4 h-4 mr-2"
                  />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-4 h-4 mr-2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                )}
                <span>
                  {activeAccount.address.slice(0, 4)}...{activeAccount.address.slice(-4)}
                </span>
              </button>
            ) : (
              <button
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => setShowProviderSelection((prev) => !prev)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4 mr-2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2-1.343-2-3-2zM9 12a3 3 0 106 0v-1a3 3 0 10-6 0v1z"
                  />
                </svg>
                <span>Connect Wallet</span>
              </button>
            )}

            {showProviderSelection && (
              <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg p-2 z-10">
                {providers.map((provider) => (
                  <button
                    key={provider.metadata.id}
                    onClick={() => handleConnect(provider)}
                    className="flex items-center gap-2 p-2 w-full text-left hover:bg-gray-100"
                  >
                    <img
                      src={provider.metadata.icon || "/default-wallet-icon.png"}
                      alt={provider.metadata.name || "Wallet"}
                      className="w-5 h-5"
                    />
                    <span>{provider.metadata.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default ConnectedHeader;
