import React, { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Upload,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Download,
  Fingerprint,
  Hash,
  Link as LinkIcon,
} from "lucide-react";

import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Alert, AlertDescription } from "../components/ui/alert";
import ProvenanceGraph, { LineageGraph } from "../components/ProvenanceGraph";

type MatchItem = {
  unique_reg_key?: string | null;
  signer_address?: string | null;
  file_url?: string | null;
  ipfs_cid?: string | null;
  similarity?: number | null;
};

type ExactMatch = {
  unique_reg_key?: string | null;
  signer_address?: string | null;
  file_url?: string | null;
  ipfs_cid?: string | null;
  sha256_hash?: string | null;
  algo_tx?: string | null;
};

type Classification = {
  status: "exact_registered" | "derivative" | "unregistered";
  query_sha256: string | null;
  canonical_strategy: string;
  exact_match: ExactMatch | null;
  best_match: MatchItem | null;
  similarity_threshold: number;
  matches?: MatchItem[] | null;
  lineage_graph?: LineageGraph | null;
};

type CompareResult = Record<string, unknown> | null;

type StatusMeta = {
  icon: React.ReactNode;
  text: string;
  gradient: string;
  tone: string;
};

const buildStatusMeta = (status: Classification["status"] | null): StatusMeta => {
  switch (status) {
    case "exact_registered":
      return {
        icon: <CheckCircle className="w-16 h-16 text-green-500" />,
        text: "Exact Registered",
        gradient: "from-green-500 to-green-600",
        tone: "green",
      };
    case "derivative":
      return {
        icon: <Fingerprint className="w-16 h-16 text-yellow-500" />,
        text: "Derivative / Altered",
        gradient: "from-yellow-400 to-yellow-600",
        tone: "yellow",
      };
    case "unregistered":
    default:
      return {
        icon: <XCircle className="w-16 h-16 text-red-500" />,
        text: "Unregistered",
        gradient: "from-red-500 to-red-600",
        tone: "red",
      };
  }
};

const formatPercent = (value?: number | null) => {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  const pct = value > 1 ? value : value * 100;
  return `${pct.toFixed(2)}%`;
};

const VerifyMedia: React.FC = () => {
  const [method, setMethod] = useState<"upload" | "ipfs">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [cid, setCid] = useState<string>("");
  const [result, setResult] = useState<Classification | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [compareResult, setCompareResult] = useState<CompareResult>(null);
  const [comparing, setComparing] = useState<boolean>(false);
  const [summaryData, setSummaryData] = useState(null);

  const statusMeta = useMemo(() => buildStatusMeta(result?.status ?? null), [result]);
  const matches = useMemo(() => (result?.matches ? result.matches.filter(Boolean) : []), [result]);

  const classify = async (query: string, formData?: FormData) => {
    setLoading(true);
    setError(null);
    setCompareResult(null);
    try {
      const response = await fetch(`/media/classify?${query}`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Classification failed");
      }
      const data: Classification = await response.json();
      setResult(data);
    } catch (err: unknown) {
      setResult(null);
      if (err instanceof Error) {
        setError(err.message || "Unable to classify media");
      } else {
        setError("Unable to classify media");
      }
    } finally {
      setLoading(false);
    }
  };

  const classifyByFile = async () => {
    if (!file) return;
    const params = new URLSearchParams({
      canonicalize: "true",
      similarity_threshold: "0.92",
      include_matches: "true",
      include_graph: "true",
      graph_top_k: "8",
    });
    const form = new FormData();
    form.append("suspect", file);
    await classify(params.toString(), form);
  };

  const classifyByCid = async () => {
    if (!cid.trim()) return;
    const params = new URLSearchParams({
      ipfs_cid: cid.trim(),
      canonicalize: "true",
      include_matches: "true",
      similarity_threshold: "0.92",
      include_graph: "true",
      graph_top_k: "8",
    });
    await classify(params.toString());
  };

  const getExplorerUrl = (txn?: string | null) =>
    txn ? `https://lora.algokit.io/testnet/transaction/${txn}` : null;

  const downloadReport = () => {
    if (!result) return;
    const payload = {
      generated_at: new Date().toISOString(),
      classification: result,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "verification-report.json";
    link.click();
  };

  const handleCompare = async () => {
    if (!result) return;
    const targetCid = result.exact_match?.ipfs_cid || result.best_match?.ipfs_cid;
    if (!targetCid) {
      alert("No registered target available for comparison.");
      return;
    }

    setComparing(true);
    try {
      const form = new FormData();
      if (file) {
        form.append("suspect", file);
      } else if (result.exact_match?.file_url) {
        const resp = await fetch(result.exact_match.file_url);
        const blob = await resp.blob();
        form.append("suspect", new File([blob], "suspect", { type: blob.type }));
      } else {
        alert("Provide the suspect file to run comparison.");
        setComparing(false);
        return;
      }
      form.append("ipfs_cid", targetCid);
      const resp = await fetch("/media/compare", { method: "POST", body: form });
      if (!resp.ok) throw new Error(await resp.text());
      setCompareResult(await resp.json());
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message || "Comparison failed");
      } else {
        alert("Comparison failed");
      }
    } finally {
      setComparing(false);
    }
  };

  const reset = () => {
    setResult(null);
    setFile(null);
    setCid("");
    setCompareResult(null);
    setError(null);
  };

  const fetchSummaryData = async () => {
    try {
      const response = await fetch(`/media/visualization_summary?similarity_threshold=0.9`);
      if (!response.ok) {
        throw new Error("Failed to fetch summary data");
      }
      const data = await response.json();
      setSummaryData(data.summary);
    } catch (err) {
      setError(err.message || "Unable to fetch summary data");
    }
  };

  useEffect(() => {
    fetchSummaryData();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 py-12 px-4 overflow-hidden" style={{ paddingTop: "148.8px" }}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">Verify Media Authenticity</h1>
          <p className="text-lg text-gray-600">Check provenance, lineage, and near-duplicate relationships for any asset.</p>
        </div>

        {error && (
          <Alert variant="destructive" className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        )}

        {!result ? (
          <Card className="shadow-2xl border-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5 text-blue-600" />Verification Method
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 px-8">
              <div className="flex gap-2">
                <Button
                  variant={method === "upload" ? "default" : "outline"}
                  onClick={() => setMethod("upload")}
                  className="flex flex-1 items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload File</span>
                </Button>
                <Button
                  variant={method === "ipfs" ? "default" : "outline"}
                  onClick={() => setMethod("ipfs")}
                  className="flex flex-1 items-center justify-center gap-2"
                >
                  <LinkIcon className="w-4 h-4" />
                  <span>IPFS CID</span>
                </Button>
              </div>
              {method === "upload" ? (
                <div className="space-y-4 pt-4">
                  <Label htmlFor="file-upload" className="text-gray-700">
                    Upload file to verify
                  </Label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept="image/*,video/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  <Button
                    className="w-full mt-2"
                    disabled={!file || loading}
                    onClick={classifyByFile}
                  >
                    {loading ? "Verifying..." : "Verify"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 pt-4">
                  <Label htmlFor="cid-input" className="text-gray-700">
                    Enter IPFS CID to verify
                  </Label>
                  <Input
                    id="cid-input"
                    type="text"
                    placeholder="Qm..."
                    value={cid}
                    onChange={(e) => setCid(e.target.value)}
                  />
                  <Button
                    className="w-full mt-2"
                    disabled={!cid.trim() || loading}
                    onClick={classifyByCid}
                  >
                    {loading ? "Verifying..." : "Verify"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.45 }}>
            <Card className="shadow-2xl border-none overflow-hidden">
              <CardHeader className={`bg-gradient-to-r ${statusMeta.gradient} text-white`}>
                <div className="flex items-center gap-4">
                  {statusMeta.icon}
                  <div>
                    <CardTitle className="text-3xl">{statusMeta.text}</CardTitle>
                    <p className="text-white/90 mt-1">Decision based on canonical hash and embedding similarity.</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-gray-500 text-sm flex items-center gap-2">
                        <Hash className="w-4 h-4" />Canonical SHA-256
                      </Label>
                      <p className="font-mono text-xs mt-1 break-all">{result.query_sha256 || "—"}</p>
                      <p className="text-xs text-gray-500 mt-1">Canonical strategy: {result.canonical_strategy}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500 text-sm">Similarity Threshold</Label>
                      <p className="text-sm text-gray-700">{formatPercent(result.similarity_threshold)}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {result.exact_match ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-green-800">Registered Asset</span>
                          <Badge className="bg-green-600 text-white">Exact</Badge>
                        </div>
                        <div className="text-xs text-gray-700 space-y-1">
                          <div>Unique key: <span className="font-mono break-all">{result.exact_match.unique_reg_key || "—"}</span></div>
                          <div>Signer: <span className="break-all">{result.exact_match.signer_address || "—"}</span></div>
                          <div>IPFS CID: <span className="font-mono break-all">{result.exact_match.ipfs_cid || "—"}</span></div>
                          <div>Algo Tx: <span className="font-mono break-all">{result.exact_match.algo_tx || "—"}</span></div>
                        </div>
                      </div>
                    ) : result.best_match ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-yellow-800">Closest Registered Asset</span>
                          <Badge className="bg-yellow-500 text-white">Similarity {formatPercent(result.best_match.similarity)}</Badge>
                        </div>
                        <div className="text-xs text-gray-700 space-y-1">
                          <div>Unique key: <span className="font-mono break-all">{result.best_match.unique_reg_key || "—"}</span></div>
                          <div>Signer: <span className="break-all">{result.best_match.signer_address || "—"}</span></div>
                          <div>IPFS CID: <span className="font-mono break-all">{result.best_match.ipfs_cid || "—"}</span></div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
                        <div className="flex items-center gap-2 text-red-700">
                          <AlertTriangle className="w-4 h-4" />
                          <span>No registered asset or high-similarity derivative found.</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {matches.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900">Top Similar Registrations</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                          <tr>
                            <th className="px-3 py-2 text-left">Similarity</th>
                            <th className="px-3 py-2 text-left">Unique Reg Key</th>
                            <th className="px-3 py-2 text-left">Signer</th>
                            <th className="px-3 py-2 text-left">IPFS CID</th>
                          </tr>
                        </thead>
                        <tbody>
                          {matches.map((match) => (
                            <tr key={`${match.unique_reg_key}-${match.ipfs_cid}`} className="border-b last:border-0">
                              <td className="px-3 py-2 whitespace-nowrap">{formatPercent(match.similarity)}</td>
                              <td className="px-3 py-2 text-xs font-mono break-all">{match.unique_reg_key || "—"}</td>
                              <td className="px-3 py-2 text-xs break-all">{match.signer_address || "—"}</td>
                              <td className="px-3 py-2 text-xs font-mono break-all">{match.ipfs_cid || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {result.lineage_graph && <ProvenanceGraph graph={result.lineage_graph} />}

                {compareResult && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-900">Comparison Ensemble Result</h3>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm space-y-1">
                      {Object.entries(compareResult).map(([key, value]) => (
                        <div key={key} className="flex justify-between gap-4">
                          <span className="text-gray-600">{key}</span>
                          <span className="font-mono text-xs break-all">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-col md:flex-row gap-3 pt-4">
                  <Button variant="outline" className="w-full md:w-auto" onClick={downloadReport}>
                    <Download className="w-4 h-4 mr-2" />Download Report
                  </Button>
                  {(result.exact_match || result.best_match) && (
                    <Button variant="outline" className="w-full md:w-auto" onClick={handleCompare} disabled={comparing}>
                      <Fingerprint className="w-4 h-4 mr-2" />
                      {comparing ? "Comparing..." : "Run Byte-Level Compare"}
                    </Button>
                  )}
                  {result.exact_match?.algo_tx && (
                    <Button
                      variant="outline"
                      className="w-full md:w-auto"
                      onClick={() => {
                        const url = getExplorerUrl(result.exact_match?.algo_tx ?? null);
                        if (url) {
                          window.open(url, "_blank");
                        }
                      }}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Transaction
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default VerifyMedia;