
import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Wallet, CheckCircle2 } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { toast } from "@/components/ui/use-toast";


export default function GetStarted() {
  const { connect, isConnected, address } = useWallet();
  const steps = [
    "Connect your Algorand wallet.",
    "Upload your first media file.",
    "View your on-chain proof transaction.",
    "Verify or share your proof link.",
  ];

  const handleConnect = async () => {
    try {
      await connect();
      toast({
        title: "Wallet Connected",
        description: address ? `Connected as ${address}` : "Wallet connection successful.",
      });
    } catch (err) {
      toast({
        title: "Wallet Connection Failed",
        description: (err as Error)?.message || "Could not connect wallet.",
        variant: "destructive",
      });
    }
  };

  return (
    <section id="get-started" className="py-20 md:py-32 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Get Started with ProofChain
          </h2>
          <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
            Start verifying your content in minutes with these simple steps
          </p>

          {/* Steps */}
          <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 mb-12 border border-gray-100">
            <div className="grid md:grid-cols-2 gap-6">
              {steps.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-4 text-left"
                >
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-[#00A78E]/20 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-[#00A78E]" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-700 font-medium">{step}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <Button
              size="lg"
              className="bg-[#00A78E] hover:bg-[#008f7a] text-white shadow-lg hover:shadow-xl transition-all duration-300 px-8 py-6 text-lg"
              onClick={handleConnect}
              disabled={isConnected}
            >
              <Wallet className="w-5 h-5 mr-2" />
              {isConnected ? "Wallet Connected" : "Connect Wallet to Begin"}
            </Button>

            <p className="text-sm text-gray-500 font-medium">
              🔒 Secure. Transparent. Decentralized.
            </p>
          </motion.div>

          {/* Trust Badges */}
          <div className="mt-16 flex flex-wrap justify-center gap-8 items-center opacity-60">
            <div className="text-center">
              <div className="text-2xl mb-1">⚡</div>
              <div className="text-xs font-semibold text-gray-600">Powered by Algorand</div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-1">📁</div>
              <div className="text-xs font-semibold text-gray-600">IPFS Storage</div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-1">🔒</div>
              <div className="text-xs font-semibold text-gray-600">Blockchain Secured</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}