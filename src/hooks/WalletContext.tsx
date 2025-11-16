function isNonNullObjectWithAddress(val: unknown): val is { address: string } {
  return typeof val === "object" && val !== null && "address" in val;
}
import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import * as algosdk from "algosdk";
import { getLute } from "@/utils/luteClient";

interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  error: string;
  connect: () => Promise<string | null>; // Returns connected address or null on failure
  disconnect: () => void;
  // Sign a single raw unsigned transaction (msgpack bytes) and return raw signed bytes
  signRaw: (bytes: Uint8Array) => Promise<Uint8Array | null>;
  // Sign raw unsigned txn and return base64 string untouched from wallet (preferred for broadcast)
  signRawBase64: (bytes: Uint8Array) => Promise<string | null>;
  // Sign a group of raw unsigned transaction bytes (already assigned group id) and return signed bytes for each
  signGroup: (group: Uint8Array[]) => Promise<Uint8Array[]>;
  // Encode bytes to base64 (used before sending to backend)
  encodeBase64: (bytes: Uint8Array) => string;
  // Build, sign and broadcast a payment transaction; returns txid
  sendPayment: (opts: { to: string; amount: number; note?: string | Uint8Array }) => Promise<{ txid: string; explorer_url?: string } | null>;
}

export const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string>("");

  const connect = useCallback(async () => {
    setError("");
    try {
    const client = getLute();
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
        return addr;
      } else {
        setError("No valid address returned from wallet.");
        setAddress(null);
        setIsConnected(false);
        console.error("[LuteConnect] No valid Algorand address returned.", res);
        return null;
      }
    } catch (e: any) {
      setError(e.message || "Wallet connection failed.");
      setAddress(null);
      setIsConnected(false);
      console.error("[LuteConnect] Wallet connection error:", e);
      return null;
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setIsConnected(false);
    setError("");
  }, []);

  // Helper: base64 encode raw bytes irrespective of environment (Node/Bundler/Browser)
  const encodeBase64 = useCallback((bytes: Uint8Array) => {
    try {
      if (typeof Buffer !== 'undefined') {
        return Buffer.from(bytes).toString('base64');
      }
    } catch {}
    // Fallback browser path
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    // btoa may throw for large inputs; slice in chunks if needed (unlikely for txn sizes < 1KB)
    return btoa(binary);
  }, []);

  const signRaw = useCallback(async (bytes: Uint8Array): Promise<Uint8Array | null> => {
    setError('');
    if (!isConnected || !address) {
      setError('Wallet not connected');
      return null;
    }
    try {
      const client = getLute();
      // Detect signing method variants
      const single = (client as any).signTransaction || (client as any).signTxn || (client as any).signTx;
      const multi = (client as any).signTransactions || (client as any).signTxns || (client as any).signGroup;
      // Most Lute wallets expose only signTxns(array of { txn: base64 })
      if (multi && !single) {
        const unsignedB64 = encodeBase64(bytes);
        const arr = await multi.call(client, [{ txn: unsignedB64 }]);
        if (!Array.isArray(arr) || arr.length === 0) {
          setError('Wallet returned empty array');
          return null;
        }
        const interpretSigned = (entry: any): Uint8Array | null => {
          try {
            if (!entry) return null;
            if (entry instanceof Uint8Array) return entry;
            if (typeof entry === 'string') {
              const norm = entry.trim().replace(/\s+/g,'').replace(/-/g,'+').replace(/_/g,'/');
              const pad = norm + '='.repeat((4 - (norm.length % 4)) % 4);
              return new Uint8Array(Buffer.from(pad, 'base64'));
            }
            if (typeof entry === 'object') {
              // Common shapes: { blob: base64 }, { stx: base64 }, { signedTxn: base64 }, { sig: base64, txn: base64Unsigned }
              const blobLike = entry.blob || entry.signedTxn || entry.stx || entry.signed || entry.txnBlob;
              if (blobLike) return interpretSigned(blobLike);
              // Reconstruct from separate sig + txn if present
              if (entry.sig && entry.txn) {
                const sigStr = typeof entry.sig === 'string' ? entry.sig : null;
                const txnStr = typeof entry.txn === 'string' ? entry.txn : null;
                if (sigStr && txnStr) {
                  const normSig = sigStr.trim().replace(/\s+/g,'').replace(/-/g,'+').replace(/_/g,'/');
                  const padSig = normSig + '='.repeat((4 - (normSig.length % 4)) % 4);
                  const sigBytes = Buffer.from(padSig, 'base64');
                  const normTxn = txnStr.trim().replace(/\s+/g,'').replace(/-/g,'+').replace(/_/g,'/');
                  const padTxn = normTxn + '='.repeat((4 - (normTxn.length % 4)) % 4);
                  const unsignedBytes = Buffer.from(padTxn, 'base64');
                  try {
                    const decodedUnsigned = algosdk.decodeUnsignedTransaction(unsignedBytes);
                    const stx = algosdk.signTransaction(decodedUnsigned, { sk: new Uint8Array(64) }); // placeholder will fail; prefer blob path
                  } catch { /* ignore */ }
                  // Attempt canonical repack: we don't have private key; so rely on wallet returning full signed blob in another field.
                }
              }
            }
            return null;
          } catch { return null; }
        };
        // Try each entry until one decodes to plausible signed txn (map root with sig/txn) length < 300 typical, but accept >300 if present
        for (const e of arr) {
          const got = interpretSigned(e);
          if (got && got.length > 0) return got;
        }
        setError('Unable to interpret any wallet signed txn entry');
        return null;
      }
      if (single) {
        // Some implementations may accept base64 string instead of raw bytes; try raw first then fallback
        let res = await single.call(client, bytes);
        const tryInterpret = (v: any): Uint8Array | null => {
          if (!v) return null;
          if (v instanceof Uint8Array) return v;
          if (typeof v === 'string') {
            const norm = v.trim().replace(/\s+/g,'').replace(/-/g,'+').replace(/_/g,'/');
            const pad = norm + '='.repeat((4 - (norm.length % 4)) % 4);
            return new Uint8Array(Buffer.from(pad, 'base64'));
          }
            if (typeof v === 'object' && v.blob) return tryInterpret(v.blob);
          return null;
        };
        let interpreted = tryInterpret(res);
        if (!interpreted) {
          // Fallback: supply base64 unsigned txn
          const unsignedB64 = encodeBase64(bytes);
          res = await single.call(client, unsignedB64);
          interpreted = tryInterpret(res);
        }
        if (!interpreted) {
          setError('Unexpected single sign return type');
          return null;
        }
        return interpreted;
      }
      setError('No signing method available on wallet client');
      return null;
    } catch (e: any) {
      console.error('[WalletContext] signRaw error:', e);
      setError(e.message || 'signRaw failed');
      return null;
    }
  }, [isConnected, address]);

  const signRawBase64 = useCallback(async (bytes: Uint8Array): Promise<string | null> => {
    const signed = await signRaw(bytes);
    if (!signed) return null;
    return encodeBase64(signed);
  }, [signRaw, encodeBase64]);

  const signGroup = useCallback(async (group: Uint8Array[]): Promise<Uint8Array[]> => {
    setError('');
    if (!isConnected || !address) {
      setError('Wallet not connected');
      return [];
    }
    if (!group.length) return [];
    try {
      const client = getLute();
      const multi = (client as any).signTransactions || (client as any).signTxns || (client as any).signGroup;
      if (multi) {
        const res = await multi.call(client, group);
        if (Array.isArray(res)) {
          return res.filter((x): x is Uint8Array => x instanceof Uint8Array);
        }
        setError('Unexpected multi-sign return type');
        return [];
      }
      // Fallback: iterate single signing method
      const single = (client as any).signTransaction || (client as any).signTxn || (client as any).signTx;
      if (!single) {
        setError('No signing method available on wallet client');
        return [];
      }
      const out: Uint8Array[] = [];
      for (const bytes of group) {
        try {
          const r = await single.call(client, bytes);
            if (r instanceof Uint8Array) out.push(r);
            else if (r && typeof r === 'object' && 'blob' in r && r.blob instanceof Uint8Array) out.push(r.blob);
        } catch (e) {
          console.warn('[WalletContext] signGroup element failed, skipping:', e);
        }
      }
      return out;
    } catch (e: any) {
      console.error('[WalletContext] signGroup error:', e);
      setError(e.message || 'signGroup failed');
      return [];
    }
  }, [isConnected, address]);

  const sendPayment = useCallback(async ({ to, amount, note }: { to: string; amount: number; note?: string | Uint8Array }) => {
    setError('');
    if (!isConnected || !address) {
      setError('Wallet not connected');
      return null;
    }
    try {
      const from = address;
      // Fetch suggested params from backend
      const spRes = await fetch('/media/algod_params');
      if (!spRes.ok) throw new Error(`Failed suggested params (${spRes.status})`);
      const spJson = await spRes.json();
      const ghB64: string = spJson.genesisHash || spJson.genesisHashInfo || spJson.genesisHashB64 || '';
      const normGh = (() => {
        try {
          const core = ghB64.trim().replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
          const pad = core + '='.repeat((4 - (core.length % 4)) % 4);
          return Uint8Array.from(Buffer.from(pad, 'base64'));
        } catch {
          const dec = atob(ghB64);
          const u8 = new Uint8Array(dec.length);
          for (let i = 0; i < dec.length; i++) u8[i] = dec.charCodeAt(i);
          return u8;
        }
      })();
      const suggestedParams = {
        fee: spJson.fee,
        firstRound: spJson.firstRound,
        lastRound: spJson.lastRound,
        genesisID: spJson.genesisID,
        genesisHash: normGh,
        flatFee: !!spJson.flatFee,
        minFee: spJson.fee,
      } as any; // typed loosely to avoid strict mismatch
      // Dynamic import algosdk only when needed
      const algosdk = await import('algosdk');
      let noteBytes: Uint8Array | undefined;
      if (typeof note === 'string') noteBytes = new TextEncoder().encode(note);
      else if (note instanceof Uint8Array) noteBytes = note;
      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: from,
        receiver: to,
        amount,
        note: noteBytes,
        suggestedParams,
      });
      const unsignedBytes = algosdk.encodeUnsignedTransaction(txn);
      const signedBytes = await signRaw(unsignedBytes);
      if (!signedBytes) throw new Error('Signing failed');
      const signedB64 = encodeBase64(signedBytes);
      const resp = await fetch('/media/broadcast_signed_tx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signed_tx_b64: signedB64 }),
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Broadcast failed ${resp.status}: ${txt}`);
      }
      return await resp.json();
    } catch (e: any) {
      console.error('[WalletContext] sendPayment error', e);
      setError(e.message || 'sendPayment failed');
      return null;
    }
  }, [isConnected, address, signRaw, encodeBase64]);

  return (
    <WalletContext.Provider value={{ address, isConnected, error, connect, disconnect, signRaw, signRawBase64, signGroup, encodeBase64, sendPayment }}>
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
