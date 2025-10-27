const DashboardStandards = () => {
  const standards = [
    "C2PA compliant metadata standards",
    "Cryptographic hash verification (SHA-256 + pHash)",
    "Decentralized storage on IPFS",
    "Ethereum blockchain attestation"
  ];

  return (
    <section className="py-20 px-6 bg-gradient-to-br from-blue-50 to-teal-50">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-primary mb-2">Trustworthy Technology</p>
          <h2 className="text-4xl font-bold">Built on Standards You Can Trust</h2>
        </div>
        
        <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-6">
          {standards.map((standard, index) => (
            <div key={index} className="bg-white p-6 rounded-xl border border-border flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-medium">{standard}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DashboardStandards;
