import { useMemo } from "react";
import { Skull, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import PlateCard from "@/components/PlateCard";
import DriverOfTheWeek from "@/components/DriverOfTheWeek";
import { usePlateRecords } from "@/hooks/usePlateRecords";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { INFRACTIONS } from "@/lib/data";

const WallOfShame = () => {
  const { plates, loading } = usePlateRecords(20);

  const driverOfTheWeek = useMemo(() => {
    if (!plates.length) return null;
    const top = plates[0];
    const topKey = Object.entries(top.infractions).sort((a, b) => b[1] - a[1])[0]?.[0];
    const topInf = INFRACTIONS.find((i) => i.type === topKey);
    return {
      plateNumber: top.plateNumber,
      reportCount: top.reportCount,
      topInfraction: topInf?.label || topKey || "Various",
    };
  }, [plates]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container py-10 space-y-8">
        <div className="flex items-center gap-3">
          <Link to="/honkzone">
            <Button variant="ghost" size="sm" className="rounded-full">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Skull className="h-5 w-5 text-destructive" />
            <h1 className="text-2xl sm:text-3xl font-extrabold gradient-text">Wall of Shame</h1>
          </div>
        </div>

        {driverOfTheWeek && (
          <div className="max-w-md mx-auto">
            <DriverOfTheWeek {...driverOfTheWeek} />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
            : plates.length === 0
              ? <p className="text-sm text-muted-foreground col-span-full text-center py-12">No offenders yet. The roads are… suspiciously clean. 🤔</p>
              : plates.map((plate, i) => (
                  <motion.div key={plate.plateNumber} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <PlateCard plate={plate} rank={i + 1} />
                  </motion.div>
                ))
          }
        </div>
      </section>
    </div>
  );
};

export default WallOfShame;
