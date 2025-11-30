import { WalletProvider } from "./hooks/WalletContext";
import useSyncOnReconnect from "./hooks/useSyncOnReconnect";

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

const queryClient = new QueryClient();

const App = () => {
  const syncData = () => {
    // Logic to sync data with the server
    console.log("Syncing data with the server...");
  };

  useSyncOnReconnect(syncData);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <WalletProvider>
          {/* Enable opt-in future flags to silence v7 deprecation warnings and opt-in to v7 behaviors */}
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Header />
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
          </BrowserRouter>
        </WalletProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
