import React from "react";
import { motion } from "framer-motion";

export default function About() {
  return (
    <section id="about" className="py-20 md:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Image/Illustration */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="relative aspect-square rounded-3xl overflow-hidden bg-gradient-to-br from-[#00A78E]/20 to-blue-500/20 p-8">
              <div className="flex items-center justify-center h-full">
                <div className="grid grid-cols-2 gap-4 w-full">
                  {[
                    { icon: "🔗", label: "Blockchain" },
                    { icon: "📁", label: "IPFS" },
                    { icon: "✅", label: "Verified" },
                    { icon: "🔒", label: "Secure" },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-white rounded-2xl p-6 shadow-lg text-center"
                    >
                      <div className="text-4xl mb-2">{item.icon}</div>
                      <div className="text-sm font-semibold text-gray-700">{item.label}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              About ProofChain
            </h2>
            <p className="text-lg text-gray-600 mb-6 leading-relaxed">
              ProofChain is a decentralized verification system built on Algorand that ensures the authenticity of media files. By leveraging IPFS for storage and blockchain for proof registration, it provides a tamper-proof record of content origin, ownership, and integrity.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              In an era of deepfakes and misinformation, ProofChain empowers creators, journalists, and organizations to prove the authenticity of their digital content through immutable blockchain records.
            </p>

            <div className="grid grid-cols-3 gap-6 mt-10">
              {[
                { value: "100%", label: "Immutable" },
                { value: "10k+", label: "Verifications" },
                { value: "Fast", label: "Algorand Speed" },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-[#00A78E]">{stat.value}</div>
                  <div className="text-sm text-gray-600 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}