import React, { useState, useEffect } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserAvatar } from '../components/UserAvatar';
import { 
  Search, ChevronDown, PlayCircle, ArrowRight,
  TerminalSquare, Code2, BookOpen, FileText, Building2,
  Zap, Code, LogOut, Settings, Sparkles
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { collection, query, orderBy, limit, getDocs, getCountFromServer, onSnapshot, where } from 'firebase/firestore';

import { motion } from 'framer-motion';

export default function LandingPage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  const [quotas, setQuotas] = useState([
    { id: 'gemini-3.5-flash', name: "Gemini 3.5 Flash", icon: "✦", colorClass: "text-blue-400 text-sm", quota: 98.40 },
    { id: 'gemini-3.1-flash-lite', name: "Gemini 3.1 Flash Lite", icon: "✦", colorClass: "text-blue-400 text-sm", quota: 99.10 },
    { id: 'gemini-3-flash-preview', name: "Gemini 3 Flash Preview", icon: "✦", colorClass: "text-blue-400 text-sm", quota: 97.20 },
    { id: 'gemini-3.1-pro-preview', name: "Gemini 3.1 Pro Preview", icon: "✦", colorClass: "text-blue-400 text-sm", quota: 98.40 },
    { id: 'gemini-pro-latest', name: "Gemini Pro Latest", icon: "✦", colorClass: "text-blue-400 text-sm", quota: 92.50 },
    { id: 'gemini-flash-latest', name: "Gemini Flash Latest", icon: "✦", colorClass: "text-blue-400 text-sm", quota: 95.20 },
    { id: 'OpenAI', name: "OpenAI (GPT-4o)", icon: "O", colorClass: "text-green-400 font-bold text-sm", quota: 92.50 },
    { id: 'Groq', name: "Groq (Llama 3)", icon: "G", colorClass: "text-orange-400 font-bold text-sm", quota: 95.20 },
    { id: 'OpenRouter', name: "OpenRouter (DeepSeek)", icon: "C", colorClass: "text-gray-300 font-bold text-sm", quota: 64.80 },
    { id: 'Cloudflare', name: "Cloudflare AI", icon: "♨", colorClass: "text-amber-500 font-bold text-sm", quota: 89.90 },
  ]);

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [upcomingTests, setUpcomingTests] = useState<any[]>([]);
  const [expiredTests, setExpiredTests] = useState<any[]>([]);
  const [isDemoPlaying, setIsDemoPlaying] = useState(false);

  useEffect(() => {
    const usersRef = collection(db, 'users');
    
    // Real-time listener for total count
    const unsubscribeCount = onSnapshot(usersRef, (snap) => {
      setTotalStudents(snap.size);
    }, (err) => {
      console.warn("Using fallback count for total students:", err);
      setTotalStudents(20);
    });

    // Real-time listener for recent users (Lobby/Hero avatars)
    const qUsers = query(usersRef, orderBy('createdAt', 'desc'), limit(50));
    const unsubscribeUsers = onSnapshot(qUsers, (snap) => {
      const docs = snap.docs.map(doc => doc.data());
      if (docs.length > 0) {
        setRecentUsers(docs);
      } else {
        // Fallback mock data with 20 users to show "increase"
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
          { displayName: "Marcus Wright", email: "marcus.w@openai.com" },
          { displayName: "Zara Khan", email: "zara.k@tesla.com" },
          { displayName: "Kenji Sato", email: "kenji.s@sony.com" },
          { displayName: "Sofia Rossi", email: "sofia.r@ferrari.com" },
          { displayName: "Liam Wilson", email: "liam.w@stripe.com" },
          { displayName: "Emma Brown", email: "emma.b@airbnb.com" },
          { displayName: "Noah Davis", email: "noah.d@spotify.com" },
          { displayName: "Olivia Martinez", email: "olivia.m@nike.com" },
          { displayName: "William Taylor", email: "will.t@adidas.com" },
          { displayName: "James Anderson", email: "james.a@samsung.com" },
          { displayName: "Sophia White", email: "sophia.w@nvidia.com" }
        ]);
        setTotalStudents(20);
      }
    }, (err) => {
      console.warn("Using fallback avatars due to read restrictions:", err);
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
        { displayName: "Marcus Wright", email: "marcus.w@openai.com" },
        { displayName: "Zara Khan", email: "zara.k@tesla.com" },
        { displayName: "Kenji Sato", email: "kenji.s@sony.com" },
        { displayName: "Sofia Rossi", email: "sofia.r@ferrari.com" },
        { displayName: "Liam Wilson", email: "liam.w@stripe.com" },
        { displayName: "Emma Brown", email: "emma.b@airbnb.com" },
        { displayName: "Noah Davis", email: "noah.d@spotify.com" },
        { displayName: "Olivia Martinez", email: "olivia.m@nike.com" },
        { displayName: "William Taylor", email: "will.t@adidas.com" },
        { displayName: "James Anderson", email: "james.a@samsung.com" },
        { displayName: "Sophia White", email: "sophia.w@nvidia.com" }
      ]);
      setTotalStudents(20);
    });

    // Listen to latest released tests
    const qTest = query(collection(db, 'released_tests'), where('active', '==', true));
    const unsubscribeTests = onSnapshot(qTest, (snapshot) => {
      const upcoming: any[] = [];
      const expired: any[] = [];
      const now = new Date();
      snapshot.forEach(doc => {
        const test: any = { id: doc.id, ...doc.data() };
        if (test.assignDate && test.assignTime) {
          const assignDateTime = new Date(`${test.assignDate}T${test.assignTime}`);
          const endTime = new Date(assignDateTime.getTime() + (test.duration || 60) * 60000);
          if (now > endTime) {
            expired.push(test);
          } else {
            upcoming.push(test);
          }
        } else {
           upcoming.push(test);
        }
      });
      setUpcomingTests(upcoming);
      setExpiredTests(expired);
    });

    return () => {
      unsubscribeCount();
      unsubscribeUsers();
      unsubscribeTests();
    };
  }, []);

  useEffect(() => {
    const fetchQuotas = async () => {
      try {
        const res = await fetch('/api/ai-quotas');
        if (res.ok) {
          const data = await res.json();
          setQuotas(prev => prev.map(q => {
            const serverQuota = data.find((sq: any) => sq.id === q.id);
            if (serverQuota) {
              return { ...q, quota: serverQuota.percentage };
            }
            return q;
          }));
        }
      } catch (err) {
        console.warn("Failed to fetch AI quotas:", err);
      }
    };
    fetchQuotas();
    const interval = setInterval(fetchQuotas, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/auth/register');
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-[#0B0D17] text-white font-sans relative overflow-x-hidden"
    >
      
      {/* Ambient Glows */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#5A52E5]/20 rounded-full blur-[120px]"></div>
        <div className="absolute top-[20%] right-[-10%] w-[30%] h-[50%] bg-[#A855F7]/10 rounded-full blur-[150px]"></div>
      </div>

      {/* Nav */}
      <header className="relative z-50 w-full px-4 md:px-12 lg:px-24 xl:px-32 py-4 md:py-6 flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-3 cursor-pointer group">
          <div className="bg-[#5A52E5] p-1.5 md:p-2 rounded-lg group-hover:scale-105 transition-transform">
            <Code className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </div>
          <span className="text-lg md:text-xl font-bold tracking-tight">PrepLevel</span>
        </div>

        {/* Global Search Bar */}


        <nav className="hidden lg:flex items-center gap-12 text-sm font-medium text-gray-300">
          <div className="relative group/nav-item py-4">
            <Link to="#" className="hover:text-white flex items-center gap-1 transition-colors">
              Resources <ChevronDown className="w-3.5 h-3.5 group-hover/nav-item:rotate-180 transition-transform" />
            </Link>
            
            <div className="absolute top-full -left-4 origin-top-left scale-95 opacity-0 invisible group-hover/nav-item:scale-100 group-hover/nav-item:opacity-100 group-hover/nav-item:visible transition-all duration-300 ease-out z-50 pt-2 w-[270px]">
              <div className="bg-[#121520] border border-[#2a2d3d] rounded-xl overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.4)] flex flex-col p-1.5">
                 <Link to="/dashboard/student" className="px-3 py-2.5 hover:bg-white/5 rounded-lg text-gray-300 hover:text-white transition-colors flex items-center gap-3">
                   <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0"><Code2 className="w-3.5 h-3.5"/></div>
                   <div className="flex flex-col flex-1">
                     <span className="text-[13px] font-semibold text-white">DSA Practice</span>
                     <span className="text-[11px] text-gray-400 mt-0.5 leading-snug">Master data structures & algorithms</span>
                   </div>
                 </Link>
                 <Link to="/dashboard/student" className="px-3 py-2.5 hover:bg-white/5 rounded-lg text-gray-300 hover:text-white transition-colors flex items-center gap-3">
                   <div className="w-7 h-7 rounded-lg bg-green-500/10 text-green-400 flex items-center justify-center shrink-0"><TerminalSquare className="w-3.5 h-3.5"/></div>
                   <div className="flex flex-col flex-1">
                     <span className="text-[13px] font-semibold text-white">LeetCode Problems</span>
                     <span className="text-[11px] text-gray-400 mt-0.5 leading-snug">Top interview questions & patterns</span>
                   </div>
                 </Link>
                 <Link to="/resume" className="px-3 py-2.5 hover:bg-white/5 rounded-lg text-gray-300 hover:text-white transition-colors flex items-center gap-3">
                   <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0"><FileText className="w-3.5 h-3.5"/></div>
                   <div className="flex flex-col flex-1">
                     <span className="text-[13px] font-semibold text-white">Resume Analyser</span>
                     <span className="text-[11px] text-gray-400 mt-0.5 leading-snug">Score and improve your CV</span>
                   </div>
                 </Link>
                 <Link to="/interview/session" className="px-3 py-2.5 hover:bg-white/5 rounded-lg text-gray-300 hover:text-white transition-colors flex items-center gap-3">
                   <div className="w-7 h-7 rounded-lg bg-pink-500/10 text-pink-400 flex items-center justify-center shrink-0"><Sparkles className="w-3.5 h-3.5"/></div>
                   <div className="flex flex-col flex-1">
                     <span className="text-[13px] font-semibold text-white">Interview with AI models</span>
                     <span className="text-[11px] text-gray-400 mt-0.5 leading-snug">Live voice interview with AI experts</span>
                   </div>
                 </Link>
                 <Link to="/tests" className="px-3 py-2.5 hover:bg-white/5 rounded-lg text-gray-300 hover:text-white transition-colors flex items-center gap-3">
                   <div className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center shrink-0"><Zap className="w-3.5 h-3.5"/></div>
                   <div className="flex flex-col flex-1">
                     <span className="text-[13px] font-semibold text-white">Mock Test</span>
                     <span className="text-[11px] text-gray-400 mt-0.5 leading-snug">Simulate real coding assessments</span>
                   </div>
                 </Link>
                 <Link to="/companies" className="px-3 py-2.5 hover:bg-white/5 rounded-lg text-gray-300 hover:text-white transition-colors flex items-center gap-3">
                   <div className="w-7 h-7 rounded-lg bg-yellow-500/10 text-yellow-400 flex items-center justify-center shrink-0"><Building2 className="w-3.5 h-3.5"/></div>
                   <div className="flex flex-col flex-1">
                     <span className="text-[13px] font-semibold text-white">Company Wise Placement Prep</span>
                     <span className="text-[11px] text-gray-400 mt-0.5 leading-snug">Targeted guides for top tier tech</span>
                   </div>
                 </Link>
              </div>
            </div>
          </div>
          <div className="relative group/nav-item py-4">
            <Link to="#" className="hover:text-white flex items-center gap-1 transition-colors">
              Companies <ChevronDown className="w-3.5 h-3.5 group-hover/nav-item:rotate-180 transition-transform" />
            </Link>
            
            <div className="absolute top-full -left-4 origin-top-left scale-95 opacity-0 invisible group-hover/nav-item:scale-100 group-hover/nav-item:opacity-100 group-hover/nav-item:visible transition-all duration-300 ease-out z-50 pt-2 w-[220px]">
              <div className="bg-[#121520] border border-[#2a2d3d] rounded-xl overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.4)] flex flex-col p-1.5">
                 <Link to="#" className="px-3 py-2.5 hover:bg-white/5 rounded-lg text-gray-300 hover:text-white transition-colors flex items-center gap-3">
                   <div className="w-6 h-6 rounded-md bg-white text-[#4285F4] font-bold flex items-center justify-center shrink-0 text-sm">G</div>
                   <div className="flex flex-col flex-1">
                     <span className="text-[13px] font-semibold text-white">Google</span>
                     <span className="text-[11px] text-gray-400 mt-0.5 leading-snug">The best compony Ever</span>
                   </div>
                 </Link>
                 <Link to="#" className="px-3 py-2.5 hover:bg-white/5 rounded-lg text-gray-300 hover:text-white transition-colors flex items-center gap-3">
                   <div className="w-6 h-6 rounded-md bg-blue-500/10 text-blue-400 font-bold flex items-center justify-center shrink-0 text-sm">M</div>
                   <div className="flex flex-col flex-1">
                     <span className="text-[13px] font-semibold text-white">Microsoft</span>
                   </div>
                 </Link>
                 <Link to="#" className="px-3 py-2.5 hover:bg-white/5 rounded-lg text-gray-300 hover:text-white transition-colors flex items-center gap-3">
                   <div className="w-6 h-6 rounded-md bg-blue-400/10 text-blue-300 font-bold flex items-center justify-center shrink-0 text-sm">P</div>
                   <div className="flex flex-col flex-1">
                     <span className="text-[13px] font-semibold text-white">Paytm</span>
                   </div>
                 </Link>
                 <Link to="#" className="px-3 py-2.5 hover:bg-white/5 rounded-lg text-gray-300 hover:text-white transition-colors flex items-center gap-3">
                   <div className="w-6 h-6 rounded-md bg-indigo-500/10 text-indigo-400 font-bold flex items-center justify-center shrink-0 text-sm">S</div>
                   <div className="flex flex-col flex-1">
                     <span className="text-[13px] font-semibold text-white">Samsung</span>
                   </div>
                 </Link>
                 <Link to="#" className="px-3 py-2.5 hover:bg-white/5 rounded-lg text-gray-300 hover:text-white transition-colors flex items-center gap-3">
                   <div className="w-6 h-6 rounded-md bg-orange-500/10 text-orange-400 font-bold flex items-center justify-center shrink-0 text-sm">A</div>
                   <div className="flex flex-col flex-1">
                     <span className="text-[13px] font-semibold text-white">Amazon</span>
                   </div>
                 </Link>
                 <Link to="#" className="px-3 py-2.5 hover:bg-white/5 rounded-lg text-gray-300 hover:text-white transition-colors flex items-center gap-3">
                   <div className="w-6 h-6 rounded-md bg-blue-600/10 text-blue-500 font-bold flex items-center justify-center shrink-0 text-sm">L</div>
                   <div className="flex flex-col flex-1">
                     <span className="text-[13px] font-semibold text-white">Linkedin</span>
                   </div>
                 </Link>
                 <Link to="#" className="px-3 py-2.5 hover:bg-white/5 rounded-lg text-gray-300 hover:text-white transition-colors flex items-center gap-3">
                   <div className="w-6 h-6 rounded-md bg-pink-500/10 text-pink-400 font-bold flex items-center justify-center shrink-0 text-sm">M</div>
                   <div className="flex flex-col flex-1">
                     <span className="text-[13px] font-semibold text-white">Myantra</span>
                   </div>
                 </Link>
              </div>
            </div>
          </div>
          <div className="relative group/nav-item py-4">
            <Link to="#" className="hover:text-white flex items-center gap-1 transition-colors">
              AI Tools <ChevronDown className="w-3.5 h-3.5 group-hover/nav-item:rotate-180 transition-transform" />
            </Link>
            
            <div className="absolute top-full -left-4 origin-top-left scale-95 opacity-0 invisible group-hover/nav-item:scale-100 group-hover/nav-item:opacity-100 group-hover/nav-item:visible transition-all duration-300 ease-out z-50 pt-2 w-[240px]">
              <div className="bg-[#121520] border border-[#2a2d3d] rounded-xl overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.4)] flex flex-col p-1.5">
                  {quotas.map(model => (
                    <Link key={model.id} to="#" className="px-3 py-2.5 hover:bg-white/5 rounded-lg text-gray-300 hover:text-white transition-colors flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-md bg-white/5 flex items-center justify-center shrink-0 ${model.colorClass}`}>
                        {model.icon}
                      </div>
                      <div className="flex flex-col flex-1">
                        <span className="text-[13px] font-semibold text-white">{model.name}</span>
                        {model.id === 'gemini31' && <span className="text-[10px] text-gray-400 leading-snug">Coding Master</span>}
                        {model.id === 'openai' && <span className="text-[10px] text-gray-400 leading-snug">Versatile Intelligence</span>}
                      </div>
                    </Link>
                  ))}
                  <div className="my-1 border-t border-white/5"></div>
                  <Link to="#" className="px-3 py-2.5 hover:bg-white/5 rounded-lg text-gray-300 hover:text-white transition-colors flex items-center gap-3">
                    <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center shrink-0 text-blue-500 font-bold text-sm">
                      ∞
                    </div>
                    <div className="flex flex-col flex-1">
                      <span className="text-[13px] font-semibold text-white">Fallback Engine</span>
                      <span className="text-[10px] text-gray-400 leading-snug">Standby</span>
                    </div>
                  </Link>
              </div>
            </div>
          </div>
          <div className="relative group/nav-item py-4">
            <Link to="#" className="hover:text-white flex items-center gap-1 transition-colors">
              Pricing <ChevronDown className="w-3.5 h-3.5 group-hover/nav-item:rotate-180 transition-transform" />
            </Link>
            
            <div className="absolute top-full -left-4 origin-top-left scale-95 opacity-0 invisible group-hover/nav-item:scale-100 group-hover/nav-item:opacity-100 group-hover/nav-item:visible transition-all duration-300 ease-out z-50 pt-2 w-[220px]">
              <div className="bg-[#121520] border border-[#2a2d3d] rounded-xl overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.4)] flex flex-col p-1.5">
                 <Link to="#" className="px-3 py-2.5 hover:bg-white/5 rounded-lg text-gray-300 hover:text-white transition-colors flex items-center gap-3">
                   <div className="w-6 h-6 rounded-md bg-green-500/10 text-green-400 font-bold flex items-center justify-center shrink-0 text-lg">✓</div>
                   <div className="flex flex-col flex-1">
                     <span className="text-[13px] font-semibold text-white">Absolutely Free Resources.</span>
                   </div>
                 </Link>
              </div>
            </div>
          </div>
        </nav>

        <div className="flex items-center gap-4 ml-8 relative">
          {!loading && user ? (
            <div className="relative">
              <button 
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-2 hover:bg-white/5 p-1.5 pr-3 rounded-full transition-colors border border-transparent hover:border-white/10 cursor-pointer"
              >
                <UserAvatar profile={profile} className="w-9 h-9 text-sm" />
                <span className="text-sm font-medium hidden sm:block">{profile?.displayName || profile?.firstName || 'User'}</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              
              {isProfileMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-[#121520] border border-[#2a2d3d] rounded-xl overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.6)] flex flex-col p-2 z-50">
                  <Link to="/dashboard/student" className="px-3 py-2 hover:bg-white/5 rounded-lg text-gray-300 hover:text-white transition-colors flex items-center gap-3">
                    <span className="text-[14px]">Dashboard</span>
                  </Link>
                  <Link to="/code/two-sum" className="px-3 py-2 hover:bg-white/5 rounded-lg text-gray-300 hover:text-white transition-colors flex items-center gap-3">
                    <span className="text-[14px]">LeetCode</span>
                  </Link>
                  <Link to="/interview/history" className="px-3 py-2 hover:bg-white/5 rounded-lg text-gray-300 hover:text-white transition-colors flex items-center gap-3">
                    <span className="text-[14px]">Interview History</span>
                  </Link>
                  <Link to="/resume" className="px-3 py-2 hover:bg-white/5 rounded-lg text-gray-300 hover:text-white transition-colors flex items-center gap-3">
                    <span className="text-[14px]">Resume Analyzer</span>
                  </Link>
                  <Link to="/tests" className="px-3 py-2 hover:bg-white/5 rounded-lg text-gray-300 hover:text-white transition-colors flex items-center gap-3">
                    <span className="text-[14px]">Test</span>
                  </Link>
                  <div className="h-px bg-white/10 my-1"></div>
                  <button onClick={() => auth.signOut()} className="px-3 py-2 hover:bg-rose-500/10 rounded-lg text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-3 text-left cursor-pointer">
                    <span className="text-[14px]">Logout</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/auth/login" className="inline-flex items-center justify-center px-3 py-1.5 md:px-6 md:py-2 text-xs md:text-base rounded-full text-white font-medium border-2 border-rose-500/50 hover:bg-rose-500/10 hover:border-rose-500 transition duration-200 ease-out transform-gpu active:scale-95">
                Log In
              </Link>
              <Link to="/auth/register" className="inline-flex items-center justify-center px-3 py-1.5 md:px-6 md:py-2 text-xs md:text-base rounded-full text-white font-medium bg-indigo-600 hover:bg-indigo-500 transition duration-200 ease-out transform-gpu active:scale-95 shadow-lg shadow-indigo-500/25 border-2 border-transparent">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Test Announcements Marquee */}
      {upcomingTests.length > 0 && (
        <div className="relative z-40 bg-indigo-600 border-y border-indigo-500/50 py-2.5 overflow-hidden shadow-[0_0_15px_rgba(99,102,241,0.3)]">
          <div className="flex whitespace-nowrap animate-[marquee_25s_linear_infinite]">
             <span className="text-white font-medium text-sm flex items-center mx-4 gap-2 mr-10 relative">
               <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
               <strong>New Tests Upcoming:</strong> 
               {upcomingTests.map(t => `${t.title} (${t.assignDate ? `${t.assignDate} at ${t.assignTime}` : 'Anytime'})`).join(' • ')} 
               <span className="ml-2 text-indigo-300">— Login to your dashboard to complete them!</span>
             </span>
             <span className="text-white font-medium text-sm flex items-center mx-4 gap-2 mr-10 relative">
               <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
               <strong>New Tests Upcoming:</strong> 
               {upcomingTests.map(t => `${t.title} (${t.assignDate ? `${t.assignDate} at ${t.assignTime}` : 'Anytime'})`).join(' • ')} 
               <span className="ml-2 text-indigo-300">— Login to your dashboard to complete them!</span>
             </span>
             <span className="text-white font-medium text-sm flex items-center mx-4 gap-2 mr-10 relative">
               <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
               <strong>New Tests Upcoming:</strong> 
               {upcomingTests.map(t => `${t.title} (${t.assignDate ? `${t.assignDate} at ${t.assignTime}` : 'Anytime'})`).join(' • ')} 
               <span className="ml-2 text-indigo-300">— Login to your dashboard to complete them!</span>
             </span>
          </div>
        </div>
      )}

      {/* Hero Content */}
      <main className="relative z-10 w-full px-6 md:px-12 lg:px-24 xl:px-32 pt-16 pb-20 lg:pt-24 lg:pb-32 flex flex-col items-start lg:items-center lg:flex-row min-h-[600px]">
        
        {/* Right Background Image (simulated with CSS layers/image) */}
        <div className="absolute top-0 right-0 w-[60%] h-full z-0 hidden lg:block opacity-60 overflow-hidden mix-blend-screen pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-[#0B0D17] via-[#0B0D17]/80 to-transparent z-10"></div>
            <div className="absolute bottom-0 w-full h-[30%] bg-gradient-to-t from-[#0B0D17] to-transparent z-10"></div>
            <img 
               src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=2070&auto=format&fit=crop" 
               alt="Coding" 
               className="w-full h-full object-cover object-left opacity-40 filter contrast-125 saturate-50"
            />
        </div>

        {/* Left hero content text */}
        <div className="relative z-10 w-full max-w-[900px] text-left mt-0 md:-mt-32 lg:-mt-48 lg:ml-5">
           
           <div className="inline-flex items-center gap-2 md:gap-3 px-3 py-2 md:px-4 md:py-2.5 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-sm mb-6 md:mb-8 hover:bg-white/[0.06] hover:border-white/20 transition-all cursor-pointer group">
              <div className="flex items-center gap-1.5 border-r border-white/10 pr-2 md:pr-3">
                 <Zap className="w-3.5 h-3.5 md:w-4 md:h-4 text-yellow-500 fill-yellow-500" />
                 <span className="text-[11px] md:text-[13px] font-medium text-[#5A52E5] group-hover:text-[#6c65e8] transition-colors tracking-wide">Powered by 5 AI Models</span>
              </div>
              <div className="flex items-center gap-1.5 md:gap-2">
                 <div className="w-4 h-4 md:w-5 md:h-5 rounded flex items-center justify-center bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">✦</div>
                 <div className="w-4 h-4 md:w-5 md:h-5 rounded flex items-center justify-center bg-orange-500/20 text-orange-400 font-bold text-[9px] md:text-[10px] group-hover:scale-110 transition-transform">G</div>
                 <div className="w-4 h-4 md:w-5 md:h-5 rounded flex items-center justify-center bg-gray-500/20 text-gray-300 font-bold text-[9px] md:text-[10px] group-hover:scale-110 transition-transform">C</div>
                 <div className="w-4 h-4 md:w-5 md:h-5 rounded flex items-center justify-center bg-amber-500/20 text-amber-500 font-bold text-[9px] md:text-[10px] group-hover:scale-110 transition-transform">♨</div>
                 <div className="w-4 h-4 md:w-5 md:h-5 rounded flex items-center justify-center bg-blue-600/20 text-blue-500 font-bold text-[9px] md:text-[10px] group-hover:scale-110 transition-transform">∞</div>
              </div>
           </div>

           <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-8xl font-extrabold tracking-tight mb-6 lg:mb-8 leading-[1.15]">
              <span className="text-white block drop-shadow-md animate__animated animate__bounceInLeft whitespace-normal sm:whitespace-nowrap">Crack Placements</span>
              <div className="animate__animated animate__bounceInLeft overflow-visible">
                 <span className="bg-gradient-to-r from-blue-400 via-[#6366f1] to-[#a855f7] bg-clip-text text-transparent inline-block mt-2 pb-4 pr-4 drop-shadow-sm whitespace-normal sm:whitespace-nowrap w-fit max-w-full">with AI Excellence</span>
              </div>
           </h1>
           
           <p className="text-sm md:text-lg text-gray-400 mb-8 md:mb-10 max-w-xl leading-relaxed">
             The most advanced AI-powered platform for DSA, Competitive Programming, Dynamic Programming, LeetCode, Company-wise Preparation, PYQs, Mock Interviews, Resume Analysis and much more.
           </p>

           <div className="flex flex-col sm:flex-row items-center gap-4 mb-10 w-full sm:w-auto">
              {!loading && user ? (
                <Link to="/dashboard/student" className="group w-full sm:w-auto bg-[#5A52E5] hover:bg-[#4F46E5] text-white px-6 py-3 md:px-8 md:py-3.5 rounded-xl text-sm md:text-[15px] font-semibold transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(90,82,229,0.3)] hover:shadow-[0_0_30px_rgba(90,82,229,0.5)] hover:-translate-y-0.5">
                  Go to Dashboard <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                </Link>
              ) : (
                <Link to="/auth/register" className="group w-full sm:w-auto bg-[#5A52E5] hover:bg-[#4F46E5] text-white px-6 py-3 md:px-8 md:py-3.5 rounded-xl text-sm md:text-[15px] font-semibold transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(90,82,229,0.3)] hover:shadow-[0_0_30px_rgba(90,82,229,0.5)] hover:-translate-y-0.5">
                  Start Preparing Now <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                </Link>
              )}
              <button 
                onClick={() => {
                  window.speechSynthesis.cancel();
                  if (isDemoPlaying) {
                    setIsDemoPlaying(false);
                    return;
                  }
                  setIsDemoPlaying(true);
                  const textToSpeak = "PlaceMentor AI is an AI-powered placement preparation platform that helps students master DSA, coding interviews, aptitude, resume building, and company-specific preparation through personalized learning, mock interviews, and intelligent performance analytics.";
                  const utterance = new SpeechSynthesisUtterance(textToSpeak);
                  
                  utterance.onend = () => setIsDemoPlaying(false);
                  utterance.onerror = () => setIsDemoPlaying(false);
                  
                  const voices = window.speechSynthesis.getVoices();
                  // Try to find a female voice across different browsers/OS
                  const femaleVoice = voices.find(v => {
                    const name = v.name.toLowerCase();
                    const lang = v.lang.toLowerCase();
                    return (
                      name.includes('female') || 
                      name.includes('samantha') || 
                      name.includes('victoria') || 
                      name.includes('zira') || 
                      name.includes('hazel') || 
                      name.includes('karen') || 
                      name.includes('veena') || 
                      name.includes('moira') || 
                      name.includes('tessa') ||
                      name.includes('susan') ||
                      name.includes('heather') ||
                      name.includes('melina') ||
                      name.includes('laura')
                    ) && lang.startsWith('en');
                  });
                  if (femaleVoice) {
                    utterance.voice = femaleVoice;
                  }
                  
                  // Adjust speech settings for a clear, natural female voice
                  utterance.pitch = 1.15; 
                  utterance.rate = 0.95; 
                  
                  window.speechSynthesis.speak(utterance);
                }}
                className={`group w-full sm:w-auto hover:bg-white/10 text-white px-6 py-3 md:px-8 md:py-3.5 rounded-xl text-sm md:text-[15px] font-semibold transition-all flex items-center justify-center gap-2 backdrop-blur-sm cursor-pointer relative ${
                  isDemoPlaying ? 'shadow-[0_0_20px_rgba(255,0,200,0.5)] border-transparent' : 'bg-white/5 border border-white/10 hover:border-white/20 hover:-translate-y-0.5'
                }`}
                style={isDemoPlaying ? {
                  background: 'linear-gradient(#131623, #131623) padding-box, linear-gradient(90deg, #ff0000, #ff7300, #fffb00, #48ff00, #00ffd5, #002bff, #7a00ff, #ff00c8, #ff0000) border-box',
                  border: '2px solid transparent',
                  backgroundSize: '300% 300%',
                  animation: 'gradientMove 2s ease infinite'
                } : {}}
              >
                 <PlayCircle className="w-5 h-5 group-hover:text-white text-gray-300 transition-colors" /> {isDemoPlaying ? "Stop Intro" : "Listen to Intro"}
              </button>
           </div>

           <div className="flex items-center gap-4 hover:opacity-100 transition-opacity cursor-pointer group">
              {!loading && user ? (
                <div className="flex items-center gap-4 bg-white/[0.03] p-3 pr-6 rounded-2xl border border-white/10 hover:bg-white/[0.06] transition-colors">
                  <UserAvatar profile={profile} className="w-14 h-14 text-xl group-hover:scale-105 group-hover:shadow-[0_0_25px_rgba(99,102,241,0.6)] border-indigo-500/50 transition-all duration-300" />
                  <div className="text-[13px] text-gray-400 transition-colors flex flex-col justify-center gap-0.5">
                    <span className="text-white font-semibold text-lg tracking-tight">Welcome Back, {profile?.displayName || profile?.firstName || 'Student'}</span>
                    <span className="text-indigo-300">Continue Your Preparation</span>
                    <div className="flex gap-4 mt-1">
                      <div><span className="text-white font-medium">DSA Progress:</span> 72%</div>
                      <div><span className="text-white font-medium">Placement Readiness:</span> 81%</div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex -space-x-2.5 flex-wrap max-w-md lg:max-w-xl">
                    {recentUsers.length > 0 ? recentUsers.map((recentUser, idx) => (
                      <div 
                        key={idx} 
                        style={{ transitionDelay: `${idx * 40}ms` }} 
                        className="relative group/avatar transition-all duration-300 z-10 hover:z-50"
                      >
                        <UserAvatar 
                          profile={recentUser} 
                          className="w-8 h-8 border-2 border-[#0B0D17] text-[10px] hover:scale-125 hover:-translate-y-1 transition-all duration-300 relative shadow-lg" 
                        />
                        <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 bg-[#1a1f33] border border-white/10 rounded-xl p-3 opacity-0 group-hover/avatar:opacity-100 pointer-events-none transition-all duration-300 -translate-y-2 group-hover/avatar:translate-y-0 text-xs whitespace-nowrap z-[100] shadow-2xl backdrop-blur-md min-w-[150px]">
                          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
                            <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px] font-bold text-indigo-400">
                              {recentUser?.displayName?.charAt(0) || 'S'}
                            </div>
                            <div className="font-bold text-white text-sm truncate">
                              {recentUser?.displayName || `${recentUser?.firstName || ''} ${recentUser?.lastName || ''}`.trim() || 'Student'}
                            </div>
                          </div>
                          <div className="text-gray-400 flex items-center gap-1.5 overflow-hidden">
                            <Sparkles className="w-3 h-3 text-indigo-400 shrink-0" />
                            <span className="truncate">{recentUser?.email || 'Active Student'}</span>
                          </div>
                          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#1a1f33] rotate-45 border-l border-t border-white/10"></div>
                        </div>
                      </div>
                    )) : (
                      <div className="w-8 h-8 rounded-full border-2 border-[#0B0D17] bg-[#1a1f33]" />
                    )}
                  </div>
                  <div className="text-[13px] text-gray-400 group-hover:text-gray-300 transition-colors">
                    <span className="text-white font-medium">{totalStudents > 0 ? totalStudents.toLocaleString() : 0}</span> {totalStudents === 1 ? 'Student' : 'Students'}<br/>Preparing Smarter with AI
                  </div>
                </>
              )}
           </div>
        </div>

        {/* Right side floating box (AI Models Status) */}
        <div className="relative z-10 w-full lg:max-w-[320px] mt-12 lg:-mt-12 lg:ml-auto lg:mr-5 bg-[#131623]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-2xl hover:border-white/10 transition-colors cursor-default hover:shadow-[0_0_40px_rgba(0,0,0,0.5)]">
            <h3 className="text-white font-semibold text-sm mb-5">AI Models Status</h3>
            <div className="space-y-4">
               {quotas.map(model => (
                 <div key={model.id} className="flex items-center justify-between group hover:bg-white/5 p-2 -mx-2 rounded-lg transition-colors cursor-pointer">
                    <div className="flex items-center gap-2.5">
                       <div className={model.colorClass}>{model.icon}</div>
                       <div className="flex flex-col">
                         <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{model.name}</span>
                         <span className="text-[10px] text-gray-500 font-mono">Quota: {model.quota.toFixed(2)}%</span>
                       </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                       {model.quota < 10 ? (
                         <>
                           <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] blink-red"></div>
                           <span className="text-[11px] text-red-500 font-medium truncate">Low</span>
                         </>
                       ) : (
                         <>
                           <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] blink-green"></div>
                           <span className="text-[11px] text-green-500 font-medium truncate">Online</span>
                         </>
                       )}
                    </div>
                 </div>
               ))}

               <div className="flex items-center justify-between group hover:bg-white/5 p-2 -mx-2 rounded-lg transition-colors cursor-pointer pt-2 border-t border-white/5 mt-2">
                  <div className="flex items-center gap-2.5">
                     <div className="text-blue-500 font-bold text-sm">∞</div>
                     <div className="flex flex-col">
                       <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Fallback Engine</span>
                       <span className="text-[10px] text-gray-500">Standby</span>
                     </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                     <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] blink-green"></div>
                     <span className="text-[11px] text-emerald-500 font-medium">Active</span>
                  </div>
               </div>

            </div>
        </div>

      </main>

      {/* Stats Strip */}
      <div className="relative z-20 w-full px-6 md:px-12 lg:px-24 xl:px-32 pb-12 mt-8 lg:mt-4">
         <div className="bg-[#121520] border border-white/5 rounded-2xl p-6 lg:p-8 flex flex-wrap lg:flex-nowrap justify-between gap-8 md:gap-4 shadow-xl">
            
            <div className="flex items-center gap-4 group cursor-pointer hover:bg-white/5 p-2 rounded-xl transition-colors">
               <div className="bg-[#2a1711] text-[#f59e0b] p-3 rounded-xl group-hover:scale-110 group-hover:bg-[#f59e0b] group-hover:text-white transition-all">
                 <Code2 className="w-6 h-6" />
               </div>
               <div>
                 <div className="text-xl font-bold text-white group-hover:text-[#f59e0b] transition-colors">10,000+</div>
                 <div className="text-xs text-gray-500">DSA Questions</div>
               </div>
            </div>

            <div className="hidden lg:block w-px h-12 bg-white/5 self-center"></div>

            <div className="flex items-center gap-4 group cursor-pointer hover:bg-white/5 p-2 rounded-xl transition-colors">
               <div className="bg-[#112a1f] text-[#10b981] p-3 rounded-xl group-hover:scale-110 group-hover:bg-[#10b981] group-hover:text-white transition-all">
                 <TerminalSquare className="w-6 h-6" />
               </div>
               <div>
                 <div className="text-xl font-bold text-white group-hover:text-[#10b981] transition-colors">8,000+</div>
                 <div className="text-xs text-gray-500">LeetCode Problems</div>
               </div>
            </div>

            <div className="hidden lg:block w-px h-12 bg-white/5 self-center"></div>

            <div className="flex items-center gap-4 group cursor-pointer hover:bg-white/5 p-2 rounded-xl transition-colors">
               <div className="bg-[#2a2211] text-[#eab308] p-3 rounded-xl group-hover:scale-110 group-hover:bg-[#eab308] group-hover:text-white transition-all">
                 <BookOpen className="w-6 h-6" />
               </div>
               <div>
                 <div className="text-xl font-bold text-white group-hover:text-[#eab308] transition-colors">500+</div>
                 <div className="text-xs text-gray-500">Company PYQs</div>
               </div>
            </div>

            <div className="hidden lg:block w-px h-12 bg-white/5 self-center"></div>

            <div className="flex items-center gap-4 group cursor-pointer hover:bg-white/5 p-2 rounded-xl transition-colors">
               <div className="bg-[#19192b] text-[#8b5cf6] p-3 rounded-xl group-hover:scale-110 group-hover:bg-[#8b5cf6] group-hover:text-white transition-all">
                 <FileText className="w-6 h-6" />
               </div>
               <div>
                 <div className="text-xl font-bold text-white group-hover:text-[#8b5cf6] transition-colors">50,000+</div>
                 <div className="text-xs text-gray-500">Interview Questions</div>
               </div>
            </div>

            <div className="hidden lg:block w-px h-12 bg-white/5 self-center"></div>

            <div className="flex items-center gap-4 group cursor-pointer hover:bg-white/5 p-2 rounded-xl transition-colors">
               <div className="bg-[#2a111a] text-[#ec4899] p-3 rounded-xl group-hover:scale-110 group-hover:bg-[#ec4899] group-hover:text-white transition-all">
                 <Building2 className="w-6 h-6" />
               </div>
               <div>
                 <div className="text-xl font-bold text-white group-hover:text-[#ec4899] transition-colors">100+</div>
                 <div className="text-xs text-gray-500">Top Companies</div>
               </div>
            </div>

            <div className="hidden lg:block w-px h-12 bg-white/5 self-center"></div>

            <div className="flex items-center gap-4 group cursor-pointer hover:bg-white/5 p-2 rounded-xl transition-colors">
               <div className="bg-[#111c2a] text-[#3b82f6] p-3 rounded-xl group-hover:scale-110 group-hover:bg-[#3b82f6] group-hover:text-white transition-all">
                 <div className="text-lg font-bold text-center leading-none">AI</div>
               </div>
               <div>
                 <div className="text-xl font-bold text-white group-hover:text-[#3b82f6] transition-colors">AI-Powered</div>
                 <div className="text-xs text-gray-500">Solutions & Explanations</div>
               </div>
            </div>

         </div>
      </div>

      {/* Trusted By Section */}
      <div className="relative z-20 w-full px-6 md:px-12 lg:px-24 xl:px-32 pb-20 pt-8 text-center">
          <p className="text-[12px] text-gray-500 mb-8 uppercase tracking-widest font-medium">Trusted by students preparing for</p>
          
          <div className="flex flex-wrap justify-center items-center gap-10 md:gap-16 opacity-60">
             {/* Text-based generic company variants for visual */}
             <div className="text-xl font-bold font-sans tracking-tight text-white/80 hover:text-white hover:opacity-100 transition-all cursor-pointer hover:-translate-y-1">Google</div>
             <div className="text-xl font-bold font-serif tracking-tight text-white/80 hover:text-white hover:opacity-100 transition-all cursor-pointer hover:-translate-y-1">amazon</div>
             <div className="text-xl font-bold flex items-center gap-2 text-white/80 hover:text-white hover:opacity-100 transition-all cursor-pointer hover:-translate-y-1">
               <div className="grid grid-cols-2 gap-0.5">
                  <div className="w-2.5 h-2.5 bg-white"></div>
                  <div className="w-2.5 h-2.5 bg-white"></div>
                  <div className="w-2.5 h-2.5 bg-white"></div>
                  <div className="w-2.5 h-2.5 bg-white"></div>
               </div>
               Microsoft
             </div>
             <div className="text-2xl font-bold tracking-tight text-white/80 hover:text-white hover:opacity-100 transition-all cursor-pointer hover:-translate-y-1">Adobe</div>
             <div className="text-xl font-bold tracking-tight text-white/80 hover:text-white hover:opacity-100 transition-all cursor-pointer hover:-translate-y-1">Apple</div>
             <div className="text-xl tracking-tight text-white/80 hover:text-white hover:opacity-100 transition-all cursor-pointer hover:-translate-y-1">Meta</div>
             <div className="text-xl font-bold font-sans tracking-tight text-red-500/80 hover:text-red-500 hover:opacity-100 transition-all cursor-pointer hover:-translate-y-1">NETFLIX</div>
             <div className="text-xl font-bold tracking-tight text-white/80 hover:text-white hover:opacity-100 transition-all cursor-pointer hover:-translate-y-1">Uber</div>
             <div className="text-lg font-bold font-sans tracking-widest text-white/80 hover:text-white hover:opacity-100 transition-all cursor-pointer hover:-translate-y-1">SAMSUNG</div>
             <div className="text-xl font-bold font-sans tracking-tight text-white/80 hover:text-white hover:opacity-100 transition-all cursor-pointer hover:-translate-y-1">Linked<span className="bg-blue-600 text-white px-1 rounded-sm ml-0.5">in</span></div>
             <div className="text-sm font-medium text-gray-500 italic hover:text-white transition-all cursor-pointer">and more...</div>
          </div>
      </div>

      {/* Drafts Section for Expired Tests */}
      {expiredTests.length > 0 && (
        <section className="relative z-20 w-full px-6 md:px-12 lg:px-24 xl:px-32 py-16 bg-[#121520] border-t border-white/5">
          <div className="max-w-7xl mx-auto">
            <h3 className="text-xl font-bold text-gray-400 mb-8 flex items-center gap-2">
               <FileText className="w-5 h-5 text-gray-500" /> Drafts <span className="text-sm font-normal text-gray-500 ml-2">(Expired Announcements)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {expiredTests.map(t => (
                <div key={t.id} className="bg-[#0B0D17] border border-white/5 p-6 rounded-2xl opacity-60">
                   <h4 className="font-bold text-gray-300 text-lg mb-2">{t.title}</h4>
                   <p className="text-sm text-gray-500 font-mono">Expired: {t.assignDate ? `${t.assignDate} at ${t.assignTime}` : 'N/A'}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

    </motion.div>
  );
}

