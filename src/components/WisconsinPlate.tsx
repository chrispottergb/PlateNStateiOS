// Backwards-compatible alias. New code should import LicensePlate directly.
import LicensePlate from "./LicensePlate";

interface WisconsinPlateProps {
  plateNumber: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const WisconsinPlate = ({ plateNumber, size = "md", className }: WisconsinPlateProps) => (
  <LicensePlate plateNumber={plateNumber} state="WI" size={size} className={className} />
);

export default WisconsinPlate;
