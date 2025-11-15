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
import storageClient from "@/api/storageClient";
import { useWallet } from "@/hooks/useWallet";
import { 
  Upload, 
  FileCheck, 
  Shield, 
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react";
import LuteConnect from "lute-connect";

const AI_MODELS = [
  "Stable Diffusion v1.5",
  "DALL-E 2",
  "Midjourney v5",
  "Custom Model",
  "Other"
];

export default function RegisterMedia() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [formData, setFormData] = useState({
    ai_model: "",
    notes: ""
  });
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const wallet = useWallet();

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) return;
    
    setIsProcessing(true);
    setRegistrationError(null);

    try {
      // Connect wallet if not connected
      if (!wallet?.address) {
        await wallet.connect();
      }

      // Upload file
      const uploadResp = await storageClient.integrations.Core.UploadFile({ file });
      
      // Simple payment: deduct 1 ALGO from user wallet
      const lute = new LuteConnect("ProofChain");
      const recipientAddr = 'SL5PBMXBUSOP5IBJDL6ZKB5KSCXV5NGF6KRBZS37UPWRSXKV6GXJZAWQYM';
      const amount = 1000000; // 1 ALGO in microAlgos
      
      const txnResult = await lute.sendPayment({
        to: recipientAddr,
        amount: amount,
        note: 'ProofChain registration fee'
      });
      
      // Register with backend
      const registrationPayload = {
        file_url: uploadResp.file_url,
        file_name: file.name,
        ai_model: formData.ai_model,
        notes: formData.notes,
        algo_tx: txnResult.txId,
        signer_address: wallet.address
      };

      const resp = await fetch('/media/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationPayload),
      });

      if (resp.ok) {
        alert('Registration successful!');
        navigate(createPageUrl("MyDashboard"));
      } else {
        throw new Error('Registration failed');
      }
      
    } catch (error) {
      console.error("Registration error:", error);
      setRegistrationError('Registration failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Register Media</h1>
          <p className="text-lg text-gray-600">Upload your content and pay 1 ALGO to register</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upload File</CardTitle>
              </CardHeader>
              <CardContent>
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="w-full p-2 border rounded"
                  accept="image/*,video/*"
                  required
                />
                {file && (
                  <div className="mt-2 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-green-600" />
                    <span className="text-sm">{file.name}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
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

                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add notes about this content..."
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {registrationError && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {registrationError}
                </AlertDescription>
              </Alert>
            )}

            {file && (
              <Button
                type="submit"
                size="lg"
                disabled={isProcessing || !formData.ai_model}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Pay 1 ALGO & Register
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