import { useState, useRef, useCallback } from "react";
import { Camera, Upload, Loader2, X, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

interface PlateScannerProps {
  onResult: (plateNumber: string, state: string | null) => void;
}

const PlateScanner = ({ onResult }: PlateScannerProps) => {
  const isMobile = useIsMobile();
  const [scanning, setScanning] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const processImage = useCallback(async (base64: string) => {
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("scan-plate", {
        body: { image: base64 },
      });

      if (error) throw error;

      if (data?.plate_number) {
        onResult(data.plate_number, data.state || null);
        toast.success(`Plate detected: ${data.plate_number}`, {
          description: data.state ? `State: ${data.state} (${data.confidence} confidence)` : `Confidence: ${data.confidence}`,
        });
      } else {
        toast.error("Could not read plate", {
          description: "Try a clearer photo with the plate visible.",
        });
      }
    } catch (err: any) {
      toast.error("Scan failed", { description: err.message });
    } finally {
      setScanning(false);
      setPreview(null);
      stopCamera();
    }
  }, [onResult]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image too large", { description: "Max 10MB." });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setPreview(base64);
      processImage(base64);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      toast.error("Camera access denied", {
        description: "Please allow camera access to scan plates.",
      });
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  };

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const base64 = canvas.toDataURL("image/jpeg", 0.8);
    setPreview(base64);
    processImage(base64);
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture={isMobile ? "environment" : undefined}
        className="hidden"
        onChange={handleFileUpload}
      />
      <canvas ref={canvasRef} className="hidden" />

      {cameraActive ? (
        <div className="relative rounded-lg overflow-hidden border border-border bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full aspect-video object-cover"
          />
          {/* Scan overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-2 border-primary/70 rounded-lg w-3/4 h-1/3 flex items-center justify-center">
              <ScanLine className="h-6 w-6 text-primary animate-pulse" />
            </div>
          </div>
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3">
            <Button
              size="sm"
              variant="secondary"
              onClick={stopCamera}
              className="rounded-full"
            >
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button
              size="sm"
              onClick={captureFrame}
              disabled={scanning}
              className="rounded-full"
            >
              {scanning ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Camera className="h-4 w-4 mr-1" />
              )}
              Capture
            </Button>
          </div>
        </div>
      ) : preview ? (
        <div className="relative rounded-lg overflow-hidden border border-border">
          <img src={preview} alt="Plate" className="w-full aspect-video object-cover" />
          {scanning && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm font-medium">Reading plate…</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 h-11 rounded-lg"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Photo
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-11 rounded-lg"
            onClick={startCamera}
          >
            <Camera className="h-4 w-4 mr-2" />
            Live Scan
          </Button>
        </div>
      )}
    </div>
  );
};

export default PlateScanner;
