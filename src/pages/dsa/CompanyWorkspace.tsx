import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "../../components/AppLayout";
import {
  ArrowLeft,
  CheckCircle2,
  Code,
  Mic,
  Brain,
  Calculator,
  Briefcase,
  FileClock,
  Play,
  FileText,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../../lib/firebase";
import { doc, getDoc, onSnapshot, collection, query, where, getDocs, limit, orderBy } from "firebase/firestore";
import AptitudeQuiz from "../../components/AptitudeQuiz";
import DsaWorkspace from "./DsaWorkspace";
import { useAuth } from "../../contexts/AuthContext";
import { QuizAttempt } from "../../types";


export default function CompanyWorkspace() {
  const { company } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState("dsa");
  const [dsaQuestions, setDsaQuestions] = useState<any[]>([]);
  const [aptitudeQuestions, setAptitudeQuestions] = useState<any[]>([]);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null);
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);

  useEffect(() => {
    if (!company) return;

    // Fetch DSA Questions
    const docRef = doc(db, "company_prep", company?.toLowerCase() || "");
    const unsubscribeDsa = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setDsaQuestions(data.dsa || []);
      } else {
        setDsaQuestions([]);
      }
    });

    // Fetch Aptitude Questions (Company specific + Global)
    const q = query(
      collection(db, "technical_aptitude"), 
      orderBy("uploadDate", "desc")
    );
    const unsubscribeApt = onSnapshot(q, (snap) => {
      const data = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() as any }))
        .filter(item => item.company?.toLowerCase() === company?.toLowerCase() || item.global === true);
      setAptitudeQuestions(data);
    });

    if (user) {
      loadAttempts();
    }

    return () => {
      unsubscribeDsa();
      unsubscribeApt();
    };
  }, [company, user]);

  const questions = activeTab === 'dsa' ? dsaQuestions : aptitudeQuestions;

  const tabs = [
    { 
      id: "dsa", 
      label: `${company} DSA and Dev Questions`, 
      icon: Code,
      count: dsaQuestions.length
    },
    { 
      id: "aptitude", 
      label: "Technical Aptitude", 
      icon: Brain,
      count: aptitudeQuestions.length
    },
  ];

  const loadAttempts = async () => {
    if (!user) return;
    setLoadingAttempts(true);
    try {
      const q = query(
        collection(db, 'aptitude_attempts'),
        where('userId', '==', user.uid)
      );
      const snap = await getDocs(q);
      const data = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as QuizAttempt))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);
      setAttempts(data);
    } catch (err) {
      console.error("Failed to load attempts:", err);
    } finally {
      setLoadingAttempts(false);
    }
  };

  return (
    <AppLayout activeTab="companies">
      {selectedQuestionIndex !== null && activeTab === 'dsa' ? (
        <DsaWorkspace 
          initialQuestionIndex={selectedQuestionIndex} 
          questionsList={questions}
          onClose={() => setSelectedQuestionIndex(null)}
          sourceName={`${company} DSA and Dev Questions`}
        />
      ) : (
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-[#111827] border border-white/10 rounded-2xl p-6 md:p-10 mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
            <button
              onClick={() => navigate("/companies")}
              className="text-gray-400 hover:text-white flex items-center gap-2 mb-6 cursor-pointer text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Companies
            </button>

            <div className="relative z-10">
              <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-3 capitalize tracking-tight">
                {company} Placement Preparation
              </h1>
              <p className="text-sm md:text-base text-gray-400 max-w-2xl leading-relaxed">
                Practice highly curated technical and HR questions designed
                specifically to help you clear {company} interviews.
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 mb-8 border-b border-white/10 pb-4 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg whitespace-nowrap transition-all cursor-pointer font-semibold text-sm ${
                    activeTab === tab.id
                      ? "bg-white text-gray-900 shadow-md"
                      : "bg-transparent text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    activeTab === tab.id
                      ? "bg-gray-900/10 text-gray-900"
                      : "bg-white/10 text-gray-400"
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Content Area */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
              <div className="flex-1">
                <h2 className="text-xl md:text-2xl font-bold text-white mb-2 flex items-center gap-2">
                  {(() => {
                    const Icon = tabs.find((t) => t.id === activeTab)?.icon || Code;
                    return (
                      <Icon className="text-indigo-400 w-5 h-5 md:w-6 md:h-6" />
                    );
                  })()}
                  {tabs.find((t) => t.id === activeTab)?.label}
                </h2>
                <p className="text-sm text-gray-400 max-w-3xl leading-relaxed">
                  Select a module to start practicing specifically for {company}. We
                  recommend completing all modules. These questions are curated for {company} preparation.
                </p>
              </div>

              {activeTab === 'aptitude' && !isQuizMode && questions.length > 0 && (
                <button 
                  onClick={() => setIsQuizMode(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer w-full md:w-auto justify-center"
                >
                  <Zap className="w-5 h-5" /> Start Aptitude Practice
                </button>
              )}
              
              {activeTab === 'aptitude' && isQuizMode && (
                <button 
                  onClick={() => setIsQuizMode(false)}
                  className="text-gray-400 hover:text-white flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg text-sm font-bold transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to History
                </button>
              )}
            </div>

            <AnimatePresence mode="wait">
              {isQuizMode && activeTab === 'aptitude' ? (
                <motion.div 
                  key="quiz"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                >
                  <AptitudeQuiz questions={questions} />
                </motion.div>
              ) : (
                <motion.div 
                  key="list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-8"
                >
                  {activeTab === 'aptitude' && attempts.length > 0 && !isQuizMode && (
                    <div className="bg-[#0f172a] border border-indigo-500/10 rounded-2xl p-6">
                      <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                        <FileClock className="w-5 h-5 text-indigo-400" /> Recent Practice Performance
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {attempts.map((attempt) => (
                          <div key={attempt.id} className="bg-white/[0.02] border border-white/5 p-4 rounded-xl flex items-center justify-between">
                            <div>
                              <p className="text-[10px] font-bold text-gray-500 uppercase">{new Date(attempt.date).toLocaleDateString()}</p>
                              <p className="text-lg font-bold text-white">{attempt.score}/{attempt.totalQuestions}</p>
                            </div>
                            <div className="text-right">
                              <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${
                                attempt.percentage >= 70 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                              }`}>
                                {attempt.performanceLevel}
                              </span>
                              <p className="text-xs font-mono text-gray-400 mt-1">{attempt.percentage}%</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {questions.length === 0 ? (
                      <div className="col-span-full py-12 text-center border border-dashed border-white/10 rounded-2xl">
                        <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-300 mb-2">
                          No Questions Available
                        </h3>
                        <p className="text-gray-500">
                          Wait for the admin to add{" "}
                          {tabs.find((t) => t.id === activeTab)?.label} for {company}.
                        </p>
                      </div>
                    ) : (
                      questions.map((item, idx) => (
                        <div
                          key={idx}
                          className="bg-[#0A0F1E] border border-white/10 rounded-xl p-5 group hover:border-indigo-500/50 transition-colors flex flex-col h-full"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${
                              item.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400' :
                              item.difficulty === 'Hard' ? 'bg-red-500/10 text-red-400' :
                              'bg-amber-500/10 text-amber-400'
                            }`}>
                              {item.difficulty || "Medium"}
                            </span>
                            <span className="bg-white/5 text-gray-400 text-[10px] font-bold px-2 py-1 rounded uppercase">
                              {item.topic || company}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors line-clamp-2 leading-tight">
                            {item.question || item.title || item.text || "Untitled Question"}
                          </h3>
                          {activeTab === 'aptitude' && item.options && (
                            <div className="space-y-1 mb-4">
                              {item.options.slice(0, 2).map((opt: string, i: number) => (
                                <div key={i} className="text-[11px] text-gray-500 flex items-center gap-2">
                                  <div className="w-1 h-1 bg-gray-700 rounded-full"></div>
                                  <span className="truncate">{opt}</span>
                                </div>
                              ))}
                              {item.options.length > 2 && <p className="text-[10px] text-gray-600">+{item.options.length - 2} more options</p>}
                            </div>
                          )}
                          <p className="text-sm text-gray-400 mb-6 flex-1 line-clamp-3 leading-relaxed">
                            {!item.options && (item.description || item.question || item.text || "Master the standard questions frequently asked.")}
                          </p>

                          <button 
                            onClick={() => {
                              if (activeTab === 'aptitude') {
                                setIsQuizMode(true);
                              } else {
                                setSelectedQuestionIndex(idx);
                              }
                            }}
                            className="w-full py-2.5 bg-[#151B2B] hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/30 hover:border-indigo-500 rounded-lg font-bold flex items-center justify-center gap-2 transition-all mt-auto cursor-pointer"
                          >
                            <Play className="w-4 h-4" /> {activeTab === 'aptitude' ? 'Practice MCQs' : 'Start Coding'}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
