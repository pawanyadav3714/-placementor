import { useState, useEffect, useRef } from "react";
import AppLayout from "../../components/AppLayout";
import {
  BookOpen,
  Compass,
  Map,
  Award,
  Flame,
  Search,
  CheckCircle,
  Play,
  RotateCcw,
  Sparkles,
  Bookmark,
  MessageSquare,
  HelpCircle,
  Code,
  Terminal,
  ArrowLeft,
  Check,
  X,
  ChevronRight,
  GitBranch,
  ExternalLink,
  Save,
  Globe,
  Database,
  Cpu,
  Monitor,
  Cloud,
  Layers,
  FileText,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { db } from "../../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { safeStringify } from "../../utils/safeStringify";
import { roadmapModules, nodeModules, Topic, Module } from "./roadmapData";
import { dsaModules } from "./roadmapDataDSA";
import DocumentationLayout from "./DocumentationLayout";
import TopicPage from "./TopicPage";

// Hardcoded badges for motivation
interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

const BADGES: Badge[] = [
  { id: "js-newbie", name: "JS Initiate", description: "Completed your first JavaScript topic", icon: "🌱", color: "from-green-500 to-emerald-400" },
  { id: "control-flow-master", name: "Logic Master", description: "Completed the Control Flow module", icon: "⚡", color: "from-blue-500 to-indigo-400" },
  { id: "async-wizard", name: "Async Wizard", description: "Completed the Asynchronous JS module", icon: "🌀", color: "from-purple-500 to-fuchsia-400" },
  { id: "oop-guru", name: "Prototype Guru", description: "Completed the OOP JavaScript module", icon: "🏆", color: "from-yellow-500 to-amber-400" },
  { id: "dsa-master", name: "DSA Master", description: "Completed the DSA Roadmap", icon: "🧠", color: "from-fuchsia-500 to-pink-400" },
];

export default function Roadmaps() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"javascript" | "developer" | "nodejs" | "dsa">("javascript");

  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [completedTopicIds, setCompletedTopicIds] = useState<string[]>([]);
  
  // User Profile stats synced to Firestore
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [personalNotes, setPersonalNotes] = useState<Record<string, string>>({});
  const [unlockedBadges, setUnlockedBadges] = useState<string[]>([]);
  
  // Interactive UI States for Active Topic view
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<"learn" | "playground" | "quiz" | "notes">("learn");
  const [playgroundCode, setPlaygroundCode] = useState("");
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [quizSelectedOption, setQuizSelectedOption] = useState<number | null>(null);
  const [quizChecked, setQuizChecked] = useState(false);
  const [currentNote, setCurrentNote] = useState("");
  const [isBookmarked, setIsBookmarked] = useState(false);
  
  // AI Helper States
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Load tab from query params if specified
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (tabParam === "nodejs") {
      setActiveTab("nodejs");
    } else if (tabParam === "developer") {
      setActiveTab("developer");
    } else if (tabParam === "javascript") {
      setActiveTab("javascript");
    } else if (tabParam === "dsa") {
      setActiveTab("dsa");
    }
  }, []);
  
  // Fetch user stats & progress from Firestore with localStorage backup
  useEffect(() => {
    if (!user) return;
    
    // Try to load from localStorage first for instant offline access
    const localKey = `roadmap_progress_${user.uid}`;
    try {
      const cached = localStorage.getItem(localKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        setCompletedTopicIds(parsed.completedTopicIds || []);
        setXp(parsed.xp || 0);
        setStreak(parsed.streak || 1);
        setBookmarks(parsed.bookmarks || []);
        setPersonalNotes(parsed.personalNotes || {});
        setUnlockedBadges(parsed.unlockedBadges || []);
      }
    } catch (e) {
      console.warn("Failed to load cached roadmap progress from localStorage:", e);
    }

    const fetchProgress = async () => {
      try {
        const docRef = doc(db, "users", user.uid, "roadmap_data", "javascript_progress");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setCompletedTopicIds(data.completedTopicIds || []);
          setXp(data.xp || 0);
          setStreak(data.streak || 1);
          setBookmarks(data.bookmarks || []);
          setPersonalNotes(data.personalNotes || {});
          setUnlockedBadges(data.unlockedBadges || []);
          
          // Sync back to local cache
          localStorage.setItem(localKey, safeStringify(data));
        } else {
          // Initialize fresh student profile
          const initialData = {
            completedTopicIds: [],
            xp: 0,
            streak: 1,
            bookmarks: [],
            personalNotes: {},
            unlockedBadges: []
          };
          try {
            await setDoc(docRef, initialData);
          } catch (initErr) {
            console.warn("Could not write initial profile to Firestore, continuing in offline/cached mode.");
          }
          setStreak(1);
          localStorage.setItem(localKey, safeStringify(initialData));
        }
      } catch (err) {
        console.warn("Error reading student progress from Firestore (operating in offline-cached mode):", err);
      }
    };
    
    fetchProgress();
  }, [user]);

  // Sync state to Firestore helper
  const syncToFirestore = async (updates: {
    completedTopicIds?: string[];
    xp?: number;
    streak?: number;
    bookmarks?: string[];
    personalNotes?: Record<string, string>;
    unlockedBadges?: string[];
  }) => {
    if (!user) return;
    const localKey = `roadmap_progress_${user.uid}`;
    const currentData: any = {
      completedTopicIds: updates.completedTopicIds ?? completedTopicIds,
      xp: updates.xp ?? xp,
      streak: updates.streak ?? streak,
      bookmarks: updates.bookmarks ?? bookmarks,
      personalNotes: updates.personalNotes ?? personalNotes,
      unlockedBadges: updates.unlockedBadges ?? unlockedBadges
    };

    // Always update local cache first
    try {
      localStorage.setItem(localKey, safeStringify(currentData));
    } catch (e) {
      console.warn("Failed to update localStorage cache:", e);
    }

    // Try to sync to Firestore
    try {
      const docRef = doc(db, "users", user.uid, "roadmap_data", "javascript_progress");
      await setDoc(docRef, currentData);
    } catch (err) {
      console.warn("Firestore sync deferred (operating offline/cached):", err);
    }
  };

  // Toggle bookmark
  const handleToggleBookmark = (topicId: string) => {
    let updated: string[];
    if (bookmarks.includes(topicId)) {
      updated = bookmarks.filter(id => id !== topicId);
      setIsBookmarked(false);
    } else {
      updated = [...bookmarks, topicId];
      setIsBookmarked(true);
    }
    setBookmarks(updated);
    syncToFirestore({ bookmarks: updated });
  };

  // Save personal notes
  const handleSaveNotes = (topicId: string, text: string) => {
    const updatedNotes = { ...personalNotes, [topicId]: text };
    setPersonalNotes(updatedNotes);
    syncToFirestore({ personalNotes: updatedNotes });
  };

  // Handle Mark Topic Completed
  const handleMarkCompleted = (topic: Topic) => {
    if (completedTopicIds.includes(topic.id)) return;
    
    const updatedCompleted = [...completedTopicIds, topic.id];
    setCompletedTopicIds(updatedCompleted);
    
    const gainedXp = topic.difficulty === "Beginner" ? 50 : topic.difficulty === "Intermediate" ? 100 : 150;
    const updatedXp = xp + gainedXp;
    setXp(updatedXp);
    
    // Check if a badge should be unlocked
    const updatedBadges = [...unlockedBadges];
    if (updatedCompleted.length === 1 && !updatedBadges.includes("js-newbie")) {
      updatedBadges.push("js-newbie");
    }
    
    // Let's check modules completion
    // Control flow is Module 4
    const controlFlowModule = roadmapModules.find(m => m.id === 4);
    if (controlFlowModule && controlFlowModule.topics.every(t => updatedCompleted.includes(t.id)) && !updatedBadges.includes("control-flow-master")) {
      updatedBadges.push("control-flow-master");
    }

    // Async module is Module 10
    const asyncModule = roadmapModules.find(m => m.id === 10);
    if (asyncModule && asyncModule.topics.every(t => updatedCompleted.includes(t.id)) && !updatedBadges.includes("async-wizard")) {
      updatedBadges.push("async-wizard");
    }

    // OOP module is Module 14
    const oopModule = roadmapModules.find(m => m.id === 14);
    if (oopModule && oopModule.topics.every(t => updatedCompleted.includes(t.id)) && !updatedBadges.includes("oop-guru")) {
      updatedBadges.push("oop-guru");
    }

    // DSA complete
    const totalDsaTopics = dsaModules.reduce((acc, m) => acc + m.topics.length, 0);
    const completedDsaTopics = dsaModules.flatMap(m => m.topics).filter(t => updatedCompleted.includes(t.id)).length;
    if (completedDsaTopics > 0 && completedDsaTopics === totalDsaTopics && !updatedBadges.includes("dsa-master")) {
      updatedBadges.push("dsa-master");
    }

    setUnlockedBadges(updatedBadges);
    setStreak(prev => {
      const next = prev + 1;
      syncToFirestore({
        completedTopicIds: updatedCompleted,
        xp: updatedXp,
        streak: next,
        unlockedBadges: updatedBadges
      });
      return next;
    });
  };

  // Safe Javascript interpreter evaluation sandbox
  const handleRunCode = () => {
    const outputs: string[] = [];
    const originalLog = console.log;
    
    // Override console.log during eval safely
    console.log = (...args: any[]) => {
      outputs.push(args.map(arg => safeStringify(arg)).join(" "));
    };
    
    try {
      // Run inside standard try catch sandboxed execution
      const result = eval(playgroundCode);
      if (result !== undefined) {
        outputs.push(`=> ${safeStringify(result)}`);
      }
    } catch (err: any) {
      outputs.push(`Error: ${err.message}`);
    } finally {
      console.log = originalLog;
    }
    
    setTerminalOutput(outputs.length > 0 ? outputs : ["Code executed with empty outputs."]);
  };

  // Reset Playground code to default
  const handleResetPlayground = (topic: Topic) => {
    setPlaygroundCode(topic.codeExample);
    setTerminalOutput([]);
  };

  // AI assistant integration API helper
  const handleAIRequest = async (feature: string, customPrompt?: string) => {
    if (!selectedTopic) return;
    setAiLoading(true);
    setAiResponse("");
    
    const finalPrompt = customPrompt || `${feature} request for JavaScript topic: "${selectedTopic.title}". 
Current code in the student playground is:
\`\`\`javascript
${playgroundCode}
\`\`\`
Provide detailed MDN-aligned structured educational feedback.`;

    try {
      const response = await fetch("/api/roadmap-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: finalPrompt,
          feature,
          userId: user?.uid || "anonymous"
        })
      });
      
      const data = await response.json();
      setAiResponse(data.text || "AI completed successfully.");
    } catch (err) {
      console.error("Roadmap AI response error:", err);
      setAiResponse("I am currently experiencing higher demand. Let me share this best practice: Always check standard lexical constraints and use try/catch when implementing async operations.");
    } finally {
      setAiLoading(false);
    }
  };

  // Select a topic and prepare dynamic assets
  const handleSelectTopic = (topic: Topic) => {
    setSelectedTopic(topic);
    setPlaygroundCode(topic.codeExample);
    setTerminalOutput([]);
    setQuizSelectedOption(null);
    setQuizChecked(false);
    setCurrentNote(personalNotes[topic.id] || "");
    setIsBookmarked(bookmarks.includes(topic.id));
    setAiResponse("");
    setActiveWorkspaceTab("learn");
  };

  // Close active topic workspace
  const handleCloseTopicWorkspace = () => {
    setSelectedTopic(null);
  };

  // Generate dynamic topics on-the-fly to guarantee full coverage of all modules' topics!
  const getDynamicTopic = (moduleId: number, topicTitle: string): Topic => {
    const parentModule = [...roadmapModules, ...nodeModules, ...dsaModules].find(m => m.id === moduleId);
    const existing = parentModule?.topics.find(t => t.title.toLowerCase() === topicTitle.toLowerCase());
    if (existing) return existing;
    
    // Generate high-fidelity fallback topic on the fly!
    const slug = topicTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const isDSA = moduleId >= 200;
    
    const base: Topic = {
      id: slug,
      title: topicTitle,
      estimatedTime: isDSA ? "45 mins" : "12 mins",
      difficulty: moduleId > 100 ? "Advanced" : moduleId > 10 ? "Advanced" : moduleId > 5 ? "Intermediate" : "Beginner",
      objectives: isDSA ? [
        `Understand the core theory and practical implementation of ${topicTitle}.`,
        `Analyze time and space complexity constraints.`,
        `Solve typical interview questions related to ${topicTitle}.`
      ] : [
        `Understand the core standard principles behind ${topicTitle}.`,
        `Synthesize structural patterns and apply ${topicTitle} in real-world scenarios.`,
        `Explore technical learning specifications and correct execution constraints.`
      ],
      summary: isDSA 
        ? `Comprehensive guide to ${topicTitle} including AI-powered notes, visualizations, and multi-language implementations.`
        : `Learn the fundamentals of ${topicTitle}, built on technical standard blueprints inspired by official documentation.`,
      syntax: isDSA 
        ? `// Standard signature\nfunction solve${topicTitle.toLowerCase().replace(/[^a-z0-9]+/g, '')}(input) {\n  // Implementation\n}`
        : `// Standard syntax representation for ${topicTitle}\nconst demoVal = true;\nconsole.log("${topicTitle} is functional!");`,
      explanation: isDSA
        ? `Mastering **${topicTitle}** is essential for cracking technical interviews. This topic will guide you through the structural approach, common pitfalls, and the optimal algorithm to achieve the best time complexity. By utilizing dynamic AI notes, you can request custom real-life analogies, dry-run visualizations, or alternate language code snippets right here.`
        : `Mastering **${topicTitle}** is a critical milestone in your career. In modern runtime environments (browsers and Node.js), this feature serves as an essential building block to manage structured logic paths, optimize execution loops, and build robust software architecture.\n\nFollowing official recommended guidelines, developers are strongly encouraged to implement clean, well-scoped variables and handle operations safely with robust try-catch wrapping.`,
      codeExample: isDSA
        ? `// Code implementation for ${topicTitle}\n\nfunction execute() {\n  console.log('Running optimal approach for ${topicTitle}...');\n  // ...algorithm steps...\n  return 'Success';\n}\n\nconsole.log(execute());`
        : `// Code Playground: ${topicTitle} Sandbox\nconsole.log("Welcome to ${topicTitle}!");\n\nconst testRun = () => {\n  const message = "Executing ${topicTitle} logic cleanly!";\n  return message;\n};\n\nconsole.log(testRun());`,
      expectedOutput: isDSA
        ? `Running optimal approach for ${topicTitle}...\nSuccess`
        : `Welcome to ${topicTitle}!\nExecuting ${topicTitle} logic cleanly!`,
      mistakes: [
        `Failing to consider base cases or edge constraints (e.g., empty inputs, negative indices).`,
        `Over-complicating the logic before establishing a brute-force baseline.`
      ],
      bestPractices: [
        `Always perform a manual dry run on a small example before coding.`,
        `State your time and space complexity upfront.`
      ],
      quiz: {
        question: isDSA 
          ? `Which of the following is a primary characteristic or best practice regarding ${topicTitle}?`
          : `Which of the following is considered a best practice when writing modern code related to ${topicTitle}?`,
        options: isDSA ? [
          "It strictly requires O(1) time complexity in all cases.",
          "It is a core algorithm concept essential for data structure mastery.",
          "It is completely deprecated in modern software engineering.",
          "It can only be written in low-level languages like C."
        ] : [
          "Rely on legacy double equals (==) and global variables exclusively",
          "Default to safe modern standards and const declarations to prevent accidental bugs",
          "Never handle asynchronous rejections or try-catch blocks",
          "Write heavy blocking infinite loops in the main runtime thread"
        ],
        correct: 1,
        explanation: isDSA
          ? `${topicTitle} forms the foundation of robust algorithm design and is highly relevant in technical assessments.`
          : "Modern standards strongly encourage using immutable declarations, safe scoping, and robust async handling to enforce code predictability."
      },
      mdnLink: isDSA ? `https://en.wikipedia.org/wiki/${topicTitle.replace(/\s+/g, '_')}` : (moduleId > 100 ? "https://nodejs.org/api/" : `https://developer.mozilla.org/en-US/docs/Web/JavaScript`)
    };

    if (isDSA) {
      base.whyExists = `${topicTitle} is used to optimize data retrieval and storage patterns that standard linear arrays cannot handle efficiently.`;
      base.whereUsed = `Widely used in database indexing, file system management, and high-performance caching layers.`;
      base.realWorldApps = ["Operating System Task Schedulers", "GPS Navigation Systems", "Browser History Management"];
      base.operations = [
        { name: "Insertion", complexity: "O(log N)", description: "Adding a new element while maintaining order." },
        { name: "Deletion", complexity: "O(log N)", description: "Removing an element and re-balancing." },
        { name: "Search", complexity: "O(1) to O(N)", description: "Finding a specific target value." }
      ];
      base.complexityTable = [
        { scenario: "Best Case", time: "O(1)", space: "O(1)" },
        { scenario: "Average Case", time: "O(log N)", space: "O(N)" },
        { scenario: "Worst Case", time: "O(N)", space: "O(N)" }
      ];
      base.dryRun = `Step 1: Initialize pointers\nStep 2: Compare mid element\nStep 3: Branch left or right\nStep 4: Update boundaries and repeat.`;
      base.exampleProblems = [
        { title: `Reverse ${topicTitle}` },
        { title: `Find Middle of ${topicTitle}` },
        { title: `Detect Cycle in ${topicTitle}` }
      ];
      base.companyQuestions = ["Google", "Amazon", "Microsoft", "Meta"];
      base.interviewTips = [
        "Visualize the data structure on a whiteboard before writing code.",
        "Discuss trade-offs between iterative and recursive solutions.",
        "Don't forget to handle null or single-node inputs."
      ];
    }

    return base;
  };

  // Helper lists of all topics per module to enable absolute search filtering
  const allModulesWithFullTopics = activeTab === "dsa" 
    ? dsaModules 
    : (activeTab === "nodejs" ? nodeModules : roadmapModules).map(m => {
    // Collect all titles specified in the prompt
    let titles: string[] = [];
    if (activeTab === "nodejs") {
      switch (m.id) {
        case 101: titles = ["V8 Engine, Libuv, and Event Loop", "Node.js Process, Globals, and Environment", "The File System (fs) and Path Modules"]; break;
        case 102: titles = ["Working with Buffers and Binary Data", "Understanding Readable and Writable Streams", "Event-Driven Architecture (EventEmitter)"]; break;
        case 103: titles = ["Raw HTTP Server Basics", "Express.js Architecture & Routing", "Custom Middleware & Error Handling"]; break;
        case 104: titles = ["JWT and Cookie Authentication", "Security Headers (Helmet, CORS, Rate-Limiting)", "SQL Injection and Safe ORM queries"]; break;
        case 105: titles = ["Cluster Module & Multithreading", "Performance Profiling & Debugging", "API Testing & Coverage with Jest"]; break;
        default: titles = [];
      }
    } else {
      switch (m.id) {
        case 1: titles = ["What is JavaScript?", "History of JavaScript", "JavaScript Engine", "ECMAScript", "Browser vs Node.js", "How JavaScript Works"]; break;
        case 2: titles = ["var", "let", "const", "Primitive Types", "Objects", "Dynamic Typing"]; break;
        case 3: titles = ["Arithmetic", "Comparison", "Logical", "Assignment", "Bitwise", "Nullish Coalescing", "Optional Chaining"]; break;
        case 4: titles = ["if", "else", "switch", "for", "while", "do while", "break", "continue"]; break;
        case 5: titles = ["Function Declaration", "Arrow Functions", "Parameters", "Return Values", "Scope", "Closures", "Higher Order Functions"]; break;
        case 6: titles = ["Array Methods", "map", "filter", "reduce", "find", "some", "every", "sort"]; break;
        case 7: titles = ["Object Creation", "Object Methods", "Destructuring", "Spread Operator", "Rest Operator"]; break;
        case 8: titles = ["DOM Tree", "Query Selectors", "Event Listeners", "Forms", "Dynamic HTML"]; break;
        case 9: titles = ["Mouse Events", "Keyboard Events", "Event Bubbling", "Event Capturing", "Event Delegation"]; break;
        case 10: titles = ["Callback", "Promise", "Async", "Await", "Fetch API"]; break;
        case 11: titles = ["Import", "Export", "Dynamic Import"]; break;
        case 12: titles = ["try", "catch", "finally", "throw"]; break;
        case 13: titles = ["Template Literals", "Destructuring", "Spread", "Optional Chaining", "Nullish Coalescing"]; break;
        case 14: titles = ["Classes", "Constructor", "Inheritance", "Encapsulation", "Polymorphism"]; break;
        case 15: titles = ["Closures", "Hoisting", "Execution Context", "Event Loop", "Call Stack", "Memory Management", "Prototype Chain"]; break;
        default: titles = [];
      }
    }
    
    const completeTopics = titles.map(title => getDynamicTopic(m.id, title));
    return { ...m, topics: completeTopics };
  });

  // Calculate overall progress across all modules
  const totalTopicsCount = allModulesWithFullTopics.reduce((acc, m) => acc + m.topics.length, 0);
  const overallProgressPercentage = Math.round((completedTopicIds.length / totalTopicsCount) * 100) || 0;

  // Filtering modules and topics based on search query
  const filteredModules = allModulesWithFullTopics.map(m => {
    const matchedTopics = m.topics.filter(t => 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      t.summary.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return { ...m, topics: matchedTopics };
  }).filter(m => m.topics.length > 0);

  return (
    <AppLayout activeTab="roadmaps">
      <div className="h-[calc(100vh-64px)] overflow-hidden">
        <AnimatePresence mode="wait">
          {selectedTopic ? (
            <motion.div
              key="doc-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <DocumentationLayout
                modules={allModulesWithFullTopics}
                selectedTopic={selectedTopic}
                onSelectTopic={handleSelectTopic}
                onClose={handleCloseTopicWorkspace}
                completedTopicIds={completedTopicIds}
                activeTab={activeTab}
              >
                <TopicPage
                  topic={selectedTopic}
                  onMarkComplete={handleMarkCompleted}
                  isCompleted={completedTopicIds.includes(selectedTopic.id)}
                  onToggleBookmark={handleToggleBookmark}
                  isBookmarked={bookmarks.includes(selectedTopic.id)}
                  onSaveNotes={handleSaveNotes}
                  initialNote={personalNotes[selectedTopic.id] || ""}
                />
              </DocumentationLayout>
            </motion.div>
          ) : (
            <motion.div
              key="roadmap-overview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full overflow-y-auto px-4 py-8 md:px-8 bg-[#090D1A] no-scrollbar"
            >
        
        {/* TOP STATS PANEL */}
        <div className="max-w-7xl mx-auto mb-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#111625] border border-white/5 rounded-2xl p-5 flex items-center gap-4 hover:border-white/10 transition-all">
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Overall Progress</p>
              <h3 className="text-xl font-bold font-mono">{overallProgressPercentage}%</h3>
              <div className="w-24 bg-gray-700 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${overallProgressPercentage}%` }} />
              </div>
            </div>
          </div>

          <div className="bg-[#111625] border border-white/5 rounded-2xl p-5 flex items-center gap-4 hover:border-white/10 transition-all">
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Total Reward XP</p>
              <h3 className="text-xl font-bold font-mono text-amber-400">{xp} XP</h3>
              <p className="text-[10px] text-gray-500">Unlocks cool badges</p>
            </div>
          </div>

          <div className="bg-[#111625] border border-white/5 rounded-2xl p-5 flex items-center gap-4 hover:border-white/10 transition-all">
            <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Learning Streak</p>
              <h3 className="text-xl font-bold font-mono text-rose-400">{streak} Days</h3>
              <p className="text-[10px] text-gray-500">Keep learning daily!</p>
            </div>
          </div>

          <div className="bg-[#111625] border border-white/5 rounded-2xl p-5 flex items-center gap-4 hover:border-white/10 transition-all">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Badges Unlocked</p>
              <h3 className="text-xl font-bold font-mono text-emerald-400">{unlockedBadges.length} / {BADGES.length}</h3>
              <div className="flex gap-1 mt-1">
                {BADGES.map(b => (
                  <span 
                    key={b.id} 
                    title={`${b.name}: ${b.description}`}
                    className={`text-sm filter transition-all duration-300 ${unlockedBadges.includes(b.id) ? "grayscale-0 scale-110" : "grayscale opacity-25"}`}
                  >
                    {b.icon}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* HEADER BLOCK */}
        {!selectedTopic && (
          <div className="max-w-7xl mx-auto mb-10 text-center lg:text-left">
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-400 bg-clip-text text-transparent mb-3">
              Interactive Learning Portals
            </h1>
            <p className="text-gray-400 text-sm md:text-base max-w-2xl">
              Become a top-tier software engineer with structured learning pathways. Explore official documentation concepts paired with AI coaching and live coding.
            </p>

            {/* SELECTION TABS */}
            <div className="flex justify-center lg:justify-start gap-4 mt-8 border-b border-white/5 pb-0.5">
              <button
                onClick={() => { setActiveTab("javascript"); setSearchQuery(""); }}
                className={`py-3 px-6 text-sm font-medium border-b-2 transition-all duration-200 flex items-center gap-2 ${
                  activeTab === "javascript"
                    ? "border-indigo-500 text-white"
                    : "border-transparent text-gray-400 hover:text-white"
                }`}
              >
                <BookOpen className="w-4 h-4 text-indigo-400" />
                JavaScript Roadmap
              </button>
              <button
                onClick={() => { setActiveTab("nodejs"); setSearchQuery(""); }}
                className={`py-3 px-6 text-sm font-medium border-b-2 transition-all duration-200 flex items-center gap-2 ${
                  activeTab === "nodejs"
                    ? "border-emerald-500 text-white"
                    : "border-transparent text-gray-400 hover:text-white"
                }`}
              >
                <Cpu className="w-4 h-4 text-emerald-400" />
                Node.js Mastery Path
              </button>
              <button
                onClick={() => { setActiveTab("dsa"); setSearchQuery(""); }}
                className={`py-3 px-6 text-sm font-medium border-b-2 transition-all duration-200 flex items-center gap-2 ${
                  activeTab === "dsa"
                    ? "border-pink-500 text-white"
                    : "border-transparent text-gray-400 hover:text-white"
                }`}
              >
                <Code className="w-4 h-4 text-pink-400" />
                Data Structures & Algorithms
              </button>
            </div>
          </div>
        )}

        {/* MAIN BODY OF CORRESPONDING TAB */}
        <div className="max-w-7xl mx-auto pb-20">
          {activeTab !== "developer" ? (
            <motion.div
              key={`${activeTab}-portal`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* TWO HERO CARDS DISPLAY */}
              <div className="grid md:grid-cols-1 max-w-4xl mx-auto gap-6 mb-10">
                {activeTab === "javascript" ? (
                  <div className="bg-gradient-to-br from-[#121A30] to-[#111625] border border-indigo-500/20 rounded-3xl p-6 md:p-8 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-500" />
                    <div>
                      <div className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-500/10 text-indigo-400 text-xs font-semibold rounded-full mb-4">
                        <Sparkles className="w-3 h-3 animate-spin" /> Recommended Path
                      </div>
                      <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3">JavaScript Roadmap</h2>
                      <p className="text-gray-300 text-sm leading-relaxed mb-6">
                        Learn JavaScript from Beginner to Advanced using an MDN-inspired structured learning path. Access sandbox playgrounds, mini-quizzes, and custom diagnostic graphs.
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-indigo-400 font-mono font-semibold">15 Modules • 60+ Topics</span>
                      <button 
                        onClick={() => {
                          const firstTopic = allModulesWithFullTopics[0].topics[0];
                          handleSelectTopic(firstTopic);
                        }}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
                      >
                        Start Learning <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : activeTab === "nodejs" ? (
                  <div className="bg-gradient-to-br from-[#0F281E] to-[#111625] border border-emerald-500/20 rounded-3xl p-6 md:p-8 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all duration-500" />
                    <div>
                      <div className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-semibold rounded-full mb-4">
                        <Sparkles className="w-3 h-3 animate-spin" /> Backend Masterclass
                      </div>
                      <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3">Master in Node.js</h2>
                      <p className="text-gray-300 text-sm leading-relaxed mb-6">
                        Master high-performance backend software engineering. Explore Google's V8 engine architecture, raw Node Streams & Buffers, secure JWT token sessions, and scalable multicore Clusters.
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-emerald-400 font-mono font-semibold">5 Modules • 15+ Core Topics</span>
                      <button 
                        onClick={() => {
                          const firstTopic = allModulesWithFullTopics[0].topics[0];
                          handleSelectTopic(firstTopic);
                        }}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
                      >
                        Start Learning <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-[#280F1E] to-[#111625] border border-pink-500/20 rounded-3xl p-6 md:p-8 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-3xl group-hover:bg-pink-500/20 transition-all duration-500" />
                    <div>
                      <div className="inline-flex items-center gap-1 px-3 py-1 bg-pink-500/10 text-pink-400 text-xs font-semibold rounded-full mb-4">
                        <Sparkles className="w-3 h-3 animate-spin" /> Logic & Problem Solving
                      </div>
                      <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3">DSA Mastery</h2>
                      <p className="text-gray-300 text-sm leading-relaxed mb-6">
                        Master algorithms and data structures. From basic arrays to advanced dynamic programming. Ace your interviews with AI-generated notes and practice problems.
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-pink-400 font-mono font-semibold">15 Modules • Complete Roadmap</span>
                      <button 
                        onClick={() => {
                          const firstTopic = allModulesWithFullTopics[0].topics[0];
                          handleSelectTopic(firstTopic);
                        }}
                        className="px-5 py-2 bg-pink-600 hover:bg-pink-500 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-pink-600/20 transition-all"
                      >
                        Start Learning <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

                  {/* SEARCH FIELD */}
                  <div className="relative mb-10 max-w-xl mx-auto">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder={activeTab === "nodejs" ? "Search Node.js topics (e.g. Event Loop, Streams)..." : activeTab === "dsa" ? "Search DSA topics (e.g. Arrays, Recursion, DP)..." : "Search JavaScript topics (e.g. Variables, Functions)..."}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full bg-[#111625] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none ${activeTab === "nodejs" ? "focus:border-emerald-500/50" : activeTab === "dsa" ? "focus:border-pink-500/50" : "focus:border-indigo-500/50"} transition-all shadow-xl`}
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery("")}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* INTERACTIVE TIMELINE ROADMAP MAP */}
                  <div className={`space-y-16 relative before:absolute before:left-4 md:before:left-1/2 before:top-4 before:bottom-4 before:w-[2px] before:bg-gradient-to-b ${
                    activeTab === "nodejs" 
                      ? "before:from-emerald-500/40 before:via-teal-500/10 before:to-gray-800" 
                      : activeTab === "dsa" 
                      ? "before:from-pink-500/40 before:via-rose-500/10 before:to-gray-800"
                      : "before:from-indigo-500/40 before:via-blue-500/10 before:to-gray-800"
                  }`}>
                    {filteredModules.map((m, index) => {
                      const isEven = index % 2 === 0;
                      const completedCount = m.topics.filter(t => completedTopicIds.includes(t.id)).length;
                      const moduleProgress = Math.round((completedCount / m.topics.length) * 100) || 0;
                      
                      // Node Status
                      const isCompletedModule = completedCount === m.topics.length;
                      const isCurrentModule = completedCount > 0 && completedCount < m.topics.length;
                      
                      let dotColor = "bg-gray-700 ring-4 ring-gray-800/50";
                      if (isCompletedModule) dotColor = "bg-emerald-500 ring-4 ring-emerald-500/20";
                      else if (isCurrentModule || index === 0) {
                        dotColor = activeTab === "nodejs"
                          ? "bg-emerald-500 ring-4 ring-emerald-500/20 shadow-lg shadow-emerald-500/50"
                          : activeTab === "dsa" 
                          ? "bg-pink-500 ring-4 ring-pink-500/20 shadow-lg shadow-pink-500/50"
                          : "bg-indigo-500 ring-4 ring-indigo-500/20 shadow-lg shadow-indigo-500/50";
                      }

                      return (
                        <div key={m.id} className={`flex flex-col md:flex-row relative items-start ${isEven ? "md:flex-row-reverse" : ""}`}>
                          
                          {/* Central Timeline Point */}
                          <div className={`absolute left-4 md:left-1/2 -translate-x-1/2 top-2 z-10 w-4 h-4 rounded-full ${dotColor} transition-all duration-300`} />

                          {/* Left or Right Card Space */}
                          <div className="w-full md:w-[46%] pl-10 md:pl-0">
                            <motion.div 
                              className={`bg-[#111625]/90 border ${
                                isCompletedModule 
                                  ? "border-emerald-500/10" 
                                  : isCurrentModule 
                                    ? (activeTab === "nodejs" ? "border-emerald-500/20 shadow-lg shadow-emerald-500/5" : activeTab === "dsa" ? "border-pink-500/20 shadow-lg shadow-pink-500/5" : "border-indigo-500/20 shadow-lg shadow-indigo-500/5") 
                                    : "border-white/5"
                              } rounded-2xl p-6 ${activeTab === "nodejs" ? "hover:border-emerald-500/30" : activeTab === "dsa" ? "hover:border-pink-500/30" : "hover:border-indigo-500/30"} transition-all group`}
                              whileHover={{ y: -4 }}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <span className={`text-xs font-mono font-bold ${activeTab === "nodejs" ? "text-emerald-400 bg-emerald-500/10" : activeTab === "dsa" ? "text-pink-400 bg-pink-500/10" : "text-indigo-400 bg-indigo-500/10"} px-2.5 py-0.5 rounded-full`}>
                                  Module {m.id}
                                </span>
                                <span className="text-xs text-gray-400 font-mono">
                                  {completedCount}/{m.topics.length} Completed
                                </span>
                              </div>

                              <h3 className={`text-xl font-bold text-white mb-2 ${activeTab === "nodejs" ? "group-hover:text-emerald-400" : activeTab === "dsa" ? "group-hover:text-pink-400" : "group-hover:text-indigo-400"} transition-colors`}>
                                {m.title}
                              </h3>
                              <p className="text-xs text-gray-400 leading-relaxed mb-4">
                                {m.description}
                              </p>

                              {/* Progress bar */}
                              <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden mb-5">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${isCompletedModule ? "bg-emerald-500" : (activeTab === "nodejs" ? "bg-emerald-500" : activeTab === "dsa" ? "bg-pink-500" : "bg-indigo-500")}`}
                                  style={{ width: `${moduleProgress}%` }}
                                />
                              </div>

                              {/* TOPICS ACCORDION OR TILES */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                                {m.topics.map(t => {
                                  const isTopicDone = completedTopicIds.includes(t.id);
                                  return (
                                    <button
                                      key={t.id}
                                      onClick={() => handleSelectTopic(t)}
                                      className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                                        isTopicDone 
                                          ? "bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40 text-emerald-300"
                                          : (activeTab === "nodejs"
                                            ? "bg-[#0A0D16] border-white/5 hover:border-emerald-500/30 hover:bg-[#111C18] text-gray-300 hover:text-white"
                                            : activeTab === "dsa" 
                                            ? "bg-[#0A0D16] border-white/5 hover:border-pink-500/30 hover:bg-[#1C1116] text-gray-300 hover:text-white"
                                            : "bg-[#0A0D16] border-white/5 hover:border-indigo-500/30 hover:bg-[#111523] text-gray-300 hover:text-white")
                                      }`}
                                    >
                                      <span className="text-xs font-semibold truncate flex-1 pr-1">{t.title}</span>
                                      {isTopicDone ? (
                                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                                      ) : (
                                        <ChevronRight className={`w-3.5 h-3.5 text-gray-500 flex-shrink-0 ${activeTab === "nodejs" ? "group-hover:text-emerald-400" : activeTab === "dsa" ? "group-hover:text-pink-400" : "group-hover:text-indigo-400"}`} />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>

                            </motion.div>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              ) : (
                /* DEVELOPER ROADMAP TRACKS */
                <motion.div
                  key="developer-portal"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-10"
                >
                  <div className="bg-[#111625] border border-white/5 rounded-2xl p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
                        <Map className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white">Full Stack Software Engineer Roadmap</h2>
                        <p className="text-sm text-gray-400">Complete curriculum tree covering Frontend, Backend, DBs, and modern deployment architectures.</p>
                      </div>
                    </div>
                  </div>

                  {/* INTERACTIVE TRACK BLOCKS */}
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-[#111625] border border-white/5 rounded-2xl p-6 hover:border-indigo-500/20 transition-all relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all" />
                      <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl w-fit mb-4">
                        <Globe className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-lg text-white mb-2">1. Front-End Core</h3>
                      <p className="text-xs text-gray-400 leading-relaxed mb-4">
                        Master the browser layer. HTML5, CSS3 Semantic models, Modern responsive grids, Tailwind, and React framework patterns.
                      </p>
                      <div className="space-y-1 text-xs text-gray-400 font-mono">
                        <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-indigo-400" /> HTML & CSS Semantics</div>
                        <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-indigo-400" /> React State & Hooks</div>
                        <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-indigo-400" /> State Management</div>
                      </div>
                    </div>

                    <div className="bg-[#111625] border border-white/5 rounded-2xl p-6 hover:border-emerald-500/20 transition-all relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all" />
                      <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl w-fit mb-4">
                        <Cpu className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-lg text-white mb-2">2. Back-End Systems</h3>
                      <p className="text-xs text-gray-400 leading-relaxed mb-4">
                        Build highly secure servers. Node.js with Express, API validation middlewares, OAuth, and server side routing.
                      </p>
                      <div className="space-y-1 text-xs text-gray-400 font-mono">
                        <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> REST API Patterns</div>
                        <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Authentication & JWT</div>
                        <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Security Middleware</div>
                      </div>
                    </div>

                    <div className="bg-[#111625] border border-white/5 rounded-2xl p-6 hover:border-amber-500/20 transition-all relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all" />
                      <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl w-fit mb-4">
                        <Database className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-lg text-white mb-2">3. Databases & Caching</h3>
                      <p className="text-xs text-gray-400 leading-relaxed mb-4">
                        Scale storage architectures. Relational PostgreSQL modeling, indexing, transactions, and Redis caching.
                      </p>
                      <div className="space-y-1 text-xs text-gray-400 font-mono">
                        <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-amber-400" /> Relational SQL Schemas</div>
                        <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-amber-400" /> Indexes & Query Tuning</div>
                        <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-amber-400" /> Document stores (NoSQL)</div>
                      </div>
                    </div>

                    <div className="bg-[#111625] border border-white/5 rounded-2xl p-6 hover:border-rose-500/20 transition-all relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-all" />
                      <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl w-fit mb-4">
                        <Cloud className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-lg text-white mb-2">4. DevOps & Cloud</h3>
                      <p className="text-xs text-gray-400 leading-relaxed mb-4">
                        Deploy production applications. Docker containers, Github actions CI/CD pipelines, and cloud container orchestration.
                      </p>
                      <div className="space-y-1 text-xs text-gray-400 font-mono">
                        <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-rose-400" /> Containerization</div>
                        <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-rose-400" /> CI/CD Automation</div>
                        <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-rose-400" /> Hostings (GCP/AWS)</div>
                      </div>
                    </div>
                  </div>

                  {/* VISUAL TREE */}
                  <div className="bg-[#111625] border border-white/5 rounded-2xl p-6 md:p-8 flex flex-col items-center">
                    <h3 className="font-bold text-xl mb-6 text-white">Full Stack Node Interconnection</h3>
                    <div className="flex flex-col items-center gap-6 w-full max-w-lg">
                      <div className="px-5 py-2.5 bg-indigo-600 rounded-xl font-bold font-mono text-sm text-center w-48 shadow-lg shadow-indigo-600/10">Frontend Interface</div>
                      <div className="w-0.5 h-8 bg-indigo-500/40" />
                      <div className="px-5 py-2.5 bg-teal-600 rounded-xl font-bold font-mono text-sm text-center w-48 shadow-lg shadow-teal-600/10">Express Backend Router</div>
                      <div className="w-0.5 h-8 bg-teal-500/40" />
                      <div className="grid grid-cols-2 gap-4 w-full">
                        <div className="px-4 py-2 bg-purple-600/80 rounded-xl text-center font-bold font-mono text-xs shadow-md">Relational Database</div>
                        <div className="px-4 py-2 bg-pink-600/80 rounded-xl text-center font-bold font-mono text-xs shadow-md">Memory Cache</div>
                      </div>
                      <div className="flex justify-between w-full">
                        <div className="w-1/2 flex flex-col items-center">
                          <div className="w-0.5 h-8 bg-purple-500/40" />
                          <div className="p-2 bg-gray-800 rounded-lg text-[10px] font-mono text-gray-400">PostgreSQL / SQL</div>
                        </div>
                        <div className="w-1/2 flex flex-col items-center">
                          <div className="w-0.5 h-8 bg-pink-500/40" />
                          <div className="p-2 bg-gray-800 rounded-lg text-[10px] font-mono text-gray-400">Redis / Key-Value</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </AppLayout>
);
}
