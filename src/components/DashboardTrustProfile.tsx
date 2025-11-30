import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const DashboardTrustProfile = () => {
  const [reputationScore, setReputationScore] = useState(null);

  useEffect(() => {
    const fetchReputationScore = async () => {
      try {
        const response = await fetch("/api/reputation-score");
        const data = await response.json();
        setReputationScore(data.score);
      } catch (error) {
        console.error("Failed to fetch reputation score", error);
      }
    };

    fetchReputationScore();
  }, []);

  return (
    <section className="py-20 px-6">
      <div className="container mx-auto">
        <div className="max-w-2xl mx-auto">
          <p className="text-sm font-semibold text-primary text-center mb-2">Your Trust Profile</p>
          
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-8 rounded-3xl text-white shadow-2xl">
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <div className="text-sm text-white/80 mb-2">Reputation Score</div>
                <div className="text-4xl font-bold">{reputationScore !== null ? reputationScore : "N/A"}<span className="text-2xl text-white/80">/ 5.0</span></div>
              </div>
              <div>
                <div className="text-sm text-white/80 mb-2">Verification Tier</div>
                <div className="text-xl font-bold">Trusted Publisher</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-white/20">
              <div>
                <div className="text-sm text-white/80 mb-1">Registered Items</div>
                <div className="text-2xl font-bold">5</div>
              </div>
              <div>
                <div className="text-sm text-white/80 mb-1">Endorsements</div>
                <div className="text-2xl font-bold">12 entities</div>
              </div>
            </div>
            
            <Button className="w-full mt-6 bg-white text-blue-600 hover:bg-white/90">
              View Trust Graph
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DashboardTrustProfile;
