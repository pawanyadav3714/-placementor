import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  Timestamp, 
  deleteDoc, 
  doc, 
  updateDoc 
} from "firebase/firestore";
import AppLayout from "../../components/AppLayout";
import Editor from "@monaco-editor/react";
import { 
  Search, 
  Plus, 
  Play, 
  Save, 
  Trash2, 
  Mic, 
  MicOff, 
  Check, 
  X, 
  MessageSquare, 
  History, 
  Languages, 
  Settings, 
  PanelLeft, 
  PanelRight, 
  Terminal as TerminalIcon,
  ChevronRight,
  ChevronDown,
  Pin,
  Star,
  FileCode,
  Download,
  Upload,
  Copy,
  Maximize2,
  Minimize2,
  Cpu,
  Zap,
  Bug,
  Lightbulb,
  MoreVertical,
  Edit2,
  Sparkles,
  Code,
  Volume2,
  VolumeX
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";
import { useSpeechToText } from "../../hooks/useSpeechToText";
import { SavedQuestion, ProgrammingLanguage, TerminalOutput } from "../../types/vscode";
import { clsx } from "clsx";

export default function VsCodeWorkspace() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<SavedQuestion[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<SavedQuestion | null>(null);
  const [activeTab, setActiveTab] = useState<"editor" | "solution">("editor");
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isAiPanelVisible, setIsAiPanelVisible] = useState(true);
  const [isTerminalVisible, setIsTerminalVisible] = useState(true);
  const [language, setLanguage] = useState<ProgrammingLanguage>("python");
  const [code, setCode] = useState("");
  const [terminalOutputs, setTerminalOutputs] = useState<TerminalOutput[]>([]);
  const [terminalInput, setTerminalInput] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Question Input State
  const [isInputVisible, setIsInputVisible] = useState(false);
  const [manualQuestion, setManualQuestion] = useState("");
  const [recognizedText, setRecognizedText] = useState("");
  const [isReviewingSpeech, setIsReviewingSpeech] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // AI Assistant State
  const [aiChat, setAiChat] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceGuidanceEnabled, setVoiceGuidanceEnabled] = useState(true);

  const { isListening, transcript, startListening, stopListening, resetTranscript } = useSpeechToText();

  // Refs
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speakText = (text: string) => {
    if (!voiceGuidanceEnabled) return;
    
    // Stop current speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "vscode_questions"),
      where("userId", "==", user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedQuestion));
      // Sort by createdAt descending in memory to avoid composite index requirement
      docs.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
      setQuestions(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "vscode_questions");
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (transcript) {
      setRecognizedText(transcript);
    }
  }, [transcript]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalOutputs]);

  const handleSaveQuestion = async (finalText: string) => {
    if (!user || !finalText.trim()) return;
    try {
      const newQuestion = {
        userId: user.uid,
        title: finalText.split("\n")[0].slice(0, 30) + (finalText.length > 30 ? "..." : ""),
        question: finalText,
        language,
        difficulty: "Unknown",
        createdAt: Timestamp.now(),
        code: ""
      };
      await addDoc(collection(db, "vscode_questions"), newQuestion);
      setIsInputVisible(false);
      setManualQuestion("");
      setRecognizedText("");
      setIsReviewingSpeech(false);
      resetTranscript();
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, "vscode_questions");
    }
  };

  const handleSelectQuestion = async (q: SavedQuestion) => {
    setSelectedQuestion(q);
    setLanguage(q.language);
    if (q.code) {
      setCode(q.code);
    } else if (q.solution?.code) {
      setCode(q.solution.code);
    } else {
      // Generate solution if not present
      generateSolution(q);
    }
  };

  const generateSolution = async (q: SavedQuestion) => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/vscode/generate-solution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q.question, language: q.language })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      const updatedQ = { ...q, solution: data, code: q.code || data.code };
      setSelectedQuestion(updatedQ);
      setCode(updatedQ.code || "");
      
      // Update in Firestore
      try {
        await updateDoc(doc(db, "vscode_questions", q.id), {
          solution: data,
          code: q.code || data.code
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `vscode_questions/${q.id}`);
      }
    } catch (e) {
      console.error("Error generating solution:", e);
      addTerminalOutput("error", "Failed to generate AI solution.");
    } finally {
      setIsGenerating(false);
    }
  };

  const runCode = async () => {
    if (!code.trim() || isExecuting) return;
    setIsExecuting(true);
    stopSpeaking();
    addTerminalOutput("system", `Executing ${language} code via AI Compilation...`);
    
    try {
      const response = await fetch("/api/vscode/predict-output", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, code, input: terminalInput })
      });
      
      const data = await response.json();
      
      if (data.error) {
        addTerminalOutput("error", `AI Engine Error: ${data.error}`);
        if (data.details) addTerminalOutput("error", data.details);
      } else if (data.output) {
        // Check if output looks like an error
        const isError = data.output.toLowerCase().includes("error") || 
                        data.output.toLowerCase().includes("exception") ||
                        data.output.toLowerCase().includes("failed");
        
        if (isError) {
          addTerminalOutput("error", data.output);
          if (voiceGuidanceEnabled) {
            analyzeAndSpeakError(data.output);
          }
        } else {
          addTerminalOutput("output", data.output);
        }
        addTerminalOutput("system", `AI Prediction complete.`);
      } else {
        addTerminalOutput("error", "AI failed to predict output.");
      }
    } catch (e) {
      addTerminalOutput("error", "Failed to connect to AI prediction server.");
    } finally {
      setIsExecuting(false);
    }
  };

  const analyzeAndSpeakError = async (error: string) => {
    try {
      const response = await fetch("/api/vscode/analyze-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, error })
      });
      const data = await response.json();
      if (data.analysis) {
        speakText(data.analysis);
        addAiMessage('assistant', `Voice Guidance: ${data.analysis}`);
      }
    } catch (e) {
      console.error("Error analyzing for voice:", e);
    }
  };

  const addTerminalOutput = (type: TerminalOutput["type"], content: string) => {
    setTerminalOutputs(prev => [...prev, { type, content, timestamp: Date.now() }]);
  };

  const handleAiAction = async (action: string) => {
    setIsAiLoading(true);
    addAiMessage('user', `${action.replace(/-/g, ' ')} for this code.`);
    try {
      const response = await fetch("/api/vscode/ai-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, code, language })
      });
      const data = await response.json();
      addAiMessage('assistant', data.response);
    } catch (e) {
      addAiMessage('assistant', "Sorry, I couldn't process that request.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const addAiMessage = (role: 'user' | 'assistant', content: string) => {
    setAiChat(prev => [...prev, { role, content }]);
  };

  const filteredQuestions = questions.filter(q => 
    q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.question.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout activeTab="vscode">
      <div className="h-[calc(100vh-120px)] flex flex-col bg-[#1e1e1e] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
        {/* Top Bar */}
        <div className="h-12 bg-[#2d2d2d] border-b border-white/5 flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarVisible(!isSidebarVisible)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <PanelLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 bg-[#3c3c3c] rounded px-2 py-1 text-sm text-gray-300">
              <FileCode className="w-4 h-4 text-blue-400" />
              <span>{selectedQuestion ? selectedQuestion.title : "Untitled.txt"}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select 
              value={language}
              onChange={(e) => setLanguage(e.target.value as ProgrammingLanguage)}
              className="bg-[#3c3c3c] text-gray-300 text-xs rounded border border-white/10 px-2 py-1 outline-none"
            >
              <option value="c">C</option>
              <option value="cpp">C++</option>
              <option value="java">Java</option>
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="go">Go</option>
              <option value="rust">Rust</option>
            </select>
            
            <button 
              onClick={() => setVoiceGuidanceEnabled(!voiceGuidanceEnabled)}
              className={clsx(
                "p-2 rounded transition-all",
                voiceGuidanceEnabled ? "text-indigo-400 hover:bg-indigo-500/10" : "text-gray-500 hover:bg-white/5"
              )}
              title={voiceGuidanceEnabled ? "Disable Voice Guidance" : "Enable Voice Guidance"}
            >
              {voiceGuidanceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>

            <button 
              onClick={runCode}
              disabled={isExecuting}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-3 py-1 rounded text-sm transition-all"
            >
              {isExecuting ? <Zap className="w-4 h-4 animate-pulse" /> : <Play className="w-4 h-4" />}
              <span>Run</span>
            </button>
            
            <button 
              onClick={() => setIsInputVisible(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded text-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>New Question</span>
            </button>

            <button 
              onClick={() => setIsAiPanelVisible(!isAiPanelVisible)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <PanelRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <PanelGroup orientation="horizontal" className="flex-1">
          {/* Left Sidebar: Saved Questions */}
          {isSidebarVisible && (
            <>
              <Panel defaultSize={20} minSize={15} className="bg-[#252526] border-r border-white/5 flex flex-col">
                <div className="p-3 border-b border-white/5">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">Saved Questions</h3>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 w-3.5 h-3.5 text-gray-500" />
                    <input 
                      type="text" 
                      placeholder="Search questions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#3c3c3c] text-sm text-gray-300 pl-8 pr-3 py-2 rounded outline-none focus:ring-1 focus:ring-indigo-500/50"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
                  {filteredQuestions.map(q => (
                    <button
                      key={q.id}
                      onClick={() => handleSelectQuestion(q)}
                      className={clsx(
                        "w-full text-left px-4 py-2 flex items-start gap-3 transition-colors group",
                        selectedQuestion?.id === q.id ? "bg-[#37373d] text-white" : "text-gray-400 hover:bg-[#2a2d2e] hover:text-gray-200"
                      )}
                    >
                      <FileCode className={clsx("w-4 h-4 mt-1 flex-shrink-0", selectedQuestion?.id === q.id ? "text-indigo-400" : "text-gray-500")} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{q.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] opacity-60 capitalize">{q.language}</span>
                          <span className="text-[10px] opacity-40">•</span>
                          <span className="text-[10px] opacity-60">
                            {q.createdAt?.toDate().toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                        <Pin className="w-3 h-3 hover:text-indigo-400 transition-colors" />
                        <Trash2 
                          className="w-3 h-3 hover:text-red-400 transition-colors" 
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (confirm("Are you sure you want to delete this question?")) {
                              try {
                                await deleteDoc(doc(db, "vscode_questions", q.id));
                              } catch (err) {
                                handleFirestoreError(err, OperationType.DELETE, `vscode_questions/${q.id}`);
                              }
                            }
                          }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </Panel>
              <PanelResizeHandle className="w-1 bg-transparent hover:bg-indigo-500/30 transition-colors" />
            </>
          )}

          {/* Main Editor & Terminal Area */}
          <Panel defaultSize={60} className="flex flex-col bg-[#1e1e1e]">
            <PanelGroup orientation="vertical">
              <Panel defaultSize={70} className="flex flex-col">
                {/* Tabs */}
                <div className="h-9 bg-[#252526] flex items-center px-2 gap-1 overflow-x-auto no-scrollbar">
                  <button 
                    onClick={() => setActiveTab("editor")}
                    className={clsx(
                      "px-4 h-full flex items-center gap-2 text-xs transition-colors relative",
                      activeTab === "editor" ? "bg-[#1e1e1e] text-white" : "text-gray-500 hover:bg-[#2a2d2e]"
                    )}
                  >
                    <FileCode className="w-3.5 h-3.5 text-blue-400" />
                    <span>Editor</span>
                    {activeTab === "editor" && <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-500" />}
                  </button>
                  <button 
                    onClick={() => setActiveTab("solution")}
                    className={clsx(
                      "px-4 h-full flex items-center gap-2 text-xs transition-colors relative",
                      activeTab === "solution" ? "bg-[#1e1e1e] text-white" : "text-gray-500 hover:bg-[#2a2d2e]"
                    )}
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-yellow-400" />
                    <span>AI Solution</span>
                    {activeTab === "solution" && <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-500" />}
                  </button>
                </div>

                <div className="flex-1 relative overflow-hidden">
                  {activeTab === "editor" ? (
                    <Editor
                      height="100%"
                      defaultLanguage="python"
                      language={language === "cpp" ? "cpp" : language === "c" ? "c" : language}
                      value={code}
                      onChange={(val) => setCode(val || "")}
                      theme="vs-dark"
                      options={{
                        minimap: { enabled: true },
                        fontSize: 14,
                        lineNumbers: "on",
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 2,
                        wordWrap: "on",
                        suggestOnTriggerCharacters: true,
                        acceptSuggestionOnEnter: "on",
                        folding: true,
                        bracketPairColorization: { enabled: true },
                        padding: { top: 10, bottom: 10 }
                      }}
                    />
                  ) : (
                    <div className="h-full overflow-y-auto p-6 bg-[#1e1e1e] text-gray-300 space-y-8 custom-scrollbar">
                      {isGenerating ? (
                        <div className="h-full flex flex-col items-center justify-center space-y-4">
                          <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                          <p className="text-gray-400 animate-pulse">AI is crafting your solution...</p>
                        </div>
                      ) : selectedQuestion?.solution ? (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="max-w-3xl mx-auto space-y-8"
                        >
                          <section>
                            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                              <MessageSquare className="w-5 h-5 text-indigo-400" />
                              Explanation
                            </h3>
                            <p className="leading-relaxed text-gray-400">{selectedQuestion.solution.explanation}</p>
                          </section>

                          <section>
                            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                              <History className="w-5 h-5 text-green-400" />
                              Algorithm
                            </h3>
                            <div className="bg-[#252526] p-4 rounded-lg border border-white/5 whitespace-pre-wrap leading-relaxed">
                              {selectedQuestion.solution.algorithm}
                            </div>
                          </section>

                          <div className="grid grid-cols-2 gap-4">
                            <section className="bg-[#252526] p-4 rounded-lg border border-white/5">
                              <h4 className="text-sm font-bold text-gray-400 mb-2">Sample Input</h4>
                              <pre className="text-indigo-400 font-mono text-sm">{selectedQuestion.solution.sampleInput}</pre>
                            </section>
                            <section className="bg-[#252526] p-4 rounded-lg border border-white/5">
                              <h4 className="text-sm font-bold text-gray-400 mb-2">Sample Output</h4>
                              <pre className="text-green-400 font-mono text-sm">{selectedQuestion.solution.sampleOutput}</pre>
                            </section>
                          </div>

                          <section>
                            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                              <Cpu className="w-5 h-5 text-purple-400" />
                              Complexity
                            </h3>
                            <p className="text-gray-400 font-mono">{selectedQuestion.solution.complexity}</p>
                          </section>

                          <section>
                            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                              <Bug className="w-5 h-5 text-red-400" />
                              Edge Cases
                            </h3>
                            <div className="bg-[#252526] p-4 rounded-lg border border-white/5 text-gray-400 whitespace-pre-wrap">
                              {selectedQuestion.solution.edgeCases}
                            </div>
                          </section>
                        </motion.div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                          <Lightbulb className="w-16 h-16" />
                          <div>
                            <p className="text-lg font-bold">No solution generated yet</p>
                            <p className="text-sm">Select a question or click the button below</p>
                          </div>
                          {selectedQuestion && (
                            <button 
                              onClick={() => generateSolution(selectedQuestion)}
                              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all"
                            >
                              Generate with AI
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Panel>

              {/* Terminal */}
              {isTerminalVisible && (
                <>
                  <PanelResizeHandle className="h-1 bg-transparent hover:bg-indigo-500/30 transition-colors" />
                  <Panel defaultSize={30} minSize={10} className="bg-[#1e1e1e] flex flex-col border-t border-white/5">
                    <div className="h-8 bg-[#252526] flex items-center justify-between px-4">
                      <div className="flex items-center gap-4 h-full">
                        <button className="text-xs font-bold text-gray-300 border-b-2 border-indigo-500 h-full flex items-center px-1">
                          Terminal
                        </button>
                        {isSpeaking && (
                          <motion.div 
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ repeat: Infinity, duration: 1 }}
                            className="flex items-center gap-2 px-3 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] text-indigo-400"
                          >
                            <Volume2 className="w-3 h-3 animate-pulse" />
                            AI is speaking...
                            <button onClick={stopSpeaking} className="ml-1 hover:text-white">
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </motion.div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setTerminalOutputs([])}
                          className="text-gray-500 hover:text-white"
                          title="Clear Terminal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => setIsTerminalVisible(false)}
                          className="text-gray-500 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex-1 flex">
                      {/* Input Panel for Code Run */}
                      <div className="w-1/4 border-r border-white/5 flex flex-col p-3 gap-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Standard Input</label>
                        <textarea 
                          value={terminalInput}
                          onChange={(e) => setTerminalInput(e.target.value)}
                          placeholder="Provide input for your program..."
                          className="flex-1 bg-[#2d2d2d] text-sm text-gray-300 p-2 rounded outline-none resize-none custom-scrollbar"
                        />
                      </div>
                      
                      {/* Terminal Output */}
                      <div className="flex-1 bg-[#1e1e1e] overflow-y-auto p-4 font-mono text-sm custom-scrollbar">
                        {terminalOutputs.length === 0 && (
                          <div className="text-gray-600 italic">No output yet. Click 'Run' to execute your code.</div>
                        )}
                        {terminalOutputs.map((out, idx) => (
                          <div key={idx} className={clsx(
                            "mb-1 break-all whitespace-pre-wrap",
                            out.type === "output" ? "text-gray-300" :
                            out.type === "error" ? "text-red-400" :
                            out.type === "system" ? "text-indigo-400" :
                            "text-yellow-400"
                          )}>
                            {out.type === "system" && <span className="opacity-50">[{new Date(out.timestamp).toLocaleTimeString()}] </span>}
                            {out.content}
                          </div>
                        ))}
                        <div ref={terminalEndRef} />
                      </div>
                    </div>
                  </Panel>
                </>
              )}
            </PanelGroup>
          </Panel>

          {/* Right Sidebar: AI Assistant */}
          {isAiPanelVisible && (
            <>
              <PanelResizeHandle className="w-1 bg-transparent hover:bg-indigo-500/30 transition-colors" />
              <Panel defaultSize={20} minSize={15} className="bg-[#252526] border-l border-white/5 flex flex-col">
                <div className="p-3 border-b border-white/5 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">AI Assistant</h3>
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                </div>
                
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Quick Actions */}
                  <div className="p-3 grid grid-cols-2 gap-2 border-b border-white/5">
                    {[
                      { id: 'explain', label: 'Explain', icon: MessageSquare },
                      { id: 'optimize', label: 'Optimize', icon: Zap },
                      { id: 'find-bugs', label: 'Find Bugs', icon: Bug },
                      { id: 'fix-errors', label: 'Fix', icon: Check },
                      { id: 'dry-run', label: 'Dry Run', icon: History },
                      { id: 'simplify', label: 'Simplify', icon: Settings },
                    ].map(btn => (
                      <button
                        key={btn.id}
                        onClick={() => handleAiAction(btn.id)}
                        className="flex flex-col items-center justify-center p-2 rounded bg-[#3c3c3c] hover:bg-[#4a4a4a] text-gray-400 hover:text-white transition-all gap-1 text-[10px]"
                      >
                        <btn.icon className="w-3.5 h-3.5" />
                        <span>{btn.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Chat Area */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
                    {aiChat.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-3 opacity-40">
                        <MessageSquare className="w-10 h-10" />
                        <p className="text-xs">Ask me anything about your code. I can help with debugging, optimization, or explanations.</p>
                      </div>
                    )}
                    {aiChat.map((msg, idx) => (
                      <div key={idx} className={clsx(
                        "p-3 rounded-lg text-xs leading-relaxed",
                        msg.role === 'user' ? "bg-indigo-500/10 text-indigo-200 border border-indigo-500/20" : "bg-[#3c3c3c] text-gray-300"
                      )}>
                        <p className="font-bold mb-1 uppercase text-[9px] opacity-50">{msg.role}</p>
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      </div>
                    ))}
                    {isAiLoading && (
                      <div className="flex justify-center py-2">
                        <div className="flex gap-1">
                          {[0, 1, 2].map(i => (
                            <motion.div
                              key={i}
                              animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                              transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                              className="w-1.5 h-1.5 bg-indigo-500 rounded-full"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Chat Input */}
                  <div className="p-3 border-t border-white/5">
                    <div className="relative">
                      <textarea
                        value={aiInput}
                        onChange={(e) => setAiInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (aiInput.trim()) {
                              handleAiAction('chat-' + aiInput);
                              setAiInput("");
                            }
                          }
                        }}
                        placeholder="Ask AI Assistant..."
                        className="w-full bg-[#3c3c3c] text-xs text-gray-300 p-2 pr-8 rounded outline-none resize-none max-h-32 border border-transparent focus:border-indigo-500/50"
                        rows={2}
                      />
                      <button 
                        disabled={!aiInput.trim() || isAiLoading}
                        className="absolute right-2 bottom-2 text-indigo-400 hover:text-indigo-300 disabled:opacity-30"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </Panel>
            </>
          )}
        </PanelGroup>

        {/* Status Bar */}
        <div className="h-6 bg-[#007acc] text-white flex items-center justify-between px-3 text-[11px]">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <History className="w-3 h-3" />
              <span>{isExecuting ? "Running..." : "Ready"}</span>
            </div>
            <div className="flex items-center gap-1">
              <Bug className="w-3 h-3" />
              <span>0 Errors</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              <span>v1.0.0</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span>Spaces: 2</span>
            <span>UTF-8</span>
            <div className="flex items-center gap-1">
              <Languages className="w-3 h-3" />
              <span className="uppercase">{language}</span>
            </div>
            <div className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>AI Connected</span>
            </div>
          </div>
        </div>
      </div>

      {/* New Question Modal */}
      <AnimatePresence>
        {isInputVisible && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1e1e1e] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  <Code className="text-indigo-400" />
                  New Coding Problem
                </h2>
                <button 
                  onClick={() => setIsInputVisible(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Options Header */}
                <div className="flex gap-4 p-1 bg-[#2d2d2d] rounded-lg">
                  <button 
                    onClick={() => setIsReviewingSpeech(false)}
                    className={clsx(
                      "flex-1 py-2 rounded-md text-sm font-medium transition-all",
                      !isReviewingSpeech ? "bg-[#3c3c3c] text-white shadow-lg" : "text-gray-500 hover:text-gray-300"
                    )}
                  >
                    Type Question
                  </button>
                  <button 
                    onClick={() => {
                      setIsReviewingSpeech(true);
                      resetTranscript();
                    }}
                    className={clsx(
                      "flex-1 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2",
                      isReviewingSpeech ? "bg-[#3c3c3c] text-white shadow-lg" : "text-gray-500 hover:text-gray-300"
                    )}
                  >
                    <Mic className="w-4 h-4" />
                    Open Mic
                  </button>
                </div>

                {!isReviewingSpeech ? (
                  <div className="space-y-4">
                    <textarea 
                      value={manualQuestion}
                      onChange={(e) => setManualQuestion(e.target.value)}
                      placeholder="Type your coding problem here... (e.g., Write a C program to reverse a string)"
                      className="w-full h-40 bg-[#2d2d2d] text-gray-200 p-4 rounded-xl outline-none border border-transparent focus:border-indigo-500/50 resize-none custom-scrollbar"
                    />
                    <div className="flex justify-end gap-3">
                      <button 
                        onClick={() => setIsInputVisible(false)}
                        className="px-6 py-2 rounded-lg text-gray-400 hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => handleSaveQuestion(manualQuestion)}
                        disabled={!manualQuestion.trim()}
                        className="px-8 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-lg transition-all shadow-lg shadow-indigo-500/20"
                      >
                        Save Question
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/5 rounded-2xl bg-[#252526]">
                      <button
                        onClick={isListening ? stopListening : startListening}
                        className={clsx(
                          "w-20 h-20 rounded-full flex items-center justify-center transition-all mb-4 relative",
                          isListening ? "bg-red-500 shadow-lg shadow-red-500/40" : "bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/40"
                        )}
                      >
                        {isListening ? (
                          <>
                            <MicOff className="w-8 h-8 text-white z-10" />
                            <motion.div 
                              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                              transition={{ repeat: Infinity, duration: 1.5 }}
                              className="absolute inset-0 bg-red-500 rounded-full"
                            />
                          </>
                        ) : (
                          <Mic className="w-8 h-8 text-white" />
                        )}
                      </button>
                      <p className="text-white font-medium mb-1">
                        {isListening ? "Listening..." : "Click to speak"}
                      </p>
                      <p className="text-gray-500 text-sm">
                        Speak your coding problem clearly
                      </p>
                    </div>

                    {recognizedText && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                      >
                        <div className="flex items-center justify-between px-1">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Recognized Question</span>
                          <span className="text-[10px] text-indigo-400">Live Transcription</span>
                        </div>
                        <div className="bg-[#2d2d2d] p-4 rounded-xl border border-indigo-500/20 text-gray-200 min-h-[100px] whitespace-pre-wrap">
                          {recognizedText}
                        </div>
                        <div className="flex justify-end gap-3">
                          <button 
                            onClick={() => {
                              setRecognizedText("");
                              resetTranscript();
                            }}
                            className="px-6 py-2 rounded-lg text-red-400 hover:bg-red-400/10 transition-all flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            Decline
                          </button>
                          <button 
                            onClick={() => {
                              setManualQuestion(recognizedText);
                              setIsReviewingSpeech(false);
                            }}
                            className="px-6 py-2 bg-[#3c3c3c] hover:bg-[#4a4a4a] text-white rounded-lg transition-all flex items-center gap-2"
                          >
                            <Edit2 className="w-4 h-4" />
                            Accept & Edit
                          </button>
                          <button 
                            onClick={() => handleSaveQuestion(recognizedText)}
                            className="px-8 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all"
                          >
                            Save & Create
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </AppLayout>
  );
}
