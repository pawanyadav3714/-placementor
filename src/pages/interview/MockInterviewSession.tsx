import { useState, useRef, useEffect } from "react";
import AppLayout from "../../components/AppLayout";
import {
  Mic,
  StopCircle,
  CheckCircle2,
  ChevronRight,
  Play,
  Trash2,
  AudioLines,
  X,
  Loader2,
  Sparkles,
  Cpu,
  Layers,
  GraduationCap,
  Briefcase,
  Wand2,
  User,
  Sliders,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useNavigate, useLocation } from "react-router-dom";
import { safeStringify } from "../../utils/safeStringify";

function pcmToBase64(pcmData: Float32Array) {
  const buffer = new ArrayBuffer(pcmData.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < pcmData.length; i++) {
    const s = Math.max(-1, Math.min(1, pcmData[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

const PERSONAS = [
  {
    id: "siddharth",
    name: "Siddharth Nair",
    title: "Google Staff Engineer",
    icon: "💻",
    description: "Deep technical questions on algorithms, system performance, and web standards. Analytical and detail-oriented.",
    style: "strict",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    activeColor: "border-blue-500 ring-2 ring-blue-500/20",
    textColor: "text-blue-400"
  },
  {
    id: "sarah",
    name: "Sarah Jenkins",
    title: "HR Director at Netflix",
    icon: "🙋‍♀️",
    description: "Evaluates behavioral situations, communication, culture fit, resolution skills, and collaborative mindset.",
    style: "supportive",
    bgColor: "bg-rose-500/10",
    borderColor: "border-rose-500/30",
    activeColor: "border-rose-500 ring-2 ring-rose-500/20",
    textColor: "text-rose-400"
  },
  {
    id: "dave",
    name: "CTO Dave",
    title: "YC Fast-Growth CTO",
    icon: "🚀",
    description: "Pragmatic developer. Tests full-stack development, database choices, rapid shipping, scalability, and startup trade-offs.",
    style: "energetic",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    activeColor: "border-amber-500 ring-2 ring-amber-500/20",
    textColor: "text-amber-400"
  },
  {
    id: "aria",
    name: "Dr. Aria Vance",
    title: "Anthropic AI Researcher",
    icon: "🧠",
    description: "Deep dive into machine learning fundamentals, high-level architecture, complex problems, and scientific thinking.",
    style: "intellectual",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    activeColor: "border-purple-500 ring-2 ring-purple-500/20",
    textColor: "text-purple-400"
  }
];

export default function MockInterviewSession() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [setupComplete, setSetupComplete] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [evalResult, setEvalResult] = useState<any>(null);
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);
  const [connectedModel, setConnectedModel] =
    useState<string>("Gemini 2.0 Flash");
  
  const [selectedPersona, setSelectedPersona] = useState<string>("siddharth");
  const [interviewType, setInterviewType] = useState<string>(location.state?.interviewType || "Technical/Coding");
  const [difficulty, setDifficulty] = useState<string>(location.state?.difficulty || "Intermediate");
  const [customFocus, setCustomFocus] = useState<string>(location.state?.customFocus || "");

  // Create a unique session ID once when component mounts
  const sessionIdRef = useRef<string>(
    location.state?.resumeSessionId || Date.now().toString(),
  );

  // Live session state
  const [liveLog, setLiveLog] = useState<
    {
      sender: "ai" | "user";
      text: string;
      time: string;
      id: number;
      complete?: boolean;
    }[]
  >([]);

  useEffect(() => {
    if (location.state?.resumeSessionId && user) {
      const fetchSession = async () => {
        const docRef = doc(
          db,
          `users/${user.uid}/interviews/${location.state.resumeSessionId}`,
        );
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.messages) setLiveLog(data.messages);
          if (data.evalResult) setEvalResult(data.evalResult);
          setSetupComplete(true);
        }
      };
      fetchSession();
    }
  }, [location.state, user]);

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const receivedAudioRef = useRef<boolean>(false);
  const currentAiTextRef = useRef<string>("");
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [liveLog]);

  // Hook to automatically persist interview to Firestore
  useEffect(() => {
    if (!user || liveLog.length === 0) return;
    const saveToFirestore = async () => {
      try {
        const docRef = doc(
          db,
          `users/${user.uid}/interviews/${sessionIdRef.current}`,
        );
        const dataToSave: any = {
          sessionId: sessionIdRef.current,
          interviewType: "Live Mock Interview",
          company: "Generic",
          messages: liveLog,
          score:
            evalResult?.scores?.overall || evalResult?.overallScore || null,
          evalResult: evalResult,
          updatedAt: serverTimestamp(),
        };

        if (!evalResult) {
          dataToSave.createdAt = serverTimestamp();
        }

        await setDoc(docRef, dataToSave, { merge: true });
      } catch (e) {
        console.error("Failed to auto-save interview:", e);
      }
    };

    // Debounce the save slightly
    const timeout = setTimeout(saveToFirestore, 1000);
    return () => clearTimeout(timeout);
  }, [liveLog, evalResult, user]);

  useEffect(() => {
    return () => {
      stopLiveSession();
    };
  }, []);

  const playAudioChunk = (audioCtx: AudioContext, base64Audio: string) => {
    try {
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const audioBuffer = audioCtx.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);

      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);

      activeSourcesRef.current.push(source);
      source.onended = () => {
        activeSourcesRef.current = activeSourcesRef.current.filter(
          (s) => s !== source,
        );
      };

      const currentTime = audioCtx.currentTime;
      if (currentTime < nextStartTimeRef.current) {
        source.start(nextStartTimeRef.current);
        nextStartTimeRef.current += audioBuffer.duration;
      } else {
        source.start(currentTime);
        nextStartTimeRef.current = currentTime + audioBuffer.duration;
      }
    } catch (e) {
      console.error("Error decoding audio data", e);
    }
  };

  const startLiveSession = async () => {
    try {
      setSetupComplete(true);
      setIsRecording(true);

      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${wsProtocol}//${window.location.host}/api/live-interview`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      const inputAudioCtx = new AudioContext({ sampleRate: 16000 });
      inputAudioCtxRef.current = inputAudioCtx;
      const outputAudioCtx = new AudioContext({ sampleRate: 24000 });
      outputAudioCtxRef.current = outputAudioCtx;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true,
          autoGainControl: true
        },
      });
      streamRef.current = stream;

      const source = inputAudioCtx.createMediaStreamSource(stream);
      // Reduced buffer size to 1024 for even lower latency (approx 64ms at 16kHz)
      const processor = inputAudioCtx.createScriptProcessor(1024, 1, 1);

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);

        // Simple Local Voice Activity Detection for instant interruption feel
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        
        // If user is clearly speaking (RMS > 0.05) and AI is talking, kill AI audio immediately
        if (rms > 0.05 && activeSourcesRef.current.length > 0) {
          nextStartTimeRef.current = 0;
          activeSourcesRef.current.forEach((s) => {
            try { s.stop(); } catch (err) {}
          });
          activeSourcesRef.current = [];
        }

        if (ws.readyState === WebSocket.OPEN) {
          const base64 = pcmToBase64(inputData);
          ws.send(JSON.stringify({ audio: base64 }));
        }
      };

      const gainNode = inputAudioCtx.createGain();
      gainNode.gain.value = 0;
      source.connect(processor);
      processor.connect(gainNode);
      gainNode.connect(inputAudioCtx.destination);

      ws.onopen = () => {
        const userName = user?.email ? user.email.split("@")[0] : "Candidate";
        setLiveLog((currentLog) => {
          let initialMessage = "";
          if (currentLog.length > 0) {
            const formattedLog = currentLog
              .map(
                (m) =>
                  `${m.sender === "user" ? userName : "Interviewer"}: ${m.text}`,
              )
              .join("\n\n");
            
            initialMessage = `We are continuing our previous interview session. Here is what we have discussed so far:\n\n${formattedLog}\n\nPlease resume the conversation seamlessly based on the context above. Do not repeat what was already said. If the last message was from me (${userName}), please respond to it as the Interviewer. If the last message was from the Interviewer, simply acknowledge silently by saying "I'm ready" or waiting for my audio input without asking a new question yet.`;
          } else {
            const personaObj = PERSONAS.find(p => p.id === selectedPersona) || PERSONAS[0];
            initialMessage = `SYSTEM INSTRUCTION / ROLEPLAY CONFIGURATION:
You are roleplaying as "${personaObj.name}" (${personaObj.title}).
Style & Demeanor: ${personaObj.description}.
Candidate Name: ${userName}.
Interview Type: ${interviewType}.
Difficulty Level: ${difficulty}.
${customFocus ? `Custom Interview Focus / Target Job Description: "${customFocus}"` : ""}

Conduct a professional, interactive live mock interview.
Start the conversation by saying exactly: "Hey ${userName}, can we start the interview?". Do not include any other introductory text, background, or pleasantries.
Then, wait for my response. Ask one question at a time. After I speak, evaluate my response, provide short context or feedback, and ask the next question. Keep your responses relatively conversational and brief. Let's begin.`;
          }
          ws.send(JSON.stringify({ text: initialMessage }));
          return currentLog;
        });
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.connected) {
          setConnectedModel(msg.model);
        }
        if (msg.error) {
          alert(msg.message || "An error occurred with the Live API.");
          stopLiveSession();
          return;
        }
        if (msg.audio && outputAudioCtxRef.current) {
          receivedAudioRef.current = true;
          playAudioChunk(outputAudioCtxRef.current, msg.audio);
        }
        if (msg.interrupted) {
          console.log("[Client] Interruption received from server");
          nextStartTimeRef.current = 0;

          activeSourcesRef.current.forEach((source) => {
            try {
              source.stop();
            } catch (e) {}
          });
          activeSourcesRef.current = [];

          setLiveLog((prev) => {
            const newLog = [...prev];
            // Mark the last AI message as complete if it was interrupted
            const lastAiIdx = newLog.map((l, i) => l.sender === "ai" && !l.complete ? i : -1).filter(i => i !== -1).pop();
            if (lastAiIdx !== undefined && lastAiIdx !== -1) {
              newLog[lastAiIdx].complete = true;
              newLog[lastAiIdx].text += "... [Interrupted]";
            }
            return newLog;
          });
        }
        if (msg.text) {
          const senderType = msg.isUserTranscription ? "user" : "ai";
          if (senderType === "ai") {
            currentAiTextRef.current += msg.text;
          }
          setLiveLog((prev) => {
            const newLog = [...prev];
            // Find the last message from this sender that is NOT complete
            const lastIdx = newLog.map((l, i) => l.sender === senderType && !l.complete ? i : -1).filter(i => i !== -1).pop();
            
            if (lastIdx !== undefined && lastIdx !== -1) {
              const last = newLog[lastIdx];
              // For user transcription, we often get full updated strings, so we replace instead of append
              const updatedText = senderType === "user" ? msg.text : last.text + msg.text;
              newLog[lastIdx] = {
                ...last,
                text: updatedText,
                complete: msg.isFinal || false
              };
              return newLog;
            } else {
              return [
                ...prev,
                {
                  sender: senderType,
                  text: msg.text,
                  time: new Date().toLocaleTimeString(),
                  id: Date.now(),
                  complete: msg.isFinal || false,
                },
              ];
            }
          });
        }
        if (msg.transcriptionComplete) {
          const senderType = msg.isUserTranscription ? "user" : "ai";
          setLiveLog((prev) => {
            const newLog = [...prev];
            const lastIdx = newLog.map((l, i) => l.sender === senderType && !l.complete ? i : -1).filter(i => i !== -1).pop();
            if (lastIdx !== undefined && lastIdx !== -1) {
              newLog[lastIdx].complete = true;
              return newLog;
            }
            return prev;
          });
        }
        if (msg.turnComplete) {
          receivedAudioRef.current = false;
          currentAiTextRef.current = "";
          setLiveLog((prev) => {
            const newLog = [...prev];
            // Mark the last AI and USER messages as complete
            return newLog.map(log => {
              if (!log.complete) return { ...log, complete: true };
              return log;
            });
          });
        }
      };
    } catch (e) {
      console.error(e);
      setIsRecording(false);
    }
  };

  const stopLiveSession = () => {
    setIsRecording(false);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close();
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close();
      outputAudioCtxRef.current = null;
    }
  };

  const deleteLog = (id: number) => {
    setLiveLog((prev) => prev.filter((log) => log.id !== id));
  };

  const submitLiveEvaluation = async () => {
    setEvalResult("loading");
    try {
      const fullTranscript = liveLog
        .map(
          (l) =>
            `${l.sender === "user" ? "Candidate" : "Interviewer"}: ${l.text}`,
        )
        .join("\n\n");
      const res = await fetch("/api/evaluate-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: safeStringify({
          question: "Full Live Interview Session",
          answerText: fullTranscript,
          type: "Technical/HR Live Session",
          company: "Generic",
        }),
      });
      const data = await res.json();
      // The API endpoint evaluates based on question/answerText,
      // it should return general scores as an approximation.
      setEvalResult(data);
    } catch (e) {
      console.error(e);
      setEvalResult({ error: true });
    }
  };

  if (!setupComplete) {
    return (
      <AppLayout activeTab="interview">
        <div className="max-w-4xl mx-auto space-y-8 pb-20 px-4 mt-6">
          {/* Header */}
          <div className="text-center md:text-left md:flex md:items-center md:justify-between border-b border-white/10 pb-6">
            <div>
              <div className="flex items-center gap-3 justify-center md:justify-start">
                <div className="bg-indigo-500/25 p-2.5 rounded-xl text-indigo-400">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                  Interview with AI Models
                </h1>
              </div>
              <p className="text-gray-400 text-sm mt-2 max-w-2xl leading-relaxed">
                Connect and practice live mock voice interviews with specialized AI models trained as technical, recruitment, and management professionals. Choose a persona, set your criteria, and receive real-time, constructive audio feedback.
              </p>
            </div>
          </div>

          <div className="max-w-md mx-auto space-y-4">
            {/* Info Tip */}
            <div className="bg-indigo-500/5 rounded-xl p-4 border border-indigo-500/10 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 block">How it works</span>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Once you start, the system connects directly to our real-time voice and multimodal Gemini engine. Please ensure your microphone is enabled!
              </p>
            </div>

            {/* Launch Button */}
            <button
              onClick={startLiveSession}
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white py-3.5 rounded-xl font-bold flex justify-center items-center gap-2 transition-all shadow-lg hover:shadow-indigo-500/20 active:scale-98 cursor-pointer text-sm"
            >
              <AudioLines className="w-4 h-4" /> Start Live Voice Session
            </button>
            <button
              onClick={() => navigate("/interview/history")}
              className="w-full bg-[#1A233A] hover:bg-[#232D45] border border-white/5 text-gray-300 py-3.5 rounded-xl font-bold flex justify-center items-center gap-2 transition-all shadow-lg active:scale-98 cursor-pointer text-sm mt-4"
            >
              <CheckCircle2 className="w-4 h-4" /> View Interview History
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeTab="interview">
      <div className="max-w-4xl mx-auto space-y-6 pb-20">
        <div className="bg-[#111827] border border-indigo-500/30 rounded-xl md:rounded-3xl p-4 md:p-8 shadow-2xl flex flex-col h-[75vh] md:h-[70vh]">
          <div className="flex flex-wrap md:flex-nowrap justify-between items-start md:items-center gap-3 mb-4 md:mb-6 border-b border-white/10 pb-3 md:pb-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="bg-indigo-500/20 p-1.5 md:p-2 rounded-lg md:rounded-xl text-indigo-400">
                <AudioLines className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-bold text-white">
                  Live Voice Interview
                </h2>
                <div className="text-[10px] md:text-xs font-mono text-indigo-400 flex items-center gap-1.5 mt-0.5 md:mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                  Powered by {connectedModel} Live
                </div>
              </div>
            </div>
            <button
              onClick={isRecording ? stopLiveSession : startLiveSession}
              className={
                "flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-bold transition-all cursor-pointer shrink-0 " +
                (isRecording
                  ? "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30"
                  : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30")
              }
            >
              {isRecording ? (
                <>
                  <StopCircle className="w-3.5 h-3.5 md:w-4 md:h-4" /> End Call
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 md:w-4 md:h-4" /> Start Call
                </>
              )}
            </button>
          </div>

          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto space-y-4 pr-1 md:pr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            <AnimatePresence>
              {liveLog.length === 0 && !isRecording && (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 text-xs md:text-sm text-center">
                  Click 'Start Call' to begin the mock interview.
                </div>
              )}
              {liveLog.map((log) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={log.id}
                  className={`flex flex-col relative group max-w-[90%] md:max-w-[85%] ${log.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"}`}
                >
                  <div className="flex items-center gap-1.5 md:gap-2 mb-0.5 md:mb-1 px-1">
                    <span className="text-[9px] md:text-[10px] text-gray-500">
                      {log.time}
                    </span>
                    <span
                      className={`text-[9px] md:text-[11px] font-bold uppercase tracking-wider ${log.sender === "user" ? "text-emerald-400" : "text-rose-400"}`}
                    >
                      {log.sender === "user" ? "You" : "AI Interviewer"}
                    </span>
                  </div>
                  <div
                    className={`p-3 md:p-4 rounded-xl md:rounded-2xl relative text-xs md:text-sm ${log.sender === "user" ? "bg-emerald-500/10 border border-emerald-500/20 rounded-tr-sm text-emerald-50" : "bg-rose-500/10 border border-rose-500/20 rounded-tl-sm text-rose-100"}`}
                  >
                    {log.text}
                  </div>
                  <button
                    onClick={() => deleteLog(log.id)}
                    className="absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-2 text-gray-500 hover:text-rose-400 bg-[#0A0F1E] rounded-full shadow-lg border border-white/5 cursor-pointer"
                    style={{
                      [log.sender === "user" ? "left" : "right"]: "-2.5rem",
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}

              {isRecording &&
                liveLog.length > 0 &&
                liveLog[liveLog.length - 1].sender === "user" &&
                liveLog[liveLog.length - 1].complete && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col relative mr-auto items-start max-w-[85%] mt-4"
                  >
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
                        AI Interviewer
                      </span>
                    </div>
                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 rounded-tl-sm text-rose-100 flex items-center gap-1.5 h-[56px]">
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      ></span>
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      ></span>
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      ></span>
                    </div>
                  </motion.div>
                )}
            </AnimatePresence>
          </div>

          {liveLog.length > 0 && !isRecording && (
            <div className="pt-6 mt-4 border-t border-white/10 flex justify-center">
              <button
                onClick={() => setShowTranscriptModal(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" /> View Transcript &
                Evaluation
              </button>
            </div>
          )}

          {showTranscriptModal && (
            <div className="absolute inset-0 bg-[#0A0F1E]/95 backdrop-blur-md z-10 p-8 flex flex-col rounded-3xl border border-white/10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">
                  Interview Transcript & Feedback
                </h3>
                <button
                  onClick={() => setShowTranscriptModal(false)}
                  className="text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto pr-1 md:pr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] space-y-4 md:space-y-6">
                <div className="space-y-4 bg-[#111827] p-6 rounded-2xl border border-white/5">
                  <h4 className="font-bold text-indigo-400 border-b border-white/5 pb-2">
                    Full Transcript
                  </h4>
                  {liveLog.map((log) => (
                    <div key={log.id} className="text-sm">
                      <div
                        className={`font-bold ${log.sender === "user" ? "text-emerald-400" : "text-rose-400"}`}
                      >
                        {log.sender === "user" ? "You:" : "AI:"}
                      </div>
                      <div className="text-gray-300 ml-4 pb-4">{log.text}</div>
                    </div>
                  ))}
                </div>

                <div className="bg-[#111827] rounded-3xl p-8 border border-white/10">
                  <h3 className="text-xl font-bold mb-6 text-white">
                    AI Evaluation Mode
                  </h3>
                  <div className="flex justify-center my-8">
                    <button
                      onClick={submitLiveEvaluation}
                      disabled={evalResult === "loading"}
                      className="bg-emerald-600 hover:bg-emerald-500 px-8 py-3 rounded-xl font-bold text-white disabled:opacity-50 transition-all shadow-lg cursor-pointer"
                    >
                      {evalResult === "loading"
                        ? "Analyzing Interview..."
                        : "Generate AI Scores & Feedback"}
                    </button>
                  </div>

                  {evalResult && evalResult !== "loading" && evalResult.error && (
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-center">
                      There was an error generating the evaluation. Please try again.
                    </div>
                  )}
                  {evalResult &&
                    evalResult !== "loading" &&
                    !evalResult.error && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <div className="flex justify-between items-end mb-6">
                          <div>
                            <h3 className="text-xl font-bold mb-1 text-white">
                              AI Evaluation Report
                            </h3>
                            {evalResult.placementProbability && (
                              <p className="text-indigo-400 font-bold">
                                {evalResult.placementProbability}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
                          <div className="bg-[#0A0F1E] rounded-xl p-4 text-center border border-white/5 shadow-inner">
                            <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-bold">
                              Overall
                            </div>
                            <div className="text-2xl font-black text-white">
                              {evalResult.scores?.overall ||
                                evalResult.overallScore}
                              /100
                            </div>
                          </div>
                          <div className="bg-[#0A0F1E] rounded-xl p-4 text-center border border-white/5">
                            <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider">
                              Communication
                            </div>
                            <div className="text-xl font-bold text-indigo-400">
                              {evalResult.scores?.communication ||
                                evalResult.scores?.fluency ||
                                "N/A"}
                              /100
                            </div>
                          </div>
                          <div className="bg-[#0A0F1E] rounded-xl p-4 text-center border border-white/5">
                            <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider">
                              Confidence
                            </div>
                            <div className="text-xl font-bold text-cyan-400">
                              {evalResult.scores?.confidence || "N/A"}/100
                            </div>
                          </div>
                          <div className="bg-[#0A0F1E] rounded-xl p-4 text-center border border-white/5">
                            <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider">
                              Technical
                            </div>
                            <div className="text-xl font-bold text-emerald-400">
                              {evalResult.scores?.technical ||
                                evalResult.scores?.depth ||
                                "N/A"}
                              /100
                            </div>
                          </div>
                          <div className="bg-[#0A0F1E] rounded-xl p-4 text-center border border-white/5">
                            <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider">
                              Problem Solving
                            </div>
                            <div className="text-xl font-bold text-amber-400">
                              {evalResult.scores?.problemSolving || "N/A"}/100
                            </div>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-bold text-emerald-400 mb-2">
                              ✅ Strengths
                            </h4>
                            <ul className="list-disc pl-5 text-gray-300 space-y-1 text-sm">
                              {(
                                evalResult.feedback?.strengths ||
                                evalResult.strengths ||
                                []
                              ).map((s: string, i: number) => (
                                <li key={i}>{s}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-bold text-amber-400 mb-2">
                              ⚠️ Areas for Improvement
                            </h4>
                            <ul className="list-disc pl-5 text-gray-300 space-y-1 text-sm">
                              {(
                                evalResult.feedback?.weaknesses ||
                                evalResult.improvements ||
                                []
                              ).map((s: string, i: number) => (
                                <li key={i}>{s}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="mt-8 bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-5">
                          <h4 className="font-bold text-indigo-400 mb-2">
                            💡 Ideal Response Pattern
                          </h4>
                          <p className="text-sm text-indigo-200/80 leading-relaxed text-justify">
                            {evalResult.feedback?.improvementPlan?.join
                              ? evalResult.feedback.improvementPlan.join(" ")
                              : evalResult.feedback?.improvementPlan ||
                                evalResult.betterAnswer}
                          </p>
                        </div>
                      </motion.div>
                    )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
