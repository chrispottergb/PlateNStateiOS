import { Truck, Landmark, ShieldCheck, ArrowRight, Briefcase, CheckCircle2 } from "lucide-react";
import Header from "@/components/Header";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const TRUST_POINTS = [
  "SOC 2 compliant infrastructure",
  "End-to-end encrypted data",
  "99.9% uptime SLA",
  "CJIS-ready for law enforcement",
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
            <div className="inline-flex items-center gap-2 rounded-full glass-card px-4 py-1.5 mb-4">
              <Briefcase className="h-3.5 w-3.5 text-accent" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Enterprise</span>
            </div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold leading-tight">
              <span className="gradient-text">Professional Road Safety</span>
              <br />
              <span className="text-foreground">Intelligence</span>
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto mt-4">
              Real-time plate intelligence, risk scoring, and investigation support for fleet operators, law enforcement agencies, and insurance companies.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Portal cards */}
      <section className="container pb-16 grid sm:grid-cols-3 gap-5 max-w-4xl mx-auto relative z-10">
        {[
          {
            to: "/fleet",
            icon: Truck,
            title: "Fleet Management",
            desc: "Track your drivers with \"How's My Driving?\" programs. Monitor fleet safety scores and reduce liability.",
            price: "Starting at $199/mo",
            cta: "Get Started",
            gradient: "from-primary/60 to-accent/40",
          },
          {
            to: "/law-enforcement",
            icon: Landmark,
            title: "Law Enforcement",
            desc: "Advanced plate lookups, investigation tools, inter-agency data sharing, and community intelligence feeds.",
            price: "Starting at $799/mo",
            cta: "Learn More",
            gradient: "from-accent/60 to-success/40",
          },
          {
            to: "/insurance",
            icon: ShieldCheck,
            title: "Insurance Portal",
            desc: "Driver risk scores, incident history reports, automated screening tools, and underwriting data.",
            price: "Starting at $349/mo",
            cta: "Access Portal",
            gradient: "from-warning/50 to-primary/40",
          },
        ].map((item, i) => (
          <motion.div
            key={item.to}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
          >
            <Link to={item.to} className="group block h-full">
              <div className="relative rounded-2xl overflow-hidden h-full">
                <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="absolute inset-0 bg-gradient-to-br from-foreground/[0.04] to-transparent" />
                <div className="relative m-[1px] rounded-[15px] bg-background/95 group-hover:bg-background/90 p-6 space-y-4 text-center h-full transition-colors glass-card border-0">
                  <div className="relative">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto group-hover:bg-primary/20 transition-colors">
                      <item.icon className="h-7 w-7" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold">{item.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                  <p className="text-xs font-semibold text-foreground/60">{item.price}</p>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:gap-2.5 transition-all">
                    {item.cta} <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </section>

      {/* Trust stats */}
      <section className="container pb-12 max-w-3xl mx-auto relative z-10">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="glass-card p-8 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-3xl font-extrabold gradient-text">10K+</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Reports Filed</p>
          </div>
          <div>
            <p className="text-3xl font-extrabold gradient-text">5K+</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Plates Tracked</p>
          </div>
          <div>
            <p className="text-3xl font-extrabold gradient-text">50+</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Agency Partners</p>
          </div>
        </motion.div>
      </section>

      {/* Trust points */}
      <section className="container pb-12 max-w-2xl mx-auto relative z-10">
        <div className="grid grid-cols-2 gap-3">
          {TRUST_POINTS.map((point, i) => (
            <motion.div
              key={point}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.08 }}
              className="flex items-center gap-2 glass-card px-4 py-3"
            >
              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              <span className="text-xs text-muted-foreground">{point}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonial */}
      <section className="container pb-20 max-w-2xl mx-auto text-center space-y-4 relative z-10">
        <div className="glass-card p-8 space-y-3">
          <p className="text-muted-foreground text-sm italic leading-relaxed">
            "Plate N' State helped our department identify 3x more repeat offenders in the first quarter alone."
          </p>
          <p className="text-xs text-muted-foreground font-semibold">— Sheriff's Dept., Dane County</p>
        </div>
      </section>

      <footer className="border-t border-border/30 py-6">
        <div className="container text-center text-xs text-muted-foreground">
          <p>Plate N' State — Enterprise road safety solutions. Contact us for custom plans.</p>
        </div>
      </footer>
    </div>
  );
};

export default Business;
