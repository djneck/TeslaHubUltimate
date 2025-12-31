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
  Car,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

// --- GESTION SÉCURISÉE DES VARIABLES D'ENVIRONNEMENT ---
const safeEnv = (key, fallback = "") => {
  try {
    return import.meta.env[key] || fallback;
  } catch (e) {
    return fallback;
  }
};

const firebaseConfig = {
  apiKey: safeEnv("VITE_FIREBASE_API_KEY", "AIzaSyAEzWBBxCofSH0eVkxuO9EYkTjsBYGqRc0"),
  authDomain: safeEnv("VITE_FIREBASE_AUTH_DOMAIN", "media-hub-tesla.firebaseapp.com"),
  projectId: safeEnv("VITE_FIREBASE_PROJECT_ID", "media-hub-tesla"),
  storageBucket: safeEnv("VITE_FIREBASE_STORAGE_BUCKET", "media-hub-tesla.firebasestorage.app"),
  messagingSenderId: safeEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", "1008267221004"),
  appId: safeEnv("VITE_FIREBASE_APP_ID", "1:1008267221004:web:4c66a3a2c1bb0a20f1f629"),
  measurementId: safeEnv("VITE_FIREBASE_MEASUREMENT_ID", "G-HEPLJ3YM71"),
  databaseURL: safeEnv("VITE_FIREBASE_DATABASE_URL", "https://media-hub-tesla.firebaseio.com")
};

// Initialisation sécurisée
let app, auth, db;
try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error("Firebase Init Error:", e);
}

const APP_INTERNAL_ID = safeEnv("VITE_APP_ID", "media-hub-tesla-hub-v14");

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

const App = () => {
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
        console.error(e); 
        setError("Accès Cloud restreint. Vérifiez l'auth anonyme.");
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
      const fetchedNotes = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setNotes(fetchedNotes.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
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
    let finalUrl = url;
    if (!url.startsWith('http')) finalUrl = 'https://' + url;
    
    if (profile.openMode === 'fullscreen') {
      window.location.href = `https://www.youtube.com/redirect?q=${encodeURIComponent(finalUrl)}`;
    } else {
      window.open(finalUrl, '_blank');
    }
  };

  const executeAiPrompt = () => {
    if (!aiPrompt.trim()) return;
    const finalUrl = `${selectedAI.url}${encodeURIComponent(aiPrompt)}`;
    handleAppLaunch(finalUrl);
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
    { id: 'tesla', label: 'Tesla', icon: <Car /> },
  ];

  const defaultApps = {
    streaming: [
      { name: 'Netflix', url: 'https://www.netflix.com', icon: getIcon('netflix.com') },
      { name: 'YouTube', url: 'https://www.youtube.com', icon: getIcon('youtube.com') },
      { name: 'Disney+', url: 'https://www.disneyplus.com', icon: getIcon('disneyplus.com') },
      { name: 'Prime Video', url: 'https://www.primevideo.com', icon: getIcon('primevideo.com') },
      { name: 'Crunchyroll', url: 'https://www.crunchyroll.com', icon: getIcon('crunchyroll.com') },
      { name: 'OQEE by Free', url: 'https://oqee.tv', icon: getIcon('oqee.tv') },
      { name: 'MyCanal', url: 'https://www.canalplus.com', icon: getIcon('canalplus.com') },
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
      { name: 'Chess.com', url: 'https://www.chess.com', icon: getIcon('chess.com') },
      { name: 'Roblox', url: 'https://www.roblox.com', icon: getIcon('roblox.com') },
    ],
    travel: [
      { name: 'Waze', url: 'https://www.waze.com/live-map', icon: getIcon('waze.com') },
      { name: 'ABRP', url: 'https://abetterrouteplanner.com', icon: getIcon('abetterrouteplanner.com') },
      { name: 'Google Maps', url: 'https://www.google.com/maps', icon: getIcon('google.com') },
      { name: 'TripAdvisor', url: 'https://www.tripadvisor.fr', icon: getIcon('tripadvisor.fr') },
      { name: 'PlugShare', url: 'https://www.plugshare.com', icon: getIcon('plugshare.com') },
    ],
    icloud: [
      { name: 'iCloud Mail', url: 'https://www.icloud.com/mail', icon: getIcon('icloud.com') },
      { name: 'Photos', url: 'https://www.icloud.com/photos', icon: getIcon('apple.com') },
      { name: 'Drive', url: 'https://www.icloud.com/iclouddrive', icon: getIcon('icloud.com') },
      { name: 'Notes', url: 'https://www.icloud.com/notes', icon: getIcon('apple.com') },
    ],
    personal: [
      { name: 'Gmail', url: 'https://mail.google.com', icon: getIcon('gmail.com') },
      { name: 'Notion', url: 'https://www.notion.so', icon: getIcon('notion.so') },
      { name: 'WhatsApp', url: 'https://web.whatsapp.com', icon: getIcon('whatsapp.com') },
      { name: 'Discord', url: 'https://discord.com/app', icon: getIcon('discord.com') },
    ],
    tesla: [
      { name: 'TezLab', url: 'https://tezlabapp.com', icon: getIcon('tezlabapp.com') },
      { name: 'Tessie', url: 'https://www.tessie.com', icon: getIcon('tessie.com') },
      { name: 'Tesla Web', url: 'https://www.tesla.com', icon: getIcon('tesla.com') },
    ]
  };

  const filteredApps = useMemo(() => {
    const combined = [...(defaultApps[activeCategory] || []), ...customLinks.filter(app => app.category === activeCategory)];
    return searchQuery ? combined.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase())) : combined;
  }, [activeCategory, customLinks, searchQuery]);

  const updateProfile = async (updates) => {
    if (!user) return;
    await setDoc(doc(db, 'artifacts', APP_INTERNAL_ID, 'users', user.uid, 'settings', 'profile'), updates, { merge: true });
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <Loader2 className="w-12 h-12 text-red-600 animate-spin mb-4" />
      <p className="text-[10px] font-black uppercase tracking-widest text-white/20 italic">Tesla Hub...</p>
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
              <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest leading-none">{profile.name}</p>
            </div>
          </div>
        </div>
        <div className="flex-1 max-w-md mx-6 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <input type="text" placeholder="Recherche..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-2xl py-2.5 pl-11 pr-4 outline-none focus:border-white/20 transition-all text-sm font-medium backdrop-blur-md" />
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right mr-4 border-r border-white/10 pr-4">
            <span className="text-xl font-mono italic tracking-widest">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <button onClick={() => setActiveCategory('settings')} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5">
            <Settings className="w-6 h-6 text-white/40" />
          </button>
        </div>
      </header>

      <nav className="px-8 py-4 flex gap-3 overflow-x-auto no-scrollbar relative z-50 bg-black/20">
        <button onClick={() => setActiveCategory('home')} className={`flex items-center gap-2 px-6 py-4 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest ${activeCategory === 'home' ? 'bg-white text-black' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>
          <Home className="w-4 h-4" /> Accueil
        </button>
        {categories.map(cat => (
          <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`flex items-center gap-3 px-6 py-4 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${activeCategory === cat.id ? 'bg-white text-black' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>
            {React.cloneElement(cat.icon, { className: "w-4 h-4" })} {cat.label}
          </button>
        ))}
      </nav>

      <main className="flex-1 relative z-10 overflow-y-auto p-8 lg:p-12 no-scrollbar">
        {error && (
          <div className="mb-6 p-4 bg-red-600/10 border border-red-600/20 rounded-2xl flex items-center gap-3 text-red-500 text-xs font-bold animate-pulse">
            <AlertCircle className="w-5 h-5" /> {error}
          </div>
        )}

        {/* VUE : ACCUEIL */}
        {activeCategory === 'home' && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className="group relative flex flex-col items-center justify-center aspect-square rounded-[3.5rem] bg-white/[0.02] border border-white/5 hover:border-white/20 transition-all backdrop-blur-2xl hover:scale-105 active:scale-95 overflow-hidden shadow-2xl">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity" style={{ backgroundColor: profile.color }} />
                <div className="w-24 h-24 rounded-[2rem] mb-6 flex items-center justify-center shadow-2xl transition-all" style={{ backgroundColor: `${profile.color}15`, color: profile.color }}>
                  {React.cloneElement(cat.icon, { className: "w-12 h-12" })}
                </div>
                <span className="font-black text-[11px] uppercase tracking-[0.3em] text-white/40 group-hover:text-white">{cat.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* VUE : IA */}
        {activeCategory === 'ai' && (
          <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in">
            <div className="text-center">
              <h2 className="text-4xl font-black italic uppercase tracking-tighter">Assistant Intelligent</h2>
              <p className="text-white/40 text-sm mt-2 uppercase tracking-[0.3em]">Cerveaux & Moteurs de recherche</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-10 rounded-[4rem] space-y-10 shadow-2xl backdrop-blur-xl">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="relative w-full md:w-72">
                  <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-4 mb-2 block">Source</label>
                  <select value={selectedAI.id} onChange={(e) => setSelectedAI(AI_PROVIDERS.find(p => p.id === e.target.value))} className="w-full bg-black/40 border border-white/10 rounded-3xl p-5 appearance-none font-bold text-lg outline-none focus:border-white/20">
                    {AI_PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-5 top-[3.2rem] w-5 h-5 text-white/20 pointer-events-none" />
                </div>
                <div className="flex-1 relative">
                  <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-4 mb-2 block">Prompt</label>
                  <input type="text" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && executeAiPrompt()} placeholder="Posez votre question..." className="w-full bg-black/40 border border-white/10 rounded-3xl p-5 pr-32 text-xl font-medium outline-none focus:border-white/20" />
                  <div className="absolute right-2 top-[2.5rem] flex gap-2">
                    <button onClick={() => { if (isDictatingAI) recognitionRef.current?.stop(); else { setIsDictatingAI(true); recognitionRef.current?.start(); } }} className={`p-3 rounded-2xl transition-all ${isDictatingAI ? 'bg-red-600 animate-pulse text-white shadow-lg shadow-red-600/30' : 'bg-white/5 text-white/40'}`}>
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
                  <button key={ai.id} onClick={() => setSelectedAI(ai)} className={`p-6 rounded-[2rem] border transition-all ${selectedAI.id === ai.id ? 'bg-white/10 border-white/30 scale-105 shadow-xl' : 'bg-black/20 border-white/5 opacity-60 hover:opacity-100'}`}>
                    <img src={ai.icon} className="w-12 h-12 mx-auto rounded-2xl mb-4 shadow-xl" alt="" />
                    <span className="text-[10px] font-black uppercase text-center block tracking-tighter">{ai.name.split(' ')[1] || ai.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VUE : NOTES */}
        {activeCategory === 'notes' && (
          <div className="space-y-12 animate-in fade-in max-w-5xl mx-auto pb-20">
            <div className="bg-white/5 border border-white/10 p-10 rounded-[3.5rem] space-y-6 shadow-2xl backdrop-blur-xl">
              <h3 className="text-xl font-black italic uppercase flex items-center gap-3"><StickyNote style={{ color: profile.color }} /> Blocs-Notes Cloud</h3>
              <textarea value={noteInput} onChange={(e) => setNoteInput(e.target.value)} placeholder="Écrivez ou dictez votre note ici..." className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 min-h-[150px] outline-none text-xl font-medium focus:border-white/20 transition-all" />
              <div className="flex gap-4">
                <button onClick={() => { if (isDictatingAI) recognitionRef.current?.stop(); else { setIsDictatingAI(true); recognitionRef.current?.start(); } }} className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest ${isDictatingAI ? 'bg-red-600 animate-pulse text-white' : 'bg-white/5 hover:bg-white/10'}`}>DICTÉE</button>
                <button onClick={async () => { if (!user || !noteInput.trim()) return; await addDoc(collection(db, 'artifacts', APP_INTERNAL_ID, 'users', user.uid, 'notes'), { text: noteInput, date: new Date().toLocaleString('fr-FR'), createdAt: serverTimestamp() }); setNoteInput(''); }} className="flex-1 bg-white text-black py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all shadow-xl">ENREGISTRER</button>
              </div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {notes.map(note => (
                <div key={note.id} className="bg-yellow-100 text-black p-8 rounded-[2.5rem] relative group shadow-2xl transition-all hover:-rotate-1">
                  <p className="font-bold text-lg mb-6 leading-tight">{note.text}</p>
                  <div className="flex justify-between items-center opacity-30 text-[9px] font-black uppercase tracking-widest">
                    <span>{note.date}</span>
                    <button onClick={() => deleteDoc(doc(db, 'artifacts', APP_INTERNAL_ID, 'users', user.uid, 'notes', note.id))} className="p-2 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VUE : PARAMÈTRES */}
        {activeCategory === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-right-8 pb-20">
            <section className="bg-white/5 border border-white/10 p-10 rounded-[3.5rem] space-y-10 shadow-2xl backdrop-blur-xl">
              <h2 className="text-2xl font-black italic uppercase flex items-center gap-4"><Settings style={{ color: profile.color }} /> Configuration Pilote</h2>
              <div className="space-y-10">
                <div>
                  <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-4 mb-2 block">Identification</label>
                  <input type="text" value={profile.name} onChange={(e) => updateProfile({ name: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-2xl font-black outline-none focus:border-white/20" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-4 mb-2 block">Mode d'affichage</label>
                  <div className="grid grid-cols-2 gap-3 p-2 bg-black/40 rounded-3xl border border-white/5">
                    <button onClick={() => updateProfile({ openMode: 'tab' })} className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${profile.openMode === 'tab' ? 'bg-white text-black shadow-xl' : 'text-white/40 hover:bg-white/5'}`}>Onglet</button>
                    <button onClick={() => updateProfile({ openMode: 'fullscreen' })} className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${profile.openMode === 'fullscreen' ? 'bg-red-600 text-white shadow-xl shadow-red-900/20' : 'text-white/40 hover:bg-white/5'}`}>Plein écran</button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-4 mb-2 block">Couleur Signature</label>
                  <div className="flex gap-4 flex-wrap">
                    {THEME_COLORS.map(c => <button key={c.hex} onClick={() => updateProfile({ color: c.hex })} className={`w-14 h-14 rounded-2xl transition-all ${profile.color === c.hex ? 'scale-110 ring-4 ring-white/20' : 'opacity-40 hover:opacity-80'}`} style={{ backgroundColor: c.hex }} />)}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* VUE APPLICATIONS PAR CATÉGORIE */}
        {activeCategory !== 'home' && activeCategory !== 'settings' && activeCategory !== 'ai' && activeCategory !== 'notes' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 animate-in fade-in pb-20">
            {filteredApps.map((app, idx) => (
              <button key={idx} onClick={() => handleAppLaunch(app.url)} className="group flex flex-col items-center justify-center aspect-[4/3] rounded-[2.5rem] bg-white/[0.03] border border-white/5 hover:border-white/20 hover:bg-white/[0.08] transition-all relative overflow-hidden shadow-xl active:scale-95">
                <div className="w-16 h-16 bg-[#0a0a0a] rounded-2xl mb-4 flex items-center justify-center p-4 border border-white/5 group-hover:scale-105 transition-transform duration-300 shadow-2xl">
                  <img src={app.icon} className="w-full h-full object-contain filter drop-shadow-lg" alt="" onError={(e) => e.target.src = getIcon(new URL(app.url).hostname)} />
                </div>
                <div className="flex items-center gap-1 overflow-hidden w-full px-4 justify-center">
                  <span className="font-black text-[10px] uppercase text-white/30 group-hover:text-white truncate tracking-tighter">{app.name}</span>
                  {profile.openMode === 'fullscreen' && <Maximize className="w-2.5 h-2.5 text-white/20" />}
                </div>
                {app.id && <button onClick={(e) => { e.stopPropagation(); deleteDoc(doc(db, 'artifacts', APP_INTERNAL_ID, 'users', user.uid, 'apps', app.id)); }} className="absolute -top-1 -right-1 p-2.5 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-xl z-10"><Trash2 className="w-4 h-4" /></button>}
              </button>
            ))}
            <button onClick={() => setShowAddModal(true)} className="flex flex-col items-center justify-center aspect-[4/3] rounded-[2.5rem] border-2 border-dashed border-white/5 hover:border-white/20 text-white/10 hover:text-white transition-all active:scale-95">
              <Plus className="w-8 h-8 mb-2" />
              <span className="font-black text-[9px] uppercase tracking-widest">Ajouter</span>
            </button>
          </div>
        )}
      </main>

      {/* BOUTON FLOTTANT PLEIN ÉCRAN */}
      <button onClick={() => window.location.href = `https://www.youtube.com/redirect?q=${encodeURIComponent(window.location.href)}`} className="fixed bottom-8 right-8 p-5 rounded-[2rem] border border-white/10 shadow-2xl z-[100] hover:scale-110 active:scale-90 transition-all bg-white/5 group overflow-hidden backdrop-blur-3xl">
        <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity" style={{ backgroundColor: profile.color }} />
        <Maximize className="w-6 h-6 text-white/40 group-hover:text-white relative z-10" />
      </button>

      {/* MODAL AJOUT */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl flex items-center justify-center z-[100] p-6 animate-in zoom-in duration-200">
          <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-lg rounded-[3.5rem] p-10 space-y-8 shadow-2xl">
            <h2 className="text-2xl font-black italic uppercase tracking-widest text-center">Nouveau Raccourci</h2>
            <div className="space-y-4">
              <input type="text" value={newApp.name} onChange={(e) => setNewApp({...newApp, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-lg outline-none focus:border-red-500 font-bold" placeholder="Nom du service" />
              <input type="text" value={newApp.url} onChange={(e) => setNewApp({...newApp, url: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-lg outline-none focus:border-red-500 font-bold" placeholder="URL (ex: google.com)" />
            </div>
            <div className="flex gap-4">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-5 rounded-3xl font-black text-xs bg-white/5 uppercase tracking-widest">Annuler</button>
              <button onClick={async () => { if (!user || !newApp.name || !newApp.url) return; const icon = getIcon(newApp.url.includes('http') ? new URL(newApp.url).hostname : newApp.url); await addDoc(collection(db, 'artifacts', APP_INTERNAL_ID, 'users', user.uid, 'apps'), { ...newApp, icon, createdAt: serverTimestamp() }); setShowAddModal(false); setNewApp({ name: '', url: '', category: activeCategory !== 'home' ? activeCategory : 'streaming' }); }} className="flex-1 py-5 rounded-3xl font-black text-xs bg-red-600 uppercase shadow-xl shadow-red-900/30 tracking-widest">Valider</button>
            </div>
          </div>
        </div>
      )}

      <footer className="py-6 text-center opacity-5 select-none pointer-events-none">
        <p className="text-[8px] font-black uppercase tracking-[1.5em] italic">Tesla OS Immersive • v14.5 • Cloud Secure</p>
      </footer>
    </div>
  );
};

export default App;
