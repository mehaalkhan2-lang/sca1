import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { Plus, Video, GraduationCap, FileText, Bell, CheckCircle2, AlertCircle, Trash2, Clock, Calendar, User, Search, Upload, Image as ImageIcon, X, ShieldCheck, Sparkles, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';
import { generateMCQs, GeneratedQuestion } from '../services/geminiService';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<'lectures' | 'results' | 'notes' | 'quizzes' | 'inquiries' | 'notifications' | 'users'>('lectures');
  const user = auth.currentUser;
  const isAdminUser = user?.email === 'mehaalkhan.2@gmail.com';
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const [lectureData, setLectureData] = useState({ title: '', description: '', videoUrl: '', teacher: '', classLevel: '9th', subject: 'Physics', whiteboardImageUrl: '' });
  const [resultData, setResultData] = useState({ studentName: '', studentEmail: '', marks: '', totalMarks: '', classLevel: '9th' });
  const [noteData, setNoteData] = useState({ title: '', description: '', pdfUrl: '', classLevel: '9th', subject: 'Physics', chapter: '' });
  const [quizData, setQuizData] = useState({ title: '', classLevel: '9th', subject: 'Physics' });
  const [questionData, setQuestionData] = useState({ quizId: '', question: '', options: ['', '', '', ''], correctAnswerIndex: 0 });
  const [aiTopic, setAiTopic] = useState('');
  const [aiCount, setAiCount] = useState(5);
  const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [inquiryResponse, setInquiryResponse] = useState({ inquiryId: '', response: '' });
  const [notifData, setNotifData] = useState({ title: '', message: '', type: 'news' });
  const [items, setItems] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  useEffect(() => {
    let q;
    let collectionName = activeTab as string;

    if (activeTab === 'users') {
      q = query(collection(db, 'users'), orderBy('fullName', 'asc'));
    } else if (activeTab === 'inquiries') {
      q = query(collection(db, 'inquiries'), orderBy('createdAt', 'desc'));
    } else {
      q = query(collection(db, collectionName), orderBy('date', 'desc'));
    }

    if (activeTab === 'quizzes') {
      q = query(collection(db, 'quizzes'), orderBy('createdAt', 'desc'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, activeTab);
    });
    return () => unsubscribe();
  }, [activeTab]);

  useEffect(() => {
    const q = query(collection(db, 'quizzes'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setQuizzes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    
    const collectionName = activeTab;
    
    setDeleteLoading(id);
    try {
      await deleteDoc(doc(db, collectionName, id));
      setStatus({ type: 'success', message: 'Item deleted successfully!' });
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to delete item.' });
      handleFirestoreError(error, OperationType.DELETE, `${activeTab}/${id}`);
    } finally {
      setDeleteLoading(null);
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const resetForms = () => {
    setLectureData({ title: '', description: '', videoUrl: '', teacher: '', classLevel: '9th', subject: 'Physics', whiteboardImageUrl: '' });
    setResultData({ studentName: '', studentEmail: '', marks: '', totalMarks: '', classLevel: '9th' });
    setNoteData({ title: '', description: '', pdfUrl: '', classLevel: '9th', subject: 'Physics', chapter: '' });
    setQuizData({ title: '', classLevel: '9th', subject: 'Physics' });
    setQuestionData({ quizId: questionData.quizId, question: '', options: ['', '', '', ''], correctAnswerIndex: 0 });
    setNotifData({ title: '', message: '', type: 'news' });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let file: File | null = null;
    if ('files' in e.target && e.target.files) {
      file = e.target.files[0];
    } else if ('dataTransfer' in e) {
      e.preventDefault();
      file = e.dataTransfer.files[0];
    }

    if (file) {
      // 700KB limit to stay safe within 1MB Firestore limit
      if (file.size > 700000) {
        setStatus({ type: 'error', message: 'Photo too large! Use a file under 700KB.' });
        setTimeout(() => setStatus(null), 5000);
        return;
      }
      
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLectureData(prev => ({ ...prev, whiteboardImageUrl: reader.result as string }));
        setIsUploading(false);
        setStatus({ type: 'success', message: 'Whiteboard photo ready to publish!' });
        setTimeout(() => setStatus(null), 3000);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateAI = async () => {
    if (!aiTopic.trim()) {
      setStatus({ type: 'error', message: 'Please enter a topic for AI generation.' });
      return;
    }
    
    // Use selected quiz metadata if available for better AI context
    const selectedQuiz = quizzes.find(q => q.id === questionData.quizId);
    const targetClass = selectedQuiz?.classLevel || quizData.classLevel;
    const targetSubject = selectedQuiz?.subject || quizData.subject;

    setIsGenerating(true);
    setStatus(null);
    try {
      const generated = await generateMCQs(aiTopic, targetClass, targetSubject, aiCount);
      setAiGeneratedQuestions(generated);
      setStatus({ type: 'success', message: `${generated.length} Questions generated! Review below.` });
    } catch (error: any) {
      console.error("AI Generation Error:", error);
      const msg = error?.message || 'AI Generation failed. Try again.';
      setStatus({ type: 'error', message: msg });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeployAIQuestions = async () => {
    if (!questionData.quizId || questionData.quizId === '') {
      setStatus({ type: 'error', message: 'ERROR: Select a target quiz first above.' });
      return;
    }
    if (aiGeneratedQuestions.length === 0) return;

    setLoading(true);
    setStatus({ type: 'success', message: 'Deploying questions to database... Please wait.' });
    
    try {
      const collPath = `quizzes/${questionData.quizId}/questions`;
      const quizRef = doc(db, 'quizzes', questionData.quizId);
      
      // Use clean map to ensure no non-serializable data persists
      const cleanQuestions = aiGeneratedQuestions.map(q => ({
        question: String(q.question).trim(),
        options: q.options.map(o => String(o).trim()),
        correctAnswerIndex: Number(q.correctAnswerIndex)
      }));

      // Grouped addition
      let count = 0;
      for (const q of cleanQuestions) {
        await addDoc(collection(db, collPath), q);
        count++;
      }

      await updateDoc(quizRef, {
        questionCount: increment(count)
      });

      setStatus({ type: 'success', message: `DEPLOYMENT SUCCESS: ${count} MCQs added to database!` });
      setAiGeneratedQuestions([]);
      setAiTopic('');
      // Refresh local quizzes list if needed (though onSnapshot handles it)
    } catch (error: any) {
      console.error("Deploy error:", error);
      const msg = error.message?.includes('permission') ? 'PERMISSION DENIED' : error.message || 'Network error';
      setStatus({ type: 'error', message: `DEPLOYMENT FAILED: ${msg}` });
      handleFirestoreError(error, OperationType.CREATE, `quizzes/${questionData.quizId}/questions`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuiz = async () => {
    if (!quizData.title.trim()) {
      setStatus({ type: 'error', message: 'Quiz Title is required to create a new practice test.' });
      return;
    }
    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, 'quizzes'), { ...quizData, createdAt: serverTimestamp(), questionCount: 0 });
      setStatus({ type: 'success', message: 'Practice test portal created successfully! Select it below to add questions.' });
      setQuestionData(prev => ({ ...prev, quizId: docRef.id })); // Auto-select new quiz
      setQuizData({ title: '', classLevel: '9th', subject: 'Physics' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'quizzes');
      setStatus({ type: 'error', message: 'Failed to create quiz portal.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddManualQuestion = async () => {
    if (!questionData.quizId) {
      setStatus({ type: 'error', message: 'Please select a target quiz first.' });
      return;
    }
    if (!questionData.question.trim()) {
      setStatus({ type: 'error', message: 'Question text cannot be empty.' });
      return;
    }
    setLoading(true);
    try {
      const data = {
        question: questionData.question.trim(),
        options: questionData.options.map(o => o.trim()),
        correctAnswerIndex: questionData.correctAnswerIndex
      };
      await addDoc(collection(db, `quizzes/${questionData.quizId}/questions`), data);
      await updateDoc(doc(db, 'quizzes', questionData.quizId), {
        questionCount: increment(1)
      });
      setStatus({ type: 'success', message: 'Question added successfully!' });
      setQuestionData({ ...questionData, question: '', options: ['', '', '', ''], correctAnswerIndex: 0 });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `quizzes/${questionData.quizId}/questions`);
      setStatus({ type: 'error', message: 'Failed to add question.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'quizzes') return; // Handled by specific functions
    setLoading(true);
    setStatus(null);

    try {
      let collectionName = activeTab === 'results' ? 'results' : activeTab;
      let data: any = {};
      let isQuestion = false;

      switch (activeTab) {
        case 'lectures': {
          const cleanLecture = Object.fromEntries(
            Object.entries(lectureData).filter(([_, v]) => v !== '')
          );
          data = { ...cleanLecture, date: serverTimestamp() };
          break;
        }
        case 'results': {
          const cleanResult = Object.fromEntries(
            Object.entries(resultData).filter(([_, v]) => v !== '')
          );
          data = { 
            ...cleanResult, 
            marks: isNaN(Number(resultData.marks)) ? resultData.marks : Number(resultData.marks), 
            totalMarks: isNaN(Number(resultData.totalMarks)) ? resultData.totalMarks : Number(resultData.totalMarks), 
            date: serverTimestamp() 
          };
          break;
        }
        case 'notes': {
          const cleanNote = Object.fromEntries(
            Object.entries(noteData).filter(([_, v]) => v !== '')
          );
          data = { ...cleanNote, date: serverTimestamp() };
          break;
        }
        case 'quizzes': {
          break;
        }
        case 'inquiries': {
          // Handle response separately if needed, but normally handleSubmit is for POST
          // If we are answering, we might need a different handler or check state
          if (inquiryResponse.inquiryId) {
             // Handle via separate function or special flag
             return; 
          }
          break;
        }
        case 'notifications': {
          const cleanNotif = Object.fromEntries(
            Object.entries(notifData).filter(([_, v]) => v !== '')
          );
          data = { ...cleanNotif, date: serverTimestamp() };
          break;
        }
      }

      if (isQuestion) {
        if (!questionData.quizId || questionData.quizId === '') throw new Error('Target Quiz ID is required');
        const collPath = `quizzes/${questionData.quizId}/questions`;
        await addDoc(collection(db, collPath), data);
        setStatus({ type: 'success', message: `Question successfully added to quiz!` });
      } else {
        if (activeTab === 'inquiries' || activeTab === 'users') {
          setLoading(false);
          return;
        }
        await addDoc(collection(db, collectionName), data);
        setStatus({ type: 'success', message: `${activeTab.slice(0, -1)} added successfully!` });
      }
      resetForms();
    } catch (error: any) {
      console.error(error);
      const errorMessage = error.message?.includes('insufficient permissions') 
        ? 'Permission Denied! Check your admin access.'
        : `Error: ${error.message?.slice(0, 50) || 'Database error'}`;
      setStatus({ type: 'error', message: errorMessage });
      handleFirestoreError(error, OperationType.CREATE, activeTab);
    } finally {
      setLoading(false);
      setTimeout(() => setStatus(null), 5000);
    }
  };

  const tabs = [
    { id: 'lectures', label: 'Topics', icon: Video },
    { id: 'results', label: 'Results', icon: GraduationCap },
    { id: 'notes', label: 'PDF Notes', icon: FileText },
    { id: 'quizzes', label: 'Quizzes', icon: ShieldCheck },
    { id: 'inquiries', label: 'Help Desk', icon: Clock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'users', label: 'Students', icon: User },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl vibrant-heading mb-2">Instructor Console</h1>
          <p className="text-slate-500 font-medium">Manage coaching portions, student results, and campus alerts.</p>
        </div>
        
        <div className={`flex items-center gap-3 px-4 py-2 rounded-2xl border ${isAdminUser ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
          <div className={`p-2 rounded-xl ${isAdminUser ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current User</p>
            <p className="text-sm font-bold text-slate-700">{user?.email || 'Not logged in'}</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Tabs */}
        <div className="space-y-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-4 px-6 py-4 rounded-[24px] transition-all font-bold text-sm ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 border border-indigo-400' 
                    : 'text-slate-500 hover:bg-white hover:text-brand-primary border border-transparent'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Area */}
        <div className="lg:col-span-3">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="vibrant-card !p-10 border-t-8 border-t-brand-primary"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-4">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                {activeTab === 'users' ? 'Registered Students' : `Post New ${activeTab.slice(0, -1)}`}
              </h2>
              {status && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${
                    status.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                  }`}
                >
                  {status.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{status.message}</span>
                </motion.div>
              )}
            </div>

            {activeTab !== 'users' ? (
              <form onSubmit={handleSubmit} className="space-y-8">
                {activeTab === 'lectures' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Today's Topic</label>
                        <input 
                          required
                          type="text" 
                          value={lectureData.title}
                          onChange={(e) => setLectureData({...lectureData, title: e.target.value})}
                          placeholder="e.g. Laws of Motion"
                          className="vibrant-input"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Select Class</label>
                        <select 
                          required
                          value={lectureData.classLevel}
                          onChange={(e) => setLectureData({...lectureData, classLevel: e.target.value})}
                          className="vibrant-input cursor-pointer"
                        >
                          <option value="9th">9th Class</option>
                          <option value="10th">10th Class</option>
                          <option value="11th">11th Class</option>
                          <option value="12th">12th Class</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Select Subject</label>
                        <select 
                          required
                          value={lectureData.subject}
                          onChange={(e) => setLectureData({...lectureData, subject: e.target.value})}
                          className="vibrant-input cursor-pointer"
                        >
                          <option value="Physics">Physics</option>
                          <option value="Biology">Biology</option>
                          <option value="Chemistry">Chemistry</option>
                          <option value="Maths">Maths</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Whiteboard Photo (Drag & Drop or Click)</label>
                        <div 
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={handleImageUpload}
                          className={`relative border-2 border-dashed rounded-2xl transition-all h-32 flex flex-col items-center justify-center gap-2 overflow-hidden ${
                            lectureData.whiteboardImageUrl ? 'border-brand-primary bg-indigo-50/30' : 'border-slate-200 hover:border-brand-primary bg-slate-50'
                          }`}
                        >
                          {isUploading ? (
                            <div className="flex items-center gap-2 text-brand-primary animate-pulse font-black text-xs">
                              <Upload className="w-4 h-4 animate-bounce" />
                              PROCESSING...
                            </div>
                          ) : lectureData.whiteboardImageUrl ? (
                            <>
                              <img src={lectureData.whiteboardImageUrl} className="absolute inset-0 w-full h-full object-cover opacity-20" alt="Preview"/>
                              <div className="relative z-10 flex flex-col items-center">
                                <ImageIcon className="w-8 h-8 text-brand-primary mb-1" />
                                <span className="text-[10px] font-black text-brand-primary uppercase">Photo Selected</span>
                                <button 
                                  type="button"
                                  onClick={() => setLectureData(prev => ({ ...prev, whiteboardImageUrl: '' }))}
                                  className="mt-2 bg-white px-3 py-1 rounded-full text-[10px] font-black text-red-500 shadow-sm border border-red-100 hover:bg-red-50"
                                >
                                  REMOVE
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <Upload className="w-8 h-8 text-slate-300" />
                              <span className="text-[11px] font-bold text-slate-400">Click or Drop Picture</span>
                              <input 
                                type="file" 
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                              />
                            </>
                          )}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Instructor</label>
                        <input 
                          type="text" 
                          value={lectureData.teacher}
                          onChange={(e) => setLectureData({...lectureData, teacher: e.target.value})}
                          placeholder="e.g. Dr. Khan"
                          className="vibrant-input"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">YouTube Link (Optional)</label>
                        <input 
                          type="url" 
                          value={lectureData.videoUrl}
                          onChange={(e) => setLectureData({...lectureData, videoUrl: e.target.value})}
                          placeholder="https://www.youtube.com/watch?v=..."
                          className="vibrant-input"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Chapter Summary</label>
                      <textarea 
                        rows={3}
                        value={lectureData.description}
                        onChange={(e) => setLectureData({...lectureData, description: e.target.value})}
                        placeholder="High-level overview of the session..."
                        className="vibrant-input resize-none"
                      />
                    </div>
                  </>
                )}

                {activeTab === 'results' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Full Name</label>
                        <input 
                          required
                          type="text" 
                          value={resultData.studentName}
                          onChange={(e) => setResultData({...resultData, studentName: e.target.value})}
                          placeholder="Student's name"
                          className="vibrant-input"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Portal Email</label>
                        <input 
                          required
                          type="email" 
                          value={resultData.studentEmail}
                          onChange={(e) => setResultData({...resultData, studentEmail: e.target.value})}
                          placeholder="verified@email.com"
                          className="vibrant-input"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Select Class</label>
                        <select 
                          required
                          value={resultData.classLevel}
                          onChange={(e) => setResultData({...resultData, classLevel: e.target.value})}
                          className="vibrant-input cursor-pointer"
                        >
                          <option value="9th">9th Class</option>
                          <option value="10th">10th Class</option>
                          <option value="11th">11th Class</option>
                          <option value="12th">12th Class</option>
                        </select>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Obtained Marks</label>
                        <input 
                          required
                          type="number" 
                          value={resultData.marks}
                          onChange={(e) => setResultData({...resultData, marks: e.target.value})}
                          placeholder="0"
                          className="vibrant-input text-center"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Total Marks</label>
                        <input 
                          required
                          type="number" 
                          value={resultData.totalMarks}
                          onChange={(e) => setResultData({...resultData, totalMarks: e.target.value})}
                          placeholder="100"
                          className="vibrant-input text-center"
                        />
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'notes' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Resource Title</label>
                        <input 
                          required
                          type="text" 
                          value={noteData.title}
                          onChange={(e) => setNoteData({...noteData, title: e.target.value})}
                          placeholder="e.g. Unit 4 Detailed Notes"
                          className="vibrant-input"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Chapter Name / Number</label>
                        <input 
                          required
                          type="text" 
                          value={noteData.chapter}
                          onChange={(e) => setNoteData({...noteData, chapter: e.target.value})}
                          placeholder="e.g. Chapter 1: Introduction"
                          className="vibrant-input"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Select Class</label>
                        <select 
                          required
                          value={noteData.classLevel}
                          onChange={(e) => setNoteData({...noteData, classLevel: e.target.value})}
                          className="vibrant-input cursor-pointer"
                        >
                          <option value="9th">9th Class</option>
                          <option value="10th">10th Class</option>
                          <option value="11th">11th Class</option>
                          <option value="12th">12th Class</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Select Subject</label>
                        <select 
                          required
                          value={noteData.subject}
                          onChange={(e) => setNoteData({...noteData, subject: e.target.value})}
                          className="vibrant-input cursor-pointer"
                        >
                          <option value="Physics">Physics</option>
                          <option value="Biology">Biology</option>
                          <option value="Chemistry">Chemistry</option>
                          <option value="Maths">Maths</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Cloud Link (PDF)</label>
                        <input 
                          required
                          type="url" 
                          value={noteData.pdfUrl}
                          onChange={(e) => setNoteData({...noteData, pdfUrl: e.target.value})}
                          placeholder="Public PDF URL"
                          className="vibrant-input"
                        />
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'quizzes' && (
                  <div className="space-y-12">
                    <div className="p-6 bg-indigo-50 border-2 border-indigo-200 rounded-[40px] mb-8 shadow-sm">
                       <div className="flex flex-col md:flex-row md:items-center gap-6">
                          <div className="w-16 h-16 bg-indigo-600 rounded-[20px] flex items-center justify-center text-white shadow-lg shadow-indigo-100 flex-shrink-0">
                             <ShieldCheck className="w-10 h-10" />
                          </div>
                          <div className="flex-1">
                             <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-2">Step 1: Select Practice Portal (Target)</label>
                             <select 
                                value={questionData.quizId}
                                onChange={(e) => setQuestionData({...questionData, quizId: e.target.value})}
                                className="w-full bg-white border-2 border-indigo-100 rounded-2xl px-6 py-4 text-sm font-black text-slate-800 outline-none cursor-pointer focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all appearance-none"
                              >
                                <option value="">--- PLEASE SELECT A QUIZ FIRST ---</option>
                                {quizzes.map(q => (
                                  <option key={q.id} value={q.id}>{q.title} ({q.classLevel} - {q.subject})</option>
                                ))}
                              </select>
                          </div>
                       </div>
                    </div>

                    <div className="p-6 bg-brand-primary/5 rounded-[32px] border border-brand-primary/10">
                      <h3 className="text-lg font-black text-brand-primary uppercase tracking-widest mb-6">Create New Practice Test</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Quiz Title</label>
                    <input 
                      type="text" 
                      value={quizData.title}
                      onChange={(e) => setQuizData({...quizData, title: e.target.value})}
                      placeholder="e.g. Physics Unit 1 Test"
                      className="vibrant-input"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Select Class</label>
                    <select 
                      value={quizData.classLevel}
                      onChange={(e) => setQuizData({...quizData, classLevel: e.target.value})}
                      className="vibrant-input cursor-pointer"
                    >
                      <option value="9th">9th Class</option>
                      <option value="10th">10th Class</option>
                      <option value="11th">11th Class</option>
                      <option value="12th">12th Class</option>
                    </select>
                  </div>
                </div>
                <div className="mt-8 flex flex-col md:flex-row gap-8 items-end">
                  <div className="flex-1 space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Select Subject</label>
                    <select 
                      value={quizData.subject}
                      onChange={(e) => setQuizData({...quizData, subject: e.target.value})}
                      className="vibrant-input cursor-pointer"
                    >
                      <option value="Physics">Physics</option>
                      <option value="Biology">Biology</option>
                      <option value="Chemistry">Chemistry</option>
                      <option value="Maths">Maths</option>
                    </select>
                  </div>
                  <button 
                    type="button"
                    onClick={handleCreateQuiz}
                    disabled={loading || !quizData.title.trim()}
                    className="flex-1 vibrant-button h-16 !rounded-2xl"
                  >
                    Create Test Portal
                  </button>
                </div>
                    </div>

                    <div className="p-8 bg-indigo-900 rounded-[32px] border border-indigo-700 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Sparkles className="w-24 h-24 text-white" />
                      </div>
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                           <div className="w-10 h-10 bg-indigo-500 rounded-2xl flex items-center justify-center text-white">
                             <Wand2 className="w-5 h-5" />
                           </div>
                           <div>
                             <h3 className="text-xl font-black text-white uppercase tracking-widest leading-none">AI MCQ Generator</h3>
                             <p className="text-indigo-300 text-[10px] font-black uppercase tracking-widest mt-1">Powered by Google Gemini</p>
                           </div>
                        </div>

                        <div className="space-y-6">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-indigo-300 uppercase tracking-widest pl-1">Enter Topic/Chapter Name</label>
                             <input 
                               type="text" 
                               value={aiTopic}
                               onChange={(e) => setAiTopic(e.target.value)}
                               placeholder="e.g. Newton's 2nd Law, Mitochondria, etc."
                               className="w-full bg-indigo-800/50 border-2 border-indigo-700 rounded-2xl p-4 text-white font-bold placeholder:text-indigo-400 focus:border-indigo-400 outline-none transition-all"
                             />
                          </div>

                          <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 space-y-2">
                              <label className="text-[10px] font-black text-indigo-300 uppercase tracking-widest pl-1">Questions Count</label>
                              <select 
                                value={aiCount}
                                onChange={(e) => setAiCount(Number(e.target.value))}
                                className="w-full bg-indigo-800/50 border-2 border-indigo-700 rounded-2xl p-4 text-white font-bold outline-none cursor-pointer"
                              >
                                <option value={3}>3 Questions</option>
                                <option value={5}>5 Questions</option>
                                <option value={10}>10 Questions</option>
                              </select>
                            </div>
                            <div className="flex-1 flex items-end">
                              <button
                                type="button"
                                onClick={handleGenerateAI}
                                disabled={isGenerating || !aiTopic.trim()}
                                className="w-full h-16 bg-white text-indigo-600 rounded-2xl font-black uppercase tracking-widest hover:bg-brand-accent transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                              >
                                {isGenerating ? (
                                  <>
                                    <div className="w-5 h-5 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                    <span>Thinking...</span>
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-5 h-5" />
                                    <span>AI Magic</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        <AnimatePresence>
                          {aiGeneratedQuestions.length > 0 && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              className="mt-10 pt-10 border-t border-indigo-700"
                            >
                              <div className="flex items-center justify-between mb-8">
                                <h4 className="text-sm font-black text-indigo-100 uppercase tracking-widest">Review Generated Questions</h4>
                                <button 
                                  onClick={() => setAiGeneratedQuestions([])}
                                  className="text-[10px] font-black text-indigo-400 uppercase hover:text-white"
                                >
                                  Discard All
                                </button>
                              </div>

                              <div className="space-y-6 max-h-96 overflow-y-auto pr-4 custom-scrollbar">
                                {aiGeneratedQuestions.map((q, idx) => (
                                  <div key={idx} className="p-6 bg-indigo-800/30 rounded-2xl border border-indigo-700 group">
                                     <div className="flex justify-between items-start mb-4">
                                        <p className="text-sm font-bold text-white leading-relaxed flex-1 mr-4">
                                          <span className="text-indigo-400 mr-2">Q{idx+1}.</span>
                                          {q.question}
                                        </p>
                                     </div>
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {q.options.map((opt, oIdx) => (
                                          <div 
                                            key={oIdx} 
                                            className={`p-3 rounded-xl border text-[11px] font-bold ${
                                              oIdx === q.correctAnswerIndex 
                                              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                                              : 'bg-white/5 border-white/10 text-indigo-200'
                                            }`}
                                          >
                                            <span className="opacity-50 mr-2">{String.fromCharCode(65+oIdx)}.</span>
                                            {opt}
                                          </div>
                                        ))}
                                     </div>
                                  </div>
                                ))}
                              </div>

                              <div className="mt-8 p-6 bg-indigo-500/20 rounded-2xl border border-indigo-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
                                <div>
                                  <p className="text-white font-black text-sm">Deploy to: {quizzes.find(q => q.id === questionData.quizId)?.title || 'No quiz selected'}</p>
                                  <p className="text-indigo-300 text-[10px] font-black uppercase">
                                    {!questionData.quizId ? '⚠ You must select a quiz at the top of this tab first' : 'Ready to push to database'}
                                  </p>
                                </div>
                                <button 
                                  type="button"
                                  onClick={handleDeployAIQuestions}
                                  disabled={loading || !questionData.quizId || aiGeneratedQuestions.length === 0}
                                  className="px-8 py-4 bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-900/50 disabled:opacity-50"
                                >
                                  {loading ? 'Deploying...' : 'Save All to Quiz'}
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div className="p-6 bg-amber-50 rounded-[32px] border border-amber-100">
                      <h3 className="text-lg font-black text-amber-900 uppercase tracking-widest mb-6">Add MCQ Question</h3>
                      <div className="space-y-6">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-amber-700 uppercase tracking-[0.2em] pl-1">Target Portal</label>
                          <div className="p-4 bg-white rounded-2xl border-2 border-amber-200 font-black text-amber-900 text-sm">
                            {quizzes.find(q => q.id === questionData.quizId)?.title || "⚠ PLEASE SELECT A QUIZ AT THE TOP FIRST"}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-amber-900 uppercase tracking-[0.2em] pl-1">Question Text</label>
                          <textarea 
                            rows={2}
                            value={questionData.question}
                            onChange={(e) => setQuestionData({...questionData, question: e.target.value})}
                            placeholder="Type the MCQ question here..."
                            className="vibrant-input resize-none bg-white"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {questionData.options.map((opt, idx) => (
                            <div key={idx} className="space-y-2">
                              <label className="text-[9px] font-black text-amber-700 uppercase">Option {String.fromCharCode(65 + idx)}</label>
                              <div className="flex items-center gap-2">
                                <input 
                                  type="radio" 
                                  name="correctAnswer"
                                  checked={questionData.correctAnswerIndex === idx}
                                  onChange={() => setQuestionData({...questionData, correctAnswerIndex: idx})}
                                  className="w-4 h-4 text-brand-primary"
                                />
                                <input 
                                  type="text" 
                                  value={opt}
                                  onChange={(e) => {
                                    const newOpts = [...questionData.options];
                                    newOpts[idx] = e.target.value;
                                    setQuestionData({...questionData, options: newOpts});
                                  }}
                                  className="vibrant-input bg-white !py-2"
                                  placeholder={`Option ${idx + 1}`}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                        <button 
                          type="button"
                          onClick={handleAddManualQuestion}
                          disabled={loading || !questionData.quizId || !questionData.question.trim()}
                          className="w-full vibrant-button bg-amber-600 hover:bg-amber-700 h-16 !rounded-2xl mt-8"
                        >
                          Add Manual Question
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'inquiries' && (
                  <div className="space-y-6">
                    <p className="text-sm font-bold text-slate-500 italic">Respond to student questions in the management board below.</p>
                  </div>
                )}

                {activeTab === 'notifications' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Notification Title</label>
                        <input 
                          required
                          type="text" 
                          value={notifData.title}
                          onChange={(e) => setNotifData({...notifData, title: e.target.value})}
                          className="vibrant-input"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Alert Category</label>
                        <select 
                          value={notifData.type}
                          onChange={(e) => setNotifData({...notifData, type: e.target.value as any})}
                          className="vibrant-input cursor-pointer"
                        >
                          <option value="news">General News</option>
                          <option value="alert">Urgent Action</option>
                          <option value="update">Portal Update</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Broadcast Message</label>
                      <textarea 
                        required
                        rows={5}
                        value={notifData.message}
                        onChange={(e) => setNotifData({...notifData, message: e.target.value})}
                        placeholder="Type details here for all students..."
                        className="vibrant-input resize-none"
                      />
                    </div>
                  </>
                )}

                {activeTab !== 'quizzes' && (
                  <button
                    type="submit"
                    disabled={loading}
                    className="vibrant-button w-full py-5 !text-lg !rounded-[24px]"
                  >
                    {loading ? (
                      <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-6 h-6 mr-2" />
                        <span>Publish Content</span>
                      </>
                    )}
                  </button>
                )}
              </form>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
                  <div>
                    <h3 className="text-xl font-black text-indigo-900">Student Directory</h3>
                    <p className="text-xs text-indigo-600 font-bold uppercase tracking-widest mt-1">SCA Karak Enrollment List</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="px-5 py-2 bg-white rounded-2xl shadow-sm border border-indigo-100 flex flex-col items-center">
                      <span className="text-2xl font-black text-indigo-600">{items.length}</span>
                      <span className="text-[8px] font-black text-indigo-300 uppercase">Enrolled</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Existing Content List */}
            <div className="mt-16 pt-10 border-t-2 border-slate-50">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                  {activeTab === 'users' ? 'Managed Directory' : `Manage Existing ${activeTab}`}
                </h3>
                <span className="px-4 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest leading-none">
                  {items.length} Total
                </span>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                  <p className="text-slate-400 font-bold">No entries found for this category.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div 
                      key={item.id}
                      className="bg-slate-50 border border-slate-100 p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group hover:bg-white hover:border-brand-primary/20 hover:shadow-xl transition-all"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-slate-800 truncate">{item.fullName || item.title || item.studentName}</h4>
                          {item.classLevel && (
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded text-[10px] font-black uppercase">{item.classLevel}</span>
                          )}
                          {item.subject && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-black uppercase">{item.subject}</span>
                          )}
                          {item.id && activeTab === 'quizzes' && (
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${item.questionCount > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                {item.questionCount || 0} MCQs
                              </span>
                              <span className="px-2 py-0.5 bg-brand-primary/10 text-brand-primary rounded text-[10px] font-black uppercase">Practice Portal</span>
                              <button 
                                onClick={() => {
                                  setQuestionData(prev => ({ ...prev, quizId: item.id }));
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="text-[10px] font-black text-indigo-600 hover:underline"
                              >
                                + Add MCQ
                              </button>
                            </div>
                          )}
                          {item.role === 'admin' && (
                             <span className="px-2 py-0.5 bg-rose-100 text-rose-600 rounded text-[10px] font-black uppercase">Admin</span>
                          )}
                          {item.status && (
                             <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${item.status === 'answered' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                               {item.status}
                             </span>
                          )}
                        </div>
                        {item.question && (
                          <p className="mt-1 text-xs text-slate-500 italic line-clamp-1">Q: {item.question}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-slate-400 font-bold mt-2">
                          {activeTab === 'users' ? (
                            <span className="flex items-center gap-1">
                               <FileText className="w-3 h-3" />
                               {item.email}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {(item.date?.toDate || item.createdAt?.toDate) ? (item.date || item.createdAt).toDate().toLocaleDateString() : 'Just now'}
                            </span>
                          )}
                          {item.studentName && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {item.studentName}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deleteLoading === item.id || (activeTab === 'users' && item.email === 'mehaalkhan.2@gmail.com')}
                        className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all disabled:opacity-20"
                        title="Delete entry"
                      >
                        {deleteLoading === item.id ? (
                          <div className="w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* New Help Guide */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-indigo-900 rounded-3xl p-6 text-white shadow-xl">
              <h3 className="font-black text-lg mb-2 flex items-center gap-2">
                 <span className="w-2 h-2 bg-amber-400 rounded-full" />
                 Whiteboard Photo Upload
              </h3>
              <ul className="text-xs text-indigo-100 space-y-2 font-medium">
                <li>• Whiteboard: Now you can drag and drop photos directly from your phone or device!</li>
                <li>• Size Limit: Ensure photos are under 700KB for faster loading.</li>
                <li>• Topics: Select the Subject for better student organization.</li>
                <li>• Video links are optional if you only want to show whiteboard photos.</li>
              </ul>
            </div>
            <div className="bg-amber-100 rounded-3xl p-6 border-2 border-amber-200">
              <h3 className="font-black text-lg mb-2 text-amber-900 flex items-center gap-2">
                 <span className="w-2 h-2 bg-indigo-600 rounded-full" />
                 Managing Results
              </h3>
              <p className="text-xs text-amber-800 leading-relaxed font-bold">
                When you upload a result, use the student's exact email they use to login. They will automatically see only their own marks in their "Results" tab.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
