import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { ShieldCheck, Trophy, Clock, CheckCircle2, AlertCircle, ChevronRight, Play, Info, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
}

interface Quiz {
  id: string;
  title: string;
  classLevel: string;
  subject: string;
  createdAt: any;
}

interface QuizAttempt {
  id: string;
  quizId: string;
  quizTitle: string;
  userId: string;
  userName: string;
  score: number;
  totalQuestions: number;
  completedAt: any;
}

interface QuizzesProps {
  user: User | null;
}

export default function Quizzes({ user }: QuizzesProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [quizFinished, setQuizFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'quizzes'), orderBy('createdAt', 'desc'));
    const unsubscribeQuizzes = onSnapshot(q, (snapshot) => {
      setQuizzes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Quiz[]);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'quizzes'));

    if (user) {
      const aq = query(collection(db, 'quiz_attempts'), orderBy('completedAt', 'desc'));
      const unsubscribeAttempts = onSnapshot(aq, (snapshot) => {
        setAttempts(snapshot.docs.filter(doc => doc.data().userId === user.uid).map(doc => ({ id: doc.id, ...doc.data() })) as QuizAttempt[]);
      });
      return () => {
        unsubscribeQuizzes();
        unsubscribeAttempts();
      };
    }

    return () => unsubscribeQuizzes();
  }, [user]);

  const startQuiz = async (quiz: Quiz) => {
    setLoading(true);
    setErrorStatus(null);
    try {
      const qSnapshot = await getDocs(collection(db, 'quizzes', quiz.id, 'questions'));
      const quizQuestions = qSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Question[];
      
      if (quizQuestions.length === 0) {
        setErrorStatus('This practice test has no questions yet. Please check back later.');
        setLoading(false);
        return;
      }

      setQuestions(quizQuestions);
      setActiveQuiz(quiz);
      setCurrentQuestionIdx(0);
      setSelectedAnswers(new Array(quizQuestions.length).fill(-1));
      setQuizFinished(false);
    } catch (error) {
      console.error("Error starting quiz:", error);
      setErrorStatus('Unable to open the test. Please check your internet connection or try logging in again.');
      // handleFirestoreError(error, OperationType.LIST, `quizzes/${quiz.id}/questions`);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (optionIdx: number) => {
    const updated = [...selectedAnswers];
    updated[currentQuestionIdx] = optionIdx;
    setSelectedAnswers(updated);
  };

  const nextQuestion = () => {
    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    setQuizFinished(true);
    setSubmitting(true);

    const score = selectedAnswers.reduce((acc, ans, idx) => {
      return acc + (ans === questions[idx].correctAnswerIndex ? 1 : 0);
    }, 0);

    if (user && activeQuiz) {
      try {
        await addDoc(collection(db, 'quiz_attempts'), {
          quizId: activeQuiz.id,
          quizTitle: activeQuiz.title,
          userId: user.uid,
          userName: user.displayName || 'Student',
          score,
          totalQuestions: questions.length,
          completedAt: serverTimestamp()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'quiz_attempts');
      }
    }
    setSubmitting(false);
  };

  if (loading && !activeQuiz) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-brand-primary animate-spin" />
        <p className="text-sm font-black text-slate-400 uppercase tracking-widest animate-pulse">Preparing Practice Portal...</p>
      </div>
    );
  }

  if (errorStatus && !activeQuiz) {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
           <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-black text-slate-800 mb-2">Test Entry Blocked</h3>
        <p className="text-slate-500 font-medium mb-8 leading-relaxed">{errorStatus}</p>
        <button 
          onClick={() => setErrorStatus(null)}
          className="vibrant-button w-full py-4 !rounded-2xl"
        >
          Back to List
        </button>
      </div>
    );
  }

  if (activeQuiz && !quizFinished) {
    const currentQuestion = questions[currentQuestionIdx];
    return (
      <div className="max-w-2xl mx-auto py-10">
        <div className="mb-8 flex items-center justify-between">
          <button onClick={() => setActiveQuiz(null)} className="text-xs font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600">Close Test</button>
          <div className="px-4 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">
            {currentQuestionIdx + 1} of {questions.length} Questions
          </div>
        </div>

        <motion.div 
          key={currentQuestionIdx}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="vibrant-card !p-10"
        >
          <h2 className="text-2xl font-black text-slate-800 mb-8 tracking-tight">{currentQuestion.question}</h2>
          
          <div className="space-y-4">
            {currentQuestion.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswerSelect(idx)}
                className={`w-full p-6 rounded-2xl text-left font-bold transition-all border-2 flex items-center justify-between group ${
                  selectedAnswers[currentQuestionIdx] === idx 
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-100' 
                  : 'bg-white text-slate-700 border-slate-100 hover:border-indigo-300'
                }`}
              >
                <span className="flex items-center">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center mr-4 text-xs font-black border ${
                    selectedAnswers[currentQuestionIdx] === idx ? 'bg-white/20 border-white/30' : 'bg-slate-50 border-slate-100'
                  }`}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  {option}
                </span>
                {selectedAnswers[currentQuestionIdx] === idx && <div className="w-2 h-2 bg-white rounded-full animate-pulse" />}
              </button>
            ))}
          </div>

          <div className="mt-10 flex justify-end">
            <button
              disabled={selectedAnswers[currentQuestionIdx] === -1}
              onClick={nextQuestion}
              className="vibrant-button !px-10 py-4 !rounded-2xl flex items-center gap-2 group disabled:opacity-30 disabled:grayscale"
            >
              {currentQuestionIdx === questions.length - 1 ? 'Finish Test' : 'Next Question'}
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (activeQuiz && quizFinished) {
    const score = selectedAnswers.reduce((acc, ans, idx) => acc + (ans === questions[idx].correctAnswerIndex ? 1 : 0), 0);
    const percentage = Math.round((score / questions.length) * 100);

    return (
      <div className="max-w-xl mx-auto py-10 text-center">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="vibrant-card !p-12">
          <div className="w-24 h-24 bg-amber-100 text-amber-600 rounded-[32px] flex items-center justify-center mx-auto mb-8 text-4xl shadow-inner border-2 border-amber-50">
            <Trophy className="w-12 h-12" />
          </div>
          <h2 className="text-4xl font-black text-slate-800 mb-2">Quiz Completed!</h2>
          <p className="text-slate-500 font-bold mb-8 italic">Your practice results are ready.</p>
          
          <div className="grid grid-cols-2 gap-4 mb-10">
            <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Total Score</p>
              <p className="text-3xl font-black text-indigo-600">{score} / {questions.length}</p>
            </div>
            <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Percentage</p>
              <p className="text-3xl font-black text-emerald-600">{percentage}%</p>
            </div>
          </div>

          <button 
            onClick={() => setActiveQuiz(null)}
            className="vibrant-button w-full py-5 !rounded-[24px]"
          >
            Return to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-12">
        <h1 className="text-4xl vibrant-heading mb-2">Practice Quizzes</h1>
        <p className="text-slate-500 font-medium italic">Test your knowledge with chapter-wise MCQs.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
               <ShieldCheck className="w-6 h-6 text-indigo-600" />
               Available Tests
            </h2>
            <span className="px-3 py-1 bg-slate-100 text-slate-400 rounded-full text-[10px] font-black uppercase">{quizzes.length} Total</span>
          </div>

          {quizzes.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
              <p className="text-slate-400 font-bold">No quizzes published yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {quizzes.map((quiz) => (
                <motion.div 
                  whileHover={{ y: -5 }}
                  key={quiz.id} 
                  className="vibrant-card !p-8 group cursor-pointer border-t-8 border-t-brand-primary"
                  onClick={() => startQuiz(quiz)}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                       {quiz.classLevel} Class
                    </div>
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                      <Play className="w-5 h-5 fill-current" />
                    </div>
                  </div>
                  <h3 className="text-xl font-black text-slate-800 mb-2 truncate leading-tight">{quiz.title}</h3>
                  <div className="text-xs text-amber-600 font-black uppercase tracking-widest mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                      {quiz.subject}
                    </div>
                    <div className="text-slate-400">
                      {(quiz as any).questionCount || 0} Questions
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div className="flex items-center text-[10px] text-slate-400 font-black uppercase tracking-widest">
                      <Clock className="w-3 h-3 mr-1" />
                      {quiz.createdAt?.toDate ? quiz.createdAt.toDate().toLocaleDateString() : 'Just Post'}
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); startQuiz(quiz); }}
                      className="text-[10px] font-black text-brand-primary uppercase tracking-widest group-hover:underline"
                    >
                      Start Test
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2 mb-2">
             <Trophy className="w-6 h-6 text-amber-500" />
             My Test History
          </h2>
          
          <div className="vibrant-card !p-6 !bg-brand-secondary text-white border-none shadow-xl">
             <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {attempts.length === 0 ? (
                  <p className="text-white/40 font-bold text-center py-10 italic">No tests attempted yet.</p>
                ) : (
                  attempts.map((attempt) => (
                    <div key={attempt.id} className="p-4 bg-white/10 rounded-2xl border border-white/10 flex flex-col gap-2">
                       <div className="flex justify-between items-start">
                          <h4 className="text-sm font-black text-white truncate w-32">{attempt.quizTitle}</h4>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                            (attempt.score / attempt.totalQuestions) >= 0.5 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                          }`}>
                            {Math.round((attempt.score / attempt.totalQuestions) * 100)}%
                          </span>
                       </div>
                       <div className="flex items-center justify-between text-[10px] font-bold text-white/50">
                          <div className="flex items-center">
                            <CheckCircle2 className="w-3 h-3 mr-1 text-white/30" />
                            {attempt.score} / {attempt.totalQuestions} Marks
                          </div>
                          <span>{attempt.completedAt?.toDate ? attempt.completedAt.toDate().toLocaleDateString() : 'Now'}</span>
                       </div>
                    </div>
                  ))
                )}
             </div>
          </div>
          
          <div className="p-6 bg-brand-accent rounded-3xl text-amber-950">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                <Info className="w-5 h-5" />
              </div>
              <h3 className="font-black">Improvement Tip</h3>
            </div>
            <p className="text-xs font-bold leading-relaxed opacity-80">
              Taking practice tests regularly helps you identify your weak chapters. Re-watch the daily topic lectures for chapters where your score is below 50%.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
