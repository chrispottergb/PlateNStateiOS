import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Loader2, X, ScanLine, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReportModal from "@/components/ReportModal";
import { useCaptcha, CaptchaWidget } from "@/hooks/useCaptcha";

/**
 * /quick-capture
 * Fullscreen camera viewfinder. Capture is triggered by:
 *  - Tap on the screen
 *  - Volume Up / Down key (Bluetooth shutter remotes emit these)
 *  - Space / Enter key
 * After scan-plate succeeds we auto-open ReportModal pre-filled with the plate.
 */
const QuickCapture = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const reportTriggerRef = useRef<HTMLButtonElement>(null);
  const scanningRef = useRef(false);
  const captcha = useCaptcha();

  const [ready, setReady] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [detectedPlate, setDetectedPlate] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setReady(true);
      setError(null);
    } catch (err: any) {
      setError(
        "Camera access denied. Please allow camera access in your browser settings."
      );
    }
  }, []);

  const capture = useCallback(async () => {
    if (scanningRef.current) return;
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video.videoWidth) return;

    scanningRef.current = true;
    setScanning(true);

    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No canvas context");
      ctx.drawImage(video, 0, 0);
      const base64 = canvas.toDataURL("image/jpeg", 0.85);

      const captchaToken = await captcha.execute();
      if (captcha.enabled && !captchaToken) {
        throw new Error("Captcha verification failed. Please try again.");
      }
      const { data, error } = await supabase.functions.invoke("scan-plate", {
        body: { image: base64, captcha_token: captchaToken },
      });
      if (error) throw error;

      if (data?.plate_number) {
        const plate = String(data.plate_number).toUpperCase().replace(/\s+/g, "");
        setDetectedPlate(plate);
        toast.success(`Plate detected: ${plate}`, {
          description: data.state
            ? `State: ${data.state} (${data.confidence ?? "?"} confidence)`
            : `Confidence: ${data.confidence ?? "?"}`,
        });
        // Auto-open ReportModal on next tick (after state commits)
        setTimeout(() => reportTriggerRef.current?.click(), 50);
      } else {
        toast.error("Could not read plate", {
          description: "Hold steady and try again.",
        });
      }
    } catch (err: any) {
      toast.error("Scan failed", { description: err.message });
    } finally {
      scanningRef.current = false;
      setScanning(false);
    }
  }, [captcha]);

  // Mount: start camera
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  // Keyboard / remote-shutter listener.
  // Bluetooth dash shutters typically emit VolumeUp/VolumeDown or Enter.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const triggers = [
        "AudioVolumeUp",
        "AudioVolumeDown",
        "VolumeUp",
        "VolumeDown",
        " ",
        "Enter",
      ];
      if (triggers.includes(e.key)) {
        e.preventDefault();
        capture();
      } else if (e.key === "Escape") {
        navigate(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [capture, navigate]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Hidden ReportModal trigger — clicked programmatically after detection */}
      <div className="hidden">
        <ReportModal
          key={detectedPlate || "empty"}
          initialPlate={detectedPlate}
          trigger={<button ref={reportTriggerRef}>open</button>}
        />
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => navigate(-1)}
          className="rounded-full"
        >
          <X className="h-4 w-4 mr-1" /> Close
        </Button>
        <div className="flex items-center gap-2 text-white text-sm font-medium">
          <Zap className="h-4 w-4 text-primary" />
          Quick Capture
        </div>
      </div>

      {/* Video viewport */}
      <div
        className="flex-1 relative overflow-hidden cursor-pointer"
        onClick={capture}
        role="button"
        aria-label="Tap to capture plate"
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        {/* Scan reticle */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="border-2 border-primary/80 rounded-xl w-[80%] max-w-md h-32 flex items-center justify-center shadow-[0_0_40px_rgba(0,0,0,0.5)]">
            <ScanLine className="h-8 w-8 text-primary animate-pulse" />
          </div>
        </div>

        {/* Status overlay */}
        {scanning && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center gap-3 text-white">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <span className="text-base font-medium">Reading plate…</span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-6 text-center">
            <div className="space-y-3 text-white max-w-sm">
              <p className="text-sm">{error}</p>
              <Button onClick={startCamera} variant="secondary">
                Retry
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-6 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex flex-col items-center gap-3">
          <p className="text-white/70 text-xs text-center max-w-xs">
            Tap screen, press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white text-[10px]">Volume</kbd>{" "}
            on a Bluetooth remote, or hit <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white text-[10px]">Space</kbd>{" "}
            to capture
          </p>
          <Button
            size="lg"
            onClick={capture}
            disabled={!ready || scanning}
            className="rounded-full h-16 w-16 p-0"
            aria-label="Capture plate"
          >
            {scanning ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Camera className="h-6 w-6" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QuickCapture;
