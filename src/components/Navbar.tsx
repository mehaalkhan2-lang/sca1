import React from 'react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { LogOut, BookOpen, GraduationCap, FileText, Bell, LayoutDashboard, Download, Laptop, Smartphone, HelpCircle, ShieldCheck, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NavbarProps {
  user: any;
  role: 'admin' | 'student' | null;
  activeSection: string;
  setActiveSection: (section: string) => void;
  onInstallClick: () => void;
  showInstallButton: boolean;
  badges?: Record<string, number>;
}

export default function Navbar({ user, role, activeSection, setActiveSection, onInstallClick, showInstallButton, badges = {} }: NavbarProps) {
  const [clickCount, setClickCount] = React.useState(0);
  const [showInstallHelp, setShowInstallHelp] = React.useState(false);
  const navItems = [
    { id: 'lectures', label: 'Topics', icon: BookOpen, emoji: '🎥' },
    { id: 'results', label: 'Results', icon: GraduationCap, emoji: '📝' },
    { id: 'notes', label: 'Notes', icon: FileText, emoji: '📚' },
    { id: 'quizzes', label: 'Practice', icon: ShieldCheck, emoji: '🏆' },
    { id: 'helpdesk', label: 'Help', icon: MessageSquare, emoji: '💬' },
    { id: 'notifications', label: 'Updates', icon: Bell, emoji: '🔔' },
  ];

  if (role === 'admin') {
    navItems.push({ id: 'admin', label: 'Admin', icon: LayoutDashboard, emoji: '📊' });
  }

  const handleLogoClick = () => {
    setClickCount(prev => prev + 1);
    if (clickCount >= 4) {
      setActiveSection('admin');
      setClickCount(0);
    }
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 md:hidden py-2 px-4 z-50">
        <AnimatePresence>
          {showInstallButton ? (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="px-4 mb-2"
            >
              <button
                onClick={onInstallClick}
                className="w-full bg-brand-primary text-white py-3 rounded-2xl flex items-center justify-center gap-3 font-black text-sm shadow-lg border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1 transition-all"
              >
                <Download className="w-5 h-5" />
                <span>📥 INSTALL APP</span>
              </button>
            </motion.div>
          ) : (
             <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-4 mb-2"
            >
              <button
                onClick={() => setShowInstallHelp(true)}
                className="w-full bg-slate-800 text-white py-3 rounded-2xl flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest shadow-lg"
              >
                <Smartphone className="w-4 h-4" />
                <span>Get App for Mobile</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex justify-around items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`flex flex-col items-center space-y-1 px-3 py-1 rounded-lg transition-all relative ${
                  isActive ? 'text-brand-primary' : 'text-slate-500'
                }`}
              >
                <div className={`p-2 rounded-xl ${isActive ? 'bg-indigo-50' : ''}`}>
                  <Icon className="w-5 h-5" />
                  {badges[item.id] > 0 && (
                    <span className="absolute top-1 right-2 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center ring-2 ring-white">
                      {badges[item.id]}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold">{item.label}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-1 text-center md:hidden">
          <p className="text-[7px] font-black text-slate-300 uppercase tracking-[0.3em]">X.4.MV</p>
        </div>
      </nav>

      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-72 bg-brand-secondary flex-col text-white shadow-2xl z-50">
        <div className="p-8">
          <div className="flex items-center gap-3 select-none cursor-default" onClick={handleLogoClick}>
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-inner group">
              <GraduationCap className="w-8 h-8 text-brand-primary group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <h1 className="font-black text-xl leading-tight tracking-tight">SCA KARAK</h1>
              <p className="text-xs text-indigo-300 uppercase font-bold tracking-widest">Science Academy</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {showInstallButton ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6"
              >
                <button
                  onClick={onInstallClick}
                  className="sidebar-item bg-indigo-500/20 text-indigo-100 hover:bg-indigo-500/30 border border-indigo-400/30 w-full"
                >
                  <Download className="w-5 h-5 text-indigo-400" />
                  <span className="font-bold">Install Portal</span>
                </button>
              </motion.div>
          ) : (
            <div className="mb-6">
               <button
                  onClick={() => setShowInstallHelp(true)}
                  className="sidebar-item bg-white/5 text-indigo-200 hover:bg-white/10 border border-white/10 w-full"
                >
                  <Laptop className="w-5 h-5 text-indigo-300" />
                  <span className="font-bold">Download Portal</span>
                </button>
            </div>
          )}
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`sidebar-item relative ${isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'}`}
              >
                <span className="text-xl">{item.emoji}</span>
                <span className="font-bold flex-1">{item.label}</span>
                {badges[item.id] > 0 && (
                   <span className="bg-white/20 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                     {badges[item.id]}
                   </span>
                )}
              </div>
            );
          })}
        </nav>

        {user && (
          <div className="p-6 mt-auto">
            <div className="bg-brand-accent p-4 rounded-2xl text-amber-950 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 font-black bg-white/20 rounded-full flex items-center justify-center">
                  {(user?.displayName || 'U').charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-black uppercase leading-none mb-1">
                    {role === 'admin' ? 'Admin Access' : 'Student Account'}
                  </p>
                  <p className="text-sm font-bold truncate max-w-[120px]">
                    {user?.displayName || 'Active User'}
                  </p>
                  {role === 'admin' && user?.email && (
                    <p className="text-[9px] font-bold opacity-60 truncate max-w-[120px]">{user.email}</p>
                  )}
                </div>
              </div>
              <button 
                onClick={() => signOut(auth)}
                className="mt-2 w-full flex items-center justify-center gap-2 bg-amber-950/10 hover:bg-amber-950/20 py-2 rounded-xl transition-colors font-black text-xs uppercase"
              >
                <LogOut className="w-3 h-3" />
                Sign Out
              </button>
            </div>
            <div className="mt-8 text-center">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest opacity-30 select-none">
                Created by X.4.MV
              </p>
            </div>
          </div>
        )}
        {!user && (
          <div className="p-6 mt-auto space-y-4">
             <button 
                onClick={() => setShowInstallHelp(true)}
                className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 py-3 rounded-xl transition-colors font-black text-[10px] uppercase tracking-widest text-indigo-300"
             >
                <Download className="w-3 h-3" />
                Mobile App
             </button>
             <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest text-center opacity-30 select-none" onClick={handleLogoClick}>
               Academic Portal Access • X.4.MV
             </p>
          </div>
        )}
      </aside>

      <AnimatePresence>
        {showInstallHelp && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-brand-secondary/90 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-white rounded-[40px] p-8 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowInstallHelp(false)}
                className="absolute top-6 right-6 w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-black text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>

              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Smartphone className="w-10 h-10 text-brand-primary" />
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">Install SCA Karak</h2>
                <p className="text-slate-500 font-medium text-sm">Add to your home screen for quick daily access.</p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-xs font-black text-slate-400 uppercase mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 bg-indigo-500 text-white rounded-full flex items-center justify-center text-[10px]">1</span>
                    Android / Chrome
                  </p>
                  <p className="text-sm font-bold text-slate-700">Tap the browser menu (⋮) and select "Add to Home screen" or "Install app".</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-xs font-black text-slate-400 uppercase mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 bg-indigo-500 text-white rounded-full flex items-center justify-center text-[10px]">2</span>
                    iPhone / Safari
                  </p>
                  <p className="text-sm font-bold text-slate-700">Tap the Share button (󰦵) and select "Add to Home Screen".</p>
                </div>
              </div>

              <button 
                onClick={() => setShowInstallHelp(false)}
                className="vibrant-button w-full py-4 !text-sm"
              >
                Got it!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
