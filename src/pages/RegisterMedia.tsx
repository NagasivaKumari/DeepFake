import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import storageClient from "@/api/storageClient";
import { useWallet } from "@/hooks/useWallet";
import {
  Upload,
  FileCheck,
  Hash,
  Shield,
  CheckCircle,
  AlertCircle,
  Loader2,
  Download,
  ExternalLink,
  Fingerprint,
} from "lucide-react";
import getLute from "@/utils/luteClient";
import { motion } from "framer-motion";
import algosdk from "algosdk";
import { Buffer } from "buffer"; // Buffer is still needed for encoding the signed transaction

// Use SDK's helper to decode base64/base64url to bytes reliably
function base64ToUint8Array(base64: string): Uint8Array {
  try {
    return algosdk.base64ToBytes(base64);
  } catch {
    // Fallback normalization just in case of malformed padding
    const normalized = base64
      .trim()
      .replace(/\s+/g, "")
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const padLen = normalized.length % 4;
    const padded = padLen ? normalized + "=".repeat(4 - padLen) : normalized;
    const binary = window.atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
}

async function computePerceptualHash(file: File): Promise<string | null> {
  if (!file || !file.type?.startsWith("image/")) {
    return null;
  }
  if (typeof createImageBitmap !== "function") {
    return null;
  }
  try {
    const bitmap = await createImageBitmap(file);
    const size = 32;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);
    if (typeof (bitmap as ImageBitmap).close === "function") {
      (bitmap as ImageBitmap).close();
    }
    const gray = new Float64Array(size * size);
    for (let i = 0; i < size * size; i++) {
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    }
    const dct = new Float64Array(size * size);
    const factor = Math.PI / (2 * size);
    for (let u = 0; u < size; u++) {
      for (let v = 0; v < size; v++) {
        let sum = 0;
        for (let x = 0; x < size; x++) {
          for (let y = 0; y < size; y++) {
            const pixel = gray[y * size + x];
            sum +=
              pixel *
              Math.cos((2 * x + 1) * u * factor) *
              Math.cos((2 * y + 1) * v * factor);
          }
        }
        const cu = u === 0 ? 1 / Math.sqrt(2) : 1;
        const cv = v === 0 ? 1 / Math.sqrt(2) : 1;
        dct[v * size + u] = ((2 / size) * cu * cv * sum);
      }
    }
    const region: number[] = [];
    for (let v = 0; v < 8; v++) {
      for (let u = 0; u < 8; u++) {
        region.push(dct[v * size + u]);
      }
    }
    const mean = region.reduce((acc, val) => acc + val, 0) / region.length;
    const bits = region.map((val) => (val >= mean ? 1 : 0));
    let hash = "";
    for (let i = 0; i < bits.length; i += 4) {
      const nibble =
        (bits[i] << 3) |
        (bits[i + 1] << 2) |
        (bits[i + 2] << 1) |
        (bits[i + 3] ?? 0);
      hash += nibble.toString(16);
    }
    return hash;
  } catch (err) {
    console.warn("Perceptual hash computation failed", err);
    return null;
  }
}

const AI_MODELS = [
  "Stable Diffusion v1.5",
  "Stable Diffusion v2.1",
  "Stable Diffusion XL",
  "DALL-E 2",
  "DALL-E 3",
  "Midjourney v5",
  "Midjourney v6",
  "GPT-4 Vision",
  "Claude 3",
  "Custom Model",
  "Other",
];

export default function RegisterMedia() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [formData, setFormData] = useState({
    ai_model: "",
    generation_time: new Date().toISOString().split("T")[0],
    notes: "",
    algo_tx: "",
  });
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  interface RegisteredData {
    id?: string | number;
    file_name?: string;
    file_type?: string;
    sha256_hash?: string;
    ipfs_cid?: string;
    perceptual_hash?: string;
    algo_tx?: string;
    algo_explorer_url?: string;
    app_explorer_url?: string;
    unique_reg_key?: string;
    blockchain_tx?: string;
    [key: string]: unknown;
  }
  const [registeredData, setRegisteredData] = useState<RegisteredData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const wallet = useWallet();
  const { signRawBase64, address: walletAddress } = wallet;
  const [deployerAddrState, setDeployerAddrState] = useState<string | null>(null);
  const [suggestedParamsState, setSuggestedParamsState] = useState<algosdk.SuggestedParams | null>(null);
  const [unsignedTxnJSON, setUnsignedTxnJSON] = useState<string | null>(null);
  const [preparedFields, setPreparedFields] = useState<{
    file_url: string | null;
    file_name: string | null;
    file_type: string | null;
    sha256_hash: string | null;
    ipfs_cid: string | null;
    perceptual_hash: string | null;
  }>({
    file_url: null,
    file_name: null,
    file_type: null,
    sha256_hash: null,
    ipfs_cid: null,
    perceptual_hash: null,
  });

  const API_BASE = ((): string => {
    const envObj = (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, unknown> }).env)
      ? ((import.meta as unknown as { env?: Record<string, unknown> }).env as Record<string, unknown>)
      : undefined;
    const envBase = envObj && typeof envObj['VITE_API_BASE'] === 'string' ? String(envObj['VITE_API_BASE']).trim() : '';
    if (envBase) return envBase.replace(/\/$/, '');
    const host = window.location.hostname;
    // In dev, use relative base so Vite proxy routes to backend on 8000
    if (host === 'localhost' || host === '127.0.0.1') return '';
    return '';
  })();
  const ENV_DEPLOYER: string | undefined =
    (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, unknown> }).env
      ? String(((import.meta as unknown as { env?: Record<string, unknown> }).env as Record<string, unknown>)['VITE_ALGO_DEPLOYER_ADDR'] || '') ||
        String(((import.meta as unknown as { env?: Record<string, unknown> }).env as Record<string, unknown>)['VITE_DEPLOYER_ADDRESS'] || '')
      : undefined);

  React.useEffect(() => {
    (window as typeof window & { Buffer?: typeof Buffer }).Buffer = (window as typeof window & { Buffer?: typeof Buffer }).Buffer || Buffer;
    let mounted = true;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/media/deployer_address`);
        if (!mounted) return;
        if (r.ok) {
          const j = await r.json();
          setDeployerAddrState((j && j.deployer_address) || null);
        } else {
          setDeployerAddrState(null);
        }
      } catch (e) {
        setDeployerAddrState(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [API_BASE]);

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  function normalizeSuggestedParams(rawSp: unknown): algosdk.SuggestedParams {
    if (!rawSp || typeof rawSp !== "object") {
      throw new Error("Received empty or invalid suggested params from the backend.");
    }

    const sp = rawSp as Record<string, unknown>;

    const fee = sp.fee;
    const flatFee = sp.flatFee;
    const firstRound = sp.firstRound;
    const lastRound = sp.lastRound;
    const genesisID = sp.genesisID;
    const genesisHash = sp.genesisHash;

    if (typeof firstRound !== "number" || typeof lastRound !== "number") {
      console.error("Backend response is missing or has invalid round info:", sp);
      throw new Error("Backend did not provide valid firstRound/lastRound.");
    }

    // Fee must be present and numeric; fall back to 1000 microAlgos if missing
    let feeNum: number;
    if (typeof fee === "number" && fee > 0) {
      feeNum = fee;
    } else {
      console.warn("Fee missing or invalid; defaulting to 1000.", { fee });
      feeNum = 1000;
    }

    // flatFee default to true if not explicitly boolean
    const flatFeeBool = typeof flatFee === "boolean" ? flatFee : true;

    if (typeof genesisID !== "string") {
      console.error("Backend response has invalid genesisID:", sp);
      throw new Error("Backend did not provide a valid genesisID.");
    }

    // Accept either base64 string or Uint8Array for genesisHash
    let decodedGenesisHash: Uint8Array;
    if (genesisHash instanceof Uint8Array) {
      decodedGenesisHash = genesisHash as Uint8Array;
    } else if (typeof genesisHash === "string") {
      decodedGenesisHash = base64ToUint8Array(genesisHash as string);
    } else {
      console.error("Backend response has invalid genesisHash (expected base64 string or Uint8Array)", genesisHash);
      throw new Error("Backend did not provide a valid genesisHash.");
    }

    // Note: lease, if used, must be passed at top-level of txn, not inside suggestedParams

    interface NormalizedSuggestedParams {
      fee: number;
      flatFee: boolean;
      firstRound: number;
      lastRound: number;
      firstValid: number;
      lastValid: number;
      genesisID: string;
      genesisHash: Uint8Array; // Update type to Uint8Array
    }
    const normalized: NormalizedSuggestedParams = {
      fee: feeNum,
      flatFee: flatFeeBool,
      // Support both naming conventions used across SDK versions
      firstRound: firstRound,
      lastRound: lastRound,
      firstValid: firstRound,
      lastValid: lastRound,
      genesisID: genesisID,
      genesisHash: decodedGenesisHash,
    };
    return normalized as algosdk.SuggestedParams;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      setRegistrationError("Please select a file to register.");
      setIsProcessing(false); // Ensure processing is false if no file
      return;
    }
    setIsProcessing(true);
    setRegistrationError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const shaHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      const uploadResp = await storageClient.integrations.Core.UploadFile({ file });
      const file_url = uploadResp.file_url;
      const ipfs_cid = uploadResp.ipfs_cid || null;
      const perceptualHash = await computePerceptualHash(file);

      let signer: string | null = wallet?.address || null;
      if (!signer) {
        try {
          const addrs = await wallet.connect();
          signer = Array.isArray(addrs) ? addrs[0] : addrs;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("Wallet connect failed:", err);
          setRegistrationError(`Wallet connection failed: ${msg}`);
          setIsProcessing(false);
          return;
        }
      }

      const isValidAlgAddr = (a: unknown) => typeof a === "string" && algosdk.isValidAddress(a.trim());
      if (signer) signer = signer.trim();
      if (!signer || !isValidAlgAddr(signer)) {
        setRegistrationError("Wallet not connected or selected address is invalid. Please connect your Algorand wallet and try again.");
        setIsProcessing(false);
        return;
      }

      // --- NEW: Fetch suggestedParams and deployerAddr unconditionally before transaction creation ---
      let currentSuggestedParams = suggestedParamsState;
      if (!currentSuggestedParams) {
        const spResp = await fetch(`${API_BASE}/media/algod_params`);
        if (!spResp.ok) {
            const errBody = await spResp.json();
            throw new Error(`Failed to fetch algod params: ${spResp.status} - ${errBody.detail || 'Unknown error'}`);
        }
        const rawSp = await spResp.json();
        const normalizedSp = normalizeSuggestedParams(rawSp);
        setSuggestedParamsState(normalizedSp); // cache normalized for future
        currentSuggestedParams = normalizedSp;
      }
      const suggestedParams: algosdk.SuggestedParams = normalizeSuggestedParams(currentSuggestedParams); // Ensure suggestedParams is normalized

      let currentDeployerAddr = deployerAddrState;
      // Prefer env override if present
      if (!currentDeployerAddr && ENV_DEPLOYER && typeof ENV_DEPLOYER === 'string') {
        const envAddr = ENV_DEPLOYER.trim();
        if (algosdk.isValidAddress(envAddr)) {
          currentDeployerAddr = envAddr;
          setDeployerAddrState(envAddr);
        } else {
          console.warn("ENV deployer address is invalid:", envAddr);
        }
      }
      if (!currentDeployerAddr) { // Only fetch if not already in state
          const d = await fetch(`${API_BASE}/media/deployer_address`);
          if (!d.ok) throw new Error(`Failed to fetch deployer address: ${d.status}`);
          const dj = await d.json();
          console.log("DEPLOYER_ADDRESS payload", dj);
          const fetchedDeployerAddr = (dj?.deployer_address || "").trim();
          if (!fetchedDeployerAddr) {
            throw new Error("Backend returned empty deployer_address");
          }
          if (!algosdk.isValidAddress(fetchedDeployerAddr)) {
            throw new Error(`Backend deployer_address is invalid: ${fetchedDeployerAddr}`);
          }
          setDeployerAddrState(fetchedDeployerAddr); // Update state for future use
          currentDeployerAddr = fetchedDeployerAddr;
      }
      const deployerAddr = currentDeployerAddr; // Use the most up-to-date deployer address

      // Critical checks right before transaction creation
      if (!signer) {
          setRegistrationError("Algorand signer address is missing or invalid.");
          setIsProcessing(false);
          return;
      }
      if (!deployerAddr || !isValidAlgAddr(deployerAddr)) { // Re-validate deployerAddr
          setRegistrationError("Algorand deployer address is missing or invalid.");
          setIsProcessing(false);
          return;
      }
      if (!suggestedParams) { // Ensure suggestedParams is not null after normalization
          setRegistrationError("Algorand transaction parameters are missing or invalid.");
          setIsProcessing(false);
          return;
      }

      // Ensure addresses are properly trimmed and validated
      const fromAddress = signer.trim();
      const toAddress = deployerAddr.trim();
      
      if (!algosdk.isValidAddress(fromAddress)) {
        setRegistrationError(`Invalid signer address: ${fromAddress}`);
        setIsProcessing(false);
        return;
      }
      if (!algosdk.isValidAddress(toAddress)) {
        setRegistrationError(`Invalid deployer address: ${toAddress}`);
        setIsProcessing(false);
        return;
      }

      const amount = 100000;
      const noteObj = { file_name: file.name, sha256: shaHex, ipfs_cid: ipfs_cid };
      const note: Uint8Array = new TextEncoder().encode(JSON.stringify(noteObj));

      const gh: unknown = (suggestedParams as unknown as { genesisHash?: unknown }).genesisHash;
      const ghInfo = gh instanceof Uint8Array
        ? `bytes:${Array.from(gh.slice(0, 6)).join(',')}...`
        : `string:${String((gh as string) || '').slice(0,12)}...`;
      const ghLen = gh instanceof Uint8Array ? gh.length : (typeof gh === 'string' ? gh.length : null);
      console.log("ALGO DEBUG before txn creation", {
        from: fromAddress,
        to: toAddress,
        suggestedParams,
        suggestedParamKeys: Object.keys(suggestedParams),
        fee: suggestedParams.fee,
        firstRound: suggestedParams.firstRound,
        lastRound: suggestedParams.lastRound,
        firstValid: suggestedParams.firstValid,
        lastValid: suggestedParams.lastValid,
        flatFee: suggestedParams.flatFee,
        genesisID: suggestedParams.genesisID,
        genesisHashInfo: ghInfo,
        genesisHashLen: ghLen,
      });
      console.log("ALGO NOTE type", { type: typeof note, isUint8Array: note instanceof Uint8Array, note });
      console.log("ADDR TYPES", { fromType: typeof fromAddress, toType: typeof toAddress, fromAddress, toAddress });

      // Extra guards right before building the transaction
      if (!fromAddress) {
        throw new Error("fromAddress is null/undefined before transaction creation");
      }
      if (!toAddress) {
        throw new Error("toAddress is null/undefined before transaction creation");
      }
      if (!algosdk.isValidAddress(fromAddress)) {
        throw new Error(`fromAddress is not a valid Algorand address: ${fromAddress}`);
      }
      if (!algosdk.isValidAddress(toAddress)) {
        throw new Error(`toAddress is not a valid Algorand address: ${toAddress}`);
      }

      // Force-correct genesisHash to 32-byte Uint8Array in case it was rehydrated as ASCII (44 bytes)
      const fixedSp: algosdk.SuggestedParams = { ...suggestedParams };
      try {
        let ghAny: unknown = (fixedSp as unknown as { genesisHash?: unknown }).genesisHash;
        if (typeof ghAny === 'string') {
          ghAny = base64ToUint8Array(ghAny);
        } else if (ghAny instanceof Uint8Array && ghAny.length === 44) {
          const ascii = new TextDecoder().decode(ghAny);
          ghAny = base64ToUint8Array(ascii);
        }
        if (!(ghAny instanceof Uint8Array)) {
          throw new Error('genesisHash is not bytes');
        }
        if (ghAny.length !== 32) {
          throw new Error(`genesisHash has invalid length ${ghAny.length}, expected 32`);
        }
        (fixedSp as unknown as { genesisHash: Uint8Array }).genesisHash = ghAny;
      } catch (ghe) {
        console.error('Failed to normalize genesisHash to 32-byte Uint8Array', ghe);
        throw ghe instanceof Error ? ghe : new Error(String(ghe));
      }

      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: fromAddress,
        receiver: toAddress,
        amount,
        note,
        suggestedParams: fixedSp,
      });
      const encodedUnsigned = algosdk.encodeUnsignedTransaction(txn);
      const unsignedB64 = Buffer.from(encodedUnsigned).toString("base64");
      setUnsignedTxnJSON(unsignedB64);

      setPreparedFields({
        file_url,
        file_name: file.name,
        file_type: file.type,
        sha256_hash: shaHex,
        ipfs_cid,
        perceptual_hash: perceptualHash,
      });

      setRegistrationError(null);
      // keep isProcessing true until sign step
      return;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("Registration error:", error);
      setRegistrationError(msg || "An unknown error occurred.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSignAndSubmit = async () => {
    if (!unsignedTxnJSON) {
      setRegistrationError("No prepared transaction found. Please click 'Register' again.");
      return;
    }
    setIsProcessing(true);
    setRegistrationError(null);
    try {
      // Decode unsigned base64 to raw bytes then sign, obtaining wallet's original signed base64
      let unsignedBytes: Uint8Array;
      try {
        unsignedBytes = base64ToUint8Array(unsignedTxnJSON);
      } catch {
        throw new Error('Failed to decode unsigned transaction base64');
      }
      const signedB64 = await signRawBase64(unsignedBytes);
      if (!signedB64) throw new Error('Signing failed or was cancelled');
      // Fingerprint without mutating payload
      try {
        const raw = Uint8Array.from(atob(signedB64), c => c.charCodeAt(0));
        console.log('[CLIENT SIGNED]', {
          rawLen: raw.length,
          headHex: Array.from(raw.slice(0,8)).map(b=>b.toString(16).padStart(2,'0')).join(''),
          tailHex: Array.from(raw.slice(-8)).map(b=>b.toString(16).padStart(2,'0')).join(''),
          b64Head: signedB64.slice(0,16),
          b64Len: signedB64.length,
        });
      } catch (fpErr) {
        console.warn('[CLIENT SIGNED] fingerprint failed', fpErr);
      }

      // Broadcast
      const resp = await fetch(`${API_BASE}/media/broadcast_signed_tx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signed_tx_b64: signedB64 }),
      });
      if (!resp.ok) throw new Error(`Broadcast failed: ${await resp.text()}`);
      const { txid, explorer_url } = await resp.json();

      // Register media metadata including txid
      const registrationPayload = {
        ...preparedFields,
        ai_model: formData.ai_model,
        generation_time: formData.generation_time,
        notes: formData.notes,
        algo_tx: txid,
        algo_explorer_url: explorer_url,
        signer_address: walletAddress || null,
      };
      const regResp = await fetch(`${API_BASE}/media/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationPayload),
      });
      if (!regResp.ok) throw new Error(`Final registration failed: ${await regResp.text()}`);
      const registrationData = await regResp.json();
      setRegisteredData(registrationData.payload || registrationData);
      setRegistrationComplete(true);
      setUnsignedTxnJSON(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('Sign & submit failed', e);
      setRegistrationError(msg || 'An unknown error occurred during signing or submission.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadMetadata = () => {
    const metadata = { ...registeredData, did: `did:ethr:0xAbC...f9d`, standard: "C2PA v1.0", registered_at: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `metadata-${registeredData.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };
  
  if (registrationComplete && registeredData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
            <Card className="shadow-2xl border-none">
              <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-7 h-7" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Registration Successful!</CardTitle>
                    <p className="text-green-100 mt-1">Your media has been verified and registered on the blockchain</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">Your content is now permanently registered and verifiable by anyone</AlertDescription>
                </Alert>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-gray-500 text-sm">File Name</Label>
                    <p className="font-medium mt-1">{registeredData.file_name}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500 text-sm">Status</Label>
                    <Badge className="mt-1 bg-green-100 text-green-700">
                      <CheckCircle className="w-3 h-3 mr-1" /> Verified
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-gray-500 text-sm">SHA-256 Hash</Label>
                    <p className="font-mono text-xs mt-1 break-all">{registeredData.sha256_hash || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500 text-sm">Perceptual Hash</Label>
                    <p className="font-mono text-xs mt-1 break-all">{registeredData.perceptual_hash || "Not available"}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500 text-sm">IPFS CID</Label>
                    <p className="font-mono text-xs mt-1 break-all">{registeredData.ipfs_cid}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500 text-sm">Blockchain Transaction</Label>
                    <p className="font-mono text-xs mt-1 break-all">{registeredData.algo_tx || registeredData.blockchain_tx || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500 text-sm">Registration Hash</Label>
                    <p className="font-mono text-xs mt-1 break-all">{registeredData.unique_reg_key || "—"}</p>
                  </div>
                </div>
                <div className="pt-6 border-t space-y-3">
                  <div className="flex gap-3">
                    <Button onClick={downloadMetadata} className="flex-1 bg-blue-600 hover:bg-blue-700">
                      <Download className="w-4 h-4 mr-2" /> Download Metadata JSON
                    </Button>
                    <Button variant="outline" onClick={() => window.open(registeredData.algo_explorer_url || registeredData.app_explorer_url || 'about:blank', '_blank')} className="flex-1" disabled={!registeredData.algo_explorer_url && !registeredData.app_explorer_url}>
                      <ExternalLink className="w-4 h-4 mr-2" /> View on Explorer
                    </Button>
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={() => { setRegistrationComplete(false); setFile(null); setFormData({ ai_model: "", generation_time: new Date().toISOString().split("T")[0], notes: "", algo_tx: "" }); }} variant="outline" className="flex-1">Register Another File</Button>
                    <Button onClick={() => navigate(createPageUrl("MyDashboard"))} className="flex-1 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700">Go to Dashboard</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12 px-4 overflow-hidden" style={{ paddingTop: '148.8px' }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Register New Media</h1>
          <p className="text-lg text-gray-600">Upload and verify your AI-generated content on the blockchain</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <Card className="shadow-xl border-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Upload className="w-5 h-5 text-blue-600" /> Upload Media File</CardTitle>
              </CardHeader>
              <CardContent>
                <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop} className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"}`}>
                  <input type="file" onChange={handleFileChange} className="hidden" id="file-upload" accept="image/*,video/*" />
                  {!file ? (
                    <>
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-2">Drag and drop your file here, or</p>
                      <label htmlFor="file-upload"><Button type="button" onClick={() => document.getElementById('file-upload')!.click()}>Browse Files</Button></label>
                      <p className="text-sm text-gray-500 mt-4">Supported formats: Images (PNG, JPG, JPEG), Videos (MP4, MOV)</p>
                    </>
                  ) : (
                    <div className="flex items-center justify-center gap-4">
                      <FileCheck className="w-8 h-8 text-green-600" />
                      <div className="text-left">
                        <p className="font-medium text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setFile(null)}>Remove</Button>
                    </div>
                  )}
                </div>
                {file && (
                  <div className="mt-6 space-y-3">
                    <div className="flex gap-2">
                      <Badge variant="outline" className="bg-blue-50"><Hash className="w-3 h-3 mr-1" /> SHA-256 will be generated</Badge>
                      <Badge variant="outline" className="bg-purple-50"><Fingerprint className="w-3 h-3 mr-1" /> Perceptual hash enabled</Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            {file && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <Card className="shadow-xl border-none">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-green-600" /> Metadata & Attestation</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="ai_model">AI Model *</Label>
                        <Select value={formData.ai_model} onValueChange={(value) => setFormData({ ...formData, ai_model: value })}>
                          <SelectTrigger><SelectValue placeholder="Select AI model" /></SelectTrigger>
                          <SelectContent>{AI_MODELS.map((model) => (<SelectItem key={model} value={model}>{model}</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="generation_time">Generation Date</Label>
                        <Input id="generation_time" type="date" value={formData.generation_time} onChange={(e) => setFormData({ ...formData, generation_time: e.target.value })} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes (Optional)</Label>
                      <Textarea id="notes" placeholder="Add any additional information about this content..." value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={4} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="algo_tx">Algorand transaction ID (optional)</Label>
                      <Input id="algo_tx" placeholder="Paste txid here (if you paid on-chain)" value={formData.algo_tx} onChange={(e) => setFormData({ ...formData, algo_tx: e.target.value })} />
                      <p className="text-xs text-gray-500">If you submitted a payment from your wallet, paste the txid here so the backend can attach it to this registration. Leave empty to skip.</p>
                    </div>
                    <Alert className="bg-green-50 border-green-200"><Shield className="h-4 w-4 text-green-600" /><AlertDescription className="text-green-800">This metadata will be cryptographically signed with your wallet and stored on the blockchain</AlertDescription></Alert>
                  </CardContent>
                </Card>
              </motion.div>
            )}
            {registrationError && (<Alert variant="destructive" className="mt-6"><AlertCircle className="h-4 w-4" /><AlertDescription>{registrationError}</AlertDescription></Alert>)}
            {file && (
                unsignedTxnJSON ? (
                  <div className="space-y-2 mt-6">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
                      <p className="text-blue-800 font-medium">Action Required</p>
                      <p className="text-sm text-blue-700">A transaction has been prepared. Please sign it in your wallet to complete the registration.</p>
                    </div>
                    <Button type="button" size="lg" onClick={handleSignAndSubmit} disabled={isProcessing} className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 shadow-xl text-lg h-14">
                      {isProcessing ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Submitting...</>) : (<><Shield className="w-5 h-5 mr-2" /> Sign & Submit with Wallet</>)}
                    </Button>
                  </div>
                ) : (
                  <Button type="submit" size="lg" disabled={isProcessing || !formData.ai_model || !file} className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 shadow-xl text-lg h-14 mt-6">
                    {isProcessing ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...</>) : (<><Shield className="w-5 h-5 mr-2" /> Register & Prepare Transaction</>)}
                  </Button>
                )
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
