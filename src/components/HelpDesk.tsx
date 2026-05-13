import React, { useEffect, useState } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { MessageSquare, Send, Clock, CheckCircle2, AlertCircle, User, MessageCircle, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';

interface Inquiry {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  question: string;
  status: 'pending' | 'answered';
  response?: string;
  createdAt: any;
  answeredAt?: any;
}

export default function HelpDesk({ role }: { role: string | null }) {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeResponse, setActiveResponse] = useState<{ id: string, text: string } | null>(null);

  const user = auth.currentUser;
  const isAdmin = role === 'admin';

  useEffect(() => {
    let q;
    if (isAdmin) {
      q = query(collection(db, 'inquiries'), orderBy('createdAt', 'desc'));
    } else if (user) {
      q = query(collection(db, 'inquiries'), orderBy('createdAt', 'desc'));
    } else {
      return;
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allInquiries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Inquiry[];
      if (isAdmin) {
        setInquiries(allInquiries);
      } else {
        setInquiries(allInquiries.filter(i => i.studentId === user?.uid));
      }
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'inquiries'));

    return () => unsubscribe();
  }, [user, isAdmin]);

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !user) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'inquiries'), {
        studentId: user.uid,
        studentName: user.displayName || 'Student',
        studentEmail: user.email || '',
        question: question.trim(),
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setQuestion('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'inquiries');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminResponse = async (inquiryId: string) => {
    if (!activeResponse?.text.trim()) return;

    try {
      await updateDoc(doc(db, 'inquiries', inquiryId), {
        response: activeResponse.text.trim(),
        status: 'answered',
        answeredAt: serverTimestamp()
      });
      setActiveResponse(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `inquiries/${inquiryId}`);
    }
  };

  if (loading) {
    return <div className="text-center py-20 animate-pulse text-indigo-400 font-black">SCANNING QUESTIONS...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-12">
        <h1 className="text-4xl vibrant-heading mb-2">Help Desk</h1>
        <p className="text-slate-500 font-medium italic">Direct line to instructors for your doubts and questions.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {/* Student Question Form */}
        {!isAdmin && (
          <div className="md:col-span-1">
            <div className="vibrant-card !p-8 border-t-8 border-t-brand-primary sticky top-24">
              <h2 className="text-xl font-black text-slate-800 mb-6 tracking-tight">Ask a Question</h2>
              <form onSubmit={handleSubmitQuestion} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Your Inquiry</label>
                  <textarea 
                    required
                    rows={6}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="e.g. Can you explain the 3rd Law of Motion again?"
                    className="vibrant-input resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting || !question.trim()}
                  className="vibrant-button w-full py-4 !rounded-2xl"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Question
                    </>
                  )}
                </button>
              </form>
              <div className="mt-8 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 italic text-[11px] text-indigo-600 font-bold leading-relaxed">
                Response times may vary. Instructors usually respond within 24 hours.
              </div>
            </div>
          </div>
        )}

        {/* Inquiries List */}
        <div className={isAdmin ? 'md:col-span-3' : 'md:col-span-2'}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
               <MessageSquare className="w-6 h-6 text-indigo-600" />
               {isAdmin ? 'All Student Inquiries' : 'Your Previous Doubts'}
            </h2>
            <span className="px-3 py-1 bg-slate-100 text-slate-400 rounded-full text-[10px] font-black uppercase">{inquiries.length} Total</span>
          </div>

          <div className="space-y-6">
            {inquiries.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-[32px] border-2 border-dashed border-slate-100">
                <MessageCircle className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-bold italic">No {isAdmin ? 'pending' : 'previous'} inquiries found.</p>
              </div>
            ) : (
              inquiries.map((inquiry) => (
                <motion.div 
                  layout
                  key={inquiry.id} 
                  className={`vibrant-card !p-8 border-l-8 ${inquiry.status === 'answered' ? 'border-l-emerald-500' : 'border-l-amber-500'}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black bg-slate-100 text-slate-500`}>
                        {inquiry.studentName[0]}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-800">{inquiry.studentName}</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{inquiry.createdAt?.toDate ? inquiry.createdAt.toDate().toLocaleDateString() : 'Just now'}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                      inquiry.status === 'answered' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                    }`}>
                      {inquiry.status}
                    </span>
                  </div>

                  <div className="pl-11 pr-2">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 relative mb-6">
                       <p className="text-slate-700 font-bold text-sm leading-relaxed">{inquiry.question}</p>
                       <div className="absolute -left-2 top-4 w-4 h-4 bg-slate-50 border-l border-t border-slate-100 rotate-45" />
                    </div>

                    <AnimatePresence>
                      {inquiry.response ? (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-indigo-600 p-6 rounded-2xl text-white shadow-xl shadow-indigo-100 relative"
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
                              <ShieldCheck className="w-3 h-3" />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-100">Instructor Response</span>
                          </div>
                          <p className="font-bold text-sm leading-relaxed">{inquiry.response}</p>
                          <div className="absolute -left-2 top-4 w-4 h-4 bg-indigo-600 rotate-45 shadow-[-2px_-2px_0_0_rgba(0,0,0,0.05)]" />
                        </motion.div>
                      ) : isAdmin ? (
                        <div className="space-y-4">
                           {activeResponse?.id === inquiry.id ? (
                              <div className="space-y-4">
                                <textarea 
                                  autoFocus
                                  rows={3}
                                  value={activeResponse.text}
                                  onChange={(e) => setActiveResponse({ ...activeResponse, text: e.target.value })}
                                  placeholder="Type your response to student..."
                                  className="vibrant-input !bg-white"
                                />
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => handleAdminResponse(inquiry.id)}
                                    className="flex-1 bg-emerald-500 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 shadow-lg shadow-emerald-100 transition-all"
                                  >
                                    Send Response
                                  </button>
                                  <button 
                                    onClick={() => setActiveResponse(null)}
                                    className="px-4 bg-slate-100 text-slate-400 rounded-xl text-[10px] font-black uppercase hover:bg-slate-200"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                           ) : (
                             <button 
                               onClick={() => setActiveResponse({ id: inquiry.id, text: '' })}
                               className="w-full py-4 border-2 border-dashed border-indigo-200 text-indigo-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 hover:border-indigo-400 transition-all flex items-center justify-center gap-2"
                             >
                               <Send className="w-4 h-4" />
                               Answer Student
                             </button>
                           )}
                        </div>
                      ) : (
                        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-3">
                           <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                           <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Waiting for response...</p>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
