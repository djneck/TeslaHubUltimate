import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  onSnapshot, 
  setDoc,
  addDoc,
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Play, 
  Gamepad2, 
  Music, 
  LayoutGrid, 
  Plus, 
  Trash2, 
  Maximize, 
  X, 
  Search, 
  Briefcase, 
  Navigation, 
  Cloud, 
  Mic, 
  MicOff, 
  StickyNote, 
  Save, 
  PlayCircle, 
  Loader2, 
  Settings, 
  Palette, 
  Home, 
  Sparkles, 
  Brain, 
  ChevronDown, 
  Send,
  Star,
  Monitor,
  CheckCircle2,
  ExternalLink,
  AlertCircle
} from 'lucide-react';

// --- CONFIGURATION FIREBASE ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialisation sécurisée
let app, auth, db;
try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error("Firebase Initialization Error:", e);
}

const APP_INTERNAL_ID = import.meta.env.VITE_APP_ID || "media-hub-tesla-hub-v14-5";

const THEME_COLORS = [
  { name: 'Tesla Red', hex: '#E82127' },
  { name: 'Cyber Blue', hex: '#00F2FF' },
  { name: 'Acid Green', hex: '#C1FF00' },
  { name: 'Neon Purple', hex: '#BC00FF' },
  { name: 'Solar Orange', hex: '#FF8A00' },
];

const getIcon = (domain) => `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;

const AI_PROVIDERS = [
  { id: 'gemini', name: 'Google Gemini', url: 'https://gemini.google.com/app?q=', icon: getIcon('gemini.google.com') },
  { id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com/?q=', icon: getIcon('chatgpt.com') },
  { id: 'claude', name: 'Anthropic Claude', url: 'https://claude.ai/new?q=', icon: getIcon('claude.ai') },
  { id: 'google', name: 'Google Search', url: 'https://www.google.com/search?q=', icon: getIcon('google.com') },
  { id: 'grok', name: 'xAI Grok', url: 'https://x.com/i/grok?q=', icon: getIcon('x.com') },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [activeCategory, setActiveCategory] = useState('home'); 
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBookmarkInfo, setShowBookmarkInfo] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [aiPrompt, setAiPrompt] = useState('');
  const [selectedAI, setSelectedAI] = useState(AI_PROVIDERS[0]);
  const [isDictatingAI, setIsDictatingAI] = useState(false);

  const [profile, setProfile] = useState({
    name: 'Pilote',
    color: '#E82127',
    openMode: 'tab'
  });

  const [customLinks, setCustomLinks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [noteInput, setNoteInput] = useState('');
  const [newApp, setNewApp] = useState({ name: '', url: '', category: 'streaming' });
  
  const recognitionRef = useRef(null);

  useEffect(() => {
    const login = async () => {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        setError("Connexion Cloud restreinte");
      }
    };
    login();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const unsubProfile = onSnapshot(doc(db, 'artifacts', APP_INTERNAL_ID, 'users', user.uid, 'settings', 'profile'), (d) => {
      if (d.exists()) setProfile(prev => ({ ...prev, ...d.data() }));
    });
    const unsubApps = onSnapshot(collection(db, 'artifacts', APP_INTERNAL_ID, 'users', user.uid, 'apps'), (s) => {
      setCustomLinks(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubNotes = onSnapshot(collection(db, 'artifacts', APP_INTERNAL_ID, 'users', user.uid, 'notes'), (s) => {
      setNotes(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubProfile(); unsubApps(); unsubNotes(); };
  }, [user]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.lang = 'fr-FR';
      recognitionRef.current.onresult = (e) => {
        let transcript = '';
        for (let i = e.resultIndex; i < e.results.length; i++) transcript += e.results[i][0].transcript;
        if (activeCategory === 'ai') setAiPrompt(transcript);
        else setNoteInput(transcript);
      };
      recognitionRef.current.onend = () => setIsDictatingAI(false);
    }
    return () => clearInterval(timer);
  }, [activeCategory]);

  const handleAppLaunch = (url) => {
    if (profile.openMode === 'fullscreen') {
      window.location.href = `https://www.youtube.com/redirect?q=${encodeURIComponent(url)}`;
    } else {
      window.open(url, '_blank');
    }
  };

  const executeAiPrompt = () => {
    if (!aiPrompt.trim()) return;
    const finalUrl = `${selectedAI.url}${encodeURIComponent(aiPrompt)}`;
    handleAppLaunch(finalUrl);
  };

  const updateProfile = async (updates) => {
    if (!user) return;
    await setDoc(doc(db, 'artifacts', APP_INTERNAL_ID, 'users', user.uid, 'settings', 'profile'), updates, { merge: true });
  };

  const categories = [
    { id: 'ai', label: 'IA', icon: <Brain /> },
    { id: 'streaming', label: 'Médias', icon: <Play /> },
    { id: 'music', label: 'Musique', icon: <Music /> },
    { id: 'games', label: 'Jeux', icon: <Gamepad2 /> },
    { id: 'travel', label: 'Voyage', icon: <Navigation /> },
    { id: 'notes', label: 'Notes', icon: <StickyNote /> },
    { id: 'icloud', label: 'iCloud', icon: <Cloud /> },
    { id: 'personal', label: 'Perso', icon: <Briefcase /> },
  ];

  const defaultApps = {
    streaming: [
      { name: 'Netflix', url: 'https://www.netflix.com', icon: getIcon('netflix.com') },
      { name: 'YouTube', url: 'https://www.youtube.com', icon: getIcon('youtube.com') },
      { name: 'Disney+', url: 'https://www.disneyplus.com', icon: getIcon('disneyplus.com') },
      { name: 'Prime Video', url: 'https://www.primevideo.com', icon: getIcon('primevideo.com') },
      { name: 'Crunchyroll', url: 'https://www.crunchyroll.com', icon: getIcon('crunchyroll.com') },
      { name: 'OQEE by Free', url: 'https://oqee.tv', icon: getIcon('oqee.tv') },
    ],
    music: [
      { name: 'Spotify', url: 'https://open.spotify.com', icon: getIcon('spotify.com') },
      { name: 'Deezer', url: 'https://www.deezer.com', icon: getIcon('deezer.com') },
      { name: 'Apple Music', url: 'https://music.apple.com', icon: getIcon('apple.com') },
      { name: 'SoundCloud', url: 'https://soundcloud.com', icon: getIcon('soundcloud.com') },
    ],
    games: [
      { name: 'Xbox Cloud', url: 'https://www.xbox.com/play', icon: getIcon('xbox.com') },
      { name: 'GeForce Now', url: 'https://play.geforcenow.com', icon: getIcon('nvidia.com') },
      { name: 'Steam Web', url: 'https://store.steampowered.com', icon: getIcon('steampowered.com') },
    ],
    travel: [
      { name: 'Waze', url: 'https://www.waze.com/live-map', icon: getIcon('waze.com') },
      { name: 'ABRP', url: 'https://abetterrouteplanner.com', icon: getIcon('abetterrouteplanner.com') },
      { name: 'Google Maps', url: 'https://www.google.com/maps', icon: getIcon('google.com') },
    ],
    icloud: [
      { name: 'iCloud Mail', url: 'https://www.icloud.com/mail', icon: getIcon('icloud.com') },
      { name: 'Photos', url: 'https://www.icloud.com/photos', icon: getIcon('apple.com') },
    ]
  };

  const filteredApps = useMemo(() => {
    const combined = [...(defaultApps[activeCategory] || []), ...customLinks.filter(app => app.category === activeCategory)];
    return searchQuery ? combined.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase())) : combined;
  }, [activeCategory, customLinks, searchQuery]);

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center">
      <Loader2 className="w-12 h-12 text-red-600 animate-spin mb-4" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 italic">Tesla Hub Loading...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-red-600/30 overflow-hidden flex flex-col">
      <header className="px-8 py-6 flex justify-between items-center relative z-50 border-b border-white/5 bg-black/40 backdrop-blur-3xl">
        <div className="flex items-center gap-6">
          <button onClick={() => setActiveCategory('home')} className="group relative flex items-center justify-center w-12 h-12 transition-all hover:scale-110">
            <div className="absolute inset-0 rounded-full blur-md opacity-20" style={{ backgroundColor: profile.color }} />
            <svg viewBox="0 0 100 100" className="w-8 h-8 relative z-10 fill-current" style={{ color: profile.color }}>
              <path d="M50 20l-15 35h10l-2 15 22-40h-10l5-10z" />
              <path d="M50 5c24.8 0 45 20.2 45 45s-20.2 45-45 45S5 74.8 5 50 25.2 5 50 5z" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="10 5" className="animate-[spin_10s_linear_infinite]" />
            </svg>
          </button>
          <div className="hidden sm:block">
            <h1 className="text-xl font-black italic uppercase tracking-tighter leading-none">Tesla Hub</h1>
            <div className="flex items-center gap-2 mt-1">
              <CheckCircle2 className="w-2.5 h-2.5 text-green-500" />
              <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest">{profile.name} • Cloud Active</p>
            </div>
          </div>
        </div>
        <div className="flex-1 max-w-md mx-6 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <input type="text" placeholder="Recherche..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-2xl py-2.5 pl-11 pr-4 outline-none focus:border-white/20 transition-all text-sm font-medium backdrop-blur-md" />
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right mr-4 border-r border-white/10 pr-4">
            <span className="text-xl font-mono italic tracking-widest leading-none">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <button onClick={() => setActiveCategory('settings')} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5">
            <Settings className="w-6 h-6 text-white/40" />
          </button>
        </div>
      </header>

      <nav className="px-8 py-4 flex gap-3 overflow-x-auto no-scrollbar relative z-50 bg-black/20">
        <button onClick={() => setActiveCategory('home')} className={`flex items-center gap-2 px-6 py-4 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest ${activeCategory === 'home' ? 'bg-white text-black scale-105 shadow-2xl' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>
          <Home className="w-4 h-4" /> Accueil
        </button>
        {categories.map(cat => (
          <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`flex items-center gap-3 px-6 py-4 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${activeCategory === cat.id ? 'bg-white text-black scale-105 shadow-xl' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>
            {React.cloneElement(cat.icon, { className: "w-4 h-4" })} {cat.label}
          </button>
        ))}
      </nav>

      <main className="flex-1 relative z-10 overflow-y-auto p-8 lg:p-12 no-scrollbar">
        {activeCategory === 'home' && (
          <div className="relative animate-in fade-in slide-in-from-bottom-8 duration-700">
            <button onClick={() => setShowBookmarkInfo(true)} className="absolute -top-4 right-0 p-3 bg-white/5 hover:bg-white/10 rounded-full text-white/20 hover:text-yellow-400 group">
              <Star className="w-4 h-4 group-hover:fill-current" />
            </button>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
              {categories.map(cat => (
                <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className="group relative flex flex-col items-center justify-center aspect-square rounded-[3.5rem] bg-white/[0.02] border border-white/5 hover:border-white/20 transition-all backdrop-blur-2xl hover:scale-105 active:scale-95 overflow-hidden shadow-2xl">
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity" style={{ backgroundColor: profile.color }} />
                  <div className="w-24 h-24 rounded-[2rem] mb-6 flex items-center justify-center shadow-2xl transition-all group-hover:scale-110" style={{ backgroundColor: `${profile.color}15`, color: profile.color }}>
                    {React.cloneElement(cat.icon, { className: "w-12 h-12" })}
                  </div>
                  <span className="font-black text-[11px] uppercase tracking-[0.3em] text-white/40 group-hover:text-white transition-colors">{cat.label}</span>
                </button>
              ))}
            </div>
            {showBookmarkInfo && (
              <div className="mt-8 p-6 bg-yellow-400/10 border border-yellow-400/20 rounded-[2rem] flex items-center justify-between animate-in zoom-in">
                <div className="flex items-center gap-4">
                  <Star className="text-yellow-400 fill-current w-6 h-6" />
                  <p className="text-sm font-bold text-yellow-400/80 uppercase">Ajoutez cette page aux favoris de votre navigateur Tesla.</p>
                </div>
                <button onClick={() => setShowBookmarkInfo(false)} className="p-2 hover:bg-white/5 rounded-full"><X className="w-4 h-4"/></button>
              </div>
            )}
          </div>
        )}

        {activeCategory === 'ai' && (
          <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in pb-20">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/5 border border-white/10">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/60">AI Laboratory</span>
              </div>
              <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none">Quel cerveau utiliser aujourd'hui ?</h2>
            </div>
            <div className="bg-white/5 border border-white/10 p-10 rounded-[4rem] backdrop-blur-3xl shadow-2xl space-y-10 border-white/20">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="relative w-full md:w-72">
                  <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-4 mb-2 block">Cerveau IA</label>
                  <select value={selectedAI.id} onChange={(e) => setSelectedAI(AI_PROVIDERS.find(p => p.id === e.target.value))} className="w-full bg-black/40 border border-white/10 rounded-3xl p-5 appearance-none font-bold text-lg outline-none focus:border-white/20">
                    {AI_PROVIDERS.map(p => <option key={p.id} value={p.id} className="bg-[#111]">{p.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-5 top-[3.2rem] w-5 h-5 text-white/20 pointer-events-none" />
                </div>
                <div className="flex-1 relative">
                  <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-4 mb-2 block">Requête</label>
                  <input type="text" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && executeAiPrompt()} placeholder="Posez votre question..." className="w-full bg-black/40 border border-white/10 rounded-3xl p-5 pr-32 text-xl font-medium outline-none" />
                  <div className="absolute right-2 top-[2.4rem] flex gap-2">
                    <button onClick={() => { if (isDictatingAI) recognitionRef.current?.stop(); else { setIsDictatingAI(true); recognitionRef.current?.start(); } }} className={`p-3 rounded-2xl transition-all ${isDictatingAI ? 'bg-red-600 animate-pulse text-white shadow-lg' : 'bg-white/5 text-white/40'}`}>
                      {isDictatingAI ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                    </button>
                    <button onClick={executeAiPrompt} className="p-3 bg-white text-black rounded-2xl hover:scale-110 active:scale-95 transition-all shadow-xl">
                      <Send className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {AI_PROVIDERS.map(ai => (
                  <button key={ai.id} onClick={() => { setSelectedAI(ai); handleAppLaunch(ai.url); }} className={`flex flex-col items-center gap-4 p-6 rounded-[2.5rem] border transition-all ${selectedAI.id === ai.id ? 'bg-white/10 border-white/30 scale-105' : 'bg-black/20 border-white/5 opacity-60 hover:opacity-100'}`}>
                    <img src={ai.icon} className="w-12 h-12 rounded-2xl shadow-xl" alt="" onError={(e) => e.target.src = getIcon(new URL(ai.url).hostname)} />
                    <span className="text-[10px] font-black uppercase tracking-tighter text-center">{ai.name.split(' ')[1] || ai.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeCategory === 'notes' && (
          <div className="space-y-12 animate-in fade-in duration-500 pb-20 max-w-4xl mx-auto">
            <div className="bg-white/5 border border-white/10 p-10 rounded-[3.5rem] shadow-2xl space-y-6">
               <h3 className="text-xl font-black italic uppercase flex items-center gap-3"><StickyNote style={{ color: profile.color }} /> Blocs-Notes</h3>
               <textarea value={noteInput} onChange={(e) => setNoteInput(e.target.value)} placeholder="Écrivez ou dictez votre note ici..." className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 min-h-[150px] outline-none text-xl font-medium focus:border-white/20 transition-all" />
               <div className="flex gap-4">
                  <button onClick={() => { if (isDictatingAI) recognitionRef.current?.stop(); else { setIsDictatingAI(true); recognitionRef.current?.start(); } }} className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest ${isDictatingAI ? 'bg-red-600 animate-pulse' : 'bg-white/5'}`}>DICTÉE VOCALE</button>
                  <button onClick={async () => { if (!user || !noteInput.trim()) return; await addDoc(collection(db, 'artifacts', APP_INTERNAL_ID, 'users', user.uid, 'notes'), { text: noteInput, date: new Date().toLocaleString('fr-FR'), color: 'bg-yellow-200', createdAt: serverTimestamp() }); setNoteInput(''); }} className="flex-1 bg-white text-black py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 active:scale-95 transition-all shadow-xl shadow-white/5">SAUVEGARDER</button>
               </div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {notes.map(note => (
                <div key={note.id} className="bg-yellow-100 text-black p-8 rounded-[2.5rem] relative group shadow-2xl">
                  <p className="font-bold text-lg mb-6 leading-tight">{note.text}</p>
                  <div className="flex justify-between items-center opacity-30 text-[9px] font-black uppercase">
                    <span>{note.date}</span>
                    <button onClick={() => deleteDoc(doc(db, 'artifacts', APP_INTERNAL_ID, 'users', user.uid, 'notes', note.id))} className="p-2 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeCategory === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-8 py-10 animate-in slide-in-from-right-8 duration-500 pb-24">
            <section className="bg-white/5 border border-white/10 p-10 rounded-[3.5rem] shadow-2xl space-y-10 backdrop-blur-md">
              <h2 className="text-2xl font-black italic uppercase flex items-center gap-4"><Settings className="w-7 h-7" style={{ color: profile.color }} /> Configuration</h2>
              <div className="space-y-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-4">Nom du Pilote</label>
                  <input type="text" value={profile.name} onChange={(e) => updateProfile({ name: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-2xl font-black outline-none focus:border-white/20" />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-4 flex items-center gap-2"><Monitor className="w-3 h-3" /> Mode d'ouverture</label>
                  <div className="grid grid-cols-2 gap-3 p-2 bg-black/40 rounded-3xl border border-white/5">
                    <button onClick={() => updateProfile({ openMode: 'tab' })} className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${profile.openMode === 'tab' ? 'bg-white text-black' : 'text-white/40 hover:bg-white/5'}`}>NOUVEL ONGLET</button>
                    <button onClick={() => updateProfile({ openMode: 'fullscreen' })} className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${profile.openMode === 'fullscreen' ? 'bg-red-600 text-white' : 'text-white/40 hover:bg-white/5'}`}>PLEIN ÉCRAN</button>
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-4 flex items-center gap-2"><Palette className="w-3 h-3" /> Signature visuelle</label>
                  <div className="flex gap-5 flex-wrap">
                    {THEME_COLORS.map(c => <button key={c.hex} onClick={() => updateProfile({ color: c.hex })} className={`w-14 h-14 rounded-2xl transition-all ${profile.color === c.hex ? 'scale-110 ring-4 ring-white/20' : 'opacity-40 hover:opacity-80'}`} style={{ backgroundColor: c.hex }} />)}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeCategory !== 'home' && activeCategory !== 'settings' && activeCategory !== 'ai' && activeCategory !== 'notes' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 animate-in fade-in duration-500 pb-20">
            {filteredApps.map((app, idx) => (
              <button key={idx} onClick={() => handleAppLaunch(app.url)} className="group flex flex-col items-center justify-center aspect-[4/3] rounded-[2.5rem] bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-white/20 transition-all shadow-xl active:scale-95 relative overflow-hidden">
                <div className="w-16 h-16 bg-[#0a0a0a] rounded-2xl mb-4 flex items-center justify-center p-4 border border-white/5 group-hover:scale-105 transition-transform duration-300 shadow-2xl">
                  <img src={app.icon} className="w-full h-full object-contain filter drop-shadow-lg" alt="" onError={(e) => { e.target.src = getIcon(new URL(app.url).hostname); }} />
                </div>
                <div className="flex items-center gap-1 overflow-hidden w-full px-4 justify-center">
                  <span className="font-black text-[10px] uppercase text-white/30 group-hover:text-white truncate tracking-tighter">{app.name}</span>
                  {profile.openMode === 'fullscreen' && <Maximize className="w-2.5 h-2.5 text-white/20 flex-shrink-0" />}
                </div>
                {app.id && <button onClick={(e) => { e.stopPropagation(); deleteDoc(doc(db, 'artifacts', APP_INTERNAL_ID, 'users', user.uid, 'apps', app.id)); }} className="absolute -top-2 -right-2 p-2.5 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-xl z-10"><Trash2 className="w-4 h-4 text-white" /></button>}
              </button>
            ))}
            <button onClick={() => setShowAddModal(true)} className="flex flex-col items-center justify-center aspect-[4/3] rounded-[2.5rem] border-2 border-dashed border-white/10 hover:border-white/30 transition-all text-white/10 hover:text-white group active:scale-95">
              <Plus className="w-8 h-8 mb-2 group-hover:scale-110" />
              <span className="font-black text-[9px] uppercase tracking-widest">Ajouter</span>
            </button>
          </div>
        )}
      </main>

      <button onClick={() => window.location.href = `https://www.youtube.com/redirect?q=${encodeURIComponent(window.location.href)}`} className="fixed bottom-8 right-8 p-5 rounded-[2rem] border border-white/10 shadow-2xl z-[100] hover:scale-110 active:scale-90 transition-all bg-white/5 group overflow-hidden backdrop-blur-3xl">
        <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity" style={{ backgroundColor: profile.color }} />
        <Maximize className="w-6 h-6 text-white/40 group-hover:text-white relative z-10" />
      </button>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl flex items-center justify-center z-[100] p-6 animate-in zoom-in duration-200">
          <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-lg rounded-[3.5rem] p-10 space-y-8 shadow-2xl">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-center">Nouveau Raccourci</h2>
            <div className="space-y-4">
              <input type="text" value={newApp.name} onChange={(e) => setNewApp({...newApp, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-lg outline-none focus:border-red-500 font-bold" placeholder="Nom du service" />
              <input type="text" value={newApp.url} onChange={(e) => setNewApp({...newApp, url: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-lg outline-none focus:border-red-500 font-bold" placeholder="Lien URL complet" />
            </div>
            <div className="flex gap-4">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-5 rounded-3xl font-black text-xs bg-white/5 uppercase">Fermer</button>
              <button onClick={async () => { if (!user || !newApp.name || !newApp.url) return; let url = newApp.url.trim(); if (!/^https?:\/\//i.test(url)) url = 'https://' + url; const icon = getIcon(new URL(url).hostname); await addDoc(collection(db, 'artifacts', APP_INTERNAL_ID, 'users', user.uid, 'apps'), { ...newApp, url, icon, createdAt: serverTimestamp() }); setShowAddModal(false); }} className="flex-1 py-5 rounded-3xl font-black text-xs bg-red-600 uppercase">Valider</button>
            </div>
          </div>
        </div>
      )}

      <footer className="py-6 text-center opacity-10 select-none pointer-events-none z-50">
        <p className="text-[8px] font-black uppercase tracking-[1.5em] italic">Tesla OS Immersive • v14.5</p>
      </footer>
    </div>
  );
}

