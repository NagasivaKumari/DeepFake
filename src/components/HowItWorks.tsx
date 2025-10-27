import React from "react";
import { motion } from "framer-motion";
import { Wallet, Upload, CheckCircle2, ArrowRight } from "lucide-react";

export default function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Register Media",
      description:
        "Upload your AI-generated content with metadata. We create cryptographic hashes and store immutable records on the blockchain.",
      icon: Upload,
      iconBg: "bg-blue-50 text-blue-600",
      badgeBg: "bg-blue-50 text-blue-600",
    },
    {
      number: "02",
      title: "Blockchain Attestation",
      description:
        "Your content is signed with your DID and registered on-chain. IPFS ensures decentralized, permanent storage.",
      icon: Wallet,
      iconBg: "bg-green-50 text-green-600",
      badgeBg: "bg-green-50 text-green-600",
    },
    {
      number: "03",
      title: "Verify Anywhere",
      description:
        "Anyone can verify your content's authenticity by comparing cryptographic hashes. Build trust with verifiable provenance.",
      icon: CheckCircle2,
      iconBg: "bg-purple-50 text-purple-600",
      badgeBg: "bg-purple-50 text-purple-600",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-32 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Three simple steps to protect and verify your digital content
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.12 }}
              className="relative"
            >
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 h-full flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${step.iconBg} shadow-sm`}>
                    <step.icon className="w-6 h-6" />
                  </div>

                  <div className={`inline-flex items-center justify-center px-3 py-1 rounded-md text-sm font-medium ${step.badgeBg} bg-opacity-80`}>{step.number}</div>
                </div>

                <div className="mt-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{step.title}</h3>
                  <p className="text-gray-600 mb-6">{step.description}</p>
                </div>

                {/* no action link by design - simplified card */}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}