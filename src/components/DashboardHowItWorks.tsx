import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import axios from "axios";

const DashboardHowItWorks = () => {
  const [steps, setSteps] = useState([
    { number: "01", icon: "bg-blue-500", title: "Loading...", description: "Fetching data...", link: false },
    { number: "02", icon: "bg-green-500", title: "Loading...", description: "Fetching data...", link: false },
    { number: "03", icon: "bg-purple-500", title: "Loading...", description: "Fetching data...", link: false },
  ]);

  useEffect(() => {
    const fetchSteps = async () => {
      try {
        const response = await axios.get("/api/how-it-works");
        setSteps(response.data);
      } catch (error) {
        console.error("Failed to fetch steps:", error);
      }
    };

    fetchSteps();
  }, []);

  return (
    <section className="py-20 px-6">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">How It Works</h2>
          <p className="text-muted-foreground">Three simple steps to protect and verify your digital content</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div key={step.number} className="relative">
              <div className="bg-white p-8 rounded-2xl border-2 border-border hover:border-primary transition-all hover:shadow-lg">
                <div className={`w-16 h-16 ${step.icon} rounded-2xl flex items-center justify-center text-white mb-6`}>
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {step.number === "01" && (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    )}
                    {step.number === "02" && (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    )}
                    {step.number === "03" && (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    )}
                  </svg>
                </div>
                <div className="absolute top-6 right-6 text-6xl font-bold text-gray-100">{step.number}</div>
                <h3 className="text-xl font-bold mb-4">{step.title}</h3>
                <p className="text-muted-foreground mb-4">{step.description}</p>
                {step.link && (
                  <Button variant="link" className="text-primary p-0 h-auto">
                    Learn more →
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DashboardHowItWorks;
