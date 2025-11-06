import React from "react";
import { Outlet, useLocation, Link } from "react-router-dom";
import {
  Shield,
  Upload,
  Search,
  LayoutDashboard,
  Network,
  Code,
  HelpCircle,
  Wallet,
  CheckCircle,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createPageUrl } from "@/utils";

const navigationItems = [
  { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard },
  { title: "Register Media", url: createPageUrl("RegisterMedia"), icon: Upload },
  { title: "Verify Media", url: createPageUrl("VerifyMedia"), icon: Search },
  { title: "My Dashboard", url: createPageUrl("MyDashboard"), icon: Shield },
  { title: "Trust Graph", url: createPageUrl("TrustGraph"), icon: Network },
  { title: "Docs/API", url: createPageUrl("DeveloperDocs"), icon: Code },
  { title: "FAQ", url: createPageUrl("FAQ"), icon: HelpCircle },
];

export default function Layout() {
  const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
    const { address, isConnected } = useWallet();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-green-50/20">
      <style>{`
        :root {
          --primary-600: #2563eb;
          --primary-700: #1d4ed8;
          --success-500: #10b981;
          --success-600: #059669;
          --warning-500: #f59e0b;
          --danger-500: #ef4444;
        }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-white/80 border-b border-gray-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to={createPageUrl("Dashboard")} className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-green-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                  TruthProof
                </h1>
                <p className="text-xs text-gray-500">Media Verification</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navigationItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <Link
                    key={item.title}
                    to={item.url}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                      isActive
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="text-sm">{item.title}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Wallet Status */}
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="hidden sm:flex items-center gap-2 border-green-200 bg-green-50/50 hover:bg-green-100/50 text-green-700"
                  >
                    <Wallet className="w-4 h-4" />
                    <span className="font-mono text-sm">{walletAddress}</span>
                    <span className="font-mono text-sm">{address ? address : 'Not connected'}</span>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Wallet Address</span>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Connected
                      </Badge>
                    </div>
                    <p className="font-mono text-xs break-all">{walletAddress}</p>
                    <p className="font-mono text-xs break-all">{address ? address : 'Not connected'}</p>
                    <div className="pt-2 border-t">
                      <p className="text-xs text-gray-500">DID</p>
                      <p className="font-mono text-xs break-all">{walletAddress}</p>
                      <p className="font-mono text-xs break-all">{address ? `did:algo:${address}` : 'Not connected'}</p>
                    </div>
                  </div>
                  <DropdownMenuItem className="text-red-600">
                    Disconnect Wallet
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white/95 backdrop-blur-lg">
            <div className="px-4 py-3 space-y-1">
              {navigationItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <Link
                    key={item.title}
                    to={item.url}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      isActive
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
              <div className="pt-2 mt-2 border-t">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 border-green-200 bg-green-50/50 text-green-700"
                >
                  <Wallet className="w-4 h-4" />
                  <span className="font-mono text-sm">{walletAddress}</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="pt-20 md:pt-24">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-lg border-t border-gray-200 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-green-500 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-lg">TruthProof</span>
              </div>
              <p className="text-sm text-gray-600">
                Verifiable con  tent provenance on the blockchain
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Product</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link to={createPageUrl("RegisterMedia")} className="hover:text-blue-600">Register Media</Link></li>
                <li><Link to={createPageUrl("VerifyMedia")} className="hover:text-blue-600">Verify Content</Link></li>
                <li><Link to={createPageUrl("DeveloperDocs")} className="hover:text-blue-600">API Docs</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Resources</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-blue-600">Whitepaper</a></li>
                <li><a href="#" className="hover:text-blue-600">GitHub</a></li>
                <li><Link to={createPageUrl("FAQ")} className="hover:text-blue-600">FAQ</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Backed By</h3>
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline">Pyteal</Badge>
                <Badge variant="outline">IPFS</Badge>
                <Badge variant="outline">C2PA</Badge>
                <Badge variant="outline">Filecoin</Badge>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
            © 2025 Proofchain Protocol. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
