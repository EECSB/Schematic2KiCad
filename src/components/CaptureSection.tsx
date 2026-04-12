import { useState, useRef, useCallback, ChangeEvent } from "react";
import { Camera, Upload, Monitor, X, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";

interface CaptureSectionProps {
  onCapture: (image: string) => void;
}

export function CaptureSection({ onCapture }: CaptureSectionProps) {
  const [mode, setMode] = useState<"idle" | "webcam" | "upload" | "screen">("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startWebcam = async () => {
    setMode("webcam");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing webcam:", err);
      setMode("idle");
    }
  };

  const takePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(videoRef.current, 0, 0);
      const data = canvas.toDataURL("image/jpeg");
      setPreview(data);
      stopWebcam();
    }
  };

  const stopWebcam = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setMode("idle");
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startScreenCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const video = document.createElement("video");
      video.srcObject = stream;
      video.play();
      
      video.onloadedmetadata = () => {
        setTimeout(() => {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(video, 0, 0);
          const data = canvas.toDataURL("image/jpeg");
          setPreview(data);
          stream.getTracks().forEach(track => track.stop());
        }, 500);
      };
    } catch (err) {
      console.error("Error screen capture:", err);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-zinc-800 bg-zinc-950/50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <Camera className="w-4 h-4 text-indigo-400" />
            Input Source
          </h2>
          {preview && (
            <button 
              onClick={() => setPreview(null)}
              className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>

        <div className="aspect-video bg-zinc-950 relative flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait">
            {!preview && mode === "idle" && (
              <motion.div 
                key="idle"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4 p-8 w-full max-w-2xl"
              >
                <button 
                  onClick={startWebcam}
                  className="flex flex-col items-center justify-center gap-4 p-8 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 hover:bg-zinc-800/50 transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                    <Camera className="w-6 h-6 text-zinc-400 group-hover:text-white" />
                  </div>
                  <span className="text-sm font-medium text-zinc-400 group-hover:text-white">Webcam</span>
                </button>

                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-4 p-8 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 hover:bg-zinc-800/50 transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                    <Upload className="w-6 h-6 text-zinc-400 group-hover:text-white" />
                  </div>
                  <span className="text-sm font-medium text-zinc-400 group-hover:text-white">Upload Image</span>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileUpload}
                  />
                </button>

                <button 
                  onClick={startScreenCapture}
                  className="flex flex-col items-center justify-center gap-4 p-8 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 hover:bg-zinc-800/50 transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                    <Monitor className="w-6 h-6 text-zinc-400 group-hover:text-white" />
                  </div>
                  <span className="text-sm font-medium text-zinc-400 group-hover:text-white">Screen Capture</span>
                </button>
              </motion.div>
            )}

            {mode === "webcam" && (
              <motion.div 
                key="webcam"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full relative"
              >
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4">
                  <button 
                    onClick={takePhoto}
                    className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-transform"
                  >
                    <div className="w-14 h-14 rounded-full border-2 border-zinc-950" />
                  </button>
                  <button 
                    onClick={stopWebcam}
                    className="w-12 h-12 rounded-full bg-zinc-900/80 backdrop-blur-md border border-zinc-700 flex items-center justify-center text-white hover:bg-zinc-800 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </motion.div>
            )}

            {preview && (
              <motion.div 
                key="preview"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full h-full relative group"
              >
                <img 
                  src={preview} 
                  alt="Preview" 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-zinc-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <button 
                    onClick={() => onCapture(preview)}
                    className="px-6 py-3 rounded-full bg-indigo-600 text-white font-semibold flex items-center gap-2 hover:bg-indigo-500 transition-colors shadow-xl"
                  >
                    <Check className="w-5 h-5" /> Analyze Schematic
                  </button>
                  <button 
                    onClick={() => setPreview(null)}
                    className="px-6 py-3 rounded-full bg-zinc-900 text-white font-semibold flex items-center gap-2 hover:bg-zinc-800 transition-colors border border-zinc-700"
                  >
                    <X className="w-5 h-5" /> Retake
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
