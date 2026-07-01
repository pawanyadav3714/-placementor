import { useState, useRef, ChangeEvent, useEffect } from "react";
import AppLayout from "../../components/AppLayout";
import {
  UploadCloud,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  BriefcaseBusiness,
  AlertCircle,
  TrendingUp,
  Search,
  Briefcase,
  Zap,
  Trophy,
  ShieldAlert,
  Check,
  Clock,
  Trash2,
  RotateCw,
  RefreshCw,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from "recharts";
import { db } from "../../lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";

function normalizeResumeText(rawText: string): string {
  let text = rawText;
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const ligatureFixes: { [key: string]: string } = {
    ﬁ: "fi",
    ﬂ: "fl",
    ﬀ: "ff",
    ﬃ: "ffi",
    ﬄ: "ffl",
  };
  for (const [broken, fixed] of Object.entries(ligatureFixes)) {
    text = text.split(broken).join(fixed);
  }
  text = text.replace(/[•▪◦‣⁃○●■\uf0b7\uf0a7]/g, "-");
  text = text.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, "");
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text
    .split("\n")
    .map((line) => line.trim())
    .join("\n");
  text = text.trim();
  text = text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-");
  return text;
}

export default function ResumeUpload() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"file" | "camera" | "text">(
    "file",
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [rawText, setRawText] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [analyzingLines, setAnalyzingLines] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isFlashSupported, setIsFlashSupported] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAnalyzing && analyzingLines.length > 0) {
      interval = setInterval(() => {
        setCurrentLineIndex((prev) => {
          if (prev < analyzingLines.length - 1) return prev + 1;
          return prev;
        });
      }, 200); // 200ms per line simulation
    }
    return () => clearInterval(interval);
  }, [isAnalyzing, analyzingLines]);

  const loadHistory = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, "resume_history"),
        where("userId", "==", user.uid),
      );
      const querySnapshot = await getDocs(q);
      const historyData = querySnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .sort((a: any, b: any) => {
          const timeA = a.createdAt?.toMillis?.() || 0;
          const timeB = b.createdAt?.toMillis?.() || 0;
          return timeB - timeA;
        });
      setHistory(historyData);
    } catch (e) {
      console.error("Error loading history:", e instanceof Error ? e.message : String(e));
    }
  };

  const handleDeleteHistoryItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // prevent clicking the card
    try {
      await deleteDoc(doc(db, "resume_history", id));
      setHistory(history.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Error deleting history item:", error instanceof Error ? error.message : String(error));
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        if (file.name.endsWith(".pdf")) {
          const { extractTextFromPDF } =
            await import("../../utils/pdfExtractor");
          const extractedText = await extractTextFromPDF(file);
          simulateAnalysis(extractedText);
        } else {
          // For simple text files or fallback
          const reader = new FileReader();
          reader.onload = (e) => {
            const text = e.target?.result as string;
            simulateAnalysis(text);
          };
          reader.readAsText(file);
        }
      } catch (error) {
        console.error("Failed to parse file", error instanceof Error ? error.message : String(error));
        setAnalysisResult({
          documentType: "not_resume",
          message:
            "Failed to parse document. Please ensure it is a valid text-based PDF or document.",
        });
      }
    }
  };

  const simulateAnalysis = async (textToAnalyze?: string) => {
    const text = textToAnalyze || rawText;
    if (!text) return;

    const cleanText = normalizeResumeText(text);

    const rawLines = cleanText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const finalLines =
      rawLines.length < 5
        ? cleanText
            .split(/[.,]/)
            .map((l) => l.trim())
            .filter((l) => l.length > 0)
        : rawLines;
    setAnalyzingLines(
      finalLines.length > 0 ? finalLines : ["Reading document..."],
    );
    setCurrentLineIndex(0);

    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      const res = await fetch("/api/analyze-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleanText }),
      });
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}: ${await res.text()}`);
      }
      const data = await res.json();
      setAnalysisResult(data);

      // Save to history
      if (user) {
        await addDoc(collection(db, "resume_history"), {
          userId: user.uid,
          text: text.substring(0, 500) + (text.length > 500 ? "..." : ""), // store a snippet or full depending on preference
          result: data,
          createdAt: serverTimestamp(),
        });
        loadHistory();
      }
    } catch (e: any) {
      console.error(e instanceof Error ? e.message : String(e));
      setAnalysisResult({
        documentType: "not_resume",
        message:
          e.message && (e.message.includes("503") || e.message.includes("overloaded"))
            ? "The AI model is experiencing high load. Please try again in 10 seconds."
            : "There was an error communicating with the server. Please try again later.",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startCamera = async (mode: "user" | "environment" = facingMode) => {
    setCameraError(null);
    setIsFlashSupported(false);
    setIsFlashOn(false);
    
    // Check for secure context
    if (!window.isSecureContext) {
      setCameraError("Camera access requires a secure context (HTTPS or localhost).");
      return;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported in this browser environment");
      }

      // Stop existing stream if any
      stopCamera();

      const constraints = {
        video: { 
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => console.warn("Video play error:", e instanceof Error ? e.message : String(e)));
          
          // Check for flash support
          const track = stream.getVideoTracks()[0];
          const capabilities = track.getCapabilities() as any;
          if (capabilities && capabilities.torch) {
            setIsFlashSupported(true);
          }
        };
        setIsCameraActive(true);
        setFacingMode(mode);
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err instanceof Error ? err.message : String(err));
      let errorMessage = "Could not access camera. Please ensure you have granted permissions.";
      
      const errMsg = err instanceof Error ? err.message : String(err);
      if (err.name === "NotAllowedError" || errMsg.includes("Permission denied")) {
        errorMessage = "Camera access was denied. If you are viewing this in an embedded preview, please open the app in a new tab using the button in the top right to grant camera permissions.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        errorMessage = "No camera found on this device.";
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        errorMessage = "Camera is already in use by another application.";
      } else if (err.message.includes("Camera API not supported")) {
        errorMessage = "Camera API is not supported in this browser or requires HTTPS.";
      }

      setCameraError(errorMessage);
    }
  };

  const toggleFlash = async () => {
    if (!streamRef.current || !isFlashSupported) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      const newFlashState = !isFlashOn;
      await track.applyConstraints({
        advanced: [{ torch: newFlashState }]
      } as any);
      setIsFlashOn(newFlashState);
    } catch (e) {
      console.error("Failed to toggle flash:", e);
    }
  };

  const switchCamera = () => {
    const newMode = facingMode === "user" ? "environment" : "user";
    startCamera(newMode);
  };

  const stopCamera = () => {
    setCameraError(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const captureImage = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (context) {
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          console.warn("Video dimensions not ready yet. Retrying in 100ms...");
          setTimeout(captureImage, 100);
          return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = canvas.toDataURL("image/jpeg", 0.9);
        setCapturedImage(imageData);
        stopCamera();
      }
    }
  };

  const retakeImage = () => {
    setCapturedImage(null);
    startCamera();
  };

  const confirmScan = () => {
    if (capturedImage) {
      const base64Data = capturedImage.split(",")[1];
      analyzeImage(base64Data);
      setCapturedImage(null);
    }
  };

  const analyzeImage = async (base64Image: string) => {
    setIsAnalyzing(true);
    setAnalyzingLines(["Processing image...", "Scanning layout...", "Extracting text via AI Vision..."]);
    setCurrentLineIndex(0);
    setAnalysisResult(null);

    try {
      const res = await fetch("/api/analyze-resume-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Image, mimeType: "image/jpeg" }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      setAnalysisResult(data);

      if (user) {
        await addDoc(collection(db, "resume_history"), {
          userId: user.uid,
          text: "[Image Scan Analysis]",
          result: data,
          createdAt: serverTimestamp(),
        });
        loadHistory();
      }
    } catch (e: any) {
      console.error(e instanceof Error ? e.message : String(e));
      setAnalysisResult({
        documentType: "not_resume",
        message: "Failed to analyze the resume image. Please try a clearer photo or upload a PDF.",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const COLORS = [
    "#10B981",
    "#3B82F6",
    "#8B5CF6",
    "#F59E0B",
    "#EF4444",
    "#6366F1",
  ];

  return (
    <AppLayout activeTab="resume">
      <div className="max-w-7xl mx-auto pb-20">
        {/* Header Section */}
        <div className="bg-[#0d1326] -mx-4 md:-mx-8 -mt-4 md:-mt-8 p-4 md:p-6 border-b border-white/5 mb-4 md:mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold mb-1 flex items-center gap-2 text-white">
              <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-indigo-500" />{" "}
              ResumeAI Pro
            </h2>
            <p className="text-[10px] md:text-sm text-gray-400">
              Advanced AI-powered resume evaluator, skill gap analyzer, and ATS
              improver.
            </p>
          </div>
          {user && (
            <div className="flex flex-wrap items-center gap-2 md:gap-4 bg-[#111827] border border-white/10 rounded-lg md:rounded-xl p-2 md:p-3">
              <div className="flex flex-col px-2 md:px-3 border-r border-white/10">
                <span className="text-[9px] md:text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                  Total Analyzed
                </span>
                <span className="text-sm md:text-lg font-black text-indigo-400">
                  {history.length}
                </span>
              </div>

              {(() => {
                const bestResume = [...history].sort(
                  (a, b) =>
                    (b.result?.atsScore || 0) - (a.result?.atsScore || 0),
                )[0];
                return (
                  <div className="flex flex-col px-2 md:px-3 border-r border-white/10">
                    <span className="text-[9px] md:text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                      Best Score
                    </span>
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <span className="text-sm md:text-lg font-black text-emerald-400">
                        {bestResume?.result?.atsScore || 0}
                      </span>
                      {bestResume && (
                        <button
                          onClick={() => {
                            setShowHistory(false);
                            setAnalysisResult(bestResume.result);
                          }}
                          className="p-1 md:p-1.5 bg-white/5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors cursor-pointer"
                          title="View Best Resume"
                        >
                          <Search className="w-3 h-3 md:w-3.5 md:h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              <button
                onClick={() => setShowHistory(!showHistory)}
                className="px-2.5 py-1.5 md:px-4 md:py-2 ml-auto lg:ml-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-md md:rounded-lg flex items-center gap-1.5 md:gap-2 transition-colors font-medium text-[10px] md:text-xs cursor-pointer shrink-0"
              >
                <Clock className="w-3 h-3 md:w-3.5 md:h-3.5" />{" "}
                {showHistory ? "Hide History" : "View History"}
              </button>
            </div>
          )}
        </div>

        {showHistory && !analysisResult && !isAnalyzing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mb-6 md:mb-8"
          >
            <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 md:w-5 md:h-5 text-indigo-400" /> Past
              Analyses
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setAnalysisResult(item.result)}
                  className="bg-[#111827] border border-white/10 hover:border-indigo-500/50 rounded-lg md:rounded-xl p-3 md:p-4 cursor-pointer transition-colors shadow flex flex-col"
                >
                  <div className="flex justify-between items-start mb-2 md:mb-3">
                    <span className="text-[10px] md:text-xs text-gray-500 font-medium">
                      {item.createdAt?.toDate
                        ? new Date(item.createdAt.toDate()).toLocaleDateString()
                        : "Recent"}
                    </span>
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <span className="bg-indigo-500/10 text-indigo-400 px-1.5 md:px-2 py-0.5 rounded text-[10px] md:text-xs font-bold border border-indigo-500/20">
                        Score: {item.result?.atsScore || 0}
                      </span>
                      <button
                        onClick={(e) => handleDeleteHistoryItem(e, item.id)}
                        className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors cursor-pointer"
                        title="Delete record"
                      >
                        <Trash2 className="w-3 h-3 md:w-3.5 md:h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs md:text-sm text-gray-300 line-clamp-2 md:line-clamp-3 mb-3 md:mb-4">
                    {item.text}
                  </p>
                  <div className="mt-auto flex flex-wrap gap-1">
                    {item.result?.careerRecommendation?.suitableRoles
                      ?.slice(0, 2)
                      .map((role: string, i: number) => (
                        <span
                          key={i}
                          className="bg-white/5 text-gray-400 text-[9px] md:text-[10px] px-1.5 py-0.5 rounded"
                        >
                          {role}
                        </span>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {!analysisResult && !isAnalyzing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#111827]/80 backdrop-blur-xl border border-white/10 rounded-xl p-4 md:p-6 max-w-2xl mx-auto mt-6 md:mt-10 shadow-2xl"
          >
            <div className="flex flex-wrap md:flex-nowrap bg-[#0A0F1E] rounded-md p-1 mb-4 md:mb-6 gap-1 md:gap-0">
              <button
                onClick={() => setActiveTab("file")}
                className={
                  "flex-1 min-w-[30%] py-1.5 md:py-2 text-[10px] md:text-xs font-medium rounded transition-colors cursor-pointer " +
                  (activeTab === "file"
                    ? "bg-[#111827] shadow text-white"
                    : "text-gray-400 hover:text-white")
                }
              >
                File Upload
              </button>
              <button
                onClick={() => setActiveTab("text")}
                className={
                  "flex-1 min-w-[30%] py-1.5 md:py-2 text-[10px] md:text-xs font-medium rounded transition-colors cursor-pointer " +
                  (activeTab === "text"
                    ? "bg-[#111827] shadow text-white"
                    : "text-gray-400 hover:text-white")
                }
              >
                Paste Text
              </button>
              <button
                onClick={() => setActiveTab("camera")}
                className={
                  "flex-1 min-w-[30%] py-1.5 md:py-2 text-[10px] md:text-xs font-medium rounded transition-colors cursor-pointer " +
                  (activeTab === "camera"
                    ? "bg-[#111827] shadow text-white"
                    : "text-gray-400 hover:text-white")
                }
              >
                Camera Scan
              </button>
            </div>

            {activeTab === "file" && (
              <div
                className="border border-dashed border-indigo-500/30 rounded-xl md:rounded-2xl p-6 md:p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-500/70 hover:bg-indigo-500/5 transition-all group bg-black/10"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    const file = e.dataTransfer.files[0];
                    try {
                      if (file.name.endsWith(".pdf")) {
                        const { extractTextFromPDF } =
                          await import("../../utils/pdfExtractor");
                        const extractedText = await extractTextFromPDF(file);
                        simulateAnalysis(extractedText);
                      } else {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                          const text = e.target?.result as string;
                          simulateAnalysis(text);
                        };
                        reader.readAsText(file);
                      }
                    } catch (error) {
                      console.error("Failed to parse dropped file", error instanceof Error ? error.message : String(error));
                      setAnalysisResult({
                        documentType: "not_resume",
                        message:
                          "Failed to parse document. Please ensure it is a valid text-based PDF or document.",
                      });
                    }
                  }
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".pdf,.doc,.docx"
                />
                <div className="bg-indigo-500/10 text-indigo-400 p-3 md:p-4 rounded-full mb-3 md:mb-4 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-6 h-6 md:w-8 md:h-8" />
                </div>
                <h3 className="text-sm md:text-base font-bold mb-1">
                  Drag & Drop your resume
                </h3>
                <p className="text-[10px] md:text-xs text-gray-400">
                  Supported formats: PDF, DOCX, DOC (Max 5MB)
                </p>
              </div>
            )}

            {activeTab === "text" && (
              <div className="flex flex-col gap-3">
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste your resume content here..."
                  className="w-full h-40 md:h-48 bg-[#0A0F1E] border border-white/10 rounded-lg p-3 md:p-4 text-gray-300 resize-none focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono text-[10px] md:text-xs leading-relaxed"
                />
                <button
                  onClick={() => simulateAnalysis()}
                  className="bg-indigo-600 hover:bg-indigo-500 cursor-pointer px-4 md:px-5 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all w-full flex items-center justify-center gap-2"
                >
                  <Search className="w-3.5 h-3.5 md:w-4 md:h-4" /> Analyze
                  Structure
                </button>
              </div>
            )}

            {activeTab === "camera" && (
              <div className="border border-white/10 rounded-xl p-4 md:p-6 flex flex-col items-center text-center bg-black/10">
                {!isCameraActive && !capturedImage ? (
                  <>
                    <div className="bg-cyan-500/10 text-cyan-400 p-3 md:p-4 rounded-full mb-3 md:mb-4">
                      <Camera className="w-6 h-6 md:w-8 md:h-8" />
                    </div>
                    <h3 className="text-sm md:text-base font-bold mb-1">
                      Scan Physical Resume
                    </h3>
                    <p className="text-[10px] md:text-xs text-gray-400 mb-4 md:mb-5">
                      Use your device camera to capture, crop via AI and parse.
                    </p>
                    <button
                      onClick={() => startCamera()}
                      className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-xs md:text-sm font-bold transition-colors cursor-pointer"
                    >
                      Start Camera Capture
                    </button>
                    {cameraError && (
                      <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs md:text-sm text-left flex flex-col gap-3">
                        <div className="flex gap-2">
                          <ShieldAlert className="w-4 h-4 md:w-5 md:h-5 shrink-0 mt-0.5" />
                          <p>{cameraError}</p>
                        </div>
                        {cameraError.includes("new tab") && (
                          <button
                            onClick={() => window.open(window.location.href, "_blank")}
                            className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-md font-bold transition-colors flex items-center justify-center gap-2"
                          >
                            <Zap className="w-3 h-3 md:w-4 md:h-4" /> Open App in New Tab
                          </button>
                        )}
                      </div>
                    )}
                  </>
                ) : capturedImage ? (
                  <div className="w-full flex flex-col items-center gap-4">
                    <h3 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Image Captured
                    </h3>
                    <div className="relative w-full aspect-[3/4] max-w-sm bg-black rounded-lg overflow-hidden border border-emerald-500/30 shadow-2xl">
                      <img src={capturedImage} className="w-full h-full object-cover" alt="Captured Resume" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                         <p className="text-[10px] text-emerald-300 font-medium">Ready for AI analysis</p>
                      </div>
                    </div>
                    <div className="flex gap-3 w-full max-w-sm">
                      <button
                        onClick={retakeImage}
                        className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs md:text-sm font-bold transition-colors cursor-pointer text-gray-300 flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" /> Retake
                      </button>
                      <button
                        onClick={confirmScan}
                        className="flex-2 bg-indigo-600 hover:bg-indigo-500 px-6 py-2 md:px-8 md:py-2.5 rounded-lg text-xs md:text-sm font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Zap className="w-4 h-4" /> Confirm & Analyze
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center gap-4">
                    <div className="relative w-full aspect-[3/4] max-w-sm bg-black rounded-lg overflow-hidden border border-indigo-500/30 shadow-2xl">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      {/* Scan Overlay */}
                      <div className="absolute inset-0 border-2 border-indigo-500/20 pointer-events-none">
                        <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-indigo-500 rounded-tl-lg"></div>
                        <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-indigo-500 rounded-tr-lg"></div>
                        <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-indigo-500 rounded-bl-lg"></div>
                        <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-indigo-500 rounded-br-lg"></div>
                        
                        <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.5)] animate-[scan_2s_linear_infinite]"></div>
                      </div>

                      {/* Camera Controls Overlay */}
                      <div className="absolute top-4 right-4 flex flex-col gap-2">
                        <button 
                          onClick={switchCamera}
                          className="p-2 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-full text-white transition-colors cursor-pointer"
                          title="Switch Camera"
                        >
                          <RotateCw className="w-5 h-5" />
                        </button>
                        {isFlashSupported && (
                          <button 
                            onClick={toggleFlash}
                            className={`p-2 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-full transition-colors cursor-pointer ${isFlashOn ? 'text-amber-400' : 'text-white'}`}
                            title="Toggle Flash"
                          >
                            <Zap className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="flex gap-3 w-full max-w-sm">
                      <button
                        onClick={stopCamera}
                        className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs md:text-sm font-bold transition-colors cursor-pointer text-gray-400 flex items-center justify-center gap-2"
                      >
                        <X className="w-4 h-4" /> Cancel
                      </button>
                      <button
                        onClick={captureImage}
                        className="flex-2 bg-indigo-600 hover:bg-indigo-500 px-6 py-2 md:px-8 md:py-2.5 rounded-lg text-xs md:text-sm font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                      >
                        <Camera className="w-5 h-5" /> Capture Photo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <div className="relative mb-8">
              <div className="w-24 h-24 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-indigo-400">
                <Search className="w-8 h-8 animate-pulse" />
              </div>
            </div>
            <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
              <h3 className="text-2xl font-bold">Running Deep Analysis</h3>

              <div className="flex items-center gap-3 bg-black/40 border border-white/10 p-2 rounded-lg px-4">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <div className="text-xs flex items-center gap-2">
                  <div className="text-gray-400 font-mono">
                    ACTIVE AI ENGINE
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-500/20 border border-indigo-500/30 rounded text-indigo-300 font-bold tracking-wide">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                    Gemini 3.1 Pro Preview (Thinking)
                  </div>
                </div>
                <div className="ml-4 pl-4 border-l border-white/10 text-xs">
                  <div className="text-gray-400 font-mono">QUOTA USAGE</div>
                  <div className="text-emerald-400 font-bold tracking-wider">
                    3% LIMIT
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full max-w-2xl bg-[#0A0F1E] border border-white/10 rounded-xl p-6 mb-8 overflow-hidden relative shadow-2xl">
              <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-[#0A0F1E] to-transparent z-10"></div>
              <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-[#0A0F1E] to-transparent z-10"></div>

              <div
                className="flex flex-col gap-3 font-mono text-xs md:text-sm h-48 overflow-y-auto"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                ref={(el) => {
                  if (el) {
                    const activeEl = el.children[
                      currentLineIndex
                    ] as HTMLElement;
                    if (activeEl) {
                      activeEl.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                    }
                  }
                }}
              >
                {analyzingLines.map((line, i) => (
                  <div
                    key={i}
                    className={`transition-all duration-300 w-full whitespace-pre-wrap break-words ${
                      i === currentLineIndex
                        ? "text-indigo-400 scale-105 font-bold flex gap-2"
                        : i < currentLineIndex
                          ? "text-gray-500 opacity-50"
                          : "text-gray-700 opacity-20"
                    }`}
                  >
                    {i === currentLineIndex ? (
                      <span className="text-indigo-500 animate-pulse mt-1 shrink-0">
                        ▶
                      </span>
                    ) : (
                      <span className="w-4 shrink-0"></span>
                    )}
                    <span className="flex-1">{line}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 text-center">
              <p className="flex items-center justify-center gap-3 text-gray-300">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Extracting
                Entities via NLP
              </p>
              <p className="flex items-center justify-center gap-3 text-gray-300">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Evaluating
                ATS Layout Readability
              </p>
              <p className="flex items-center justify-center gap-3 text-gray-300">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Matching
                Against Top Company Criteria
              </p>
              <p className="flex items-center justify-center gap-3 text-indigo-400">
                <span className="w-5 h-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />{" "}
                Identifying Skill Gaps & Action Verbs
              </p>
            </div>
          </motion.div>
        )}

        {analysisResult && analysisResult.documentType === "not_resume" && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8 max-w-3xl mx-auto mt-12"
            >
              <div className="bg-[#111827] border border-red-500/30 rounded-3xl p-10 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl"></div>
                <div className="bg-red-500/10 text-red-500 p-6 rounded-full mb-6 z-10">
                  <ShieldAlert className="w-12 h-12" />
                </div>
                <h3 className="text-3xl font-bold mb-4 z-10">
                  Its not a Resume Guys{" "}
                </h3>
                <p className="text-gray-300 text-lg max-w-lg mb-8 z-10">
                  {analysisResult.message ||
                    "This uploaded file does not appear to be a resume. Please upload a valid resume."}
                </p>
                <button
                  onClick={() => setAnalysisResult(null)}
                  className="z-10 bg-white/10 hover:bg-white/20 px-8 py-3 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Upload a Valid Resume
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {analysisResult && analysisResult.documentType !== "not_resume" && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Reset Control */}
              <div className="flex justify-end">
                <button
                  onClick={() => setAnalysisResult(null)}
                  className="text-gray-400 hover:text-white flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" /> Done Reading? Upload another
                </button>
              </div>

              {/* Master Header */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Score Big Card */}
                <div className="bg-gradient-to-br from-[#111827] to-[#0A0F1E] border border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center relative overflow-hidden group shadow-xl">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl transform group-hover:scale-110 transition-transform"></div>
                  <div className="absolute top-4 left-4 flex gap-2 items-center">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 px-2 py-1 bg-emerald-400/10 rounded">
                      Resume Detected
                    </span>
                    {analysisResult.cached && (
                      <span className="text-[10px] uppercase font-bold text-amber-400 px-2 py-1 bg-amber-400/10 rounded">
                        Cached
                      </span>
                    )}
                  </div>
                  <div className="absolute top-4 right-4 flex gap-2 items-center">
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-[#111827] border border-white/10 rounded-md shadow-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider">
                        Engine:
                      </span>
                      <span className="text-[10px] font-bold text-indigo-300">
                        {analysisResult.providerUsed ||
                          analysisResult.provider ||
                          "Gemini 3.1 Pro Preview"}
                      </span>
                    </div>
                  </div>
                  <h3 className="text-gray-400 font-medium mt-4 mb-4 uppercase tracking-widest text-sm z-10">
                    Overall ATS Score
                  </h3>
                  <div className="relative z-10 flex items-center justify-center w-48 h-48 rounded-full border-[12px] border-indigo-500 bg-black/40 shadow-inner">
                    <div className="text-center">
                      <span className="text-6xl font-black text-white">
                        {analysisResult.atsScore || 0}
                      </span>
                      <span className="text-indigo-300 font-bold block mt-1">
                        / 100
                      </span>
                    </div>
                  </div>
                  <p className="mt-6 text-center text-gray-300 leading-relaxed z-10">
                    {analysisResult.overallFeedback}
                  </p>
                </div>

                {/* Section Scores Spider/Radar Chart */}
                <div className="col-span-1 lg:col-span-2 bg-[#111827] border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col">
                  <h3 className="text-lg font-bold mb-2">
                    Parameter Evaluation
                  </h3>
                  <div className="flex-1 min-h-[250px] -ml-8">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart
                        cx="50%"
                        cy="50%"
                        outerRadius="75%"
                        data={[
                          {
                            subject: "Skills",
                            A: analysisResult.sectionScores?.skills || 0,
                            fullMark: 100,
                          },
                          {
                            subject: "Projects",
                            A: analysisResult.sectionScores?.projects || 0,
                            fullMark: 100,
                          },
                          {
                            subject: "Keywords",
                            A: analysisResult.sectionScores?.keywords || 0,
                            fullMark: 100,
                          },
                          {
                            subject: "Formatting",
                            A: analysisResult.sectionScores?.formatting || 0,
                            fullMark: 100,
                          },
                          {
                            subject: "Education",
                            A: analysisResult.sectionScores?.education || 0,
                            fullMark: 100,
                          },
                        ]}
                      >
                        <PolarGrid stroke="#374151" />
                        <PolarAngleAxis
                          dataKey="subject"
                          tick={{
                            fill: "#9CA3AF",
                            fontSize: 13,
                            fontWeight: 500,
                          }}
                        />
                        <Radar
                          name="Score"
                          dataKey="A"
                          stroke="#8B5CF6"
                          fill="#8B5CF6"
                          fillOpacity={0.4}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: "#111827",
                            border: "1px solid #374151",
                            borderRadius: "8px",
                          }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* SWOT Analysis */}
                <div className="space-y-4">
                  <div className="bg-[#111827] border border-emerald-500/20 shadow-lg shadow-emerald-500/5 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-emerald-400 mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" /> Key Strengths
                    </h3>
                    <ul className="space-y-3">
                      {analysisResult.qualitativeAnalysis?.strengths?.map(
                        (s: string, i: number) => (
                          <li
                            key={i}
                            className="flex gap-3 text-sm text-gray-300"
                          >
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />{" "}
                            {s}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>

                  <div className="bg-[#111827] border border-amber-500/20 shadow-lg shadow-amber-500/5 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
                      <Zap className="w-5 h-5" /> Areas of Opportunity
                    </h3>
                    <ul className="space-y-3">
                      {analysisResult.qualitativeAnalysis?.opportunities?.map(
                        (o: string, i: number) => (
                          <li
                            key={i}
                            className="flex gap-3 text-sm text-gray-300"
                          >
                            <Trophy className="w-5 h-5 text-amber-500 shrink-0" />{" "}
                            {o}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-[#111827] border border-red-500/20 shadow-lg shadow-red-500/5 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5" /> Critical Weaknesses
                    </h3>
                    <ul className="space-y-3">
                      {analysisResult.qualitativeAnalysis?.weaknesses?.map(
                        (w: string, i: number) => (
                          <li
                            key={i}
                            className="flex gap-3 text-sm text-gray-300"
                          >
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />{" "}
                            {w}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>

                  <div className="bg-[#111827] border border-indigo-500/20 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-indigo-400 mb-4 flex items-center gap-2">
                      <Search className="w-5 h-5" /> Keyword Optimization
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider block mb-2">
                          ATS Keywords Found
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {analysisResult.keywordOptimization?.atsKeywordsFound?.map(
                            (k: string, i: number) => (
                              <span
                                key={i}
                                className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-md text-xs"
                              >
                                {k}
                              </span>
                            ),
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider block mb-2">
                          Missing Priority Keywords
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {analysisResult.keywordOptimization?.roleKeywordsSuggested?.map(
                            (k: string, i: number) => (
                              <span
                                key={i}
                                className="bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-md text-xs"
                              >
                                {k}
                              </span>
                            ),
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Company Match Score */}
              <div className="bg-[#111827] border border-white/10 rounded-3xl p-8 shadow-xl">
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <BriefcaseBusiness className="w-6 h-6 text-indigo-400" />{" "}
                  Company-Specific Fit
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {analysisResult.companyMatch?.map(
                    (match: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-black/30 border border-white/5 rounded-2xl p-5 hover:bg-white/5 transition-colors"
                      >
                        <div className="flex justify-between items-end mb-4">
                          <span className="text-lg font-bold">
                            {match.company}
                          </span>
                          <span
                            className={
                              "font-black text-xl " +
                              (match.matchPercent >= 80
                                ? "text-emerald-400"
                                : match.matchPercent >= 60
                                  ? "text-amber-400"
                                  : "text-red-400")
                            }
                          >
                            {match.matchPercent}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-1.5 mb-5 overflow-hidden">
                          <div
                            className={
                              "h-full rounded-full transition-all duration-1000 " +
                              (match.matchPercent >= 80
                                ? "bg-emerald-500"
                                : match.matchPercent >= 60
                                  ? "bg-amber-500"
                                  : "bg-red-500")
                            }
                            style={{ width: `${match.matchPercent}%` }}
                          ></div>
                        </div>

                        <div className="space-y-4">
                          {match.missingSkills?.length > 0 && (
                            <div>
                              <span className="text-[10px] uppercase tracking-wider text-rose-400 font-bold block mb-1.5">
                                Missing Skills
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {match.missingSkills
                                  .slice(0, 3)
                                  .map((s: string, i: number) => (
                                    <span
                                      key={i}
                                      className="bg-rose-500/10 text-rose-300 px-1.5 py-0.5 rounded text-[10px]"
                                    >
                                      {s}
                                    </span>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>

              {/* Advanced Analytics / Resume Builder suggestions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Project Evaluation */}
                <div className="bg-[#111827] border border-white/10 rounded-3xl p-8 shadow-xl">
                  <h3 className="text-2xl font-bold mb-6">
                    Project AI Optimization
                  </h3>
                  <div className="space-y-6">
                    {analysisResult.projectEvaluation?.map(
                      (proj: any, idx: number) => (
                        <div
                          key={idx}
                          className="border-l-2 border-indigo-500 pl-4 py-1"
                        >
                          <h4 className="font-bold text-indigo-400 text-lg mb-2">
                            {proj.name}
                          </h4>
                          <div className="bg-red-500/5 text-red-200 text-sm p-3 rounded-xl mb-2 border border-red-500/10">
                            <span className="font-bold text-red-400 block mb-1">
                              Current Description:
                            </span>
                            {proj.improvements.current}
                          </div>
                          <div className="bg-emerald-500/5 text-emerald-200 text-sm p-3 rounded-xl border border-emerald-500/10">
                            <span className="font-bold text-emerald-400 block mb-1">
                              AI Improved Impact Statement:
                            </span>
                            {proj.improvements.improved}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                {/* AI Career Path Recommendation */}
                <div className="bg-[#111827] border border-white/10 rounded-3xl p-8 shadow-xl flex flex-col justify-between">
                  <div>
                    <h3 className="text-2xl font-bold mb-6">
                      Career Recommendation
                    </h3>
                    <div className="flex flex-col gap-6">
                      <div className="bg-white/5 rounded-2xl p-5">
                        <span className="text-sm text-gray-400 block mb-3 font-medium">
                          Top Suitable Roles
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {analysisResult.careerRecommendation?.suitableRoles?.map(
                            (role: string, i: number) => (
                              <span
                                key={i}
                                className="bg-blue-500/20 text-blue-300 font-medium px-3 py-1.5 border border-blue-500/20 rounded-lg"
                              >
                                {role}
                              </span>
                            ),
                          )}
                        </div>
                      </div>

                      <div className="flex-1">
                        <span className="text-sm text-gray-400 block mb-3 font-medium">
                          Recommended Roadmap
                        </span>
                        <ul className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                          {analysisResult.careerRecommendation?.roadmap?.map(
                            (step: string, i: number) => (
                              <li
                                key={i}
                                className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                              >
                                <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-indigo-500 bg-[#111827] text-indigo-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10" />
                                <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.25rem)] bg-white/5 p-3 rounded-lg border border-white/5 text-sm text-gray-300 shadow">
                                  {step}
                                </div>
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </AppLayout>
  );
}
