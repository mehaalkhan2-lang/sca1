import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { PlayCircle, Clock, User, ExternalLink, Download, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';
import { downloadFile } from '../lib/downloadUtils';

interface Lecture {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  date: any;
  teacher?: string;
  classLevel: string;
  subject: string;
  boardImageUrl?: string;
  whiteboardImageUrl?: string;
}

export default function Lectures({ role }: { role: string | null }) {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState('All');
  const [filterSubject, setFilterSubject] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'lectures'), orderBy('date', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Lecture[];
      setLectures(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'lectures');
    });

    return () => unsubscribe();
  }, []);

  const filteredLectures = lectures.filter(l => {
    const classMatch = filterClass === 'All' || l.classLevel === filterClass;
    const subjectMatch = filterSubject === 'All' || l.subject === filterSubject;
    const searchMatch = l.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                       (l.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    return classMatch && subjectMatch && searchMatch;
  });

  if (loading) {
    return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
      {[1, 2, 3].map(i => <div key={i} className="h-64 bg-slate-200 rounded-2xl" />)}
    </div>;
  }

  return (
    <div>
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl vibrant-heading mb-2">Academic Topics</h1>
          <p className="text-slate-500 font-medium">Browse by subject and class level.</p>
        </div>
        
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search topics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="vibrant-input pl-10 !py-2 text-xs"
            />
          </div>

          <select 
            value={filterClass} 
            onChange={(e) => setFilterClass(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:ring-2 focus:ring-brand-primary/20 outline-none cursor-pointer"
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
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:ring-2 focus:ring-brand-primary/20 outline-none cursor-pointer"
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

      {filteredLectures.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[32px] border-2 border-dashed border-indigo-100 flex flex-col items-center gap-4">
          <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-4xl">📚</div>
          <p className="text-slate-500 font-bold">No topics found for these filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredLectures.map((lecture, index) => {
            const displayImage = lecture.whiteboardImageUrl || lecture.boardImageUrl;
            return (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                key={lecture.id}
                className="vibrant-card !p-0 overflow-hidden group"
                id={`lecture-${lecture.id}`}
              >
                <div className="aspect-video bg-slate-100 relative overflow-hidden bg-brand-secondary">
                  {displayImage ? (
                     <img 
                      src={displayImage} 
                      alt="Whiteboard View"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 cursor-pointer"
                      referrerPolicy="no-referrer"
                      onClick={() => setSelectedImage(displayImage)}
                    />
                  ) : lecture.videoUrl ? (
                    <img 
                      src={`https://img.youtube.com/vi/${getYouTubeID(lecture.videoUrl)}/maxresdefault.jpg`} 
                      alt={lecture.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                      onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&q=80'; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl opacity-20">📖</div>
                  )}
                  
                  <div className="absolute inset-0 bg-indigo-900/10 group-hover:bg-indigo-900/40 transition-colors flex items-center justify-center">
                    {lecture.videoUrl ? (
                      <div className="w-16 h-16 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-2xl opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
                        <PlayCircle className="w-10 h-10 text-brand-primary" />
                      </div>
                    ) : displayImage ? (
                      <div className="w-16 h-16 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-2xl opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 pointer-events-none">
                        <PlayCircle className="w-12 h-12 text-brand-primary opacity-20" />
                        <Search className="w-8 h-8 text-brand-primary absolute" />
                      </div>
                    ) : null}
                  </div>
                </div>
                
                <div className="p-8">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-3 py-1 bg-brand-primary text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md">
                      {lecture.classLevel}
                    </span>
                    <span className="px-3 py-1 bg-amber-400 text-amber-950 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm">
                      {lecture.subject}
                    </span>
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-black uppercase tracking-widest">
                      {lecture.date?.toDate ? lecture.date.toDate().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Today'}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-slate-800 mb-3 line-clamp-1">
                    <span className="text-brand-primary block text-xs uppercase tracking-tighter mb-1">Topic:</span>
                    {lecture.title}
                  </h3>
                  
                  <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center text-xs font-bold text-indigo-600">
                        {lecture.teacher?.charAt(0) || 'S'}
                      </div>
                      <span className="text-xs font-bold text-slate-400">{lecture.teacher || 'SCA Faculty'}</span>
                    </div>
                    
                    <div className="flex gap-2">
                      {lecture.videoUrl && (
                        <a 
                          href={lecture.videoUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="vibrant-button !py-2 !px-4 !text-xs"
                        >
                          Watch
                        </a>
                      )}
                      {displayImage && (
                      <button 
                        onClick={() => setSelectedImage(displayImage)}
                        className="vibrant-button !py-2 !px-4 !text-xs bg-emerald-600 shadow-emerald-100"
                      >
                        Whiteboard
                      </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 md:p-10"
          onClick={() => setSelectedImage(null)}
        >
          <button 
            className="absolute top-10 right-10 text-white/50 hover:text-white transition-colors"
            onClick={() => setSelectedImage(null)}
          >
            <Clock className="w-10 h-10 rotate-45" />
          </button>
          
          <motion.img 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            src={selectedImage} 
            alt="Board Full View"
            className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl border border-white/10 object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          
          <div className="mt-8 flex gap-4">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                downloadFile(selectedImage, 'whiteboard_photo.jpg');
              }}
              className="px-8 py-3 bg-white text-slate-900 rounded-full font-black text-sm hover:bg-brand-primary hover:text-white transition-all flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              Download Photo
            </button>
            <button 
              onClick={() => setSelectedImage(null)}
              className="px-8 py-3 bg-white/10 text-white rounded-full font-black text-sm hover:bg-white/20 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function getYouTubeID(url: string) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}
