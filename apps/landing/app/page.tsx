import Navbar from "@/components/sections/Navbar";
import Hero from "@/components/sections/Hero";
import Features from "@/components/sections/Features";
import Testimonials from "@/components/sections/Testimonials";
import Plans from "@/components/sections/Plans";
import Download from "@/components/sections/Download";
import Footer from "@/components/sections/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <Navbar />
      <Hero />
      <Features />
      <Testimonials />
      <Plans />
      <Download />
      <Footer />
    </main>
  );
}
