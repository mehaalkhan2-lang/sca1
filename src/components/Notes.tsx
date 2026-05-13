import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { FileText, Download, Clock, Info, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';
import { downloadFile } from '../lib/downloadUtils';

interface Note {
  id: string;
  title: string;
  description?: string;
  chapter?: string;
  pdfUrl: string;
  classLevel: string;
  subject: string;
  date: any;
}

export default function Notes({ role }: { role: string | null }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState('All');
  const [filterSubject, setFilterSubject] = useState('All');

  useEffect(() => {
    const q = query(collection(db, 'notes'), orderBy('date', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Note[];
      setNotes(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notes');
    });

    return () => unsubscribe();
  }, []);

  const filteredNotes = notes.filter(note => {
    const matchesClass = filterClass === 'All' || note.classLevel === filterClass;
    const matchesSubject = filterSubject === 'All' || note.subject === filterSubject;
    return matchesClass && matchesSubject;
  });

  const groupedNotes = filteredNotes.reduce((acc, note) => {
    const chapter = note.chapter || 'General Resources';
    if (!acc[chapter]) acc[chapter] = [];
    acc[chapter].push(note);
    return acc;
  }, {} as Record<string, Note[]>);

  const chapters = Object.keys(groupedNotes).sort();

  if (loading) {
    return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-48 bg-slate-200 rounded-2xl animate-pulse" />)}
    </div>;
  }

  return (
    <div>
      <header className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <h1 className="text-4xl vibrant-heading mb-2">Study Resources</h1>
          <p className="text-slate-500 font-medium">Download PDF notes and materials provided by instructors.</p>
        </div>
        
        <div className="flex flex-wrap gap-4 items-center">
          <select 
            value={filterClass} 
            onChange={(e) => setFilterClass(e.target.value)}
            className="vibrant-input !w-auto !py-2 !px-4 !text-xs !rounded-xl cursor-pointer bg-white"
          >
            <option value="All">All Classes</option>
            <option value="9th">9th Class</option>
            <option value="10th">10th Class</option>
            <option value="11th">11th Class</option>
            <option value="12th">12th Class</option>
          </select>

          <select 
            value={filterSubject} 
            onChange={(e) => setFilterSubject(e.target.value)}
            className="vibrant-input !w-auto !py-2 !px-4 !text-xs !rounded-xl cursor-pointer bg-white"
          >
            <option value="All">All Subjects</option>
            <option value="Physics">Physics</option>
            <option value="Biology">Biology</option>
            <option value="Chemistry">Chemistry</option>
            <option value="Maths">Maths</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </header>

      {filteredNotes.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[32px] border-2 border-dashed border-indigo-100 flex flex-col items-center gap-4">
          <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-4xl">🔍</div>
          <p className="text-slate-500 font-bold">No results found for your filters.</p>
          <button 
            onClick={() => { setFilterClass('All'); setFilterSubject('All'); }}
            className="text-brand-primary font-black text-xs uppercase tracking-widest hover:underline"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="space-y-16">
          {chapters.map((chapterName) => (
            <div key={chapterName} className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-100" />
                <h2 className="text-base font-black text-slate-400 uppercase tracking-[0.3em] px-4 whitespace-nowrap bg-slate-50 rounded-full py-1">
                  {chapterName}
                </h2>
                <div className="h-px flex-1 bg-slate-100" />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {groupedNotes[chapterName].map((note, index) => (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    key={note.id}
                    className="vibrant-card !p-0 overflow-hidden flex flex-col group border-t-4 border-t-indigo-500"
                    id={`note-${note.id}`}
                  >
                    <div className="p-8 pb-0">
                      <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-brand-primary group-hover:text-white transition-all text-brand-primary shadow-inner">
                        <FileText className="w-8 h-8" />
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                         <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded text-[9px] font-black uppercase">
                           {note.classLevel || '9th'}
                         </span>
                         <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px] font-black uppercase">
                           {note.subject || 'Docs'}
                         </span>
                      </div>

                      <h3 className="text-lg font-black text-slate-800 mb-2 line-clamp-2 min-h-[3.5rem] tracking-tight">{note.title}</h3>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-6 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {note.date?.toDate ? note.date.toDate().toLocaleDateString() : 'Recent Update'}
                      </p>
                    </div>
                    
                    <div className="mt-auto p-6 pt-0 space-y-3">
                      <button 
                        onClick={() => downloadFile(note.pdfUrl, `${note.title.replace(/\s+/g, '_')}.pdf`)}
                        className="w-full bg-brand-primary text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center transition-all border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1 shadow-md"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                      </button>
                      <a 
                        href={note.pdfUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-full bg-slate-100 text-slate-500 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center transition-all hover:bg-slate-200"
                      >
                        <ExternalLink className="w-3 h-3 mr-2" />
                        Open in Tab
                      </a>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
