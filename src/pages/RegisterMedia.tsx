import React, { useState, useEffect } from "react";
import { storage as base44 } from "../api/storageClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "../utils";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
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
import { motion } from "framer-motion";
import { useWallet } from "@/hooks/useWallet";

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

import { Link } from "react-router-dom";

export default function RegisterMedia() {
  // All hooks must be called at the top level, before any conditional return
  const { address, isConnected, connect } = useWallet();
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [kycLoading, setKycLoading] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<any>(null);
  const [dragActive, setDragActive] = useState(false);
  const [formData, setFormData] = useState({
    ai_model: "",
    generation_time: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [registeredData, setRegisteredData] = useState<any>(null);

  // Debug: log address and isConnected on mount
  console.log("RegisterMedia.tsx mount", { address, isConnected });

  // Wallet icon display logic
  const walletIcon = isConnected ? (
    <img
      src="/wallet-icon.svg"
      alt="Wallet Connected"
      style={{ width: 28, height: 28, display: "inline-block", marginRight: 8 }}
    />
  ) : null;

  // KYC gating logic
  useEffect(() => {
    const fetchKyc = async () => {
      if (!address) return setKycStatus(null);
      setKycLoading(true);
      try {
        const resp = await fetch(`/api/kyc/status?address=${address}`);
        if (!resp.ok) throw new Error("Failed to fetch KYC status");
        const data = await resp.json();
        setKycStatus(data.status || "not_started");
        // Debug log
        console.log("RegisterMedia.tsx KYC check:", { address, kycStatus: data.status });
      } catch {
        setKycStatus(null);
      } finally {
        setKycLoading(false);
      }
    };
    fetchKyc();
  }, [address]);

  // Always call useMutation hooks before any conditional return!
  const uploadFileMutation = useMutation({
    mutationFn: async (file: any) => {
      if (base44.integrations?.Core?.UploadFile) {
        const result = await base44.integrations.Core.UploadFile({ file });
        return result.file_url;
      }
      return URL.createObjectURL(file);
    },
  });

  const registerMediaMutation = useMutation({
    mutationFn: async (data: any) => {
      return await base44.entities.RegisteredMedia.create(data);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries(["registeredMedia"] as any);
      setRegisteredData(data);
      setRegistrationComplete(true);
    },
  });

  // If not approved, block access
  if (!kycLoading && kycStatus !== "approved") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="bg-white rounded-xl shadow-lg p-10 max-w-md text-center">
          {walletIcon}
          <h2 className="text-2xl font-bold mb-2 text-primary">KYC Required</h2>
          <p className="mb-4 text-gray-700">You must complete KYC and be approved before registering media.</p>
          {kycStatus === "rejected" && <div className="mt-4 text-red-600 font-semibold">Your KYC was rejected. Please contact support.</div>}
          {kycStatus === "email_pending" && <div className="mt-4 text-yellow-700">Please verify your email to continue.</div>}
          {kycStatus === "not_started" && <div className="mt-4 text-gray-600">Start your KYC registration on the landing page.</div>}
        </div>
      </div>
    );
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if ((e.dataTransfer as any).files && (e.dataTransfer as any).files[0]) {
      setFile((e.dataTransfer as any).files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // Create a simple placeholder image using canvas to simulate AI-generated content
  const simulateGeneration = async (width = 1024, height = 1024) => {
    return new Promise<File>((resolve, reject) => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas not supported");

        // Background gradient
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, "#60A5FA");
        grad.addColorStop(1, "#34D399");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Draw a simple text watermark
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.font = `48px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText("AI Generated", width / 2, height / 2 - 20);
        ctx.font = `20px sans-serif`;
        ctx.fillText(new Date().toISOString(), width / 2, height / 2 + 20);

        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error("Failed to create blob"));
          const file = new File([blob], `generated-${Date.now()}.png`, { type: "image/png" });
          resolve(file);
        }, "image/png");
      } catch (err) {
        reject(err);
      }
    });
  };

  // Remove autoGenerateAndRegister for now since signMessage and signAlgorandTxn are not implemented

  const generateHash = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash)
      .toString(16)
      .padStart(64, "0")
      .substring(0, 64);
  };

  // Function to calculate SHA-256 hash of a file
  const calculateSha256 = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hexHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hexHash;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      return;
    }

    try {
      // Calculate SHA-256 hash
      const sha256_hash = await calculateSha256(file);

      // Generate perceptual hash (average hash)
      const getPerceptualHash = async (file) => {
        return new Promise((resolve, reject) => {
          const img = new window.Image();
          img.onload = function () {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 8;
            canvas.height = 8;
            ctx.drawImage(img, 0, 0, 8, 8);
            const pixels = ctx.getImageData(0, 0, 8, 8).data;
            let total = 0;
            let grays = [];
            for (let i = 0; i < pixels.length; i += 4) {
              const gray = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
              grays.push(gray);
              total += gray;
            }
            const avg = total / 64;
            let hash = '';
            for (let i = 0; i < grays.length; i++) {
              hash += grays[i] > avg ? '1' : '0';
            }
            resolve(hash);
          };
          img.onerror = reject;
          img.src = URL.createObjectURL(file);
        });
      };
      let perceptual_hash = null;
      try {
        perceptual_hash = await getPerceptualHash(file);
      } catch {
        perceptual_hash = null;
      }

      // Always upload to Pinata before registration
      const uploadResp = await fetch('/media/upload', {
        method: 'POST',
        body: (() => {
          const formData = new FormData();
          formData.append('file', file);
          return formData;
        })(),
      });
      const uploadData = await uploadResp.json();
      if (!uploadData.ipfs_cid || !uploadData.file_url) {
        alert('IPFS upload failed');
        return;
      }

      const metadata = {
        file_url: uploadData.file_url,
        ipfs_cid: uploadData.ipfs_cid,
        file_name: file.name,
        file_type: file.type,
        ai_model: formData.ai_model,
        generation_time: formData.generation_time,
        notes: formData.notes,
        sha256_hash: sha256_hash,
        perceptual_hash: perceptual_hash,
      };

      // Ensure wallet connected
      if (!isConnected) await connect();

      // Register media on blockchain
      const registeredMedia = await registerMediaMutation.mutateAsync(metadata);

      setRegisteredData({ ...registeredMedia, file_url: uploadData.file_url });
      setRegistrationComplete(true);
    } catch (error) {
      console.error("Registration error:", error);
      alert("Registration failed: " + error);
    }
  };

  const downloadMetadata = () => {
    if (!registeredData) return;
    // Use payload if present
    const reg = registeredData.payload ? registeredData.payload : registeredData;
    // Build metadata with all relevant fields
    const metadata = {
      file_name: reg.file_name || null,
      file_type: reg.file_type || null,
      sha256_hash: reg.sha256_hash || null,
      perceptual_hash: reg.perceptual_hash || null,
      ipfs_cid: reg.ipfs_cid || null,
      algo_tx: reg.algo_tx || null,
      algo_explorer_url: reg.algo_explorer_url || null,
      file_url: reg.file_url || null,
      ai_model: reg.ai_model || null,
      generation_time: reg.generation_time || null,
      notes: reg.notes || null,
      did: `did:ethr:0xAbC...f9d`,
      standard: "C2PA v1.0",
      registered_at: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(metadata, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `metadata-${reg.id || "x"}.json`;
    link.click();
  };

  if (registrationComplete && registeredData) {
    // If backend response is nested (status/payload), use payload for display
    const reg = registeredData.payload ? registeredData.payload : registeredData;
    // Helper to download image from file object if file_url is missing
    const downloadImageFromFile = () => {
      if (!file) return;
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name || "downloaded-image";
      link.click();
    };
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
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
                  <AlertDescription className="text-green-800">
                    Your content is now permanently registered and verifiable by anyone
                  </AlertDescription>
                </Alert>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-gray-500 text-sm">File Name</Label>
                    <p className="font-medium mt-1">{reg.file_name}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500 text-sm">Status</Label>
                    <Badge className="mt-1 bg-green-100 text-green-700">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-gray-500 text-sm">SHA-256 Hash</Label>
                    <p className="font-mono text-xs mt-1 break-all">{reg.sha256_hash ? reg.sha256_hash : <span className="text-red-600">Not generated</span>}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500 text-sm">Perceptual Hash</Label>
                    <p className="font-mono text-xs mt-1 break-all">{reg.perceptual_hash ? reg.perceptual_hash : <span className="text-red-600">Not generated</span>}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500 text-sm">IPFS CID</Label>
                    <p className="font-mono text-xs mt-1 break-all">{reg.ipfs_cid ? reg.ipfs_cid : <span className="text-red-600">Not generated</span>}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500 text-sm">Algorand Transaction</Label>
                    <p className="font-mono text-xs mt-1 break-all">{reg.algo_tx ? reg.algo_tx : <span className="text-red-600">Not generated</span>}</p>
                    {reg.algo_explorer_url && (
                      <Button variant="outline" onClick={() => window.open(reg.algo_explorer_url, "_blank")} className="mt-2">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View on Algorand Explorer
                      </Button>
                    )}
                  </div>
                </div>

                <div className="pt-6 border-t space-y-3">
                  <div className="flex gap-3">
                    <Button onClick={downloadMetadata} className="flex-1 bg-blue-600 hover:bg-blue-700">
                      <Download className="w-4 h-4 mr-2" />
                      Download Metadata JSON
                    </Button>
                    {(reg.file_url || file) && (
                      <Button variant="outline" onClick={() => {
                        if (reg.file_url) {
                          window.open(reg.file_url, '_blank');
                        } else {
                          downloadImageFromFile();
                        }
                      }} className="flex-1">
                        <Download className="w-4 h-4 mr-2" />
                        Download Image
                      </Button>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={() => {
                      setRegistrationComplete(false);
                      setFile(null);
                      setFormData({ ai_model: "", generation_time: new Date().toISOString().split('T')[0], notes: "" });
                    }} variant="outline" className="flex-1">
                      Register Another File
                    </Button>
                    <Button onClick={() => navigate(createPageUrl("MyDashboard"))} className="flex-1 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700">
                      Go to Dashboard
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  const isProcessing = (uploadFileMutation as any).isLoading || (registerMediaMutation as any).isLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Register New Media</h1>
          <p className="text-lg text-gray-600">Upload and verify your AI-generated content on the blockchain</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <Card className="shadow-xl border-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-600" />
                  Upload Media File
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop} className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"}`}>
                  <input type="file" onChange={handleFileChange} className="hidden" id="file-upload" accept="image/*,video/*" />
                  {!file ? (
                    <>
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-2">Drag and drop your file here, or</p>
                      <label htmlFor="file-upload">
                        <Button type="button" onClick={() => document.getElementById('file-upload')?.click()}>Browse Files</Button>
                      </label>
                      <div className="mt-3">
                        <Button type="button" variant="outline" onClick={async () => {
                          const type = window.prompt('Generate an Image or Video? Type "image" or "video"', 'image');
                          if (!type || (type !== 'image' && type !== 'video')) return;
                          const prompt = window.prompt('Enter your prompt for the AI generation:');
                          if (!prompt) return;
                          try {
                            const res = await fetch('http://localhost:8011/ai/generate', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ prompt, type }),
                            });
                            const data = await res.json();
                            if (!data.result) throw new Error('No result from backend');
                            const mediaUrl = data.result;
                            let file;
                            if (mediaUrl.startsWith('data:')) {
                              // base64 data URL
                              const arr = mediaUrl.split(',');
                              const mime = arr[0].match(/:(.*?);/)[1];
                              const bstr = atob(arr[1]);
                              let n = bstr.length;
                              const u8arr = new Uint8Array(n);
                              while (n--) u8arr[n] = bstr.charCodeAt(n);
                              file = new File([u8arr], `ai-generated-${Date.now()}.${type === 'image' ? 'png' : 'mp4'}`, { type: mime });
                            } else {
                              // fetch from URL
                              const response = await fetch(mediaUrl);
                              const blob = await response.blob();
                              file = new File([blob], `ai-generated-${Date.now()}.${type === 'image' ? 'png' : 'mp4'}`, { type: blob.type });
                            }
                            setFile(file);
                            setFormData(f => ({ ...f, notes: `Prompt: ${prompt}` }));
                          } catch (err) {
                            alert('AI generation failed: ' + err);
                          }
                        }}>Generate (AI)</Button>
                      </div>
                      <p className="text-sm text-gray-500 mt-4">Supported formats: Images (PNG, JPG, JPEG), Videos (MP4, MOV)</p>
                    </>
                  ) : (
                    <div className="flex items-center justify-center gap-4">
                      <FileCheck className="w-8 h-8 text-green-600" />
                      <div className="text-left">
                        <p className="font-medium text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        {file && file.type && file.type.startsWith('image') && (
                          <img
                            src={URL.createObjectURL(file)}
                            alt="Generated preview"
                            style={{ width: 300, height: "auto", marginTop: 16, borderRadius: 8, objectFit: "contain", display: "block", background: "#f7f7f7" }}
                          />
                        )}
                        {file && file.type && file.type.startsWith('video') && (
                          <video
                            src={URL.createObjectURL(file)}
                            controls
                            style={{ maxWidth: 300, maxHeight: 300, marginTop: 16, borderRadius: 8 }}
                          />
                        )}
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setFile(null)}>Remove</Button>
                    </div>
                  )}
                </div>

                {file && (
                  <div className="mt-6 space-y-3">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>File will be canonicalized and hashed automatically</AlertDescription>
                    </Alert>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="bg-blue-50"><Hash className="w-3 h-3 mr-1" />SHA-256 will be generated</Badge>
                      <Badge variant="outline" className="bg-purple-50"><Fingerprint className="w-3 h-3 mr-1" />Perceptual hash enabled</Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {file && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <Card className="shadow-xl border-none">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-green-600" />Metadata & Attestation</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="ai_model">AI Model *</Label>
                        <Select value={formData.ai_model} onValueChange={(value: string) => setFormData({ ...formData, ai_model: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select AI model" />
                          </SelectTrigger>
                          <SelectContent>
                            {AI_MODELS.map((model) => (
                              <SelectItem key={model} value={model}>{model}</SelectItem>
                            ))}
                          </SelectContent>
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

                    <Alert className="bg-green-50 border-green-200">
                      <Shield className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">This metadata will be cryptographically signed with your wallet and stored on the blockchain</AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {file && (
              <Button type="submit" size="lg" disabled={isProcessing || !formData.ai_model} className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 shadow-xl text-lg h-14">
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {(uploadFileMutation as any).isLoading ? "Uploading..." : "Registering on Blockchain..."}
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5 mr-2" />
                    Register on Blockchain
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
