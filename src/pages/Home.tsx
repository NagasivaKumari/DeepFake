import React from "react";
import { Button } from "@/components/ui/button";
import { ShieldCheck, UserCheck, AlertTriangle, Database, Wallet, ArrowRight, CheckCircle2, Zap } from "lucide-react";
import { motion } from "framer-motion";

import Header from "../components/landing/Header";
import Hero from "../components/landing/Hero";
import About from "../components/landing/About";
import HowItWorks from "../components/landing/HowItWorks";
import Features from "../components/landing/Features";
import GetStarted from "../components/landing/GetStarted";
import Footer from "../components/landing/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-gray-100">
      <Header />
      <Hero />
      <About />
      <HowItWorks />
      <Features />
      <GetStarted />
      <Footer />
    </div>
  );
}
