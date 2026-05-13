import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Award, Search, User, Calendar, BookOpen, ChevronRight, Download, Printer } from 'lucide-react';
import { motion } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';

interface Result {
  id: string;
  studentName: string;
  studentEmail: string;
  marks: number;
  totalMarks: number;
  date: any;
  classLevel: string;
}

export default function Results({ user, role, userProfile }: { user: any, role: string | null, userProfile: any }) {
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [lookupName, setLookupName] = useState('');
  const [lookupClass, setLookupClass] = useState('9th');
  const [filterClass, setFilterClass] = useState(userProfile?.classLevel || 'All');
  const [viewMode, setViewMode] = useState<'personal' | 'leaderboard'>('personal');

  useEffect(() => {
    if (role === 'admin') setViewMode('leaderboard');
  }, [role]);

  useEffect(() => {
    const q = query(collection(db, 'results'), orderBy('date', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Result[];
      setResults(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'results');
    });

    return () => unsubscribe();
  }, []);

  const handlePrint = (id: string) => {
    window.print();
  };

  const filteredResults = results.filter(result => {
    const matchesSearch = result.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          result.studentEmail.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesClass = filterClass === 'All' || result.classLevel === filterClass;
    
    // Personal lookup via name and class
    const isPersonal = lookupName.trim() && 
                      result.studentName.toLowerCase().includes(lookupName.toLowerCase().trim()) && 
                      result.classLevel === lookupClass;
    
    if (role === 'admin') return matchesSearch && matchesClass;
    if (viewMode === 'personal') return isPersonal && matchesClass;
    return false;  }).sort((a, b) => {
    const aPerc = (a.marks / a.totalMarks);
    const bPerc = (b.marks / b.totalMarks);
    return bPerc - aPerc;
  });

  if (loading) {
    return <div className="space-y-4">
      {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-200 rounded-2xl animate-pulse" />)}
    </div>;
  }

  return (
    <div>
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl vibrant-heading mb-2">Academic Performance</h1>
          <p className="text-slate-500 font-medium tracking-tight">Track progress and compete for top positions.</p>
        </div>
        
        <div className="flex flex-wrap gap-4 items-center">
          {role === 'admin' && (
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button 
                onClick={() => setViewMode('personal')}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${viewMode === 'personal' ? 'bg-white shadow-sm text-brand-primary' : 'text-slate-500'}`}
              >
                My Marks
              </button>
              <button 
                onClick={() => setViewMode('leaderboard')}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${viewMode === 'leaderboard' ? 'bg-white shadow-sm text-brand-primary' : 'text-slate-500'}`}
              >
                Board
              </button>
            </div>
          )}

          <select 
            value={filterClass} 
            onChange={(e) => setFilterClass(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none cursor-pointer"
          >
            <option value="All">All Classes</option>
            <option value="9th">9th Class</option>
            <option value="10th">10th Class</option>
            <option value="11th">11th Class</option>
            <option value="12th">12th Class</option>
          </select>

          {role === 'admin' && (
            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search name/email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="vibrant-input pl-12 !py-2"
              />
            </div>
          )}
        </div>
      </header>

      {viewMode === 'personal' && !user && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-6 bg-white rounded-3xl shadow-xl border-2 border-indigo-50"
        >
          <div className="flex flex-col md:flex-row items-center gap-6">
             <div className="shrink-0 w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                <Search className="w-6 h-6 text-brand-primary" />
             </div>
             <div className="flex-1 w-full space-y-4 md:space-y-0 md:flex md:gap-4">
                <div className="flex-1">
                  <p className="text-xs font-black uppercase text-slate-400 tracking-widest mb-1">Student Name</p>
                  <input 
                    type="text"
                    placeholder="Enter your full name..."
                    value={lookupName}
                    onChange={(e) => setLookupName(e.target.value)}
                    className="vibrant-input !py-2 !text-sm"
                  />
                </div>
                <div className="md:w-48">
                  <p className="text-xs font-black uppercase text-slate-400 tracking-widest mb-1">Select Class</p>
                  <select 
                    value={lookupClass}
                    onChange={(e) => setLookupClass(e.target.value)}
                    className="vibrant-input !py-2 !text-sm cursor-pointer"
                  >
                    <option value="9th">9th Class</option>
                    <option value="10th">10th Class</option>
                    <option value="11th">11th Class</option>
                    <option value="12th">12th Class</option>
                  </select>
                </div>
             </div>
          </div>
        </motion.div>
      )}

      {filteredResults.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[32px] border-2 border-dashed border-indigo-100 flex flex-col items-center gap-4">
          <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center text-4xl">🏆</div>
          <p className="text-slate-500 font-bold">No results found for this view.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredResults.map((result, index) => {
            const percentage = Math.round((result.marks / result.totalMarks) * 100);
            const statusColor = percentage >= 80 ? 'text-emerald-500' : percentage >= 50 ? 'text-brand-primary' : 'text-rose-500';
            const statusBg = percentage >= 80 ? 'bg-emerald-50' : percentage >= 50 ? 'bg-indigo-50' : 'bg-rose-50';
            const isTop3 = index < 3 && (viewMode === 'leaderboard' || role === 'admin');

            return (
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                key={result.id}
                className={`vibrant-card flex flex-col md:flex-row md:items-center justify-between gap-6 group relative overflow-hidden ${isTop3 ? 'border-2 border-amber-300 bg-amber-50/10' : ''}`}
                id={`result-${result.id}`}
              >
                {isTop3 && (
                   <div className="absolute top-0 right-0 px-6 py-2 bg-amber-400 text-amber-950 font-black text-xs uppercase tracking-widest rounded-bl-3xl shadow-lg">
                      {index === 0 ? '👑 1st Rank' : index === 1 ? '🥇 2nd Rank' : '🥈 3rd Rank'}
                   </div>
                )}

                <div className="flex items-center space-x-6">
                  <div className={`w-20 h-20 ${statusBg} rounded-3xl flex flex-col items-center justify-center border-4 border-white shadow-lg shrink-0`}>
                    <span className={`text-2xl font-black ${statusColor}`}>{percentage}%</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-2xl font-black text-slate-800">{result.studentName}</h3>
                      <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-black uppercase tracking-widest">
                        {result.classLevel}
                      </span>
                    </div>
                    <div className="flex items-center space-x-6 text-sm text-slate-400 font-bold">
                      <div className="flex items-center">
                        <Award className="w-4 h-4 mr-2" />
                        {result.marks} / {result.totalMarks} Score
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                   {viewMode === 'personal' && (
                      <button 
                        onClick={() => handlePrint(result.id)}
                        className="p-3 bg-indigo-50 text-brand-primary rounded-xl hover:bg-brand-primary hover:text-white transition-all shadow-sm flex items-center gap-2"
                        title="Print Result"
                      >
                        <Printer className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Print</span>
                      </button>
                   )}
                   <div className="hidden lg:block w-48 h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-50 shadow-inner">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        className={`h-full ${percentage >= 80 ? 'bg-emerald-400' : percentage >= 50 ? 'bg-brand-primary' : 'bg-rose-400'}`} 
                      />
                   </div>
                   <div className="flex items-center gap-2 text-slate-300 font-black text-xl italic opacity-50">
                      #{index + 1}
                   </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
