import { Shield, Skull, Briefcase, ArrowRight } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import Header from "@/components/Header";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const FUNNY_TAGLINES = [
  "Because honking isn't enough™",
  "Snitches get... safer roads 🛣️",
  "Passive-aggressive, but make it civic duty",
  "Your mom said use your blinker 💡",
  "Dashcam drama, crowdsourced 🍿",
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <section className="relative flex-1 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
        </div>
        <div className="absolute inset-0 dot-grid" />

        <div className="container relative py-16 sm:py-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center space-y-8"
          >
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em]">Plate N' State</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.1] gradient-text">
              Report Bad Drivers.<br />Keep Roads Safe.
            </h1>

            <p className="text-muted-foreground text-base sm:text-lg max-w-lg mx-auto">
              Community-powered accountability for your state's roads — whether you're here for the laughs or the business.
            </p>

            {/* Two path cards */}
            <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto pt-4">
              <Link to="/honkzone" className="group">
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative rounded-2xl p-[2px] bg-gradient-to-br from-primary via-primary/60 to-accent overflow-hidden"
                >
                  <div className="rounded-[14px] bg-background p-8 space-y-4 text-center h-full">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto">
                      <Skull className="h-7 w-7" />
                    </div>
                    <h2 className="text-xl font-extrabold">Wall of Shame</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Report plates, roast bad drivers, upvote the worst offenders. It's like social media, but for road rage. 😂
                    </p>
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:gap-2.5 transition-all">
                      Enter the Chaos <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </motion.div>
              </Link>

              <Link to="/business" className="group">
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative rounded-2xl p-[2px] bg-gradient-to-br from-accent via-secondary to-muted overflow-hidden"
                >
                  <div className="rounded-[14px] bg-background p-8 space-y-4 text-center h-full">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent-foreground mx-auto">
                      <Briefcase className="h-7 w-7" />
                    </div>
                    <h2 className="text-xl font-extrabold">Business & Enterprise</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Fleet management, law enforcement tools, and insurance portals. Professional-grade road intelligence.
                    </p>
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:gap-2.5 transition-all">
                      Explore Solutions <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </motion.div>
              </Link>
            </div>
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
      </section>

      <footer className="border-t border-border/50 py-6">
        <div className="container text-center text-xs text-muted-foreground">
          <p>Plate N' State — Community-driven road safety. Not affiliated with any government agency.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
