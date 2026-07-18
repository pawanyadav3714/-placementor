import { useState, useEffect } from "react";
import AppLayout from "../../components/AppLayout";
import {
  Play,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  Clock,
  Calendar,
  FileText,
  XCircle,
  Code,
  Trophy,
  AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { db } from "../../lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  where,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import ReactMarkdown from "react-markdown";

export default function TestWorkspace() {
  const { user } = useAuth();
  const [assignedTests, setAssignedTests] = useState<any[]>([]);
  const [activeTest, setActiveTest] = useState<any>(null);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<any[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [now, setNow] = useState(new Date());

  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<any>(null);

  const handleFinishTest = async () => {
    setIsEvaluating(true);
    setShowResult(true);
    if (!user || !activeTest) return;

    let correct = 0;
    try {
      const sanitizedQuestions = (activeTest.questions || []).map((q: any) => ({
        question: q.question || q.text || q.title || "",
        text: q.text || q.question || q.title || "",
        type: q.type || "multiple_choice",
        answer: q.answer !== undefined ? q.answer : "",
      }));

      const res = await fetch("/api/evaluate-test-submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions: sanitizedQuestions,
          answers: selectedAnswers || [],
        }),
      });
      const data = await res.json();
      correct = data.correctCount || 0;
      setEvalResult(data);

      await addDoc(collection(db, "completed_tests"), {
        userId: user.uid,
        testId: activeTest.id,
        title: activeTest.title,
        score: correct,
        total: activeTest.questions?.length || 0,
        timeTakenMinutes:
          activeTest.duration - Math.floor((timeLeft || 0) / 60),
        attemptDate: serverTimestamp(),
        answers: selectedAnswers,
        evaluation: data.evaluation,
      });
    } catch (e) {
      console.error(
        "Failed to evaluate and save test",
        (e as any)?.message || e,
      );
    } finally {
      setIsEvaluating(false);
    }
  };

  const [completedTests, setCompletedTests] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    // Get released tests
    const qTests = query(
      collection(db, "released_tests"),
      where("active", "==", true),
    );
    const unsubscribeTests = onSnapshot(qTests, (snapshot) => {
      const tests: any[] = [];
      snapshot.forEach((doc) => {
        tests.push({ id: doc.id, ...doc.data() });
      });
      setAssignedTests(tests);
    }, (err) => {
      console.error("Error fetching released tests:", err);
    });

    // Get completed tests for this user
    const qCompleted = query(
      collection(db, "completed_tests"),
      where("userId", "==", user.uid),
    );
    const unsubscribeCompleted = onSnapshot(qCompleted, (snapshot) => {
      const comp: any[] = [];
      snapshot.forEach((doc) => {
        comp.push({ id: doc.id, ...doc.data() });
      });
      setCompletedTests(comp);
    }, (err) => {
      console.error("Error fetching completed tests:", err);
    });

    return () => {
      unsubscribeTests();
      unsubscribeCompleted();
    };
  }, [user]);

  useEffect(() => {
    const timer = setInterval(() => {
      const currentDate = new Date();
      setNow(currentDate);

      // Auto-start logic
      if (!activeTest && !showResult && assignedTests.length > 0) {
        for (const test of assignedTests) {
          const hasCompleted = completedTests.some(
            (ct) => ct.testId === test.id,
          );
          if (hasCompleted) continue; // Already took it!

          if (test.assignDate && test.assignTime) {
            const assignDateTime = new Date(
              `${test.assignDate}T${test.assignTime}`,
            );
            const endTime = new Date(
              assignDateTime.getTime() + (test.duration || 60) * 60000,
            );
            const timeDiffMs = assignDateTime.getTime() - currentDate.getTime();

            // If test just became live (e.g. within the last 5 seconds) or is live, auto start if not started
            // But we don't want to force restart if they intentionally exited. Actually, if it's Live, we should force them into it as it's a strict exam system.
            // "on assigned time the test wil automatically starts"
            if (timeDiffMs <= 0 && currentDate.getTime() <= endTime.getTime()) {
              // Auto start!
              setActiveTest(test);
              setCurrentIdx(0);
              setSelectedAnswers(
                new Array(test.questions?.length || 0).fill(null),
              );

              // Calculate remaining time
              const secondsPassed = Math.floor(Math.abs(timeDiffMs) / 1000);
              const totalSeconds = (test.duration || 60) * 60;
              setTimeLeft(totalSeconds - secondsPassed);

              setShowResult(false);
              break; // Only auto-start one
            }
          }
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [assignedTests, activeTest, showResult]);

  useEffect(() => {
    if (timeLeft === null || showResult || !activeTest) return;

    if (timeLeft <= 0) {
      handleFinishTest();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, showResult, activeTest]);

  const handleStartTest = (test: any) => {
    setActiveTest(test);
    setCurrentIdx(0);
    setSelectedAnswers(new Array(test.questions?.length || 0).fill(null));
    setTimeLeft(test.duration ? test.duration * 60 : 0);
    setShowResult(false);
  };

  const handleSelectOption = (optIdx: number) => {
    if (showResult) return;
    const newAnswers = [...selectedAnswers];
    newAnswers[currentIdx] = optIdx;
    setSelectedAnswers(newAnswers);
  };

  const handleTextAnswer = (text: string) => {
    if (showResult) return;
    const newAnswers = [...selectedAnswers];
    newAnswers[currentIdx] = text;
    setSelectedAnswers(newAnswers);
  };

  const [isAskingAI, setIsAskingAI] = useState(false);
  const [aiAssistantData, setAiAssistantData] = useState<any>({});

  const handleAskAI = async () => {
    if (!activeTest?.questions?.[currentIdx]) return;

    // Check if already fetched
    if (aiAssistantData[currentIdx]) return;

    setIsAskingAI(true);
    try {
      const q = activeTest.questions[currentIdx];
      const res = await fetch("/api/evaluate-question-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionText: q.text || q.question,
          questionType: q.type || "multiple_choice",
        }),
      });
      const data = await res.json();
      setAiAssistantData((prev) => ({ ...prev, [currentIdx]: data.answer }));
    } catch (e) {
      console.error((e as any)?.message || e);
      setAiAssistantData((prev) => ({
        ...prev,
        [currentIdx]: "Failed to get AI assistant answer. Please try again.",
      }));
    } finally {
      setIsAskingAI(false);
    }
  };

  const calculateScore = () => {
    if (!activeTest?.questions) return { score: 0, total: 0 };
    let correct = 0;
    activeTest.questions.forEach((q: any, i: number) => {
      if (q.type === "multiple_choice" || (q.options && q.options.length > 0)) {
        if (
          q.correctOption !== undefined &&
          selectedAnswers[i] === q.correctOption
        ) {
          correct++;
        } else if (
          q.answer &&
          selectedAnswers[i] !== null &&
          selectedAnswers[i] !== -1 &&
          q.options?.[selectedAnswers[i]] === q.answer
        ) {
          correct++;
        }
      } else {
        if (
          q.answer &&
          typeof selectedAnswers[i] === "string" &&
          selectedAnswers[i].trim().toLowerCase() ===
            String(q.answer).trim().toLowerCase()
        ) {
          correct++;
        }
      }
    });
    return { score: correct, total: activeTest.questions.length };
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (!activeTest) {
    return (
      <AppLayout activeTab="tests">
        <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 pb-20">
          <div className="bg-[#0d1326] -mx-4 md:-mx-8 -mt-4 md:-mt-8 p-4 md:p-6 border-b border-white/5 mb-4 md:mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-1">
              Assigned Tests
            </h2>
            <p className="text-[10px] md:text-sm text-gray-400">
              Complete the tests assigned by your administrator.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignedTests.filter((test) => {
              const hasCompleted = completedTests.some((ct) => ct.testId === test.id);
              if (hasCompleted) return false;
              if (test.assignDate && test.assignTime) {
                const assignDateTime = new Date(`${test.assignDate}T${test.assignTime}`);
                const endTime = new Date(assignDateTime.getTime() + (test.duration || 60) * 60000);
                if (now.getTime() > endTime.getTime()) {
                  return false;
                }
              }
              return true;
            }).length === 0 ? (
              <div className="col-span-full border border-white/10 rounded-xl p-4 md:p-6 text-center bg-[#111827]">
                <FileText className="w-6 h-6 md:w-8 md:h-8 text-gray-500 mx-auto mb-2 md:mb-3 opacity-50" />
                <h3 className="text-sm md:text-base font-bold text-gray-300">
                  No Tests Assigned
                </h3>
                <p className="text-[10px] md:text-xs text-gray-500 mt-1 md:mt-1.5">
                  You currently don't have any pending tests. Check back later.
                </p>
              </div>
            ) : (
              assignedTests.filter((test) => {
                const hasCompleted = completedTests.some((ct) => ct.testId === test.id);
                if (hasCompleted) return false;
                if (test.assignDate && test.assignTime) {
                  const assignDateTime = new Date(`${test.assignDate}T${test.assignTime}`);
                  const endTime = new Date(assignDateTime.getTime() + (test.duration || 60) * 60000);
                  if (now.getTime() > endTime.getTime()) {
                    return false;
                  }
                }
                return true;
              }).map((test) => {
                const hasCompleted = false;

                let statusLabel = (
                  <span className="text-xs font-bold px-2 py-1 bg-indigo-500/20 text-indigo-400 rounded tracking-wider">
                    AVAILABLE
                  </span>
                );
                let canStart = true;
                let buttonText = "Start Test";

                let borderColorClass =
                  "border-white/10 hover:border-indigo-500/30";
                let shadowClass = "hover:shadow-indigo-500/10";
                let iconColorClass = "text-indigo-400 bg-indigo-500/10";
                let btnClass =
                  "bg-white/5 hover:bg-indigo-600 text-white border-white/10 hover:border-indigo-500";
                let isLive = false;
                let isExpired = false;

                if (hasCompleted) {
                  canStart = false;
                  statusLabel = (
                    <span className="text-xs font-bold px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> COMPLETED
                    </span>
                  );
                  buttonText = "Test Completed";
                  borderColorClass = "border-emerald-500/30 opacity-70";
                  shadowClass = "";
                  iconColorClass = "text-emerald-400 bg-emerald-500/10";
                  btnClass =
                    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 cursor-not-allowed";
                } else if (test.assignDate && test.assignTime) {
                  const assignDateTime = new Date(
                    `${test.assignDate}T${test.assignTime}`,
                  );
                  const endTime = new Date(
                    assignDateTime.getTime() + (test.duration || 60) * 60000,
                  );
                  const timeDiffMs = assignDateTime.getTime() - now.getTime();

                  if (now.getTime() > endTime.getTime()) {
                    // Expired
                    isExpired = true;
                    canStart = false;
                    statusLabel = (
                      <span className="text-xs font-bold px-2 py-1 bg-red-500/20 text-red-500 rounded flex items-center gap-1">
                        🚨 EXPIRED
                      </span>
                    );
                    buttonText = "Cannot Start";
                    borderColorClass = "border-red-500/50 hover:border-red-500";
                    shadowClass = "shadow-md shadow-red-500/10";
                    iconColorClass = "text-red-400 bg-red-500/10";
                    btnClass =
                      "bg-red-500/10 text-red-500 border-red-500/20 cursor-not-allowed";
                  } else if (
                    timeDiffMs <= 0 &&
                    now.getTime() <= endTime.getTime()
                  ) {
                    // Live!
                    isLive = true;
                    statusLabel = (
                      <span className="text-xs font-bold px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded tracking-wider animate-pulse font-medium flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>{" "}
                        LIVE TEST
                      </span>
                    );
                    borderColorClass =
                      "border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:border-emerald-500";
                    shadowClass = "shadow-lg shadow-emerald-500/20";
                    iconColorClass = "text-emerald-400 bg-emerald-500/10";
                    btnClass =
                      "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500";
                  } else if (timeDiffMs > 0) {
                    canStart = false;
                    if (timeDiffMs <= 5 * 60 * 1000) {
                      const m = Math.floor(timeDiffMs / 60000);
                      const s = Math.floor((timeDiffMs % 60000) / 1000);
                      statusLabel = (
                        <span className="text-xs font-bold px-2 py-1 bg-red-500/20 text-red-500 rounded flex items-center gap-1 animate-pulse">
                          🚨 STARTING SOON {m}:{s.toString().padStart(2, "0")}
                        </span>
                      );
                      buttonText = "Starting Soon...";
                      borderColorClass = "border-red-500/30";
                      iconColorClass = "text-red-400 bg-red-500/10";
                      btnClass =
                        "bg-red-500/10 text-red-500 border-red-500/20 cursor-not-allowed";
                    } else {
                      const days = Math.floor(
                        timeDiffMs / (1000 * 60 * 60 * 24),
                      );
                      const hours = Math.floor(
                        (timeDiffMs / (1000 * 60 * 60)) % 24,
                      );
                      const mins = Math.floor((timeDiffMs / 1000 / 60) % 60);
                      const secs = Math.floor((timeDiffMs / 1000) % 60);

                      statusLabel = (
                        <span className="text-xs font-bold px-2 py-1 bg-amber-500/20 text-amber-400 rounded tracking-wider flex items-center gap-1">
                          STARTS IN: {days > 0 ? `${days}d ` : ""}
                          {hours > 0 ? `${hours}h ` : ""}
                          {mins}m {secs}s
                        </span>
                      );
                      buttonText = "Not Started";
                      borderColorClass = "border-amber-500/30";
                      iconColorClass = "text-amber-400 bg-amber-500/10";
                      btnClass =
                        "bg-amber-500/10 text-amber-500 border-amber-500/20 cursor-not-allowed";
                    }
                  }
                }

                return (
                  <motion.div
                    key={test.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`bg-[#111827] border rounded-xl p-4 md:p-5 transition-all group flex flex-col ${borderColorClass} ${shadowClass}`}
                  >
                    <div className="flex justify-between items-start mb-3 md:mb-4">
                      <div className={`p-2.5 rounded-lg ${iconColorClass}`}>
                        <FileText className="w-5 h-5" />
                      </div>
                      {statusLabel}
                    </div>
                    <h3 className="text-base md:text-lg font-bold text-white mb-2">
                      {test.title || "Untitled Test"}
                    </h3>

                    <div className="space-y-1.5 md:space-y-2 mb-4 md:mb-5">
                      <div className="flex items-center gap-2 text-gray-400 text-[10px] md:text-xs">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {test.assignDate
                            ? `${test.assignDate} at ${test.assignTime}`
                            : "Anytime"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400 text-[10px] md:text-xs">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>{test.duration} Minutes Duration</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400 text-[10px] md:text-xs">
                        <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{test.questions?.length || 0} Questions</span>
                      </div>
                    </div>

                    <button
                      disabled={!canStart}
                      onClick={() => handleStartTest(test)}
                      className={`w-full font-medium py-2.5 rounded-lg text-xs md:text-sm transition-colors flex items-center justify-center gap-2 border mt-auto cursor-pointer ${canStart ? "bg-white/5 hover:bg-indigo-600 text-white border-white/10 hover:border-indigo-500" : "bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed"}`}
                    >
                      {!canStart ? (
                        <Clock className="w-3.5 h-3.5" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}{" "}
                      {buttonText}
                    </button>
                  </motion.div>
                );
              })
            )}
          </div>

          <div className="bg-[#0d1326] -mx-4 md:-mx-8 p-4 md:p-6 border-t border-b border-white/5 mb-4 md:mb-6 mt-8 md:mt-12">
            <h2 className="text-xl md:text-2xl font-bold mb-1 text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 md:w-6 md:h-6 text-yellow-400" /> Test
              History
            </h2>
            <p className="text-[10px] md:text-sm text-gray-400">
              Review your past performance and completed tests.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...completedTests.map(t => ({...t, type: 'completed'})), ...assignedTests.filter((test) => {
              const hasCompleted = completedTests.some((ct) => ct.testId === test.id);
              if (hasCompleted) return false;
              if (test.assignDate && test.assignTime) {
                const assignDateTime = new Date(`${test.assignDate}T${test.assignTime}`);
                const endTime = new Date(assignDateTime.getTime() + (test.duration || 60) * 60000);
                if (now.getTime() > endTime.getTime()) {
                  return true;
                }
              }
              return false;
            }).map(t => ({...t, type: 'expired'}))].length === 0 ? (
              <div className="col-span-full border border-white/10 rounded-xl p-4 md:p-6 text-center bg-[#111827]">
                <Clock className="w-6 h-6 md:w-8 md:h-8 text-gray-500 mx-auto mb-2 md:mb-3 opacity-50" />
                <h3 className="text-sm md:text-base font-bold text-gray-300">
                  No History Yet
                </h3>
                <p className="text-[10px] md:text-xs text-gray-500 mt-1 md:mt-1.5">
                  Tests you complete will appear here.
                </p>
              </div>
            ) : (
              [...completedTests.map(t => ({...t, type: 'completed'})), ...assignedTests.filter((test) => {
                const hasCompleted = completedTests.some((ct) => ct.testId === test.id);
                if (hasCompleted) return false;
                if (test.assignDate && test.assignTime) {
                  const assignDateTime = new Date(`${test.assignDate}T${test.assignTime}`);
                  const endTime = new Date(assignDateTime.getTime() + (test.duration || 60) * 60000);
                  if (now.getTime() > endTime.getTime()) {
                    return true;
                  }
                }
                return false;
              }).map(t => ({...t, type: 'expired'}))].map((test) => (
                <div
                  key={test.id}
                  className={`bg-[#111827] border rounded-xl p-4 md:p-5 relative overflow-hidden group ${test.type === 'completed' ? 'border-emerald-500/30' : 'border-red-500/30'}`}
                >
                  <div className="absolute top-0 right-0 p-3 opacity-10 blur-xl group-hover:opacity-20 transition-opacity">
                    {test.type === 'completed' ? <Trophy className="w-16 h-16 md:w-20 md:h-20 text-emerald-500" /> : <Clock className="w-16 h-16 md:w-20 md:h-20 text-red-500" />}
                  </div>
                  <div className="flex justify-between items-start mb-3 md:mb-4 relative z-10">
                    <div className={`p-2 md:p-2.5 rounded-lg ${test.type === 'completed' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                      {test.type === 'completed' ? <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" /> : <Clock className="w-4 h-4 md:w-5 md:h-5 text-red-400" />}
                    </div>
                    <span className={`text-[9px] md:text-[10px] font-bold px-2 py-1 md:px-3 md:py-1.5 rounded-lg ${test.type === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {test.type === 'completed' ? `SCORE: ${test.score}/${test.total}` : 'MISSED'}
                    </span>
                  </div>
                  <h3 className="text-base md:text-lg font-bold text-white mb-2 relative z-10">
                    {test.title || "Untitled Test"}
                  </h3>
                  <div className="space-y-1.5 md:space-y-2 mb-4 md:mb-5 relative z-10">
                    <div className="flex items-center gap-2 text-gray-400 text-[10px] md:text-xs">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {test.type === 'completed' ? (test.attemptDate?.toDate?.()?.toLocaleDateString() || "Recently") : `${test.assignDate} at ${test.assignTime}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400 text-[10px] md:text-xs">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>{test.type === 'completed' ? `${test.timeTakenMinutes} mins taken` : 'Did not attempt'}</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 md:h-2 bg-[#0A0F1E] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${test.type === 'completed' ? 'bg-emerald-500' : 'bg-red-500'}`}
                      style={{
                        width: `${test.type === 'completed' ? (Math.round((test.score / test.total) * 100) || 0) : 0}%`,
                      }}
                    ></div>
                  </div>
                  <div className="text-right text-[10px] md:text-xs mt-1.5 md:mt-2 text-emerald-400/70 font-mono">
                    {Math.round((test.score / test.total) * 100) || 0}% ACCURACY
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </AppLayout>
    );
  }

  const currentQuestion = activeTest.questions?.[currentIdx];
  const { score, total } = calculateScore();

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white flex flex-col font-sans">
      <header className="bg-[#111827] border-b border-white/10 px-4 md:px-6 py-3 md:py-4 flex flex-wrap md:flex-nowrap items-center justify-between gap-3 sticky top-0 z-50 shadow-xl">
        <div className="flex items-center gap-3 md:gap-4 max-w-[50%] md:max-w-none">
          <div className="bg-indigo-500/20 p-1.5 md:p-2 rounded-lg shrink-0">
            <Code className="text-indigo-400 w-4 h-4 md:w-5 md:h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-sm md:text-base truncate">{activeTest.title}</h1>
            <p className="text-xs md:text-sm text-gray-400">
              Questions {currentIdx + 1} of {activeTest.questions?.length}
            </p>
          </div>
        </div>

        {!showResult && timeLeft !== null && (
          <div className="flex items-center gap-2 md:gap-3 ml-auto">
            <div className="flex items-center gap-1.5 md:gap-2 bg-indigo-500/10 px-2 py-1 md:px-4 md:py-2 rounded-lg md:rounded-xl border border-indigo-500/20 text-indigo-300 font-mono text-xs md:text-lg font-medium shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <Clock className="w-3.5 h-3.5 md:w-5 md:h-5 shrink-0" />
              {formatTime(timeLeft)}
            </div>
            <button
              onClick={handleFinishTest}
              className="bg-emerald-600 hover:bg-emerald-500 px-3 py-1 md:px-6 md:py-2.5 rounded-lg md:rounded-xl font-bold text-xs md:text-base transition-all hover:scale-105 shadow-lg shadow-emerald-500/25 cursor-pointer shrink-0"
            >
              Submit Test
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 flex flex-col pb-24">
        {showResult ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-5xl mx-auto w-full space-y-8 mt-4 mb-20"
          >
            {/* Summary Card */}
            <div className="bg-[#111827] border border-white/10 rounded-3xl p-8 text-center relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl -ml-20 -mb-20"></div>
              
              <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(250,204,21,0.3)]" />
              <h2 className="text-3xl md:text-4xl font-bold mb-2">Test Completed</h2>
              
              {isEvaluating ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 bg-indigo-500/20 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  <div className="text-xl text-indigo-400 font-medium animate-pulse">
                    AI is evaluating your performance...
                  </div>
                  <p className="text-gray-500 text-sm max-w-sm">
                    Analyzing subjective answers and computing final score and feedback.
                  </p>
                </div>
              ) : (
                <div className="space-y-8 py-6">
                  <div className="flex flex-col items-center">
                    <div className="text-7xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 to-cyan-400 drop-shadow-sm">
                      {Math.round(((evalResult?.correctCount || score) / (evalResult?.evaluation?.length || total)) * 100) || 0}%
                    </div>
                    <p className="text-gray-400 text-lg mt-2 font-medium">
                      Final Score: {evalResult?.correctCount ?? score} / {evalResult?.evaluation?.length ?? total} Correct
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
                    <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                      <div className="text-emerald-400 font-bold text-xl">{evalResult?.correctCount ?? score}</div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Correct</div>
                    </div>
                    <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                      <div className="text-red-400 font-bold text-xl">{(evalResult?.evaluation?.length ?? total) - (evalResult?.correctCount ?? score)}</div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Incorrect</div>
                    </div>
                    <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                      <div className="text-indigo-400 font-bold text-xl">{activeTest.duration || 0}m</div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Duration</div>
                    </div>
                    <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                      <div className="text-cyan-400 font-bold text-xl">
                        {activeTest.duration - Math.floor((timeLeft || 0) / 60)}m
                      </div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Time Taken</div>
                    </div>
                  </div>

                  <div className="flex justify-center gap-4 pt-4">
                    <button
                      onClick={() => setActiveTest(null)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95 cursor-pointer"
                    >
                      Exit to Dashboard
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Detailed Breakdown */}
            {!isEvaluating && evalResult?.evaluation && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-400" />
                    Detailed Performance Analysis
                  </h3>
                  <div className="flex gap-4 text-xs">
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Correct
                    </div>
                    <div className="flex items-center gap-1.5 text-red-400">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div> Incorrect
                    </div>
                  </div>
                </div>

                <div className="grid gap-4">
                  {activeTest.questions.map((q: any, idx: number) => {
                    const result = evalResult.evaluation[idx];
                    const isCorrect = result?.isCorrect;
                    const studentAns = selectedAnswers[idx];
                    
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`bg-[#111827] border rounded-2xl p-6 relative overflow-hidden group ${isCorrect ? 'border-emerald-500/20' : 'border-red-500/20'}`}
                      >
                        <div className={`absolute top-0 left-0 w-1 h-full ${isCorrect ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                        
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="flex-1">
                            <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Question {idx + 1}</div>
                            <h4 className="text-lg font-medium text-white leading-relaxed">
                              {q.question || q.text}
                            </h4>
                          </div>
                          {isCorrect ? (
                            <div className="bg-emerald-500/20 p-2 rounded-lg shrink-0">
                              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            </div>
                          ) : (
                            <div className="bg-red-500/20 p-2 rounded-lg shrink-0">
                              <XCircle className="w-5 h-5 text-red-400" />
                            </div>
                          )}
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="bg-[#0A0F1E] border border-white/5 p-4 rounded-xl">
                            <span className="text-[10px] text-gray-500 uppercase tracking-widest block mb-2">Your Answer</span>
                            <p className="text-sm text-gray-300">
                              {q.type === 'multiple_choice' 
                                ? (studentAns !== null && q.options?.[studentAns] ? q.options[studentAns] : 'No answer provided')
                                : (studentAns || 'No answer provided')}
                            </p>
                          </div>
                          <div className="bg-[#0A0F1E] border border-white/5 p-4 rounded-xl">
                            <span className="text-[10px] text-gray-500 uppercase tracking-widest block mb-2">Correct Reference</span>
                            <p className="text-sm text-indigo-400">
                              {q.type === 'multiple_choice' 
                                ? (q.correctOption !== undefined ? q.options[q.correctOption] : q.answer)
                                : (q.answer || 'Refer to solution')}
                            </p>
                          </div>
                        </div>

                        {result?.feedback && (
                          <div className="mt-4 p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
                            <div className="flex items-center gap-2 mb-2 text-indigo-400">
                              <AlertCircle className="w-4 h-4" />
                              <span className="text-xs font-bold uppercase tracking-wider">AI Feedback</span>
                            </div>
                            <p className="text-sm text-gray-400 leading-relaxed italic">
                              "{result.feedback}"
                            </p>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <div className="flex-1 grid lg:grid-cols-3 gap-4 md:gap-6">
            <div className="lg:col-span-2 flex flex-col space-y-4 md:space-y-6">
              <div className="bg-[#111827] border border-white/10 rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-cyan-400 opacity-50"></div>
                <h2 className="text-xl md:text-2xl font-medium leading-relaxed">
                  {currentQuestion?.question ||
                    currentQuestion?.text ||
                    "Question missing text"}
                </h2>
                <div className="flex items-center justify-between mt-4">
                  <span className="inline-block px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] md:text-xs font-mono text-gray-400 uppercase">
                    {currentQuestion?.type || "multiple_choice"}
                  </span>
                  <button
                    onClick={handleAskAI}
                    disabled={isAskingAI}
                    className="flex items-center gap-1.5 md:gap-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-bold transition-colors border border-indigo-500/30 cursor-pointer shrink-0"
                  >
                    ✨ AI Help
                  </button>
                </div>
              </div>

              <div className="space-y-3 md:space-y-4">
                {currentQuestion?.type !== "multiple_choice" &&
                (!currentQuestion?.options ||
                  currentQuestion.options.length === 0) ? (
                  <textarea
                    value={selectedAnswers[currentIdx] || ""}
                    onChange={(e) => handleTextAnswer(e.target.value)}
                    placeholder="Type your answer here..."
                    className="w-full h-40 md:h-48 bg-[#111827] border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-6 focus:outline-none focus:border-indigo-500 text-white resize-none shadow-inner"
                  />
                ) : (
                  currentQuestion?.options?.map((opt: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectOption(idx)}
                      className={`w-full text-left p-4 md:p-6 rounded-xl md:rounded-2xl border transition-all duration-200 flex items-start md:items-center gap-3 md:gap-4 group hover:-translate-y-1 cursor-pointer ${
                        selectedAnswers[currentIdx] === idx
                          ? "bg-indigo-500/20 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.15)] shadow-indigo-500/20"
                          : "bg-[#111827] border-white/10 hover:bg-[#1a2333] hover:border-white/30"
                      }`}
                    >
                      <div
                        className={`w-7 h-7 md:w-8 md:h-8 rounded-full border flex items-center justify-center font-bold text-xs md:text-sm transition-colors shrink-0 ${
                          selectedAnswers[currentIdx] === idx
                            ? "bg-indigo-500 border-indigo-500 text-white"
                            : "border-white/20 text-gray-400 group-hover:border-white/50 group-hover:text-white"
                        }`}
                      >
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <span
                        className={`text-sm md:text-lg ${selectedAnswers[currentIdx] === idx ? "text-white font-medium" : "text-gray-300"}`}
                      >
                        {opt}
                      </span>
                    </button>
                  ))
                )}
              </div>

              <div className="flex flex-row justify-between items-center gap-3 md:gap-4 pt-6 md:pt-8 border-t border-white/10 mt-auto">
                <button
                  disabled={currentIdx === 0}
                  onClick={() => setCurrentIdx((prev) => prev - 1)}
                  className="px-4 md:px-6 py-2.5 md:py-3 rounded-lg md:rounded-xl font-medium text-xs md:text-base disabled:opacity-30 hover:bg-white/5 transition-colors border border-transparent disabled:hover:border-transparent hover:border-white/10 cursor-pointer"
                >
                  Previous
                </button>

                {currentIdx < (activeTest.questions?.length || 0) - 1 ? (
                  <button
                    onClick={() => setCurrentIdx((prev) => prev + 1)}
                    className="bg-white text-black hover:bg-gray-200 px-6 md:px-8 py-2.5 md:py-3 rounded-lg md:rounded-xl font-bold flex items-center gap-2 transition-transform hover:scale-105 shadow-lg shadow-white/10 cursor-pointer text-xs md:text-base"
                  >
                    Next Question <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleFinishTest()}
                    className="bg-emerald-500 hover:bg-emerald-400 text-white px-6 md:px-8 py-2.5 md:py-3 rounded-lg md:rounded-xl font-bold flex items-center gap-2 transition-transform hover:scale-105 shadow-lg shadow-emerald-500/20 cursor-pointer text-xs md:text-base"
                  >
                    Submit Test
                  </button>
                )}
              </div>
            </div>

            {/* AI Assistant Panel Side */}
            <div className="lg:col-span-1 h-full mt-4 lg:mt-0">
              <div className="bg-[#111827] border border-white/10 rounded-2xl md:rounded-3xl p-5 md:p-6 h-full flex flex-col shadow-xl lg:sticky lg:top-24 max-h-[60vh] lg:max-h-[calc(100vh-120px)] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] text-sm">
                <div className="flex flex-col gap-1.5 md:gap-2 border-b border-white/10 pb-3 md:pb-4 mb-3 md:mb-4">
                  <h3 className="text-lg md:text-xl font-bold flex items-center gap-2 text-indigo-400">
                    🤖 AI Assistant
                  </h3>
                  <p className="text-gray-400 text-[10px] md:text-xs tracking-wider uppercase font-medium">
                    Question Analyzer
                  </p>
                </div>

                <div className="space-y-1.5 md:space-y-2 mb-3 md:mb-4 bg-white/5 p-3 md:p-4 rounded-xl border border-white/10 text-xs md:text-sm">
                  <div className="flex gap-2">
                    <span className="text-gray-500 w-20 md:w-24 shrink-0">Type:</span>
                    <span className="font-medium text-gray-300 capitalize">
                      {currentQuestion?.type?.replace("_", " ") ||
                        "Multiple Choice"}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-500 w-20 md:w-24 shrink-0">Topic:</span>
                    <span className="font-medium text-gray-300">
                      {currentQuestion?.topic || "General"}
                    </span>
                  </div>
                </div>

                <div className="flex-1 flex flex-col pt-2">
                  <h4 className="font-bold text-white mb-4">
                    AI Suggested Response
                  </h4>
                  {isAskingAI ? (
                    <div className="flex items-center gap-3 text-indigo-400 bg-indigo-500/10 p-4 rounded-xl border border-indigo-500/20 animate-pulse">
                      <div className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin"></div>
                      Analyzing question...
                    </div>
                  ) : aiAssistantData[currentIdx] ? (
                    <div className="text-gray-300 space-y-4 font-mono leading-relaxed bg-[#0A0F1E] border border-white/5 p-5 rounded-xl markdown-body text-xs shadow-inner">
                      <ReactMarkdown>
                        {aiAssistantData[currentIdx]}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="text-gray-500 flex flex-col items-center justify-center p-8 text-center bg-white/5 rounded-xl border border-white/5 border-dashed">
                      <HelpCircle className="w-8 h-8 mb-3 opacity-30" />
                      <span className="block text-sm mb-1">
                        Stuck on this question?
                      </span>
                      <span className="block text-xs opacity-60">
                        Click "AI Help Assistant" to get hints, pseudo code, and
                        guidance.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
