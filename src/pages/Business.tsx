import { Truck, Landmark, ShieldCheck, ArrowRight, Briefcase, CheckCircle2, Quote, Award } from "lucide-react";
import Header from "@/components/Header";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const PORTALS = [
  {
    to: "/fleet",
    icon: Truck,
    category: "Fleet",
    title: "Fleet Management",
    desc: "Track your drivers with \"How's My Driving?\" programs. Monitor fleet safety scores, reduce liability, and generate weekly reports.",
    price: "$199",
    cta: "Get Started",
  },
  {
    to: "/insurance",
    icon: ShieldCheck,
    category: "Risk",
    title: "Insurance Portal",
    desc: "Driver risk scores, incident history reports, automated screening tools, and underwriting data for informed decisions.",
    price: "$349",
    cta: "Access Portal",
  },
  {
    to: "/law-enforcement",
    icon: Landmark,
    category: "Agency",
    title: "Law Enforcement",
    desc: "Advanced plate lookups, investigation tools, inter-agency data sharing, and community intelligence feeds.",
    price: "$499",
    cta: "Learn More",
  },
];

const Business = () => {
  return (
    <div className="min-h-screen bg-background noise-overlay">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-mesh-bg" />
        <div className="absolute inset-0 dot-grid opacity-30" />
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-accent/8 rounded-full blur-3xl animate-float" />

        <div className="container relative py-14 sm:py-24 text-center max-w-3xl mx-auto space-y-6 z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Badge variant="secondary" className="rounded-full px-4 py-1.5 mb-4 text-[10px] uppercase tracking-[0.2em] font-bold gap-1.5">
              <Briefcase className="h-3 w-3" /> Enterprise Solutions
            </Badge>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold leading-tight">
              <span className="gradient-text">Plate N' State</span>
              <br />
              <span className="text-foreground">for Business</span>
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto mt-4">
              Real-time plate intelligence, risk scoring, and investigation support for fleet operators, law enforcement agencies, and insurance companies.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="container pb-10 max-w-3xl mx-auto relative z-10">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="glass-card p-6 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl sm:text-3xl font-extrabold gradient-text">500+</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Clients</p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-extrabold gradient-text">99.9%</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Uptime</p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-extrabold gradient-text">SOC2</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Compliant</p>
          </div>
        </motion.div>
      </section>

      {/* Portal Cards */}
      <section className="container pb-16 grid sm:grid-cols-3 gap-5 max-w-4xl mx-auto relative z-10">
        {PORTALS.map((item, i) => (
          <motion.div
            key={item.to}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
          >
            <Link to={item.to} className="group block h-full">
              <div className="glass-card p-6 space-y-4 text-center h-full hover:border-primary/30 transition-all">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto group-hover:bg-primary/20 transition-colors">
                  <item.icon className="h-7 w-7" />
                </div>
                <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-wider">{item.category}</Badge>
                <h3 className="text-lg font-bold">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                <p className="text-sm font-bold">Starting at <span className="gradient-text-accent">{item.price}</span>/mo</p>
                <Button variant="outline" className="rounded-full gap-1.5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  {item.cta} <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </Link>
          </motion.div>
        ))}
      </section>

      {/* Testimonial */}
      <section className="container pb-16 max-w-2xl mx-auto text-center relative z-10">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="glass-card p-8 space-y-4">
          <Quote className="h-8 w-8 text-primary/30 mx-auto" />
          <p className="text-muted-foreground text-sm italic leading-relaxed">
            "Plate N' State helped our department identify 3x more repeat offenders in the first quarter alone. The community intelligence is unmatched."
          </p>
          <p className="text-xs text-muted-foreground font-semibold">— Sheriff's Dept., Dane County</p>
        </motion.div>
      </section>

      {/* Footer Badge */}
      <footer className="border-t border-border/30 py-6">
        <div className="container text-center">
          <Badge variant="outline" className="rounded-full px-4 py-1.5 gap-1.5 text-xs">
            <Award className="h-3.5 w-3.5 text-primary" />
            Wisconsin Certified Data Provider
          </Badge>
        </div>
      </footer>
    </div>
  );
};

export default Business;
