import React, { useEffect, useState } from "react";
import storageClient from "@/api/storageClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Button from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  FileText,
  AlertTriangle,
  ExternalLink,
  Calendar,
  Star,
  Award,
  Trash2
} from "lucide-react";
import { format, isValid } from "date-fns";
import { motion } from "framer-motion";
import { useWallet } from "@/hooks/useWallet";

async function fetchReputationScore() {
  // Replace with actual API call
  return "4.8";
}

type RegisteredMediaType = {
  file_name?: string;
  created_date?: string | Date;
  ai_model?: string;
  unique_reg_key?: string;
  sha256_hash?: string;
  perceptual_hash?: string;
  ipfs_cid?: string;
  file_url?: string;
  algo_tx?: string;
  status?: string;
  signer_address?: string;
  owner_address?: string;
  address?: string;
};

export default function MyDashboard() {
  const { address, isConnected } = useWallet();
  const queryClient = useQueryClient();
  
  const { data: registeredMedia = [] } = useQuery({
    queryKey: ['registeredMedia'],
    queryFn: () => storageClient.entities.RegisteredMedia.list('-created_date'),
    initialData: []
  });

  const { data: reputationScore, isLoading: isLoadingReputation } = useQuery({
    queryKey: ['reputationScore'],
    queryFn: fetchReputationScore,
  });

  const revokeMediaMutation = useMutation({
    mutationFn: async (arg) => {
      // arg can be { id, status }
      const { id, status } = typeof arg === 'object' ? arg : { id: arg, status: 'revoked' };
      console.log(`Status change mutation called for id: ${id}, status: ${status}`);
      try {
        const result = await storageClient.entities.RegisteredMedia.update(id, { status });
        console.log('Backend response:', result);
        return result;
      } catch (err) {
        console.error('Backend error:', err);
        throw err;
      }
    },
    onSuccess: (data) => {
      console.log('Revoke mutation success:', data);
      queryClient.invalidateQueries({ queryKey: ['registeredMedia'] });
      if (data && data.error) {
        alert('Failed to revoke: ' + data.error);
        return;
      }
      // Accept new backend format: { updated: [ ... ] }
      if (data && Array.isArray(data.updated)) {
        const allRevoked = data.updated.every((item) => item.status === 'revoked');
        if (!allRevoked) {
          alert('Some items were not revoked as expected.');
        }
        // Otherwise, treat as success (no alert)
        return;
      }
      // Fallback for legacy/single object
      if (data && data.status !== 'revoked') {
        alert('Failed to revoke: Unexpected response: ' + JSON.stringify(data));
      }
    },
    onError: (error) => {
      console.error('Revoke mutation error:', error);
      alert('Failed to revoke: ' + (error?.message || error));
    }
  });

  // Only show media for connected wallet (use signer_address for Algorand/Lute wallet)
  const filteredMedia = isConnected && address
    ? registeredMedia.filter(m => (m.signer_address || m.owner_address || m.address) === address)
    : [];
  const verifiedMedia = filteredMedia.filter(m => m.status === 'verified');
  const pendingMedia = filteredMedia.filter(m => m.status === 'pending');
  const revokedMedia = filteredMedia.filter(m => m.status === 'revoked');

  const getStatusBadge = (status) => {
    const styles = {
      verified: "bg-green-100 text-green-700",
      pending: "bg-yellow-100 text-yellow-700",
      revoked: "bg-red-100 text-red-700"
    };
    return styles[status] || styles.verified;
  };


  // Helper to copy text to clipboard
    const handleCopy = (text: string) => {
      navigator.clipboard.writeText(text);
    };
  
    // Helper to safely format dates
    const safeFormat = (dateValue: string | Date, fmt: string) => {
      const d = new Date(dateValue);
      return isValid(d) ? format(d, fmt) : "-";
    };
  
    // Helper to get the correct ID for PATCH and keys (use sha256_hash)
    const getMediaId = (media: RegisteredMediaType, idx: number) => media.sha256_hash || idx;
  
    const getExplorerUrl = (txn: string | undefined) => txn ? `https://lora.algokit.io/testnet/transaction/${txn}` : null;
  
    const MediaCard = ({ media, idx }: { media: RegisteredMediaType; idx: number }) => (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">{media.file_name}</h3>
                <p className="text-sm text-gray-500">
                  <code className="text-xs break-all">{media.unique_reg_key ? media.unique_reg_key : '—'}</code>
                  {media.unique_reg_key && (
                    <Button size="icon" variant="ghost" className="p-1" title="Copy Registration Key" onClick={() => handleCopy(media.unique_reg_key!)}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8M8 12h8m-7 8h6a2 2 0 002-2V6a2 2 0 00-2-2H8a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </Button>
                  )}
                </p>
              </div>
            </div>

          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">AI Model</span>
              <span className="font-medium">{media.ai_model}</span>
            </div>
            <div className="flex justify-between text-sm items-center gap-2">
              <span className="text-gray-600">Registration Key</span>
              <span className="flex items-center gap-1">
                <code className="text-xs break-all">{media.unique_reg_key ? media.unique_reg_key : '—'}</code>
                {media.unique_reg_key && (
                  <Button size="icon" variant="ghost" className="p-1" title="Copy Registration Key" onClick={() => handleCopy(media.unique_reg_key!)}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8M8 12h8m-7 8h6a2 2 0 002-2V6a2 2 0 00-2-2H8a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </Button>
                )}
              </span>
            </div>
            <div className="flex justify-between text-sm items-center gap-2">
              <span className="text-gray-600">SHA-256</span>
              <span className="flex items-center gap-1">
                <code className="text-xs break-all">{media.sha256_hash ? media.sha256_hash : 'Not generated'}</code>
                {media.sha256_hash && (
                  <Button size="icon" variant="ghost" className="p-1" title="Copy SHA-256" onClick={() => handleCopy(media.sha256_hash)}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8M8 12h8m-7 8h6a2 2 0 002-2V6a2 2 0 00-2-2H8a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </Button>
                )}
              </span>
            </div>
            <div className="flex justify-between text-sm items-center gap-2">
              <span className="text-gray-600">Perceptual Hash</span>
              <code className="text-xs break-all">{media.perceptual_hash ? media.perceptual_hash : 'Not generated'}</code>
            </div>
            <div className="flex justify-between text-sm items-center gap-2">
              <span className="text-gray-600">IPFS CID</span>
              <span className="flex items-center gap-1">
                {media.ipfs_cid ? (
                  <>
                    {/* Use the same resolved image URL as the View Image button so CID link opens the same gateway */}
                    {(() => {
                      const resolvedUrl = media.file_url ? media.file_url : `https://ipfs.io/ipfs/${media.ipfs_cid}`;
                      return (
                        <a href={resolvedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs">
                          {media.ipfs_cid.substring(0, 12) + '...'}
                        </a>
                      );
                    })()}
                    <Button size="icon" variant="ghost" className="p-1" title="Copy CID" onClick={() => handleCopy(media.ipfs_cid)}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8M8 12h8m-7 8h6a2 2 0 002-2V6a2 2 0 00-2-2H8a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </Button>
                  </>
                ) : (
                  <span className="text-xs text-gray-400">Not generated</span>
                )}
              </span>
            </div>
            <div className="flex justify-between text-sm items-center gap-2">
              <span className="text-gray-600">Algorand Txn</span>
              <span className="flex items-center gap-1">
                {media.algo_tx ? (
                  <>
                    <a href={getExplorerUrl(media.algo_tx)} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs">
                      {media.algo_tx.substring(0, 10) + '...'}
                    </a>
                    <Button size="icon" variant="ghost" className="p-1" title="Copy Txn ID" onClick={() => handleCopy(media.algo_tx)}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8M8 12h8m-7 8h6a2 2 0 002-2V6a2 2 0 00-2-2H8a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </Button>
                  </>
                ) : (
                  <span className="text-xs text-gray-400">Not generated</span>
                )}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Image Link</span>
              {(media.file_url && media.status !== 'revoked') ? (
                <a href={media.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs">
                  View Image
                </a>
              ) : (
                <span className="text-xs text-gray-400">Not available</span>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => window.open(media.file_url, '_blank')}
              disabled={!media.file_url || media.status === 'revoked'}
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              View
            </Button>
            {(media.status === 'verified' || media.status === 'revoked') && (
              <Button
                variant={media.status === 'verified' ? 'outline' : 'secondary'}
                size="sm"
                className={media.status === 'verified'
                  ? 'text-red-600 hover:text-red-700 hover:bg-red-50'
                  : 'text-green-600 hover:text-green-700 hover:bg-green-50'}
                onClick={() => {
                  const id = media.sha256_hash;
                  if (id && typeof id === 'string' && id.length > 10) {
                    if (media.status === 'verified') {
                      revokeMediaMutation.mutate();
                    } else if (media.status === 'revoked') {
                      revokeMediaMutation.mutate();
                    }
                  } else {
                    alert('Invalid or missing media hash. Cannot update status.');
                  }
                }}
              >
                {media.status === 'verified' ? (
                  <>
                    <Trash2 className="w-4 h-4 mr-1" />
                    Revoke
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-1" />
                    Restore
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="bg-white rounded-xl shadow-lg p-10 max-w-md text-center">
          <h2 className="text-2xl font-bold mb-2 text-primary">Connect Wallet</h2>
          <p className="mb-4 text-gray-700">Please connect your wallet to view your dashboard and verified content.</p>
        </div>
      </div>
    );
  }

  return (
  <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 py-12 px-4" style={{ paddingTop: '148.8px' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Dashboard</h1>
          <p className="text-lg text-gray-600">Manage your verified content and trust profile</p>
        </div>

        {/* Profile Card */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-xl border-none bg-gradient-to-br from-blue-600 to-purple-600 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Wallet Identity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-sm mb-2">{address ? `${address.slice(0, 6)}...${address.slice(-6)}` : "Not connected"}</p>
              <p className="text-xs text-white/80">DID: did:algo:{address ? `${address.slice(0, 6)}...${address.slice(-6)}` : "Not connected"}</p>
              <Badge className="mt-4 bg-white/20 border-white/30">
                <Award className="w-3 h-3 mr-1" />
                Verified Creator
              </Badge>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Trust Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2 mb-2">
                {isLoadingReputation ? (
                  <span className="text-gray-400 animate-pulse">Loading...</span>
                ) : (
                  <>
                    <span className="text-4xl font-bold text-yellow-600">{String(reputationScore) || "N/A"}</span>
                    <span className="text-gray-400">/ 5.0</span>
                  </>
                )}
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i <= 4 ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Registered Items</span>
                  <span className="font-semibold">{registeredMedia.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Revoked Items</span>
                  <span className="font-semibold">{revokedMedia.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Last Upload</span>
                  <span className="font-semibold text-sm">
                    {registeredMedia[0] && registeredMedia[0].created_date
                      ? safeFormat(registeredMedia[0].created_date, "MMM d")
                      : "—"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Statistics - New Feature */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">User Statistics</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-100 p-4 rounded-lg shadow">
              <p className="text-sm text-gray-500">Posts</p>
              <p className="text-2xl font-bold text-gray-800">{registeredMedia.length}</p>
            </div>
            <div className="bg-gray-100 p-4 rounded-lg shadow">
              <p className="text-sm text-gray-500">Followers</p>
              <p className="text-2xl font-bold text-gray-800">200</p>
            </div>
            <div className="bg-gray-100 p-4 rounded-lg shadow">
              <p className="text-sm text-gray-500">Following</p>
              <p className="text-2xl font-bold text-gray-800">150</p>
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="all">
              All ({registeredMedia.length})
            </TabsTrigger>
            <TabsTrigger value="verified">
              Verified ({verifiedMedia.length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending ({pendingMedia.length})
            </TabsTrigger>
            <TabsTrigger value="revoked">
              Revoked ({revokedMedia.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {registeredMedia.map((media, idx) => (
                <MediaCard key={`media-${getMediaId(media, idx)}-${media.file_name || idx}`} media={media} idx={idx} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="verified">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {verifiedMedia.map((media, idx) => (
                <MediaCard key={`verified-${getMediaId(media, idx)}-${media.file_name || idx}`} media={media} idx={idx} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="pending">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingMedia.map((media, idx) => (
                <MediaCard key={`pending-${getMediaId(media, idx)}-${media.file_name || idx}`} media={media} idx={idx} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="revoked">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {revokedMedia.map((media, idx) => (
                <MediaCard key={`revoked-${getMediaId(media, idx)}-${media.file_name || idx}`} media={media} idx={idx} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}