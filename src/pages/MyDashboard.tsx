import React from "react";
import storageClient from "@/api/storageClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function MyDashboard() {
  const queryClient = useQueryClient();
  
  const { data: registeredMedia = [] } = useQuery({
    queryKey: ['registeredMedia'],
    queryFn: () => storageClient.entities.RegisteredMedia.list('-created_date'),
    initialData: []
  });

  const revokeMediaMutation = useMutation({
    mutationFn: async (id) => {
      return await storageClient.entities.RegisteredMedia.update(id, { status: "revoked" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['registeredMedia']);
    }
  });

  const verifiedMedia = registeredMedia.filter(m => m.status === 'verified');
  const pendingMedia = registeredMedia.filter(m => m.status === 'pending');
  const revokedMedia = registeredMedia.filter(m => m.status === 'revoked');

  const getStatusBadge = (status) => {
    const styles = {
      verified: "bg-green-100 text-green-700",
      pending: "bg-yellow-100 text-yellow-700",
      revoked: "bg-red-100 text-red-700"
    };
    return styles[status] || styles.verified;
  };

  const MediaCard = ({ media }) => (
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
                {format(new Date(media.created_date), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
            <Badge className={getStatusBadge(media.status)}>
              {media.status}
            </Badge>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">AI Model</span>
              <span className="font-medium">{media.ai_model}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">SHA-256</span>
              <code className="text-xs">{media.sha256_hash ? media.sha256_hash.substring(0, 16) + '...' : 'Not generated'}</code>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Perceptual Hash</span>
              <code className="text-xs">{media.perceptual_hash ? media.perceptual_hash : 'Not generated'}</code>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Image Link</span>
              {media.file_url ? (
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
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              View
            </Button>
            {media.status === 'verified' && (
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => revokeMediaMutation.mutate(media.id)}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Revoke
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 py-12 px-4">
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
              <p className="font-mono text-sm mb-2">0xAbC...f9d</p>
              <p className="text-xs text-white/80">DID: did:ethr:0xAbC...f9d</p>
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
                <span className="text-4xl font-bold text-yellow-600">4.8</span>
                <span className="text-gray-400">/ 5.0</span>
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
                    {registeredMedia[0]
                      ? format(new Date(registeredMedia[0].created_date), "MMM d")
                      : "—"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
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
              {registeredMedia.map(media => (
                <MediaCard key={media.id} media={media} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="verified">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {verifiedMedia.map(media => (
                <MediaCard key={media.id} media={media} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="pending">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingMedia.map(media => (
                <MediaCard key={media.id} media={media} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="revoked">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {revokedMedia.map(media => (
                <MediaCard key={media.id} media={media} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}