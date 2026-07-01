import { useState, useEffect, useMemo, useRef } from "react";
import AppLayout from "../../components/AppLayout";
import Editor from "@monaco-editor/react";
import {
  Panel,
  Group as PanelGroup,
  Separator as PanelResizeHandle,
} from "react-resizable-panels";
import {
  Play,
  Check,
  CheckCircle2,
  Award,
  RefreshCw,
  Wand2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Shuffle,
  Maximize2,
  Minimize2,
  Settings,
  List,
  FileText,
  Code2,
  Beaker,
  MessageSquare,
  Clock,
  Tag,
  Lock,
  AlertCircle,
  TerminalSquare,
  Database,
  Zap,
  GripHorizontal,
  Mic,
  MicOff,
  X,
  ArrowLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { useAuth } from "../../contexts/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import { companiesList } from "./CompanyPrep";
import { db } from "../../lib/firebase";
import {
  doc,
  onSnapshot,
  collection,
  addDoc,
  query,
  orderBy,
  serverTimestamp,
  setDoc,
  getDoc,
} from "firebase/firestore";
import Markdown from "react-markdown";

const boilerplates: Record<string, string> = {
  python: `class Solution:
    def getConcatenation(self, nums: List[int]) -> List[int]:
        # type your code here #
        pass`,
  cpp: `#include <vector>
using namespace std;

class Solution {
public:
    vector<int> getConcatenation(vector<int>& nums) {
      // type your code here //
    }
};`,
  java: `class Solution {
    public int[] getConcatenation(int[] nums) {
      // type your code here //
    }
}`,
  javascript: `/**
 * @param {number[]} nums
 * @return {number[]}
 */
var getConcatenation = function(nums) {
    // type your code here //
};`,
  c: `#include <stdio.h>
#include <stdlib.h>

/**
 * Note: The returned array must be malloced, assume caller calls free().
 */
int* getConcatenation(int* nums, int numsSize, int* returnSize) {
    // type your code here //
}`,
};

interface DsaWorkspaceProps {
  initialQuestionIndex?: number | null;
  questionsList?: any[];
  onClose?: () => void;
  sourceName?: string;
}

export default function DsaWorkspace({ 
  initialQuestionIndex = null, 
  questionsList = null,
  onClose = null,
  sourceName = "DSA and Dev Practice Bank"
}: DsaWorkspaceProps) {
  const navigate = useNavigate();
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState<string>(boilerplates["python"]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [output, setOutput] = useState<any>(null);
  const [aiReview, setAiReview] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  const [aiSolutions, setAiSolutions] = useState<Record<number, string>>({});
  const [aiMetadata, setAiMetadata] = useState<
    Record<number, { provider: string; cached: boolean }>
  >({});
  const [isGeneratingSolution, setIsGeneratingSolution] = useState(false);
  const [aiSolutionMode, setAiSolutionMode] = useState("Intermediate Mode");
  const [activeTabLeft, setActiveTabLeft] = useState("description");
  const [activeTabRight, setActiveTabRight] = useState("result");
  const [isEditorExpanded, setIsEditorExpanded] = useState(false);
  const [questions, setQuestions] = useState<any[]>(questionsList || []);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(initialQuestionIndex || 0);
  
  // AI Voice Assistant State
  const [isRecording, setIsRecording] = useState(false);
  const [isAskingAi, setIsAskingAi] = useState(false);
  const [aiHelpResponse, setAiHelpResponse] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "ai"; content: string }[]>([]);
  const [userInput, setUserInput] = useState("");
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recog = new SpeechRecognition();
        recog.continuous = true;
        recog.interimResults = false;
        recog.lang = "en-US";

        recog.onresult = (event: any) => {
          const lastResultIndex = event.results.length - 1;
          const transcript = event.results[lastResultIndex][0].transcript;
          if (event.results[lastResultIndex].isFinal) {
            handleAskAi(transcript);
          }
        };

        recog.onsoundstart = () => {
          stopSpeaking(); // Barge-in: stop AI when user starts making sound
        };

        recog.onstart = () => {
          setIsRecording(true);
        };

        recog.onend = () => {
          setIsRecording(false);
        };

        setRecognition(recog);
      }
    }

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speakText = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    // Stop current speech
    window.speechSynthesis.cancel();
    setIsSpeaking(false);

    if (!text) return;

    // Clean markdown for better speech
    const cleanText = text
      .replace(/#+\s/g, "")
      .replace(/\*\*|\*/g, "")
      .replace(/```[\s\S]*?```/g, "Code block omitted.")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.9; // Slightly faster for clarity, but still clear
    utterance.pitch = 1.0; 
    
    // Superior AI Voice selection - Strictly Male and High Quality
    const voices = window.speechSynthesis.getVoices();
    
    // Check if text contains Hindi characters
    const hasHindi = /[\u0900-\u097F]/.test(text);
    
    let selectedVoice = null;

    if (hasHindi) {
      // Prioritize high-quality Hindi male voices
      selectedVoice = voices.find(v => 
        v.lang.startsWith("hi") && 
        (v.name.toLowerCase().includes("male") || v.name.toLowerCase().includes("david") || v.name.toLowerCase().includes("mark"))
      ) || voices.find(v => v.lang.startsWith("hi"));
    } else {
      // Prioritize high-quality English male voices (Neural, Natural, Premium)
      selectedVoice = voices.find(v => 
        (v.name.toLowerCase().includes("natural") || v.name.toLowerCase().includes("google") || v.name.toLowerCase().includes("premium") || v.name.toLowerCase().includes("neural")) &&
        (v.name.toLowerCase().includes("male") || v.name.toLowerCase().includes("david") || v.name.toLowerCase().includes("mark") || v.name.toLowerCase().includes("guy")) &&
        v.lang.startsWith("en")
      ) || voices.find(v => 
        (v.name.toLowerCase().includes("male") || v.name.toLowerCase().includes("david")) && 
        v.lang.startsWith("en")
      ) || voices[0];
    }
    
    if (selectedVoice) utterance.voice = selectedVoice;

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

  const handleAskAi = async (question: string) => {
    if (!question.trim()) return;
    
    setIsAskingAi(true);
    // Add student question to history
    const newHistory = [...chatHistory, { role: "user" as const, content: question }];
    setChatHistory(newHistory);
    setUserInput("");
    
    stopSpeaking();

    try {
      const res = await fetch("/api/problem-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemTitle: currentQuestion?.topic || "Challenge",
          problemText: currentQuestion?.text || "",
          studentCode: code,
          userQuestion: question,
          language: language,
          chatHistory: newHistory,
          idealSolution: currentQuestion?.solution || ""
        })
      });
      const data = await res.json();
      
      const aiMessage = { role: "ai" as const, content: data.answer };
      setChatHistory(prev => [...prev, aiMessage]);
      
      // Auto-speak the AI response
      speakText(data.answer);
    } catch (error) {
      console.error("AI Assistant error:", error);
      const errorMessage = "Sorry, I encountered an error. Please try again.";
      setChatHistory(prev => [...prev, { role: "ai" as const, content: errorMessage }]);
      speakText(errorMessage);
    } finally {
      setIsAskingAi(false);
    }
  };

  const handleResetChat = () => {
    setChatHistory([]);
    setAiHelpResponse(null);
    stopSpeaking();
  };

  const toggleRecording = () => {
    if (!recognition) {
      alert("Speech recognition is not supported in your browser. Please try using Chrome or Edge.");
      return;
    }
    if (isRecording) {
      recognition.stop();
    } else {
      stopSpeaking();
      setIsRecording(true);
      recognition.start();
    }
  };

  const handleEditorBeforeMount = (monaco: any) => {
    monaco.editor.defineTheme('blue-theme', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#1e293b', // Deep professional blue
        'editor.lineHighlightBackground': '#2d3748',
        'editorLineNumber.foreground': '#718096',
        'editorBracketMatch.background': '#4a5568',
        'editorBracketMatch.border': '#718096',
      }
    });
  };

  const [codeDrafts, setCodeDrafts] = useState<Record<string, string>>({});
  const [practiceQuestions, setPracticeQuestions] = useState<any[]>([]);

  const [testQuestionBanks, setTestQuestionBanks] = useState<{ name: string; questions: any[] }[]>([]);
  const [releasedTests, setReleasedTests] = useState<any[]>([]);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const location = useLocation();
  const passedQuestion = location.state?.question;

  const [activeBankName, setActiveBankName] = useState<string>(
    passedQuestion ? "Company Prep" : (questionsList ? sourceName : "Admin Bank")
  );

  const combinedTestBanks = useMemo(() => {
    const list: { name: string; questions: any[]; isTestPaper?: boolean }[] = [];

    if (questionsList) {
      list.push({
        name: sourceName,
        questions: questionsList
      });
    }

    // 1. All Admin Bank Questions (Manual, AI, Extracted, etc.)
    let allAdminQuestions: any[] = [];
    const seenAdminQs = new Set<string>();

    testQuestionBanks.forEach(bank => {
      bank.questions.forEach(q => {
        const text = (q.text || q.question || "").trim().toLowerCase();
        if (text && !seenAdminQs.has(text)) {
          seenAdminQs.add(text);
          allAdminQuestions.push(q);
        }
      });
    });

    if (allAdminQuestions.length > 0) {
      list.push({
        name: "All Admin Test Bank Qs",
        questions: allAdminQuestions
      });
      
      list.push({
        name: "All Test Exported Questions",
        questions: allAdminQuestions
      });

      // 2. All Text/Subjective Questions
      const allTextQs = allAdminQuestions.filter(q => q.type === "text" || q.type === "subjective");
      if (allTextQs.length > 0) {
        list.push({
          name: "All Text Questions",
          questions: allTextQs
        });
      }
    }

    // 3. All Assigned/Released Questions (Future or Past)
    let allReleasedQuestions: any[] = [];
    const seenReleasedQs = new Set<string>();

    releasedTests.forEach(test => {
      const qList = test.questions || [];
      qList.forEach((q: any) => {
        const text = (q.text || q.question || "").trim().toLowerCase();
        if (text && !seenReleasedQs.has(text)) {
          seenReleasedQs.add(text);
          allReleasedQuestions.push({
            ...q,
            title: q.title || q.question || "Untitled Question",
            question: q.question || q.text || q.title || ""
          });
        }
      });
    });

    if (allReleasedQuestions.length > 0) {
      list.push({
        name: "All Assigned Test Qs",
        questions: allReleasedQuestions
      });
    }

    // 4. Individual Test Papers
    releasedTests.forEach(test => {
      const qList = test.questions || [];
      if (qList.length > 0) {
        list.push({
          name: `Test: ${test.title}`,
          questions: qList.map((q: any) => ({
            ...q,
            title: q.title || q.question || "Untitled Question",
            question: q.question || q.text || q.title || ""
          })),
          isTestPaper: true
        });
      }
    });

    // 5. Individual Admin Banks
    testQuestionBanks.forEach(bank => {
      if (bank.name !== "All Test Questions" && bank.questions.length > 0) {
        list.push({
          name: bank.name,
          questions: bank.questions
        });
      }
    });

    if (passedQuestion) {
      list.push({
        name: "Company Prep",
        questions: [{
          ...passedQuestion,
          title: passedQuestion.title || passedQuestion.question || "Company Question",
          text: passedQuestion.question || passedQuestion.text || ""
        }]
      });
    }

    return list;
  }, [testQuestionBanks, releasedTests, passedQuestion]);

  // Synchronize questions state whenever active bank changes or lists update
  useEffect(() => {
    if (activeBankName === "Admin Bank") {
      setQuestions(practiceQuestions);
    } else if (activeBankName === sourceName && questionsList) {
      setQuestions(questionsList);
    } else {
      const activeBank = combinedTestBanks.find(b => b.name === activeBankName);
      if (activeBank) {
        setQuestions(activeBank.questions);
      }
    }
  }, [activeBankName, practiceQuestions, combinedTestBanks, questionsList, sourceName]);

  const handleSwitchBank = (bankName: string, bankQuestions: any[]) => {
    setActiveBankName(bankName);
    setQuestions(bankQuestions);
    setCurrentQuestionIndex(0);
    setOutput(null);
    setAiReview("");
    const nextKey = `0_${language}`;
    if (codeDrafts[nextKey] !== undefined) {
      setCode(codeDrafts[nextKey]);
    } else {
      setCode(boilerplates[language] || "");
    }
  };

  const handleSelectQuestion = (newIdx: number) => {
    if (newIdx < 0 || newIdx >= questions.length) return;
    
    // Save current draft
    const currentKey = `${currentQuestionIndex}_${language}`;
    const updatedDrafts = { ...codeDrafts, [currentKey]: code };
    setCodeDrafts(updatedDrafts);
    
    // Load next draft or fallback boilerplate
    const nextKey = `${newIdx}_${language}`;
    if (updatedDrafts[nextKey] !== undefined) {
      setCode(updatedDrafts[nextKey]);
    } else {
      setCode(boilerplates[language]);
    }
    
    setCurrentQuestionIndex(newIdx);
    setOutput(null);
    setAiReview("");
  };

  const handleSelectLanguage = (newLang: string) => {
    // Save current draft
    const currentKey = `${currentQuestionIndex}_${language}`;
    const updatedDrafts = { ...codeDrafts, [currentKey]: code };
    setCodeDrafts(updatedDrafts);
    
    // Load next draft or fallback boilerplate
    const nextKey = `${currentQuestionIndex}_${newLang}`;
    if (updatedDrafts[nextKey] !== undefined) {
      setCode(updatedDrafts[nextKey]);
    } else {
      setCode(boilerplates[newLang] || "");
    }
    
    setLanguage(newLang);
  };

  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, "users", user.uid, "submissions"),
      orderBy("createdAt", "desc"),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSubmissions(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      );
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const docRef = doc(db, "system", "question_banks");
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const dsaCoding = data["dsa coding"] || [];
        const leetcodeQuestions = data["leetcode questions"] || [];
        
        // Merge unique questions from both arrays by comparing question/text
        const merged = [...dsaCoding];
        leetcodeQuestions.forEach((q: any) => {
          const qText = (q.text || q.question || "").trim().toLowerCase();
          const exists = merged.some((cq: any) => 
            (cq.text || cq.question || "").trim().toLowerCase() === qText
          );
          if (!exists) {
            merged.push(q);
          }
        });

        // Parse Test Question Banks
        const keys = Object.keys(data);
        const testBanks: { name: string; questions: any[] }[] = [];
        
        // Practice keys are specifically for the Practice Coding Bank
        const practiceKeys = ["dsa coding", "leetcode questions"];
        
        // Everything else is considered part of the Test section's bank
        const testKeys = keys.filter(k => !practiceKeys.includes(k));
        
        let allTestQuestions: any[] = [];
        testKeys.forEach(key => {
          const list = data[key];
          if (Array.isArray(list)) {
            list.forEach(q => {
              allTestQuestions.push({
                ...q,
                title: q.title || q.question || "Untitled Question",
                question: q.question || q.text || q.title || ""
              });
            });
          }
        });
        
        if (allTestQuestions.length > 0) {
          testBanks.push({
            name: "All Test Questions",
            questions: allTestQuestions
          });
        }
        
        if (Array.isArray(data["manual"]) && data["manual"].length > 0) {
          testBanks.push({
            name: "Manual Test Questions",
            questions: data["manual"].map(q => ({
              ...q,
              title: q.title || q.question || "Untitled Question",
              question: q.question || q.text || q.title || ""
            }))
          });
        }
        
        if (Array.isArray(data["ai-generated"]) && data["ai-generated"].length > 0) {
          testBanks.push({
            name: "AI-Generated Test Questions",
            questions: data["ai-generated"].map(q => ({
              ...q,
              title: q.title || q.question || "Untitled Question",
              question: q.question || q.text || q.title || ""
            }))
          });
        }
        
        if (Array.isArray(data["extracted"]) && data["extracted"].length > 0) {
          testBanks.push({
            name: "Extracted PDF Questions",
            questions: data["extracted"].map(q => ({
              ...q,
              title: q.title || q.question || "Untitled Question",
              question: q.question || q.text || q.title || ""
            }))
          });
        }
        
        // Add other custom keys dynamically
        testKeys.forEach(key => {
          if (key !== "manual" && key !== "ai-generated" && key !== "extracted") {
            const list = data[key];
            if (Array.isArray(list) && list.length > 0) {
              testBanks.push({
                name: `${key.charAt(0).toUpperCase() + key.slice(1)} Bank`,
                questions: list.map(q => ({
                  ...q,
                  title: q.title || q.question || "Untitled Question",
                  question: q.question || q.text || q.title || ""
                }))
              });
            }
          }
        });

        setTestQuestionBanks(testBanks);

        if (merged.length > 0) {
          setPracticeQuestions(merged);
        }
      }
    });
    return () => unsubscribe();
  }, [activeBankName]);

  useEffect(() => {
    const qReleased = query(collection(db, "released_tests"));
    const unsubscribe = onSnapshot(qReleased, (snapshot) => {
      const tests: any[] = [];
      snapshot.forEach((doc) => {
        tests.push({ id: doc.id, ...doc.data() });
      });
      tests.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setReleasedTests(tests);
    });
    return () => unsubscribe();
  }, []);

  // Default fallback question so the playground always has code
  const currentQuestion =
    questions.length > 0
      ? questions[currentQuestionIndex]
      : {
          topic: "Concatenation of Array",
          text: "Given an integer array nums of length n, you want to create an array ans of length 2n where ans[i] == nums[i] and ans[i + n] == nums[i] for 0 <= i < n (0-indexed).\nSpecifically, ans is the concatenation of two nums arrays.\nReturn the array ans.",
          difficulty: "Easy",
          options: [],
        };

  // Submissions statistics and question states
  const activeQuestionsList = questions.length > 0 ? questions : [
    {
      topic: "Concatenation of Array",
      text: "Given an integer array nums of length n, you want to create an array ans of length 2n where ans[i] == nums[i] and ans[i + n] == nums[i] for 0 <= i < n (0-indexed).\nSpecifically, ans is the concatenation of two nums arrays.\nReturn the array ans.",
      difficulty: "Easy",
      options: [],
    }
  ];

  const questionStatuses = activeQuestionsList.map((q, idx) => {
    const qSubmissions = submissions.filter((sub: any) => 
      sub.questionIndex === idx || 
      (sub.questionTopic && q.topic && sub.questionTopic.trim().toLowerCase() === q.topic.trim().toLowerCase())
    );
    const isAttempted = qSubmissions.length > 0;
    const isSolved = qSubmissions.some((sub: any) => sub.status === "Accepted");
    return {
      question: q,
      index: idx,
      isAttempted,
      isSolved,
      submissionsCount: qSubmissions.length
    };
  });

  const totalQuestionsCount = activeQuestionsList.length;
  const solvedQuestionsCount = questionStatuses.filter(qs => qs.isSolved).length;
  const unsolvedQuestionsCount = totalQuestionsCount - solvedQuestionsCount;
  const attemptedQuestionsCount = questionStatuses.filter(qs => qs.isAttempted).length;

  const handleGenerateSolution = async (mode: string) => {
    if (!currentQuestion) return;

    setAiSolutionMode(mode);
    setIsGeneratingSolution(true);

    try {
      const res = await fetch("/api/generate-solution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemTitle: currentQuestion.topic || "Coding Challenge",
          problemText: currentQuestion.text || "No description provided.",
          mode: mode,
        }),
      });
      const data = await res.json();
      setAiSolutions((prev) => ({
        ...prev,
        [currentQuestionIndex]: data.solution,
      }));
      if (data.provider) {
        setAiMetadata((prev) => ({
          ...prev,
          [currentQuestionIndex]: {
            provider: data.provider,
            cached: data.cached,
          },
        }));
      }

      // Permanently save solution to database
      try {
        const docRef = doc(db, "system", "question_banks");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const dbData = docSnap.data();
          const dsaCoding = dbData["dsa coding"] || [];
          const leetcodeQuestions = dbData["leetcode questions"] || [];
          
          // Merge unique questions from both arrays by comparing question/text
          const merged = [...dsaCoding];
          leetcodeQuestions.forEach((q: any) => {
            const qText = (q.text || q.question || "").trim().toLowerCase();
            const exists = merged.some((cq: any) => 
              (cq.text || cq.question || "").trim().toLowerCase() === qText
            );
            if (!exists) {
              merged.push(q);
            }
          });

          const finalQuestions = merged.length > 0 ? merged : [...questions];
          if (finalQuestions[currentQuestionIndex]) {
            finalQuestions[currentQuestionIndex] = {
              ...finalQuestions[currentQuestionIndex],
              solution: data.solution,
            };
          }
          await setDoc(
            docRef,
            { 
              "dsa coding": finalQuestions.slice(0, 120),
              "leetcode questions": finalQuestions.slice(0, 120) 
            },
            { merge: true },
          );
        }
      } catch (err) {
        console.error("Failed to permanently save solution", err);
      }
    } catch (e) {
      console.error(e);
      setAiSolutions((prev) => ({
        ...prev,
        [currentQuestionIndex]: "Failed to generate solution.",
      }));
    } finally {
      setIsGeneratingSolution(false);
    }
  };

  const [isGeneratingTestCases, setIsGeneratingTestCases] = useState(false);

  const handleGenerateTestCases = async () => {
    if (!currentQuestion) return;
    setIsGeneratingTestCases(true);

    try {
      const res = await fetch("/api/generate-testcases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemTitle: currentQuestion.topic || "Coding Challenge",
          problemText: currentQuestion.text || "No description provided.",
        }),
      });
      const data = await res.json();

      try {
        const docRef = doc(db, "system", "question_banks");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const dbData = docSnap.data();
          const dsaCoding = dbData["dsa coding"] || [];
          const leetcodeQuestions = dbData["leetcode questions"] || [];
          
          // Merge unique questions from both arrays by comparing question/text
          const merged = [...dsaCoding];
          leetcodeQuestions.forEach((q: any) => {
            const qText = (q.text || q.question || "").trim().toLowerCase();
            const exists = merged.some((cq: any) => 
              (cq.text || cq.question || "").trim().toLowerCase() === qText
            );
            if (!exists) {
              merged.push(q);
            }
          });

          const finalQuestions = merged.length > 0 ? merged : [...questions];
          if (finalQuestions[currentQuestionIndex]) {
            finalQuestions[currentQuestionIndex] = {
              ...finalQuestions[currentQuestionIndex],
              testCases: data.testCases,
            };
          }
          await setDoc(
            docRef,
            { 
              "dsa coding": finalQuestions.slice(0, 120),
              "leetcode questions": finalQuestions.slice(0, 120) 
            },
            { merge: true },
          );
        }
      } catch (err) {
        console.error("Failed to permanently save test cases", err);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingTestCases(false);
    }
  };

  const handleSolutionTabClick = () => {
    setActiveTabLeft("solutions");
    if (aiSolutions[currentQuestionIndex]) return;
    handleGenerateSolution("Interview Mode");
  };

  const runCode = async () => {
    setIsExecuting(true);
    try {
      const sanitizedTestCases = Array.isArray(currentQuestion?.testCases)
        ? currentQuestion.testCases.map((tc: any) => ({
            input: tc.input || "",
            output: tc.output || "",
          }))
        : [];

      const res = await fetch("/api/execute-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          languageId: 71,
          sourceCode: btoa(code),
          problemTitle: currentQuestion?.topic || "Coding Challenge",
          problemText: currentQuestion?.text || "No description provided.",
          testCases: sanitizedTestCases,
        }),
      });
      const data = await res.json();
      setOutput(data);
      setActiveTabRight("result");
    } catch (e) {
      console.error(e);
      setOutput({ error: "Failed to execute code" });
      setActiveTabRight("result");
    } finally {
      setIsExecuting(false);
    }
  };

  const submitCode = async () => {
    if (!user) {
      alert("Please login to submit code");
      return;
    }

    // First run the code
    setIsExecuting(true);
    try {
      const sanitizedTestCases = Array.isArray(currentQuestion?.testCases)
        ? currentQuestion.testCases.map((tc: any) => ({
            input: tc.input || "",
            output: tc.output || "",
          }))
        : [];

      const res = await fetch("/api/execute-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          languageId: 71,
          sourceCode: btoa(code),
          problemTitle: currentQuestion?.topic || "Coding Challenge",
          problemText: currentQuestion?.text || "No description provided.",
          testCases: sanitizedTestCases,
        }),
      });
      const executedData = await res.json();
      setOutput(executedData);
      setActiveTabRight("result");

      const isSuccess = executedData.status?.id === 3;

      // Save submission to firestore
      await addDoc(collection(db, "users", user.uid, "submissions"), {
        questionIndex: currentQuestionIndex,
        questionTopic: currentQuestion ? currentQuestion.topic : "Array I",
        language,
        code,
        status: isSuccess ? "Accepted" : "Wrong Answer",
        runtime: executedData.time || "N/A",
        memory: executedData.memory ? `${executedData.memory} KB` : "N/A",
        createdAt: serverTimestamp(),
      });

      // Update Topic Mastery dynamically
      if (currentQuestion && currentQuestion.topic) {
        const topicName = currentQuestion.topic;
        const difficulty = currentQuestion.difficulty || "Easy";
        let weight = 1;
        if (difficulty.toLowerCase() === "medium") weight = 2;
        if (difficulty.toLowerCase() === "hard") weight = 3;

        let increase = isSuccess ? 5 * weight : 1 * weight;

        const userRef = doc(db, "users", user.uid);
        getDoc(userRef).then((docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            let currentMastery = 0;
            if (data.topicMastery && data.topicMastery[topicName]) {
              currentMastery = data.topicMastery[topicName];
            }
            currentMastery = Math.min(100, currentMastery + increase);
            setDoc(
              userRef,
              { topicMastery: { [topicName]: currentMastery } },
              { merge: true },
            );
          }
        });
      }

      setActiveTabLeft("submissions");
    } catch (e) {
      console.error(e);
      setOutput({ error: "Failed to execute code" });
      setActiveTabRight("result");
    } finally {
      setIsExecuting(false);
    }
  };

  const reviewCode = async () => {
    setIsReviewing(true);
    try {
      const res = await fetch("/api/review-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: language,
          problemTitle: currentQuestion
            ? currentQuestion.topic || currentQuestion.text.slice(0, 50)
            : "Concatenation of Array",
          studentCode: code,
          executionResult: output ? "Success" : "Not run",
        }),
      });
      const data = await res.json();
      setAiReview(data.review);
    } catch (e) {
      console.error(e);
    } finally {
      setIsReviewing(false);
    }
  };

  const WorkspaceContent = (
    <div className={clsx("flex flex-col w-full", onClose ? "h-[calc(100vh-140px)] bg-[#1e1e1e] rounded-2xl overflow-hidden border border-white/5" : "h-screen")}>
      {/* Top Navbar inside Workspace */}
      <div className="flex items-center justify-between bg-[#262626] border-b border-[#3e3e42] px-4 py-2 mb-4 rounded-xl">
        <div className="flex items-center gap-4 text-[#bfbfbf]">
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-[#3e3e42] rounded-lg transition-colors cursor-pointer text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="relative">
            <button
              onClick={() => setIsSelectorOpen(!isSelectorOpen)}
              className="flex items-center gap-2 hover:bg-[#3e3e42] px-3 py-1.5 rounded-lg cursor-pointer transition-colors text-sm font-medium text-white bg-[#1e1e1e] border border-[#3e3e42] shadow-sm"
            >
              <List className="w-4 h-4 text-indigo-400" />
              <span>{activeBankName}</span>
              <ChevronDown className={clsx("w-3.5 h-3.5 text-gray-400 transition-transform duration-200", isSelectorOpen && "rotate-180")} />
            </button>

            {isSelectorOpen && (
              <>
                {/* Backdrop overlay */}
                <div 
                  className="fixed inset-0 z-40 cursor-default" 
                  onClick={() => setIsSelectorOpen(false)}
                />
                
                {/* Dropdown Menu container */}
                <div className="absolute left-0 mt-2 w-80 bg-[#1e1e1e] border border-[#3e3e42] rounded-xl shadow-2xl p-4 z-50 space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-2 border-b border-[#2d2d30]">
                    Select Question Bank
                  </div>
                  
                  {/* Practice Section */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wide px-1 block">
                      Practice Bank
                    </span>
                    <button
                      onClick={() => {
                        handleSwitchBank("Admin Bank", practiceQuestions);
                        setIsSelectorOpen(false);
                      }}
                      className={clsx(
                        "w-full text-left flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer",
                        activeBankName === "Admin Bank"
                          ? "bg-indigo-600/10 text-indigo-300 border border-indigo-500/20"
                          : "bg-transparent text-gray-400 hover:bg-[#2d2d30] hover:text-white border border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Database className="w-3.5 h-3.5" />
                        <span>DSA and Dev Practice Bank</span>
                      </div>
                      <span className="text-[10px] text-indigo-400 font-bold bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">
                        {practiceQuestions.length} Qs
                      </span>
                    </button>
                  </div>

                  {/* Tests Section */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide px-1 block">
                      Test Question Bank (Admin)
                    </span>
                    <div className="max-h-52 overflow-y-auto pr-1 space-y-1">
                      {combinedTestBanks.length > 0 ? (
                        combinedTestBanks.map((bank, idx) => {
                          const isSelected = activeBankName === bank.name;
                          return (
                            <button
                              key={idx}
                              onClick={() => {
                                handleSwitchBank(bank.name, bank.questions);
                                setIsSelectorOpen(false);
                              }}
                              className={clsx(
                                "w-full text-left flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer",
                                isSelected
                                  ? "bg-emerald-600/10 text-emerald-300 border border-emerald-500/20"
                                  : "bg-transparent text-gray-400 hover:bg-[#2d2d30] hover:text-white border border-transparent"
                              )}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <FileText className="w-3.5 h-3.5 flex-shrink-0 text-emerald-400" />
                                <span className="truncate">{bank.name}</span>
                              </div>
                              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10 flex-shrink-0">
                                {bank.questions.length} Qs
                              </span>
                            </button>
                          );
                        })
                      ) : (
                        <div className="text-center py-4 text-gray-500 text-xs">
                          No test questions found in admin bank.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Companies Section */}
                  <div className="space-y-1.5 mt-4">
                    <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wide px-1 block">
                      Company Prep
                    </span>
                    <div className="max-h-52 overflow-y-auto pr-1 space-y-1">
                      {companiesList.map((comp, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setIsSelectorOpen(false);
                            navigate(`/companies/${comp.name}`);
                          }}
                          className="w-full text-left flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer bg-transparent text-gray-400 hover:bg-[#2d2d30] hover:text-white border border-transparent"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <img src={comp.logo} alt={comp.name} className="w-4 h-4 object-contain rounded" />
                            <span className="truncate">{comp.name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={runCode}
            disabled={isExecuting}
            className="bg-[#3e3e42] hover:bg-[#4e4e52] text-[#bfbfbf] px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 text-emerald-500 fill-emerald-500" /> Run
          </button>
          <button
            onClick={submitCode}
            disabled={isExecuting}
            className="bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600/30 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4" /> Submit
          </button>
        </div>
      </div>

      <PanelGroup
        orientation="horizontal"
        className="flex flex-col lg:flex-row h-[calc(100vh-10rem)]"
      >
        {/* Left Panel: Problem Description */}
        <Panel
          defaultSize={45}
          minSize={20}
          className="w-full bg-[#282828] border border-[#3e3e42] rounded-xl flex flex-col overflow-hidden"
        >
          {/* Tabs */}
          <div className="flex items-center gap-6 px-4 py-2 bg-[#282828] border-b border-[#3e3e42] text-xs font-medium">
            <button
              id="tab-btn-description"
              onClick={() => setActiveTabLeft("description")}
              className={`flex items-center gap-2 py-2 cursor-pointer ${activeTabLeft === "description" ? "text-white border-b-2 border-white" : "text-[#8c8c8c] hover:text-[#bfbfbf]"}`}
            >
              <FileText className="w-4 h-4" /> Description
            </button>
            <button
              id="tab-btn-solutions"
              onClick={handleSolutionTabClick}
              className={`flex items-center gap-2 py-2 cursor-pointer ${activeTabLeft === "solutions" ? "text-white border-b-2 border-white" : "text-[#8c8c8c] hover:text-[#bfbfbf]"}`}
            >
              <Beaker className="w-4 h-4" /> Solutions
            </button>
            <button
              id="tab-btn-submissions"
              onClick={() => setActiveTabLeft("submissions")}
              className={`flex items-center gap-2 py-2 cursor-pointer ${activeTabLeft === "submissions" ? "text-white border-b-2 border-white" : "text-[#8c8c8c] hover:text-[#bfbfbf]"}`}
            >
              <Clock className="w-4 h-4" /> Submissions
            </button>

            {/* Questions Selector and Navigation on the right */}
            {questions.length > 0 && (
              <div id="dsa-question-navigator-container" className="ml-auto flex items-center gap-2">

                <button
                  id="btn-prev-question"
                  onClick={() => handleSelectQuestion(currentQuestionIndex - 1)}
                  disabled={currentQuestionIndex === 0}
                  className="p-1 rounded hover:bg-[#3e3e42] disabled:opacity-30 disabled:hover:bg-transparent text-[#bfbfbf] hover:text-white transition-colors cursor-pointer"
                  title="Previous Question"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div id="select-question-wrapper" className="relative flex items-center bg-[#1e1e1e] border border-[#3e3e42] hover:border-indigo-500/50 rounded px-2 py-0.5 text-white transition-all cursor-pointer gap-2 max-w-[150px] sm:max-w-[200px] md:max-w-[250px]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRecording();
                    }}
                    className={clsx(
                      "p-1 rounded-full transition-all flex items-center justify-center shrink-0",
                      isRecording 
                        ? "bg-red-500/10 text-red-500 animate-pulse" 
                          : isSpeaking
                            ? "bg-emerald-500/10 text-emerald-400"
                            : isAskingAi
                              ? "bg-indigo-500/10 text-indigo-400 animate-bounce"
                              : "text-[#8c8c8c] hover:text-white"
                    )}
                    title="Voice AI Interviewer"
                  >
                    <Mic className={clsx("w-3 h-3", isRecording && "text-red-500")} />
                  </button>
                  <div className="w-[1px] h-3 bg-[#3e3e42]" />
                  <select
                    id="select-question-dropdown"
                    value={currentQuestionIndex}
                    onChange={(e) => handleSelectQuestion(parseInt(e.target.value))}
                    className="bg-transparent text-white text-[10px] pr-6 focus:outline-none cursor-pointer appearance-none font-medium w-full"
                  >
                    {questions.map((q, idx) => (
                      <option key={idx} value={idx} className="bg-[#1e1e1e] text-white">
                        Q{idx + 1}: {q.company ? `[${q.company}] ` : ''}{q.topic || q.text?.slice(0, 30) || `Question ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-1.5 pointer-events-none" />
                </div>

                <button
                  id="btn-next-question"
                  onClick={() => handleSelectQuestion(currentQuestionIndex + 1)}
                  disabled={currentQuestionIndex === questions.length - 1}
                  className="p-1 rounded hover:bg-[#3e3e42] disabled:opacity-30 disabled:hover:bg-transparent text-[#bfbfbf] hover:text-white transition-colors cursor-pointer"
                  title="Next Question"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6 text-[#bfbfbf] relative">
            {activeTabLeft === "description" && (
              <>
                {currentQuestion ? (
                  <>
                    <h2 className="text-2xl font-bold mb-4 text-white">
                      Q{currentQuestionIndex + 1}.{" "}
                      {currentQuestion.topic || "DSA Challenge"}
                    </h2>
                    <div className="flex flex-wrap gap-2 mb-6">
                      <span className="bg-[#2cbb5d]/10 text-[#2cbb5d] px-2.5 py-1 rounded-full text-xs font-medium">
                        {currentQuestion.difficulty || "Medium"}
                      </span>
                      <span className="bg-[#3e3e42] text-[#bfbfbf] px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                        <Tag className="w-3 h-3" />{" "}
                        {currentQuestion.topic || "Coding"}
                      </span>
                      <span className="bg-[#3e3e42] text-[#eab308] px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Companies
                      </span>
                    </div>
                    <div className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed mb-8">
                      <p className="whitespace-pre-wrap">
                        {currentQuestion.text}
                      </p>

                      {currentQuestion.options &&
                        currentQuestion.options.length > 0 && (
                          <ul className="list-disc list-inside mt-4">
                            {currentQuestion.options.map(
                              (opt: string, i: number) => (
                                <li key={i}>{opt}</li>
                              ),
                            )}
                          </ul>
                        )}

                      <div className="mt-8 bg-[#1e1e1e] p-4 rounded-xl border border-indigo-500/20 relative">
                        <div className="absolute -top-3 left-4 bg-[#282828] px-2 text-xs font-bold text-indigo-400 flex items-center gap-1">
                          <Wand2 className="w-3 h-3" /> AI Generated Test Cases
                        </div>
                        <div className="space-y-4 pt-2">
                          {currentQuestion.testCases &&
                          currentQuestion.testCases.length > 0 ? (
                            currentQuestion.testCases.map(
                              (tc: any, i: number) => (
                                <div key={i} className="text-xs">
                                  <div className="font-bold text-[#8c8c8c] mb-1">
                                    Test Case {i + 1}:
                                  </div>
                                  <div className="bg-[#2d2d2d] p-2 rounded text-[#bfbfbf] font-mono">
                                    <div>
                                      <span className="text-indigo-400">
                                        Input:
                                      </span>{" "}
                                      {tc.input}
                                    </div>
                                    <div>
                                      <span className="text-emerald-400">
                                        Output:
                                      </span>{" "}
                                      {tc.output}
                                    </div>
                                  </div>
                                </div>
                              ),
                            )
                          ) : (
                            <>
                              {/* Default fallback test cases if none exist on the question */}
                              <div className="flex flex-col items-center justify-center p-6 text-center text-sm text-[#8c8c8c]">
                                <p className="mb-4">
                                  No test cases generated for this problem yet.
                                </p>
                                <button
                                  onClick={handleGenerateTestCases}
                                  disabled={isGeneratingTestCases}
                                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                                >
                                  {isGeneratingTestCases ? (
                                    <>
                                      <RefreshCw className="w-4 h-4 animate-spin" />{" "}
                                      Generating...
                                    </>
                                  ) : (
                                    <>
                                      <Wand2 className="w-4 h-4" /> Generate AI
                                      Test Cases
                                    </>
                                  )}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center p-12 text-[#8c8c8c]">
                    <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
                    <p>No questions have been assigned by the Admin yet.</p>
                    <p className="text-sm mt-2">
                      Please ask the administrator to upload DSA questions.
                    </p>
                  </div>
                )}
              </>
            )}

            {activeTabLeft === "solutions" && (
              <div className="space-y-6">
                {currentQuestion ? (
                  <div className="space-y-6">
                    {/* Header with Language Selector & Regenerate AI Button */}
                    <div className="bg-[#282828]/50 px-4 py-3 rounded-xl border border-[#3e3e42] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
                      <div className="flex items-center gap-2 text-white font-medium">
                        <Beaker className="w-4 h-4 text-indigo-400" />
                        <span>Solutions Hub</span>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <select
                          value={language}
                          onChange={(e) => handleSelectLanguage(e.target.value)}
                          className="bg-[#1e1e1e] text-[#bfbfbf] border border-[#3e3e42] rounded-md py-1.5 px-3 text-xs focus:outline-none cursor-pointer w-full sm:w-auto"
                        >
                          <option value="python">Python</option>
                          <option value="javascript">JavaScript</option>
                          <option value="java">Java</option>
                          <option value="cpp">C++</option>
                          <option value="c">C</option>
                        </select>
                        <button
                          onClick={() => handleGenerateSolution("Interview Mode")}
                          disabled={isGeneratingSolution}
                          className="flex items-center gap-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white px-3 py-1.5 rounded-md border border-indigo-500/20 transition-all cursor-pointer disabled:opacity-50 text-xs w-full sm:w-auto justify-center"
                        >
                          <RefreshCw className={clsx("w-3.5 h-3.5", isGeneratingSolution && "animate-spin")} />
                          <span>Regenerate AI</span>
                        </button>
                      </div>
                    </div>

                    {/* TWO SOLUTIONS VISIBLE */}
                    <div className="grid grid-cols-1 gap-6">
                      {/* CARD 1: Actual/Ideal Reference Solution (Attached to Question) */}
                      <div className="bg-[#1e1e1e] border border-[#3e3e42] rounded-xl p-5 space-y-4">
                        <div className="flex items-center justify-between border-b border-[#3e3e42] pb-3">
                          <div className="flex items-center gap-2 text-emerald-400">
                            <CheckCircle2 className="w-5 h-5" />
                            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                              Actual / Ideal Solution
                            </h3>
                          </div>
                          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold uppercase">
                            Question Reference
                          </span>
                        </div>

                        <div className="prose prose-invert prose-sm max-w-none text-sm leading-relaxed">
                          {currentQuestion.solution ? (
                            <Markdown>{currentQuestion.solution}</Markdown>
                          ) : (
                            <div className="text-center py-8 text-[#8c8c8c] bg-[#2d2d30]/30 rounded-lg border border-[#3e3e42]/50">
                              <AlertCircle className="w-8 h-8 mb-2 mx-auto opacity-30 text-[#8c8c8c]" />
                              <p className="text-xs font-medium text-gray-400">No reference solution attached to this question yet.</p>
                              <p className="text-[11px] text-gray-500 mt-1">Check the AI generated solution below!</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* CARD 2: AI Generated Solution & Explanation */}
                      <div className="bg-[#1e1e1e] border border-[#3e3e42] rounded-xl p-5 space-y-4">
                        <div className="flex items-center justify-between border-b border-[#3e3e42] pb-3">
                          <div className="flex items-center gap-2 text-indigo-400">
                            <Wand2 className="w-5 h-5" />
                            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                              AI Solution & Explanation
                            </h3>
                          </div>
                          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded text-[10px] text-indigo-300 font-bold tracking-wide uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            Gemini AI
                          </div>
                        </div>

                        {isGeneratingSolution ? (
                          <div className="text-[#8c8c8c] flex flex-col items-center justify-center py-12 gap-3 bg-[#2d2d30]/10 rounded-lg border border-[#3e3e42]/50">
                            <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                            <span className="text-xs">Generating detailed AI solution and walkthrough...</span>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {aiMetadata[currentQuestionIndex] && (
                              <div className="flex items-center gap-2 text-xs text-[#8c8c8c]">
                                <span className="flex items-center gap-1 bg-[#2d2d30] px-2 py-0.5 rounded border border-[#3e3e42]">
                                  {aiMetadata[currentQuestionIndex].cached ? (
                                    <Database className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Zap className="w-3 h-3 text-amber-400" />
                                  )}
                                  {aiMetadata[currentQuestionIndex].cached
                                    ? "Cached Response"
                                    : "Live Generated"}
                                </span>
                                <span className="bg-[#2d2d30] px-2 py-0.5 rounded border border-[#3e3e42]">
                                  Model: {aiMetadata[currentQuestionIndex].provider}
                                </span>
                              </div>
                            )}
                            <div className="prose prose-invert prose-sm max-w-none text-sm leading-relaxed font-sans">
                              {aiSolutions[currentQuestionIndex] ? (
                                <Markdown>{aiSolutions[currentQuestionIndex]}</Markdown>
                              ) : (
                                <div className="text-center py-8 text-[#8c8c8c] bg-[#2d2d30]/30 rounded-lg border border-[#3e3e42]/50 flex flex-col items-center justify-center">
                                  <Wand2 className="w-8 h-8 mb-2 opacity-30 text-indigo-400 animate-pulse" />
                                  <p className="text-xs font-medium text-gray-400">AI solution not generated yet.</p>
                                  <button
                                    onClick={() => handleGenerateSolution("Interview Mode")}
                                    className="mt-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] px-3 py-1.5 rounded-md shadow-lg transition-colors cursor-pointer"
                                  >
                                    Generate AI Solution
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-12 text-[#8c8c8c]">
                    <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
                    <p>
                      No solutions available because no question has been
                      assigned.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTabLeft === "submissions" && (
              <div className="space-y-5">
                {/* Solved / Unsolved summary panel */}
                <div className="bg-[#1e1e1e] border border-[#3e3e42] rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#3e3e42] pb-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8c8c8c] flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-indigo-400" />
                      Performance Dashboard
                    </h3>
                    <span className="text-[10px] text-[#8c8c8c] bg-[#2d2d30] px-2 py-0.5 rounded-full font-mono">
                      {totalQuestionsCount} Total Questions
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Solved Card */}
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-emerald-400">Solved</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-2xl font-bold text-white font-mono">{solvedQuestionsCount}</span>
                        <span className="text-xs text-[#8c8c8c]">/ {totalQuestionsCount}</span>
                      </div>
                    </div>

                    {/* Unsolved Card */}
                    <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-3 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-orange-400">Unsolved</span>
                        <Clock className="w-3.5 h-3.5 text-orange-400" />
                      </div>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-2xl font-bold text-white font-mono">{unsolvedQuestionsCount}</span>
                        <span className="text-xs text-[#8c8c8c]">remaining</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-[#8c8c8c] font-mono">
                      <span>Solved Progress</span>
                      <span>{Math.round((solvedQuestionsCount / totalQuestionsCount) * 100) || 0}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#2d2d30] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${(solvedQuestionsCount / totalQuestionsCount) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Attempted/Unattempted status list / grid */}
                  <div className="space-y-2 pt-2 border-t border-[#3e3e42]">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-[#8c8c8c] font-medium">Question Status Grid</span>
                      <span className="text-[#8c8c8c] text-[10px] flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded bg-emerald-500"></span>
                          Attempted ({attemptedQuestionsCount})
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded bg-[#2d2d30] border border-[#3e3e42]"></span>
                          Unattempted ({totalQuestionsCount - attemptedQuestionsCount})
                        </span>
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                      {questionStatuses.map((qs) => {
                        const isCurrent = qs.index === currentQuestionIndex;
                        return (
                          <button
                            key={qs.index}
                            onClick={() => handleSelectQuestion(qs.index)}
                            title={`${qs.question.topic || "Question"}${qs.isSolved ? " (Solved)" : qs.isAttempted ? " (Attempted)" : " (Unattempted)"}`}
                            className={clsx(
                              "relative flex flex-col items-center justify-center py-2.5 rounded-lg border text-xs font-semibold transition-all duration-200 cursor-pointer",
                              qs.isAttempted 
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                                : "bg-[#2d2d30]/50 text-gray-400 border-[#3e3e42] hover:bg-[#2d2d30] hover:text-white",
                              isCurrent && "ring-2 ring-indigo-500 ring-offset-2 ring-offset-[#1e1e1e]"
                            )}
                          >
                            <span>Q{qs.index + 1}</span>
                            {qs.isSolved && (
                              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-[#1e1e1e] animate-pulse" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Question Specific Submissions title */}
                <div className="flex items-center justify-between border-b border-[#3e3e42] pb-2 mt-4">
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                    Submissions for: {currentQuestion?.topic || "Current Challenge"}
                  </h4>
                  {submissions.filter((sub: any) => sub.questionIndex === currentQuestionIndex || sub.questionTopic === currentQuestion?.topic).length > 0 && (
                    <span className="text-[10px] text-[#8c8c8c] bg-[#1e1e1e] border border-[#3e3e42] px-2 py-0.5 rounded font-mono">
                      {submissions.filter((sub: any) => sub.questionIndex === currentQuestionIndex || sub.questionTopic === currentQuestion?.topic).length} attempts
                    </span>
                  )}
                </div>

                {/* Submissions List */}
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                  {submissions.filter((sub: any) => sub.questionIndex === currentQuestionIndex || sub.questionTopic === currentQuestion?.topic).length > 0 ? (
                    submissions
                      .filter((sub: any) => sub.questionIndex === currentQuestionIndex || sub.questionTopic === currentQuestion?.topic)
                      .map((sub: any) => (
                        <div
                          key={sub.id}
                          className="bg-[#3e3e42]/30 p-4 rounded-xl border border-[#3e3e42] transition-all hover:bg-[#3e3e42]/40"
                        >
                          <div className="flex justify-between items-center mb-2 font-mono">
                            <span
                              className={clsx(
                                "font-bold text-xs",
                                sub.status === "Accepted"
                                  ? "text-emerald-500"
                                  : "text-red-500",
                              )}
                            >
                              {sub.status}
                            </span>
                            <span className="text-[10px] text-[#8c8c8c]">
                              {sub.createdAt?.toDate().toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-xs font-medium text-white mb-2">
                            {sub.questionTopic} ({sub.language})
                          </div>
                          <div className="flex gap-4 text-[10px] text-[#8c8c8c] font-mono">
                            <div>
                              Runtime:{" "}
                              <span className="text-white">{sub.runtime}</span>
                            </div>
                            <div>
                              Memory:{" "}
                              <span className="text-white">{sub.memory}</span>
                            </div>
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="text-center py-8 text-[#8c8c8c] bg-[#1e1e1e]/50 rounded-xl border border-[#3e3e42]/40 flex flex-col items-center justify-center">
                      <Clock className="w-8 h-8 mb-3 opacity-40 text-[#8c8c8c]" />
                      <p className="text-xs">
                        No submissions for this question yet. Submit your solution on the right to test!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-[#282828] border-t border-[#3e3e42] px-4 py-3 flex gap-4 text-[#8c8c8c] text-xs font-medium">
            <div className="flex items-center gap-1 hover:text-white cursor-pointer">
              <MessageSquare className="w-4 h-4" /> 235
            </div>
            <div className="flex items-center gap-1 hover:text-white cursor-pointer">
              4.3K
            </div>
          </div>
        </Panel>

        <PanelResizeHandle className="w-4 flex flex-shrink-0 items-center justify-center cursor-col-resize relative z-10 group bg-transparent">
          <div className="w-1 h-8 bg-[#3e3e42] group-hover:bg-indigo-500 rounded-full transition-colors hidden lg:block"></div>
        </PanelResizeHandle>

        {/* Right Panel: Editor and Output */}
        <Panel
          defaultSize={55}
          minSize={20}
          className="flex flex-col h-full w-full"
        >
          <PanelGroup orientation="vertical">
            <Panel
              defaultSize={70}
              minSize={20}
              className="flex flex-col relative"
            >
              <div
                className={clsx(
                  "bg-[#1e1e1e] border border-[#3e3e42] rounded-t-xl overflow-hidden flex flex-col transition-all duration-300 h-full",
                  isEditorExpanded
                    ? "fixed inset-4 z-50 shadow-2xl rounded-xl"
                    : "w-full border-b-0",
                )}
              >
                {/* Editor Action Bar */}
                <div className="flex items-center justify-between px-4 py-2 bg-[#282828] border-b border-[#3e3e42] text-xs">
                  <select
                    value={language}
                    onChange={(e) => handleSelectLanguage(e.target.value)}
                    className="bg-[#3e3e42] text-[#bfbfbf] border border-[#3e3e42] rounded py-1 px-2 focus:outline-none cursor-pointer"
                  >
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                    <option value="c">C</option>
                  </select>

                  <button
                    onClick={() => setIsEditorExpanded(!isEditorExpanded)}
                    className="text-[#8c8c8c] hover:text-[#bfbfbf] transition-colors p-1"
                    title={isEditorExpanded ? "Minimize" : "Full Screen"}
                  >
                    {isEditorExpanded ? (
                      <Minimize2 className="w-4 h-4" />
                    ) : (
                      <Maximize2 className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <div className="flex-1 w-full h-full relative">
                  <Editor
                    height="100%"
                    width="100%"
                    language={language}
                    theme={sourceName.includes("DSA and Dev Questions") ? "blue-theme" : "vs-dark"}
                    beforeMount={handleEditorBeforeMount}
                    value={code}
                    onChange={(val) => setCode(val || "")}
                    options={{
                      fontSize: 14,
                      fontFamily: "JetBrains Mono",
                      minimap: { enabled: false },
                      padding: { top: 16 },
                      wordWrap: "on",
                      automaticLayout: true,
                      scrollBeyondLastLine: false,
                      lineNumbersMinChars: 3,
                      glyphMargin: false,
                      folding: false,
                      lineDecorationsWidth: 10,
                      scrollbar: {
                        vertical: "visible",
                        horizontal: "visible",
                      },
                    }}
                  />
                </div>
              </div>
            </Panel>

            <PanelResizeHandle className="w-full flex items-center justify-center cursor-row-resize relative z-10 group bg-transparent py-1 -my-1">
              <div className="h-px w-full bg-[#3e3e42] group-hover:bg-indigo-500 group-active:bg-indigo-400 transition-colors"></div>
            </PanelResizeHandle>

            <Panel
              defaultSize={30}
              minSize={10}
              className="flex flex-col relative"
            >
              {/* Action Bar & Output Panel */}
              <div className="bg-[#1e1e1e] border border-[#3e3e42] rounded-b-xl border-t-0 flex flex-col h-full overflow-hidden">
                <div className="flex items-center gap-6 px-4 bg-[#282828] border-b border-[#3e3e42] text-xs font-medium shrink-0 h-10">
                  <button
                    onClick={() => setActiveTabRight("result")}
                    className={`flex items-center gap-2 h-full cursor-pointer ${activeTabRight === "result" ? "text-white border-b-2 border-white" : "text-[#8c8c8c] hover:text-[#bfbfbf]"}`}
                  >
                    <TerminalSquare className="w-4 h-4 text-emerald-500" /> Test
                    Result
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 text-sm font-mono text-[#bfbfbf]">
                  <div>
                    {output && output.error ? (
                      <div>
                        <div className="text-red-500 font-bold text-lg mb-4 flex items-center gap-2">
                          <AlertCircle className="w-5 h-5" /> Error
                        </div>
                        <div className="bg-red-500/10 text-red-400 p-4 rounded-lg border border-red-500/20 whitespace-pre-wrap mb-4">
                          {output.error}
                        </div>
                      </div>
                    ) : output ? (
                      <div>
                        <div
                          className={`font-bold text-lg mb-4 ${output.status?.id === 3 ? "text-emerald-500" : "text-red-500"}`}
                        >
                          {output.status?.description ||
                            (output.status?.id === 3 ? "Accepted" : "Error")}
                        </div>

                        {output.stderr && (
                          <div className="bg-red-500/10 text-red-400 p-4 rounded-lg border border-red-500/20 whitespace-pre-wrap mb-4">
                            {(() => {
                              try {
                                return atob(output.stderr);
                              } catch {
                                return output.stderr;
                              }
                            })()}
                          </div>
                        )}

                        <div className="bg-[#282828] border border-[#3e3e42] p-3 rounded-lg mb-4 text-[#bfbfbf]">
                          <div className="text-xs text-[#8c8c8c] mb-1">
                            Output
                          </div>
                          <div>
                            {(() => {
                              try {
                                return output.stdout
                                  ? atob(output.stdout)
                                  : "--";
                              } catch {
                                return output.stdout;
                              }
                            })()}
                          </div>
                        </div>
                        {(output.expectedOutput ||
                          (currentQuestion?.testCases &&
                            currentQuestion.testCases[0]?.output)) && (
                          <div className="bg-[#282828] border border-[#3e3e42] p-3 rounded-lg mb-4 text-[#bfbfbf]">
                            <div className="text-xs text-[#8c8c8c] mb-1">
                              Expected
                            </div>
                            <div>
                              {output.expectedOutput ||
                                (currentQuestion.testCases &&
                                  currentQuestion.testCases[0].output)}
                            </div>
                          </div>
                        )}

                        {output.aiAnalysis && (
                          <div className="mt-6 flex flex-col items-end gap-2">
                            <div className="text-xs px-2 py-1 bg-[#3e3e42] text-[#8c8c8c] rounded-md flex items-center gap-1 w-fit">
                              <Wand2 className="w-3 h-3" /> Evaluated by{" "}
                              {output.aiModel || "AI Model"}
                            </div>
                            <div className="text-[#8c8c8c] text-sm text-right bg-[#282828] border border-[#3e3e42] p-3 rounded-lg w-full">
                              {output.aiAnalysis}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-[#8c8c8c]">
                        <p>You must run your code first</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>

      {/* AI Review Drawer Overlay (simplified as modal) */}
      {aiReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#1e1e1e] border border-[#3e3e42] p-6 rounded-2xl max-w-2xl w-full shadow-2xl relative max-h-[80vh] overflow-y-auto"
          >
            <button
              onClick={() => setAiReview("")}
              className="absolute top-4 right-4 text-[#8c8c8c] hover:text-white cursor-pointer"
            >
              ✕
            </button>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6 border-b border-[#3e3e42] pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-500/20 text-indigo-400 p-2 rounded-xl">
                  <Wand2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">AI Code Review</h3>
              </div>
              <div className="sm:ml-auto flex items-center gap-1.5 px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded text-[10px] text-indigo-300 font-bold tracking-wide uppercase max-w-max">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                Engine: Gemini 3.5 Flash
              </div>
            </div>
            <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-[#bfbfbf]">
              {aiReview}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );

  if (onClose) {
    return WorkspaceContent;
  }

  return (
    <AppLayout activeTab="code">
      {WorkspaceContent}
    </AppLayout>
  );

  function resetCode() {
    setCode(boilerplates[language]);
  }
}
