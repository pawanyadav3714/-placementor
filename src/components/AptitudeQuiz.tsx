import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, XCircle, AlertCircle, 
  ChevronRight, ChevronLeft, RotateCcw, 
  Award, BarChart2, Clock, Trash2, Zap, Brain
} from 'lucide-react';
import { MCQQuestion, QuizAttempt } from '../types';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

interface AptitudeQuizProps {
  questions: MCQQuestion[];
  onClose?: () => void;
}

export default function AptitudeQuiz({ questions, onClose }: AptitudeQuizProps) {
  const { user } = useAuth();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(questions.length * 60); // 1 minute per question
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    if (isFinished) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          finishQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isFinished]);

  const handleAnswer = (optionIndex: number) => {
    if (isFinished) return;
    const letter = String.fromCharCode(65 + optionIndex);
    setAnswers({ ...answers, [currentIdx]: letter });
    setShowExplanation(true);
  };

  const nextQuestion = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setShowExplanation(false);
    } else {
      finishQuiz();
    }
  };

  const prevQuestion = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
      setShowExplanation(false);
    }
  };

  const finishQuiz = async () => {
    setIsFinished(true);
    
    // Calculate results
    let correct = 0;
    let wrong = 0;
    let skipped = 0;
    
    const details = questions.map((q, idx) => {
      const studentAnswer = answers[idx] || '';
      const isCorrect = studentAnswer === q.correctAnswer;
      if (!studentAnswer) skipped++;
      else if (isCorrect) correct++;
      else wrong++;
      
      return {
        questionId: q.id || `q-${idx}`,
        studentAnswer,
        isCorrect
      };
    });

    const percentage = (correct / questions.length) * 100;
    let performanceLevel: QuizAttempt['performanceLevel'] = 'Beginner';
    if (percentage >= 90) performanceLevel = 'Expert';
    else if (percentage >= 70) performanceLevel = 'Advanced';
    else if (percentage >= 40) performanceLevel = 'Intermediate';

    const attempt: QuizAttempt = {
      userId: user?.uid || 'anonymous',
      date: new Date().toISOString(),
      score: correct,
      totalQuestions: questions.length,
      correctAnswers: correct,
      wrongAnswers: wrong,
      skipped: skipped,
      accuracy: Math.round((correct / (questions.length - skipped || 1)) * 100),
      percentage: Math.round(percentage),
      performanceLevel,
      details
    };

    try {
      await addDoc(collection(db, 'aptitude_attempts'), attempt);
    } catch (err) {
      console.error("Failed to save attempt:", err);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isFinished) {
    const correct = questions.filter((q, i) => answers[i] === q.correctAnswer).length;
    const percentage = Math.round((correct / questions.length) * 100);

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#0f172a] border border-white/10 rounded-3xl p-8 max-w-4xl mx-auto shadow-2xl overflow-hidden relative"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
        
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-indigo-500/10 rounded-full mb-4">
            <Award className="w-12 h-12 text-indigo-400" />
          </div>
          <h2 className="text-3xl font-extrabold text-white mb-2">Quiz Completed!</h2>
          <p className="text-gray-400">Great job practicing Technical Aptitude!</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-white/[0.03] border border-white/5 p-5 rounded-2xl text-center">
            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Score</p>
            <p className="text-2xl font-bold text-white">{correct}/{questions.length}</p>
          </div>
          <div className="bg-white/[0.03] border border-white/5 p-5 rounded-2xl text-center">
            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Percentage</p>
            <p className="text-2xl font-bold text-indigo-400">{percentage}%</p>
          </div>
          <div className="bg-white/[0.03] border border-white/5 p-5 rounded-2xl text-center">
            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Accuracy</p>
            <p className="text-2xl font-bold text-emerald-400">
              {Math.round((correct / (questions.length - Object.keys(answers).length + Object.keys(answers).length || 1)) * 100)}%
            </p>
          </div>
          <div className="bg-white/[0.03] border border-white/5 p-5 rounded-2xl text-center">
            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Performance</p>
            <p className={`text-sm font-bold ${percentage >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {percentage >= 90 ? 'Expert' : percentage >= 70 ? 'Advanced' : percentage >= 40 ? 'Intermediate' : 'Beginner'}
            </p>
          </div>
        </div>

        <div className="space-y-6 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar mb-8">
          {questions.map((q, idx) => {
            const studentAns = answers[idx];
            const isCorrect = studentAns === q.correctAnswer;
            return (
              <div key={idx} className={`p-6 rounded-2xl border ${isCorrect ? 'bg-emerald-500/5 border-emerald-500/20' : studentAns ? 'bg-red-500/5 border-red-500/20' : 'bg-white/5 border-white/10'}`}>
                <div className="flex justify-between items-start gap-4 mb-4">
                  <h4 className="text-white font-bold leading-snug">
                    <span className="text-gray-500 mr-2">Q{idx + 1}:</span>
                    {q.question}
                  </h4>
                  {isCorrect ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> : studentAns ? <XCircle className="w-5 h-5 text-red-500 shrink-0" /> : <AlertCircle className="w-5 h-5 text-gray-500 shrink-0" />}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                   {q.options.map((opt, i) => {
                     const letter = String.fromCharCode(65 + i);
                     const isStudentPick = studentAns === letter;
                     const isCorrectOpt = q.correctAnswer === letter;
                     return (
                       <div key={i} className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                         isCorrectOpt ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 
                         isStudentPick ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-black/20 text-gray-500 border border-transparent'
                       }`}>
                         <span className="font-bold opacity-60">{letter}</span>
                         <span className="truncate">{opt}</span>
                       </div>
                     );
                   })}
                </div>

                <div className="p-4 bg-indigo-500/5 rounded-xl text-xs text-gray-400 leading-relaxed italic">
                  <span className="text-indigo-400 font-bold not-italic mr-1 uppercase tracking-wider">Explanation:</span>
                  {q.explanation}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-center">
          <button 
            onClick={() => window.location.reload()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" /> Retake Practice
          </button>
        </div>
      </motion.div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const progress = ((currentIdx + 1) / questions.length) * 100;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress & Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold leading-tight capitalize">Technical Aptitude Practice</h3>
            <p className="text-[10px] text-gray-400">Section: CS Core & Behavioral MCQs</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
             <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Time Remaining</p>
             <p className={`text-lg font-mono font-bold ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{formatTime(timeLeft)}</p>
          </div>
        </div>
      </div>

      {/* Main Quiz Area */}
      <motion.div 
        key={currentIdx}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-[#0f172a] border border-white/10 rounded-3xl p-8 md:p-12 shadow-xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
          />
        </div>

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <span className="bg-indigo-500/20 text-indigo-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest">
              Question {currentIdx + 1} of {questions.length}
            </span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest ${
              currentQuestion.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400' : 
              currentQuestion.difficulty === 'Hard' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
            }`}>
              {currentQuestion.difficulty}
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
            {currentQuestion.question}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {currentQuestion.options.map((option, i) => {
            const letter = String.fromCharCode(65 + i);
            const isSelected = answers[currentIdx] === letter;
            const isCorrect = currentQuestion.correctAnswer === letter;
            
            return (
              <button
                key={i}
                disabled={!!answers[currentIdx]}
                onClick={() => handleAnswer(i)}
                className={`group p-6 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer ${
                  isSelected 
                    ? (isCorrect ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-red-500/10 border-red-500/50')
                    : (!!answers[currentIdx] && isCorrect ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/[0.03] border-white/5 hover:border-white/20 hover:bg-white/[0.05]')
                }`}
              >
                <div className="flex items-center gap-4 relative z-10">
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm transition-colors ${
                    isSelected 
                      ? (isCorrect ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white')
                      : (!!answers[currentIdx] && isCorrect ? 'bg-emerald-500 text-white' : 'bg-white/10 text-gray-400 group-hover:text-white')
                  }`}>
                    {letter}
                  </span>
                  <span className={`text-sm md:text-base font-medium transition-colors ${
                    isSelected || (!!answers[currentIdx] && isCorrect) ? 'text-white' : 'text-gray-400 group-hover:text-white'
                  }`}>
                    {option}
                  </span>
                  {isSelected && (isCorrect ? <CheckCircle2 className="w-5 h-5 text-emerald-400 ml-auto" /> : <XCircle className="w-5 h-5 text-red-400 ml-auto" />)}
                  {!isSelected && !!answers[currentIdx] && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400 ml-auto" />}
                </div>
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {showExplanation && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-6 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 mb-8">
                 <h4 className="text-sm font-bold text-indigo-400 mb-2 uppercase flex items-center gap-2">
                   <Zap className="w-4 h-4" /> Why is this correct?
                 </h4>
                 <p className="text-sm text-gray-400 leading-relaxed italic">
                   {currentQuestion.explanation}
                 </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-between items-center gap-4 mt-4 border-t border-white/5 pt-8">
          <button 
            onClick={prevQuestion}
            disabled={currentIdx === 0}
            className="flex items-center gap-2 px-6 py-3 text-gray-400 hover:text-white font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" /> Previous
          </button>
          
          <div className="flex gap-4">
             {currentIdx === questions.length - 1 ? (
               <button 
                 onClick={finishQuiz}
                 className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer"
               >
                 <BarChart2 className="w-5 h-5" /> Finish & View Analytics
               </button>
             ) : (
               <button 
                 onClick={nextQuestion}
                 className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer"
               >
                 Next Question <ChevronRight className="w-5 h-5" />
               </button>
             )}
          </div>
        </div>
      </motion.div>

      {/* Question Navigator */}
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {questions.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setCurrentIdx(i);
              setShowExplanation(!!answers[i]);
            }}
            className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold transition-all cursor-pointer border ${
              currentIdx === i ? 'bg-indigo-600 text-white border-indigo-500' : 
              answers[i] ? 'bg-white/10 text-white border-white/10' : 'bg-transparent text-gray-500 border-white/5 hover:border-white/20'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
