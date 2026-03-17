import { Check, Zap, Building2, Crown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export type FleetTier = "starter" | "business" | "premium";

interface TierConfig {
  key: FleetTier;
  name: string;
  price: string;
  period: string;
  icon: React.ReactNode;
  description: string;
  vehicleLimit: number;
  features: string[];
  popular?: boolean;
}

const tiers: TierConfig[] = [
  {
    key: "starter",
    name: "Starter",
    price: "$29",
    period: "/mo",
    icon: <Zap className="h-6 w-6" />,
    description: "For small fleets getting started with driver safety tracking.",
    vehicleLimit: 10,
    features: [
      "Up to 10 vehicles",
      "Real-time report alerts",
      "Basic driver scorecards",
      "Email notifications",
    ],
  },
  {
    key: "business",
    name: "Business",
    price: "$79",
    period: "/mo",
    icon: <Building2 className="h-6 w-6" />,
    description: "For growing fleets that need deeper insights and analytics.",
    vehicleLimit: 50,
    popular: true,
    features: [
      "Up to 50 vehicles",
      "Real-time report alerts",
      "Advanced analytics dashboard",
      "Driver performance rankings",
      "Weekly summary reports",
      "Priority support",
    ],
  },
  {
    key: "premium",
    name: "Premium",
    price: "$199",
    period: "/mo",
    icon: <Crown className="h-6 w-6" />,
    description: "For enterprise fleets needing full coverage and custom tools.",
    vehicleLimit: 9999,
    features: [
      "Unlimited vehicles",
      "Real-time report alerts",
      "Full analytics suite",
      "Custom driver reports",
      "API access",
      "Dedicated account manager",
      "Insurance report integration",
    ],
  },
];

export const TIER_VEHICLE_LIMITS: Record<FleetTier, number> = {
  starter: 10,
  business: 50,
  premium: 9999,
};

interface FleetPricingProps {
  onSelectTier: (tier: FleetTier) => void;
  loading?: boolean;
}

const FleetPricing = ({ onSelectTier, loading }: FleetPricingProps) => {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Choose Your Fleet Plan</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Monitor your drivers, reduce risk, and improve safety with real-time community reports.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
        {tiers.map((tier, i) => (
          <motion.div
            key={tier.key}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
          >
            <Card
              className={cn(
                "relative flex flex-col h-full transition-all duration-200",
                tier.popular
                  ? "border-primary shadow-lg shadow-primary/10 scale-[1.03]"
                  : "hover:border-primary/40"
              )}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                  Most Popular
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <div
                  className={cn(
                    "mx-auto mb-2 h-12 w-12 rounded-xl flex items-center justify-center",
                    tier.popular
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {tier.icon}
                </div>
                <CardTitle className="text-xl">{tier.name}</CardTitle>
                <p className="text-muted-foreground text-sm">{tier.description}</p>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 pt-0">
                <div className="text-center mb-4">
                  <span className="text-4xl font-black">{tier.price}</span>
                  <span className="text-muted-foreground text-sm">{tier.period}</span>
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={tier.popular ? "default" : "outline"}
                  onClick={() => onSelectTier(tier.key)}
                  disabled={loading}
                >
                  Get Started
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default FleetPricing;
