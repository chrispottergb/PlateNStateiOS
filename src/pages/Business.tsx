import { Truck, Landmark, ShieldCheck, ArrowRight, Briefcase } from "lucide-react";
import Header from "@/components/Header";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const Business = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="container py-12 sm:py-20 text-center max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Enterprise</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold gradient-text leading-tight">
          Professional Road Safety Intelligence
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
          Real-time plate intelligence, risk scoring, and investigation support for fleet operators, law enforcement agencies, and insurance companies.
        </p>
      </section>

      {/* Portal cards */}
      <section className="container pb-12 grid sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
        {[
          {
            to: "/fleet",
            icon: Truck,
            title: "Fleet Management",
            desc: "Track your drivers with \"How's My Driving?\" programs. Monitor fleet safety scores and reduce liability.",
            price: "Starting at $199/mo",
            cta: "Get Started",
          },
          {
            to: "/law-enforcement",
            icon: Landmark,
            title: "Law Enforcement",
            desc: "Advanced plate lookups, investigation tools, inter-agency data sharing, and community intelligence feeds.",
            price: "Starting at $499/mo",
            cta: "Learn More",
          },
          {
            to: "/insurance",
            icon: ShieldCheck,
            title: "Insurance Portal",
            desc: "Driver risk scores, incident history reports, automated screening tools, and underwriting data.",
            price: "Starting at $349/mo",
            cta: "Access Portal",
          },
        ].map((item, i) => (
          <motion.div
            key={item.to}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Link to={item.to} className="group block rounded-2xl glass p-6 hover:glow transition-all text-center space-y-4 h-full">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto">
                <item.icon className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold">{item.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              <p className="text-xs font-semibold text-foreground/70">{item.price}</p>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:gap-2.5 transition-all">
                {item.cta} <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </motion.div>
        ))}
      </section>

      {/* Trust stats */}
      <section className="container pb-12 max-w-3xl mx-auto">
        <div className="glass rounded-2xl p-8 grid grid-cols-3 gap-4 text-center">
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
        </div>
      </section>

      {/* Testimonial / trust */}
      <section className="container pb-20 max-w-2xl mx-auto text-center space-y-4">
        <p className="text-muted-foreground text-sm italic">
          "Plate In State helped our department identify 3x more repeat offenders in the first quarter alone."
        </p>
        <p className="text-xs text-muted-foreground font-semibold">— Sheriff's Dept., Dane County</p>
      </section>

      <footer className="border-t border-border/50 py-6">
        <div className="container text-center text-xs text-muted-foreground">
          <p>Plate In State — Enterprise road safety solutions. Contact us for custom plans.</p>
        </div>
      </footer>
    </div>
  );
};

export default Business;
