
import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import storageClient from "@/api/storageClient";
import { useQuery } from "@tanstack/react-query";
// ...existing code...
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Upload,
  Search,
  CheckCircle,
  TrendingUp,
  FileCheck,
  Network,
  Sparkles,
  ArrowRight,
  Lock,
  Globe
} from "lucide-react";
import StatsCard from "../components/dashboard/StatsCard";
import FeatureCard from "../components/dashboard/FeatureCard";


import { useWallet } from "@/hooks/useWallet";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { isConnected, address } = useWallet();
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [kycLoading, setKycLoading] = useState(false);
  const navigate = useNavigate();

  // Always call useQuery at the top level
  const { data: registeredMedia = [] } = useQuery({
    queryKey: ['registeredMedia'],
    queryFn: () => storageClient.entities.RegisteredMedia.list('-created_date', 10),
    initialData: []
  });

  useEffect(() => {
    if (!isConnected || !address) {
      setKycStatus(null);
      navigate("/", { replace: true });
      return;
    }
    setKycLoading(true);
    fetch(`/api/kyc/status?address=${address}`)
      .then(resp => resp.ok ? resp.json() : Promise.reject("Failed to fetch KYC status"))
      .then(data => {
        setKycStatus(data.status || "not_started");
        if (data.status !== "approved") {
          navigate("/", { replace: true });
        }
      })
      .catch(() => {
        setKycStatus(null);
        navigate("/", { replace: true });
      })
      .finally(() => setKycLoading(false));
  }, [isConnected, address, navigate]);

  if (!isConnected || kycLoading || kycStatus !== "approved") {
    // Render header and a loading/redirect message so layout is not broken
    return <div />;
  }

  const verifiedCount = registeredMedia.filter(m => m.status === 'verified').length;
  const totalRegistrations = registeredMedia.length;

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-green-600 text-white">
        <div className="absolute inset-0 bg-grid-white/10" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-6 bg-white/20 text-white border-white/30 backdrop-blur-sm">
              <Sparkles className="w-3 h-3 mr-1" />
              Decentralized Content Verification
            </Badge>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Your Content, Verified.
              <span className="block text-green-300">Forever.</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-blue-100 mb-10 leading-relaxed">
              Protect your AI creations and prove authenticity — on-chain, verifiable, immutable.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to={createPageUrl("RegisterMedia")}> 
                <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 gap-2">
                  <Upload className="w-5 h-5" />
                  Register New Media
                </Button>
              </Link>
              <Link to={createPageUrl("VerifyMedia")}> 
                <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10 backdrop-blur-sm gap-2">
                  <Search className="w-5 h-5" />
                  Verify Existing Content
                </Button>
              </Link>
            </div>

            <div className="mt-12 flex items-center justify-center gap-2 text-blue-100">
              <Lock className="w-4 h-4" />
              <span className="text-sm">Media verification is public and decentralized. Anyone can check a file's origin.</span>
            </div>
          </div>
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="#F9FAFB"/>
          </svg>
        </div>
      </section>

      {/* Stats Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatsCard
            icon={FileCheck}
            label="Total Registrations"
            value={totalRegistrations.toString()}
            color="blue"
          />
          <StatsCard
            icon={CheckCircle}
            label="Verified Items"
            value={verifiedCount.toString()}
            color="green"
          />
          <StatsCard
            icon={TrendingUp}
            label="Trust Score"
            value="4.8/5"
            color="purple"
          />
          <StatsCard
            icon={Network}
            label="Network Status"
            value="Active"
            color="orange"
          />
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Three simple steps to protect and verify your digital content
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={Upload}
            title="Register Media"
            description="Upload your AI-generated content with metadata. We create cryptographic hashes and store immutable records on the blockchain."
            step="01"
            color="blue"
            link={createPageUrl("RegisterMedia")}
          />
          <FeatureCard
            icon={Shield}
            title="Blockchain Attestation"
            description="Your content is signed with your DID and registered on Ethereum. IPFS ensures decentralized, permanent storage."
            step="02"
            color="green"
            link={undefined}
          />
          <FeatureCard
            icon={CheckCircle}
            title="Verify Anywhere"
            description="Anyone can verify your content's authenticity by comparing cryptographic hashes. Build trust with verifiable provenance."
            step="03"
            color="purple"
            link={createPageUrl("VerifyMedia")}
          />
        </div>
      </section>

      {/* Trust & Security Section */}
      <section className="bg-gradient-to-br from-blue-50 to-green-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-blue-100 text-blue-700">
                Trustworthy Technology
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Built on Standards You Can Trust
              </h2>
              <div className="space-y-4">
                {[
                  { icon: Globe, text: "C2PA compliant metadata standards" },
                  { icon: Lock, text: "Cryptographic hash verification (SHA-256 + pHash)" },
                  { icon: Network, text: "Decentralized storage on IPFS" },
                  { icon: Shield, text: "Ethereum blockchain attestation" }
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-gray-700 pt-2">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <Card className="shadow-2xl border-none">
              <CardHeader className="bg-gradient-to-br from-blue-600 to-green-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Your Trust Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Reputation Score</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-green-600">4.8</span>
                    <span className="text-gray-400">/ 5.0</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Verification Tier</span>
                  <Badge className="bg-purple-100 text-purple-700">Trusted Publisher</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Registered Items</span>
                  <span className="font-semibold">{totalRegistrations}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Endorsements</span>
                  <span className="font-semibold">12 entities</span>
                </div>
                <Link to={createPageUrl("TrustGraph")}> 
                  <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700">
                    View Trust Graph
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <Card className="bg-gradient-to-br from-blue-600 to-green-600 text-white border-none shadow-2xl overflow-hidden relative">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
          <CardContent className="p-12 text-center relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Verify Your Content?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Join thousands of creators protecting their digital work with blockchain verification
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to={createPageUrl("RegisterMedia")}> 
                <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 shadow-lg gap-2">
                  <Upload className="w-5 h-5" />
                  Get Started Now
                </Button>
              </Link>
              <Link to={createPageUrl("DeveloperDocs")}> 
                <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10 gap-2">
                  <Globe className="w-5 h-5" />
                  Explore API
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
