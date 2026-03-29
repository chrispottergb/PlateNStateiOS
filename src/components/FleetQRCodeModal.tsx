import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, Printer, QrCode } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface FleetQRCodeModalProps {
  plateNumber: string;
  vehicleLabel: string | null;
  companyName: string;
}

const FleetQRCodeModal = ({ plateNumber, vehicleLabel, companyName }: FleetQRCodeModalProps) => {
  const qrRef = useRef<HTMLDivElement>(null);

  const reportUrl = `${window.location.origin}/plate/${encodeURIComponent(plateNumber)}`;

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 600;
    canvas.height = 800;

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      // White background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Company header
      ctx.fillStyle = "#111827";
      ctx.font = "bold 28px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(companyName, 300, 50);

      // "How's My Driving?" title
      ctx.font = "bold 36px system-ui, sans-serif";
      ctx.fillStyle = "#dc2626";
      ctx.fillText("How's My Driving?", 300, 100);

      // QR code centered
      ctx.drawImage(img, 100, 130, 400, 400);

      // Plate number
      ctx.fillStyle = "#111827";
      ctx.font = "bold 40px monospace";
      ctx.fillText(plateNumber, 300, 590);

      // Vehicle label
      if (vehicleLabel) {
        ctx.font = "20px system-ui, sans-serif";
        ctx.fillStyle = "#6b7280";
        ctx.fillText(vehicleLabel, 300, 625);
      }

      // Instructions
      ctx.font = "18px system-ui, sans-serif";
      ctx.fillStyle = "#6b7280";
      ctx.fillText("Scan to report this driver", 300, 670);

      // Branding
      ctx.font = "14px system-ui, sans-serif";
      ctx.fillStyle = "#9ca3af";
      ctx.fillText("Powered by Plate N' State", 300, 770);

      const link = document.createElement("a");
      link.download = `qr-${plateNumber}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR - ${plateNumber}</title>
          <style>
            body { 
              display: flex; flex-direction: column; align-items: center; 
              justify-content: center; min-height: 100vh; margin: 0;
              font-family: system-ui, sans-serif;
            }
            .company { font-size: 18px; font-weight: bold; color: #111827; margin-bottom: 4px; }
            .title { font-size: 28px; font-weight: bold; color: #dc2626; margin-bottom: 20px; }
            .plate { font-size: 32px; font-weight: bold; font-family: monospace; margin-top: 16px; }
            .label { font-size: 14px; color: #6b7280; margin-top: 4px; }
            .instructions { font-size: 14px; color: #6b7280; margin-top: 16px; }
            .branding { font-size: 11px; color: #9ca3af; margin-top: 32px; }
            @media print { body { -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="company">${companyName}</div>
          <div class="title">How's My Driving?</div>
          ${qrRef.current?.innerHTML || ""}
          <div class="plate">${plateNumber}</div>
          ${vehicleLabel ? `<div class="label">${vehicleLabel}</div>` : ""}
          <div class="instructions">Scan to report this driver</div>
          <div class="branding">Powered by Plate N' State</div>
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
          <QrCode className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">How's My Driving? QR Code</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <div ref={qrRef} className="bg-white p-4 rounded-lg">
            <QRCodeSVG
              value={reportUrl}
              size={240}
              level="H"
              includeMargin
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>
          <p className="font-mono text-xl font-bold">{plateNumber}</p>
          {vehicleLabel && (
            <p className="text-sm text-muted-foreground">{vehicleLabel}</p>
          )}
          <p className="text-xs text-muted-foreground text-center">
            Stick this on your vehicle. When scanned, anyone can report driving behavior for this plate.
          </p>
          <div className="flex gap-2 w-full">
            <Button variant="outline" className="flex-1 gap-2" onClick={handleDownload}>
              <Download className="h-4 w-4" />
              Download PNG
            </Button>
            <Button variant="outline" className="flex-1 gap-2" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FleetQRCodeModal;
