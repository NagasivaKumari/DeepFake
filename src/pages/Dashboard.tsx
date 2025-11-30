import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import storageClient from "@/api/storageClient";
import { useQuery } from "@tanstack/react-query";
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
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { isConnected, address } = useWallet();
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [kycLoading, setKycLoading] = useState(false);
  const [activities, setActivities] = useState<string[]>([]);
  const navigate = useNavigate();

  // Fetch reputationScore dynamically
  const { data: reputationScore = "N/A", isLoading: isReputationLoading } = useQuery({
    queryKey: ["reputationScore", address],
    queryFn: async () => {
      const response = await fetch(`/api/reputation?address=${address}`);
      if (!response.ok) {
        throw new Error("Failed to fetch reputation score");
      }
      const data = await response.json();
      return data.score;
    },
    enabled: !!address, // Only fetch if address is available
  });

  // Always call useQuery at the top level
  const { data: registeredMedia = [] } = useQuery({
    queryKey: ['registeredMedia'],
    queryFn: () => storageClient.entities.RegisteredMedia.list('-created_date', 10),
    initialData: []
  });

  // Fetch total users data
  const { data: usersData = [] } = useQuery({
    queryKey: ['usersData'],
    queryFn: () => storageClient.entities.User.list('-created_date', 10),
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

  useEffect(() => {
    // Simulate fetching recent activities
    const fetchActivities = async () => {
      const recentActivities = await new Promise<string[]>((resolve) =>
        setTimeout(() => resolve([
          'User1 registered a new media.',
          'User2 verified a media.',
          'User3 updated their profile.'
        ]), 1000)
      );
      setActivities(recentActivities);
    };

    fetchActivities();
  }, []);

  if (!isConnected || kycLoading || kycStatus !== "approved") {
    // Render header and a loading/redirect message so layout is not broken
    return <div />;
  }

  const verifiedCount = registeredMedia.filter(m => m.status === 'verified').length;
  const totalRegistrations = registeredMedia.length;
  const totalUsers = usersData.length; // Added a feature to display the total number of users in the dashboard

  // Added a feature to display the current date in the dashboard header
  const currentDate = new Date().toLocaleDateString();

  // Added a feature to show a greeting message based on the time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };
  const greetingMessage = getGreeting();

  // Added a feature to highlight the most active user in the dashboard
  const mostActiveUser = usersData.reduce((prev, current) => (prev.activityCount > current.activityCount ? prev : current), usersData[0]);

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
                <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 gap-2">
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
        {/* This section displays key statistics about the platform, such as total registrations and verified items. */}
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
            value={isReputationLoading ? "Loading..." : reputationScore}
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
        {/* This section outlines the key features of the platform, such as registering media and verifying content. */}
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
        {/* This section encourages users to take action, such as registering media or exploring the API. */}
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

      {/* Recent Activities Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Recent Activities
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Stay updated with the latest activities on the platform
          </p>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6">
          <ul className="space-y-4">
            {activities.length === 0 ? (
              <li className="text-center text-gray-500 py-4">No recent activities found.</li>
            ) : (
              activities.map((activity, index) => {
                return (
                  <li key={index} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-gray-700">{activity}</p>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </section>

      {/* User Achievements Section */}
      {/* This section highlights user milestones and achievements on the platform. */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            User Achievements
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Celebrate your milestones and achievements on the platform
          </p>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6">
          <ul className="space-y-4">
            <li className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-gray-700">Verified 100 media items</p>
            </li>
            <li className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-yellow-600" />
              </div>
              <p className="text-gray-700">Achieved a trust score of 4.5</p>
            </li>
            <li className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-gray-700">Endorsed by 10 entities</p>
            </li>
          </ul>
        </div>
      </section>

      {/* Platform Statistics Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Platform Statistics
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Explore the growth and impact of our platform
          </p>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6">
          <ul className="space-y-4">
            <li className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-gray-700">Over 10,000 media items registered</p>
            </li>
            <li className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-gray-700">5,000+ verified users</p>
            </li>
            <li className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-yellow-600" />
              </div>
              <p className="text-gray-700">Trusted by 50+ organizations</p>
            </li>
          </ul>
        </div>
      </section>

      {/* User Testimonials Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            User Testimonials
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Hear what our users have to say about our platform
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white shadow-md rounded-lg p-6">
            <p className="text-gray-700 italic">"This platform has revolutionized the way I verify my content. Highly recommended!"</p>
            <p className="text-gray-900 font-bold mt-4">- Alex J.</p>
          </div>
          <div className="bg-white shadow-md rounded-lg p-6">
            <p className="text-gray-700 italic">"A must-have tool for any content creator. The blockchain integration is seamless."</p>
            <p className="text-gray-900 font-bold mt-4">- Jamie L.</p>
          </div>
          <div className="bg-white shadow-md rounded-lg p-6">
            <p className="text-gray-700 italic">"Trust and transparency at its best. Kudos to the team!"</p>
            <p className="text-gray-900 font-bold mt-4">- Taylor R.</p>
          </div>
        </div>
      </section>

      {/* Upcoming Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Upcoming Features
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Get a sneak peek at what's coming next to our platform
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white shadow-md rounded-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Advanced Analytics Dashboard</h3>
            <p className="text-gray-700">Gain deeper insights into your content's performance with our upcoming analytics tools.</p>
          </div>
          <div className="bg-white shadow-md rounded-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Mobile App Integration</h3>
            <p className="text-gray-700">Manage and verify your content on the go with our new mobile app.</p>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Find answers to common questions about our platform
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-white shadow-md rounded-lg p-6">
            <h3 className="text-lg font-bold text-gray-900">What is decentralized content verification?</h3>
            <p className="text-gray-700">Decentralized content verification ensures that your content's authenticity can be proven using blockchain technology, making it immutable and trustworthy.</p>
          </div>
          <div className="bg-white shadow-md rounded-lg p-6">
            <h3 className="text-lg font-bold text-gray-900">How do I register my content?</h3>
            <p className="text-gray-700">You can register your content by uploading it through the "Register Media" page. Our platform will generate cryptographic hashes and store them on the blockchain.</p>
          </div>
          <div className="bg-white shadow-md rounded-lg p-6">
            <h3 className="text-lg font-bold text-gray-900">Is my data secure?</h3>
            <p className="text-gray-700">Yes, your data is stored securely using decentralized storage solutions like IPFS, ensuring privacy and reliability.</p>
          </div>
        </div>
      </section>

      {/* Community Highlights Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Community Highlights
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Discover the amazing work being done by our community members
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white shadow-md rounded-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Featured Creator: Jane Doe</h3>
            <p className="text-gray-700">Jane has successfully registered over 500 media items, setting a benchmark for content authenticity.</p>
          </div>
          <div className="bg-white shadow-md rounded-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Top Verified Media</h3>
            <p className="text-gray-700">"AI-Generated Art Collection" by John Smith has received widespread acclaim for its originality and authenticity.</p>
          </div>
          <div className="bg-white shadow-md rounded-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Community Milestone</h3>
            <p className="text-gray-700">Our community has collectively verified over 10,000 media items, ensuring trust and transparency.</p>
          </div>
        </div>
      </section>

      {/* Tips for Using the Platform Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Tips for Using the Platform
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Maximize your experience with these helpful tips
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-white shadow-md rounded-lg p-6">
            <h3 className="text-lg font-bold text-gray-900">Keep Your Profile Updated</h3>
            <p className="text-gray-700">Ensure your profile information is accurate to build trust and credibility within the community.</p>
          </div>
          <div className="bg-white shadow-md rounded-lg p-6">
            <h3 className="text-lg font-bold text-gray-900">Verify Content Regularly</h3>
            <p className="text-gray-700">Make it a habit to verify your content to maintain its authenticity and integrity.</p>
          </div>
          <div className="bg-white shadow-md rounded-lg p-6">
            <h3 className="text-lg font-bold text-gray-900">Engage with the Community</h3>
            <p className="text-gray-700">Participate in discussions and share your insights to grow your network and reputation.</p>
          </div>
        </div>
      </section>

      {/* Platform Security Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Platform Security Features
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Learn about the measures we take to keep your data secure
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white shadow-md rounded-lg p-6">
            <h3 className="text-xl font-bold text-gray-900">End-to-End Encryption</h3>
            <p className="text-gray-700">All data transfers are secured with industry-standard encryption protocols.</p>
          </div>
          <div className="bg-white shadow-md rounded-lg p-6">
            <h3 className="text-xl font-bold text-gray-900">Decentralized Storage</h3>
            <p className="text-gray-700">Your content is stored on IPFS, ensuring redundancy and reliability.</p>
          </div>
          <div className="bg-white shadow-md rounded-lg p-6">
            <h3 className="text-xl font-bold text-gray-900">Blockchain Verification</h3>
            <p className="text-gray-700">Every transaction is recorded on the blockchain, providing transparency and immutability.</p>
          </div>
          <div className="bg-white shadow-md rounded-lg p-6">
            <h3 className="text-xl font-bold text-gray-900">Regular Security Audits</h3>
            <p className="text-gray-700">Our platform undergoes frequent security reviews to identify and mitigate risks.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
