import { useState, useEffect } from "react";
import AppLayout from "../../components/AppLayout";
import { UserAvatar } from "../../components/UserAvatar";
import { motion, AnimatePresence } from "framer-motion";
import {
  PenTool,
  Code,
  FileText,
  Mic,
  Target,
  Trophy,
  BrainCircuit,
  LogOut,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { useAuth } from "../../contexts/AuthContext";
import { db } from "../../lib/firebase";
import {
  collection,
  getDocs,
  getDoc,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  orderBy,
  limit,
} from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";
import { safeStringify } from "../../utils/safeStringify";

export default function StudentDashboard() {
  const { profile, user, logout } = useAuth();
  const [bestResumeScore, setBestResumeScore] = useState<number | null>(null);
  const [bestInterviewScore, setBestInterviewScore] = useState<number | null>(
    null,
  );
  const [interviewInsight, setInterviewInsight] = useState<string>(
    "Take a mock interview",
  );
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [pendingTests, setPendingTests] = useState<any[]>([]);
  const [completedTestsCount, setCompletedTestsCount] = useState<number>(0);
  const [problemsSolvedCount, setProblemsSolvedCount] = useState<number>(0);
  const [platformRank, setPlatformRank] = useState<number | string>("...");
  const [rankPercentile, setRankPercentile] = useState<string>("Analyzing...");
  const [rankInsight, setRankInsight] = useState<string>(
    "Calculating your standing...",
  );
  const [roadmapProgress, setRoadmapProgress] = useState<number>(0);
  const [weeklyPerformance, setWeeklyPerformance] = useState<any[]>([]);
  const [isPerformanceLoading, setIsPerformanceLoading] = useState(true);
  const [isRankLoading, setIsRankLoading] = useState<boolean>(true);
  const [dynamicRecommendations, setDynamicRecommendations] = useState<{
    weak: string[];
    strong: string[];
    companies: { name: string; match: number }[];
  }>({
    weak: ["Graphs", "DP", "System Design"],
    strong: ["Arrays", "Strings", "Resume"],
    companies: [{ name: "Google", match: 85 }, { name: "Amazon", match: 82 }]
  });
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [totalStudents, setTotalStudents] = useState<number>(0);

  useEffect(() => {
    const usersRef = collection(db, 'users');
    const qUsers = query(usersRef, orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(qUsers, (snap) => {
      const docs = snap.docs.map(doc => doc.data());
      if (docs.length > 0) {
        setRecentUsers(docs);
      } else {
        // Fallback for demo
        setRecentUsers([
          { displayName: "Alex Rivera", email: "alex.rivera@example.com" },
          { displayName: "Siddharth Nair", email: "siddharth.n@google.com" },
          { displayName: "Maya Chen", email: "maya.c@amazon.com" },
          { displayName: "Jordan Taylor", email: "jordan.t@meta.com" },
          { displayName: "Elena Rostova", email: "elena.r@apple.com" },
          { displayName: "Chen Wei", email: "chen.w@netflix.com" },
          { displayName: "Priya Sharma", email: "priya.s@microsoft.com" },
          { displayName: "Lucas Gomes", email: "lucas.g@uber.com" },
          { displayName: "Aria Vance", email: "aria.v@anthropic.com" },
          { displayName: "Marcus Wright", email: "marcus.w@openai.com" }
        ]);
      }
      setTotalStudents(snap.size > 10 ? snap.size : 10);
    });
    return () => unsubscribe();
  }, []);

  const navigate = useNavigate();

  const defaultMastery = {
    Arrays: 0,
    Strings: 0,
    Trees: 0,
    Graphs: 0,
    "Dynamic Programming": 0,
    "Linked List": 0,
    Stack: 0,
    Queue: 0,
    "Binary Search": 0,
    Recursion: 0,
    Greedy: 0,
    Backtracking: 0,
    Heap: 0,
    Trie: 0,
    Aptitude: 0,
    Verbal: 0,
    Reasoning: 0,
    Mathematics: 0,
  };

  const [masteryData, setMasteryData] = useState(defaultMastery);

  useEffect(() => {
    const fetchMastery = async () => {
      if (!user) return;
      try {
        // Fetch mastery from user's analytics or derive from solved problems
        const docRef = doc(db, "users", user.uid, "analytics", "mastery");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setMasteryData(prev => ({ ...prev, ...docSnap.data() }));
        } else {
          // If no direct mastery doc, let's look at solved problems to derive some levels
          const q = query(collection(db, "users", user.uid, "solved_problems"));
          const snapshot = await getDocs(q);
          const topicCounts: any = {};
          snapshot.forEach(doc => {
            const data = doc.data();
            const topic = data.topic || "Unknown";
            topicCounts[topic] = (topicCounts[topic] || 0) + 1;
          });
          
          const newMastery = { ...defaultMastery };
          Object.keys(topicCounts).forEach(topic => {
            if (topic in newMastery) {
              // Simple heuristic: 5 problems = 50% mastery, 10 problems = 90%
              (newMastery as any)[topic] = Math.min(95, topicCounts[topic] * 10);
            }
          });
          setMasteryData(newMastery);
        }
      } catch (e) {
        console.error("Error fetching mastery data:", e);
      }
    };
    fetchMastery();
  }, [user]);

  useEffect(() => {
    // Dynamically calculate recommendations based on mastery and performance
    const topics = Object.entries(masteryData);
    const weak = topics
      .filter(([_, value]) => value < 40)
      .slice(0, 3)
      .map(([name]) => name);
    
    const strong = topics
      .filter(([_, value]) => value >= 70)
      .slice(0, 3)
      .map(([name]) => name);

    // If none are strong yet, add some defaults or resume if score is good
    if (strong.length === 0 && bestResumeScore && bestResumeScore > 70) strong.push("Resume");
    if (strong.length === 0) strong.push("Communication");

    // Company matching logic based on top skills
    const companyPool = [
      { name: "Google", focus: ["Dynamic Programming", "Graphs", "Trees"], baseMatch: 60 },
      { name: "Amazon", focus: ["Arrays", "Trees", "Stack"], baseMatch: 65 },
      { name: "Microsoft", focus: ["Strings", "Linked Lists", "System Design"], baseMatch: 62 },
      { name: "Meta", focus: ["Graphs", "Arrays", "DP"], baseMatch: 58 },
      { name: "TCS", focus: ["Aptitude", "Verbal", "Reasoning"], baseMatch: 75 },
      { name: "Infosys", focus: ["Aptitude", "Resume", "Mathematics"], baseMatch: 72 },
      { name: "Wipro", focus: ["Aptitude", "Communication", "Reasoning"], baseMatch: 70 },
      { name: "Accenture", focus: ["Communication", "Aptitude", "Resume"], baseMatch: 78 }
    ];

    const matchedCompanies = companyPool
      .map(company => {
        let score = company.baseMatch;
        company.focus.forEach(skill => {
          if (masteryData[skill as keyof typeof masteryData] > 60) score += 5;
          if (masteryData[skill as keyof typeof masteryData] > 80) score += 5;
        });
        // Boost based on overall activity
        score += Math.min(10, (problemsSolvedCount / 10));
        return { name: company.name, match: Math.min(98, score) };
      })
      .sort((a, b) => b.match - a.match)
      .slice(0, 3);

    setDynamicRecommendations({
      weak: weak.length > 0 ? weak : ["No weak areas identified"],
      strong: strong,
      companies: matchedCompanies
    });
  }, [masteryData, problemsSolvedCount, bestResumeScore]);

  useEffect(() => {
    const fetchRoadmapProgress = async () => {
      if (!user) return;
      try {
        const q = query(collection(db, "users", user.uid, "roadmap_data"));
        const snapshot = await getDocs(q);
        let completed = 0;
        let total = 100; // Expected total topics roughly
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.completedTopics) {
            completed += Object.keys(data.completedTopics).length;
          }
        });
        setRoadmapProgress(Math.min(100, Math.round((completed / total) * 100)));
      } catch (e) {
        console.error("Error fetching roadmap progress:", e);
      }
    };
    fetchRoadmapProgress();
  }, [user]);

  useEffect(() => {
    // Generate multi-dimensional performance data
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const now = new Date();
    const currentDayIdx = now.getDay() === 0 ? 6 : now.getDay() - 1;

    const newWeeklyData = days.map((day, idx) => {
      const seed = idx + 1;
      const isPast = idx <= currentDayIdx;
      
      // Calculate growth trend
      const trend = isPast ? (idx + 1) / (currentDayIdx + 1) : 0;
      
      // Base metrics with some variation
      const getMetric = (base: number, volatility: number) => {
        const variation = Math.sin(seed * volatility) * 10;
        return isPast ? Math.round(Math.max(0, Math.min(100, (base * trend) + variation))) : null;
      };

      return {
        day,
        "Coding": getMetric(problemsSolvedCount * 2, 0.5),
        "Aptitude": getMetric(80, 0.3),
        "Companies": getMetric(70, 0.7),
        "Roadmaps": getMetric(roadmapProgress, 0.4),
        "Tests": getMetric(completedTestsCount * 15, 0.6),
        "Resume": getMetric(bestResumeScore || 60, 0.2),
        "Interviews": getMetric(bestInterviewScore || 50, 0.8),
        "Overall": getMetric(75, 0.1),
        benchmark: 70 + (idx * 2)
      };
    });

    setWeeklyPerformance(newWeeklyData);
    setIsPerformanceLoading(false);
  }, [problemsSolvedCount, completedTestsCount, bestResumeScore, bestInterviewScore, roadmapProgress]);
  useEffect(() => {
    // Listen for pending released tests
    const q = query(
      collection(db, "released_tests"),
      where("active", "==", true),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tests: any[] = [];
      const now = new Date();
      snapshot.forEach((doc) => {
        const test: any = { id: doc.id, ...doc.data() };
        if (test.assignDate && test.assignTime) {
          const assignDateTime = new Date(
            `${test.assignDate}T${test.assignTime}`,
          );
          const endTime = new Date(
            assignDateTime.getTime() + (test.duration || 60) * 60000,
          );
          if (now <= endTime) {
            tests.push(test);
          }
        } else {
          tests.push(test);
        }
      });
      setPendingTests(tests);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      try {
        const qResume = query(
          collection(db, "resume_history"),
          where("userId", "==", user.uid),
        );
        const resumeSnapshot = await getDocs(qResume);
        let maxScore = 0;
        let hasRecords = false;
        resumeSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.result && typeof data.result.atsScore === "number") {
            hasRecords = true;
            if (data.result.atsScore > maxScore) {
              maxScore = data.result.atsScore;
            }
          }
        });
        if (hasRecords) {
          setBestResumeScore(maxScore);
        }

        const qTests = query(
          collection(db, "completed_tests"),
          where("userId", "==", user.uid),
        );
        const testsSnapshot = await getDocs(qTests);
        setCompletedTestsCount(testsSnapshot.size);

        let totalQuestionsSolved = 0;

        // Count questions from tests
        testsSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.score) {
            totalQuestionsSolved += data.score;
          }
        });

        // Count unique successful submissions from DsaWorkspace (LeetCode/Company)
        const qSubmissions = query(
          collection(db, "users", user.uid, "submissions"),
          where("status", "==", "Accepted"),
        );
        const submissionsSnapshot = await getDocs(qSubmissions);
        // Can be duplicates if submitted multiple times, but let's count unique question topics/indexes
        const uniqueQuestions = new Set();
        submissionsSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.questionTopic || data.questionIndex !== undefined) {
            uniqueQuestions.add(`${data.questionTopic}-${data.questionIndex}`);
          }
        });

        totalQuestionsSolved += uniqueQuestions.size;

        setProblemsSolvedCount(totalQuestionsSolved);

        // Fetch best interview score
        try {
          const qInterviews = collection(db, "users", user.uid, "interviews");
          const interviewsSnapshot = await getDocs(qInterviews);
          let maxInterviewScore = 0;
          let hasInterviews = false;
          let bestFeedback = "";
          interviewsSnapshot.forEach((doc) => {
            const data = doc.data();
            const score =
              data.evalResult?.overallScore ||
              data.evalResult?.scores?.overall ||
              data.score ||
              0;
            if (score > maxInterviewScore) {
              maxInterviewScore = score;
              bestFeedback =
                data.evalResult?.strengths?.[0] ||
                data.evalResult?.feedback?.strengths?.[0] ||
                data.evalResult?.improvements?.[0] ||
                "Good communication";
            }
            if (data.score || data.evalResult) {
              hasInterviews = true;
            }
          });
          if (hasInterviews) {
            setBestInterviewScore(maxInterviewScore);
            if (bestFeedback) {
              setInterviewInsight(bestFeedback);
            } else if (maxInterviewScore > 80) {
              setInterviewInsight("Strong Technical Skills");
            } else {
              setInterviewInsight("Needs Improvement");
            }
          }
        } catch (e) {
          console.error("Error fetching interviews:", e);
        }
      } catch (err: any) {
        if (err.code === 'unavailable' || err.message?.includes('offline')) {
          console.warn("Firestore is offline, using current session data.");
        } else {
          console.error("Error fetching stats:", err);
        }
      }
    };
    fetchStats();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const evaluateRank = async () => {
      setIsRankLoading(true);
      try {
        // Calculate current user's real-time score
        const myOverallScore =
          problemsSolvedCount * 15 +
          completedTestsCount * 25 +
          (bestResumeScore || 0) +
          (bestInterviewScore || 0);

        // Update the current user's document in Firestore with their metrics
        try {
          const userRef = doc(db, "users", user.uid);
          await setDoc(
            userRef,
            {
              stats: {
                problemsSolved: problemsSolvedCount,
                completedTests: completedTestsCount,
                bestResumeScore: bestResumeScore || 0,
                bestInterviewScore: bestInterviewScore || 0,
                overallScore: myOverallScore,
                updatedAt: new Date().toISOString(),
              },
            },
            { merge: true },
          );
        } catch (dbErr: any) {
          if (dbErr.code === 'unavailable' || dbErr.message?.includes('offline')) {
             console.warn("Firestore offline: rank update deferred.");
          } else {
             console.warn("Could not save updated stats to Firestore:", dbErr);
          }
        }

        // Fetch all registered users to compute relative rank
        const usersRef = collection(db, "users");
        const usersSnapshot = await getDocs(usersRef);
        const allStudents = usersSnapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const isCurrentUser = docSnap.id === user.uid;

          let overallScore = data.stats?.overallScore;
          if (overallScore === undefined) {
            // Cold-start fallback: Generate deterministic score based on display name/id
            const charCodeSum = (data.displayName || data.email || docSnap.id)
              .split("")
              .reduce(
                (acc: number, char: string) => acc + char.charCodeAt(0),
                0,
              );
            overallScore =
              (charCodeSum % 15) * 15 +
              (charCodeSum % 8) * 25 +
              (charCodeSum % 40) +
              40;
          }

          if (isCurrentUser) {
            overallScore = myOverallScore;
          }

          return {
            uid: docSnap.id,
            displayName: data.displayName || "Student",
            overallScore,
          };
        });

        // Sort all students by overallScore in descending order
        allStudents.sort((a, b) => b.overallScore - a.overallScore);

        // Find current user's position
        const myIdx = allStudents.findIndex((s) => s.uid === user.uid);
        const calculatedRank = myIdx !== -1 ? myIdx + 1 : 1;
        const totalStudentsCount = allStudents.length;

        // Set visual rank and percentile
        setPlatformRank(`#${calculatedRank} / ${totalStudentsCount}`);
        const percentileNum = Math.max(
          1,
          Math.round((calculatedRank / totalStudentsCount) * 100),
        );
        setRankPercentile(`Top ${percentileNum}% of all students`);

        // Get AI recommendation based on the actual leaderboard standing
        try {
          const res = await fetch("/api/analyze-platform-rank", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              rank: calculatedRank,
              totalStudents: totalStudentsCount,
              tests: completedTestsCount,
              problems: problemsSolvedCount,
              resume: bestResumeScore || 0,
              interview: bestInterviewScore || 0,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.insight) {
              setRankInsight(data.insight);
            } else {
              setRankInsight("Practice more mock tests to rank higher!");
            }
          } else {
            // Fallback recommendation
            setRankInsight(
              percentileNum <= 20
                ? "Excellent standing! Solve more hard DSA problems to secure your #1 spot."
                : "Great progress! Try another mock interview or complete test papers to improve your rank.",
            );
          }
        } catch (aiErr) {
          console.warn(
            "AI Rank analysis had issues, using local fallback:",
            aiErr,
          );
          setRankInsight(
            percentileNum <= 20
              ? "Excellent standing! Solve more hard DSA problems to secure your #1 spot."
              : "Great progress! Try another mock interview or complete test papers to improve your rank.",
          );
        }
      } catch (err) {
        console.error("Failed to fetch platform rank", err);
        setPlatformRank("#1");
        setRankPercentile("Top 100%");
        setRankInsight("Take tests or solve problems to improve your stand.");
      } finally {
        setIsRankLoading(false);
      }
    };

    const timer = setTimeout(() => {
      evaluateRank();
    }, 1500);
    return () => clearTimeout(timer);
  }, [
    completedTestsCount,
    problemsSolvedCount,
    bestResumeScore,
    bestInterviewScore,
    user,
  ]);

  const radarData = [
    { subject: "Aptitude", current: 82, benchmark: 90 },
    { subject: "Coding", current: Math.min(100, Math.round((problemsSolvedCount / 50) * 100)), benchmark: 85 },
    { subject: "Company Prep", current: 75, benchmark: 95 },
    { subject: "Roadmaps", current: roadmapProgress, benchmark: 90 },
    { subject: "Resume", current: bestResumeScore || 0, benchmark: 85 },
    { subject: "Tests", current: Math.min(100, completedTestsCount * 15), benchmark: 80 },
    { subject: "Interviews", current: bestInterviewScore || 0, benchmark: 88 },
  ];


  const topicMastery = { ...defaultMastery, ...(profile?.topicMastery || {}) };
  const getBarColor = (value: number) => {
    if (value <= 20) return "#ef4444"; // Beginner (Red)
    if (value <= 40) return "#f97316"; // Learning (Orange)
    if (value <= 60) return "#facc15"; // Intermediate (Yellow)
    if (value <= 80) return "#4ade80"; // Advanced (Green)
    return "#166534"; // Expert (Dark Green)
  };

  const barData = Object.entries(masteryData).map(([name, value]) => ({
    name,
    value: Number(value),
    fill: getBarColor(Number(value)),
  }));

  const sortedMastery = [...barData].sort((a, b) => b.value - a.value);
  const strongestTopic = barData.some((d) => d.value > 0)
    ? `${sortedMastery[0].name} (${sortedMastery[0].value}%)`
    : "None (Start practicing!)";
  const weakestTopic = barData.some((d) => d.value > 0)
    ? `${sortedMastery[sortedMastery.length - 1].name} (${sortedMastery[sortedMastery.length - 1].value}%)`
    : "None";

  const getAIRecommendation = () => {
    if (!barData.some((d) => d.value > 0)) {
      return "You haven't started practicing yet. Begin with basic topics like Arrays and Strings.";
    }
    const strong = sortedMastery
      .slice(0, 2)
      .map((d) => d.name)
      .join(" and ");
    const weak = sortedMastery
      .slice(-2)
      .map((d) => d.name)
      .join(" and ");
    return `You are performing well in ${strong}. Focus on ${weak} to improve placement readiness.`;
  };

  return (
    <AppLayout activeTab="dashboard">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 pb-20">
        <div className="flex justify-between items-start sm:items-center gap-3 bg-[#0d1326] -mx-4 md:-mx-8 -mt-4 md:-mt-8 p-4 md:p-6 border-b border-white/5 mb-4 md:mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold mb-0.5">
              Welcome Back,{" "}
              {profile?.displayName?.split(" ")[0] ||
                profile?.firstName ||
                "Student"}{" "}
              👋
            </h2>
            <p className="text-[10px] md:text-xs text-gray-400">
              Ready to continue your placement journey?
            </p>
          </div>
          <div className="relative relative-avatar flex-shrink-0">
            <button
              onClick={() => setShowLogoutPopup(!showLogoutPopup)}
              className="group flex-shrink-0 focus:outline-none cursor-pointer"
            >
              <UserAvatar
                profile={profile}
                className="w-10 h-10 text-base group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.6)] border-indigo-500/30 hover:border-indigo-500/50 transition-all duration-300"
              />
            </button>
            <AnimatePresence>
              {showLogoutPopup && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-14 w-48 bg-[#1E293B] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50"
                >
                  <div className="p-4 border-b border-white/10">
                    <p className="text-sm font-medium text-white truncate">
                      {profile?.displayName || "User"}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {profile?.email || "email@example.com"}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      localStorage.removeItem("demo_admin_bypass");
                      logout();
                      navigate("/auth/login");
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-white/5 transition-colors text-sm font-medium text-left cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Live Lobby Section */}
        <div className="bg-[#111827] border border-white/5 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 mb-6 shadow-[0_0_40px_rgba(0,0,0,0.2)] animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 rounded-xl relative">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                Live Preparation Lobby
                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter border border-emerald-500/20">Active</span>
              </h4>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Students currently preparing smarter with AI</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex -space-x-3">
              {recentUsers.slice(0, 20).map((u, i) => (
                <div key={i} className="relative group/user">
                  <UserAvatar 
                    profile={u} 
                    className="w-8 h-8 border-2 border-[#0B0D17] text-[10px] hover:scale-125 hover:-translate-y-2 transition-all duration-300 relative z-10 hover:z-50 cursor-pointer shadow-xl" 
                  />
                  <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-[#1a1f33] border border-white/10 rounded-xl p-3 opacity-0 group-hover/user:opacity-100 transition-all duration-300 translate-y-2 group-hover/user:translate-y-0 text-xs whitespace-nowrap z-[100] shadow-2xl backdrop-blur-md pointer-events-none min-w-[160px]">
                     <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
                        <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px] font-bold text-indigo-400">
                          {u.displayName?.charAt(0) || 'S'}
                        </div>
                        <div className="font-bold text-white text-sm truncate">{u.displayName || 'Student'}</div>
                     </div>
                     <div className="text-gray-400 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-indigo-400 shrink-0" />
                        <span className="truncate">{u.email || 'Preparing...'}</span>
                     </div>
                     <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#1a1f33] rotate-45 border-r border-b border-white/10"></div>
                  </div>
                </div>
              ))}
              {recentUsers.length > 20 && (
                <div className="w-8 h-8 rounded-full bg-[#1e293b] border-2 border-[#0B0D17] flex items-center justify-center text-[10px] font-bold text-indigo-400 z-10 relative shadow-lg">
                  +{recentUsers.length - 20}
                </div>
              )}
            </div>
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5">
                <span className="text-indigo-400 font-black text-lg">{totalStudents}</span>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Students</span>
              </div>
              <div className="h-1 w-12 bg-indigo-500/20 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 animate-[loading_2s_ease-in-out_infinite]" style={{ width: '40%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Test Alert Priority View */}
        {pendingTests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="relative overflow-hidden rounded-xl bg-red-500/10 border border-red-500/30 p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between shadow-[0_0_20px_rgba(239,68,68,0.15)] gap-4">
              {/* Blinking gradient background */}
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-transparent animate-pulse pointer-events-none"></div>

              <div className="flex items-start gap-3 md:gap-4 z-10 w-full">
                <div className="relative flex h-8 w-8 md:h-10 md:w-10 shrink-0 items-center justify-center mt-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <div className="relative bg-red-500 p-2 md:p-2.5 rounded-full shadow-md md:shadow-lg shadow-red-500/50">
                    <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-red-400 mb-1 flex items-center gap-2">
                    Official Test Alert{" "}
                    <span className="text-[10px] md:text-xs px-1.5 py-0.5 md:px-2 md:py-0.5 bg-red-500/20 text-red-300 rounded font-bold uppercase tracking-wider animate-pulse border border-red-500/50">
                      Live
                    </span>
                  </h3>
                  <p className="text-xs md:text-sm text-gray-300">
                    You have {pendingTests.length} new test
                    {pendingTests.length > 1 ? "s" : ""} assigned by the admin.
                    Please take them as soon as possible.
                  </p>
                </div>
              </div>
              <Link
                to="/tests"
                className="shrink-0 bg-red-500 hover:bg-red-400 text-white text-xs md:text-sm font-bold px-4 py-2.5 md:px-6 md:py-3 rounded-lg md:rounded-xl transition-transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 z-10 w-full md:w-auto"
              >
                Go to Tests Section{" "}
                <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </Link>
            </div>
          </motion.div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4 lg:gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#111827] border border-white/10 rounded-xl p-3 md:p-4 relative overflow-hidden group hover:-translate-y-1 hover:shadow-lg hover:border-[#6366f1]/50 transition-all duration-300"
          >
            <div className="flex justify-between items-start mb-1.5 md:mb-2">
              <div className="text-gray-400 font-medium text-[9px] md:text-[10px] uppercase tracking-wider">
                Tests Taken
              </div>
              <div className="w-5 h-5 md:w-6 md:h-6 rounded-md bg-indigo-500/10 flex items-center justify-center">
                <BrainCircuit className="w-3 h-3 md:w-3.5 md:h-3.5 text-indigo-500" />
              </div>
            </div>
            <div className="text-lg md:text-xl font-bold mb-1.5 md:mb-2">
              {completedTestsCount}
            </div>
            <div className="text-[9px] md:text-[10px] text-emerald-400 font-medium flex items-center gap-1">
              ▲ 12% vs last week
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-[#111827] border border-white/10 rounded-xl p-3 md:p-4 relative overflow-hidden group hover:-translate-y-1 hover:shadow-lg hover:border-[#22d3ee]/50 transition-all duration-300"
          >
            <div className="flex justify-between items-start mb-1.5 md:mb-2">
              <div className="text-gray-400 font-medium text-[9px] md:text-[10px] uppercase tracking-wider">
                Problems Solved
              </div>
              <div className="w-5 h-5 md:w-6 md:h-6 rounded-md bg-cyan-500/10 flex items-center justify-center">
                <Code className="w-3 h-3 md:w-3.5 md:h-3.5 text-cyan-500" />
              </div>
            </div>
            <div className="text-lg md:text-xl font-bold mb-1.5 md:mb-2">
              {problemsSolvedCount}
            </div>
            <div className="text-[9px] md:text-[10px] text-emerald-400 font-medium flex items-center gap-1">
              ▲ 8% vs last week
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#111827] border border-white/10 rounded-xl p-3 md:p-4 relative overflow-hidden group hover:-translate-y-1 hover:shadow-lg hover:border-[#10b981]/50 transition-all duration-300"
          >
            <div className="flex justify-between items-start mb-1.5 md:mb-2">
              <div className="text-gray-400 font-medium text-[9px] md:text-[10px] uppercase tracking-wider">
                Resume ATS Score
              </div>
              <div className="w-5 h-5 md:w-6 md:h-6 rounded-md bg-emerald-500/10 flex items-center justify-center">
                <FileText className="w-3 h-3 md:w-3.5 md:h-3.5 text-emerald-500" />
              </div>
            </div>
            <div className="text-lg md:text-xl font-bold mb-1.5 md:mb-2">
              {bestResumeScore !== null ? bestResumeScore : "N/A"}
              <span className="text-[10px] md:text-xs text-gray-500 font-semibold">
                {bestResumeScore !== null ? "/100" : ""}
              </span>
            </div>
            <div className="text-[9px] md:text-[10px] text-emerald-400 font-medium flex items-center gap-1">
              ▲ 4% vs last week
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-[#111827] border border-white/10 rounded-xl p-3 md:p-4 relative overflow-hidden group hover:-translate-y-1 hover:shadow-lg hover:border-[#f59e0b]/50 transition-all duration-300"
          >
            <div className="flex justify-between items-start mb-1.5 md:mb-2">
              <div className="text-gray-400 font-medium text-[9px] md:text-[10px] uppercase tracking-wider">
                Interview Readiness
              </div>
              <div className="w-5 h-5 md:w-6 md:h-6 rounded-md bg-amber-500/10 flex items-center justify-center">
                <Mic className="w-3 h-3 md:w-3.5 md:h-3.5 text-amber-500" />
              </div>
            </div>
            <div className="text-lg md:text-xl font-bold mb-1.5 md:mb-2">
              {bestInterviewScore !== null ? bestInterviewScore : "N/A"}
              <span className="text-[10px] md:text-xs text-gray-500 font-semibold">
                {bestInterviewScore !== null ? "/100" : ""}
              </span>
            </div>
            <div
              className="text-[9px] md:text-[10px] text-gray-400 font-medium flex items-center gap-1 line-clamp-1 break-all truncate"
              title={interviewInsight}
            >
              <BrainCircuit className="w-3 h-3 text-indigo-400" />{" "}
              {interviewInsight}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#111827] border border-white/10 rounded-xl p-3 md:p-4 relative overflow-hidden group hover:-translate-y-1 hover:shadow-lg hover:border-[#8b5cf6]/50 transition-all duration-300"
          >
            <div className="flex justify-between items-start mb-1.5 md:mb-2">
              <div className="text-gray-400 font-medium text-[9px] md:text-[10px] uppercase tracking-wider">
                Placement Readiness
              </div>
              <div className="w-5 h-5 md:w-6 md:h-6 rounded-md bg-purple-500/10 flex items-center justify-center">
                <Target className="w-3 h-3 md:w-3.5 md:h-3.5 text-purple-500" />
              </div>
            </div>
            <div className="text-lg md:text-xl font-bold mb-1.5 md:mb-2">
              76
              <span className="text-[10px] md:text-xs text-gray-500 font-semibold">
                %
              </span>
            </div>
            <div className="text-[9px] md:text-[10px] text-emerald-400 font-medium flex items-center gap-1">
              ▲ 5% vs last week
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-[#111827] border border-white/10 rounded-xl p-3 md:p-4 relative overflow-hidden group hover:-translate-y-1 hover:shadow-lg hover:border-[#3b82f6]/50 transition-all duration-300"
          >
            <div className="flex justify-between items-start mb-1.5 md:mb-2">
              <div className="text-gray-400 font-medium text-[9px] md:text-[10px] uppercase tracking-wider">
                Platform Rank
              </div>
              <div className="w-5 h-5 md:w-6 md:h-6 rounded-md bg-blue-500/10 flex items-center justify-center">
                <Trophy className="w-3 h-3 md:w-3.5 md:h-3.5 text-blue-400" />
              </div>
            </div>
            <div className="text-lg md:text-xl font-bold mb-1.5 md:mb-2">
              {isRankLoading ? (
                <span className="animate-pulse text-gray-500">...</span>
              ) : (
                platformRank
              )}
            </div>
            <div className="text-[9px] md:text-[10px] text-gray-500 font-medium flex flex-col gap-1">
              <span>{isRankLoading ? "Analyzing..." : rankPercentile}</span>
              <span className="text-[8px] md:text-[9px] text-indigo-400 mt-1.5 pt-1.5 border-t border-white/5 line-clamp-2">
                {isRankLoading ? "Calculating standing..." : rankInsight}
              </span>
            </div>
          </motion.div>
        </div>

        {/* AI Recommendation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-[#111827] border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-6 hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
        >
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <h3 className="text-base md:text-lg font-bold flex items-center gap-2">
              🤖 AI Recommendation
            </h3>
            <span className="text-[10px] md:text-xs text-gray-400">
              Updated weekly
            </span>
          </div>

          <div className="grid md:grid-cols-3 gap-4 md:gap-6">
            <div>
              <h4 className="flex items-center gap-2 text-rose-400 font-medium text-xs md:text-sm mb-2 md:mb-3">
                <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-rose-400"></div>{" "}
                Weak Areas
              </h4>
              <div className="flex flex-wrap gap-1.5 md:gap-2">
                {dynamicRecommendations.weak.map((area, idx) => (
                  <span key={idx} className="px-2 py-0.5 md:px-3 md:py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-md md:rounded-full text-[10px] md:text-xs">
                    {area}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="flex items-center gap-2 text-emerald-400 font-medium text-xs md:text-sm mb-2 md:mb-3">
                <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-emerald-400"></div>{" "}
                Strong Areas
              </h4>
              <div className="flex flex-wrap gap-1.5 md:gap-2">
                {dynamicRecommendations.strong.map((area, idx) => (
                  <span key={idx} className="px-2 py-0.5 md:px-3 md:py-1 bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 rounded-md md:rounded-full text-[10px] md:text-xs">
                    {area}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="flex items-center gap-2 text-cyan-400 font-medium text-xs md:text-sm mb-2 md:mb-3">
                <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-cyan-400"></div>{" "}
                Best-Fit Companies
              </h4>
              <div className="flex flex-wrap gap-1.5 md:gap-2">
                {dynamicRecommendations.companies.map((company, idx) => (
                  <span key={idx} className="px-2 py-0.5 md:px-3 md:py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-md md:rounded-full text-[10px] md:text-xs">
                    {company.name} • {company.match}%
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-4 md:gap-6 mt-4 md:mt-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-[#111827] border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-6 hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base md:text-lg font-bold">Comprehensive Skill Radar</h3>
              <div className="px-2 py-1 bg-indigo-500/10 rounded border border-indigo-500/20">
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Live Analysis</span>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#1f2937" />
                  <PolarAngleAxis 
                    dataKey="subject" 
                    tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 500 }} 
                  />
                  <Radar
                    name="Benchmark"
                    dataKey="benchmark"
                    stroke="#374151"
                    fill="#374151"
                    fillOpacity={0.1}
                  />
                  <Radar
                    name="Your Score"
                    dataKey="current"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.5}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0d1326', 
                      borderColor: '#1e293b', 
                      borderRadius: '12px',
                      fontSize: '12px'
                    }} 
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-[#111827] border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-6 hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-base md:text-lg font-bold">
                  Performance Analytics
                </h3>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Analyzing Aptitude, Coding, Resume, Tests & Interviews
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                  <span className="text-[9px] text-gray-400 uppercase font-bold">Your Score</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-gray-700"></div>
                  <span className="text-[9px] text-gray-400 uppercase font-bold">Benchmark</span>
                </div>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={weeklyPerformance}
                  margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#1f2937"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    stroke="#6b7280"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis
                    stroke="#6b7280"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                    tickCount={6}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0d1326",
                      borderColor: "#1e293b",
                      borderRadius: "12px",
                      fontSize: "12px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)"
                    }}
                    itemStyle={{ padding: "2px 0", color: "#fff" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="benchmark"
                    stroke="#374151"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="Overall"
                    stroke="#6366f1"
                    strokeWidth={3}
                    dot={{ fill: "#6366f1", strokeWidth: 2, r: 4, stroke: "#111827" }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                  <Line type="monotone" dataKey="Coding" stroke="#10b981" strokeWidth={1} dot={false} strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="Aptitude" stroke="#f59e0b" strokeWidth={1} dot={false} strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="Companies" stroke="#ec4899" strokeWidth={1} dot={false} strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="Roadmaps" stroke="#8b5cf6" strokeWidth={1} dot={false} strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="Tests" stroke="#ef4444" strokeWidth={1} dot={false} strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="Resume" stroke="#06b6d4" strokeWidth={1} dot={false} strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="Interviews" stroke="#64748b" strokeWidth={1} dot={false} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2 pt-4 border-t border-white/5">
              <div className="text-center">
                <p className="text-[8px] text-gray-500 uppercase font-bold mb-1">LeetCode</p>
                <p className="text-xs font-bold text-white">{problemsSolvedCount}</p>
              </div>
              <div className="text-center border-l border-white/5">
                <p className="text-[8px] text-gray-500 uppercase font-bold mb-1">Roadmaps</p>
                <p className="text-xs font-bold text-white">{roadmapProgress}%</p>
              </div>
              <div className="text-center border-l border-white/5">
                <p className="text-[8px] text-gray-500 uppercase font-bold mb-1">Tests</p>
                <p className="text-xs font-bold text-white">{completedTestsCount}</p>
              </div>
              <div className="text-center border-l border-white/5">
                <p className="text-[8px] text-gray-500 uppercase font-bold mb-1">Aptitude</p>
                <p className="text-xs font-bold text-white">80%</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* LeetCode Topic Mastery */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-[#111827] border border-white/10 rounded-3xl p-6 hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
        >
          <h3 className="text-xl font-bold mb-6">LeetCode Topic Mastery</h3>
          <div
            style={{ height: `${Math.max(300, barData.length * 40)}px` }}
            className="min-h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={barData}
                margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1f2937"
                  horizontal={true}
                  vertical={false}
                />
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#9ca3af"
                  fontSize={12}
                  tickLine={false}
                  axisLine={true}
                />
                <Tooltip
                  cursor={{ fill: "#1f2937", opacity: 0.4 }}
                  contentStyle={{
                    backgroundColor: "#111827",
                    borderColor: "#374151",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`${value}%`, "Mastery"]}
                />
                <Bar dataKey="value" barSize={20} radius={[0, 4, 4, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Dashboard Insights */}
          <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="flex items-center gap-2 text-emerald-400 font-medium mb-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>{" "}
                Strongest Topic
              </h4>
              <p className="text-white font-bold">{strongestTopic}</p>
            </div>
            <div>
              <h4 className="flex items-center gap-2 text-rose-400 font-medium mb-2">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-400"></div>{" "}
                Weakest Topic
              </h4>
              <p className="text-white font-bold">{weakestTopic}</p>
            </div>
            <div className="md:col-span-2">
              <h4 className="flex items-center gap-2 text-indigo-400 font-medium mb-2">
                <BrainCircuit className="w-4 h-4" /> AI Recommendation
              </h4>
              <p className="text-gray-300 italic text-sm">
                {getAIRecommendation()}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
