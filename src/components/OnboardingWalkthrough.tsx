import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Camera, Home as HomeIcon, Map as MapIcon, Users as UsersIcon, MessageSquare, ArrowRight, X, Search, Trophy, Shield, Bell } from "lucide-react";

interface OnboardingCard {
  visual: React.ReactNode;
  title: string;
  description: string;
}

// ────────────────────────────────────────────────────────────────────────
// Reusable phone-frame mockup. Mirrors the actual app layout so users
// can recognize what to tap when they exit the walkthrough.
// Pass `highlight` to pulse one of the bottom-nav tabs.
// ────────────────────────────────────────────────────────────────────────
type TabKey = "home" | "wall" | "scan" | "map" | "feed";

const PhoneMockup = ({
  highlight,
  arrowLabel,
  arrowFrom = "left",
  topContent,
  bellHighlight,
  fabHighlight,
}: {
  highlight?: TabKey;
  arrowLabel?: string;
  arrowFrom?: "left" | "right" | "top";
  topContent?: React.ReactNode;
  bellHighlight?: boolean;
  fabHighlight?: boolean;
}) => {
  const tabs: { key: TabKey; icon: React.ReactNode; label: string; hero?: boolean }[] = [
    { key: "home", icon: <HomeIcon className="h-4 w-4" />, label: "Home" },
    { key: "wall", icon: <Trophy className="h-4 w-4" />, label: "Wall" },
    { key: "scan", icon: <Camera className="h-6 w-6" />, label: "Scan", hero: true },
    { key: "map",  icon: <MapIcon className="h-4 w-4" />, label: "Map" },
    { key: "feed", icon: <MessageSquare className="h-4 w-4" />, label: "Feed" },
  ];

  return (
    <div className="relative mx-auto" style={{ width: 220 }}>
      {/* Phone shell */}
      <div className="relative rounded-[28px] bg-card/80 border-2 border-foreground/15 shadow-xl overflow-hidden" style={{ height: 320 }}>
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4 bg-foreground/15 rounded-b-xl z-10" />

        {/* Content area */}
        <div className="absolute inset-0 top-5 bottom-14 px-3 py-3 flex flex-col">
          {topContent}
        </div>

        {/* Notification bell (bottom-left), highlighted if needed */}
        {bellHighlight && (
          <div className="absolute bottom-16 left-3 z-20">
            <div className="relative">
              <div className="absolute inset-0 -m-2 rounded-full bg-primary/40 animate-ping" />
              <div className="relative h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                <Bell className="h-4 w-4" />
              </div>
            </div>
          </div>
        )}

        {/* Account FAB (bottom-right), highlighted if needed */}
        {fabHighlight && (
          <div className="absolute bottom-16 right-3 z-20">
            <div className="relative">
              <div className="absolute inset-0 -m-2 rounded-full bg-accent/40 animate-ping" />
              <div className="relative h-8 w-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center shadow-lg text-base font-bold">
                ⚙
              </div>
            </div>
          </div>
        )}

        {/* Bottom nav */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-background/95 border-t border-border/60 flex items-end justify-around px-2 pb-1">
          {tabs.map(tab => {
            const isHighlighted = highlight === tab.key;
            if (tab.hero) {
              return (
                <div key={tab.key} className="relative -mt-4">
                  {isHighlighted && <div className="absolute inset-0 rounded-full bg-primary/50 animate-ping" />}
                  <div className={`relative h-11 w-11 rounded-full flex items-center justify-center shadow-lg ${isHighlighted ? "bg-primary text-primary-foreground ring-4 ring-primary/40" : "bg-primary/70 text-primary-foreground"}`}>
                    {tab.icon}
                  </div>
                </div>
              );
            }
            return (
              <div key={tab.key} className="relative flex flex-col items-center gap-0.5 px-1 py-1">
                {isHighlighted && (
                  <div className="absolute inset-0 -m-1 rounded-lg bg-primary/30 animate-pulse" />
                )}
                <div className={`relative ${isHighlighted ? "text-primary" : "text-muted-foreground"}`}>
                  {tab.icon}
                </div>
                <span className={`relative text-[8px] font-medium ${isHighlighted ? "text-primary" : "text-muted-foreground"}`}>{tab.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Arrow + label callout */}
      {arrowLabel && (
        <div
          className={`absolute flex items-center gap-1.5 ${
            arrowFrom === "left"  ? "-left-2 bottom-7 -translate-x-full" :
            arrowFrom === "right" ? "-right-2 bottom-7 translate-x-full flex-row-reverse" :
                                    "left-1/2 -top-8 -translate-x-1/2 flex-col"
          }`}
        >
          <span className="text-3xl leading-none drop-shadow-lg animate-bounce" aria-hidden>
            {arrowFrom === "top" ? "👇" : arrowFrom === "right" ? "👈" : "👉"}
          </span>
          <span className="bg-primary text-primary-foreground text-[11px] font-bold px-2 py-1 rounded-lg shadow-md whitespace-nowrap">
            {arrowLabel}
          </span>
        </div>
      )}
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────
// Vanity-plate spacing visual (special, not a phone mockup)
// ────────────────────────────────────────────────────────────────────────
const SpaceGap = () => (
  <span className="relative inline-flex flex-col items-center mx-1 align-middle">
    <span className="text-emerald-300 text-xl font-black leading-none -mb-0.5 animate-bounce">↓</span>
    <span className="block w-5 h-7 rounded border-2 border-dashed border-emerald-300 bg-emerald-400/30" />
    <span className="text-[9px] font-sans font-black text-emerald-200 tracking-wide mt-0.5">SPACE</span>
  </span>
);

const VanityPlateVisual = () => (
  <div className="w-full space-y-3 max-w-[260px] mx-auto">
    {/* CORRECT */}
    <div>
      <div className="flex items-center justify-center gap-1.5 text-emerald-300 text-xs font-black uppercase tracking-wider mb-1.5">
        <span className="text-base">✓</span> Correct
      </div>
      <div className="rounded-xl bg-emerald-600/30 border-2 border-emerald-400 px-3 pt-5 pb-3 flex items-center justify-center font-mono text-2xl font-black text-white">
        2 <SpaceGap /> MAX <SpaceGap /> 3
      </div>
    </div>

    {/* WRONG — solid red bg, white bold text, no fading */}
    <div>
      <div className="flex items-center justify-center gap-1.5 text-red-300 text-xs font-black uppercase tracking-wider mb-1.5">
        <span className="text-base">✗</span> Wrong
      </div>
      <div className="rounded-xl bg-red-600 border-2 border-red-400 px-3 py-3 flex items-center justify-center font-mono text-2xl font-black text-white line-through decoration-white decoration-[3px]">
        2MAX3
      </div>
    </div>
  </div>
);

// ────────────────────────────────────────────────────────────────────────
// PERSONAL CARDS — every card now shows WHERE in the app to tap
// ────────────────────────────────────────────────────────────────────────
const LocationPermissionVisual = () => (
  <div className="relative mx-auto" style={{ width: 220 }}>
    <div className="relative rounded-[28px] bg-card/80 border-2 border-foreground/15 shadow-xl overflow-hidden" style={{ height: 320 }}>
      {/* Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4 bg-foreground/15 rounded-b-xl z-10" />
      {/* Dimmed app behind the dialog */}
      <div className="absolute inset-0 top-5 px-3 py-3 opacity-30">
        <div className="rounded bg-foreground/10 h-3 w-3/4 mx-auto mt-2" />
        <div className="rounded bg-foreground/10 h-2 w-1/2 mx-auto mt-2" />
        <div className="rounded bg-foreground/10 h-16 w-full mt-4" />
      </div>
      {/* Mock system permission dialog */}
      <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 rounded-2xl bg-background border border-border shadow-2xl p-4 z-20">
        <div className="text-2xl text-center mb-2">📍</div>
        <p className="text-[11px] font-bold text-center text-foreground leading-snug mb-3">
          Allow Plate N' State to access this device's location?
        </p>
        <div className="space-y-1.5">
          <div className="relative">
            <div className="absolute inset-0 -m-1 rounded-lg bg-primary/40 animate-ping" />
            <div className="relative rounded-lg bg-primary text-primary-foreground text-[10px] font-bold text-center py-1.5 ring-2 ring-primary/50">
              While using the app ✓
            </div>
          </div>
          <div className="rounded-lg bg-muted text-muted-foreground text-[10px] text-center py-1.5">Only this time</div>
          <div className="rounded-lg bg-muted text-muted-foreground text-[10px] text-center py-1.5 line-through">Don't allow</div>
        </div>
      </div>
    </div>
    {/* Arrow callout pointing at the dialog */}
    <div className="absolute -left-2 top-1/2 -translate-x-full -translate-y-1/2 flex items-center gap-1.5">
      <span className="bg-primary text-primary-foreground text-[11px] font-bold px-2 py-1 rounded-lg shadow-md whitespace-nowrap">This one</span>
      <span className="text-3xl leading-none drop-shadow-lg animate-bounce" aria-hidden>👉</span>
    </div>
  </div>
);

const PERSONAL_CARDS: OnboardingCard[] = [
  {
    visual: <LocationPermissionVisual />,
    title: "Location On, or No Snitching",
    description: "Reports need to say WHERE it happened — shocking, we know. When Android asks for location, tap \"While using the app.\" Tap \"Don't allow\" and you'll be describing the crime scene from memory like it's 1987.",
  },
  {
    visual: (
      <PhoneMockup
        highlight="scan"
        arrowLabel="Tap to scan"
        arrowFrom="left"
        topContent={
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-[10px] opacity-50">
            (home screen)
          </div>
        }
      />
    ),
    title: "Scan a Plate",
    description: "Tap the big camera button in the center of the bottom bar. Point it at a license plate — the AI reads it instantly.",
  },
  {
    visual: <VanityPlateVisual />,
    title: "Vanity Plates Have Spaces",
    description: "If a plate reads \"2 MAX 3\", enter it with the spaces — not \"2MAX3\". They're different plates and reporting the wrong one helps nobody.",
  },
  {
    visual: (
      <PhoneMockup
        highlight="scan"
        arrowLabel="Same button"
        arrowFrom="left"
        topContent={
          <div className="flex-1 flex flex-col gap-1.5 mt-2">
            <div className="rounded bg-foreground/10 h-3 w-3/4 mx-auto" />
            <div className="rounded bg-foreground/10 h-2 w-1/2 mx-auto" />
            <div className="mt-2 rounded-lg bg-destructive/30 border border-destructive/60 p-1.5 text-[8px] text-destructive-foreground font-bold text-center">
              Pick infraction · Add details · Submit
            </div>
            <div className="text-[8px] text-center text-muted-foreground mt-1">📍 GPS auto-attached</div>
          </div>
        }
      />
    ),
    title: "File a Report",
    description: "After the AI reads the plate, a form pops up. Pick what the driver did, add details, and submit. Your GPS attaches automatically.",
  },
  {
    visual: (
      <PhoneMockup
        topContent={
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <div className="text-3xl">🪙</div>
            <div className="text-[13px] font-extrabold text-foreground">20 FREE Reports</div>
            <div className="rounded-lg bg-primary/20 border border-primary/50 px-2 py-1 text-[9px] text-center font-semibold">
              Already in your account
            </div>
            <div className="text-[8px] text-center text-muted-foreground px-2">
              1 coin = 1 report · Need more later? Coin packs in your Profile.
            </div>
          </div>
        }
      />
    ),
    title: "Your First 20 Are On Us",
    description: "You start with 20 free reports — no card, no trial, no fine print written by lawyers. That's 20 bad drivers you can immortalize before spending a dime. Use them wisely. Or don't, they're free.",
  },
  {
    visual: (
      <PhoneMockup
        fabHighlight
        arrowLabel="Tap account"
        arrowFrom="right"
        topContent={
          <div className="flex-1 flex flex-col items-center justify-center gap-1.5">
            <Trophy className="h-5 w-5 text-warning" />
            <div className="text-[10px] font-bold text-foreground">Level 3 — Road Watcher</div>
            <div className="h-1.5 w-32 rounded-full bg-muted overflow-hidden">
              <div className="h-full w-2/3 bg-primary" />
            </div>
            <div className="text-[8px] text-muted-foreground">245 / 400 XP</div>
            <div className="flex gap-1 mt-1">
              <span className="text-xs">🛡️</span><span className="text-xs">👁️</span><span className="text-xs">🔥</span><span className="text-xs opacity-30">⚔️</span>
            </div>
          </div>
        }
      />
    ),
    title: "Earn XP & Rank Up",
    description: "Every report earns XP and unlocks badges. Tap the account button (bottom-right) to see your level, streak, and trophies.",
  },
  {
    visual: (
      <PhoneMockup
        fabHighlight
        arrowLabel="Account → Claim"
        arrowFrom="right"
        topContent={
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <Shield className="h-6 w-6 text-accent" />
            <div className="rounded-lg bg-accent/20 border border-accent/40 px-2 py-1.5 font-mono text-sm font-black text-foreground tracking-wider">
              ABC 1234
            </div>
            <div className="text-[9px] text-center text-accent font-semibold">🔔 You'll be notified if<br/>anyone reports it</div>
          </div>
        }
      />
    ),
    title: "Claim Your Plate",
    description: "Lock in your own plate so you're notified instantly when someone reports it — and so you can dispute false ones. Tap the account button → Claim.",
  },
  {
    visual: (
      <PhoneMockup
        highlight="home"
        arrowLabel="Search bar"
        arrowFrom="left"
        topContent={
          <div className="flex-1 flex flex-col gap-2">
            <div className="rounded-full bg-muted/70 border-2 border-primary/60 px-2 py-1.5 flex items-center gap-1.5 text-[10px] text-foreground font-mono shadow-lg ring-2 ring-primary/30">
              <Search className="h-3 w-3 text-primary" />
              <span className="font-bold">ABC 1234</span>
            </div>
            <div className="text-[8px] text-muted-foreground text-center mt-1">→ History · Risk score · Map</div>
          </div>
        }
      />
    ),
    title: "Look Up Any Plate",
    description: "Type any plate into the search bar at the top of the Home screen to see its full report history, risk score, and incident map.",
  },
  {
    visual: (
      <PhoneMockup
        highlight="map"
        arrowLabel="Live map"
        arrowFrom="left"
        topContent={
          <div className="flex-1 rounded-lg bg-emerald-900/30 border border-emerald-700/40 relative overflow-hidden">
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-1 p-1.5 opacity-60">
              {Array.from({length:9}).map((_,i)=><div key={i} className="bg-emerald-800/30 rounded-sm" />)}
            </div>
            <span className="absolute top-3 left-4 text-base">📍</span>
            <span className="absolute top-7 right-6 text-base">📍</span>
            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-base">📍</span>
          </div>
        }
      />
    ),
    title: "Watch the Map",
    description: "See live reports near you on the Map tab. The Wall of Shame shows the worst offenders in your area.",
  },
];

// ────────────────────────────────────────────────────────────────────────
// ENTERPRISE CARDS — kept abstract; B2B users don't need the same hand-holding
// ────────────────────────────────────────────────────────────────────────
const EnterpriseIcon = ({ children, color }: { children: React.ReactNode; color: string }) => (
  <div className={`mx-auto w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center ${color}`}>
    {children}
  </div>
);

const ENTERPRISE_CARDS: OnboardingCard[] = [
  {
    visual: <EnterpriseIcon color="text-accent"><Shield className="h-10 w-10" /></EnterpriseIcon>,
    title: "Fleet Dashboard",
    description: "Monitor all your vehicles in one place. Get alerts when a fleet vehicle is reported.",
  },
  {
    visual: <EnterpriseIcon color="text-primary"><Search className="h-10 w-10" /></EnterpriseIcon>,
    title: "Batch Screening",
    description: "Upload a CSV of plate numbers to screen them all at once. Get risk scores instantly.",
  },
  {
    visual: <EnterpriseIcon color="text-warning"><Trophy className="h-10 w-10" /></EnterpriseIcon>,
    title: "Risk Scoring",
    description: "Every plate gets a risk score based on report history. Use it for underwriting or hiring decisions.",
  },
  {
    visual: <EnterpriseIcon color="text-destructive"><Shield className="h-10 w-10" /></EnterpriseIcon>,
    title: "Insurance & Law Enforcement",
    description: "Dedicated portals for insurance companies and agencies with advanced lookup tools.",
  },
  {
    visual: <EnterpriseIcon color="text-emerald-500"><UsersIcon className="h-10 w-10" /></EnterpriseIcon>,
    title: "API Access",
    description: "Integrate plate data into your own systems. Enterprise tiers include full API access.",
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
            className="text-center space-y-5"
          >
            <div>{card.visual}</div>
            <div>
              <h2 className="text-xl font-extrabold mb-2">{card.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed px-2">{card.description}</p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Dots */}
        <div className="flex justify-center gap-2 mt-6 mb-5">
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
            {isLast ? "Got it, let's go" : "Next"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWalkthrough;
