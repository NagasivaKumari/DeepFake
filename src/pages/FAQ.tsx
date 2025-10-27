import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  HelpCircle,
  Search,
  BookOpen,
  Shield,
  Code,
  Video
} from "lucide-react";

export default function FAQ() {
  const [searchQuery, setSearchQuery] = useState("");

  const faqCategories = [
    {
      category: "Getting Started",
      icon: BookOpen,
      color: "blue",
      questions: [
        {
          q: "What does it mean to 'verify content'?",
          a: "Content verification means proving the authenticity and origin of digital media. ProofChain creates a cryptographic fingerprint of your content and registers it on the blockchain, creating an immutable record that anyone can check to verify the content's authenticity and creator."
        },
        {
          q: "How does blockchain help with verification?",
          a: "Blockchain provides an immutable, transparent, and decentralized record of when content was created and by whom. Once registered, the information cannot be altered or deleted, providing permanent proof of provenance. This makes it impossible to falsely claim creation of content or alter its metadata retroactively."
        },
        {
          q: "Do I need cryptocurrency to use ProofChain?",
          a: "No! While ProofChain uses blockchain technology for verification, you don't need to own or purchase any cryptocurrency. We handle all blockchain transactions in the background. You just need to connect a wallet for identity purposes."
        }
      ]
    },
    {
      category: "Technical Details",
      icon: Code,
      color: "green",
      questions: [
        {
          q: "What are SHA-256 and perceptual hashes?",
          a: "SHA-256 is a cryptographic hash function that creates a unique 'fingerprint' of your exact file. Even a tiny change creates a completely different hash. Perceptual hashing (pHash) creates a fingerprint based on visual/audio characteristics, allowing detection of similar content even if slightly edited (like compression, cropping, or format changes)."
        },
        {
          q: "What if a video is slightly edited or compressed?",
          a: "This is where perceptual hashing shines! While SHA-256 requires exact matches, pHash can detect similarity even after edits like compression, cropping, color adjustments, or format changes. ProofChain uses both methods to provide robust verification - exact matches via SHA-256 and similarity detection via pHash."
        },
        {
          q: "What is perceptual similarity?",
          a: "Perceptual similarity measures how similar two pieces of media appear to human perception, rather than binary file comparison. A score of 95%+ typically indicates the same content with minor edits. This helps detect unauthorized copies or derivatives of your original work."
        }
      ]
    },
    {
      category: "Security & Trust",
      icon: Shield,
      color: "purple",
      questions: [
        {
          q: "How secure is my content?",
          a: "Your original files are stored on IPFS (decentralized storage) with optional encryption. Only metadata and cryptographic hashes are stored on the blockchain. Your wallet controls access to your registrations, and all metadata is cryptographically signed to prevent tampering."
        },
        {
          q: "What if I see unverified or fake content?",
          a: "If content isn't registered with ProofChain, you'll receive a 'Not Found' verification result. This doesn't necessarily mean it's fake - it might just not be registered yet. However, if you find content claiming to be from a verified creator but showing as unverified, that's a red flag worth investigating."
        },
        {
          q: "Can registrations be revoked?",
          a: "Yes! Creators can revoke registrations at any time (for example, if content was registered by mistake). Revoked content will show as such during verification, but the historical record remains on the blockchain for transparency."
        }
      ]
    },
    {
      category: "Content Standards",
      icon: Video,
      color: "orange",
      questions: [
        {
          q: "What is C2PA?",
          a: "C2PA (Coalition for Content Provenance and Authenticity) is an industry standard for content authenticity metadata. ProofChain implements C2PA standards, ensuring our verification is compatible with other platforms and tools adopting this widely-recognized framework."
        },
        {
          q: "How do I canonicalize AI videos properly?",
          a: "Canonicalization means converting media to a standard format before hashing. ProofChain automatically handles this - we normalize video codecs, frame rates, and containers to ensure consistent hashing. This prevents the same content from generating different hashes just due to format differences."
        },
        {
          q: "Why do metadata and DID signatures matter?",
          a: "Metadata provides context (who created it, when, how), while DID (Decentralized Identifier) signatures prove that the metadata truly came from the claimed creator. Together, they create verifiable attribution that can't be forged, stolen, or altered."
        }
      ]
    }
  ];

  const filteredCategories = faqCategories.map(cat => ({
    ...cat,
    questions: cat.questions.filter(q =>
      q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.a.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(cat => cat.questions.length > 0);

  const colorClasses = {
    blue: "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
    purple: "bg-purple-100 text-purple-700",
    orange: "bg-orange-100 text-orange-700"
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-cyan-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-gray-600">
            Everything you need to know about content verification
          </p>
        </div>

        {/* Search */}
        <Card className="shadow-xl border-none mb-8">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search for answers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12"
              />
            </div>
          </CardContent>
        </Card>

        {/* FAQ Categories */}
        {filteredCategories.length > 0 ? (
          <div className="space-y-6">
            {filteredCategories.map((category, i) => (
              <Card key={i} className="shadow-xl border-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${colorClasses[category.color]} flex items-center justify-center`}>
                      <category.icon className="w-5 h-5" />
                    </div>
                    <div>
                      {category.category}
                      <Badge className="ml-3" variant="outline">
                        {category.questions.length} questions
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="space-y-2">
                    {category.questions.map((faq, j) => (
                      <AccordionItem key={j} value={`item-${i}-${j}`} className="border rounded-lg px-4">
                        <AccordionTrigger className="text-left hover:no-underline">
                          <div className="flex items-start gap-3">
                            <HelpCircle className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                            <span className="font-medium">{faq.q}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <p className="text-gray-600 leading-relaxed pl-8">
                            {faq.a}
                          </p>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="shadow-xl border-none">
            <CardContent className="p-12 text-center">
              <HelpCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No results found</h3>
              <p className="text-gray-600">Try searching with different keywords</p>
            </CardContent>
          </Card>
        )}

        {/* Additional Resources */}
        <Card className="shadow-xl border-none mt-8 bg-gradient-to-r from-blue-600 to-green-600 text-white">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-2">Still have questions?</h2>
            <p className="text-blue-100 mb-6">
              Check out our comprehensive documentation or reach out to our support team
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="#" className="inline-block">
                <button className="px-6 py-3 bg-white text-blue-600 rounded-lg font-medium hover:bg-gray-100 transition-colors">
                  View Full Documentation
                </button>
              </a>
              <a href="#" className="inline-block">
                <button className="px-6 py-3 border-2 border-white text-white rounded-lg font-medium hover:bg-white/10 transition-colors">
                  Contact Support
                </button>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}