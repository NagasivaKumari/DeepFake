import React from "react";
import { Github, Twitter, MessageCircle, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { useWallet } from "@/hooks/useWallet";

export default function Footer() {
  const { isConnected } = useWallet();
  const quickLinks = [
    { label: "Home", href: "#home" },
    { label: "About", href: "#about" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Features", href: "#features" },
    { label: "Get Started", href: "#get-started" },
  ];

  const socialLinks = [
    { icon: Twitter, label: "Twitter", href: "https://twitter.com" },
    { icon: Github, label: "GitHub", href: "https://github.com" },
    { icon: MessageCircle, label: "Discord", href: "https://discord.com" },
  ];

  const scrollToSection = (href) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <footer className="bg-[#1E1E1E] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-green-500 rounded-xl flex items-center justify-center shadow-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold">ProofChain</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Verifiable content provenance on the blockchain — register and verify media with cryptographic proofs.
            </p>
          </div>

          {/* Product Links - visible when wallet connected */}
          <div>
            <h3 className="text-lg font-bold mb-4">Product</h3>
            {!isConnected ? (
              <p className="text-sm text-gray-500">Connect your wallet to see product actions.</p>
            ) : (
              <ul className="space-y-3 text-sm text-gray-400">
                <li>
                  <Link to={createPageUrl("RegisterMedia")} className="hover:text-[#00A78E]">Register Media</Link>
                </li>
                <li>
                  <Link to={createPageUrl("VerifyMedia")} className="hover:text-[#00A78E]">Verify Content</Link>
                </li>
                <li>
                  <Link to={createPageUrl("DeveloperDocs")} className="hover:text-[#00A78E]">API Docs</Link>
                </li>
              </ul>
            )}
          </div>

          {/* Social */}
          <div>
            <h3 className="text-lg font-bold mb-4">Resources</h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li><a href="#" className="hover:text-[#00A78E]">Whitepaper</a></li>
              <li><a href="#" className="hover:text-[#00A78E]">GitHub</a></li>
              <li><Link to={createPageUrl("FAQ")} className="hover:text-[#00A78E]">FAQ</Link></li>
            </ul>
            <div className="mt-6 flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-[#00A78E] flex items-center justify-center transition-colors duration-300"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
            <p className="text-gray-400 text-sm mt-6">
              Join our community and stay updated with the latest developments.
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
            <p>© 2025 ProofChain | Built on Algorand</p>
            <div className="flex gap-6">
              <button className="hover:text-[#00A78E] transition-colors">Privacy Policy</button>
              <button className="hover:text-[#00A78E] transition-colors">Terms of Service</button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}