import { Button } from "@/components/ui/button";

const DashboardCTA = () => {
  return (
    <section className="py-20 px-6 bg-gradient-to-br from-blue-600 to-teal-500 text-white">
      <div className="container mx-auto text-center">
        <h2 className="text-4xl font-bold mb-6">Ready to Verify Your Content?</h2>
        <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
          Join thousands of creators protecting their digital work with blockchain verification
        </p>
        
        <div className="flex flex-wrap justify-center gap-4">
          <Button className="bg-white text-blue-600 hover:bg-white/90 text-lg px-8 py-6">
            Get Started Now
          </Button>
          <Button className="bg-white text-blue-600 hover:bg-white/90 text-lg px-8 py-6">
            Explore API
          </Button>
        </div>
      </div>
    </section>
  );
};

export default DashboardCTA;
