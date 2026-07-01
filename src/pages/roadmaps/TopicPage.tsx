import { Topic } from "./roadmapData";
import { safeStringify } from "../../utils/safeStringify";
import { 
  Code, 
  Terminal, 
  HelpCircle, 
  Sparkles, 
  CheckCircle, 
  Bookmark, 
  MessageSquare, 
  FileText, 
  ChevronRight, 
  RotateCcw,
  Play,
  Copy,
  ExternalLink,
  Info,
  AlertTriangle,
  Lightbulb,
  Link2,
  Database,
  Activity,
  Layers as LayersIcon,
  Zap,
  Building2,
  Trophy,
  History,
  X,
  Check,
  Layout
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";

interface TopicPageProps {
  topic: Topic;
  onMarkComplete: (topic: Topic) => void;
  isCompleted: boolean;
  onToggleBookmark: (topicId: string) => void;
  isBookmarked: boolean;
  onSaveNotes: (topicId: string, text: string) => void;
  initialNote: string;
}

export default function TopicPage({ 
  topic, 
  onMarkComplete, 
  isCompleted, 
  onToggleBookmark, 
  isBookmarked,
  onSaveNotes,
  initialNote
}: TopicPageProps) {
  const { user } = useAuth();
  const [activeCode, setActiveCode] = useState(topic.codeExample);
  const [output, setOutput] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"content" | "practice" | "quiz" | "ai">("content");
  const [note, setNote] = useState(initialNote);
  const [quizSelected, setQuizSelected] = useState<number | null>(null);
  const [quizChecked, setQuizChecked] = useState(false);
  
  // AI Assistant states
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");

  const handleRunCode = () => {
    const logs: string[] = [];
    const originalLog = console.log;

    console.log = (...args: any[]) => {
      logs.push(args.map(arg => safeStringify(arg)).join(" "));
    };
    
    try {
      // Basic evaluation for demo purposes
      const result = eval(activeCode);
      if (result !== undefined) logs.push(`=> ${safeStringify(result)}`);
    } catch (err: any) {
      logs.push(`Error: ${err.message}`);
    } finally {
      console.log = originalLog;
    }
    setOutput(logs);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleAIRequest = async (prompt?: string) => {
    setAiLoading(true);
    setAiResponse("");
    const finalPrompt = prompt || aiPrompt;
    
    try {
      const response = await fetch("/api/roadmap-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `${finalPrompt}\n\nContext: We are learning about "${topic.title}". My current code is:\n${activeCode}`,
          feature: "explain",
          userId: user?.uid
        })
      });
      const data = await response.json();
      setAiResponse(data.text);
    } catch (err) {
      setAiResponse("Sorry, I couldn't process that request right now.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#090D1A] text-gray-100">
      <div className="max-w-4xl mx-auto px-6 py-10">
        
        {/* HEADER */}
        <header className="mb-12">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                topic.difficulty === "Beginner" ? "bg-emerald-500/10 text-emerald-400" :
                topic.difficulty === "Intermediate" ? "bg-amber-500/10 text-amber-400" :
                "bg-rose-500/10 text-rose-400"
              }`}>
                {topic.difficulty}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                <FileText className="w-3.5 h-3.5" />
                {topic.estimatedTime}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => onToggleBookmark(topic.id)}
                className={`p-2 rounded-xl border transition-all ${isBookmarked ? "bg-indigo-500/20 border-indigo-500 text-indigo-400" : "bg-white/5 border-white/5 text-gray-400 hover:text-white"}`}
              >
                <Bookmark className={`w-5 h-5 ${isBookmarked ? "fill-current" : ""}`} />
              </button>
              <button 
                onClick={() => onMarkComplete(topic)}
                disabled={isCompleted}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  isCompleted 
                    ? "bg-emerald-500/20 text-emerald-400 cursor-default" 
                    : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 active:scale-95"
                }`}
              >
                {isCompleted ? <CheckCircle className="w-4 h-4" /> : null}
                {isCompleted ? "Completed" : "Mark Complete"}
              </button>
              <button 
                onClick={() => setActiveTab("ai")}
                className="px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                AI Tutor
              </button>
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
            {topic.title}
          </h1>
          <p className="text-xl text-gray-400 leading-relaxed max-w-2xl">
            {topic.summary}
          </p>
        </header>

        {/* TABS FOR TOPIC VIEW */}
        <div className="flex gap-1 border-b border-white/5 mb-8 overflow-x-auto no-scrollbar">
          {(["content", "practice", "quiz", "ai"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-6 text-sm font-semibold border-b-2 transition-all capitalize whitespace-nowrap ${
                activeTab === tab 
                  ? "border-indigo-500 text-white" 
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "content" && (
            <motion.div
              key="content-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-12"
            >
              {/* INTRODUCTION */}
              <section>
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <Info className="w-6 h-6 text-indigo-400" />
                  Introduction
                </h2>
                <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed space-y-4">
                  {topic.explanation.split('\n\n').map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </section>

              {/* PRO TIP SECTION */}
              {topic.tip && (
                <section className="bg-amber-500/5 border border-amber-500/10 rounded-3xl p-8 relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl" />
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    Pro Tip
                  </h2>
                  <div className="flex gap-4 group">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {topic.tip}
                    </p>
                  </div>
                </section>
              )}

              {/* TECHNICAL EXTRACTIONS */}
              {topic.extractions && topic.extractions.length > 0 && (
                <section className="bg-indigo-500/5 border border-indigo-500/10 rounded-3xl p-8 relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl" />
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                    Technical Extractions
                  </h2>
                  <div className="space-y-4">
                    {topic.extractions.map((point, i) => (
                      <div key={i} className="flex gap-4 group">
                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 group-hover:scale-150 transition-all duration-300 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                        <p className="text-gray-300 text-sm leading-relaxed group-hover:text-white transition-colors">
                          {point}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* DSA SPECIFIC: WHY & WHERE */}
              {(topic.whyExists || topic.whereUsed) && (
                <div className="grid md:grid-cols-2 gap-8">
                  {topic.whyExists && (
                    <section>
                      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <HelpCircle className="w-5 h-5 text-indigo-400" />
                        Why it exists?
                      </h2>
                      <p className="text-gray-300 text-sm leading-relaxed bg-white/5 p-5 rounded-2xl border border-white/5">
                        {topic.whyExists}
                      </p>
                    </section>
                  )}
                  {topic.whereUsed && (
                    <section>
                      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Layout className="w-5 h-5 text-emerald-400" />
                        Where is it used?
                      </h2>
                      <p className="text-gray-300 text-sm leading-relaxed bg-white/5 p-5 rounded-2xl border border-white/5">
                        {topic.whereUsed}
                      </p>
                    </section>
                  )}
                </div>
              )}

              {/* REAL WORLD APPLICATIONS */}
              {topic.realWorldApps && topic.realWorldApps.length > 0 && (
                <section>
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-400" />
                    Real-world Applications
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {topic.realWorldApps.map((app, i) => (
                      <div key={i} className="flex gap-3 p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
                        <CheckCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                        <p className="text-sm text-gray-300">{app}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* SYNTAX / DEFINITION */}
              <section className="bg-[#111625] border border-white/5 rounded-3xl p-6 md:p-8 overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-4">
                  <button 
                    onClick={() => handleCopy(topic.syntax)}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all"
                    title="Copy Syntax"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <h2 className="text-xl font-bold text-white mb-4">Syntax</h2>
                <div className="bg-[#090D1A] rounded-2xl p-6 overflow-x-auto font-mono text-sm text-indigo-300 leading-loose">
                  <pre>{topic.syntax}</pre>
                </div>
              </section>

              {/* DESCRIPTION & BEST PRACTICES */}
              <div className="grid md:grid-cols-2 gap-8">
                <section className="space-y-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-rose-400" />
                    Common Mistakes
                  </h2>
                  <div className="space-y-4">
                    {topic.mistakes.map((mistake, i) => (
                      <div key={i} className="flex gap-3 p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
                        <X className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                        <p className="text-sm text-gray-300">{mistake}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-amber-400" />
                    Best Practices
                  </h2>
                  <div className="space-y-4">
                    {topic.bestPractices.map((bp, i) => (
                      <div key={i} className="flex gap-3 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                        <Check className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-sm text-gray-300">{bp}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* DSA OPERATIONS & COMPLEXITY */}
              {(topic.operations || topic.complexityTable) && (
                <div className="space-y-12">
                  {topic.operations && (
                    <section>
                      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-indigo-400" />
                        Common Operations
                      </h2>
                      <div className="grid sm:grid-cols-2 gap-4">
                        {topic.operations.map((op, i) => (
                          <div key={i} className="p-5 bg-white/5 border border-white/5 rounded-2xl">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-bold text-indigo-400">{op.name}</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 bg-indigo-500/10 rounded text-indigo-300">{op.complexity}</span>
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed">{op.description}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {topic.complexityTable && (
                    <section>
                      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-emerald-400" />
                        Complexity Analysis
                      </h2>
                      <div className="overflow-hidden border border-white/5 rounded-2xl bg-white/5">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-white/5 border-b border-white/5">
                            <tr>
                              <th className="px-6 py-3 font-bold text-gray-300">Scenario</th>
                              <th className="px-6 py-3 font-bold text-gray-300 text-center">Time</th>
                              <th className="px-6 py-3 font-bold text-gray-300 text-center">Space</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {topic.complexityTable.map((row, i) => (
                              <tr key={i} className="hover:bg-white/5 transition-colors">
                                <td className="px-6 py-3 text-gray-400">{row.scenario}</td>
                                <td className="px-6 py-3 text-center"><code className="text-emerald-400">{row.time}</code></td>
                                <td className="px-6 py-3 text-center"><code className="text-amber-400">{row.space}</code></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )}
                </div>
              )}

              {/* DRY RUN */}
              {topic.dryRun && (
                <section>
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <History className="w-5 h-5 text-indigo-400" />
                    Dry Run Visualization
                  </h2>
                  <div className="p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl font-mono text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {topic.dryRun}
                  </div>
                </section>
              )}

              {/* INTERACTIVE PLAYGROUND (Try it) */}
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Terminal className="w-6 h-6 text-emerald-400" />
                    Interactive Playground
                  </h2>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setActiveCode(topic.codeExample)}
                      className="p-2 text-gray-500 hover:text-white transition-all"
                      title="Reset Code"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={handleRunCode}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Run Code
                    </button>
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-6 h-[400px]">
                  <div className="bg-[#111625] border border-white/10 rounded-3xl overflow-hidden flex flex-col">
                    <div className="px-4 py-2 bg-white/5 border-b border-white/5 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Main.js</span>
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500/20" />
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20" />
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20" />
                      </div>
                    </div>
                    <textarea
                      value={activeCode}
                      onChange={(e) => setActiveCode(e.target.value)}
                      spellCheck={false}
                      className="flex-1 w-full bg-transparent p-6 font-mono text-sm text-gray-300 focus:outline-none resize-none no-scrollbar leading-relaxed"
                    />
                  </div>

                  <div className="bg-[#0A0E1A] border border-white/10 rounded-3xl overflow-hidden flex flex-col">
                    <div className="px-4 py-2 bg-white/5 border-b border-white/5">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Console Output</span>
                    </div>
                    <div className="flex-1 p-6 font-mono text-sm space-y-2 overflow-y-auto no-scrollbar">
                      {output.length > 0 ? (
                        output.map((line, i) => (
                          <div key={i} className={`flex gap-3 ${line.startsWith('Error') ? 'text-rose-400' : 'text-emerald-400'}`}>
                            <span className="text-gray-600 shrink-0">{">"}</span>
                            <span>{line}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-600 italic">Run your code to see output here...</p>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* EXTERNAL RESOURCES */}
              <section className="bg-gradient-to-br from-indigo-600/10 to-violet-600/10 border border-indigo-500/20 rounded-3xl p-8 text-center">
                <h3 className="text-xl font-bold text-white mb-2">Want a deeper dive?</h3>
                <p className="text-gray-400 text-sm mb-6 max-w-lg mx-auto">
                  Explore the official MDN documentation for comprehensive details, specifications, and browser compatibility charts.
                </p>
                <a 
                  href={topic.mdnLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#111625] hover:bg-[#1A2135] text-white text-sm font-bold rounded-2xl border border-white/5 transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  Official Documentation
                </a>
              </section>

              {/* INTERVIEW PREP (DSA Specific) */}
              {(topic.exampleProblems || topic.companyQuestions || topic.interviewTips) && (
                <div className="space-y-12">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2 pt-10 border-t border-white/5">
                    <Trophy className="w-6 h-6 text-amber-400" />
                    Interview Preparation
                  </h2>

                  <div className="grid md:grid-cols-2 gap-8">
                    {topic.exampleProblems && (
                      <section>
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                          <Code className="w-5 h-5 text-indigo-400" />
                          Example Problems
                        </h3>
                        <div className="space-y-3">
                          {topic.exampleProblems.map((prob, i) => (
                            <div key={i} className="p-4 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between group cursor-pointer hover:border-indigo-500/30 transition-all">
                              <span className="text-sm text-gray-300 group-hover:text-white">{prob.title}</span>
                              <ExternalLink className="w-3.5 h-3.5 text-gray-500 group-hover:text-indigo-400" />
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {topic.companyQuestions && (
                      <section>
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                          <Building2 className="w-5 h-5 text-emerald-400" />
                          Recently Asked In
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {topic.companyQuestions.map((company, i) => (
                            <span key={i} className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg uppercase tracking-wider">
                              {company}
                            </span>
                          ))}
                        </div>
                      </section>
                    )}
                  </div>

                  {topic.interviewTips && (
                    <section className="p-8 bg-amber-500/5 border border-amber-500/10 rounded-3xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Lightbulb className="w-20 h-20 text-amber-400 rotate-12" />
                      </div>
                      <h3 className="text-lg font-bold text-amber-400 mb-4">Pro Interview Tips</h3>
                      <ul className="space-y-3 relative z-10">
                        {topic.interviewTips.map((tip, i) => (
                          <li key={i} className="flex gap-3 text-sm text-gray-300">
                            <span className="text-amber-500 font-bold">•</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "ai" && (
            <motion.div
              key="ai-tab"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              <div className="bg-[#111625] border border-white/5 rounded-3xl p-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">AI Learning Assistant</h2>
                    <p className="text-sm text-gray-400">Ask anything about {topic.title} or request practice problems.</p>
                  </div>
                </div>

                <div className="space-y-4 mb-8 max-h-[400px] overflow-y-auto no-scrollbar">
                  {aiResponse && (
                    <div className="p-6 bg-white/5 border border-white/5 rounded-2xl prose prose-invert max-w-none">
                      <p className="whitespace-pre-wrap text-gray-300 text-sm leading-relaxed">{aiResponse}</p>
                    </div>
                  )}
                  {aiLoading && (
                    <div className="flex items-center justify-center py-10">
                      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                <div className="relative">
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="E.g., 'Explain closures in simple terms' or 'Generate 3 intermediate exercises'..."
                    className="w-full bg-[#090D1A] border border-white/10 rounded-2xl p-4 pr-16 text-sm text-white focus:outline-none focus:border-indigo-500/50 min-h-[100px] resize-none"
                  />
                  <button 
                    onClick={() => handleAIRequest()}
                    disabled={aiLoading || !aiPrompt.trim()}
                    className="absolute right-4 bottom-4 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-4">
                  {[
                    "Explain again",
                    "Simplify this concept",
                    "Generate practice questions",
                    "Common interview questions",
                    "Debug my code"
                  ].map((hint) => (
                    <button
                      key={hint}
                      onClick={() => handleAIRequest(hint)}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-[10px] font-bold text-gray-400 hover:text-white rounded-lg border border-white/5 transition-all"
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "quiz" && (
            <motion.div
              key="quiz-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="bg-[#111625] border border-white/5 rounded-3xl p-8">
                <h2 className="text-2xl font-bold text-white mb-8">Checkpoint Challenge</h2>
                <div className="space-y-6">
                  <p className="text-lg text-gray-300 font-medium">
                    {topic.quiz.question}
                  </p>
                  
                  <div className="space-y-3">
                    {topic.quiz.options.map((option, idx) => {
                      const isCorrect = idx === topic.quiz.correct;
                      const isSelected = quizSelected === idx;
                      
                      let variant = "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10";
                      if (quizChecked) {
                        if (isCorrect) variant = "bg-emerald-500/20 border-emerald-500/50 text-emerald-400";
                        else if (isSelected) variant = "bg-rose-500/20 border-rose-500/50 text-rose-400";
                      } else if (isSelected) {
                        variant = "bg-indigo-500/20 border-indigo-500/50 text-indigo-400";
                      }

                      return (
                        <button
                          key={idx}
                          disabled={quizChecked}
                          onClick={() => setQuizSelected(idx)}
                          className={`w-full text-left p-5 rounded-2xl border text-sm font-medium transition-all ${variant}`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{option}</span>
                            {quizChecked && isCorrect && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                            {quizChecked && isSelected && !isCorrect && <X className="w-5 h-5 text-rose-400" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {quizChecked && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-6 rounded-2xl border ${quizSelected === topic.quiz.correct ? "bg-emerald-500/5 border-emerald-500/10" : "bg-rose-500/5 border-rose-500/10"}`}
                    >
                      <div className="flex items-start gap-3">
                        <Info className={`w-5 h-5 shrink-0 ${quizSelected === topic.quiz.correct ? "text-emerald-400" : "text-rose-400"}`} />
                        <div>
                          <p className={`font-bold text-sm mb-1 ${quizSelected === topic.quiz.correct ? "text-emerald-400" : "text-rose-400"}`}>
                            {quizSelected === topic.quiz.correct ? "Excellent!" : "Not quite right"}
                          </p>
                          <p className="text-sm text-gray-400 leading-relaxed">
                            {topic.quiz.explanation}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {!quizChecked ? (
                    <button
                      disabled={quizSelected === null}
                      onClick={() => setQuizChecked(true)}
                      className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                    >
                      Check Answer
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setQuizSelected(null);
                        setQuizChecked(false);
                      }}
                      className="w-full py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl border border-white/5 transition-all"
                    >
                      Try Again
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "practice" && (
            <motion.div
              key="practice-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-[#111625] border border-white/5 rounded-3xl p-8">
                  <h3 className="text-xl font-bold text-white mb-4">Level Up Exercises</h3>
                  <div className="space-y-4">
                    {[
                      { title: "Standard Implementation", diff: "Easy", xp: 20 },
                      { title: "Dynamic Logic Builder", diff: "Medium", xp: 50 },
                      { title: "Edge-Case Handling", diff: "Hard", xp: 100 }
                    ].map((ex, i) => (
                      <div key={i} className="group p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl flex items-center justify-between transition-all cursor-pointer">
                        <div>
                          <p className="text-sm font-bold text-white mb-1">{ex.title}</p>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold uppercase ${ex.diff === 'Easy' ? 'text-emerald-400' : ex.diff === 'Medium' ? 'text-amber-400' : 'text-rose-400'}`}>{ex.diff}</span>
                            <span className="w-1 h-1 rounded-full bg-gray-600" />
                            <span className="text-[10px] font-mono text-gray-500">+{ex.xp} XP</span>
                          </div>
                        </div>
                        <Play className="w-4 h-4 text-gray-500 group-hover:text-white transition-all" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#111625] border border-white/5 rounded-3xl p-8">
                  <h3 className="text-xl font-bold text-white mb-4">Personal Lab Notes</h3>
                  <textarea
                    value={note}
                    onChange={(e) => {
                      setNote(e.target.value);
                      onSaveNotes(topic.id, e.target.value);
                    }}
                    placeholder="Jot down your learnings or code snippets here..."
                    className="w-full bg-[#090D1A] border border-white/10 rounded-2xl p-4 text-sm text-gray-300 focus:outline-none focus:border-indigo-500/50 min-h-[200px] resize-none no-scrollbar"
                  />
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[10px] text-gray-500 italic">Saved automatically to your profile</span>
                    <MessageSquare className="w-4 h-4 text-gray-600" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* RELATED TOPICS */}
        <section className="mt-20 border-t border-white/5 pt-10">
          <h2 className="text-xl font-bold text-white mb-6">Suggested Next Steps</h2>
          <div className="grid sm:grid-cols-2 gap-4">
             <div className="p-4 bg-[#111625] border border-white/5 rounded-2xl flex items-center justify-between hover:border-indigo-500/20 transition-all cursor-pointer group">
               <div>
                 <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Next Topic</p>
                 <p className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">Hoisting in JavaScript</p>
               </div>
               <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-white transition-all" />
             </div>
             <div className="p-4 bg-[#111625] border border-white/5 rounded-2xl flex items-center justify-between hover:border-indigo-500/20 transition-all cursor-pointer group">
               <div>
                 <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Deeper Concept</p>
                 <p className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">Execution Context</p>
               </div>
               <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-white transition-all" />
             </div>
          </div>
        </section>
      </div>
    </div>
  );
}
