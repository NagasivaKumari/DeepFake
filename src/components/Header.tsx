import { Link as Logo } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/useWallet";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import React, { useEffect, useState } from "react";
import KycRegistration from "./KycRegistration";


const Header = () => {
  const { connect, address, isConnected } = useWallet();
  const [kycModalOpen, setKycModalOpen] = useState(false);
  // Open KYC modal, connect wallet if not connected
  const handleKycClick = async () => {
    if (!isConnected) {
      await connect();
    }
    navigate('/kyc');
  };
  const navigate = useNavigate();
  const location = useLocation();
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [kycLoading, setKycLoading] = useState(false);

  useEffect(() => {
    // Fetch KYC status for the connected wallet
    const fetchKyc = async () => {
      if (!address) return setKycStatus(null);
      setKycLoading(true);
      try {
        const resp = await fetch(`/api/kyc/status?address=${address}`);
        if (!resp.ok) throw new Error("Failed to fetch KYC status");
        const data = await resp.json();
        setKycStatus(data.status || "not_started");
      } catch {
        setKycStatus(null);
      } finally {
        setKycLoading(false);
      }
    };
    fetchKyc();
  }, [address]);

  const handleConnect = async () => {
    await connect();
    // After connecting, check KYC status and navigate accordingly
    if (!address) return;
    try {
      const resp = await fetch(`/api/kyc/status?address=${address}`);
      if (!resp.ok) throw new Error("Failed to fetch KYC status");
      const data = await resp.json();
      if (data.status === "approved") {
        navigate('/dashboard');
      } else {
        navigate('/kyc');
      }
    } catch {
      navigate('/kyc');
    }
  };

  // Helper to render KYC badge
  const renderKycBadge = () => {
    if (kycLoading) return <span className="ml-3 text-xs text-gray-500">Checking KYC...</span>;
    if (!address) return null;
    if (!kycStatus || kycStatus === "not_started") return <span className="ml-3 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">KYC: Not Started</span>;
    if (kycStatus === "email_pending") return <span className="ml-3 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">KYC: Email Pending</span>;
    if (kycStatus === "email_verified") return <span className="ml-3 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">KYC: Email Verified</span>;
    if (kycStatus === "approved") return <span className="ml-3 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">KYC: Approved</span>;
    if (kycStatus === "rejected") return <span className="ml-3 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">KYC: Rejected</span>;
    return <span className="ml-3 text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">KYC: {kycStatus}</span>;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border" style={{ minHeight: 72 }}>
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Logo className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold text-foreground">ProofChain</span>
            <div className="flex items-center gap-2 flex-wrap">
              {renderKycBadge()}
              <Button
                className="ml-2 bg-secondary text-foreground border border-primary hover:bg-primary/10"
                onClick={handleKycClick}
                size="sm"
                style={{ minWidth: 60 }}
              >
                KYC
              </Button>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            {location.pathname === '/' && !address ? (
              // Compact landing page nav (only if NOT connected)
              <>
                <Link to="/" className="text-foreground hover:text-primary transition-colors">Home</Link>
                <a href="#about" className="text-foreground hover:text-primary transition-colors">About</a>
                <a href="#how-it-works" className="text-foreground hover:text-primary transition-colors">How It Works</a>
                <a href="#features" className="text-foreground hover:text-primary transition-colors">Features</a>
                <a href="#get-started" className="text-foreground hover:text-primary transition-colors">Get Started</a>
              </>
            ) : (
              // Full app nav after wallet connect or on any other page
              <>
                <Link
                  to={address ? "/dashboard" : undefined}
                  className={`text-foreground hover:text-primary transition-colors${!address ? ' pointer-events-none opacity-50' : ''}`}
                >
                  Dashboard
                </Link>
                <Link to={createPageUrl("RegisterMedia")} className="text-foreground hover:text-primary transition-colors">Register Media</Link>
                <Link to={createPageUrl("VerifyMedia")} className="text-foreground hover:text-primary transition-colors">Verify Media</Link>
                <Link to={createPageUrl("MyDashboard")} className="text-foreground hover:text-primary transition-colors">My Dashboard</Link>
                <Link to={createPageUrl("TrustGraph")} className="text-foreground hover:text-primary transition-colors">Trust Graph</Link>
                <Link to={createPageUrl("DeveloperDocs")} className="text-foreground hover:text-primary transition-colors">Docs/API</Link>
                <Link to={createPageUrl("FAQ")} className="text-foreground hover:text-primary transition-colors">FAQ</Link>
              </>
            )}
          </nav>
          <Button onClick={handleConnect} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            Connect Wallet
          </Button>

        </div> {/* <-- closes flex items-center justify-between */}
      </div> {/* <-- closes container mx-auto px-6 py-4 */}
    </header>
  );
}

export default Header;
