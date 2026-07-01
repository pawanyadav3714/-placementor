import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/AppLayout';
import { motion } from 'framer-motion';
import { Settings, Users, Calendar, Plus, Save, Clock, Trash2, Upload, CheckCircle2, XCircle, Wand2 } from 'lucide-react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot, collection, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { extractTextFromPDF, extractTextPagesFromPDF } from '../../utils/pdfExtractor';

export default function AdminTestPapers() {
  const [testName, setTestName] = useState('');
  const [duration, setDuration] = useState('90');
  const [assignDate, setAssignDate] = useState('');
  const [assignTime, setAssignTime] = useState('');
  
  const [bankData, setBankData] = useState<Record<string, any[]>>({});
  const saveToFirestore = async (data: Record<string, any[]>) => {
    try {
      const docRef = doc(db, 'system', 'question_banks');
      const cappedData: Record<string, any[]> = {};
      Object.keys(data).forEach(key => {
        if (Array.isArray(data[key])) {
          cappedData[key] = data[key].slice(0, 120);
        } else {
          cappedData[key] = data[key];
        }
      });
      await setDoc(docRef, cappedData);
    } catch (err) {
      console.error("Error writing to Firestore:", err);
    }
  };
  const [selectedQuestions, setSelectedQuestions] = useState<any[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [extractedQuestions, setExtractedQuestions] = useState<any[]>([]);
  const [isDeduplicating, setIsDeduplicating] = useState(false);

  // AI Question Generator State
  const [aiGenTopic, setAiGenTopic] = useState('Data Structures');
  const [aiGenLevel, setAiGenLevel] = useState('Medium');
  const [aiGenType, setAiGenType] = useState('multiple_choice');
  const [aiGenCount, setAiGenCount] = useState('5');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState<any[]>([]);

  // Manual Question Entry State
  const [manualCount, setManualCount] = useState<string>('5');
  const [manualQuestionsEditor, setManualQuestionsEditor] = useState<any[]>([]);

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'create_test' | 'question_bank' | 'released_tests'>('create_test');
  const [releasedTests, setReleasedTests] = useState<any[]>([]);
  const [questionFilter, setQuestionFilter] = useState<'all' | 'objective' | 'subjective'>('all');

  useEffect(() => {
    const docRef = doc(db, 'system', 'question_banks');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBankData(data);
      } else {
        setBankData({});
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const qReleased = collection(db, 'released_tests');
    const unsubscribe = onSnapshot(qReleased, (snapshot) => {
      const tests: any[] = [];
      snapshot.forEach(doc => {
        tests.push({ id: doc.id, ...doc.data() });
      });
      // Sort by creation desc
      tests.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setReleasedTests(tests);
    });
    return () => unsubscribe();
  }, []);

  const generateManualEditor = () => {
    const count = parseInt(manualCount) || 1;
    const initial = [];
    for (let i = 0; i < count; i++) {
        // eslint-disable-next-line react-hooks/purity
        initial.push({ id: Date.now() + i, question: '', type: 'text', answer: '', options: ['', '', '', ''] });
    }
    setManualQuestionsEditor(initial);
  };

  const handleUpdateManualQuestion = (index: number, field: string, value: any) => {
    const updated = [...manualQuestionsEditor];
    updated[index] = { ...updated[index], [field]: value };
    setManualQuestionsEditor(updated);
  };

  const handleUpdateManualOption = (qIdx: number, oIdx: number, val: string) => {
    const updated = [...manualQuestionsEditor];
    const newOptions = [...updated[qIdx].options];
    newOptions[oIdx] = val;
    updated[qIdx].options = newOptions;
    setManualQuestionsEditor(updated);
  };

  const handleSaveManualQuestions = async () => {
    const validQuestions = manualQuestionsEditor.filter(q => q.question.trim() !== '');
    if (validQuestions.length === 0) {
      alert("No valid questions to add.");
      return;
    }
    
    try {
      const docRef = doc(db, 'system', 'question_banks');
      const currentData = { ...bankData };
      if (!currentData['manual']) currentData['manual'] = [];
      
      const cleanedQuestions = validQuestions.map(q => ({
        question: q.question,
        options: q.type === 'multiple_choice' ? q.options.filter((o: string) => o.trim() !== '') : [],
        answer: q.answer,
        type: q.type,
        topic: 'Manual',
        difficulty: 'medium',
        // eslint-disable-next-line react-hooks/purity
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
      }));

      currentData['manual'].push(...cleanedQuestions);
      await saveToFirestore(currentData);
      setManualQuestionsEditor([]); // reset
      setManualCount('5');
      alert(`Successfully saved ${cleanedQuestions.length} manual questions to the bank!`);
    } catch (err) {
      console.error(err);
      alert('Failed to save manual questions');
    }
  };

  const handleGenerateAIQuestions = async () => {
    setIsGeneratingAI(true);
    setAiGeneratedQuestions([]);
    try {
      const existingQuestionTexts = Object.values(bankData).flat().map((q: any) => (q.question || q.text || q.title || '').toLowerCase().trim());

      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiGenTopic,
          difficulty: aiGenLevel,
          count: parseInt(aiGenCount) || 5,
          questionType: aiGenType,
          existingQuestions: existingQuestionTexts
        })
      });
      const data = await res.json();
      if (data.questions && Array.isArray(data.questions)) {
        // Auto-reject any question that is already in the database
        const uniqueQuestions = data.questions.filter((q: any) => {
          const textToCompare = (q.text || q.question || '').toLowerCase().trim();
          const isDuplicate = existingQuestionTexts.some(ext => {
             // fuzzy matching: check if it's very similar
             return ext.length > 10 && (ext.includes(textToCompare) || textToCompare.includes(ext));
          });
          return !isDuplicate;
        });

        setAiGeneratedQuestions(uniqueQuestions);
        
        if (uniqueQuestions.length < data.questions.length) {
          alert(`Auto-rejected ${data.questions.length - uniqueQuestions.length} duplicate questions that were already saved.`);
        }
      } else {
        alert('Failed to generate questions. Please try again.');
      }
    } catch (err) {
      console.error(err);
      alert('Error generating questions.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleAcceptAIQuestion = async (q: any, idx: number) => {
    try {
      const docRef = doc(db, 'system', 'question_banks');
      const currentData = { ...bankData };
      if (!currentData['ai-generated']) currentData['ai-generated'] = [];
      
      const toSave = { ...q, question: q.text || q.question, type: q.type || aiGenType, difficulty: aiGenLevel };
      currentData['ai-generated'].push(toSave);
      
      await saveToFirestore(currentData);
      
      setAiGeneratedQuestions(prev => prev.filter((_, i) => i !== idx));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeclineAIQuestion = (idx: number) => {
    setAiGeneratedQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleQuestion = (q: any) => {
    if (selectedQuestions.find(x => x.question === q.question)) {
      setSelectedQuestions(selectedQuestions.filter(x => x.question !== q.question));
    } else {
      setSelectedQuestions([...selectedQuestions, q]);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === 'application/pdf';
    const maxSize = isPdf ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`File is too large. Please upload files smaller than ${isPdf ? '50MB' : '5MB'}.`);
      return;
    }

    setIsExtracting(true);
    setUploadProgress('Extracting text from PDF...');
    try {
      if (isPdf) {
        let pages: string[] = [];
        try {
          pages = await extractTextPagesFromPDF(file);
        } catch (pdfErr: any) {
          const errMsg = pdfErr instanceof Error ? pdfErr.message : String(pdfErr);
          console.error("PDF page extraction failed:", errMsg);
          alert("Failed to extract pages from PDF.");
          setIsExtracting(false);
          setUploadProgress('');
          return;
        }

        if (pages.length === 0) {
          alert("No text found in the PDF.");
          setIsExtracting(false);
          setUploadProgress('');
          return;
        }

        const chunkSize = 15; // Process larger page groups for speed and cohesiveness
        const totalChunks = Math.ceil(pages.length / chunkSize);
        const chunkPromises: Promise<any>[] = [];

        for (let i = 0; i < pages.length; i += chunkSize) {
          const currentChunkIndex = Math.floor(i / chunkSize) + 1;
          const chunkPages = pages.slice(i, i + chunkSize);
          const chunkText = chunkPages.join('\n');
          const startPage = i + 1;
          const endPage = Math.min(i + chunkSize, pages.length);

          const payload = {
            documentText: chunkText,
            company: 'Extracted'
          };

          chunkPromises.push((async () => {
            try {
              const response = await fetch('/api/admin/parse-company-document', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });
              const data = await response.json();
              if (data.error) {
                console.error(`Chunk ${currentChunkIndex} failed:`, data.error);
                return [];
              }
              return Array.isArray(data) ? data : [];
            } catch (chunkErr) {
              console.error(`Error parsing chunk ${currentChunkIndex}:`, chunkErr);
              return [];
            }
          })());
        }

        setUploadProgress(`Processing ${totalChunks} document chunks in parallel using Gemini AI...`);
        const results = await Promise.all(chunkPromises);
        const allMapped = results.flat().map((item: any) => ({
          ...item,
          text: item.text || item.title || item.question || '',
          title: item.title || item.text || item.question || '',
          question: item.question || item.text || item.title || '',
          options: item.options || [],
          type: item.type || item.category || 'Multiple Choice',
          category: item.category || item.type || 'Multiple Choice',
          format: item.format || (item.options && item.options.length > 0 ? 'Objective' : 'Subjective')
        }));

        setExtractedQuestions(allMapped);
        setIsExtracting(false);
        setUploadProgress('');
        e.target.value = '';
        return;
      }

      setUploadProgress('Analyzing image with AI OCR...');
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const payload = {
            imageBase64: base64,
            imageMimeType: file.type
          };

          const response = await fetch('/api/admin/parse-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await response.json();
          if (data.error) throw new Error(data.error);

          const mapped = Array.isArray(data) ? data.map((item: any) => ({
            ...item,
            text: item.text || item.title || item.question || '',
            title: item.title || item.text || item.question || '',
            question: item.question || item.text || item.title || '',
            options: item.options || [],
            type: item.type || item.category || 'Multiple Choice',
            category: item.category || item.type || 'Multiple Choice'
          })) : [];

          setExtractedQuestions(mapped);
        } catch (err: any) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error("Error parsing document:", errMsg);
          alert("Failed to parse document with AI. Please try again.");
        } finally {
          setIsExtracting(false);
          setUploadProgress('');
          e.target.value = '';
        }
      };
    } catch (outerErr: any) {
      const errMsg = outerErr instanceof Error ? outerErr.message : String(outerErr);
      console.error("Error in file upload processing:", errMsg);
      setIsExtracting(false);
      setUploadProgress('');
      e.target.value = '';
    }
  };

  const handleAcceptExtracted = async (q: any, idx: number) => {
    try {
      const docRef = doc(db, 'system', 'question_banks');
      const currentData = { ...bankData };
      if (!currentData['extracted']) currentData['extracted'] = [];
      
      const newQuestion = {
        question: q.text || q.title || 'Untitled',
        options: q.options || [],
        answer: q.answer || '',
        type: q.type || 'multiple_choice',
        topic: q.topic || 'General',
        difficulty: q.difficulty || 'medium',
        // eslint-disable-next-line react-hooks/purity
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
      };

      currentData['extracted'].push(newQuestion);
      await saveToFirestore(currentData);
      
      // Remove from extracted list
      handleDeclineExtracted(idx);
    } catch (err) {
      console.error("Failed to save Question", err);
    }
  };

  const handleDeclineExtracted = (idx: number) => {
    setExtractedQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleDeleteSavedQuestion = async (q: any, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent toggling selection
    try {
      const currentData = { ...bankData };
      let removed = false;
      for (const key of Object.keys(currentData)) {
        const originalLength = currentData[key].length;
        currentData[key] = currentData[key].filter((item: any) => item.question !== q.question && item.id !== q.id);
        if (currentData[key].length < originalLength) removed = true;
      }
      if (removed) {
        await saveToFirestore(currentData);
        // Also remove from selected if it was selected
        setSelectedQuestions(prev => prev.filter(x => x.question !== q.question && x.id !== q.id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReleaseTest = async () => {
    if (!testName || !assignDate || !assignTime || selectedQuestions.length === 0) {
      alert("Please fill all details and select at least one question.");
      return;
    }

    try {
      const cleanedQuestions = selectedQuestions.map((q: any) => ({
        id: q.id || Math.random().toString(36).substring(2, 9),
        question: q.question || q.text || q.title || '',
        options: Array.isArray(q.options) ? [...q.options] : [],
        answer: q.answer !== undefined ? q.answer : '',
        type: q.type || 'text',
        topic: q.topic || 'General',
        difficulty: q.difficulty || 'Medium'
      }));

      const newTest = {
        title: testName,
        duration: parseInt(duration),
        assignDate,
        assignTime,
        questions: cleanedQuestions,
        createdAt: serverTimestamp(),
        active: true
      };
      
      await addDoc(collection(db, 'released_tests'), newTest);
      alert("Test released successfully!");
      setTestName('');
      setDuration('90');
      setAssignDate('');
      setAssignTime('');
      setSelectedQuestions([]);
    } catch (err: any) {
      console.error(err?.message || err);
      alert("Error releasing test");
    }
  };

  const allQuestions = Object.values(bankData).flat();
  const filteredQuestions = allQuestions.filter((q: any) => {
    if (questionFilter === 'all') return true;
    if (questionFilter === 'objective') return q.type === 'multiple_choice';
    if (questionFilter === 'subjective') return q.type === 'text' || q.type === 'subjective' || q.type !== 'multiple_choice';
    return true;
  });

  const handleDeleteTest = async (testId: string) => {
    try {
      await deleteDoc(doc(db, 'released_tests', testId));
    } catch (err: any) {
      console.error(err?.message || err);
      // Fallback alert may still fail in iframe but keeping for error logging
      alert("Failed to delete the test.");
    }
  };

  const handleDeduplicate = async () => {
    if (allQuestions.length === 0) return;
    setIsDeduplicating(true);
    try {
      const simplifiedQuestions = allQuestions.map((q: any, idx: number) => ({
        index: idx,
        text: q.question || q.text || q.title || ''
      }));

      const res = await fetch('/api/deduplicate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: simplifiedQuestions })
      });
      const data = await res.json();
      const duplicateIndices = data.duplicateIndices || [];
      
      if (duplicateIndices.length === 0) {
        alert("No duplicates found by AI!");
        setIsDeduplicating(false);
        return;
      }

      const keptQuestions = allQuestions.filter((_, idx) => !duplicateIndices.includes(idx));
      const reconstructedBank: Record<string, any[]> = {};
      keptQuestions.forEach(q => {
        const topic = q.topic || 'Uncategorized';
        if (!reconstructedBank[topic]) reconstructedBank[topic] = [];
        reconstructedBank[topic].push(q);
      });

      const docRef = doc(db, 'system', 'question_banks');
      await setDoc(docRef, reconstructedBank);
      
      alert(`AI removed ${duplicateIndices.length} duplicate questions successfully!`);
    } catch (err: any) {
      console.error(err?.message || err);
      alert("Failed to deduplicate questions.");
    } finally {
      setIsDeduplicating(false);
    }
  };

  return (
    <AppLayout activeTab="admin-tests">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 pb-20">
        <div className="bg-[#0d1326] -mx-4 md:-mx-8 -mt-4 md:-mt-8 p-4 md:p-8 border-b border-white/5 mb-4 md:mb-8">
          <div className="flex items-center gap-3 md:gap-4 mb-1">
            <h2 className="text-xl md:text-3xl font-bold">Test Management 📝</h2>
            {activeTab === 'create_test' && (
              <button onClick={handleReleaseTest} className="bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1.5 md:px-4 md:py-2 rounded-md md:rounded-lg text-[10px] md:text-sm font-bold flex items-center gap-1 md:gap-1.5 transition-transform hover:scale-[1.02] cursor-pointer shrink-0">
                <Save className="w-3 h-3 md:w-4 md:h-4"/> Release Test
              </button>
            )}
          </div>
          <p className="text-[10px] md:text-sm text-gray-400">Create test, assign schedule, and choose questions.</p>
        </div>

        <div className="flex gap-1 md:gap-4 border-b border-white/10 mb-4 md:mb-6 overflow-x-auto no-scrollbar pb-1.5 md:pb-2">
          <button onClick={() => setActiveTab('question_bank')} className={`whitespace-nowrap pb-1.5 md:pb-4 px-1.5 md:px-4 text-[10px] md:text-base font-medium transition-colors border-b-2 cursor-pointer ${activeTab === 'question_bank' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-300'}`}>Test Question Bank</button>
          <button onClick={() => setActiveTab('create_test')} className={`whitespace-nowrap pb-1.5 md:pb-4 px-1.5 md:px-4 text-[10px] md:text-base font-medium transition-colors border-b-2 cursor-pointer ${activeTab === 'create_test' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-300'}`}>Create Test</button>
          <button onClick={() => setActiveTab('released_tests')} className={`whitespace-nowrap pb-1.5 md:pb-4 px-1.5 md:px-4 text-[10px] md:text-base font-medium transition-colors border-b-2 cursor-pointer ${activeTab === 'released_tests' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-300'}`}>Released Tests</button>
        </div>

        {activeTab === 'question_bank' && (
          <div className="space-y-6">
            <div className="bg-[#111827] border border-white/10 rounded-2xl md:rounded-3xl p-5 md:p-8">
               <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-4">Test Question Collection</h3>
               <p className="text-xs md:text-sm text-gray-400 mb-4 md:mb-6">Upload a PDF document or Image to automatically extract questions using AI.</p>
               <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 md:mb-6">
                 <label className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl text-sm font-medium cursor-pointer flex items-center justify-center gap-1.5 md:gap-2 transition-colors self-start">
                   <Upload className="w-4 h-4 md:w-5 md:h-5" />
                   {isExtracting ? 'Extracting...' : 'Upload PDF / Image'}
                   <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileUpload} disabled={isExtracting} />
                 </label>
                 {uploadProgress && (
                   <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20">
                     <span className="w-3 h-3 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin shrink-0"/>
                     <span>{uploadProgress}</span>
                   </div>
                 )}
               </div>

               {extractedQuestions.length > 0 && (
                 <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 no-scrollbar mb-4 md:mb-6">
                   <h4 className="font-medium text-xs md:text-sm text-emerald-400">Extracted ({extractedQuestions.length}) - Pending Verification</h4>
                   {extractedQuestions.map((q, idx) => (
                     <div key={idx} className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
                        <div className="font-medium text-xs md:text-sm text-white mb-1.5 break-words whitespace-normal">{q.text || q.title || 'Untitled Question'}</div>
                        {(q.options && q.options.length > 0) && (
                          <div className="text-[10px] md:text-xs text-gray-400 mb-2 truncate">Options: {q.options.join(', ')}</div>
                        )}
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => handleAcceptExtracted(q, idx)} className="flex items-center gap-1 text-[10px] md:text-xs bg-emerald-500 hover:bg-emerald-400 text-white px-2.5 py-1.5 rounded transition-colors cursor-pointer">
                            <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4"/> Accept
                          </button>
                          <button onClick={() => handleDeclineExtracted(idx)} className="flex items-center gap-1 text-[10px] md:text-xs bg-red-500/20 hover:bg-red-500/40 text-red-400 px-2.5 py-1.5 rounded transition-colors cursor-pointer">
                            <XCircle className="w-3 h-3 md:w-4 md:h-4"/> Decline
                          </button>
                        </div>
                     </div>
                   ))}
                 </div>
               )}
            </div>

            <div className="bg-[#111827] border border-white/10 rounded-2xl md:rounded-3xl p-5 md:p-8">
               <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-4 flex items-center gap-2">AI Question Generator <span className="text-[10px] md:text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 md:py-1 rounded shrink-0">Powered by AI ✨</span></h3>
               <p className="text-xs md:text-sm text-gray-400 mb-4 md:mb-6">Generate questions automatically using AI by specifying topic, difficulty, and type.</p>
               
               <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
                 <div>
                   <label className="block text-[10px] md:text-sm font-medium text-gray-400 mb-1 md:mb-2">Topic</label>
                   <select value={aiGenTopic} onChange={e => setAiGenTopic(e.target.value)} className="w-full bg-[#0A0F1E] border border-white/10 rounded-lg md:rounded-xl px-2.5 py-2 md:px-4 md:py-3 focus:outline-none focus:border-indigo-500 text-white cursor-pointer text-xs md:text-base">
                     <option value="Data Structures">Data Structures</option>
                     <option value="Arrays">Arrays</option>
                     <option value="Strings">Strings</option>
                     <option value="Linked Lists">Linked Lists</option>
                     <option value="Stacks & Queues">Stacks & Queues</option>
                     <option value="Trees & Tries">Trees & Tries</option>
                     <option value="Graphs">Graphs</option>
                     <option value="Dynamic Programming">Dynamic Programming</option>
                     <option value="Sorting & Searching">Sorting & Searching</option>
                     <option value="Two Pointers & Sliding Window">Two Pointers & Sliding Window</option>
                     <option value="Backtracking">Backtracking</option>
                     <option value="Greedy Algorithms">Greedy Algorithms</option>
                     <option value="Bit Manipulation">Bit Manipulation</option>
                     <option value="Math & Geometry">Math & Geometry</option>
                     <option value="System Design">System Design</option>
                     <option value="Operating Systems">Operating Systems</option>
                     <option value="DBMS">Database Management (DBMS)</option>
                     <option value="Computer Networks">Computer Networks</option>
                     <option value="OOP">Object Oriented Programming (OOP)</option>
                   </select>
                 </div>
                 <div>
                   <label className="block text-[10px] md:text-sm font-medium text-gray-400 mb-1 md:mb-2">Difficulty</label>
                   <select value={aiGenLevel} onChange={e => setAiGenLevel(e.target.value)} className="w-full bg-[#0A0F1E] border border-white/10 rounded-lg md:rounded-xl px-2.5 py-2 md:px-4 md:py-3 focus:outline-none focus:border-indigo-500 text-white cursor-pointer text-xs md:text-base">
                     <option value="Easy">Easy</option><option value="Medium">Medium</option><option value="Hard">Hard</option>
                   </select>
                 </div>
                 <div>
                   <label className="block text-[10px] md:text-sm font-medium text-gray-400 mb-1 md:mb-2">Type</label>
                   <select value={aiGenType} onChange={e => setAiGenType(e.target.value)} className="w-full bg-[#0A0F1E] border border-white/10 rounded-lg md:rounded-xl px-2.5 py-2 md:px-4 md:py-3 focus:outline-none focus:border-indigo-500 text-white cursor-pointer text-xs md:text-base">
                     <option value="multiple_choice">Multiple Choice</option><option value="text">Subjective</option>
                   </select>
                 </div>
                 <div>
                   <label className="block text-[10px] md:text-sm font-medium text-gray-400 mb-1 md:mb-2">Count</label>
                   <div className="flex gap-1.5 md:gap-2">
                     <input type="number" min="1" max="20" value={aiGenCount} onChange={e => setAiGenCount(e.target.value)} className="w-full bg-[#0A0F1E] border border-white/10 rounded-lg md:rounded-xl px-2.5 py-2 md:px-4 md:py-3 focus:outline-none focus:border-indigo-500 text-white text-xs md:text-base" />
                     <button onClick={handleGenerateAIQuestions} disabled={isGeneratingAI} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg md:rounded-xl font-medium px-3 md:px-4 flex items-center justify-center transition-colors cursor-pointer text-xs md:text-base">
                       {isGeneratingAI ? 'Gen...' : 'Gen'}
                     </button>
                   </div>
                 </div>
               </div>

               {aiGeneratedQuestions.length > 0 && (
                 <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
                   <h4 className="font-medium text-xs md:text-sm text-indigo-400">AI Generated ({aiGeneratedQuestions.length})</h4>
                   {aiGeneratedQuestions.map((q, idx) => (
                     <div key={idx} className="p-3 rounded-lg border border-indigo-500/30 bg-indigo-500/5">
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-white mb-1.5 text-xs leading-tight break-words whitespace-normal">{q.text || q.question}</div>
                            {q.type === 'multiple_choice' && q.options && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-1.5">
                                {q.options.map((opt: string, oIdx: number) => (
                                  <div key={oIdx} className={`text-[10px] p-1.5 bg-[#0A0F1E] rounded-md border truncate ${q.correctOption === oIdx ? 'border-emerald-500/50 text-emerald-400' : 'border-white/5 text-gray-400'}`}>
                                    {String.fromCharCode(65 + oIdx)}. {opt}
                                  </div>
                                ))}
                              </div>
                            )}
                            {q.type === 'text' && q.answer && (
                              <div className="text-[10px] mt-1.5 p-2 bg-[#0A0F1E] rounded-md border border-white/5 text-gray-400 line-clamp-3">
                                <b className="text-indigo-400">AI Sample Answer:</b> {q.answer}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-1.5 shrink-0">
                            <button onClick={() => handleAcceptAIQuestion(q, idx)} className="flex items-center justify-center gap-1 text-[10px] md:text-xs bg-emerald-500 hover:bg-emerald-400 text-white px-2.5 py-1.5 rounded transition-colors cursor-pointer">
                              <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4"/> Accept
                            </button>
                            <button onClick={() => handleDeclineAIQuestion(idx)} className="flex items-center justify-center gap-1 text-[10px] md:text-xs bg-red-500/20 hover:bg-red-500/40 text-red-400 px-2.5 py-1.5 rounded transition-colors cursor-pointer">
                              <XCircle className="w-3 h-3 md:w-4 md:h-4"/> Discard
                            </button>
                          </div>
                        </div>
                     </div>
                   ))}
                 </div>
               )}
            </div>

            <div className="bg-[#111827] border border-white/10 rounded-2xl md:rounded-3xl p-5 md:p-8">
               <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-4">Manual Question Entry</h3>
               <p className="text-xs md:text-sm text-gray-400 mb-4 md:mb-6">Create questions manually using the text editor below.</p>
               
               <div className="flex flex-wrap items-end gap-3 md:gap-4 mb-4 md:mb-6">
                 <div>
                   <label className="block text-[10px] md:text-sm font-medium text-gray-400 mb-1 md:mb-2">Number of Questions to Generate</label>
                   <input type="number" min="1" max="20" value={manualCount} onChange={e => setManualCount(e.target.value)} className="w-24 md:w-32 bg-[#0A0F1E] border border-white/10 rounded-lg md:rounded-xl px-2.5 py-2 md:px-4 md:py-3 focus:outline-none focus:border-indigo-500 text-white text-xs md:text-base" />
                 </div>
                 <button onClick={generateManualEditor} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl font-medium flex items-center justify-center gap-1.5 md:gap-2 transition-colors md:h-[50px] cursor-pointer text-xs md:text-base">
                   <Plus className="w-4 h-4 md:w-5 md:h-5" /> Generate Editor
                 </button>
               </div>

               {manualQuestionsEditor.length > 0 && (
                 <div className="space-y-4 md:space-y-6">
                    {manualQuestionsEditor.map((q, idx) => (
                      <div key={q.id} className="p-4 md:p-6 rounded-xl md:rounded-2xl bg-[#0A0F1E] border border-white/10">
                        <div className="flex justify-between items-center mb-3 md:mb-4">
                           <h4 className="font-bold text-white text-xs md:text-base">Question {idx + 1}</h4>
                           <select value={q.type} onChange={e => handleUpdateManualQuestion(idx, 'type', e.target.value)} className="bg-[#111827] border border-white/10 rounded-md md:rounded-lg px-2 py-1 md:px-3 md:py-1.5 focus:outline-none focus:border-indigo-500 text-[10px] md:text-sm text-gray-300 cursor-pointer">
                             <option value="text">Subjective (Text)</option>
                             <option value="multiple_choice">Multiple Choice</option>
                           </select>
                        </div>
                        <div className="space-y-3 md:space-y-4">
                           <div>
                             <textarea 
                               placeholder="Type your question here..."
                               value={q.question}
                               onChange={(e) => handleUpdateManualQuestion(idx, 'question', e.target.value)}
                               className="w-full h-16 md:h-24 bg-[#111827] border border-white/10 rounded-lg md:rounded-xl px-3 py-2 md:px-4 md:py-3 focus:outline-none focus:border-indigo-500 text-white resize-none text-xs md:text-base"
                             />
                           </div>
                           {q.type === 'multiple_choice' && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-4">
                                {q.options.map((opt: string, oIdx: number) => (
                                  <input 
                                    key={oIdx}
                                    placeholder={`Option ${oIdx + 1}`}
                                    value={opt}
                                    onChange={(e) => handleUpdateManualOption(idx, oIdx, e.target.value)}
                                    className="w-full bg-[#111827] border border-white/10 rounded-md md:rounded-lg px-3 py-1.5 md:px-4 md:py-2 focus:outline-none focus:border-indigo-500 text-white text-[10px] md:text-sm"
                                  />
                                ))}
                              </div>
                           )}
                           <div>
                             <input 
                               placeholder="Correct answer (optional)"
                               value={q.answer}
                               onChange={(e) => handleUpdateManualQuestion(idx, 'answer', e.target.value)}
                               className="w-full bg-[#111827] border border-white/10 rounded-md md:rounded-lg px-3 py-1.5 md:px-4 md:py-2 focus:outline-none focus:border-indigo-500 text-white text-[10px] md:text-sm"
                             />
                           </div>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-end pt-2 md:pt-4">
                      <button onClick={handleSaveManualQuestions} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 md:px-6 md:py-3 rounded-lg md:rounded-xl font-bold flex items-center gap-1.5 md:gap-2 transition-transform hover:scale-[1.02] cursor-pointer text-xs md:text-base">
                        <Save className="w-4 h-4 md:w-5 md:h-5"/> Submit Questions
                      </button>
                    </div>
                 </div>
               )}
            </div>

            <div className="bg-[#111827] border border-white/10 rounded-2xl md:rounded-3xl p-5 md:p-8">
               <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-4">
                 <h3 className="text-lg md:text-xl font-bold">Saved Questions Bank</h3>
                 <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 md:gap-4 w-full xl:w-auto">
                   <button 
                     onClick={handleDeduplicate}
                     disabled={isDeduplicating || allQuestions.length === 0}
                     className="px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl text-[10px] md:text-sm font-medium transition-colors bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 flex items-center gap-1.5 md:gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
                   >
                     {isDeduplicating ? (
                       <span className="w-3 h-3 md:w-4 md:h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin shrink-0"/>
                     ) : (
                       <Wand2 className="w-3 h-3 md:w-4 md:h-4" />
                     )}
                     AI Deduplicate
                   </button>
                   <div className="inline-flex items-center bg-[#0A0F1E] border border-white/10 rounded-lg p-1 overflow-x-auto no-scrollbar w-full sm:w-auto">
                     <button 
                       onClick={() => setQuestionFilter('all')} 
                       className={`flex flex-1 sm:flex-none justify-center px-3 py-1.5 rounded-md text-[10px] md:text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${questionFilter === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                     >
                       All
                     </button>
                     <button 
                       onClick={() => setQuestionFilter('objective')} 
                       className={`flex flex-1 sm:flex-none justify-center px-3 py-1.5 rounded-md text-[10px] md:text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${questionFilter === 'objective' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                     >
                       Objective
                     </button>
                     <button 
                       onClick={() => setQuestionFilter('subjective')} 
                       className={`flex flex-1 sm:flex-none justify-center px-3 py-1.5 rounded-md text-[10px] md:text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${questionFilter === 'subjective' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                     >
                       Subjective
                     </button>
                   </div>
                 </div>
               </div>
               <p className="text-xs md:text-sm text-gray-400 mb-4 md:mb-6 leading-relaxed">These are the questions you have accepted and saved. Manage them below.</p>
               <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1 no-scrollbar">
                  {filteredQuestions.length === 0 ? (
                    <div className="text-gray-500 text-center py-4 text-xs">No saved questions match this filter.</div>
                  ) : (
                    filteredQuestions.map((q: any, idx: number) => (
                        <div 
                          key={idx} 
                          className="p-2.5 rounded-lg border bg-[#0d1326] border-white/5 flex gap-2.5 items-start"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-white mb-0.5 text-xs leading-tight break-words whitespace-normal">{q.question || q.title || 'Untitled Question'}</div>
                            {q.type === 'multiple_choice' && (
                               <div className="text-[9px] text-gray-400 truncate">Options: {q.options?.join(', ')}</div>
                            )}
                            <div className="flex flex-wrap items-center gap-1 mt-1.5">
                               <div className="text-[9px] text-indigo-300 capitalize px-1.5 py-0.5 bg-indigo-500/10 rounded font-medium whitespace-nowrap">{q.type || 'Question'}</div>
                               {(q.difficulty) && <div className="text-[9px] text-emerald-300 capitalize px-1.5 py-0.5 bg-emerald-500/10 rounded font-medium whitespace-nowrap">{q.difficulty}</div>}
                               {(q.topic) && <div className="text-[9px] text-blue-300 capitalize px-1.5 py-0.5 bg-blue-500/10 rounded font-medium whitespace-nowrap">{q.topic}</div>}
                            </div>
                          </div>
                          <button onClick={(e) => handleDeleteSavedQuestion(q, e)} className="text-gray-500 hover:text-red-400 p-1 shrink-0 transition-colors cursor-pointer rounded hover:bg-white/5" title="Delete from bank">
                            <Trash2 className="w-3 h-3"/>
                          </button>
                        </div>
                    ))
                  )}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'create_test' && (
          <div className="grid lg:grid-cols-3 gap-4 md:gap-6 items-start">
            <div className="lg:col-span-2 space-y-4 md:space-y-6 min-w-0">
              <div className="bg-[#111827] border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-6">
               <h3 className="text-sm md:text-base font-bold mb-3 md:mb-4">Create Test Details</h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-3 md:mb-4">
                 <div>
                   <label className="block text-[10px] md:text-xs font-medium text-gray-400 mb-1 md:mb-1.5">Test Name</label>
                   <input type="text" value={testName} onChange={e => setTestName(e.target.value)} placeholder="e.g. Amazon Mock Test" className="w-full bg-[#0A0F1E] border border-white/10 rounded-lg md:rounded-xl px-2.5 py-1.5 md:px-3 md:py-2 focus:outline-none focus:border-indigo-500 text-white text-[10px] md:text-sm" />
                 </div>
                 <div>
                   <label className="block text-[10px] md:text-xs font-medium text-gray-400 mb-1 md:mb-1.5">Assign Time Bound (Mins)</label>
                   <input type="number" value={duration} onChange={e => setDuration(e.target.value)} className="w-full bg-[#0A0F1E] border border-white/10 rounded-lg md:rounded-xl px-2.5 py-1.5 md:px-3 md:py-2 focus:outline-none focus:border-indigo-500 text-white text-[10px] md:text-sm" />
                 </div>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                 <div>
                   <label className="block text-[10px] md:text-xs font-medium text-gray-400 mb-1 md:mb-1.5">Assign Date</label>
                   <input type="date" value={assignDate} onChange={e => setAssignDate(e.target.value)} className="w-full bg-[#0A0F1E] border border-white/10 rounded-lg md:rounded-xl px-2.5 py-1.5 md:px-3 md:py-2 focus:outline-none focus:border-indigo-500 text-white [color-scheme:dark] text-[10px] md:text-sm" />
                 </div>
                 <div>
                   <label className="block text-[10px] md:text-xs font-medium text-gray-400 mb-1 md:mb-1.5">Assign Time</label>
                   <input type="time" value={assignTime} onChange={e => setAssignTime(e.target.value)} className="w-full bg-[#0A0F1E] border border-white/10 rounded-lg md:rounded-xl px-2.5 py-1.5 md:px-3 md:py-2 focus:outline-none focus:border-indigo-500 text-white [color-scheme:dark] text-[10px] md:text-sm" />
                 </div>
               </div>
            </div>

            <div className="bg-[#111827] border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-6">
               <div className="flex justify-between items-center mb-3 md:mb-4">
                  <h3 className="text-sm md:text-base font-bold">Choose Questions for Test</h3>
                  <span className="text-[10px] md:text-sm bg-indigo-500/20 text-indigo-400 px-2 py-1 md:px-3 md:py-1 rounded-md md:rounded-lg">Selected: {selectedQuestions.length}</span>
               </div>
               
               <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 no-scrollbar">
                  {allQuestions.length === 0 ? (
                    <div className="text-gray-500 text-center py-8">No questions loaded from bank. Extract questions in Admin Questions first or upload above.</div>
                  ) : (
                    allQuestions.map((q, idx) => {
                      const isSelected = selectedQuestions.find(x => x.question === q.question);
                      return (
                        <div 
                          key={idx} 
                          onClick={() => toggleQuestion(q)}
                          className={`p-3 rounded-lg border flex gap-3 cursor-pointer transition-colors items-start ${isSelected ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-[#0d1326] border-white/5 hover:border-white/20'}`}
                        >
                          <div className="mt-0.5 shrink-0">
                            <input 
                              type="checkbox" 
                              checked={!!isSelected}
                              onChange={() => {}}
                              className="w-4 h-4 rounded bg-gray-800 border-gray-600 text-indigo-500 focus:ring-0 cursor-pointer"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-white mb-0.5 text-xs leading-tight break-words whitespace-normal">{q.question || q.title || 'Untitled Question'}</div>
                            {q.type === 'multiple_choice' && (
                               <div className="text-[9px] text-gray-400 truncate">Options: {q.options?.join(', ')}</div>
                            )}
                            <div className="text-[9px] text-indigo-300 mt-1.5 capitalize px-1.5 py-0.5 bg-indigo-500/10 inline-block rounded font-medium">{q.type || 'Question'}</div>
                          </div>
                        </div>
                      )
                    })
                  )}
               </div>
            </div>
          </div>

          <div className="space-y-4 md:space-y-6 min-w-0">
            <div className="bg-[#111827] border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-6 sticky top-8">
               <h3 className="text-sm md:text-base font-bold mb-3 md:mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-indigo-400"/> Summary</h3>
               <div className="space-y-2 md:space-y-3 text-gray-300 text-[10px] md:text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Total Questions</span>
                    <span className="font-bold">{selectedQuestions.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Duration</span>
                    <span className="font-bold">{duration || 0} mins</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Schedule</span>
                    <span className="font-bold">{assignDate ? `${assignDate} at ${assignTime}` : 'Not set'}</span>
                  </div>
               </div>
            </div>
          </div>
        </div>
        )}

        {activeTab === 'released_tests' && (
          <div className="space-y-4 md:space-y-6">
            <h3 className="text-lg md:text-2xl font-bold mb-2 md:mb-4">Released Tests Overview</h3>
            {releasedTests.length === 0 ? (
              <div className="text-gray-500 text-xs md:text-base">No tests released yet.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {releasedTests.map((test) => {
                  const now = new Date();
                  const isLive = test.assignDate && test.assignTime ? new Date(`${test.assignDate}T${test.assignTime}`) <= now : true;
                  return (
                    <div key={test.id} className="bg-[#111827] border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-6 relative">
                      {isLive ? (
                        <div className="absolute top-3 right-3 md:top-4 md:right-4 flex items-center gap-1.5 md:gap-2 text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 md:px-2 md:py-1 rounded text-[10px] md:text-xs font-bold uppercase tracking-wider animate-pulse">
                          <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-400"></span> Live
                        </div>
                      ) : (
                        <div className="absolute top-3 right-3 md:top-4 md:right-4 flex items-center gap-1.5 md:gap-2 text-yellow-400 bg-yellow-500/20 px-1.5 py-0.5 md:px-2 md:py-1 rounded text-[10px] md:text-xs font-bold uppercase tracking-wider">
                          Upcoming
                        </div>
                      )}
                      
                      <h4 className="text-sm md:text-xl font-bold text-white mb-1.5 md:mb-2 pr-16">{test.title || 'Untitled Test'}</h4>
                      <div className="space-y-1.5 md:space-y-2 mt-3 md:mt-4">
                        <div className="flex items-center gap-1.5 md:gap-2 text-gray-400 text-[10px] md:text-sm">
                          <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
                          <span>{test.assignDate ? `${test.assignDate} at ${test.assignTime}` : 'Anytime'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 md:gap-2 text-gray-400 text-[10px] md:text-sm">
                          <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
                          <span>{test.duration} Minutes Duration</span>
                        </div>
                        <div className="flex items-center justify-between mt-2 md:mt-2">
                          <div className="flex items-center gap-2 text-gray-400">
                            <span className="font-bold text-indigo-400 px-1.5 py-0.5 md:px-2 md:py-0.5 bg-indigo-500/10 rounded text-[10px] md:text-sm">
                              {test.questions?.length || 0} Questions
                            </span>
                          </div>
                          <button onClick={() => handleDeleteTest(test.id)} className="text-gray-500 hover:text-red-400 p-1.5 md:p-2 transition-colors cursor-pointer" title="Delete Test">
                            <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
