import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/AppLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, FileText, CheckCircle, Database, LogOut, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, getCountFromServer, getDoc, getDocs, doc } from 'firebase/firestore';

export default function AdminDashboard() {
  const { logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [studentCount, setStudentCount] = useState<number>(0);
  const [questionCount, setQuestionCount] = useState<number>(0);
  const [testCount, setTestCount] = useState<number>(0);
  const [bestResumeScore, setBestResumeScore] = useState<number | string>(0);
  const [bestResumeStudents, setBestResumeStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // 1. Student Count
        const usersRef = collection(db, 'users');
        const countSnap = await getCountFromServer(usersRef);
        setStudentCount(countSnap.data().count);

        // 2. Question Count (Sum from multiple sources)
        let totalQ = 0;
        
        // system/question_banks
        const bankDoc = await getDoc(doc(db, 'system', 'question_banks'));
        if (bankDoc.exists()) {
          const data = bankDoc.data();
          Object.values(data).forEach(arr => {
            if (Array.isArray(arr)) totalQ += arr.length;
          });
        }

        // technical_aptitude collection
        const aptCountSnap = await getCountFromServer(collection(db, 'technical_aptitude'));
        totalQ += aptCountSnap.data().count;

        // company_prep collection
        const companySnap = await getDocs(collection(db, 'company_prep'));
        companySnap.forEach(doc => {
          const data = doc.data();
          if (Array.isArray(data.dsa)) totalQ += data.dsa.length;
          if (Array.isArray(data.aptitude)) totalQ += data.aptitude.length;
        });
        
        setQuestionCount(totalQ);

        // 3. Tests Assigned
        const testsSnap = await getCountFromServer(collection(db, 'released_tests'));
        setTestCount(testsSnap.data().count);

        // 4. Best Resume Score & Students
        const allUsersSnap = await getDocs(usersRef);
        let maxScore = 0;
        let topStudents: any[] = [];

        allUsersSnap.forEach(docSnap => {
          const userData = docSnap.data();
          const score = userData.stats?.bestResumeScore || 0;
          if (score > maxScore) {
            maxScore = score;
            topStudents = [{ id: docSnap.id, ...userData }];
          } else if (score === maxScore && maxScore > 0) {
            topStudents.push({ id: docSnap.id, ...userData });
          }
        });

        setBestResumeScore(maxScore);
        setBestResumeStudents(topStudents);

      } catch (err) {
        console.error("Error fetching stats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const stats = [
    { title: 'Total Students', value: loading ? '...' : studentCount.toLocaleString(), icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { title: 'Questions in Bank', value: loading ? '...' : questionCount.toLocaleString(), icon: Database, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { title: 'Tests Assigned', value: loading ? '...' : testCount.toLocaleString(), icon: FileText, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { 
      title: 'Best Resume', 
      value: loading ? '...' : bestResumeScore, 
      icon: CheckCircle, 
      color: 'text-purple-400', 
      bg: 'bg-purple-500/10',
      isResume: true 
    },
  ];

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setTimeout(async () => {
      await logout();
    }, 1200);
  };

  return (
    <>
      <AnimatePresence>
        {isLoggingOut && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0F1E]/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
              className="flex flex-col items-center"
            >
              <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex flex-col items-center justify-center mb-6">
                <ShieldAlert className="w-10 h-10 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Terminating Session</h2>
              <p className="text-gray-400 font-mono text-sm max-w-[250px] text-center">Closing secure connection to admin portal...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AppLayout activeTab="admin-dashboard">
        <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 pb-20">
          <div className="bg-[#0d1326] -mx-4 md:-mx-8 -mt-4 md:-mt-8 p-4 md:p-6 border-b border-white/5 mb-4 md:mb-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl md:text-2xl font-bold">Admin Dashboard 📊</h2>
            <button 
              onClick={handleLogout} 
              className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-red-600 hover:bg-red-700 text-white rounded-full border border-white/5 transition-all cursor-pointer shrink-0"
              title="Logout"
            >
              <LogOut className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          </div>
          <p className="text-[10px] md:text-sm text-gray-400">Manage questions, tests, and student analytics.</p>
        </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
            {stats.map((stat, i) => (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} key={stat.title} className={`bg-[#111827] border border-white/10 rounded-xl p-4 md:p-5 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 ${stat.isResume ? 'relative' : ''}`}>
                <div className="flex justify-between items-start mb-2 md:mb-3">
                   <div className="text-gray-400 font-medium text-[10px] md:text-xs uppercase tracking-wider">{stat.title}</div>
                   <div className={`w-6 h-6 md:w-8 md:h-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                     <stat.icon className={`w-3.5 h-3.5 md:w-4 md:h-4 ${stat.color}`} />
                   </div>
                </div>
                <div className="flex items-end justify-between">
                  <div className="text-xl md:text-2xl font-bold">
                    {stat.value}
                    {stat.isResume && !loading && <span className="text-[10px] text-gray-500 ml-1">/100</span>}
                  </div>
                  {stat.isResume && bestResumeStudents.length > 0 && (
                    <div className="flex -space-x-2">
                      {bestResumeStudents.slice(0, 3).map((student, idx) => (
                        <div key={student.id} className="relative group/avatar">
                          {student.photoUrl || student.photoURL ? (
                            <img 
                              src={student.photoUrl || student.photoURL} 
                              alt={student.email}
                              className="w-6 h-6 md:w-7 md:h-7 rounded-full border-2 border-[#111827] object-cover"
                            />
                          ) : (
                            <div className="w-6 h-6 md:w-7 md:h-7 rounded-full border-2 border-[#111827] bg-indigo-600 flex items-center justify-center text-[8px] font-bold text-white">
                              {student.email?.substring(0, 2).toUpperCase() || 'U'}
                            </div>
                          )}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-[8px] text-white rounded opacity-0 group-hover/avatar:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none border border-white/10">
                            {student.email}
                          </div>
                        </div>
                      ))}
                      {bestResumeStudents.length > 3 && (
                        <div className="w-6 h-6 md:w-7 md:h-7 rounded-full border-2 border-[#111827] bg-gray-800 flex items-center justify-center text-[8px] font-bold text-gray-400">
                          +{bestResumeStudents.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mt-6 md:mt-8">
          <Link to="/admin/questions" className="bg-[#111827] border border-white/10 rounded-xl md:rounded-2xl p-5 md:p-6 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 block hover:border-[#6366f1]/50 cursor-pointer">
              <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3 flex items-start sm:items-center gap-2 md:gap-3"><Database className="w-5 h-5 md:w-6 md:h-6 text-indigo-400 shrink-0 mt-0.5 sm:mt-0"/> <span>Admin Question Banks & Upload</span></h3>
              <p className="text-xs md:text-sm text-gray-400 mb-4 md:mb-5 leading-relaxed">Upload question snapshots, automatically extract text via AI OCR, and manage aptitude, LeetCode, and Interview question banks.</p>
              <div className="text-indigo-400 font-bold flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">Manage Questions &rarr;</div>
          </Link>
          <Link to="/admin/tests" className="bg-[#111827] border border-white/10 rounded-xl md:rounded-2xl p-5 md:p-6 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 block hover:border-[#10b981]/50 cursor-pointer">
              <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3 flex items-start sm:items-center gap-2 md:gap-3"><FileText className="w-5 h-5 md:w-6 md:h-6 text-emerald-400 shrink-0 mt-0.5 sm:mt-0"/> <span>AI Test Paper Generator</span></h3>
              <p className="text-xs md:text-sm text-gray-400 mb-4 md:mb-5 leading-relaxed">Create new tests using the smart question selector, configure time limits, and assign them to students.</p>
              <div className="text-emerald-400 font-bold flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">Create & Assign Tests &rarr;</div>
          </Link>
        </motion.div>

      </div>
    </AppLayout>
    </>
  );
}
