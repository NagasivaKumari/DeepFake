import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, UserCheck, AlertTriangle, Database } from "lucide-react";

export default function Features() {
  const features = [
    {
      icon: ShieldCheck,
      title: "Immutable Verification",
      description: "Once registered, your media proof is tamper-proof and permanently stored on the Algorand blockchain.",
      gradient: "from-blue-500 to-blue-600",
    },
    {
      icon: UserCheck,
      title: "Trusted Creator Identity",
      description: "Build verified creator identities and establish content provenance for digital trust.",
      gradient: "from-[#00A78E] to-[#008f7a]",
    },
    {
      icon: AlertTriangle,
      title: "Fight Deepfakes",
      description: "Detect misinformation and deepfake media using on-chain authenticity proofs.",
      gradient: "from-orange-500 to-red-500",
    },
    {
      icon: Database,
      title: "Decentralized IPFS Storage",
      description: "Store and retrieve media via IPFS, ensuring distributed and censorship-resistant access.",
      gradient: "from-purple-500 to-purple-600",
    },
  ];

  return (
    <section id="features" className="py-20 md:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Why ProofChain?
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Powerful features to protect and verify your digital content
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group"
            >
              <div className="h-full bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border border-gray-200 hover:border-[#00A78E]/50 transition-all duration-300 hover:shadow-xl">
                {/* Icon */}
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} text-white mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-7 h-7" />
                </div>

                {/* Content */}
                <h3 className="text-lg font-bold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Additional Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 bg-gradient-to-r from-[#00A78E]/10 to-blue-500/10 rounded-3xl p-8 md:p-12"
        >
          <div className="grid md:grid-cols-3 gap-8 text-center">
            {[
              { icon: "⚡", label: "Lightning Fast", value: "< 5 sec verification" },
              { icon: "💰", label: "Low Cost", value: "Minimal gas fees" },
              { icon: "🌍", label: "Global", value: "Accessible anywhere" },
            ].map((item, i) => (
              <div key={i}>
                <div className="text-2xl mb-1">{item.icon}</div>
                <div className="font-bold text-lg text-gray-900">{item.label}</div>
                <div className="text-sm text-gray-600 mt-1">{item.value}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
