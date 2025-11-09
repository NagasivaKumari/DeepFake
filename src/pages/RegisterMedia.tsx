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
  Fingerprint
} from "lucide-react";
import { motion } from "framer-motion";

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
  "Other"
];

export default function RegisterMedia() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [formData, setFormData] = useState({
    ai_model: "",
    generation_time: new Date().toISOString().split('T')[0],
    notes: ""
  });
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [registeredData, setRegisteredData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      return;
    }
    setIsProcessing(true);

    try {
      const uploadData = new FormData();
      uploadData.append('file', file);
      uploadData.append('ai_model', formData.ai_model);
      uploadData.append('generation_time', formData.generation_time);
      uploadData.append('notes', formData.notes);

      const registrationData = await storageClient.entities.RegisteredMedia.create(uploadData);
      
      setRegisteredData(registrationData);
      setRegistrationComplete(true);
      
    } catch (error) {
      console.error("Registration error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadMetadata = () => {
    const metadata = {
      ...registeredData,
      did: `did:ethr:0xAbC...f9d`,
      standard: "C2PA v1.0",
      registered_at: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `metadata-${registeredData.id}.json`;
    link.click();
  };

  if (registrationComplete && registeredData) {
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
                    <p className="font-medium mt-1">{registeredData.file_name}</p>
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
                    <p className="font-mono text-xs mt-1 break-all">{registeredData.sha256_hash ? registeredData.sha256_hash.substring(0, 32) : ""}...</p>
                  </div>
                  <div>
                    <Label className="text-gray-500 text-sm">Perceptual Hash</Label>
                    <p className="font-mono text-xs mt-1 break-all">{registeredData.perceptual_hash ? registeredData.perceptual_hash.substring(0, 32) : ""}...</p>
                  </div>
                  <div>
                    <Label className="text-gray-500 text-sm">IPFS CID</Label>
                    <p className="font-mono text-xs mt-1 break-all">{registeredData.ipfs_cid}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500 text-sm">Blockchain Transaction</Label>
                    <p className="font-mono text-xs mt-1 break-all">{registeredData.blockchain_tx ? registeredData.blockchain_tx.substring(0, 20) : ""}...</p>
                  </div>
                </div>

                <div className="pt-6 border-t space-y-3">
                  <div className="flex gap-3">
                    <Button
                      onClick={downloadMetadata}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Metadata JSON
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => window.open(`https://etherscan.io/tx/${registeredData.blockchain_tx}`, '_blank')}
                      className="flex-1"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View on Explorer
                    </Button>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button
                      onClick={() => {
                        setRegistrationComplete(false);
                        setFile(null);
                        setFormData({
                          ai_model: "",
                          generation_time: new Date().toISOString().split('T')[0],
                          notes: ""
                        });
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Register Another File
                    </Button>
                    <Button
                      onClick={() => navigate(createPageUrl("MyDashboard"))}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
                    >
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Register New Media</h1>
          <p className="text-lg text-gray-600">Upload and verify your AI-generated content on the blockchain</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Upload Section */}
            <Card className="shadow-xl border-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-600" />
                  Upload Media File
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
                    dragActive
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                    accept="image/*,video/*"
                  />
                  {!file ? (
                    <>
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-2">
                        Drag and drop your file here, or
                      </p>
                      <label htmlFor="file-upload">
                        <Button type="button" onClick={() => document.getElementById('file-upload').click()}>
                          Browse Files
                        </Button>
                      </label>
                      <p className="text-sm text-gray-500 mt-4">
                        Supported formats: Images (PNG, JPG, JPEG), Videos (MP4, MOV)
                      </p>
                    </>
                  ) : (
                    <div className="flex items-center justify-center gap-4">
                      <FileCheck className="w-8 h-8 text-green-600" />
                      <div className="text-left">
                        <p className="font-medium text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFile(null)}
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </div>

                {file && (
                  <div className="mt-6 space-y-3">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        File will be canonicalized and hashed automatically
                      </AlertDescription>
                    </Alert>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="bg-blue-50">
                        <Hash className="w-3 h-3 mr-1" />
                        SHA-256 will be generated
                      </Badge>
                      <Badge variant="outline" className="bg-purple-50">
                        <Fingerprint className="w-3 h-3 mr-1" />
                        Perceptual hash enabled
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Metadata Section */}
            {file && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="shadow-xl border-none">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-green-600" />
                      Metadata & Attestation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="ai_model">AI Model *</Label>
                        <Select
                          value={formData.ai_model}
                          onValueChange={(value) => setFormData({...formData, ai_model: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select AI model" />
                          </SelectTrigger>
                          <SelectContent>
                            {AI_MODELS.map(model => (
                              <SelectItem key={model} value={model}>{model}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="generation_time">Generation Date</Label>
                        <Input
                          id="generation_time"
                          type="date"
                          value={formData.generation_time}
                          onChange={(e) => setFormData({...formData, generation_time: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Add any additional information about this content..."
                        value={formData.notes}
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                        rows={4}
                      />
                    </div>

                    <Alert className="bg-green-50 border-green-200">
                      <Shield className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        This metadata will be cryptographically signed with your wallet and stored on the blockchain
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Submit Button */}
            {file && (
              <Button
                type="submit"
                size="lg"
                disabled={isProcessing || !formData.ai_model}
                className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 shadow-xl text-lg h-14"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Registering...
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