import { useState, useEffect } from "react";
import AppLayout from "../../components/AppLayout";
import { useAuth } from "../../contexts/AuthContext";
import { db } from "../../lib/firebase";
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import {
  Calendar,
  Clock,
  ChevronRight,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Download,
  Play,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

export default function InterviewHistory() {
  const { user } = useAuth();
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInterview, setSelectedInterview] = useState<any>(null);
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchInterviews();
  }, [user]);

  const fetchInterviews = async () => {
    try {
      const q = query(
        collection(db, `users/${user!.uid}/interviews`),
        orderBy("updatedAt", "desc"),
      );
      const snapshot = await getDocs(q);
      setInterviews(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      );
    } catch (err) {
      console.error("Error fetching interviews:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async (e: React.MouseEvent, interview: any) => {
    e.stopPropagation();
    if (!user || evaluatingId) return;
    setEvaluatingId(interview.id);

    try {
      const fullTranscript = (interview.messages || [])
        .map(
          (l: any) =>
            `${l.sender === "user" ? "Candidate" : "Interviewer"}: ${l.text}`,
        )
        .join("\n\n");

      const res = await fetch("/api/evaluate-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: "Full Live Interview Session",
          answerText: fullTranscript,
          type: interview.interviewType || "Technical/HR Live Session",
          company: interview.company || "Generic",
        }),
      });
      const data = await res.json();

      const newScore = data.scores?.overall || data.overallScore || 0;

      const docRef = doc(db, `users/${user.uid}/interviews`, interview.id);
      await updateDoc(docRef, {
        evalResult: data,
        score: newScore,
      });

      setInterviews((prev) =>
        prev.map((inv) =>
          inv.id === interview.id
            ? { ...inv, evalResult: data, score: newScore }
            : inv,
        ),
      );

      if (selectedInterview && selectedInterview.id === interview.id) {
        setSelectedInterview((prev: any) => ({
          ...prev,
          evalResult: data,
          score: newScore,
        }));
      }
    } catch (err) {
      console.error("Error evaluating transcript:", err);
    } finally {
      setEvaluatingId(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/interviews`, id));
      setInterviews((prev) => prev.filter((interview) => interview.id !== id));
      if (selectedInterview?.id === id) {
        setSelectedInterview(null);
      }
    } catch (err) {
      console.error("Error deleting interview:", err);
    }
  };

  return (
    <AppLayout activeTab="interview-history">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">
              Interview History
            </h1>
            <p className="text-gray-400">
              Review your past performance and transcripts.
            </p>
          </div>
          {selectedInterview && (
            <button
              onClick={() => setSelectedInterview(null)}
              className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back to list
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {!selectedInterview ? (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {loading ? (
                <div className="flex justify-center p-8 md:p-12 text-gray-400">
                  Loading history...
                </div>
              ) : interviews.length === 0 ? (
                <div className="bg-[#111827] border border-white/5 rounded-xl p-8 md:p-12 text-center shadow-lg">
                  <FileText className="w-12 h-12 md:w-16 md:h-16 text-gray-600 mx-auto mb-3 md:mb-4" />
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-1.5 md:mb-2">
                    No Interviews Yet
                  </h3>
                  <p className="text-xs md:text-sm text-gray-400 mb-4 md:mb-6 max-w-md mx-auto">
                    Start a mock interview to evaluate your skills and generate
                    a comprehensive transcript.
                  </p>
                  <Link
                    to="/interview"
                    className="inline-flex items-center gap-1.5 md:gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 md:px-6 md:py-3 rounded-lg md:rounded-xl text-sm md:text-base font-bold transition-all shadow-lg"
                  >
                    <Play className="w-4 h-4 md:w-5 md:h-5" /> Start New
                    Interview
                  </Link>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  {interviews.map((interview) => (
                    <div
                      key={interview.id}
                      className="bg-[#111827] border border-white/10 hover:border-indigo-500/50 rounded-lg md:rounded-xl p-3 md:p-4 shadow flex flex-col items-start text-left transition-colors"
                    >
                      <div className="flex justify-between items-start w-full mb-2 md:mb-3">
                        <div className="flex-1 pr-2">
                          <h3
                            className="font-bold text-white text-sm md:text-base truncate"
                            title={interview.company}
                          >
                            {interview.company}
                          </h3>
                          <div className="text-indigo-400 text-[10px] md:text-xs font-medium">
                            {interview.interviewType}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 md:gap-2">
                          {interview.score ? (
                            <div
                              className={`px-1.5 md:px-2 py-0.5 rounded text-[10px] md:text-xs font-bold border ${interview.score >= 80 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : interview.score >= 60 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"}`}
                            >
                              {interview.score}%
                            </div>
                          ) : (
                            <button
                              onClick={(e) => handleEvaluate(e, interview)}
                              disabled={evaluatingId === interview.id}
                              className={`px-1.5 md:px-2 py-0.5 rounded text-[10px] md:text-xs font-bold border transition-colors cursor-pointer ${
                                evaluatingId === interview.id
                                  ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                                  : "bg-gray-800 text-gray-400 border-white/5 hover:bg-gray-700 hover:text-white"
                              }`}
                            >
                              {evaluatingId === interview.id
                                ? "Scoring..."
                                : "Unscored"}
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDelete(e, interview.id)}
                            className="p-1 text-gray-500 hover:text-rose-400 hover:bg-rose-400/10 rounded transition-colors cursor-pointer"
                            title="Delete History"
                          >
                            <Trash2 className="w-3 h-3 md:w-3.5 md:h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1 md:space-y-1.5 mb-3 md:mb-4 w-full text-[10px] md:text-xs">
                        <div className="flex items-center text-gray-400 gap-1.5">
                          <Calendar className="w-3 h-3 md:w-3.5 md:h-3.5" />
                          {interview.updatedAt?.toDate
                            ? `${interview.updatedAt.toDate().toLocaleDateString()} at ${interview.updatedAt.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                            : "Recent"}
                        </div>
                        <div className="flex items-center text-gray-400 gap-1.5">
                          <FileText className="w-3 h-3 md:w-3.5 md:h-3.5" />
                          {interview.messages?.length || 0} Interactions
                        </div>
                      </div>

                      <div className="mt-auto pt-2 md:pt-3 border-t border-white/5 w-full flex justify-between items-center">
                        <button
                          onClick={() => setSelectedInterview(interview)}
                          className="text-white hover:text-indigo-400 font-medium text-[10px] md:text-xs flex items-center gap-0.5 md:gap-1 transition-colors cursor-pointer"
                        >
                          View Transcript{" "}
                          <ChevronRight className="w-3 h-3 md:w-3.5 md:h-3.5" />
                        </button>
                        <Link
                          to={`/interview/session`}
                          state={{ resumeSessionId: interview.id }}
                          className="text-[9px] md:text-[10px] text-gray-400 hover:text-white font-medium border border-white/10 px-2 py-1 md:px-2.5 md:py-1.5 rounded md:rounded-md bg-[#0A0F1E] transition-colors"
                        >
                          Continue Session
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="detail"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4 md:space-y-6"
            >
              <div className="bg-[#111827] rounded-xl md:rounded-2xl p-4 md:p-8 border border-white/5 shadow-2xl">
                <div className="flex flex-wrap justify-between items-start gap-3 md:gap-4 mb-4 md:mb-6 border-b border-white/5 pb-4 md:pb-6">
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-white mb-0.5 md:mb-1">
                      {selectedInterview.company}
                    </h2>
                    <p className="text-indigo-400 font-medium text-sm md:text-base">
                      {selectedInterview.interviewType}
                    </p>
                    <div className="flex items-center gap-3 md:gap-4 mt-2 md:mt-3 text-xs md:text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 md:w-4 md:h-4" />{" "}
                        {selectedInterview.updatedAt?.toDate?.()
                          ? `${selectedInterview.updatedAt.toDate().toLocaleDateString()} at ${selectedInterview.updatedAt.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                          : "Recently"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 md:w-4 md:h-4" />{" "}
                        {selectedInterview.messages?.length || 0} messages
                      </span>
                    </div>
                  </div>
                  {selectedInterview.evalResult && (
                    <div className="text-right">
                      <div className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5 md:mb-1">
                        Overall Score
                      </div>
                      <div className="text-3xl md:text-4xl font-black text-white">
                        {selectedInterview.evalResult.overallScore ||
                          selectedInterview.evalResult.scores?.overall ||
                          0}
                        <span className="text-lg md:text-xl text-gray-500">
                          /100
                        </span>
                      </div>
                      {selectedInterview.evalResult.placementProbability && (
                        <div className="text-[10px] md:text-xs font-bold text-indigo-400 mt-1 md:mt-2">
                          {selectedInterview.evalResult.placementProbability}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {selectedInterview.evalResult &&
                  !selectedInterview.evalResult.error && (
                    <div className="mb-6 md:mb-8">
                      <h3 className="text-lg md:text-xl font-bold text-white mb-3 md:mb-4">
                        AI Evaluation Report
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3 mb-4 md:mb-6">
                        <div className="bg-[#0A0F1E] rounded-lg p-2 md:p-3 text-center border border-white/5 shadow-inner">
                          <div className="text-[9px] md:text-[10px] text-gray-500 mb-0.5 md:mb-1 uppercase tracking-wider font-bold">
                            Overall
                          </div>
                          <div className="text-lg md:text-xl font-black text-white">
                            {selectedInterview.evalResult.scores?.overall ||
                              selectedInterview.evalResult.overallScore}
                            /100
                          </div>
                        </div>
                        <div className="bg-[#0A0F1E] rounded-lg p-2 md:p-3 text-center border border-white/5">
                          <div className="text-[9px] md:text-[10px] text-gray-500 mb-0.5 md:mb-1 uppercase tracking-wider">
                            Communication
                          </div>
                          <div className="text-sm md:text-base font-bold text-indigo-400">
                            {selectedInterview.evalResult.scores
                              ?.communication ||
                              selectedInterview.evalResult.scores?.fluency ||
                              "N/A"}
                            /100
                          </div>
                        </div>
                        <div className="bg-[#0A0F1E] rounded-lg p-2 md:p-3 text-center border border-white/5">
                          <div className="text-[9px] md:text-[10px] text-gray-500 mb-0.5 md:mb-1 uppercase tracking-wider">
                            Confidence
                          </div>
                          <div className="text-sm md:text-base font-bold text-cyan-400">
                            {selectedInterview.evalResult.scores?.confidence ||
                              "N/A"}
                            /100
                          </div>
                        </div>
                        <div className="bg-[#0A0F1E] rounded-lg p-2 md:p-3 text-center border border-white/5">
                          <div className="text-[9px] md:text-[10px] text-gray-500 mb-0.5 md:mb-1 uppercase tracking-wider">
                            Technical
                          </div>
                          <div className="text-sm md:text-base font-bold text-emerald-400">
                            {selectedInterview.evalResult.scores?.technical ||
                              selectedInterview.evalResult.scores?.depth ||
                              "N/A"}
                            /100
                          </div>
                        </div>
                        <div className="bg-[#0A0F1E] rounded-lg p-2 md:p-3 text-center border border-white/5">
                          <div className="text-[9px] md:text-[10px] text-gray-500 mb-0.5 md:mb-1 uppercase tracking-wider">
                            Problem Solving
                          </div>
                          <div className="text-sm md:text-base font-bold text-amber-400">
                            {selectedInterview.evalResult.scores
                              ?.problemSolving || "N/A"}
                            /100
                          </div>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
                        <div>
                          <h4 className="text-sm md:text-base font-bold text-emerald-400 mb-2 flex items-center gap-1.5 md:gap-2">
                            <CheckCircle2 className="w-4 h-4" /> Strengths
                          </h4>
                          <ul className="space-y-1.5 md:space-y-2">
                            {(
                              selectedInterview.evalResult.feedback
                                ?.strengths ||
                              selectedInterview.evalResult.strengths ||
                              []
                            ).map((s: string, i: number) => (
                              <li
                                key={i}
                                className="text-gray-300 text-[10px] md:text-xs flex items-start gap-1.5 md:gap-2"
                              >
                                <span className="text-emerald-500 mt-0.5 md:mt-0">
                                  •
                                </span>{" "}
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-sm md:text-base font-bold text-amber-400 mb-2 flex items-center gap-1.5 md:gap-2">
                            <AlertCircle className="w-4 h-4" /> Areas for
                            Improvement
                          </h4>
                          <ul className="space-y-1.5 md:space-y-2">
                            {(
                              selectedInterview.evalResult.feedback
                                ?.weaknesses ||
                              selectedInterview.evalResult.improvements ||
                              []
                            ).map((s: string, i: number) => (
                              <li
                                key={i}
                                className="text-gray-300 text-[10px] md:text-xs flex items-start gap-1.5 md:gap-2"
                              >
                                <span className="text-amber-500 mt-0.5 md:mt-0">
                                  •
                                </span>{" "}
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {(selectedInterview.evalResult.feedback
                        ?.improvementPlan ||
                        selectedInterview.evalResult.betterAnswer) && (
                        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg md:rounded-xl p-4 md:p-5">
                          <h4 className="text-xs md:text-sm font-bold text-indigo-400 mb-1.5 md:mb-2">
                            Improvement Plan
                          </h4>
                          <p className="text-[10px] md:text-xs text-indigo-200/90 leading-relaxed text-justify">
                            {selectedInterview.evalResult.feedback
                              ?.improvementPlan?.join
                              ? selectedInterview.evalResult.feedback.improvementPlan.join(
                                  " ",
                                )
                              : selectedInterview.evalResult.feedback
                                  ?.improvementPlan ||
                                selectedInterview.evalResult.betterAnswer}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                <div>
                  <div className="flex justify-between items-center mb-4 md:mb-6">
                    <h3 className="text-lg md:text-xl font-bold text-white">
                      Full Transcript
                    </h3>
                    <button
                      onClick={() => window.print()}
                      className="text-gray-400 hover:text-white flex items-center gap-1.5 text-[10px] md:text-xs font-medium bg-[#0A0F1E] border border-white/10 px-2 py-1 md:px-3 md:py-1.5 rounded md:rounded-lg shadow-sm transition-colors cursor-pointer print:hidden"
                    >
                      <Download className="w-3 h-3 md:w-3.5 md:h-3.5" />{" "}
                      Download PDF
                    </button>
                  </div>

                  <div className="space-y-4 md:space-y-6">
                    {selectedInterview.messages?.map(
                      (log: any, index: number) => (
                        <div
                          key={log.id || index}
                          className={`flex flex-col relative group max-w-[90%] md:max-w-[85%] ${log.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"}`}
                        >
                          <div className="flex items-center gap-1.5 md:gap-2 mb-0.5 md:mb-1 px-1">
                            <span className="text-[9px] md:text-[10px] text-gray-500">
                              {log.time}
                            </span>
                            <span
                              className={`text-[9px] md:text-[10px] font-bold uppercase tracking-wider ${log.sender === "user" ? "text-emerald-400" : "text-rose-400"}`}
                            >
                              {log.sender === "user" ? "You" : "AI Interviewer"}
                            </span>
                          </div>
                          <div
                            className={`p-3 md:p-4 rounded-xl md:rounded-2xl relative shadow-sm text-xs md:text-sm ${log.sender === "user" ? "bg-emerald-500/10 border border-emerald-500/20 rounded-tr-sm text-emerald-50" : "bg-[#0A0F1E] border border-white/5 rounded-tl-sm text-gray-300"}`}
                          >
                            {log.text}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
