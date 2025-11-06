function isNonNullObjectWithAddress(val: unknown): val is { address: string } {
  return typeof val === "object" && val !== null && "address" in val;
}
import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import LuteConnect from "lute-connect";

interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  error: string;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string>("");

  const connect = useCallback(async () => {
    setError("");
    try {
      const client = new LuteConnect(document.title || "YourAppName");
  console.log("[LuteConnect] Attempting to connect with network: testnet-v1.0");
  const res = await client.connect("testnet-v1.0");
      console.log("[LuteConnect] Connection result:", res);
      let addr: string | null = null;
      if (Array.isArray(res)) {
        const first = res[0];
        if (isNonNullObjectWithAddress(first)) {
          addr = first.address;
        } else if (first != null) {
          addr = first as string;
        }
      } else if (typeof res === "object" && res !== null && "address" in res) {
        addr = (res as any).address;
      } else if (typeof res === "string") {
        addr = res;
      }
      if (addr && /^[A-Z2-7]{58}$/.test(addr)) {
        setAddress(addr);
        setIsConnected(true);
        console.log("[LuteConnect] Connected Algorand address:", addr);
      } else {
        setError("No valid address returned from wallet.");
        setAddress(null);
        setIsConnected(false);
        console.error("[LuteConnect] No valid Algorand address returned.", res);
      }
    } catch (e: any) {
      setError(e.message || "Wallet connection failed.");
      setAddress(null);
      setIsConnected(false);
      console.error("[LuteConnect] Wallet connection error:", e);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setIsConnected(false);
    setError("");
  }, []);

  return (
    <WalletContext.Provider value={{ address, isConnected, error, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
};

export function useWalletContext() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWalletContext must be used within a WalletProvider");
  }
  return context;
}
