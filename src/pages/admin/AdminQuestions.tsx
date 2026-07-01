import React, { useState, useRef, useEffect } from 'react';
import AppLayout from '../../components/AppLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, FileType, CheckCircle2, AlertCircle, RefreshCw, X, 
  Database, Layers, Eye, Edit2, Check, ArrowRight, Trash2, 
  Search, Filter, Sparkles, AlertTriangle, Cpu, Terminal, 
  FileText, Code2, HelpCircle, ChevronDown, ChevronUp, BookOpen, Clock, Tag
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { extractTextFromPDF, extractTextPagesFromPDF, extractImagesFromPDF } from '../../utils/pdfExtractor';
import { safeStringify } from '../../utils/safeStringify';

export default function AdminQuestions() {
  const [activeBank, setActiveBank] = useState('leetcode questions');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [scannedMode, setScannedMode] = useState(false);
  
  // Extracted staging queue
  const [extractedQuestions, setExtractedQuestions] = useState<any[]>([]);
  
  // Live questions from Firestore
  const [bankData, setBankData] = useState<Record<string, any[]>>({
    'aptitude': [],
    'dsa coding': [],
    'leetcode questions': [],
    'interview hr': [],
    'company pyqs': []
  });

  // Modal / Interaction states
  const [previewQuestion, setPreviewQuestion] = useState<any | null>(null);
  const [editQuestion, setEditQuestion] = useState<any | null>(null);
  const [editSource, setEditSource] = useState<'staging' | 'bank'>('staging');
  const [editIndex, setEditIndex] = useState<number>(-1);
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  // Duplicate check warning state
  const [duplicateWarning, setDuplicateWarning] = useState<{
    stagingIndex: number;
    bankIndex: number;
    incoming: any;
    existing: any;
  } | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterTopic, setFilterTopic] = useState('All');
  const [filterDifficulty, setFilterDifficulty] = useState('All');
  const [filterCompany, setFilterCompany] = useState('All');

  // Expanded live question cards (Accordion)
  const [expandedLiveCards, setExpandedLiveCards] = useState<Record<number, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from Firestore
  useEffect(() => {
    const docRef = doc(db, 'system', 'question_banks');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const dsaCoding = data['dsa coding'] || [];
        const leetcodeQuestions = data['leetcode questions'] || [];
        
        // Merge unique questions from both arrays by comparing question/text
        const merged = [...dsaCoding];
        leetcodeQuestions.forEach((q: any) => {
          const qText = (q.text || q.question || '').trim().toLowerCase();
          const exists = merged.some((cq: any) => 
            (cq.text || cq.question || '').trim().toLowerCase() === qText
          );
          if (!exists) {
            merged.push(q);
          }
        });

        setBankData({
          'aptitude': data['aptitude'] || [],
          'dsa coding': merged,
          'leetcode questions': merged,
          'interview hr': data['interview hr'] || [],
          'company pyqs': data['company pyqs'] || []
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const saveToFirestore = async (newData: Record<string, any[]>) => {
    try {
      const unifiedList = newData['leetcode questions'] || newData['dsa coding'] || [];
      const cappedData: Record<string, any[]> = {};
      
      // Cap each category to 120 questions to prevent exceeding Firestore 1MB document size limit
      Object.keys(newData).forEach(key => {
        if (Array.isArray(newData[key])) {
          cappedData[key] = newData[key].slice(0, 120);
        } else {
          cappedData[key] = newData[key];
        }
      });
      
      const cappedUnified = unifiedList.slice(0, 120);
      const updatedData = {
        ...cappedData,
        'leetcode questions': cappedUnified,
        'dsa coding': cappedUnified
      };
      await setDoc(doc(db, 'system', 'question_banks'), updatedData, { merge: true });
    } catch (err) {
      console.error("Error saving to Firestore:", err);
    }
  };

  // Drag-and-drop file uploads
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const compressImage = (base64Str: string, maxWidth = 1600, maxHeight = 1600): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
    });
  };

  const processFile = async (file: File) => {
    const isPdf = file.type === 'application/pdf';
    const maxSize = isPdf ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    
    if (file.size > maxSize) {
      alert(`File is too large. Please upload files smaller than ${isPdf ? '50MB' : '10MB'}.`);
      return;
    }

    setIsUploading(true);
    setUploadProgress('Preparing file...');

    try {
      if (isPdf) {
        if (scannedMode) {
          setUploadProgress('Rendering PDF pages as high-resolution images...');
          const pagesAsImages = await extractImagesFromPDF(file);
          const compressedPages = await Promise.all(pagesAsImages.map(img => compressImage(img)));
          setUploadProgress(`Processing ${compressedPages.length} scanned PDF pages with Gemini Vision OCR...`);
          
          let parsedQuestions: any[] = [];
          for (let i = 0; i < compressedPages.length; i++) {
            setUploadProgress(`Analyzing page ${i + 1} of ${compressedPages.length} with AI Vision OCR...`);
            try {
              const payload = {
                imageBase64: compressedPages[i],
                imageMimeType: 'image/jpeg',
                company: 'General Practice'
              };
              const res = await fetch('/api/admin/parse-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });
              const data = await res.json();
              if (Array.isArray(data)) {
                parsedQuestions = [...parsedQuestions, ...data];
              }
            } catch (err) {
              console.error(`Error on page ${i + 1}:`, err);
            }
          }
          
          if (parsedQuestions.length === 0) {
            alert("No questions could be extracted. Please ensure the document contains legible text.");
          } else {
            setExtractedQuestions(parsedQuestions);
          }
        } else {
          setUploadProgress('Extracting text content from PDF...');
          let textPages: string[] = [];
          try {
            textPages = await extractTextPagesFromPDF(file);
          } catch (pdfErr: any) {
            console.error("PDF text extraction failed, falling back to scanned mode render:", pdfErr);
            setUploadProgress('Fallback: Rendering pages as images for extraction...');
            const pagesAsImages = await extractImagesFromPDF(file);
            textPages = [pagesAsImages[0] || '']; // Use first page
          }

          if (textPages.length === 0 || textPages.join('').trim().length < 150) {
            setUploadProgress('Low OCR quality detected. Auto-switching to Vision OCR mode...');
            const pagesAsImages = await extractImagesFromPDF(file);
            const compressedPages = await Promise.all(pagesAsImages.map(img => compressImage(img)));
            setUploadProgress(`Processing ${compressedPages.length} scanned PDF pages using Vision OCR...`);
            let parsedQuestions: any[] = [];
            for (let i = 0; i < compressedPages.length; i++) {
              setUploadProgress(`Analyzing page ${i + 1} of ${compressedPages.length} with AI Vision OCR...`);
              try {
                const payload = {
                  imageBase64: compressedPages[i],
                  imageMimeType: 'image/jpeg',
                  company: 'General Practice'
                };
                const res = await fetch('/api/admin/parse-image', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (Array.isArray(data)) {
                  parsedQuestions = [...parsedQuestions, ...data];
                }
              } catch (err) {
                console.error(`Page ${i + 1} extraction error:`, err);
              }
            }
            setExtractedQuestions(parsedQuestions);
          } else {
            // Standard Text Extraction
            setUploadProgress('Detecting questions and categorizing using Gemini AI...');
            const textChunks = [];
            const chunkSize = 15;
            for (let i = 0; i < textPages.length; i += chunkSize) {
              textChunks.push(textPages.slice(i, i + chunkSize).join('\n'));
            }

            let parsedQuestions: any[] = [];
            for (let chunkIndex = 0; chunkIndex < textChunks.length; chunkIndex++) {
              setUploadProgress(`Processing text chunk ${chunkIndex + 1} of ${textChunks.length}...`);
              const payload = {
                documentText: textChunks[chunkIndex],
                company: 'General Practice'
              };
              const response = await fetch('/api/admin/parse-company-document', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });
              const data = await response.json();
              if (Array.isArray(data)) {
                parsedQuestions = [...parsedQuestions, ...data];
              }
            }
            setExtractedQuestions(parsedQuestions);
          }
        }
      } else {
        // Handle standalone images / mobile photo
        setUploadProgress('Analyzing image snapshot with AI Vision OCR...');
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
          let base64 = reader.result as string;
          try {
            setUploadProgress('Optimizing image for AI analysis...');
            base64 = await compressImage(base64);
            const payload = {
              imageBase64: base64,
              imageMimeType: file.type,
              company: 'General Practice'
            };
            const response = await fetch('/api/admin/parse-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            const data = await response.json();
            setExtractedQuestions(Array.isArray(data) ? data : []);
          } catch (err) {
            console.error("Error calling parse-image api:", err);
            alert("Failed to parse image with AI. Please try again.");
          } finally {
            setIsUploading(false);
            setUploadProgress('');
            if (fileInputRef.current) fileInputRef.current.value = '';
          }
        };
        return;
      }
    } catch (outerErr: any) {
      console.error("Error in processFile:", outerErr);
      alert("Error occurred during document parsing. Please try again.");
    } finally {
      setIsUploading(false);
      setUploadProgress('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Add staging question to Firestore live bank (with Duplicate Detection)
  const saveToBank = (qIndex: number, bypassDuplicateCheck = false) => {
    const incomingQ = extractedQuestions[qIndex];
    if (!incomingQ) return;

    const targetBank = activeBank.toLowerCase();
    const liveList = bankData[targetBank] || [];

    if (!bypassDuplicateCheck) {
      // Find similar titles or questions
      const incomingTextClean = (incomingQ.text || incomingQ.question || '').trim().toLowerCase().replace(/\s+/g, '');
      const incomingTitleClean = (incomingQ.title || '').trim().toLowerCase().replace(/\s+/g, '');

      const dupIdx = liveList.findIndex((cq: any) => {
        const existingTextClean = (cq.text || cq.question || '').trim().toLowerCase().replace(/\s+/g, '');
        const existingTitleClean = (cq.title || '').trim().toLowerCase().replace(/\s+/g, '');
        return (
          incomingTextClean === existingTextClean || 
          incomingTitleClean === existingTitleClean ||
          (incomingTitleClean.length > 5 && existingTitleClean.includes(incomingTitleClean)) ||
          (existingTitleClean.length > 5 && incomingTitleClean.includes(existingTitleClean))
        );
      });

      if (dupIdx !== -1) {
        // Trigger Duplicate warning Modal
        setDuplicateWarning({
          stagingIndex: qIndex,
          bankIndex: dupIdx,
          incoming: incomingQ,
          existing: liveList[dupIdx]
        });
        return;
      }
    }

    // Normal Save
    const newBankList = [...liveList, incomingQ];
    const newData = {
      ...bankData,
      [targetBank]: newBankList
    };

    setBankData(newData);
    saveToFirestore(newData);

    // Remove from staging queue
    setExtractedQuestions(prev => prev.filter((_, idx) => idx !== qIndex));
  };

  // Duplicate Resolution Handlers
  const handleSkipDuplicate = () => {
    if (!duplicateWarning) return;
    // Remove from staging
    setExtractedQuestions(prev => prev.filter((_, idx) => idx !== duplicateWarning.stagingIndex));
    setDuplicateWarning(null);
  };

  const handleReplaceDuplicate = () => {
    if (!duplicateWarning) return;
    const { stagingIndex, bankIndex, incoming } = duplicateWarning;
    const targetBank = activeBank.toLowerCase();
    
    const liveList = [...(bankData[targetBank] || [])];
    liveList[bankIndex] = incoming; // replace

    const newData = {
      ...bankData,
      [targetBank]: liveList
    };

    setBankData(newData);
    saveToFirestore(newData);
    setExtractedQuestions(prev => prev.filter((_, idx) => idx !== stagingIndex));
    setDuplicateWarning(null);
  };

  const handleMergeDuplicate = () => {
    if (!duplicateWarning) return;
    const { stagingIndex, bankIndex, incoming, existing } = duplicateWarning;
    const targetBank = activeBank.toLowerCase();

    // Smart merge: Keep existing but fill missing files
    const mergedQuestion = {
      ...existing,
      ...incoming,
      // Merge code snippets
      code: {
        cpp: existing.code?.cpp || incoming.code?.cpp || '',
        java: existing.code?.java || incoming.code?.java || '',
        python: existing.code?.python || incoming.code?.python || ''
      },
      // Concat solutions if different
      solution: existing.solution === incoming.solution 
        ? existing.solution 
        : `${existing.solution || ''}\n\n[Alternative/AI Extracted Solution]:\n${incoming.solution || ''}`
    };

    const liveList = [...(bankData[targetBank] || [])];
    liveList[bankIndex] = mergedQuestion;

    const newData = {
      ...bankData,
      [targetBank]: liveList
    };

    setBankData(newData);
    saveToFirestore(newData);
    setExtractedQuestions(prev => prev.filter((_, idx) => idx !== stagingIndex));
    setDuplicateWarning(null);
  };

  const handleKeepBothDuplicate = () => {
    if (!duplicateWarning) return;
    saveToBank(duplicateWarning.stagingIndex, true);
    setDuplicateWarning(null);
  };

  // Bulk Actions
  const acceptAllQuestions = () => {
    if (extractedQuestions.length === 0) return;
    
    const targetBank = activeBank.toLowerCase();
    const newBankList = [...(bankData[targetBank] || []), ...extractedQuestions];
    const newData = {
      ...bankData,
      [targetBank]: newBankList
    };

    setBankData(newData);
    saveToFirestore(newData);
    setExtractedQuestions([]);
  };

  const declineAllQuestions = () => {
    setExtractedQuestions([]);
  };

  const deleteFromBank = (qIndex: number) => {
    const targetBank = activeBank.toLowerCase();
    const currentBankList = bankData[targetBank] || [];
    const newBankList = currentBankList.filter((_, idx) => idx !== qIndex);
    
    const newData = {
      ...bankData,
      [targetBank]: newBankList
    };
    
    setBankData(newData);
    saveToFirestore(newData);
  };

  // Live Live Editor Handlers
  const openEditor = (q: any, index: number, source: 'staging' | 'bank') => {
    setEditSource(source);
    setEditIndex(index);
    setEditQuestion(JSON.parse(safeStringify(q))); // deep clone safely
  };

  const saveLiveEdit = () => {
    if (!editQuestion) return;

    if (editSource === 'staging') {
      const updated = [...extractedQuestions];
      updated[editIndex] = editQuestion;
      setExtractedQuestions(updated);
    } else {
      const targetBank = activeBank.toLowerCase();
      const updatedList = [...(bankData[targetBank] || [])];
      updatedList[editIndex] = editQuestion;
      
      const newData = {
        ...bankData,
        [targetBank]: updatedList
      };
      setBankData(newData);
      saveToFirestore(newData);
    }

    setEditQuestion(null);
  };

  // AI Auto-Enhance Handler
  const enhanceSolution = async () => {
    if (!editQuestion) return;
    setIsEnhancing(true);
    try {
      const response = await fetch('/api/admin/enhance-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: editQuestion })
      });
      const enriched = await response.json();
      if (enriched.error) {
        alert("Enrichment failed: " + enriched.error);
        return;
      }
      
      // Update fields
      setEditQuestion(prev => {
        if (!prev) return null;
        return {
          ...prev,
          solution: enriched.solution || prev.solution || '',
          algorithm: enriched.algorithm || prev.algorithm || '',
          pseudoCode: enriched.pseudoCode || prev.pseudoCode || '',
          timeComplexity: enriched.timeComplexity || prev.timeComplexity || '',
          spaceComplexity: enriched.spaceComplexity || prev.spaceComplexity || '',
          interviewTips: enriched.interviewTips || prev.interviewTips || '',
          commonMistakes: enriched.commonMistakes || prev.commonMistakes || '',
          alternativeSolution: enriched.alternativeSolution || prev.alternativeSolution || '',
          code: {
            cpp: enriched.cpp || prev.code?.cpp || '',
            java: enriched.java || prev.code?.java || '',
            python: enriched.python || prev.code?.python || ''
          }
        };
      });
    } catch (err) {
      console.error("Enrichment error:", err);
      alert("Failed to auto-enhance with AI.");
    } finally {
      setIsEnhancing(false);
    }
  };

  // Auto-enhance directly from preview
  const enhanceFromPreview = async () => {
    if (!previewQuestion) return;
    setIsEnhancing(true);
    try {
      const response = await fetch('/api/admin/enhance-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: previewQuestion })
      });
      const enriched = await response.json();
      if (enriched.error) {
        alert("Enrichment failed: " + enriched.error);
        return;
      }

      const enhancedQ = {
        ...previewQuestion,
        solution: enriched.solution || previewQuestion.solution || '',
        algorithm: enriched.algorithm || previewQuestion.algorithm || '',
        pseudoCode: enriched.pseudoCode || previewQuestion.pseudoCode || '',
        timeComplexity: enriched.timeComplexity || previewQuestion.timeComplexity || '',
        spaceComplexity: enriched.spaceComplexity || previewQuestion.spaceComplexity || '',
        interviewTips: enriched.interviewTips || previewQuestion.interviewTips || '',
        commonMistakes: enriched.commonMistakes || previewQuestion.commonMistakes || '',
        alternativeSolution: enriched.alternativeSolution || previewQuestion.alternativeSolution || '',
        code: {
          cpp: enriched.cpp || previewQuestion.code?.cpp || '',
          java: enriched.java || previewQuestion.code?.java || '',
          python: enriched.python || previewQuestion.code?.python || ''
        },
        solutionAvailable: true
      };

      setPreviewQuestion(enhancedQ);

      // Save back to list
      const source = previewQuestion._source || 'staging';
      const idx = previewQuestion._idx !== undefined ? previewQuestion._idx : -1;

      if (idx !== -1) {
        if (source === 'staging') {
          const updated = [...extractedQuestions];
          updated[idx] = enhancedQ;
          setExtractedQuestions(updated);
        } else {
          const targetBank = activeBank.toLowerCase();
          const updatedList = [...(bankData[targetBank] || [])];
          updatedList[idx] = enhancedQ;
          const newData = {
            ...bankData,
            [targetBank]: updatedList
          };
          setBankData(newData);
          saveToFirestore(newData);
        }
      }
    } catch (err) {
      console.error(err);
      alert("Failed to auto-enhance with AI.");
    } finally {
      setIsEnhancing(false);
    }
  };

  // Preview Tabs state helper inside the preview modal
  const [activePreviewTab, setActivePreviewTab] = useState<'details' | 'solution' | 'code'>('details');
  const [activeCodeTab, setActiveCodeTab] = useState<'cpp' | 'java' | 'python'>('python');

  // Load and apply search filters
  const currentBankList = bankData[activeBank.toLowerCase()] || [];

  const filteredQuestionsList = currentBankList.filter(q => {
    const textStr = (q.text || q.question || '').toLowerCase();
    const titleStr = (q.title || '').toLowerCase();
    const topicStr = (q.topic || '').toLowerCase();
    const companyStr = (q.company || '').toLowerCase();
    const typeStr = (q.questionType || q.type || '').toLowerCase();
    const diffStr = (q.difficulty || '').toLowerCase();

    const matchesSearch = textStr.includes(searchQuery.toLowerCase()) || 
                          titleStr.includes(searchQuery.toLowerCase()) ||
                          topicStr.includes(searchQuery.toLowerCase()) ||
                          companyStr.includes(searchQuery.toLowerCase());

    const matchesType = filterType === 'All' || typeStr.includes(filterType.toLowerCase());
    const matchesTopic = filterTopic === 'All' || topicStr.includes(filterTopic.toLowerCase());
    const matchesDifficulty = filterDifficulty === 'All' || diffStr.includes(filterDifficulty.toLowerCase());
    const matchesCompany = filterCompany === 'All' || companyStr.includes(filterCompany.toLowerCase());

    return matchesSearch && matchesType && matchesTopic && matchesDifficulty && matchesCompany;
  });

  const confidenceColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30';
    if (score >= 70) return 'text-amber-400 bg-amber-500/10 border border-amber-500/30';
    return 'text-red-400 bg-red-500/10 border border-red-500/30';
  };

  const difficultyColor = (diff: string) => {
    const d = (diff || '').toLowerCase();
    if (d === 'easy') return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
    if (d === 'medium') return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
    if (d === 'hard') return 'bg-rose-500/20 text-rose-300 border border-rose-500/30';
    return 'bg-purple-500/20 text-purple-300 border border-purple-500/30'; // Expert
  };

  return (
    <AppLayout activeTab="admin-questions">
      <div className="max-w-7xl mx-auto space-y-6 pb-24 px-4 sm:px-6 lg:px-8">
        
        {/* Header Hero */}
        <div className="relative overflow-hidden bg-[#0a0f1d] border border-white/10 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl"></div>
          
          <div className="space-y-2 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">Enterprise Extraction Engine v2.0</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              AI Question Bank & Parser 🧠
            </h2>
            <p className="text-sm text-gray-400 max-w-2xl">
              Transform scanned papers, PDF documents, and camera shots into completely searchable, structured, and fully resolved coding and assessment questions automatically.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 relative z-10">
            <label className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 cursor-pointer transition-colors text-xs text-gray-300 select-none">
              <input 
                type="checkbox" 
                checked={scannedMode} 
                onChange={() => setScannedMode(!scannedMode)}
                className="rounded border-white/20 text-indigo-600 focus:ring-0 bg-[#0d1326] w-4 h-4 cursor-pointer"
              />
              <span className="font-semibold">Force Visual OCR Mode (Scanned/Handwritten)</span>
            </label>

            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30"
            >
              {isUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4"/>}
              <span>{isUploading ? 'Extracting with Gemini...' : 'Upload Document'}</span>
            </button>
            <input 
              type="file" 
              accept="image/*,application/pdf" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
            />
          </div>
        </div>

        {/* Drag and Drop Zone */}
        {!isUploading && extractedQuestions.length === 0 && (
          <div 
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center transition-all duration-300 min-h-[200px] cursor-pointer group ${
              dragActive ? 'border-indigo-500 bg-indigo-500/5 shadow-2xl scale-[0.99]' : 'border-white/10 hover:border-indigo-500/50 hover:bg-white/[0.01]'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110">
              <FileText className="w-7 h-7 text-indigo-400" />
            </div>
            <h4 className="text-white font-bold text-base mb-1">Drag and drop your file here, or click to browse</h4>
            <p className="text-xs text-gray-500 max-w-md leading-relaxed">
              Supports scanned PDFs, printed exam papers, clear snapshots, handwriting sheets (where legible), or smartphone camera captures.
            </p>
          </div>
        )}

        {/* Processing State Progress bar */}
        {isUploading && (
          <div className="bg-[#0b0f1d] border border-indigo-500/30 rounded-3xl p-6 sm:p-8 flex items-center gap-5">
            <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center shrink-0">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-white font-bold text-sm mb-1 uppercase tracking-wider">AI Question Extraction in Progress...</h4>
              <p className="text-xs text-indigo-300 truncate">{uploadProgress}</p>
              <div className="w-full bg-white/5 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="bg-indigo-500 h-full w-[80%] rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        )}

        {/* AI Extracted Staging review area */}
        {extractedQuestions.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="bg-[#0b0f1d] border border-indigo-500/20 rounded-3xl p-6 shadow-2xl"
          >
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-white/10 pb-6 mb-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                  <span>Staging Queue Review ({extractedQuestions.length} Extracted Questions)</span>
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Double check, enrich, live-edit, or preview extracted items before permanently cataloging them.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <button 
                  onClick={acceptAllQuestions}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-lg shadow-emerald-600/15"
                >
                  <CheckCircle2 className="w-4 h-4" /> Send to Database (Approve)
                </button>
                <button 
                  onClick={declineAllQuestions}
                  className="bg-red-500/15 text-red-400 hover:bg-red-500 hover:text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" /> Decline All
                </button>
              </div>
            </div>

            {/* Grid of staged items */}
            <div className="space-y-4">
              {extractedQuestions.map((q, idx) => (
                <div 
                  key={idx} 
                  className="bg-[#111625] border border-white/5 p-5 rounded-2xl flex flex-col lg:flex-row gap-5 items-start transition-all hover:border-white/10"
                >
                  {/* Left Column: Metadata & Title */}
                  <div className="flex-1 space-y-3 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="inline-flex items-center justify-center bg-indigo-600/20 text-indigo-300 font-mono text-xs font-extrabold px-2.5 py-1 rounded-lg border border-indigo-500/20">
                        #{idx + 1}
                      </span>
                      
                      {/* Confidence Pill */}
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${confidenceColor(q.confidenceScore || 90)}`}>
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        <span>Confidence: {q.confidenceScore || 90}%</span>
                      </span>

                      {/* Source badge */}
                      <span className="text-[10px] bg-white/5 text-gray-400 px-2 py-1 rounded-md font-mono border border-white/5">
                        {q.sourceFile || 'AI Scan'}
                      </span>

                      {q.company && (
                        <span className="text-[10px] text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/20 font-bold">
                          {q.company}
                        </span>
                      )}
                    </div>

                    <h4 className="text-white font-bold text-base line-clamp-2 leading-snug">
                      {q.title || q.text || 'Untitled Question'}
                    </h4>
                    
                    <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed">
                      {q.question || q.text || ''}
                    </p>

                    {q.options && q.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl mt-2.5">
                        {q.options.map((opt: string, i: number) => (
                          <div 
                            key={i} 
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
                              (q.correctAnswer || '').toLowerCase().includes(String.fromCharCode(65 + i).toLowerCase()) || 
                              (q.correctAnswer || '') === opt
                                ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-400' 
                                : 'bg-[#181d2e] border-transparent text-gray-400'
                            }`}
                          >
                            <span className="w-5 h-5 bg-black/20 rounded-md flex items-center justify-center font-bold text-[10px]">{String.fromCharCode(65 + i)}</span>
                            <span className="truncate">{opt}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Classification Badges & Control actions */}
                  <div className="flex flex-col gap-2.5 w-full lg:w-72 shrink-0">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-[#181d2e] p-2 rounded-xl text-center border border-white/5">
                        <span className="block text-[9px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Type</span>
                        <span className="text-xs font-semibold text-gray-200 truncate block">{q.questionType || q.type || 'Aptitude'}</span>
                      </div>
                      <div className="bg-[#181d2e] p-2 rounded-xl text-center border border-white/5">
                        <span className="block text-[9px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Topic</span>
                        <span className="text-xs font-semibold text-gray-200 truncate block">{q.topic || 'General'}</span>
                      </div>
                      <div className="bg-[#181d2e] p-2 rounded-xl text-center border border-white/5">
                        <span className="block text-[9px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Difficulty</span>
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${difficultyColor(q.difficulty)}`}>{q.difficulty || 'Medium'}</span>
                      </div>
                      <div className="bg-[#181d2e] p-2 rounded-xl text-center border border-white/5">
                        <span className="block text-[9px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Solution</span>
                        <span className={`inline-block text-[10px] font-bold ${q.solution ? 'text-emerald-400' : 'text-gray-500'}`}>
                          {q.solution ? '✓ Available' : '✗ Empty'}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          const previewObj = { ...q, _source: 'staging', _idx: idx };
                          setPreviewQuestion(previewObj);
                          setActivePreviewTab('details');
                        }}
                        className="flex-1 bg-[#181d2e] hover:bg-[#20273c] text-gray-300 py-2 rounded-xl text-xs font-bold border border-white/5 flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Preview"
                      >
                        <Eye className="w-3.5 h-3.5" /> Preview
                      </button>
                      <button 
                        onClick={() => openEditor(q, idx, 'staging')}
                        className="flex-1 bg-[#181d2e] hover:bg-[#20273c] text-gray-300 py-2 rounded-xl text-xs font-bold border border-white/5 flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Live Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => saveToBank(idx)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-4 h-4" /> Publish to Live
                      </button>
                      <button 
                        onClick={() => setExtractedQuestions(prev => prev.filter((_, i) => i !== idx))}
                        className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white px-3 py-2 rounded-xl cursor-pointer transition-colors"
                        title="Discard"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom bulk action button as requested by user image */}
            <div className="mt-8 flex justify-end">
              <button 
                onClick={acceptAllQuestions}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer transition-all shadow-xl shadow-emerald-600/20 active:scale-95"
              >
                <CheckCircle2 className="w-5 h-5" /> Send to Database (Approve)
              </button>
            </div>
          </motion.div>
        )}

        {/* Live Banks catalog selection tabs */}
        <div className="bg-[#0b0f1d] border border-white/10 rounded-3xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-400" />
                <span>Live Questions Bank Directory</span>
              </h3>
              <p className="text-xs text-gray-400 mt-1">Select sub-bank folders to search, filter, and manage cataloged items.</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'leetcode questions', label: 'DSA and Dev Questions' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveBank(tab.id);
                    setExpandedLiveCards({});
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                    activeBank === tab.id 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15' 
                      : 'text-gray-400 bg-white/5 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {tab.label} ({bankData[tab.id]?.length || 0})
                </button>
              ))}
            </div>
          </div>

          {/* Search, Filter & Advanced Searchable Metadata indices */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* Search */}
            <div className="lg:col-span-1 relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="w-4 h-4 text-gray-500" />
              </span>
              <input 
                type="text" 
                placeholder="Search queries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#111625] border border-white/5 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            {/* Type Filter */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Layers className="w-3.5 h-3.5 text-gray-500" />
              </span>
              <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full bg-[#111625] border border-white/5 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold text-gray-300 focus:outline-none cursor-pointer"
              >
                <option value="All">All Types</option>
                <option value="MCQ">MCQ</option>
                <option value="Subjective">Subjective</option>
                <option value="Coding">Coding</option>
                <option value="Fill in the Blanks">Fill in Blanks</option>
                <option value="True / False">True / False</option>
                <option value="Numerical">Numerical</option>
              </select>
            </div>

            {/* Topic Filter */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Tag className="w-3.5 h-3.5 text-gray-500" />
              </span>
              <select 
                value={filterTopic}
                onChange={(e) => setFilterTopic(e.target.value)}
                className="w-full bg-[#111625] border border-white/5 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold text-gray-300 focus:outline-none cursor-pointer"
              >
                <option value="All">All Topics</option>
                <option value="Arrays">Arrays</option>
                <option value="Strings">Strings</option>
                <option value="Trees">Trees</option>
                <option value="DBMS">DBMS</option>
                <option value="Operating System">OS</option>
                <option value="Networks">Networks</option>
                <option value="Aptitude">Aptitude</option>
                <option value="Reasoning">Reasoning</option>
                <option value="Behavioral">Behavioral</option>
              </select>
            </div>

            {/* Difficulty Filter */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <HelpCircle className="w-3.5 h-3.5 text-gray-500" />
              </span>
              <select 
                value={filterDifficulty}
                onChange={(e) => setFilterDifficulty(e.target.value)}
                className="w-full bg-[#111625] border border-white/5 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold text-gray-300 focus:outline-none cursor-pointer"
              >
                <option value="All">All Difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
                <option value="Expert">Expert</option>
              </select>
            </div>

            {/* Company Filter */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <BookOpen className="w-3.5 h-3.5 text-gray-500" />
              </span>
              <select 
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                className="w-full bg-[#111625] border border-white/5 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold text-gray-300 focus:outline-none cursor-pointer"
              >
                <option value="All">All Companies</option>
                <option value="Google">Google</option>
                <option value="Amazon">Amazon</option>
                <option value="Microsoft">Microsoft</option>
                <option value="Adobe">Adobe</option>
                <option value="Uber">Uber</option>
                <option value="General Practice">General Practice</option>
              </select>
            </div>
          </div>

          {/* Results list */}
          {filteredQuestionsList.length > 0 ? (
            <div className="space-y-3.5">
              {filteredQuestionsList.map((q, idx) => {
                const isExpanded = !!expandedLiveCards[idx];
                return (
                  <div 
                    key={idx} 
                    className="bg-[#111625] border border-white/5 rounded-2xl overflow-hidden transition-all duration-200"
                  >
                    {/* Collapsed view header */}
                    <div 
                      onClick={() => setExpandedLiveCards(prev => ({ ...prev, [idx]: !isExpanded }))}
                      className="p-5 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between cursor-pointer hover:bg-white/[0.02]"
                    >
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="bg-indigo-500/10 text-indigo-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded">
                            Q#{idx + 1}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-emerald-500/10 text-emerald-400">
                            Published
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${difficultyColor(q.difficulty)}`}>
                            {q.difficulty || 'Medium'}
                          </span>
                          <span className="text-[10px] text-gray-400 bg-white/5 px-2 py-0.5 rounded">
                            {q.topic || 'General'}
                          </span>
                          {q.company && q.company !== 'General Practice' && (
                            <span className="text-[10px] text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded">
                              {q.company}
                            </span>
                          )}
                        </div>

                        <h4 className="text-white font-bold text-sm sm:text-base leading-snug">
                          {q.title || q.text || 'Untitled Question'}
                        </h4>
                      </div>

                      <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const previewObj = { ...q, _source: 'bank', _idx: idx };
                            setPreviewQuestion(previewObj);
                            setActivePreviewTab('details');
                          }}
                          className="bg-white/5 hover:bg-white/10 text-gray-300 p-2 rounded-xl border border-white/5 cursor-pointer"
                          title="Preview Full Question Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditor(q, idx, 'bank');
                          }}
                          className="bg-white/5 hover:bg-white/10 text-gray-300 p-2 rounded-xl border border-white/5 cursor-pointer"
                          title="Edit Question Content"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteFromBank(idx);
                          }}
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-2 rounded-xl cursor-pointer"
                          title="Delete Permanently"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-white/5 bg-black/15 p-5 space-y-4"
                        >
                          <div className="space-y-2">
                            <h5 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Full Prompt/Question</h5>
                            <p className="text-gray-200 text-sm whitespace-pre-wrap leading-relaxed">{q.question || q.text || ''}</p>
                          </div>

                          {q.options && q.options.length > 0 && (
                            <div className="space-y-2">
                              <h5 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Options</h5>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-4xl">
                                {q.options.map((opt: string, i: number) => (
                                  <div 
                                    key={i}
                                    className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
                                      (q.correctAnswer || '').toLowerCase().includes(String.fromCharCode(65 + i).toLowerCase()) || 
                                      (q.correctAnswer || '') === opt
                                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' 
                                        : 'bg-white/5 border-transparent text-gray-300'
                                    }`}
                                  >
                                    <span className="w-5 h-5 bg-black/30 rounded-md flex items-center justify-center font-bold">{String.fromCharCode(65 + i)}</span>
                                    <span>{opt}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {q.solution && (
                            <div className="space-y-2 bg-[#0d1326] p-4 rounded-xl border border-white/5">
                              <h5 className="text-indigo-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>Ideal Solution / Explanation</span>
                              </h5>
                              <p className="text-gray-300 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">{q.solution}</p>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-[#111625] border border-white/5 rounded-3xl p-10 text-center text-gray-500">
              <FileText className="w-10 h-10 mx-auto mb-3 text-gray-600" />
              <h5 className="text-gray-300 font-bold mb-1">No matches found</h5>
              <p className="text-xs max-w-md mx-auto">Try adjusting your filters, searching different keywords, or upload another question paper above.</p>
            </div>
          )}
        </div>

      </div>

      {/* DETAILED QUESTION PREVIEW MODAL */}
      <AnimatePresence>
        {previewQuestion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b101f] border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative"
            >
              <button 
                onClick={() => setPreviewQuestion(null)}
                className="absolute top-4 right-4 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white p-2 rounded-full cursor-pointer z-10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Header */}
              <div className="p-6 border-b border-white/10 bg-[#0d1326] space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${difficultyColor(previewQuestion.difficulty)}`}>
                    {previewQuestion.difficulty || 'Medium'}
                  </span>
                  <span className="text-xs font-semibold text-gray-300 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                    Topic: <span className="text-white">{previewQuestion.topic || 'General'}</span>
                  </span>
                  <span className="text-xs font-semibold text-gray-300 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                    Type: <span className="text-white">{previewQuestion.questionType || previewQuestion.type || 'Aptitude'}</span>
                  </span>
                  {previewQuestion.company && (
                    <span className="text-xs font-semibold text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/10">
                      Company: {previewQuestion.company}
                    </span>
                  )}
                  {previewQuestion.confidenceScore && (
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${confidenceColor(previewQuestion.confidenceScore)}`}>
                      AI Confidence: {previewQuestion.confidenceScore}%
                    </span>
                  )}
                </div>
                <h3 className="text-white font-extrabold text-lg sm:text-xl leading-snug pr-8">
                  {previewQuestion.title || previewQuestion.text || 'Untitled Question'}
                </h3>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-white/10 bg-black/10 px-6">
                <button 
                  onClick={() => setActivePreviewTab('details')}
                  className={`py-3 px-4 text-xs font-bold border-b-2 cursor-pointer transition-all ${activePreviewTab === 'details' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-white'}`}
                >
                  Question Statement
                </button>
                <button 
                  onClick={() => setActivePreviewTab('solution')}
                  className={`py-3 px-4 text-xs font-bold border-b-2 cursor-pointer transition-all ${activePreviewTab === 'solution' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-white'}`}
                >
                  Detailed Explanation
                </button>
                <button 
                  onClick={() => setActivePreviewTab('code')}
                  className={`py-3 px-4 text-xs font-bold border-b-2 cursor-pointer transition-all ${activePreviewTab === 'code' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-white'}`}
                >
                  Reference Codes
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {activePreviewTab === 'details' && (
                  <div className="space-y-5">
                    {/* Problem Statement */}
                    <div className="space-y-2">
                      <h4 className="text-xs text-gray-400 font-bold uppercase tracking-wider">Problem / Question Text</h4>
                      <p className="text-gray-200 text-sm whitespace-pre-wrap leading-relaxed bg-[#111625] p-4 rounded-xl border border-white/5">{previewQuestion.question || previewQuestion.text || ''}</p>
                    </div>

                    {/* Options (if MCQ) */}
                    {previewQuestion.options && previewQuestion.options.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs text-gray-400 font-bold uppercase tracking-wider">Choices / Options</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {previewQuestion.options.map((opt: string, i: number) => (
                            <div 
                              key={i} 
                              className={`p-3.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 border ${
                                (previewQuestion.correctAnswer || '').toLowerCase().includes(String.fromCharCode(65 + i).toLowerCase()) || 
                                (previewQuestion.correctAnswer || '') === opt
                                  ? 'border-emerald-500 bg-emerald-500/5 text-emerald-400' 
                                  : 'bg-[#111625] border-transparent text-gray-300'
                              }`}
                            >
                              <span className="w-6 h-6 bg-black/30 rounded-lg flex items-center justify-center font-bold text-xs">{String.fromCharCode(65 + i)}</span>
                              <span>{opt}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Metadata summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-[#0d1326]/50 p-4 rounded-xl border border-white/5 text-xs text-gray-300">
                      <div>
                        <span className="text-gray-500 font-semibold block mb-0.5">Marks weightage</span>
                        <span className="font-bold text-white">{previewQuestion.marks || '5 Marks'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 font-semibold block mb-0.5">Estimated completion</span>
                        <span className="font-bold text-white">{previewQuestion.estimatedTime || '15 mins'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 font-semibold block mb-0.5">Format type</span>
                        <span className="font-bold text-white">{previewQuestion.format || 'Subjective'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {activePreviewTab === 'solution' && (
                  <div className="space-y-5">
                    {/* AI Enhancement Trigger */}
                    {!previewQuestion.solution && (
                      <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="space-y-1">
                          <h4 className="text-white font-bold text-sm flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-indigo-400" />
                            <span>Optimal Solution Missing</span>
                          </h4>
                          <p className="text-xs text-gray-400">Let Gemini automatically write a step-by-step mathematical or programming solution description.</p>
                        </div>
                        <button 
                          onClick={enhanceFromPreview}
                          disabled={isEnhancing}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 px-4 py-2 rounded-xl text-xs font-bold shrink-0 cursor-pointer flex items-center gap-1.5"
                        >
                          {isEnhancing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                          <span>Generate Solution</span>
                        </button>
                      </div>
                    )}

                    {/* Solution text */}
                    {previewQuestion.solution && (
                      <div className="space-y-2">
                        <h4 className="text-xs text-gray-400 font-bold uppercase tracking-wider">Solution Explanation</h4>
                        <p className="text-gray-200 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed bg-[#111625] p-5 rounded-2xl border border-white/5">{previewQuestion.solution}</p>
                      </div>
                    )}

                    {/* Algorithm step */}
                    {previewQuestion.algorithm && (
                      <div className="space-y-2">
                        <h4 className="text-xs text-gray-400 font-bold uppercase tracking-wider">Optimal Algorithm Description</h4>
                        <p className="text-gray-300 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed bg-[#111625] p-5 rounded-2xl border border-white/5">{previewQuestion.algorithm}</p>
                      </div>
                    )}

                    {/* Interview tips / common mistakes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {previewQuestion.interviewTips && (
                        <div className="bg-[#101b1a] border border-[#14532d]/20 p-4 rounded-xl space-y-1.5">
                          <h5 className="text-emerald-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>Interview Presentation Tips</span>
                          </h5>
                          <p className="text-gray-300 text-xs whitespace-pre-wrap leading-relaxed">{previewQuestion.interviewTips}</p>
                        </div>
                      )}
                      {previewQuestion.commonMistakes && (
                        <div className="bg-[#1f1212] border border-[#7f1d1d]/20 p-4 rounded-xl space-y-1.5">
                          <h5 className="text-rose-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 text-rose-400" />
                            <span>Avoid These Common Pitfalls</span>
                          </h5>
                          <p className="text-gray-300 text-xs whitespace-pre-wrap leading-relaxed">{previewQuestion.commonMistakes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activePreviewTab === 'code' && (
                  <div className="space-y-5">
                    {/* Code Enhancer Block */}
                    {(!previewQuestion.code?.cpp && !previewQuestion.code?.python && !previewQuestion.code?.java && !previewQuestion.pseudoCode) && (
                      <div className="bg-[#111625] border border-white/5 p-6 rounded-2xl text-center">
                        <Code2 className="w-10 h-10 mx-auto text-gray-600 mb-2" />
                        <h5 className="text-white font-bold text-sm mb-1">No reference solution codes extracted</h5>
                        <p className="text-xs text-gray-400 max-w-md mx-auto mb-4">Let our specialized AI model draft and comment optimized snippets for C++, Java, and Python.</p>
                        <button 
                          onClick={enhanceFromPreview}
                          disabled={isEnhancing}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
                        >
                          {isEnhancing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                          <span>Generate Reference Codes</span>
                        </button>
                      </div>
                    )}

                    {/* Pseudocode block */}
                    {previewQuestion.pseudoCode && (
                      <div className="space-y-2">
                        <h4 className="text-xs text-gray-400 font-bold uppercase tracking-wider">Pseudocode Description</h4>
                        <pre className="text-xs text-indigo-300 font-mono bg-[#0d1326] p-4 rounded-xl border border-indigo-500/10 overflow-x-auto whitespace-pre-wrap leading-relaxed">{previewQuestion.pseudoCode}</pre>
                      </div>
                    )}

                    {/* Language Toggles */}
                    {(previewQuestion.code?.cpp || previewQuestion.code?.java || previewQuestion.code?.python) && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <h4 className="text-xs text-gray-400 font-bold uppercase tracking-wider">Reference Implementations</h4>
                          <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/5">
                            {(['cpp', 'java', 'python'] as const).map(lang => (
                              <button
                                key={lang}
                                onClick={() => setActiveCodeTab(lang)}
                                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase cursor-pointer ${activeCodeTab === lang ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
                              >
                                {lang === 'cpp' ? 'C++' : lang}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Code box */}
                        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#060913] p-4 font-mono text-[11px] text-gray-300 min-h-[150px]">
                          <pre className="overflow-x-auto whitespace-pre leading-relaxed font-mono">
                            {previewQuestion.code?.[activeCodeTab] || `// No ${activeCodeTab.toUpperCase()} solution snippet cataloged.`}
                          </pre>
                        </div>

                        {/* Complexity summary */}
                        <div className="flex flex-wrap gap-4 text-xs">
                          {previewQuestion.timeComplexity && (
                            <div className="bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                              <span className="text-gray-500">Time Complexity:</span> <span className="font-mono font-bold text-white">{previewQuestion.timeComplexity}</span>
                            </div>
                          )}
                          {previewQuestion.spaceComplexity && (
                            <div className="bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                              <span className="text-gray-500">Space Complexity:</span> <span className="font-mono font-bold text-white">{previewQuestion.spaceComplexity}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal footer */}
              <div className="p-4 border-t border-white/10 bg-black/25 flex justify-end gap-2 shrink-0">
                <button 
                  onClick={() => {
                    const q = previewQuestion;
                    setPreviewQuestion(null);
                    openEditor(q, q._idx, q._source);
                  }}
                  className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-xl text-xs font-bold border border-white/5 cursor-pointer"
                >
                  Edit Question
                </button>
                <button 
                  onClick={() => setPreviewQuestion(null)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* COMPREHENSIVE LIVE EDITOR MODAL */}
      <AnimatePresence>
        {editQuestion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b101f] border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-white/10 bg-[#0d1326] flex items-center justify-between shrink-0">
                <div className="space-y-1">
                  <h3 className="text-white font-extrabold text-base sm:text-lg">
                    Live Question Editor 📝
                  </h3>
                  <p className="text-xs text-gray-400">Refine details, choices, and reference solutions manually or with AI enhancement assistance.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={enhanceSolution}
                    disabled={isEnhancing}
                    className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 disabled:opacity-50 px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer border border-indigo-500/20"
                  >
                    {isEnhancing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>AI Auto-Enhance Solution</span>
                  </button>
                  <button 
                    onClick={() => setEditQuestion(null)}
                    className="bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white p-2 rounded-full cursor-pointer z-10 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable Form Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                
                {/* 1. Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Question Title / First line</label>
                  <input 
                    type="text"
                    value={editQuestion.title || ''}
                    onChange={(e) => setEditQuestion({ ...editQuestion, title: e.target.value })}
                    className="w-full bg-[#111625] border border-white/5 rounded-xl py-2 px-3 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                {/* 2. Topic, Type, Difficulty, Company Row */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Question Type</label>
                    <select
                      value={editQuestion.questionType || editQuestion.type || 'Aptitude'}
                      onChange={(e) => setEditQuestion({ ...editQuestion, questionType: e.target.value, type: e.target.value })}
                      className="w-full bg-[#111625] border border-white/5 rounded-xl py-2 px-3 text-xs font-semibold text-gray-300 focus:outline-none cursor-pointer"
                    >
                      <option value="Multiple Choice Question (MCQ)">MCQ</option>
                      <option value="Subjective">Subjective</option>
                      <option value="Coding Question">Coding Question</option>
                      <option value="Programming Problem">Programming Problem</option>
                      <option value="Fill in the Blanks">Fill in the Blanks</option>
                      <option value="True / False">True / False</option>
                      <option value="Numerical">Numerical</option>
                      <option value="Case Study">Case Study</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Primary Topic</label>
                    <input 
                      type="text"
                      value={editQuestion.topic || ''}
                      onChange={(e) => setEditQuestion({ ...editQuestion, topic: e.target.value })}
                      className="w-full bg-[#111625] border border-white/5 rounded-xl py-2 px-3 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Difficulty</label>
                    <select
                      value={editQuestion.difficulty || 'Medium'}
                      onChange={(e) => setEditQuestion({ ...editQuestion, difficulty: e.target.value })}
                      className="w-full bg-[#111625] border border-white/5 rounded-xl py-2 px-3 text-xs font-semibold text-gray-300 focus:outline-none cursor-pointer"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                      <option value="Expert">Expert</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Target Company</label>
                    <input 
                      type="text"
                      value={editQuestion.company || 'General Practice'}
                      onChange={(e) => setEditQuestion({ ...editQuestion, company: e.target.value })}
                      className="w-full bg-[#111625] border border-white/5 rounded-xl py-2 px-3 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
                </div>

                {/* 3. Question Description Textarea */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Full Question statement / Prompt</label>
                  <textarea 
                    value={editQuestion.question || editQuestion.text || ''}
                    onChange={(e) => setEditQuestion({ ...editQuestion, question: e.target.value, text: e.target.value })}
                    rows={4}
                    className="w-full bg-[#111625] border border-white/5 rounded-xl py-2.5 px-3 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500/50 font-mono leading-relaxed"
                  />
                </div>

                {/* 4. Options Editor (If MCQ) */}
                {Array.isArray(editQuestion.options) && (
                  <div className="space-y-2 bg-[#0d1326] p-4 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">Multiple Choice Choices (MCQ Options)</label>
                      <button 
                        onClick={() => {
                          const opts = [...(editQuestion.options || [])];
                          opts.push('');
                          setEditQuestion({ ...editQuestion, options: opts });
                        }}
                        className="text-indigo-400 hover:text-indigo-300 text-[10px] font-bold"
                      >
                        + Add Choice
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {editQuestion.options.map((opt: string, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="w-5 h-5 bg-black/40 rounded-lg flex items-center justify-center font-bold text-[10px] text-gray-400 shrink-0">{String.fromCharCode(65 + i)}</span>
                          <input 
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const opts = [...editQuestion.options];
                              opts[i] = e.target.value;
                              setEditQuestion({ ...editQuestion, options: opts });
                            }}
                            className="flex-1 bg-black/25 border border-white/5 rounded-xl py-1.5 px-3 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500/50"
                          />
                          <button 
                            onClick={() => {
                              const opts = editQuestion.options.filter((_: any, idx: number) => idx !== i);
                              setEditQuestion({ ...editQuestion, options: opts });
                            }}
                            className="text-red-400 hover:text-red-300 shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Correct Option / Correct Answer */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Correct Answer / Correct MCQ Option</label>
                  <input 
                    type="text"
                    placeholder="e.g. A or 50 or Prefix Sum"
                    value={editQuestion.correctAnswer || editQuestion.answer || ''}
                    onChange={(e) => setEditQuestion({ ...editQuestion, correctAnswer: e.target.value, answer: e.target.value })}
                    className="w-full bg-[#111625] border border-white/5 rounded-xl py-2 px-3 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                {/* 6. Solution / Ideal Answer Explanation */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Step-by-step Solution Explanation</label>
                  <textarea 
                    value={editQuestion.solution || ''}
                    onChange={(e) => setEditQuestion({ ...editQuestion, solution: e.target.value })}
                    rows={4}
                    className="w-full bg-[#111625] border border-white/5 rounded-xl py-2 px-3 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500/50 leading-relaxed"
                  />
                </div>

                {/* 7. Programming reference snippets */}
                <div className="space-y-3 bg-black/10 p-4 rounded-xl border border-white/5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Reference Solutions (C++, Java, Python)</label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-500 font-bold block">C++ SOLUTION</span>
                      <textarea 
                        value={editQuestion.code?.cpp || ''}
                        onChange={(e) => setEditQuestion({
                          ...editQuestion,
                          code: { ...(editQuestion.code || {}), cpp: e.target.value }
                        })}
                        rows={4}
                        className="w-full bg-[#111625] border border-white/5 rounded-xl p-2 text-[10px] font-mono text-gray-300 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-500 font-bold block">JAVA SOLUTION</span>
                      <textarea 
                        value={editQuestion.code?.java || ''}
                        onChange={(e) => setEditQuestion({
                          ...editQuestion,
                          code: { ...(editQuestion.code || {}), java: e.target.value }
                        })}
                        rows={4}
                        className="w-full bg-[#111625] border border-white/5 rounded-xl p-2 text-[10px] font-mono text-gray-300 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-500 font-bold block">PYTHON SOLUTION</span>
                      <textarea 
                        value={editQuestion.code?.python || ''}
                        onChange={(e) => setEditQuestion({
                          ...editQuestion,
                          code: { ...(editQuestion.code || {}), python: e.target.value }
                        })}
                        rows={4}
                        className="w-full bg-[#111625] border border-white/5 rounded-xl p-2 text-[10px] font-mono text-gray-300 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-white/10 bg-black/25 flex justify-end gap-2 shrink-0">
                <button 
                  onClick={() => setEditQuestion(null)}
                  className="bg-white/5 hover:bg-white/10 text-gray-300 px-4 py-2 rounded-xl text-xs font-bold border border-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={saveLiveEdit}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* INTERACTIVE DUPLICATE DETECTION WARNING MODAL */}
      <AnimatePresence>
        {duplicateWarning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b101f] border border-amber-500/30 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative p-6 space-y-6"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 text-amber-400" />
                </div>
                <div className="space-y-1.5 min-w-0">
                  <h4 className="text-white font-extrabold text-base sm:text-lg">Duplicate Question Detected!</h4>
                  <p className="text-xs text-amber-300">
                    An identical or highly similar question title or prompt statement already exists in your live catalog.
                  </p>
                </div>
              </div>

              {/* Diff card comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Existing */}
                <div className="bg-[#111625] p-4 rounded-xl border border-white/5 space-y-2">
                  <span className="text-[10px] text-gray-500 font-bold block uppercase tracking-wider">EXISTING IN LIVE BANK</span>
                  <h5 className="text-white font-bold truncate">{duplicateWarning.existing.title || 'Untitled'}</h5>
                  <p className="text-gray-400 line-clamp-3">{duplicateWarning.existing.question || duplicateWarning.existing.text || ''}</p>
                </div>
                {/* Incoming */}
                <div className="bg-indigo-500/5 p-4 rounded-xl border border-indigo-500/25 space-y-2">
                  <span className="text-[10px] text-indigo-400 font-bold block uppercase tracking-wider">INCOMING SCAN ITEM</span>
                  <h5 className="text-white font-bold truncate">{duplicateWarning.incoming.title || 'Untitled'}</h5>
                  <p className="text-gray-300 line-clamp-3">{duplicateWarning.incoming.question || duplicateWarning.incoming.text || ''}</p>
                </div>
              </div>

              {/* Wizard choice selectors */}
              <div className="space-y-2.5">
                <h5 className="text-gray-400 text-xs font-bold uppercase tracking-wider">How do you want to resolve this?</h5>
                
                <div className="grid grid-cols-1 gap-2">
                  <button 
                    onClick={handleMergeDuplicate}
                    className="w-full text-left bg-[#111625] hover:bg-indigo-500/10 p-3.5 rounded-xl border border-white/5 hover:border-indigo-500/50 transition-all cursor-pointer group flex items-start gap-3"
                  >
                    <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-white font-bold text-xs block group-hover:text-indigo-300">Merge Solutions & Codes</span>
                      <span className="text-[11px] text-gray-500 block leading-relaxed mt-0.5">Keep existing record but auto-merge any code blocks or explanation details missing from either.</span>
                    </div>
                  </button>

                  <button 
                    onClick={handleReplaceDuplicate}
                    className="w-full text-left bg-[#111625] hover:bg-amber-500/10 p-3.5 rounded-xl border border-white/5 hover:border-amber-500/50 transition-all cursor-pointer group flex items-start gap-3"
                  >
                    <RefreshCw className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-white font-bold text-xs block group-hover:text-amber-300">Replace / Overwrite Existing</span>
                      <span className="text-[11px] text-gray-500 block leading-relaxed mt-0.5">Completely overwrite the existing question in your bank with the newly extracted and verified data.</span>
                    </div>
                  </button>

                  <button 
                    onClick={handleSkipDuplicate}
                    className="w-full text-left bg-[#111625] hover:bg-red-500/10 p-3.5 rounded-xl border border-white/5 hover:border-red-500/50 transition-all cursor-pointer group flex items-start gap-3"
                  >
                    <X className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-white font-bold text-xs block group-hover:text-red-300">Skip & Discard Incoming</span>
                      <span className="text-[11px] text-gray-500 block leading-relaxed mt-0.5">Ignore and remove the incoming staged item without making any modifications to the live bank.</span>
                    </div>
                  </button>

                  <button 
                    onClick={handleKeepBothDuplicate}
                    className="w-full text-left bg-[#111625] hover:bg-white/10 p-3.5 rounded-xl border border-white/5 hover:border-white/20 transition-all cursor-pointer group flex items-start gap-3"
                  >
                    <ArrowRight className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-white font-bold text-xs block">Keep Both Questions Regardless</span>
                      <span className="text-[11px] text-gray-500 block leading-relaxed mt-0.5">Add the incoming item as a new standalone record anyway, creating multiple instances.</span>
                    </div>
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button 
                  onClick={() => setDuplicateWarning(null)}
                  className="bg-white/5 hover:bg-white/10 text-gray-300 px-4 py-2 rounded-xl text-xs font-bold border border-white/5 cursor-pointer"
                >
                  Cancel Resolve
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </AppLayout>
  );
}
