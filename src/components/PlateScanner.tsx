import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, Upload, Loader2, X, ScanLine, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCaptcha, CaptchaWidget } from "@/hooks/useCaptcha";
import { isNative, pickImageFromLibrary, takePhotoNative } from "@/lib/native";
import { correctOcrPlate } from "@/lib/ocrCorrection";
import { useScanHistory } from "@/hooks/useScanHistory";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PlateScannerProps {
  onResult: (plateNumber: string, state: string | null) => void;
}

type PendingAction = "native-camera" | "web-camera" | "upload";

const ACK_KEY = "plate_scan_liability_ack";

const PlateScanner = ({ onResult }: PlateScannerProps) => {
  const isMobile = useIsMobile();
  const { addScan } = useScanHistory();
  const [scanning, setScanning] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [liabilityOpen, setLiabilityOpen] = useState(false);
  const pendingActionRef = useRef<PendingAction | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captcha = useCaptcha();

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const processImage = useCallback(async (base64: string) => {
    setScanning(true);
    try {
      const captchaToken = await captcha.execute();
      if (captcha.enabled && !captchaToken) {
        throw new Error("Captcha verification failed. Please try again.");
      }
      const resp = await fetch("https://platenstate-scan-api.vercel.app/api/scan-plate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Scan failed");

      if (data?.plate_number) {
        // Plates can be up to 10 chars; apply OCR character correction
        const cleaned = correctOcrPlate(String(data.plate_number)).slice(0, 10);
        const resolvedState: string | null = data.state || null;
        onResult(cleaned, resolvedState);
        addScan(cleaned, resolvedState, { confidence: data.confidence, raw: data.plate_number });
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
  }, [onResult, captcha, stopCamera, addScan]);

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

  const doNativePick = useCallback(async () => {
    try {
      const base64 = await pickImageFromLibrary();
      if (!base64) return;
      setPreview(base64);
      processImage(base64);
    } catch (err: any) {
      toast.error("Could not open photo library", { description: err.message });
    }
  }, [processImage]);

  const doNativeCamera = useCallback(async () => {
    try {
      const base64 = await takePhotoNative();
      if (!base64) return;
      setPreview(base64);
      processImage(base64);
    } catch (err: any) {
      toast.error("Could not open camera", { description: err.message });
    }
  }, [processImage]);

  const doWebCamera = useCallback(async () => {
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
  }, []);

  const runAction = useCallback((action: PendingAction) => {
    if (action === "upload") {
      if (isNative) doNativePick();
      else fileInputRef.current?.click();
    } else if (action === "native-camera") {
      doNativeCamera();
    } else if (action === "web-camera") {
      doWebCamera();
    }
  }, [doNativePick, doNativeCamera, doWebCamera]);

  const requestAction = useCallback((action: PendingAction) => {
    const acked = typeof window !== "undefined" && sessionStorage.getItem(ACK_KEY) === "1";
    if (acked) {
      runAction(action);
      return;
    }
    pendingActionRef.current = action;
    setLiabilityOpen(true);
  }, [runAction]);

  const handleConfirmLiability = useCallback(() => {
    try { sessionStorage.setItem(ACK_KEY, "1"); } catch { /* ignore */ }
    setLiabilityOpen(false);
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    if (action) {
      // small defer so the dialog can unmount cleanly
      setTimeout(() => runAction(action), 0);
    }
  }, [runAction]);

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
      <CaptchaWidget captcha={captcha} />

      {cameraActive ? (
        <div className="relative rounded-lg overflow-hidden border border-border bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full aspect-video object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-2 border-primary/70 rounded-lg w-3/4 h-1/3 flex items-center justify-center">
              <ScanLine className="h-6 w-6 text-primary animate-pulse" />
            </div>
          </div>
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3">
            <Button size="sm" variant="secondary" onClick={stopCamera} className="rounded-full">
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button size="sm" onClick={captureFrame} disabled={scanning} className="rounded-full">
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
            onClick={() => requestAction("upload")}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Photo
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-11 rounded-lg"
            onClick={() => requestAction(isNative ? "native-camera" : "web-camera")}
          >
            <Camera className="h-4 w-4 mr-2" />
            Live Scan
          </Button>
        </div>
      )}

      <AlertDialog open={liabilityOpen} onOpenChange={setLiabilityOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm you're not driving
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  By continuing, you confirm that you are a <strong>passenger</strong> or
                  your vehicle is <strong>parked</strong>, and that you will not use
                  Plate'n State while operating a moving vehicle.
                </p>
                <p>
                  You agree that Plate'n State and its operators are <strong>not liable</strong>{" "}
                  for any misuse, accidents, injuries, or damages resulting from use of this feature.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmLiability}>
              I'm not driving — continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PlateScanner;
