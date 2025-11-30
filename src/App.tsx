import { WalletProvider } from "./hooks/WalletContext";
import useSyncOnReconnect from "./hooks/useSyncOnReconnect";
import useNetworkStatus from "./hooks/useNetworkStatus";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Header from "@/components/Header";
import Dashboard from "./pages/Dashboard";
import RegisterMedia from "./pages/RegisterMedia";
import VerifyMedia from "./pages/VerifyMedia";
import MyDashboard from "./pages/MyDashboard";
import TrustGraph from "./pages/TrustGraph";
import DeveloperDocs from "./pages/DeveloperDocs";
import FAQ from "./pages/FAQ";
import KycPage from "./pages/KycPage";
import NotFound from "./pages/NotFound";
import TwoFactorAuthSetup from "./components/TwoFactorAuthSetup";
import { addNumbers, isEven, generateRandomNumber } from './utils/dummyUtils';

const queryClient = new QueryClient();

const App = () => {
  const syncData = () => {
    // Logic to sync data with the server
    console.log("Syncing data with the server...");
  };

  useSyncOnReconnect(syncData);

  const isOnline = useNetworkStatus();

  const randomNum = generateRandomNumber(1, 100);
  const sum = addNumbers(10, 20);
  const evenCheck = isEven(randomNum);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <WalletProvider>
          {/* Enable opt-in future flags to silence v7 deprecation warnings and opt-in to v7 behaviors */}
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Header />
            <div className={`network-status ${isOnline ? 'online' : 'offline'}`}>
              {isOnline ? 'You are online' : 'You are offline'}
            </div>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/kyc" element={<KycPage />} />
              <Route path="/register" element={<RegisterMedia />} />
              <Route path="/verify" element={<VerifyMedia />} />
              <Route path="/mydashboard" element={<MyDashboard />} />
              <Route path="/trust-graph" element={<TrustGraph />} />
              <Route path="/docs" element={<DeveloperDocs />} />
              <Route path="/faq" element={<FAQ />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <TwoFactorAuthSetup />
          </BrowserRouter>
        </WalletProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
