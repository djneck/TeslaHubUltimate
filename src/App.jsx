import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc,
  addDoc, 
  onSnapshot, 
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Play, 
  Gamepad2, 
  Music, 
  Plus, 
  Trash2, 
  Settings, 
  Globe, 
  Save,
  Loader2,
  Maximize,
  Search,
  Zap,
  MessageSquare,
  Coffee,
  Monitor,
  Edit2,
  X,
  Send,
  ArrowRight,
  CheckCircle2,
  Car,
  Sparkles,
  Navigation,
  Cloud,
  Briefcase,
  StickyNote,
  MapPin,
  Star,
  ChevronLeft,
  ChevronRight,
  History,
  LayoutGrid,
  ExternalLink,
  Cpu,
  ShieldCheck,
  BrainCircuit,
  Command
} from 'lucide-react';
import { SpeedInsights } from "@vercel/speed-insights/react";

// --- CONFIGURATION FIREBASE ---
const safeEnv = (key, fallback = "") => {
  try {
    return (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) || fallback;
  } catch (e) {
    return fallback;
  }
};

const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "",
      authDomain: "media-hub-tesla.firebaseapp.com",
      projectId: "media-hub-tesla",
      storageBucket: "media-hub-tesla.firebasestorage.app",
      messagingSenderId: "1008267221004",
      appId: "1:1008267221004:web:4c66a3a2c1bb0a20f1f629"
    };

const appId = typeof __app_id !== 'undefined' ? __app_id : 'tesla-ultimate-v18-5';
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const THEME_COLORS = [
  { name: 'Tesla Red', hex: '#E82127' },
  { name: 'Cyber Blue', hex: '#00F2FF' },
  { name: 'Acid Green', hex: '#C1FF00' },
  { name: 'Neon Purple', hex: '#BC00FF' },
  { name: 'Solar Orange', hex: '#FF8A00' },
  { name: 'Pink Neon', hex: '#FF007A' },
  { name: 'Ice White', hex: '#FFFFFF' },
  { name: 'Vivid Yellow', hex: '#FFE600' },
  { name: 'Deep Crimson', hex: '#8B0000' },
  { name: 'Mint', hex: '#00FFCC' },
  { name: 'Electric Indigo', hex: '#6600FF' },
  { name: 'Gold', hex: '#D4AF37' },
];

const getIcon = (domain) => `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;

const AI_PROVIDERS = [
  { id: 'grok', name: 'xAI Grok', url: 'https://x.com/i/grok?q=', icon: getIcon('x.com') },
  { id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com/?q=', icon: getIcon('chatgpt.com') },
  { id: 'gemini', name: 'Google Gemini', url: 'https://gemini.google.com/app?q=', icon: getIcon('gemini.google.com') },
  { id: 'claude', name: 'Claude AI', url: 'https://claude.ai/new?q=', icon: getIcon('claude.ai') },
  { id: 'google', name: 'Search', url: 'https://www.google.com/search?q=', icon: getIcon('google.com') },
];

const App = () => {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('home'); 
  const [activeTab, setActiveTab] = useState('streaming');
  const [links, setLinks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [profile, setProfile] = useState({ name: 'Pilote', color: '#E82127', openMode: 'tab' });
  const [homeSearch, setHomeSearch] = useState('');
  const [quickUrl, setQuickUrl] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [selectedAI, setSelectedAI] = useState(AI_PROVIDERS[0]);

  const [editingLink, setEditingLink] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formLink, setFormLink] = useState({ name: '', url: '', category: 'streaming' });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) { console.error(e); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubProfile = onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile'), (d) => {
      if (d.exists()) setProfile(prev => ({ ...prev, ...d.data() }));
    });
    const unsubLinks = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'links'), (s) => {
      setLinks(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubNotes = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'notes'), (s) => {
      setNotes(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    });
    return () => { unsubProfile(); unsubLinks(); unsubNotes(); };
  }, [user]);

  const handleLaunch = (url) => {
    let finalUrl = url.trim();
    if (!finalUrl) return;
    if (!/^https?:\/\//i.test(finalUrl)) finalUrl = 'https://' + finalUrl;
    if (profile.openMode === 'fullscreen') {
      window.location.href = `https://www.youtube.com/redirect?q=${encodeURIComponent(finalUrl)}&html5=1`;
    } else {
      window.open(finalUrl, '_blank');
    }
  };

  const handleSaveLink = async () => {
    if (!user || !formLink.name || !formLink.url) return;
    let url = formLink.url.trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    const domain = new URL(url).hostname;
    const icon = getIcon(domain);
    const data = { ...formLink, url, icon, updatedAt: serverTimestamp() };
    if (editingLink) {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'links', editingLink.id), data, { merge: true });
    } else {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'links'), { ...data, createdAt: serverTimestamp() });
    }
    setFormLink({ name: '', url: '', category: activeTab });
    setEditingLink(null);
    setShowEditModal(false);
  };

  const executeAiPrompt = () => {
    if (!aiPrompt.trim()) return;
    const url = `${selectedAI.url}${encodeURIComponent(aiPrompt)}`;
    handleLaunch(url);
  };

  const categories = [
    { id: 'streaming', label: 'Médias', icon: <Play /> },
    { id: 'music', label: 'Musique', icon: <Music /> },
    { id: 'social', label: 'Social', icon: <MessageSquare /> },
    { id: 'games', label: 'Jeux', icon: <Gamepad2 /> },
    { id: 'travel', label: 'Voyage', icon: <Navigation /> },
    { id: 'food', label: 'Resto', icon: <Coffee /> },
    { id: 'icloud', label: 'iCloud', icon: <Cloud /> },
    { id: 'tools', label: 'Remote', icon: <Monitor /> },
    { id: 'ai', label: 'IA', icon: <Sparkles /> },
    { id: 'tesla', label: 'Tesla', icon: <Car /> },
  ];

  const defaultApps = {
    streaming: [
      { name: 'Netflix', url: 'https://www.netflix.com' },
      { name: 'YouTube', url: 'https://www.youtube.com' },
      { name: 'Disney+', url: 'https://www.disneyplus.com' },
      { name: 'Prime Video', url: 'https://www.primevideo.com' },
      { name: 'OQEE Free', url: 'https://oqee.tv' },
      { name: 'MyCanal', url: 'https://www.canalplus.com' },
      { name: 'Crunchyroll', url: 'https://www.crunchyroll.com' },
      { name: 'Twitch', url: 'https://www.twitch.tv' },
    ],
    music: [
      { name: 'Spotify', url: 'https://open.spotify.com' },
      { name: 'Deezer', url: 'https://www.deezer.com' },
      { name: 'Apple Music', url: 'https://music.apple.com' },
      { name: 'SoundCloud', url: 'https://soundcloud.com' },
      { name: 'Mixcloud', url: 'https://www.mixcloud.com' },
      { name: 'TuneIn', url: 'https://tunein.com' },
    ],
    social: [
      { name: 'WhatsApp', url: 'https://web.whatsapp.com' },
      { name: 'Messenger', url: 'https://www.messenger.com' },
      { name: 'Teams', url: 'https://teams.microsoft.com' },
      { name: 'Discord', url: 'https://discord.com' },
      { name: 'Telegram', url: 'https://web.telegram.org' },
      { name: 'Google Meet', url: 'https://meet.google.com' },
      { name: 'Slack', url: 'https://slack.com' },
    ],
    games: [
      { name: 'Xbox Cloud', url: 'https://www.xbox.com/play' },
      { name: 'GeForce Now', url: 'https://play.geforcenow.com' },
      { name: 'Steam Web', url: 'https://store.steampowered.com' },
      { name: 'Chess.com', url: 'https://www.chess.com' },
      { name: 'Roblox', url: 'https://www.roblox.com' },
      { name: 'Twitch Games', url: 'https://www.twitch.tv/directory/game/Games' },
    ],
    travel: [
      { name: 'Waze', url: 'https://www.waze.com/live-map' },
      { name: 'ABRP', url: 'https://abetterrouteplanner.com' },
      { name: 'Google Maps', url: 'https://www.google.com/maps' },
      { name: 'PlugShare', url: 'https://www.plugshare.com' },
      { name: 'ChargeMap', url: 'https://chargemap.com' },
    ],
    food: [
      { name: 'TripAdvisor', url: 'https://www.tripadvisor.fr' },
      { name: 'TheFork', url: 'https://www.thefork.fr' },
      { name: 'Uber Eats', url: 'https://www.ubereats.com' },
      { name: 'Deliveroo', url: 'https://deliveroo.fr' },
    ],
    icloud: [
      { name: 'iCloud Mail', url: 'https://www.icloud.com/mail' },
      { name: 'Photos', url: 'https://www.icloud.com/photos' },
      { name: 'Find My', url: 'https://www.icloud.com/find' },
      { name: 'iCloud Notes', url: 'https://www.icloud.com/notes' },
      { name: 'iCloud Drive', url: 'https://www.icloud.com/iclouddrive' },
    ],
    tools: [
      { name: 'Chrome Remote', url: 'https://remotedesktop.google.com/access' },
      { name: 'Windows 365', url: 'https://windows365.microsoft.com' },
      { name: 'Notion', url: 'https://www.notion.so' },
      { name: 'Trello', url: 'https://trello.com' },
      { name: 'Google Drive', url: 'https://drive.google.com' },
    ],
    ai: [
      { name: 'ChatGPT', url: 'https://chatgpt.com' },
      { name: 'Gemini', url: 'https://gemini.google.com/app' },
      { name: 'Claude AI', url: 'https://claude.ai' },
      { name: 'Perplexity', url: 'https://www.perplexity.ai' },
    ],
    tesla: [
      { name: 'TezLab', url: 'https://tezlabapp.com' },
      { name: 'Tessie', url: 'https://www.tessie.com' },
      { name: 'TeslaFi', url: 'https://www.teslafi.com' },
      { name: 'Tesla Shop', url: 'https://shop.tesla.com' },
      { name: 'Tesla Account', url: 'https://www.tesla.com/teslaaccount' },
    ]
  };

  const allLinks = useMemo(() => {
    const combined = [...links];
    Object.keys(defaultApps).forEach(cat => {
      defaultApps[cat].forEach(app => {
        if (!combined.find(l => l.name === app.name)) {
          const domain = new URL(app.url).hostname;
          combined.push({ id: `def-${app.name}`, ...app, category: cat, icon: getIcon(domain), isDefault: true });
        }
      });
    });
    return combined;
  }, [links]);

  const AnimatedLogo = () => (
    <div 
      className="relative w-20 h-20 flex items-center justify-center cursor-pointer active:scale-90 transition-all group"
      onClick={() => setView('home')}
    >
      <div 
        className="absolute inset-0 rounded-2xl blur-3xl opacity-30 group-hover:opacity-100 transition-opacity animate-pulse duration-[3000ms]"
        style={{ backgroundColor: profile.color }}
      />
      <div 
        className="relative w-16 h-16 rounded-2xl flex items-center justify-center border-2 border-white/10 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.9)] bg-black"
      >
        <div className="absolute inset-0 opacity-20 animate-[pulse_5s_infinite]" style={{ background: `radial-gradient(circle, ${profile.color}, transparent)` }} />
        <svg viewBox="0 0 100 100" className="w-12 h-12 relative z-10 filter drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">
          <path 
            d="M50 5 L15 60 L45 60 L35 95 L85 40 L55 40 L65 5 Z" 
            fill={profile.color}
            className="animate-[dash_2.5s_ease-in-out_infinite]"
          />
        </svg>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="flex flex-col items-center gap-8">
         <Loader2 className="w-20 h-20 text-red-600 animate-spin" />
         <p className="text-[12px] font-black uppercase tracking-[0.8em] text-white/20 italic animate-pulse">Ultimate Dash v18.5</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-red-600/30 flex flex-col overflow-hidden">
      
      <style>{`
        @keyframes dash {
          0%, 100% { filter: drop-shadow(0 0 5px ${profile.color}); transform: scale(1) rotate(0deg); }
          50% { filter: drop-shadow(0 0 25px ${profile.color}); transform: scale(1.15) rotate(-2deg); }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .neon-glow { filter: drop-shadow(0 0 10px ${profile.color}80); }
        .neon-border { border-color: ${profile.color}40; box-shadow: 0 0 20px ${profile.color}15; }
        .neon-text { text-shadow: 0 0 12px ${profile.color}A0; }
        input:focus { border-color: ${profile.color}A0; box-shadow: 0 0 20px ${profile.color}20; }
        .btn-menu {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
        }
        .btn-menu-active {
          background: rgba(255, 255, 255, 0.95);
          color: black;
          box-shadow: 0 0 25px ${profile.color}60;
          border-color: ${profile.color};
        }
        .btn-menu:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
        }
      `}</style>

      {/* HEADER PREMIUM */}
      <header className="px-8 py-6 flex justify-between items-center border-b border-white/5 bg-black/60 backdrop-blur-3xl z-50">
        <div className="flex items-center gap-8">
          <AnimatedLogo />
          <div>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none neon-text">Tesla Hub <span style={{ color: profile.color }}>Ultimate</span></h1>
            <div className="flex items-center gap-2 mt-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <p className="text-[11px] text-white/40 font-black uppercase tracking-[0.5em]">{profile.name} • Master Driver</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-12">
          <div className="hidden xl:flex flex-col items-end pr-12 border-r border-white/10">
            <span className="text-5xl font-mono font-light tracking-tighter leading-none neon-text">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="flex gap-4">
            <button onClick={() => window.location.href = `https://www.youtube.com/redirect?q=${encodeURIComponent(window.location.href)}&html5=1`} className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group shadow-xl">
              <Maximize className="w-10 h-10 group-hover:scale-110" />
            </button>
            <button onClick={() => setView('settings')} className={`p-6 rounded-2xl border transition-all ${view === 'settings' ? 'bg-red-600 border-red-400 shadow-[0_0_30px_rgba(232,33,39,0.4)]' : 'bg-white/5 border-white/5 hover:bg-white/10'}`} style={view === 'settings' ? { backgroundColor: profile.color, borderColor: profile.color } : {}}>
              <Settings className="w-10 h-10" />
            </button>
          </div>
        </div>
      </header>

      {/* NAVIGATION ICONIQUE PERSISTANTE - STYLE BOUTON ET NEON */}
      <nav className="flex justify-center gap-6 py-6 bg-black/40 backdrop-blur-xl border-b border-white/5 z-40 px-4 overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setView('home')} 
          className={`p-5 rounded-2xl transition-all duration-300 ${view === 'home' ? 'btn-menu-active scale-110' : 'btn-menu hover:scale-105'}`}
        >
          <LayoutGrid className="w-8 h-8" />
        </button>
        {categories.map(cat => (
          <button 
            key={cat.id} 
            onClick={() => { setActiveTab(cat.id); setView('category'); }} 
            className={`p-5 rounded-2xl transition-all duration-300 relative group ${view === 'category' && activeTab === cat.id ? 'btn-menu-active scale-110' : 'btn-menu hover:scale-105'}`}
          >
            {React.cloneElement(cat.icon, { 
              className: `w-8 h-8 ${view === 'category' && activeTab === cat.id ? '' : 'group-hover:text-white text-white/50'}` 
            })}
            {view === 'category' && activeTab === cat.id && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full blur-[2px]" style={{ backgroundColor: profile.color }} />
            )}
          </button>
        ))}
        <button 
          onClick={() => setView('all-notes')} 
          className={`p-5 rounded-2xl transition-all duration-300 ${view === 'all-notes' ? 'btn-menu-active scale-110' : 'btn-menu hover:scale-105'}`}
        >
          <StickyNote className="w-8 h-8" />
        </button>
      </nav>

      <main className="flex-1 overflow-y-auto no-scrollbar p-10 lg:p-14 pb-48">
        
        {/* VUE : ACCUEIL */}
        {view === 'home' && (
          <div className="max-w-7xl mx-auto space-y-24 animate-in fade-in slide-in-from-bottom-10 duration-700">
            
            {/* SEARCH BARS */}
            <div className="grid md:grid-cols-2 gap-12">
              <div className="relative group">
                <Search className="absolute left-10 top-1/2 -translate-y-1/2 w-10 h-10 text-white/20 group-focus-within:text-red-600 transition-all" style={{ color: profile.color }} />
                <input 
                  type="text" placeholder="Recherche Google..." value={homeSearch}
                  onChange={e => setHomeSearch(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleLaunch(`google.com/search?q=${encodeURIComponent(homeSearch)}`)}
                  className="w-full bg-white/5 border border-white/10 rounded-[3rem] py-12 pl-28 pr-12 outline-none focus:bg-white/[0.08] transition-all text-4xl font-medium shadow-2xl neon-border"
                />
                <button onClick={() => handleLaunch(`google.com/search?q=${encodeURIComponent(homeSearch)}`)} className="absolute right-6 top-1/2 -translate-y-1/2 p-6 bg-red-600 rounded-3xl active:scale-90 shadow-xl transition-all" style={{ backgroundColor: profile.color }}><ArrowRight className="w-10 h-10 text-white" /></button>
              </div>
              <div className="relative group">
                <Globe className="absolute left-10 top-1/2 -translate-y-1/2 w-10 h-10 text-white/20 group-focus-within:text-red-600 transition-all" style={{ color: profile.color }} />
                <input 
                  type="text" placeholder="https://..." value={quickUrl}
                  onChange={e => setQuickUrl(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleLaunch(quickUrl)}
                  className="w-full bg-white/5 border border-white/10 rounded-[3rem] py-12 pl-28 pr-12 outline-none focus:bg-white/[0.08] transition-all text-4xl font-medium shadow-2xl neon-border"
                />
                <button onClick={() => handleLaunch(quickUrl)} className="absolute right-6 top-1/2 -translate-y-1/2 p-6 bg-white text-black rounded-3xl active:scale-90 shadow-xl transition-all"><Send className="w-10 h-10" /></button>
              </div>
            </div>

            {/* DASHBOARD GRID TILES - RECENTRÉES ET STYLISÉES */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setActiveTab(cat.id); setView('category'); }}
                  className="flex flex-col items-center justify-center gap-6 p-8 aspect-square rounded-[5rem] bg-white/[0.02] border border-white/5 hover:border-white/20 transition-all active:scale-95 shadow-2xl group relative overflow-hidden neon-border"
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity" style={{ backgroundColor: profile.color }} />
                  <div 
                    className="w-32 h-32 rounded-[3rem] flex items-center justify-center transition-all group-hover:scale-110 shadow-2xl border border-white/5 neon-glow flex-shrink-0" 
                    style={{ background: `linear-gradient(135deg, ${profile.color}30, transparent)`, color: profile.color }}
                  >
                    {React.cloneElement(cat.icon, { className: "w-16 h-16" })}
                  </div>
                  <span className="font-black text-3xl uppercase tracking-tighter italic text-white/40 group-hover:text-white transition-all w-full text-center px-2 truncate">{cat.label}</span>
                </button>
              ))}
            </div>

            {/* QUICK NOTES DASHBOARD */}
            <div className="grid lg:grid-cols-5 gap-16">
              <div className="lg:col-span-3 bg-white/5 border border-white/10 rounded-[5rem] p-20 space-y-12 shadow-2xl backdrop-blur-3xl neon-border">
                <div className="flex items-center justify-between">
                  <h3 className="text-5xl font-black italic uppercase flex items-center gap-8"><StickyNote style={{ color: profile.color }} className="w-12 h-12 neon-glow" /> Bloc-Notes Cloud</h3>
                  <button onClick={() => setView('all-notes')} className="px-10 py-5 rounded-2xl bg-white/5 text-[14px] font-black text-white/40 uppercase tracking-[0.4em] hover:text-white transition-all border border-white/5">Historique</button>
                </div>
                <textarea 
                  value={noteInput} onChange={e => setNoteInput(e.target.value)}
                  placeholder="Tapez ici..." 
                  className="w-full bg-black/40 border border-white/10 rounded-[3rem] p-12 min-h-[300px] outline-none text-4xl font-medium focus:border-white/30 transition-all shadow-inner"
                />
                <button 
                  onClick={async () => { if (!noteInput.trim()) return; await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'notes'), { text: noteInput, date: new Date().toLocaleString('fr-FR'), createdAt: serverTimestamp() }); setNoteInput(''); }}
                  className="w-full py-12 rounded-[3rem] font-black text-4xl uppercase tracking-widest bg-white text-black hover:bg-gray-100 active:scale-95 transition-all shadow-2xl"
                >
                  Sauvegarder
                </button>
              </div>
              <div className="lg:col-span-2 space-y-12">
                 <h3 className="text-[14px] font-black text-white/20 uppercase tracking-[0.8em] ml-12 flex items-center gap-6"><History className="w-8 h-8" /> Mémos récents</h3>
                 <div className="grid gap-10 max-h-[600px] overflow-y-auto no-scrollbar pr-8">
                    {notes.slice(0, 3).map(note => (
                      <div key={note.id} className="bg-white/[0.02] border border-white/5 p-12 rounded-[4rem] flex justify-between items-start group hover:bg-white/5 transition-all neon-border">
                        <div className="overflow-hidden">
                          <p className="text-3xl font-bold text-white/80 line-clamp-3 mb-6 leading-tight">{note.text}</p>
                          <p className="text-[13px] font-black text-white/10 uppercase">{note.date}</p>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          </div>
        )}

        {/* VUE : CATEGORIE (NOM SOUS ICONE + EDIT DÉPORTÉ) */}
        {view === 'category' && (
          <div className="max-w-7xl mx-auto space-y-24 animate-in fade-in duration-500">
            <div className="flex items-center justify-between border-b border-white/10 pb-20">
               <div className="flex items-center gap-12">
                  <button onClick={() => setView('home')} className="p-10 bg-white/5 rounded-[3.5rem] border border-white/5 hover:bg-white/10 active:scale-90 transition-all shadow-xl"><ChevronLeft className="w-16 h-16" /></button>
                  <h2 className="text-9xl font-black italic uppercase tracking-tighter neon-text" style={{ color: profile.color }}>{activeTab}</h2>
               </div>
               <button onClick={() => { setEditingLink(null); setFormLink({name: '', url: '', category: activeTab}); setShowEditModal(true); }} className="px-16 py-10 bg-red-600 rounded-[3rem] font-black text-2xl uppercase shadow-2xl hover:bg-red-500 active:scale-95 transition-all flex items-center gap-6" style={{ backgroundColor: profile.color }}>
                 <Plus className="w-10 h-10" /> Ajouter
               </button>
            </div>

            {/* IA LAB SECTION */}
            {activeTab === 'ai' && (
              <div className="max-w-6xl mx-auto space-y-16 mb-32 animate-in zoom-in duration-500">
                 <div className="bg-white/[0.03] border border-white/10 p-16 rounded-[6rem] shadow-2xl backdrop-blur-3xl space-y-16 neon-border">
                    <div className="text-center space-y-6">
                       <div className="inline-flex items-center gap-4 px-10 py-3 rounded-full bg-white/5 border border-white/10">
                          <Cpu className="w-6 h-6 neon-glow" style={{ color: profile.color }} />
                          <span className="text-[12px] font-black uppercase tracking-[0.6em]">Advanced Intelligence Laboratory</span>
                       </div>
                       <h3 className="text-5xl font-black italic uppercase tracking-tight">Posez votre question au moteur</h3>
                    </div>
                    <div className="flex flex-col gap-12">
                       <div className="grid grid-cols-2 sm:grid-cols-5 gap-8">
                         {AI_PROVIDERS.map(p => (
                           <button 
                             key={p.id} onClick={() => setSelectedAI(p)} 
                             className={`flex flex-col items-center gap-8 p-10 rounded-[4rem] border-2 transition-all ${selectedAI.id === p.id ? 'bg-white/10 border-white/40 scale-105 shadow-2xl' : 'bg-black/20 border-white/5 opacity-40 hover:opacity-100'}`}
                             style={selectedAI.id === p.id ? { borderColor: profile.color } : {}}
                           >
                             <div className="w-20 h-20 bg-black rounded-[1.5rem] flex items-center justify-center p-4 border border-white/5 shadow-inner group-hover:scale-110 transition-all">
                               <img src={p.icon} className="w-full h-full object-contain" alt="" />
                             </div>
                             <span className="text-[12px] font-black uppercase tracking-widest">{p.id}</span>
                           </button>
                         ))}
                       </div>
                       <div className="relative">
                          <input 
                            type="text" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} onKeyPress={e => e.key === 'Enter' && executeAiPrompt()}
                            placeholder={`Requête pour ${selectedAI.name}...`}
                            className="w-full bg-black/40 border border-white/10 rounded-[4rem] p-12 pr-48 text-4xl font-medium outline-none shadow-inner"
                          />
                          <button onClick={executeAiPrompt} className="absolute right-6 top-1/2 -translate-y-1/2 p-10 bg-white text-black rounded-[3rem] active:scale-90 shadow-2xl hover:bg-gray-100">
                            <Send className="w-12 h-12" />
                          </button>
                       </div>
                    </div>
                 </div>
              </div>
            )}

            {/* FOOD SECTION */}
            {activeTab === 'food' && (
              <div className="grid md:grid-cols-3 gap-16 mb-32">
                {[
                  { name: 'Meilleures Notes', icon: <Star />, url: 'https://www.google.com/maps/search/top+rated+restaurants+near+me/' },
                  { name: 'Ouverts', icon: <Coffee />, url: 'https://www.google.com/maps/search/restaurants+open+now+near+me/' },
                  { name: 'Fast Food', icon: <Zap />, url: 'https://www.google.com/maps/search/fast+food+near+me/' },
                ].map(res => (
                  <button key={res.name} onClick={() => handleLaunch(res.url)} className="p-20 bg-white/[0.03] border border-white/10 rounded-[7rem] text-left hover:border-red-600/50 transition-all group relative overflow-hidden neon-border">
                    <div className="absolute top-0 right-0 w-64 h-64 opacity-10 blur-[120px]" style={{ backgroundColor: profile.color }} />
                    <div className="mb-12 neon-glow" style={{ color: profile.color }}>{React.cloneElement(res.icon, { className: "w-24 h-24" })}</div>
                    <div className="text-6xl font-black italic uppercase tracking-tighter leading-none mb-8">{res.name}</div>
                    <ChevronRight className="absolute bottom-20 right-20 w-20 h-20 text-white/5 group-hover:text-white group-hover:translate-x-6 transition-all" />
                  </button>
                ))}
              </div>
            )}

            {/* APP GRID - NOM EN DESSOUS + BOUTON MOLETTE À DROITE DU NOM */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-20 gap-y-28">
              {allLinks.filter(l => l.category === activeTab).map((link) => (
                <div key={link.id} className="flex flex-col items-center group relative">
                  <button
                    onClick={() => handleLaunch(link.url)}
                    className="w-full aspect-square rounded-[5rem] bg-white/[0.03] border border-white/5 hover:border-white/20 transition-all active:scale-95 shadow-2xl flex items-center justify-center overflow-hidden relative neon-border"
                  >
                    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <img src={link.icon} alt={link.name} onError={(e) => e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(link.name)}&background=111&color=fff&bold=true`} className="w-32 h-32 object-contain filter drop-shadow-[0_0_20px_rgba(0,0,0,0.6)] group-hover:scale-115 transition-transform duration-500 relative z-10" />
                  </button>
                  
                  {/* LABEL SOUS ICONE AVEC EDIT À CÔTÉ - TEXTE AJUSTÉ */}
                  <div className="mt-4 flex items-center justify-center gap-2 w-full">
                    <span className="font-black text-xl tracking-tight text-white/40 uppercase italic group-hover:text-white transition-all truncate max-w-[150px]">{link.name}</span>
                    <button 
                      onClick={() => { setEditingLink(link); setFormLink({ name: link.name, url: link.url, category: link.category }); setShowEditModal(true); }}
                      className="p-1.5 bg-white/5 hover:bg-white text-white/20 hover:text-black rounded-lg transition-all shadow-lg opacity-30 group-hover:opacity-100 border border-white/5"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VUE : TOUTES LES NOTES */}
        {view === 'all-notes' && (
          <div className="max-w-7xl mx-auto space-y-24 animate-in fade-in duration-500">
             <div className="flex items-center gap-12 border-b border-white/10 pb-20">
                <button onClick={() => setView('home')} className="p-10 bg-white/5 rounded-[3.5rem] border border-white/5"><ChevronLeft className="w-16 h-16" /></button>
                <h2 className="text-9xl font-black italic uppercase tracking-tighter neon-text" style={{ color: profile.color }}>Gestion Cloud</h2>
             </div>
             <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-16">
               {notes.map(note => (
                 <div key={note.id} className="bg-white/[0.03] border border-white/10 p-16 rounded-[6rem] space-y-12 shadow-2xl group hover:border-white/20 transition-all relative neon-border">
                    <p className="text-5xl font-medium leading-tight text-white/90">{note.text}</p>
                    <div className="flex justify-between items-center pt-12 border-t border-white/5">
                       <span className="text-[14px] font-black text-white/10 uppercase tracking-[0.5em]">{note.date}</span>
                       <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'notes', note.id))} className="p-8 bg-red-600/10 text-red-600 rounded-[2rem] hover:bg-red-600 hover:text-white transition-all active:scale-90 shadow-xl"><Trash2 className="w-10 h-10"/></button>
                    </div>
                 </div>
               ))}
               {notes.length === 0 && <div className="col-span-full p-64 text-center text-white/5 font-black uppercase italic text-7xl border-2 border-dashed border-white/5 rounded-[7rem]">Base de données vide</div>}
            </div>
          </div>
        )}

        {/* VUE : PARAMÈTRES (RÉGLAGES OS) */}
        {view === 'settings' && (
          <div className="max-w-6xl mx-auto space-y-24 animate-in slide-in-from-right-10 duration-500 pb-64">
            <div className="flex items-center justify-between border-b border-white/10 pb-20">
               <h2 className="text-9xl font-black italic uppercase tracking-tighter">Réglages OS</h2>
               <button onClick={() => setView('home')} className="px-20 py-12 bg-white text-black rounded-[4rem] font-black text-3xl uppercase shadow-2xl hover:bg-gray-100 active:scale-95 transition-all">Quitter</button>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-20">
               <div className="bg-white/5 border border-white/10 rounded-[6rem] p-20 space-y-20 shadow-2xl backdrop-blur-3xl neon-border">
                  <div className="space-y-8 text-center">
                     <label className="text-[14px] font-black text-white/20 uppercase tracking-[0.6em]">Pilote assigné</label>
                     <input 
                       type="text" value={profile.name} onChange={e => { const n = e.target.value; setProfile({...profile, name: n}); setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile'), { name: n }, { merge: true }); }}
                       className="w-full bg-black/40 border border-white/10 rounded-[3rem] p-14 text-6xl font-black outline-none text-center shadow-inner"
                       style={{ color: profile.color }}
                     />
                  </div>
                  <div className="space-y-16">
                     <label className="text-center block text-[14px] font-black text-white/20 uppercase tracking-[0.6em]">Signature Lumineuse</label>
                     <div className="grid grid-cols-4 gap-8">
                       {THEME_COLORS.map(c => (
                         <button 
                           key={c.hex} onClick={() => { setProfile({...profile, color: c.hex}); setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile'), { color: c.hex }, { merge: true }); }}
                           className={`aspect-square rounded-[3rem] transition-all relative ${profile.color === c.hex ? 'scale-110 shadow-2xl z-10 border-8 border-white' : 'opacity-20 hover:opacity-100 hover:scale-105'}`}
                           style={{ backgroundColor: c.hex, boxShadow: profile.color === c.hex ? `0 0 100px ${c.hex}A0` : '' }}
                         >
                           {profile.color === c.hex && <CheckCircle2 className="absolute -top-6 -right-6 text-white fill-black w-14 h-14" />}
                         </button>
                       ))}
                     </div>
                  </div>
               </div>

               <div className="bg-white/5 border border-white/10 rounded-[6rem] p-20 space-y-20 shadow-2xl backdrop-blur-3xl flex flex-col justify-center neon-border">
                  <label className="text-[14px] font-black text-white/20 uppercase tracking-[0.6em] text-center mb-10">Moteur de Redirection</label>
                  <button 
                    onClick={() => { setProfile({...profile, openMode: 'tab'}); setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile'), { openMode: 'tab' }, { merge: true }); }}
                    className={`p-16 rounded-[5rem] border-4 mb-14 transition-all text-left group ${profile.openMode === 'tab' ? 'bg-white text-black border-white shadow-2xl scale-105' : 'bg-transparent border-white/10 text-white/20 hover:bg-white/10'}`}
                  >
                     <div className="text-5xl font-black italic uppercase tracking-tighter">Navigateur Multi</div>
                     <p className="text-sm font-bold mt-6 uppercase opacity-40">Standard navigateur (Multi-Fenêtres)</p>
                  </button>
                  <button 
                    onClick={() => { setProfile({...profile, openMode: 'fullscreen'}); setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile'), { openMode: 'fullscreen' }, { merge: true }); }}
                    className={`p-16 rounded-[5rem] border-4 transition-all text-left group ${profile.openMode === 'fullscreen' ? 'bg-red-600 text-white border-red-400 shadow-2xl scale-105' : 'bg-transparent border-white/10 text-white/20 hover:bg-white/10'}`}
                    style={profile.openMode === 'fullscreen' ? { backgroundColor: profile.color, borderColor: profile.color } : {}}
                  >
                     <div className="text-5xl font-black italic uppercase tracking-tighter">Plein Écran Total</div>
                     <p className="text-sm font-bold mt-6 uppercase opacity-60">Utilise la redirection YouTube</p>
                  </button>
               </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL EDIT / AJOUT */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/98 backdrop-blur-3xl flex items-center justify-center z-[100] p-10 animate-in zoom-in duration-300">
          <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-4xl rounded-[7rem] p-24 space-y-20 shadow-2xl neon-border">
            <h2 className="text-7xl font-black italic uppercase tracking-widest text-center" style={{ color: profile.color }}>{editingLink ? "Édition App" : "Nouvelle App"}</h2>
            <div className="space-y-16">
              <div className="space-y-6">
                 <label className="text-[14px] font-black uppercase text-white/20 ml-12 tracking-[0.5em]">Désignation</label>
                 <input type="text" value={formLink.name} onChange={e => setFormLink({...formLink, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-[3rem] p-14 text-6xl font-black outline-none transition-all shadow-inner" placeholder="Ex: Disney+" />
              </div>
              <div className="space-y-6">
                 <label className="text-[14px] font-black uppercase text-white/20 ml-12 tracking-[0.5em]">Cible (URL)</label>
                 <input type="text" value={formLink.url} onChange={e => setFormLink({...formLink, url: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-[3rem] p-14 text-4xl outline-none text-white/30 transition-all shadow-inner" placeholder="Ex: disneyplus.com" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
                {categories.map(c => (
                  <button key={c.id} onClick={() => setFormLink({...formLink, category: c.id})} className={`py-8 rounded-[2.5rem] border-2 transition-all text-[12px] font-black uppercase tracking-widest ${formLink.category === c.id ? 'bg-white text-black border-white shadow-2xl scale-110' : 'bg-transparent border-white/5 text-white/20'}`}>{c.label}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-12">
              <button onClick={() => { setShowEditModal(false); setEditingLink(null); }} className="flex-1 py-14 rounded-[3.5rem] font-black text-2xl uppercase bg-white/5 hover:bg-white/10 transition-all">Annuler</button>
              {editingLink && !editingLink.id.startsWith('def-') && (
                <button onClick={async () => { if(confirm("Supprimer l'application ?")) { await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'links', editingLink.id)); setShowEditModal(false); } }} className="p-14 rounded-[3.5rem] bg-red-600/10 text-red-600 border border-red-600/20 active:bg-red-600 active:text-white transition-all shadow-xl"><Trash2 className="w-12 h-12"/></button>
              )}
              <button onClick={handleSaveLink} className="flex-[2] py-14 rounded-[3.5rem] font-black text-3xl uppercase bg-red-600 shadow-2xl hover:bg-red-500 transition-all" style={{ backgroundColor: profile.color }}>Valider</button>
            </div>
          </div>
        </div>
      )}

      <footer className="py-16 text-center opacity-5 mt-auto pointer-events-none z-50">
        <p className="text-[28px] font-black uppercase tracking-[3.8em] italic">Tesla OS Unified • v18.5</p>
      </footer>
    </div>
  );
};

export default App;
