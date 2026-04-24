import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Download from "@/components/Download";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-[#080c14]">
      <Navbar />
      <Hero />
      <Features />
      <Download />
      <Footer />
    </div>
  );
};

export default Index;
