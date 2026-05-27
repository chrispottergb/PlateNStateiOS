import { useState } from "react";
import Header from "@/components/Header";
import PlateCard from "@/components/PlateCard";
import { INFRACTIONS } from "@/lib/data";
import { usePlateRecords } from "@/hooks/usePlateRecords";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

const Leaderboard = () => {
  const [filter, setFilter] = useState<string>("all");
  // Pass filter to hook — server does the GROUP BY instead of client-side scan
  const { plates: filtered, loading } = usePlateRecords(100, filter);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-10 max-w-2xl">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Trophy className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Leaderboard</h1>
            <p className="text-sm text-muted-foreground">
              Worst-scoring plates ranked by community reports
            </p>
          </div>
        </div>

        <div className="my-6">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-56 rounded-lg">
              <SelectValue placeholder="Filter by infraction" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Infractions</SelectItem>
              {INFRACTIONS.map(inf => (
                <SelectItem key={inf.type} value={inf.type}>{inf.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))
            : filtered.length === 0
              ? <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 space-y-3">
                  <div className="text-5xl">🏆</div>
                  <p className="text-lg font-extrabold">The Leaderboard is Empty</p>
                  <p className="text-sm text-muted-foreground">No one's earned their spot on the naughty list yet. Go report some plates!</p>
                </motion.div>
              : filtered.map((plate, i) => (
                  <motion.div
                    key={plate.plateNumber}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <PlateCard plate={plate} rank={i + 1} />
                  </motion.div>
                ))
          }
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
