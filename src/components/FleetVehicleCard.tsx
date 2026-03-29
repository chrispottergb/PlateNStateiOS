import { Link } from "react-router-dom";
import { Car, AlertTriangle, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import FleetQRCodeModal from "@/components/FleetQRCodeModal";

interface FleetVehicleCardProps {
  plateNumber: string;
  vehicleLabel: string | null;
  reportCount: number;
  companyName: string;
  onRemove: () => void;
}

const FleetVehicleCard = ({ plateNumber, vehicleLabel, reportCount, onRemove }: FleetVehicleCardProps) => {
  const severity = reportCount === 0 ? "clean" : reportCount <= 3 ? "low" : reportCount <= 7 ? "medium" : "high";
  const severityColors = {
    clean: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    low: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    medium: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    high: "bg-destructive/10 text-destructive border-destructive/20",
  };

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex items-center justify-between gap-3">
        <Link to={`/plate/${encodeURIComponent(plateNumber)}`} className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 rounded-md bg-muted p-2">
            <Car className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-mono font-bold text-sm truncate">{plateNumber}</p>
            {vehicleLabel && (
              <p className="text-xs text-muted-foreground truncate">{vehicleLabel}</p>
            )}
          </div>
        </Link>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant="outline" className={severityColors[severity]}>
            <AlertTriangle className="h-3 w-3 mr-1" />
            {reportCount} {reportCount === 1 ? "report" : "reports"}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={(e) => { e.preventDefault(); onRemove(); }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FleetVehicleCard;
