import React from "react";
import { useWallet } from "@/hooks/useWallet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Network,
  Star,
  Award,
  Users,
  Shield,
  TrendingUp,
  CheckCircle,
  Link as LinkIcon
} from "lucide-react";

export default function TrustGraph() {
  const { address } = useWallet();
  const trustConnections = [
    { name: "OpenAI", type: "Platform", verified: true },
    { name: "Adobe", type: "Platform", verified: true },
    { name: "Midjourney Official", type: "Platform", verified: true },
    { name: "C2PA Coalition", type: "Organization", verified: true },
  { name: "Algorand Foundation", type: "Blockchain", verified: true },
    { name: "IPFS Network", type: "Storage", verified: true },
  ];

  return (
  <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 py-12 px-4" style={{ paddingTop: '148.8px' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Trust & Identity System</h1>
          <p className="text-lg text-gray-600">Your reputation network and verification status</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-xl border-none bg-gradient-to-br from-indigo-600 to-purple-600 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-6 h-6" />
                Reputation Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <div className="text-5xl font-bold">4.8</div>
                <div className="text-white/80">/ 5.0</div>
              </div>
              <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${i <= 4 ? 'fill-white text-white' : 'text-white/40'}`}
                  />
                ))}
              </div>
              <Badge className="bg-white/20 border-white/30">
                Top 5% of Creators
              </Badge>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-600" />
                Verification Tier
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className="bg-purple-100 text-purple-700 text-lg px-4 py-2 mb-4">
                Trusted Publisher
              </Badge>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Identity Verified</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Professional Account</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Platform Endorsed</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Network Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Endorsements</span>
                <span className="font-semibold">12</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Connected Platforms</span>
                <span className="font-semibold">6</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Trust Network</span>
                <span className="font-semibold">248 nodes</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trust Network Visualization */}
        <Card className="shadow-2xl border-none mb-8">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Network className="w-6 h-6 text-blue-600" />
                Your Trust Network
              </CardTitle>
              <Badge variant="outline">
                <TrendingUp className="w-3 h-3 mr-1" />
                Growing
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="relative h-96 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-8 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Central Node */}
                <div className="relative z-10">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-2xl">
                    <Shield className="w-12 h-12 text-white" />
                  </div>
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                    <Badge className="bg-white shadow-lg">You {address ? `(DID:algo:${address.slice(0,6)}...${address.slice(-6)})` : '(Not connected)'}</Badge>
                  </div>
                </div>

                {/* Connection Lines - decorative */}
                <svg className="absolute inset-0 w-full h-full">
                  {[0, 60, 120, 180, 240, 300].map((angle, i) => {
                    const x1 = "50%";
                    const y1 = "50%";
                    const x2 = `${50 + 35 * Math.cos((angle * Math.PI) / 180)}%`;
                    const y2 = `${50 + 35 * Math.sin((angle * Math.PI) / 180)}%`;
                    return (
                      <line
                        key={i}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="#cbd5e1"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                      />
                    );
                  })}
                </svg>

                {/* Orbiting Nodes */}
                {trustConnections.map((conn, i) => {
                  const angle = (360 / trustConnections.length) * i;
                  const x = 50 + 35 * Math.cos((angle * Math.PI) / 180);
                  const y = 50 + 35 * Math.sin((angle * Math.PI) / 180);
                  return (
                    <div
                      key={i}
                      className="absolute"
                      style={{
                        left: `${x}%`,
                        top: `${y}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                    >
                      <div className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-green-400 hover:scale-110 transition-transform">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      </div>
                      <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                        <span className="text-xs font-medium">{conn.name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Endorsements */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="shadow-xl border-none">
            <CardHeader>
              <CardTitle>Platform Endorsements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {trustConnections.map((conn, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">{conn.name}</p>
                      <p className="text-sm text-gray-500">{conn.type}</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700">Verified</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-xl border-none">
            <CardHeader>
              <CardTitle>Boost Your Trust Score</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-start gap-3">
                  <LinkIcon className="w-5 h-5 text-blue-600 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Link Social Accounts</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Connect your Twitter, LinkedIn, or GitHub to increase trust
                    </p>
                    <Button variant="outline" size="sm">Connect Accounts</Button>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-start gap-3">
                  <Award className="w-5 h-5 text-purple-600 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Request Verification Upgrade</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Apply for higher verification tiers and platform endorsements
                    </p>
                    <Button variant="outline" size="sm">Apply Now</Button>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-green-600 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Add Issuer Signature</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Get signatures from trusted issuers in your field
                    </p>
                    <Button variant="outline" size="sm"></Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}