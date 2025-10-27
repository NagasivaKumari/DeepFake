import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Code,
  BookOpen,
  Download,
  ExternalLink,
  Terminal,
  Puzzle,
  Zap,
  Shield
} from "lucide-react";

export default function DeveloperDocs() {
  const codeExamples = {
  register: `// Register media with ProofChain API
const response = await fetch('https://api.proofchain.io/register', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    file_url: 'ipfs://Qm...',
    ai_model: 'Stable Diffusion XL',
    creator_did: 'did:ethr:0x...',
    metadata: {
      generation_time: '2025-01-15T10:30:00Z',
      prompt: 'A futuristic city at sunset'
    }
  })
});

const { blockchain_tx, ipfs_cid } = await response.json();`,

    verify: `// Verify media authenticity
const response = await fetch('https://api.proofchain.io/verify', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sha256_hash: 'a1b2c3...',
    ipfs_cid: 'Qm...'
  })
});

const verification = await response.json();
if (verification.status === 'verified') {
  console.log('Content is authentic!', verification);
}`,

    badge: `<!-- Embed verification badge -->
<div class="proofchain-badge" 
     data-cid="Qm..."
     data-theme="light">
</div>
<script src="https://cdn.proofchain.io/badge.js"></script>

<!-- Or use iframe -->
<iframe src="https://verify.proofchain.io/badge/Qm..."
        width="300" height="100"></iframe>`
  };

  const sdkLanguages = [
    { name: "Python", icon: "🐍", link: "#" },
    { name: "JavaScript", icon: "📜", link: "#" },
    { name: "Node.js", icon: "🟢", link: "#" },
    { name: "CLI Tool", icon: "⚡", link: "#" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-teal-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Developer Portal & API</h1>
          <p className="text-lg text-gray-600">Integrate ProofChain verification into your platform</p>
        </div>

        {/* Quick Start */}
        <Card className="shadow-2xl border-none mb-8">
          <CardHeader className="bg-gradient-to-r from-teal-600 to-blue-600 text-white">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Zap className="w-6 h-6" />
              Quick Start
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="font-semibold mb-2">1. Get API Key</h3>
                <p className="text-sm text-gray-600 mb-4">Sign up and generate your authentication key</p>
                <Button>Generate Key</Button>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Download className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="font-semibold mb-2">2. Install SDK</h3>
                <p className="text-sm text-gray-600 mb-4">Choose your preferred language SDK</p>
                <Button variant="outline">View SDKs</Button>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Code className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="font-semibold mb-2">3. Start Building</h3>
                <p className="text-sm text-gray-600 mb-4">Register and verify content programmatically</p>
                <Button variant="outline">Documentation</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Code Examples */}
        <Tabs defaultValue="register" className="mb-8">
          <TabsList className="grid grid-cols-3 w-full max-w-2xl">
            <TabsTrigger value="register">Register Media</TabsTrigger>
            <TabsTrigger value="verify">Verify Content</TabsTrigger>
            <TabsTrigger value="badge">Embed Badge</TabsTrigger>
          </TabsList>

          {Object.entries(codeExamples).map(([key, code]) => (
            <TabsContent key={key} value={key}>
              <Card className="shadow-xl border-none">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Terminal className="w-5 h-5" />
                      Code Example
                    </CardTitle>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Try in Playground
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="bg-gray-900 text-green-400 p-6 rounded-lg overflow-x-auto">
                    <code>{code}</code>
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* SDKs */}
        <Card className="shadow-xl border-none mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Puzzle className="w-5 h-5 text-blue-600" />
              Official SDKs & Tools
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-6">
              {sdkLanguages.map((sdk, i) => (
                <Card key={i} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl mb-3">{sdk.icon}</div>
                    <h3 className="font-semibold mb-2">{sdk.name}</h3>
                    <Button variant="outline" size="sm" className="w-full">
                      <Download className="w-4 h-4 mr-2" />
                      Install
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* API Endpoints */}
        <Card className="shadow-xl border-none mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-600" />
              Core API Endpoints
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  method: "POST",
                  endpoint: "/api/v1/register",
                  description: "Register new media on the blockchain"
                },
                {
                  method: "POST",
                  endpoint: "/api/v1/verify",
                  description: "Verify media authenticity by hash or CID"
                },
                {
                  method: "GET",
                  endpoint: "/api/v1/media/:id",
                  description: "Retrieve media metadata and verification status"
                },
                {
                  method: "PUT",
                  endpoint: "/api/v1/media/:id/revoke",
                  description: "Revoke or update media registration"
                },
                {
                  method: "GET",
                  endpoint: "/api/v1/trust/:did",
                  description: "Get trust score and verification tier for DID"
                }
              ].map((api, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <Badge className={
                      api.method === "POST" ? "bg-green-100 text-green-700" :
                      api.method === "GET" ? "bg-blue-100 text-blue-700" :
                      "bg-orange-100 text-orange-700"
                    }>
                      {api.method}
                    </Badge>
                    <code className="text-sm font-mono">{api.endpoint}</code>
                  </div>
                  <p className="text-sm text-gray-600 hidden md:block">{api.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Integration Features */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="shadow-xl border-none">
            <CardHeader>
              <CardTitle>Platform Integration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Upload Hooks</h3>
                  <p className="text-sm text-gray-600">Automatically verify content when users upload to your platform</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Code className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Trust Badge Generator</h3>
                  <p className="text-sm text-gray-600">Generate embeddable verification badges and QR codes</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Webhooks</h3>
                  <p className="text-sm text-gray-600">Get real-time notifications on verification events</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-none">
            <CardHeader>
              <CardTitle>Resources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" size="lg">
                <BookOpen className="w-5 h-5 mr-3" />
                Full API Documentation
                <ExternalLink className="w-4 h-4 ml-auto" />
              </Button>
              <Button variant="outline" className="w-full justify-start" size="lg">
                <Terminal className="w-5 h-5 mr-3" />
                Interactive Playground
                <ExternalLink className="w-4 h-4 ml-auto" />
              </Button>
              <Button variant="outline" className="w-full justify-start" size="lg">
                <Code className="w-5 h-5 mr-3" />
                Sample Projects (GitHub)
                <ExternalLink className="w-4 h-4 ml-auto" />
              </Button>
              <Button variant="outline" className="w-full justify-start" size="lg">
                <Puzzle className="w-5 h-5 mr-3" />
                Integration Templates
                <ExternalLink className="w-4 h-4 ml-auto" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}