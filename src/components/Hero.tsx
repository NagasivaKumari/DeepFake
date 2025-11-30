import React from "react";
import Button from "@/components/ui/button";
import { ArrowRight, Zap } from "lucide-react";
import LuteIcon from "./LuteIcon";
import { motion } from "framer-motion";

export default function Hero() {
  const scrollToGetStarted = () => {
    document.querySelector("#get-started")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="home" className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-[#00A78E]/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        
        {/* Network Lines */}
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#00A78E" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center lg:text-left"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#00A78E]/10 rounded-full mb-6"
            >
              <Zap className="w-4 h-4 text-[#00A78E]" />
              <span className="text-sm font-medium text-[#00A78E]">Powered by Algorand</span>
            </motion.div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Verify AI Content on{" "}
              <span className="bg-gradient-to-r from-[#00A78E] to-[#008f7a] bg-clip-text text-transparent">
                Algorand
              </span>
            </h1>

            <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto lg:mx-0">
              Upload, register, and verify images, videos, and audio using decentralized proofs and IPFS storage.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button
                size="lg"
                onClick={scrollToGetStarted}
                className="bg-[#00A78E] hover:bg-[#008f7a] text-white shadow-lg hover:shadow-xl transition-all duration-300 group"
              >
                Get Started
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-[#00A78E] text-[#00A78E] hover:bg-[#00A78E]/5 flex items-center"
              >
                <LuteIcon className="w-5 h-5 mr-2" />
                Connect Wallet
              </Button>
            </div>
          </motion.div>

          {/* Right Illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative"
          >
            <div className="relative w-full aspect-square max-w-lg mx-auto">
              {/* Central Node */}
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 20,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gradient-to-br from-[#00A78E] to-[#008f7a] rounded-full shadow-2xl flex items-center justify-center"
              >
                <div className="text-4xl">🔗</div>
              </motion.div>

              {/* Orbiting Nodes */}
              {[0, 72, 144, 216, 288].map((angle, i) => (
                <motion.div
                  key={i}
                  animate={{
                    rotate: [angle, angle + 360],
                  }}
                  transition={{
                    duration: 15 + i * 2,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="absolute top-1/2 left-1/2 w-full h-full"
                  style={{ transformOrigin: "center" }}
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-[#00A78E]">
                    <div className="text-2xl">
                      {["🖼️", "🎬", "🎵", "✅", "🔒"][i]}
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Connecting Lines */}
              <svg className="absolute inset-0 w-full h-full">
                <circle
                  cx="50%"
                  cy="50%"
                  r="40%"
                  fill="none"
                  stroke="#00A78E"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  opacity="0.3"
                />
              </svg>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}