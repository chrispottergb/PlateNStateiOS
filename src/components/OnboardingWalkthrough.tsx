import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Camera, MapPin, Shield, Trophy, Briefcase, FileSearch, Users, BarChart3, ArrowRight, X, Search } from "lucide-react";

interface OnboardingCard {
  icon?: React.ReactNode;
  visual?: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

const SpaceGap = () => (
  <span className="relative inline-flex flex-col items-center mx-1 align-middle">
    {/* bold arrow pointing down at the gap */}
    <span className="text-emerald-400 text-lg font-bold leading-none -mb-0.5 animate-bounce">↓</span>
    {/* the visible gap marker */}
    <span className="block w-5 h-7 rounded border-2 border-dashed border-emerald-400/70 bg-emerald-400/15" />
    <span className="text-[9px] font-sans font-bold text-emerald-400 tracking-wide mt-0.5">SPACE</span>
  </span>
);

const VanityPlateVisual = () => (
  <div className="w-full space-y-4">
    {/* CORRECT */}
    <div className="space-y-1.5">
      <div className="flex items-center justify-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider">
        <span className="text-base">✓</span> Correct
      </div>
      <div className="rounded-xl bg-emerald-500/10 border-2 border-emerald-500/50 px-3 pt-5 pb-3 flex items-center justify-center font-mono text-2xl font-black text-emerald-300">
        2 <SpaceGap /> MAX <SpaceGap /> 3
      </div>
    </div>

    {/* WRONG */}
    <div className="space-y-1.5">
      <div className="flex items-center justify-center gap-1.5 text-destructive text-xs font-bold uppercase tracking-wider">
        <span className="text-base">✗</span> Wrong
      </div>
      <div className="rounded-xl bg-destructive/10 border-2 border-destructive/40 px-3 py-3 flex items-center justify-center font-mono text-2xl font-black text-destructive/70 line-through decoration-2">
        2MAX3
      </div>
    </div>

    <p className="text-xs text-muted-foreground text-center leading-relaxed">
      <span className="font-semibold text-foreground">"2 MAX 3"</span> and <span className="font-semibold text-foreground">"2MAX3"</span> are two different plates. Always include the spaces.
    </p>
  </div>
);

const PERSONAL_CARDS: OnboardingCard[] = [
  {
    icon: <Camera className="h-10 w-10" />,
    title: "Scan a Plate",
    description: "Tap the report button, snap a photo of a license plate, and our AI reads it instantly. No typing needed.",
    color: "text-primary",
  },
  {
    visual: <VanityPlateVisual />,
    title: "Vanity Plates Have Spaces",
    description: "If a plate reads \"2 MAX 3\", enter it with the spaces — not \"2MAX3\". They're registered as different plates, so accuracy matters.",
    color: "text-emerald-500",
  },
  {
    icon: <MapPin className="h-10 w-10" />,
    title: "File a Report",
    description: "Pick the infraction, add details, and submit. Your GPS location is attached automatically.",
    color: "text-destructive",
  },
  {
    icon: <Trophy className="h-10 w-10" />,
    title: "Earn XP & Rank Up",
    description: "Every report earns XP. Climb the leaderboard and earn badges for your patrol activity.",
    color: "text-warning",
  },
  {
    icon: <Shield className="h-10 w-10" />,
    title: "Claim Your Plate",
    description: "Own your plate number to get notified when someone reports it. Dispute false reports easily.",
    color: "text-accent",
  },
  {
    icon: <Search className="h-10 w-10" />,
    title: "Look Up Any Plate",
    description: "Search any license plate to see its report history, risk score, and where incidents occurred.",
    color: "text-amber-500",
  },
  {
    icon: <MapPin className="h-10 w-10" />,
    title: "Watch the Map",
    description: "See live reports on the map. Check the Wall of Shame for the worst offenders in your area.",
    color: "text-emerald-500",
  },
];

const ENTERPRISE_CARDS: OnboardingCard[] = [
  {
    icon: <Briefcase className="h-10 w-10" />,
    title: "Fleet Dashboard",
    description: "Monitor all your vehicles in one place. Get alerts when a fleet vehicle is reported.",
    color: "text-accent",
  },
  {
    icon: <FileSearch className="h-10 w-10" />,
    title: "Batch Screening",
    description: "Upload a CSV of plate numbers to screen them all at once. Get risk scores instantly.",
    color: "text-primary",
  },
  {
    icon: <BarChart3 className="h-10 w-10" />,
    title: "Risk Scoring",
    description: "Every plate gets a risk score based on report history. Use it for underwriting or hiring decisions.",
    color: "text-warning",
  },
  {
    icon: <Shield className="h-10 w-10" />,
    title: "Insurance & Law Enforcement",
    description: "Dedicated portals for insurance companies and agencies with advanced lookup tools.",
    color: "text-destructive",
  },
  {
    icon: <Users className="h-10 w-10" />,
    title: "API Access",
    description: "Integrate plate data into your own systems. Enterprise tiers include full API access.",
    color: "text-emerald-500",
  },
];

interface Props {
  mode: "consumer" | "enterprise";
  onComplete: () => void;
}

const OnboardingWalkthrough = ({ mode, onComplete }: Props) => {
  const [step, setStep] = useState(0);
  const cards = mode === "enterprise" ? ENTERPRISE_CARDS : PERSONAL_CARDS;
  const card = cards[step];
  const isLast = step === cards.length - 1;

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex items-center justify-center p-4">
      <button
        onClick={onComplete}
        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="w-full max-w-sm">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
            className="text-center space-y-6"
          >
            {card.visual ? (
              <div className={card.color}>{card.visual}</div>
            ) : (
              <div className={`mx-auto w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center ${card.color}`}>
                {card.icon}
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold mb-2">{card.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{card.description}</p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Dots */}
        <div className="flex justify-center gap-2 mt-8 mb-6">
          {cards.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === step ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        <div className="flex gap-3">
          {step > 0 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="flex-1 rounded-full h-11"
            >
              Back
            </Button>
          )}
          <Button
            onClick={() => isLast ? onComplete() : setStep(step + 1)}
            className="flex-1 rounded-full h-11 gap-2 glow"
          >
            {isLast ? "Get Started" : "Next"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWalkthrough;
