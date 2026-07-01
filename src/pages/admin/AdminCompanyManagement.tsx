import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import { 
  ArrowLeft, Upload, FileText, CheckCircle2, 
  Code, Mic, Brain, Calculator, Briefcase, FileClock, 
  Loader2, Image as ImageIcon, Trash2, Database, Plus, Sparkles, X, Edit2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot, collection, addDoc, query, orderBy, deleteDoc, updateDoc } from 'firebase/firestore';
import { extractTextFromPDF, extractTextPagesFromPDF } from '../../utils/pdfExtractor';


export default function AdminCompanyManagement() {
  const { company } = useParams();
  const navigate = useNavigate();

  const tabs = [
    { id: 'dsa', label: `${company} DSA and Dev Questions`, icon: Code },
    { id: 'aptitude', label: 'Technical Aptitude', icon: Brain },
  ];

  const [activeTab, setActiveTab] = useState('dsa');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [extractedItems, setExtractedItems] = useState<any[]>([]);
  const [existingQuestions, setExistingQuestions] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New states for Aptitude management
  const [showManualForm, setShowManualForm] = useState(false);
  const [showAiGenerator, setShowAiGenerator] = useState(false);
  const [manualQuestion, setManualQuestion] = useState({
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 'A',
    explanation: '',
    difficulty: 'Medium',
    topic: 'Technical Aptitude'
  });
  const [aiGenConfig, setAiGenConfig] = useState({
    count: 5,
    difficulty: 'Medium',
    topic: 'Operating Systems'
  });

  useEffect(() => {
    if (!company) return;
    if (activeTab === 'dsa') {
      const docRef = doc(db, 'company_prep', company);
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setExistingQuestions(data.dsa || []);
        } else {
          setExistingQuestions([]);
        }
      });
      return () => unsubscribe();
    } else if (activeTab === 'aptitude') {
      // Load global aptitude questions
      const q = query(collection(db, 'technical_aptitude'), orderBy('uploadDate', 'desc'));
      const unsubscribe = onSnapshot(q, (snap) => {
        const questions = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setExistingQuestions(questions);
      });
      return () => unsubscribe();
    }
  }, [company, activeTab]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setUploadProgress(`Initializing processing for ${files.length} file(s)...`);
    
    // We don't want to clear extractedItems if we are adding more
    // But usually, a new upload starts a new batch. 
    // Let's clear if it's a fresh click on the browse button.
    setExtractedItems([]);

    const allExtractedItems: any[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isPdf = file.type === 'application/pdf';
        const maxSize = isPdf ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
        
        if (file.size > maxSize) {
          console.warn(`File ${file.name} is too large. Skipping.`);
          continue;
        }

        setUploadProgress(`Processing ${i + 1}/${files.length}: ${file.name}...`);

        if (isPdf) {
          try {
            const pages = await extractTextPagesFromPDF(file);
            if (pages.length === 0) continue;

            const chunkSize = 15;
            const chunkPromises: Promise<any[]>[] = [];

            for (let j = 0; j < pages.length; j += chunkSize) {
              const chunkPages = pages.slice(j, j + chunkSize);
              const chunkText = chunkPages.join('\n');

              const payload = {
                documentText: chunkText,
                company: company,
                isAptitude: activeTab === 'aptitude'
              };

              chunkPromises.push((async () => {
                const response = await fetch('/api/admin/parse-company-document', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload)
                });
                const data = await response.json();
                return Array.isArray(data) ? data : [];
              })());
            }

            const results = await Promise.all(chunkPromises);
            allExtractedItems.push(...results.flat());
          } catch (err) {
            console.error(`Error processing PDF ${file.name}:`, err);
          }
        } else if (file.type.startsWith('image/')) {
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });

          try {
            const payload = {
              documentBase64: base64.split(',')[1],
              documentMimeType: file.type,
              company: company,
              isAptitude: activeTab === 'aptitude'
            };

            const response = await fetch('/api/admin/parse-company-document', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            const data = await response.json();
            
            const mapped = Array.isArray(data) ? data.map((item: any) => ({
              ...item,
              category: item.category || item.type || (activeTab === 'dsa' ? 'DSA' : 'Aptitude'),
              type: item.type || item.category || (activeTab === 'dsa' ? 'DSA' : 'Aptitude'),
              title: item.title || item.text || 'Untitled Question',
              text: item.text || item.title || 'Untitled Question',
              sourceFile: file.name
            })) : [];
            
            allExtractedItems.push(...mapped);
          } catch (err) {
            console.error(`Error processing image ${file.name}:`, err);
          }
        }
      }

      setExtractedItems(allExtractedItems);
    } catch (err) {
      console.error("Batch upload error:", err);
      alert("An unexpected error occurred during batch processing.");
    } finally {
      setIsProcessing(false);
      setUploadProgress('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveToDatabase = async () => {
    if (!company || extractedItems.length === 0) return;
    
    try {
      if (activeTab === 'aptitude') {
        // Save each as a separate document in the global collection
        const batch = extractedItems.map(item => 
          addDoc(collection(db, 'technical_aptitude'), {
            ...item,
            global: true,
            uploadedAt: new Date().toISOString()
          })
        );
        await Promise.all(batch);
        setExtractedItems([]);
        alert(`Successfully saved ${extractedItems.length} questions to global Technical Aptitude bank!`);
      } else {
        const docRef = doc(db, 'company_prep', company);
        const docSnap = await getDoc(docRef);
        let existingData = docSnap.exists() ? docSnap.data() : {};
        
        const targetList = existingData[activeTab] || [];
        
        // Filter out duplicates based on title/question
        const uniqueNewItems = extractedItems.filter(newItem => 
          !targetList.some((oldItem: any) => (oldItem.title === newItem.title) || (oldItem.question === newItem.question))
        );

        const newData = {
          ...existingData,
          [activeTab]: [...targetList, ...uniqueNewItems]
        };
        
        await setDoc(docRef, newData, { merge: true });
        
        setExtractedItems([]);
        alert(`Successfully saved ${uniqueNewItems.length} questions to database!`);
      }
    } catch (err) {
      console.error("Error saving to database:", err);
      alert('Failed to save to database.');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newItem = {
      ...manualQuestion,
      title: manualQuestion.question.slice(0, 50) + '...',
      type: 'Aptitude MCQ',
      category: 'Technical Aptitude',
      answer: manualQuestion.correctAnswer,
      solution: manualQuestion.explanation,
      solutionAvailable: !!manualQuestion.explanation,
      sourceFile: 'Manual Entry',
      uploadDate: new Date().toLocaleDateString(),
      uploadedBy: 'Admin',
      format: 'Objective'
    };
    setExtractedItems(prev => [...prev, newItem]);
    setShowManualForm(false);
    setManualQuestion({
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 'A',
      explanation: '',
      difficulty: 'Medium',
      topic: 'Technical Aptitude'
    });
  };

  const handleAiGenerate = async () => {
    setIsProcessing(true);
    setUploadProgress('AI is crafting professional Technical Aptitude questions...');
    try {
      const response = await fetch('/api/admin/generate-aptitude-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...aiGenConfig
        })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setExtractedItems(prev => [...prev, ...data]);
      setShowAiGenerator(false);
    } catch (err) {
      console.error("AI Generation failed:", err);
      alert('Failed to generate questions.');
    } finally {
      setIsProcessing(false);
      setUploadProgress('');
    }
  };

  const handleDeleteExisting = async (itemOrIndex: any) => {
    if (!company) return;
    try {
      if (activeTab === 'aptitude') {
        if (itemOrIndex.id) {
          await deleteDoc(doc(db, 'technical_aptitude', itemOrIndex.id));
        }
      } else {
        const indexToDelete = typeof itemOrIndex === 'number' ? itemOrIndex : -1;
        if (indexToDelete === -1) return;

        const docRef = doc(db, 'company_prep', company);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return;
        
        let existingData = docSnap.data();
        const targetList = existingData[activeTab] || [];
        
        const newList = targetList.filter((_: any, idx: number) => idx !== indexToDelete);
        
        await setDoc(docRef, { ...existingData, [activeTab]: newList }, { merge: true });
      }
    } catch (err) {
      console.error("Error deleting from database:", err);
      alert('Failed to delete question.');
    }
  };

  return (
    <AppLayout activeTab="admin-placement">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 pb-20">
        
        {/* Header */}
        <div className="bg-[#0d1326] -mx-4 md:-mx-8 -mt-4 md:-mt-8 p-4 md:p-6 border-b border-white/5 mb-4 md:mb-6">
          <button 
            onClick={() => navigate('/admin/placement')}
            className="text-gray-400 hover:text-white flex items-center gap-1.5 mb-3 md:mb-4 cursor-pointer text-xs md:text-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </button>
          
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white mb-1 md:mb-1.5 capitalize">{company} Management</h1>
            <p className="text-[10px] md:text-sm text-gray-400">Manage questions and tests for {company} candidates.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 md:mb-6">
          <div className="inline-flex items-center bg-[#151B2B] p-0.5 md:p-1 rounded-md md:rounded-lg border border-white/5 overflow-x-auto no-scrollbar w-full sm:w-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-1 sm:flex-none items-center justify-center gap-1 md:gap-1.5 px-2 py-1 md:px-3 md:py-1.5 rounded text-[9px] md:text-[10px] whitespace-nowrap transition-all cursor-pointer font-medium ${
                    activeTab === tab.id 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-2.5 h-2.5 md:w-3 md:h-3 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {activeTab === 'aptitude' && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button 
                onClick={() => setShowManualForm(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Manual MCQ
              </button>
              <button 
                onClick={() => setShowAiGenerator(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" /> AI Generate
              </button>
            </div>
          )}
        </div>

        {/* Manual Form Modal */}
        {showManualForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#0f172a] border border-white/10 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-[#1e293b]/50">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <Plus className="w-5 h-5 text-indigo-400" /> Create Manual Aptitude MCQ
                </h3>
                <button onClick={() => setShowManualForm(false)} className="text-gray-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleManualSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">Question Statement</label>
                  <textarea 
                    required
                    value={manualQuestion.question}
                    onChange={e => setManualQuestion({...manualQuestion, question: e.target.value})}
                    placeholder="e.g. How do you handle conflict in a team?"
                    className="w-full bg-[#1e293b] border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:border-indigo-500 outline-none min-h-[80px]"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['A', 'B', 'C', 'D'].map((opt, i) => (
                    <div key={opt}>
                      <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">Option {opt}</label>
                      <input 
                        required
                        value={manualQuestion.options[i]}
                        onChange={e => {
                          const newOpts = [...manualQuestion.options];
                          newOpts[i] = e.target.value;
                          setManualQuestion({...manualQuestion, options: newOpts});
                        }}
                        className="w-full bg-[#1e293b] border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:border-indigo-500 outline-none"
                        placeholder={`Enter option ${opt}`}
                      />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">Correct Answer</label>
                    <select 
                      value={manualQuestion.correctAnswer}
                      onChange={e => setManualQuestion({...manualQuestion, correctAnswer: e.target.value})}
                      className="w-full bg-[#1e293b] border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:border-indigo-500 outline-none"
                    >
                      <option value="A">Option A</option>
                      <option value="B">Option B</option>
                      <option value="C">Option C</option>
                      <option value="D">Option D</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">Difficulty</label>
                    <select 
                      value={manualQuestion.difficulty}
                      onChange={e => setManualQuestion({...manualQuestion, difficulty: e.target.value})}
                      className="w-full bg-[#1e293b] border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:border-indigo-500 outline-none"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">Explanation / Solution</label>
                  <textarea 
                    value={manualQuestion.explanation}
                    onChange={e => setManualQuestion({...manualQuestion, explanation: e.target.value})}
                    placeholder="Why is this the correct answer?"
                    className="w-full bg-[#1e293b] border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:border-indigo-500 outline-none min-h-[60px]"
                  />
                </div>
              </form>
              <div className="p-6 bg-[#1e293b]/30 border-t border-white/5 flex justify-end gap-3">
                <button onClick={() => setShowManualForm(false)} className="px-4 py-2 text-gray-400 hover:text-white font-bold text-sm cursor-pointer">Cancel</button>
                <button onClick={handleManualSubmit} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-lg cursor-pointer">Create Question</button>
              </div>
            </motion.div>
          </div>
        )}

        {/* AI Generator Modal */}
        {showAiGenerator && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#0f172a] border border-white/10 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-indigo-600/20">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" /> AI Aptitude Question Generator
                </h3>
                <button onClick={() => setShowAiGenerator(false)} className="text-gray-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">Topic Focus</label>
                  <select 
                    value={aiGenConfig.topic}
                    onChange={e => setAiGenConfig({...aiGenConfig, topic: e.target.value})}
                    className="w-full bg-[#1e293b] border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:border-indigo-500 outline-none"
                  >
                    <option value="Operating Systems">Operating Systems</option>
                    <option value="DBMS">Database Management (SQL)</option>
                    <option value="Networking">Computer Networks</option>
                    <option value="Computer Architecture">Computer Architecture</option>
                    <option value="OOP">Object Oriented Programming</option>
                    <option value="Software Engineering">Software Engineering</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">Number of Questions</label>
                    <input 
                      type="number"
                      min="1"
                      max="20"
                      value={aiGenConfig.count}
                      onChange={e => setAiGenConfig({...aiGenConfig, count: parseInt(e.target.value)})}
                      className="w-full bg-[#1e293b] border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">Difficulty</label>
                    <select 
                      value={aiGenConfig.difficulty}
                      onChange={e => setAiGenConfig({...aiGenConfig, difficulty: e.target.value})}
                      className="w-full bg-[#1e293b] border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:border-indigo-500 outline-none"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                </div>
                <div className="bg-indigo-500/5 border border-indigo-500/10 p-4 rounded-xl">
                  <p className="text-[10px] text-indigo-300 leading-relaxed">
                    AI will generate MCQs with 4 options, a correct answer, and a detailed explanation tailored for Technical Aptitude assessments.
                  </p>
                </div>
              </div>
              <div className="p-6 bg-[#1e293b]/30 border-t border-white/5 flex justify-end gap-3">
                <button onClick={() => setShowAiGenerator(false)} className="px-4 py-2 text-gray-400 hover:text-white font-bold text-sm cursor-pointer">Cancel</button>
                <button 
                  onClick={handleAiGenerate}
                  disabled={isProcessing}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generate with Gemini
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Upload Area */}
        <div className="bg-[#151B2B] border border-white/5 rounded-lg md:rounded-xl p-3 md:p-4">
           <h2 className="text-sm md:text-base font-bold mb-2 md:mb-3 flex items-start sm:items-center gap-1.5 md:gap-2">
             <Upload className="w-4 h-4 md:w-5 md:h-5 text-indigo-400 shrink-0 mt-0.5 sm:mt-0" /> 
             <span className="leading-tight">Upload Content for AI Parsing</span>
           </h2>
           <p className="text-[10px] md:text-xs text-gray-400 mb-3 md:mb-4 max-w-3xl leading-relaxed">
             Upload PDFs, Images, or DOCX files containing previous year questions, DSA and development questions, or mock interview experiences. Our AI engine will automatically extract, classify by topic/difficulty, and check for duplicates before storing them in the {company} question bank.
           </p>

           <div className="border border-dashed border-gray-700 hover:border-indigo-500 rounded-lg md:rounded-xl p-4 md:p-6 text-center transition-colors">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                multiple
                onChange={handleFileUpload}
              />
              <ImageIcon className="w-8 h-8 md:w-10 md:h-10 text-gray-600 mx-auto mb-2 md:mb-3" />
              <h3 className="text-sm md:text-base font-bold text-gray-300 mb-1">Drag & Drop Documents</h3>
              <p className="text-[9px] md:text-[10px] text-gray-500 mb-3 md:mb-4">Supports PDF, JPG, PNG, WEBP, DOCX</p>
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 md:px-6 py-1.5 md:py-2 rounded-md md:rounded-lg text-xs md:text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 mx-auto cursor-pointer"
              >
                {isProcessing ? (
                  <><Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> <span className="truncate">Extracting...</span></>
                ) : (
                  <>Browse Files</>
                )}
              </button>
              {uploadProgress && (
                <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20 max-w-md mx-auto">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400 shrink-0" />
                  <span>{uploadProgress}</span>
                </div>
              )}
           </div>
        </div>

        {/* AI Extracted Staging Area */}
        {extractedItems.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl md:rounded-3xl p-5 md:p-8 mb-6 md:mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 md:mb-6">
              <h3 className="text-lg md:text-xl font-bold flex flex-wrap items-center gap-2">
                <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-indigo-400 shrink-0" /> <span className="truncate">AI Parsed Preview</span>
              </h3>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111827] border border-white/10 rounded-md shadow-sm self-start sm:self-auto">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider">Engine:</span>
                <span className="text-[10px] font-bold text-indigo-300">Gemini 3.5 Flash</span>
              </div>
            </div>
            
            <div className="space-y-4">
              {extractedItems.map((item, idx) => (
                <div key={idx} className="bg-[#111827] border border-white/10 p-6 rounded-2xl flex flex-col items-stretch gap-6 relative group overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-50"></div>
                  
                  <div className="flex justify-between items-start">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-[10px] font-bold px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded uppercase tracking-wider">
                        {item.category === 'DSA' ? 'Technical' : 'Aptitude MCQ'}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${
                        item.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400' :
                        item.difficulty === 'Hard' ? 'bg-red-500/10 text-red-400' :
                        'bg-amber-500/10 text-amber-400'
                      }`}>
                        {item.difficulty}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-1 bg-white/5 text-gray-400 rounded uppercase tracking-wider">
                        {item.topic}
                      </span>
                    </div>
                    <button 
                      onClick={() => setExtractedItems(prev => prev.filter((_, i) => i !== idx))}
                      className="text-gray-500 hover:text-red-400 bg-white/5 hover:bg-red-400/10 p-2 rounded-lg transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-lg font-bold text-white leading-tight">
                      <span className="text-indigo-400 mr-2">Q:</span>
                      {item.question}
                    </h4>
                    
                    {item.options && item.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                        {item.options.map((opt: string, i: number) => {
                          const letter = String.fromCharCode(65 + i);
                          const isCorrect = item.correctAnswer === letter || item.answer === letter || item.answer === opt;
                          return (
                            <div key={i} className={`p-3 rounded-xl border text-sm flex items-center gap-3 transition-colors ${
                              isCorrect ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/5 text-gray-400'
                            }`}>
                              <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                                isCorrect ? 'bg-emerald-500/20' : 'bg-white/10'
                              }`}>{letter}</span>
                              <span>{opt}</span>
                              {isCorrect && <CheckCircle2 className="w-4 h-4 ml-auto" />}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {item.solution && (
                      <div className="mt-4 p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
                        <p className="text-xs font-bold text-indigo-400 mb-2 uppercase flex items-center gap-1.5">
                          <Brain className="w-3.5 h-3.5" /> Explanation
                        </p>
                        <p className="text-sm text-gray-400 leading-relaxed italic">
                          {item.solution}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-8 flex justify-end">
              <button 
                onClick={handleSaveToDatabase}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5"/> Send to Database (Approve)
              </button>
            </div>
          </motion.div>
        )}

        {/* Existing Database Questions Section */}
        {existingQuestions.length > 0 && (
          <div className="bg-[#151B2B] border border-white/5 rounded-3xl p-8 mb-8">
            <h3 className="text-xl font-bold flex items-center gap-2 mb-6">
              <Database className="w-6 h-6 text-gray-400" /> Existing Database Questions
            </h3>
            
            <div className="space-y-4">
              {existingQuestions.map((item, idx) => (
                <div key={idx} className="bg-[#0A0F1E] border border-white/5 p-6 rounded-2xl flex flex-col items-stretch gap-4 relative hover:border-indigo-500/30 transition-colors group">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-wrap items-center gap-3">
                       <span className="text-[10px] font-bold px-2 py-1 bg-gray-800 text-gray-300 rounded uppercase">{item.category || activeTab}</span>
                       <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${
                        item.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400' :
                        item.difficulty === 'Hard' ? 'bg-red-500/10 text-red-400' :
                        'bg-amber-500/10 text-amber-400'
                      }`}>
                        {item.difficulty || 'Medium'}
                      </span>
                       <span className="text-[10px] font-bold px-2 py-1 bg-gray-800 text-gray-400 rounded uppercase">{item.topic || company}</span>
                    </div>
                    <button 
                      onClick={() => handleDeleteExisting(activeTab === 'aptitude' ? item : idx)}
                      className="text-gray-600 hover:text-red-400 bg-red-400/5 hover:bg-red-400/10 p-2 rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                      title="Delete Question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-lg font-bold text-white leading-snug">{item.question || item.title}</h4>
                    
                    {item.options && item.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {item.options.map((opt: string, i: number) => {
                          const letter = String.fromCharCode(65 + i);
                          const isCorrect = item.correctAnswer === letter || item.answer === letter || item.answer === opt;
                          return (
                            <div key={i} className={`p-2.5 rounded-lg border text-[13px] flex items-center gap-2.5 ${
                              isCorrect ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-white/[0.02] border-white/5 text-gray-500'
                            }`}>
                              <span className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold ${
                                isCorrect ? 'bg-emerald-500/20' : 'bg-white/5'
                              }`}>{letter}</span>
                              <span className="truncate">{opt}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
