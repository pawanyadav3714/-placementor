import { useState, useMemo } from "react";
import { Topic, Module } from "./roadmapData";
import { 
  Search, 
  ChevronRight, 
  CheckCircle, 
  Layers, 
  Menu, 
  X,
  BookOpen,
  Code,
  Cpu,
  ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DocumentationLayoutProps {
  modules: Module[];
  selectedTopic: Topic | null;
  onSelectTopic: (topic: Topic) => void;
  onClose: () => void;
  completedTopicIds: string[];
  children: React.ReactNode;
  activeTab: string;
}

export default function DocumentationLayout({
  modules,
  selectedTopic,
  onSelectTopic,
  onClose,
  completedTopicIds,
  children,
  activeTab
}: DocumentationLayoutProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const filteredModules = useMemo(() => {
    return modules.map(m => {
      const matchedTopics = m.topics.filter(t => 
        t.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return { ...m, topics: matchedTopics };
    }).filter(m => m.topics.length > 0);
  }, [modules, searchQuery]);

  return (
    <div className="flex h-full bg-[#090D1A] relative overflow-hidden">
      
      {/* MOBILE SIDEBAR TOGGLE */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed bottom-6 right-6 z-50 w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-2xl shadow-indigo-600/40 active:scale-95 transition-all"
      >
        {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* SIDEBAR */}
      <aside className={`
        fixed inset-0 z-40 lg:relative lg:inset-auto lg:z-0
        w-full lg:w-72 xl:w-80 bg-[#0A0E1C] border-r border-white/5 flex flex-col transition-transform duration-300
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* SIDEBAR HEADER */}
        <div className="p-6 border-b border-white/5">
          <button 
            onClick={onClose}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Overview
          </button>
          
          <div className="flex items-center gap-3 mb-6">
            <div className={`p-2 rounded-xl ${
              activeTab === 'javascript' ? 'bg-indigo-500/10 text-indigo-400' :
              activeTab === 'nodejs' ? 'bg-emerald-500/10 text-emerald-400' :
              'bg-pink-500/10 text-pink-400'
            }`}>
              {activeTab === 'javascript' && <BookOpen className="w-5 h-5" />}
              {activeTab === 'nodejs' && <Cpu className="w-5 h-5" />}
              {activeTab === 'dsa' && <Code className="w-5 h-5" />}
            </div>
            <h2 className="font-bold text-white capitalize">{activeTab} Roadmap</h2>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text"
              placeholder="Search topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/30 transition-all"
            />
          </div>
        </div>

        {/* SIDEBAR CONTENT */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-4 px-4 space-y-8">
          {filteredModules.map((module) => (
            <div key={module.id} className="space-y-3">
              <div className="flex items-center gap-2 px-3">
                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                  Module {module.id}
                </span>
                {module.id === 4 && (
                  <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 text-[8px] font-bold rounded uppercase tracking-tighter border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.3)] animate-pulse">
                    Focused
                  </span>
                )}
                <div className="h-px flex-1 bg-white/5" />
              </div>
              <h3 className="px-3 text-xs font-bold text-gray-400 mb-2 truncate">
                {module.title}
              </h3>
              <div className="space-y-1">
                {module.topics.map((topic) => {
                  const isSelected = selectedTopic?.id === topic.id;
                  const isDone = completedTopicIds.includes(topic.id);
                  
                  return (
                    <button
                      key={topic.id}
                      onClick={() => {
                        onSelectTopic(topic);
                        setIsSidebarOpen(false);
                      }}
                      className={`
                        w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-between group
                        ${isSelected ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent'}
                      `}
                    >
                      <div className="flex items-center gap-3 truncate">
                        {isDone ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? 'bg-indigo-500' : 'bg-gray-700 group-hover:bg-gray-500'}`} />
                        )}
                        <span className="truncate">{topic.title}</span>
                      </div>
                      {isSelected && <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 h-full overflow-hidden flex flex-col bg-[#090D1A]">
        {children}
      </main>

      {/* OVERLAY FOR MOBILE SIDEBAR */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

    </div>
  );
}
