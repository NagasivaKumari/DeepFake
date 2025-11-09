// import Header from "@/components/Header";


import Hero from "@/components/Hero";
import KycRegistration from "@/components/KycRegistration";
import { useWallet } from "@/hooks/useWallet";
import About from "@/components/About";
import HowItWorks from "@/components/HowItWorks";
import Features from "@/components/Features";
import GetStarted from "@/components/GetStarted";
import Footer from "@/components/Footer";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";





const Index = () => {
  const { isConnected, address } = useWallet();
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [kycLoading, setKycLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isConnected || !address) {
      setKycStatus(null);
      return;
    }
    setKycLoading(true);
    fetch(`/api/kyc/status?address=${address}`)
      .then(resp => resp.ok ? resp.json() : Promise.reject("Failed to fetch KYC status"))
      .then(data => {
        const status = data.status || "not_started";
        setKycStatus(status);
        if (status === "approved") {
          navigate("/dashboard", { replace: true });
        }
      })
      .catch(() => setKycStatus(null))
      .finally(() => setKycLoading(false));
  }, [isConnected, address, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <div className="py-12">
        {isConnected && !kycLoading && <KycRegistration />}
      </div>
      <About />
      <HowItWorks />
      <Features />
      <GetStarted />
      <Footer />
    </div>
  );
};

export default Index;
