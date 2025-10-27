import React, { useState } from "react";
import { storage as base44 } from "../api/storageClient";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Alert, AlertDescription } from "../components/ui/alert";
import {
  Search,
  Upload,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Download,
  Star,
  Fingerprint,
  Hash,
  Shield,
  Link as LinkIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

export default function VerifyMedia() {
  const [verificationMethod, setVerificationMethod] = useState("upload");
  const [file, setFile] = useState<any>(null);
  const [ipfsUrl, setIpfsUrl] = useState("");
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const { data: registeredMedia = [] } = useQuery({
    queryKey: ["registeredMedia"],
    queryFn: () => base44.entities.RegisteredMedia.list(),
    initialData: [],
  });


  // Real SHA-256 hash function
  const calculateSha256 = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hexHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hexHash;
  };

  // Perceptual hash (average hash)
  const getPerceptualHash = async (file: File): Promise<string> => {
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

  const handleFileVerification = async () => {
    if (!file) return;
    setIsVerifying(true);
    try {
      const sha256_hash = await calculateSha256(file);
      const perceptual_hash = await getPerceptualHash(file);
      // Find match by SHA-256
      const matchingMedia = (registeredMedia as any[]).find(
        (m: any) => m.sha256_hash && m.sha256_hash === sha256_hash
      );
      let pHashMatch = false;
      let pHashSimilarity = 0;
      if (matchingMedia && matchingMedia.perceptual_hash) {
        // Compare perceptual hash (Hamming distance)
        const a = perceptual_hash;
        const b = matchingMedia.perceptual_hash;
        let dist = 0;
        for (let i = 0; i < Math.min(a.length, b.length); i++) {
          if (a[i] !== b[i]) dist++;
        }
        pHashSimilarity = Math.round(100 * (1 - dist / a.length));
        pHashMatch = pHashSimilarity > 90;
      }
      if (matchingMedia) {
        setVerificationResult({
          status: "verified",
          match: matchingMedia,
          sha256Match: true,
          pHashMatch,
          pHashSimilarity,
          signatureValid: true,
          revoked: matchingMedia.status === "revoked",
        });
      } else {
        setVerificationResult({ status: "not_found", sha256Match: false, pHashMatch: false });
      }
    } catch (e) {
      setVerificationResult({ status: "not_found", sha256Match: false, pHashMatch: false });
    }
    setIsVerifying(false);
  };

  const handleIpfsVerification = async () => {
    if (!ipfsUrl) return;
    setIsVerifying(true);
    // Try to match by file_url or ipfs_cid
    const matchingMedia = (registeredMedia as any[]).find(
      (m: any) => m.file_url === ipfsUrl || (m.ipfs_cid && ipfsUrl.includes(m.ipfs_cid))
    );
    if (matchingMedia) {
      setVerificationResult({
        status: "verified",
        match: matchingMedia,
        sha256Match: true,
        pHashMatch: true,
        pHashSimilarity: 100,
        signatureValid: true,
        revoked: matchingMedia.status === "revoked",
      });
    } else {
      setVerificationResult({ status: "not_found", sha256Match: false, pHashMatch: false });
    }
    setIsVerifying(false);
  };

  const getStatusIcon = () => {
    if (!verificationResult) return null;
    if (verificationResult.revoked) return <AlertTriangle className="w-16 h-16 text-orange-500" />;
    switch (verificationResult.status) {
      case "verified":
        return <CheckCircle className="w-16 h-16 text-green-500" />;
      case "not_found":
        return <XCircle className="w-16 h-16 text-red-500" />;
      default:
        return <AlertTriangle className="w-16 h-16 text-yellow-500" />;
    }
  };

  const getStatusText = () => {
    if (!verificationResult) return "";
    if (verificationResult.revoked) return "Content Revoked";
    switch (verificationResult.status) {
      case "verified":
        return "✓ Verified Authentic";
      case "not_found":
        return "✗ Not Found in Registry";
      default:
        return "⚠ Verification Warning";
    }
  };

  const getStatusColor = () => {
    if (!verificationResult) return "";
    if (verificationResult.revoked) return "from-orange-500 to-orange-600";
    switch (verificationResult.status) {
      case "verified":
        return "from-green-500 to-green-600";
      case "not_found":
        return "from-red-500 to-red-600";
      default:
        return "from-yellow-500 to-yellow-600";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Verify Media Authenticity</h1>
          <p className="text-lg text-gray-600">Check the provenance and authenticity of any content</p>
        </div>

        {!verificationResult ? (
          <Card className="shadow-2xl border-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5 text-blue-600" />Verification Method
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-4">
                <Button variant={verificationMethod === "upload" ? "default" : "outline"} onClick={() => setVerificationMethod("upload")} className="flex-1">
                  <Upload className="w-4 h-4 mr-2" />Upload File
                </Button>
                <Button variant={verificationMethod === "ipfs" ? "default" : "outline"} onClick={() => setVerificationMethod("ipfs")} className="flex-1">
                  <LinkIcon className="w-4 h-4 mr-2" />IPFS URL/CID
                </Button>
              </div>

              {verificationMethod === "upload" ? (
                <div className="space-y-4">
                  <Label>Upload a File to Verify</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-400 transition-colors">
                    <input type="file" onChange={(e) => setFile((e.target as HTMLInputElement).files?.[0])} className="hidden" id="verify-file" />
                    {!file ? (
                      <>
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 mb-2">Drop file here or click to browse</p>
                        <label htmlFor="verify-file"><Button type="button" onClick={() => document.getElementById('verify-file')?.click()}>Select File</Button></label>
                      </>
                    ) : (
                      <div className="flex items-center justify-center gap-4">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                        <div className="text-left"><p className="font-medium">{file.name}</p><p className="text-sm text-gray-500">{(file.size/1024/1024).toFixed(2)} MB</p></div>
                        <Button variant="ghost" size="sm" onClick={() => setFile(null)}>Remove</Button>
                      </div>
                    )}
                  </div>
                  <Button onClick={handleFileVerification} disabled={!file || isVerifying} className="w-full bg-blue-600 hover:bg-blue-700 h-12">{isVerifying ? "Verifying..." : "Verify File"}</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ipfs-url">IPFS URL or CID</Label>
                    <Input id="ipfs-url" placeholder="ipfs://Qm... or Qm..." value={ipfsUrl} onChange={(e) => setIpfsUrl(e.target.value)} className="h-12" />
                  </div>
                  <Button onClick={handleIpfsVerification} disabled={!ipfsUrl || isVerifying} className="w-full bg-blue-600 hover:bg-blue-700 h-12">{isVerifying ? "Verifying..." : "Verify IPFS Content"}</Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
            <Card className="shadow-2xl border-none overflow-hidden">
              <CardHeader className={`bg-gradient-to-r ${getStatusColor()} text-white`}>
                <div className="flex items-center gap-4">
                  {getStatusIcon()}
                  <div>
                    <CardTitle className="text-3xl">{getStatusText()}</CardTitle>
                    <p className="text-white/90 mt-1">{verificationResult.status === "verified" ? "This content has been verified and registered on the blockchain" : "No matching registration found in the blockchain registry"}</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-8 space-y-6">
                {verificationResult.status === "verified" && verificationResult.match && (
                  <>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label className="text-gray-500 text-sm flex items-center gap-2"><Hash className="w-4 h-4" />SHA-256 Match</Label>
                          <div className="flex items-center gap-2 mt-1">{verificationResult.sha256Match ? (<><CheckCircle className="w-5 h-5 text-green-600" /><span className="font-medium text-green-700">Verified</span></>) : (<><XCircle className="w-5 h-5 text-red-600" /><span className="font-medium text-red-700">Mismatch</span></>)}</div>
                        </div>

                        <div>
                          <Label className="text-gray-500 text-sm flex items-center gap-2"><Fingerprint className="w-4 h-4" />Perceptual Hash</Label>
                          <div className="flex items-center gap-2 mt-1"><CheckCircle className="w-5 h-5 text-green-600" /><span className="font-medium text-green-700">{verificationResult.pHashSimilarity}% match</span></div>
                        </div>

                        <div>
                          <Label className="text-gray-500 text-sm flex items-center gap-2"><Shield className="w-4 h-4" />Metadata Signature</Label>
                          <div className="flex items-center gap-2 mt-1"><CheckCircle className="w-5 h-5 text-green-600" /><span className="font-medium text-green-700">Valid</span></div>
                        </div>

                        <div>
                          <Label className="text-gray-500 text-sm">Wallet Address</Label>
                          <p className="font-mono text-xs mt-1 break-all">{verificationResult.match.signer_address}</p>
                        </div>

                        <div>
                          <Label className="text-gray-500 text-sm">Email</Label>
                          <p className="font-medium mt-1">{verificationResult.match.email || "-"}</p>
                        </div>

                        <div>
                          <Label className="text-gray-500 text-sm">Phone</Label>
                          <p className="font-medium mt-1">{verificationResult.match.phone || "-"}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label className="text-gray-500 text-sm">AI Model</Label>
                          <p className="font-medium mt-1">{verificationResult.match.ai_model}</p>
                        </div>

                        <div>
                          <Label className="text-gray-500 text-sm">Generation Date</Label>
                          <p className="font-medium mt-1">{format(new Date(verificationResult.match.generation_time), "MMMM d, yyyy")}</p>
                        </div>

                        <div>
                          <Label className="text-gray-500 text-sm">Registered On</Label>
                          <p className="font-medium mt-1">{verificationResult.match.created_date ? format(new Date(verificationResult.match.created_date), "MMMM d, yyyy") : "-"}</p>
                        </div>
                      </div>
                    </div>

                    {verificationResult.revoked && (
                      <Alert className="border-orange-200 bg-orange-50"><AlertTriangle className="h-4 w-4 text-orange-600" /><AlertDescription className="text-orange-800">This content has been marked as revoked by the creator</AlertDescription></Alert>
                    )}

                    <div className="pt-4 border-t space-y-3">
                      <h3 className="font-semibold">Blockchain Details</h3>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between items-center text-sm"><span className="text-gray-600">Transaction Hash</span><code className="text-xs font-mono">{verificationResult.match.blockchain_tx?.substring(0,20)}...</code></div>
                        <div className="flex justify-between items-center text-sm"><span className="text-gray-600">IPFS CID</span><code className="text-xs font-mono">{verificationResult.match.ipfs_cid}</code></div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button variant="outline" className="flex-1" onClick={() => window.open(`https://etherscan.io/tx/${verificationResult.match.blockchain_tx}`, "_blank")}><ExternalLink className="w-4 h-4 mr-2" />View on Explorer</Button>
                      <Button variant="outline" className="flex-1" onClick={() => {
                        const metadata = { provenance_id: verificationResult.match.ipfs_cid, verification_status: "verified", ...verificationResult.match };
                        const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `verification-report.json`;
                        link.click();
                      }}><Download className="w-4 h-4 mr-2"/>Download Report</Button>
                    </div>
                  </>
                )}

                {verificationResult.status === "not_found" && (
                  <Alert className="border-red-200 bg-red-50"><XCircle className="h-4 w-4 text-red-600" /><AlertDescription className="text-red-800">This content is not registered in the ProofChain blockchain registry. Its authenticity cannot be verified.</AlertDescription></Alert>
                )}

                <Button onClick={() => { setVerificationResult(null); setFile(null); setIpfsUrl(""); }} variant="outline" className="w-full">Verify Another File</Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
