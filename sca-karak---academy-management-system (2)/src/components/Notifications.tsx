import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Bell, Info, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';

interface Notification {
  id: string;
  title: string;
  message: string;
  date: any;
  type?: 'news' | 'alert' | 'update';
}

export default function Notifications({ role }: { role: string | null }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'notifications'), orderBy('date', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      setNotifications(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });

    return () => unsubscribe();
  }, []);

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case 'alert': return <AlertTriangle className="w-5 h-5 text-rose-500" />;
      case 'update': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      default: return <Info className="w-5 h-5 text-brand-primary" />;
    }
  };

  const getTypeStyles = (type?: string) => {
    switch (type) {
      case 'alert': return 'border-rose-100 bg-rose-50/30';
      case 'update': return 'border-emerald-100 bg-emerald-50/30';
      default: return 'border-indigo-100 bg-indigo-50/30';
    }
  };

  if (loading) {
    return <div className="space-y-4">
      {[1, 2].map(i => <div key={i} className="h-24 bg-slate-200 rounded-2xl animate-pulse" />)}
    </div>;
  }

  return (
    <div>
      <header className="mb-10">
        <h1 className="text-4xl vibrant-heading mb-2">Campus Notifications</h1>
        <p className="text-slate-500 font-medium">Daily announcements, schedule changes, and urgent campus alerts.</p>
      </header>

      {notifications.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[32px] border-2 border-dashed border-indigo-100 flex flex-col items-center gap-4">
          <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center text-4xl">📢</div>
          <p className="text-slate-500 font-bold">No active notifications.</p>
        </div>
      ) : (
        <div className="max-w-4xl space-y-8">
          {notifications.map((notif, index) => (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              key={notif.id}
              className={`vibrant-card !p-8 border-l-[12px] ${
                notif.type === 'alert' ? 'border-l-rose-500 bg-rose-50/20' : 
                notif.type === 'update' ? 'border-l-emerald-500 bg-emerald-50/20' : 
                'border-l-brand-primary bg-indigo-50/20'
              }`}
              id={`notif-${notif.id}`}
            >
              <div className="flex gap-8">
                <div className="hidden sm:flex w-16 h-16 bg-white rounded-2xl items-center justify-center shadow-md flex-shrink-0">
                  {getTypeIcon(notif.type)}
                </div>
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">{notif.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-white border border-slate-100 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center shadow-sm">
                        <Clock className="w-3 h-3 mr-1" />
                        {notif.date?.toDate ? notif.date.toDate().toLocaleDateString() : 'Just Now'}
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-600 font-medium leading-relaxed text-lg">{notif.message}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
