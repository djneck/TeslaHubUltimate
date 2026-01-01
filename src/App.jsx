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
  Folder,
  Pin,
  Download,
  Bell,
  Wifi,
  WifiOff,
  GripVertical,
  MessageCircle,
  MessageSquare,
  Coffee,
  Car,
  LayoutGrid,
  ArrowRight,
  ExternalLink,
  Edit2
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
  console.error('Firebase Initialization Error:', e);
}

const APP_INTERNAL_ID = import.meta.env.VITE_APP_ID || 'media-hub-tesla-hub-v14-5';

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
  { name: 'Gold', hex: '#D4AF37' }
];

const NOTE_COLORS = [
  { name: 'Jaune', hex: '#FEF3C7' },
  { name: 'Bleu', hex: '#DBEAFE' },
  { name: 'Vert', hex: '#DCFCE7' },
  { name: 'Rose', hex: '#FCE7F3' },
  { name: 'Violet', hex: '#EDE9FE' }
];

const getIcon = (domain) => `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;

const buildApp = (name, url) => {
  const domain = new URL(url).hostname;
  return { name, url, icon: getIcon(domain) };
};

const normalizeUrl = (raw) => {
  if (!raw) return null;
  const trimmed = raw.trim();
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withScheme);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
};

const downloadFile = (filename, content, type) => {
  const blob = new Blob([content], { type });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
};

const DEFAULT_APPS = {
  streaming: [
    buildApp('Netflix', 'https://www.netflix.com'),
    buildApp('YouTube', 'https://www.youtube.com'),
    buildApp('Disney+', 'https://www.disneyplus.com'),
    buildApp('Prime Video', 'https://www.primevideo.com'),
    buildApp('OQEE Free', 'https://oqee.tv'),
    buildApp('MyCanal', 'https://www.canalplus.com'),
    buildApp('Crunchyroll', 'https://www.crunchyroll.com'),
    buildApp('Twitch', 'https://www.twitch.tv')
  ],
  music: [
    buildApp('Spotify', 'https://open.spotify.com'),
    buildApp('Deezer', 'https://www.deezer.com'),
    buildApp('Apple Music', 'https://music.apple.com'),
    buildApp('SoundCloud', 'https://soundcloud.com'),
    buildApp('Mixcloud', 'https://www.mixcloud.com'),
    buildApp('TuneIn', 'https://tunein.com')
  ],
  social: [
    buildApp('WhatsApp', 'https://web.whatsapp.com'),
    buildApp('Messenger', 'https://www.messenger.com'),
    buildApp('Teams', 'https://teams.microsoft.com'),
    buildApp('Discord', 'https://discord.com'),
    buildApp('Telegram', 'https://web.telegram.org'),
    buildApp('Google Meet', 'https://meet.google.com'),
    buildApp('Slack', 'https://slack.com')
  ],
  games: [
    buildApp('Xbox Cloud', 'https://www.xbox.com/play'),
    buildApp('GeForce Now', 'https://play.geforcenow.com'),
    buildApp('Steam Web', 'https://store.steampowered.com'),
    buildApp('Chess.com', 'https://www.chess.com'),
    buildApp('Roblox', 'https://www.roblox.com'),
    buildApp('Twitch Games', 'https://www.twitch.tv/directory/game/Games')
  ],
  travel: [
    buildApp('Waze', 'https://www.waze.com/live-map'),
    buildApp('ABRP', 'https://abetterrouteplanner.com'),
    buildApp('Google Maps', 'https://www.google.com/maps'),
    buildApp('PlugShare', 'https://www.plugshare.com'),
    buildApp('ChargeMap', 'https://chargemap.com')
  ],
  food: [
    buildApp('TripAdvisor', 'https://www.tripadvisor.fr'),
    buildApp('TheFork', 'https://www.thefork.fr'),
    buildApp('Uber Eats', 'https://www.ubereats.com'),
    buildApp('Deliveroo', 'https://deliveroo.fr')
  ],
  icloud: [
    buildApp('iCloud Mail', 'https://www.icloud.com/mail'),
    buildApp('Photos', 'https://www.icloud.com/photos'),
    buildApp('Find My', 'https://www.icloud.com/find'),
    buildApp('iCloud Notes', 'https://www.icloud.com/notes'),
    buildApp('iCloud Drive', 'https://www.icloud.com/iclouddrive')
  ],
  tools: [
    buildApp('Chrome Remote', 'https://remotedesktop.google.com/access'),
    buildApp('Windows 365', 'https://windows365.microsoft.com'),
    buildApp('Notion', 'https://www.notion.so'),
    buildApp('Trello', 'https://trello.com'),
    buildApp('Google Drive', 'https://drive.google.com')
  ],
  ai: [
    buildApp('ChatGPT', 'https://chatgpt.com'),
    buildApp('Gemini', 'https://gemini.google.com/app'),
    buildApp('Claude AI', 'https://claude.ai'),
    buildApp('Perplexity', 'https://www.perplexity.ai'),
    buildApp('Hume Voice', 'https://demo.hume.ai/')
  ],
  tesla: [
    buildApp('TezLab', 'https://tezlabapp.com'),
    buildApp('Tessie', 'https://www.tessie.com'),
    buildApp('TeslaFi', 'https://www.teslafi.com'),
    buildApp('Tesla Shop', 'https://shop.tesla.com'),
    buildApp('Tesla Account', 'https://www.tesla.com/teslaaccount')
  ]
};

const AI_PROVIDERS = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    url: 'https://gemini.google.com/app?q=',
    icon: getIcon('gemini.google.com')
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    url: 'https://chatgpt.com/?q=',
    icon: getIcon('chatgpt.com')
  },
  {
    id: 'claude',
    name: 'Anthropic Claude',
    url: 'https://claude.ai/new?q=',
    icon: getIcon('claude.ai')
  },
  {
    id: 'google',
    name: 'Google Search',
    url: 'https://www.google.com/search?q=',
    icon: getIcon('google.com')
  },
  {
    id: 'grok',
    name: 'xAI Grok',
    url: 'https://x.com/i/grok?q=',
    icon: getIcon('x.com')
  },
  {
    id: 'hume',
    name: 'Hume Voice',
    url: 'https://demo.hume.ai/',
    voiceUrl: 'https://demo.hume.ai/',
    icon: getIcon('demo.hume.ai')
  }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [activeCategory, setActiveCategory] = useState('home');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBookmarkInfo, setShowBookmarkInfo] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cloudStatus, setCloudStatus] = useState({ auth: 'loading', db: 'unknown' });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState(null);

  const [homeSearch, setHomeSearch] = useState('');
  const [quickUrl, setQuickUrl] = useState('');

  const [aiPrompt, setAiPrompt] = useState('');
  const [selectedAI, setSelectedAI] = useState(AI_PROVIDERS[0]);
  const [isDictating, setIsDictating] = useState(false);
  const [dictationTarget, setDictationTarget] = useState('ai');

  const [profile, setProfile] = useState({
    name: 'Pilote',
    color: '#E82127',
    openMode: 'tab'
  });

  const [customLinks, setCustomLinks] = useState([]);
  const [collections, setCollections] = useState([]);
  const [notes, setNotes] = useState([]);
  const [noteInput, setNoteInput] = useState('');
  const [noteTagsInput, setNoteTagsInput] = useState('');
  const [noteColor, setNoteColor] = useState(NOTE_COLORS[0].hex);
  const [noteReminder, setNoteReminder] = useState('');
  const [notesSearch, setNotesSearch] = useState('');
  const [notesMode, setNotesMode] = useState('compose');
  const [newApp, setNewApp] = useState({ name: '', url: '', category: 'streaming', pinned: false });
  const [appIconUrl, setAppIconUrl] = useState('');
  const [iconSearchQuery, setIconSearchQuery] = useState('');
  const [editingApp, setEditingApp] = useState(null);
  const [allSortMode, setAllSortMode] = useState('category');
  const [draggingAppId, setDraggingAppId] = useState(null);

  const recognitionRef = useRef(null);
  const dictationTargetRef = useRef('ai');

  useEffect(() => {
    dictationTargetRef.current = dictationTarget;
  }, [dictationTarget]);

  useEffect(() => {
    if (!auth) {
      setCloudStatus((prev) => ({ ...prev, auth: 'error' }));
      setLoading(false);
      return;
    }
    const login = async () => {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        setError('Connexion Cloud restreinte');
        setCloudStatus((prev) => ({ ...prev, auth: 'error' }));
      }
    };
    login();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setCloudStatus((prev) => ({ ...prev, auth: u ? 'ready' : 'error' }));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const basePath = ['artifacts', APP_INTERNAL_ID, 'users', user.uid];

    const unsubProfile = onSnapshot(
      doc(db, ...basePath, 'settings', 'profile'),
      (d) => {
        if (d.exists()) setProfile((prev) => ({ ...prev, ...d.data() }));
        setCloudStatus((prev) => ({ ...prev, db: 'ok' }));
      },
      () => setCloudStatus((prev) => ({ ...prev, db: 'error' }))
    );

    const unsubCollections = onSnapshot(
      collection(db, ...basePath, 'collections'),
      (s) => {
        setCollections(s.docs.map((d) => ({ id: d.id, ...d.data() })));
        setCloudStatus((prev) => ({ ...prev, db: 'ok' }));
      },
      () => setCloudStatus((prev) => ({ ...prev, db: 'error' }))
    );

    const unsubApps = onSnapshot(
      collection(db, ...basePath, 'apps'),
      (s) => {
        setCustomLinks(s.docs.map((d) => ({ id: d.id, ...d.data() })));
        setCloudStatus((prev) => ({ ...prev, db: 'ok' }));
      },
      () => setCloudStatus((prev) => ({ ...prev, db: 'error' }))
    );

    const unsubNotes = onSnapshot(
      collection(db, ...basePath, 'notes'),
      (s) => {
        setNotes(s.docs.map((d) => ({ id: d.id, ...d.data() })));
        setCloudStatus((prev) => ({ ...prev, db: 'ok' }));
      },
      () => setCloudStatus((prev) => ({ ...prev, db: 'error' }))
    );

    return () => {
      unsubProfile();
      unsubCollections();
      unsubApps();
      unsubNotes();
    };
  }, [user]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition && !recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.lang = 'fr-FR';
      recognition.onresult = (e) => {
        let transcript = '';
        for (let i = e.resultIndex; i < e.results.length; i += 1) {
          transcript += e.results[i][0].transcript;
        }
        if (dictationTargetRef.current === 'ai') setAiPrompt(transcript);
        else setNoteInput(transcript);
      };
      recognition.onend = () => setIsDictating(false);
      recognitionRef.current = recognition;
    }
    return () => {
      clearInterval(timer);
      recognitionRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    const handler = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const neonGlow = (color, size = 18) => ({
    boxShadow: `0 0 ${size}px ${color}66, 0 0 ${size * 1.8}px ${color}33`,
    borderColor: `${color}80`
  });

  const startDictation = (target) => {
    if (!recognitionRef.current) return;
    if (isDictating) {
      recognitionRef.current.stop();
      return;
    }
    setDictationTarget(target);
    setIsDictating(true);
    try {
      recognitionRef.current.start();
    } catch {
      setIsDictating(false);
    }
  };

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  };

  const handleAppLaunch = (url) => {
    if (!url) return;
    if (profile.openMode === 'fullscreen') {
      window.location.href = url;
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const executeAiPrompt = () => {
    if (!aiPrompt.trim()) return;
    if (selectedAI.id === 'hume') {
      handleAppLaunch(selectedAI.voiceUrl || selectedAI.url);
      return;
    }
    const finalUrl = `${selectedAI.url}${encodeURIComponent(aiPrompt)}`;
    handleAppLaunch(finalUrl);
  };

  const updateProfile = async (updates) => {
    setProfile((prev) => ({ ...prev, ...updates }));
    if (!user || !db) return;
    await setDoc(doc(db, 'artifacts', APP_INTERNAL_ID, 'users', user.uid, 'settings', 'profile'), updates, { merge: true });
  };

  const createCollection = async (name) => {
    if (!name.trim()) return;
    if (!user || !db) {
      setError('Cloud indisponible pour créer un dossier.');
      return;
    }
    await addDoc(collection(db, 'artifacts', APP_INTERNAL_ID, 'users', user.uid, 'collections'), {
      name: name.trim(),
      createdAt: serverTimestamp()
    });
  };

  const deleteCollection = async (collectionId) => {
    if (!user || !db) return;
    if (!window.confirm('Supprimer ce dossier ? Les raccourcis seront déplacés en Perso.')) return;
    const categoryId = `collection:${collectionId}`;
    const affected = customLinks.filter((app) => app.category === categoryId);
    setCustomLinks((prev) => prev.map((app) => (app.category === categoryId ? { ...app, category: 'personal' } : app)));
    for (const app of affected) {
      await setDoc(doc(db, 'artifacts', APP_INTERNAL_ID, 'users', user.uid, 'apps', app.id), { category: 'personal' }, { merge: true });
    }
    await deleteDoc(doc(db, 'artifacts', APP_INTERNAL_ID, 'users', user.uid, 'collections', collectionId));
  };

  const togglePin = async (app) => {
    setCustomLinks((prev) => prev.map((item) => (item.id === app.id ? { ...item, pinned: !item.pinned } : item)));
    if (!user || !db) return;
    await setDoc(doc(db, 'artifacts', APP_INTERNAL_ID, 'users', user.uid, 'apps', app.id), { pinned: !app.pinned }, { merge: true });
  };

  const deleteApp = async (appId) => {
    if (!user || !db) return;
    if (!window.confirm('Supprimer ce raccourci ?')) return;
    setCustomLinks((prev) => prev.filter((app) => app.id !== appId));
    await deleteDoc(doc(db, 'artifacts', APP_INTERNAL_ID, 'users', user.uid, 'apps', appId));
  };

  const deleteNote = async (noteId) => {
    if (!user || !db) return;
    if (!window.confirm('Supprimer cette note ?')) return;
    setNotes((prev) => prev.filter((note) => note.id !== noteId));
    await deleteDoc(doc(db, 'artifacts', APP_INTERNAL_ID, 'users', user.uid, 'notes', noteId));
  };

  const openAddModal = () => {
    setEditingApp(null);
    setAppIconUrl('');
    setIconSearchQuery('');
    setNewApp({ name: '', url: '', category: 'streaming', pinned: false });
    setError(null);
    setShowAddModal(true);
  };

  const openEditModal = (app) => {
    setEditingApp(app);
    setNewApp({ name: app.name || '', url: app.url || '', category: app.category || 'streaming', pinned: !!app.pinned });
    setAppIconUrl(app.icon || '');
    setIconSearchQuery(app.name || '');
    setError(null);
    setShowAddModal(true);
  };

  const openImageSearch = (query) => {
    const finalQuery = query || newApp.name || 'app icon';
    const url = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(finalQuery)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const saveApp = async () => {
    if (!user || !db) {
      setError('Cloud indisponible pour créer un raccourci.');
      return;
    }
    if (!newApp.name || !newApp.url) return;
    const validated = normalizeUrl(newApp.url);
    if (!validated) {
      setError('URL invalide. Ex: https://exemple.com');
      return;
    }
    const icon = appIconUrl.trim() || getIcon(new URL(validated).hostname);
    const categoryCount = customLinks.filter((app) => app.category === newApp.category && app.id !== editingApp?.id).length;
    const order = editingApp && editingApp.category === newApp.category ? editingApp.order ?? categoryCount : categoryCount;
    const payload = {
      name: newApp.name.trim(),
      url: validated,
      icon,
      category: newApp.category,
      pinned: newApp.pinned,
      order,
      updatedAt: serverTimestamp()
    };
    if (editingApp) {
      await setDoc(doc(db, 'artifacts', APP_INTERNAL_ID, 'users', user.uid, 'apps', editingApp.id), payload, { merge: true });
    } else {
      await addDoc(collection(db, 'artifacts', APP_INTERNAL_ID, 'users', user.uid, 'apps'), { ...payload, createdAt: serverTimestamp() });
    }
    setShowAddModal(false);
    setError(null);
    setEditingApp(null);
    setAppIconUrl('');
    setIconSearchQuery('');
    setNewApp({ name: '', url: '', category: newApp.category, pinned: false });
  };

  const handleGoogleSearch = () => {
    if (!homeSearch.trim()) return;
    const url = `https://www.google.com/search?q=${encodeURIComponent(homeSearch)}`;
    handleAppLaunch(url);
  };

  const handleQuickUrlLaunch = () => {
    const validated = normalizeUrl(quickUrl);
    if (!validated) {
      setError('URL invalide. Ex: https://exemple.com');
      return;
    }
    handleAppLaunch(validated);
  };

  const resolveAppIcon = (appItem) => {
    if (appItem?.icon) return appItem.icon;
    try {
      return getIcon(new URL(appItem.url).hostname);
    } catch {
      return getIcon('google.com');
    }
  };

  const categories = [
    { id: 'all', label: 'All', icon: <LayoutGrid /> },
    { id: 'ai', label: 'IA', icon: <Brain /> },
    { id: 'streaming', label: 'Médias', icon: <Play /> },
    { id: 'music', label: 'Musique', icon: <Music /> },
    { id: 'social', label: 'Social', icon: <MessageSquare /> },
    { id: 'games', label: 'Jeux', icon: <Gamepad2 /> },
    { id: 'travel', label: 'Voyage', icon: <Navigation /> },
    { id: 'food', label: 'Resto', icon: <Coffee /> },
    { id: 'icloud', label: 'iCloud', icon: <Cloud /> },
    { id: 'tools', label: 'Remote', icon: <Monitor /> },
    { id: 'tesla', label: 'Tesla', icon: <Car /> },
    { id: 'notes', label: 'Notes', icon: <StickyNote /> },
    { id: 'personal', label: 'Perso', icon: <Briefcase /> }
  ];

  const collectionCategories = collections.map((c) => ({
    id: `collection:${c.id}`,
    label: c.name,
    icon: <Folder />
  }));

  const navigationCategories = [...categories, ...collectionCategories];

  const categoryLabelMap = useMemo(() => {
    const map = {};
    categories.forEach((cat) => {
      map[cat.id] = cat.label;
    });
    collections.forEach((col) => {
      map[`collection:${col.id}`] = col.name;
    });
    return map;
  }, [categories, collections]);

  const allApps = useMemo(() => {
    const list = [];
    Object.keys(DEFAULT_APPS).forEach((cat) => {
      DEFAULT_APPS[cat].forEach((appItem) => {
        list.push({
          id: `default-${cat}-${appItem.name}`,
          ...appItem,
          category: cat,
          isDefault: true
        });
      });
    });
    customLinks.forEach((appItem) => {
      list.push({ ...appItem, isDefault: false });
    });
    return list;
  }, [customLinks]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return allApps
      .filter((appItem) => (appItem.name || '').toLowerCase().includes(query))
      .slice(0, 8);
  }, [allApps, searchQuery]);

  const filteredApps = useMemo(() => {
    const custom = customLinks
      .filter((appItem) => appItem.category === activeCategory)
      .sort((a, b) => {
        const pinDelta = (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
        if (pinDelta !== 0) return pinDelta;
        const orderDelta = (a.order ?? 0) - (b.order ?? 0);
        if (orderDelta !== 0) return orderDelta;
        return (a.name || '').localeCompare(b.name || '');
      });
    const combined = [...custom, ...(DEFAULT_APPS[activeCategory] || [])];
    if (!searchQuery) return combined;
    const query = searchQuery.toLowerCase();
    return combined.filter((appItem) => appItem.name.toLowerCase().includes(query));
  }, [activeCategory, customLinks, searchQuery]);

  const filteredNotes = useMemo(() => {
    if (!notesSearch) return notes;
    const query = notesSearch.toLowerCase();
    return notes.filter((note) => {
      const textMatch = (note.text || '').toLowerCase().includes(query);
      const tagMatch = (note.tags || []).some((tag) => tag.toLowerCase().includes(query));
      return textMatch || tagMatch;
    });
  }, [notes, notesSearch]);

  const overdueReminders = useMemo(() => {
    return filteredNotes.filter((note) => note.reminderAt && new Date(note.reminderAt) <= new Date());
  }, [filteredNotes]);

  const filteredAllApps = useMemo(() => {
    if (!searchQuery.trim()) return allApps;
    const query = searchQuery.toLowerCase();
    return allApps.filter((appItem) => (appItem.name || '').toLowerCase().includes(query));
  }, [allApps, searchQuery]);

  const groupedAllApps = useMemo(() => {
    const grouped = {};
    filteredAllApps.forEach((appItem) => {
      const label = categoryLabelMap[appItem.category] || appItem.category || 'Autres';
      if (!grouped[label]) grouped[label] = [];
      grouped[label].push(appItem);
    });
    return Object.keys(grouped)
      .sort((a, b) => a.localeCompare(b))
      .map((label) => ({
        label,
        apps: grouped[label].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      }));
  }, [filteredAllApps, categoryLabelMap]);

  const allAppsSorted = useMemo(() => {
    const sorted = [...filteredAllApps].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    if (allSortMode === 'za') return sorted.reverse();
    return sorted;
  }, [filteredAllApps, allSortMode]);

  const notesPreview = useMemo(() => filteredNotes.slice(0, 6), [filteredNotes]);

  const handleDrop = async (targetId) => {
    if (activeCategory === 'all') return;
    if (!draggingAppId || draggingAppId === targetId) return;
    const categoryApps = customLinks.filter((appItem) => appItem.category === activeCategory);
    const ordered = [...categoryApps].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const fromIndex = ordered.findIndex((appItem) => appItem.id === draggingAppId);
    const toIndex = ordered.findIndex((appItem) => appItem.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;
    const next = [...ordered];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    const updates = next.map((appItem, index) => ({ ...appItem, order: index }));
    setCustomLinks((prev) => prev.map((appItem) => updates.find((u) => u.id === appItem.id) || appItem));
    if (!user || !db) return;
    for (const appItem of updates) {
      await setDoc(doc(db, 'artifacts', APP_INTERNAL_ID, 'users', user.uid, 'apps', appItem.id), { order: appItem.order }, { merge: true });
    }
    setDraggingAppId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-red-600 animate-spin mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 italic">Tesla Hub Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-red-600/30 overflow-hidden flex flex-col">
      <header className="px-6 sm:px-8 py-5 sm:py-6 flex flex-wrap gap-4 items-center justify-between relative z-50 border-b border-white/5 bg-black/40 backdrop-blur-3xl">
        <div className="flex items-center gap-4 sm:gap-6">
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
              <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest">{profile.name} • {cloudStatus.db === 'ok' ? 'Cloud Active' : 'Cloud Local'}</p>
            </div>
          </div>
        </div>
        <div className="flex-1 w-full sm:w-auto max-w-md sm:mx-6 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <input
            type="text"
            placeholder="Rechercher une app..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchOpen(true)}
            onBlur={() => setTimeout(() => setIsSearchOpen(false), 150)}
            className="w-full bg-white/5 border border-white/5 rounded-2xl py-2.5 pl-11 pr-4 outline-none focus:border-white/20 transition-all text-sm font-medium backdrop-blur-md"
          />
          {isSearchOpen && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 mt-3 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
              {searchResults.map((appItem) => (
                <button
                  key={`${appItem.id}-${appItem.name}`}
                  onMouseDown={() => {
                    handleAppLaunch(appItem.url);
                    setSearchQuery('');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-left"
                >
                  <img src={resolveAppIcon(appItem)} alt="" className="w-8 h-8 rounded-lg bg-white/10 p-1" onError={(e) => (e.target.src = getIcon('google.com'))} />
                  <div className="flex-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-white/70">{appItem.name}</p>
                    <p className="text-[9px] uppercase tracking-widest text-white/30">{categoryLabelMap[appItem.category] || appItem.category}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/30" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-right mr-2 sm:mr-4 border-r border-white/10 pr-3 sm:pr-4">
            <span className="text-xl font-mono italic tracking-widest leading-none">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/5 border border-white/10 text-[9px] uppercase font-black tracking-widest">
            {cloudStatus.db === 'ok' && isOnline ? (
              <Wifi className="w-3 h-3 text-green-500" />
            ) : (
              <WifiOff className="w-3 h-3 text-yellow-400" />
            )}
            {cloudStatus.db === 'ok' && isOnline ? 'Cloud OK' : 'Offline'}
          </div>
          {installPrompt && (
            <button onClick={handleInstall} className="px-4 py-2 rounded-2xl bg-white text-black text-[9px] uppercase font-black tracking-widest">
              Installer
            </button>
          )}
          <button onClick={toggleFullscreen} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5">
            <Maximize className="w-6 h-6 text-white/40" />
          </button>
          <button onClick={() => setActiveCategory('settings')} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5">
            <Settings className="w-6 h-6 text-white/40" />
          </button>
        </div>
      </header>

      {error && (
        <div className="px-6 sm:px-8 py-3 bg-red-600/10 text-red-400 text-xs font-semibold uppercase tracking-widest">
          {error}
        </div>
      )}

      <nav className="px-6 sm:px-8 py-4 flex gap-3 overflow-x-auto no-scrollbar relative z-50 bg-black/20">
        <button
          onClick={() => setActiveCategory('home')}
          className={`flex items-center gap-2 px-6 py-4 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest ${
            activeCategory === 'home' ? 'bg-white text-black scale-105 shadow-2xl' : 'bg-white/5 text-white/40 hover:bg-white/10'
          }`}
          style={activeCategory === 'home' ? neonGlow(profile.color, 14) : undefined}
        >
          <Home className="w-4 h-4" /> Accueil
        </button>
        {navigationCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-3 px-6 py-4 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${
              activeCategory === cat.id ? 'bg-white text-black scale-105 shadow-xl' : 'bg-white/5 text-white/40 hover:bg-white/10'
            }`}
            style={activeCategory === cat.id ? neonGlow(profile.color, 14) : undefined}
          >
            <span style={{ filter: `drop-shadow(0 0 6px ${profile.color})` }}>{React.cloneElement(cat.icon, { className: 'w-4 h-4' })}</span>
            {cat.label}
          </button>
        ))}
      </nav>

      <main className="flex-1 relative z-10 overflow-y-auto p-6 sm:p-8 lg:p-12 no-scrollbar">
        {activeCategory === 'home' && (
          <div className="relative animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-10">
            <button onClick={() => setShowBookmarkInfo(true)} className="absolute -top-4 right-0 p-3 bg-white/5 hover:bg-white/10 rounded-full text-white/20 hover:text-yellow-400 group">
              <Star className="w-4 h-4 group-hover:fill-current" />
            </button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 space-y-4 backdrop-blur-2xl">
                <p className="text-[10px] uppercase font-black tracking-widest text-white/40">Recherche Google</p>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input
                    type="text"
                    value={homeSearch}
                    onChange={(e) => setHomeSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGoogleSearch()}
                    placeholder="Tapez votre recherche..."
                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-11 pr-14 text-sm font-semibold outline-none"
                  />
                  <button
                    onClick={handleGoogleSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white text-black rounded-xl hover:scale-105 transition-all"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 space-y-4 backdrop-blur-2xl">
                <p className="text-[10px] uppercase font-black tracking-widest text-white/40">Quick URL</p>
                <div className="relative">
                  <ExternalLink className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input
                    type="text"
                    value={quickUrl}
                    onChange={(e) => setQuickUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleQuickUrlLaunch()}
                    placeholder="https://..."
                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-11 pr-14 text-sm font-semibold outline-none"
                  />
                  <button
                    onClick={handleQuickUrlLaunch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white text-black rounded-xl hover:scale-105 transition-all"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 sm:gap-8">
              {navigationCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className="group relative flex flex-col items-center justify-center aspect-square rounded-[3.5rem] bg-white/[0.02] border border-white/5 hover:border-white/20 transition-all backdrop-blur-2xl hover:scale-105 active:scale-95 overflow-hidden shadow-2xl"
                  style={neonGlow(profile.color, 16)}
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity" style={{ backgroundColor: profile.color }} />
                  <div
                    className="w-24 h-24 rounded-[2rem] mb-6 flex items-center justify-center shadow-2xl transition-all group-hover:scale-110"
                    style={{ backgroundColor: `${profile.color}15`, color: profile.color }}
                  >
                    {React.cloneElement(cat.icon, { className: 'w-12 h-12', style: { filter: `drop-shadow(0 0 10px ${profile.color})` } })}
                  </div>
                  <span className="font-black text-[11px] uppercase tracking-[0.3em] text-white/40 group-hover:text-white transition-colors text-center">
                    {cat.label}
                  </span>
                </button>
              ))}
            </div>
            {showBookmarkInfo && (
              <div className="mt-8 p-6 bg-yellow-400/10 border border-yellow-400/20 rounded-[2rem] flex items-center justify-between animate-in zoom-in">
                <div className="flex items-center gap-4">
                  <Star className="text-yellow-400 fill-current w-6 h-6" />
                  <p className="text-sm font-bold text-yellow-400/80 uppercase">Ajoutez cette page aux favoris de votre navigateur Tesla.</p>
                </div>
                <button onClick={() => setShowBookmarkInfo(false)} className="p-2 hover:bg-white/5 rounded-full">
                  <X className="w-4 h-4" />
                </button>
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
            <div className="bg-white/5 border border-white/10 p-8 sm:p-10 rounded-[3rem] sm:rounded-[4rem] backdrop-blur-3xl shadow-2xl space-y-10 border-white/20">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="relative w-full md:w-72">
                  <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-4 mb-2 block">Cerveau IA</label>
                  <select
                    value={selectedAI.id}
                    onChange={(e) => setSelectedAI(AI_PROVIDERS.find((p) => p.id === e.target.value))}
                    className="w-full bg-black/40 border border-white/10 rounded-3xl p-5 appearance-none font-bold text-lg outline-none focus:border-white/20"
                  >
                    {AI_PROVIDERS.map((p) => (
                      <option key={p.id} value={p.id} className="bg-[#111]">
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-5 top-[3.2rem] w-5 h-5 text-white/20 pointer-events-none" />
                </div>
                <div className="flex-1 relative">
                  <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-4 mb-2 block">Requête</label>
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && executeAiPrompt()}
                    placeholder="Posez votre question..."
                    className="w-full bg-black/40 border border-white/10 rounded-3xl p-5 pr-36 sm:pr-44 text-lg sm:text-xl font-medium outline-none"
                  />
                  <div className="absolute right-2 top-[2.3rem] flex gap-2">
                    <button
                      onClick={() => startDictation('ai')}
                      className={`p-3 rounded-2xl transition-all ${isDictating && dictationTarget === 'ai' ? 'bg-red-600 animate-pulse text-white shadow-lg' : 'bg-white/5 text-white/40'}`}
                    >
                      {isDictating && dictationTarget === 'ai' ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                    </button>
                    {selectedAI.voiceUrl && (
                      <button
                        onClick={() => handleAppLaunch(selectedAI.voiceUrl)}
                        className="p-3 bg-yellow-400 text-black rounded-2xl hover:scale-110 active:scale-95 transition-all shadow-xl"
                        title="Conversation vocale"
                      >
                        <MessageCircle className="w-6 h-6" />
                      </button>
                    )}
                    <button onClick={executeAiPrompt} className="p-3 bg-white text-black rounded-2xl hover:scale-110 active:scale-95 transition-all shadow-xl">
                      <Send className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {AI_PROVIDERS.map((ai) => (
                  <div key={ai.id} className="relative">
                    <button
                      onClick={() => {
                        setSelectedAI(ai);
                        handleAppLaunch(ai.url);
                      }}
                      className={`w-full flex flex-col items-center gap-4 p-6 rounded-[2.5rem] border transition-all ${
                        selectedAI.id === ai.id ? 'bg-white/10 border-white/30 scale-105' : 'bg-black/20 border-white/5 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={ai.icon} className="w-12 h-12 rounded-2xl shadow-xl" alt="" onError={(e) => (e.target.src = getIcon(new URL(ai.url).hostname))} />
                      <span className="text-[10px] font-black uppercase tracking-tighter text-center">{ai.name.split(' ')[1] || ai.name}</span>
                    </button>
                    {ai.voiceUrl && (
                      <button
                        onClick={() => handleAppLaunch(ai.voiceUrl)}
                        className="absolute -top-3 -right-3 p-2 rounded-full bg-yellow-400 text-black shadow-xl"
                        title="Ouvrir en vocal"
                      >
                        <Mic className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeCategory === 'notes' && (
          <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-5xl mx-auto">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setNotesMode('compose')}
                className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest ${
                  notesMode === 'compose' ? 'bg-white text-black' : 'bg-white/5 text-white/40'
                }`}
              >
                Notes
              </button>
              <button
                onClick={() => setNotesMode('history')}
                className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest ${
                  notesMode === 'history' ? 'bg-white text-black' : 'bg-white/5 text-white/40'
                }`}
              >
                Historique
              </button>
              {overdueReminders.length > 0 && (
                <div className="ml-auto flex items-center gap-2 text-[10px] uppercase font-black tracking-widest text-yellow-400">
                  <Bell className="w-4 h-4" /> {overdueReminders.length} rappel(s)
                </div>
              )}
            </div>

            {notesMode === 'compose' && (
              <div className="space-y-10">
                <div className="bg-white/5 border border-white/10 p-8 sm:p-10 rounded-[3rem] sm:rounded-[3.5rem] shadow-2xl space-y-6">
                  <h3 className="text-xl font-black italic uppercase flex items-center gap-3">
                    <StickyNote style={{ color: profile.color }} /> Blocs-Notes
                  </h3>
                  <textarea
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="Écrivez ou dictez votre note ici..."
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 min-h-[150px] outline-none text-lg sm:text-xl font-medium focus:border-white/20 transition-all"
                  />
                  <div className="grid md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      value={noteTagsInput}
                      onChange={(e) => setNoteTagsInput(e.target.value)}
                      placeholder="Tags (ex: maison, urgent, voiture)"
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm font-semibold outline-none"
                    />
                    <input
                      type="datetime-local"
                      value={noteReminder}
                      onChange={(e) => setNoteReminder(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm font-semibold outline-none"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      {NOTE_COLORS.map((color) => (
                        <button
                          key={color.hex}
                          onClick={() => setNoteColor(color.hex)}
                          className={`w-9 h-9 rounded-2xl transition-all ${noteColor === color.hex ? 'ring-4 ring-white/30 scale-110' : 'opacity-60 hover:opacity-100'}`}
                          style={{ backgroundColor: color.hex }}
                        />
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <button
                        onClick={() => startDictation('notes')}
                        className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest ${
                          isDictating && dictationTarget === 'notes' ? 'bg-red-600 animate-pulse' : 'bg-white/5'
                        }`}
                      >
                        DICTÉE VOCALE
                      </button>
                      <button
                        onClick={async () => {
                          if (!user || !db) return;
                          if (!noteInput.trim()) return;
                          const tags = noteTagsInput
                            .split(',')
                            .map((tag) => tag.trim())
                            .filter(Boolean);
                          await addDoc(collection(db, 'artifacts', APP_INTERNAL_ID, 'users', user.uid, 'notes'), {
                            text: noteInput.trim(),
                            date: new Date().toLocaleString('fr-FR'),
                            color: noteColor,
                            tags,
                            reminderAt: noteReminder ? new Date(noteReminder).toISOString() : null,
                            createdAt: serverTimestamp()
                          });
                          setNoteInput('');
                          setNoteTagsInput('');
                          setNoteReminder('');
                        }}
                        className="flex-1 bg-white text-black py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 active:scale-95 transition-all shadow-xl shadow-white/5"
                      >
                        SAUVEGARDER
                      </button>
                    </div>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {notesPreview.map((note) => (
                    <div
                      key={note.id}
                      className={`p-8 rounded-[2.5rem] relative group shadow-2xl ${note.reminderAt && new Date(note.reminderAt) <= new Date() ? 'ring-2 ring-red-500' : ''}`}
                      style={{ backgroundColor: note.color || NOTE_COLORS[0].hex, color: '#111' }}
                    >
                      <p className="font-bold text-lg mb-6 leading-tight">{note.text}</p>
                      {note.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {note.tags.map((tag) => (
                            <span key={tag} className="text-[9px] uppercase font-black tracking-widest px-2 py-1 rounded-full bg-black/10">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {note.reminderAt && (
                        <div className="text-[9px] uppercase font-black tracking-widest mb-4 flex items-center gap-2 opacity-70">
                          <Bell className="w-3 h-3" /> {new Date(note.reminderAt).toLocaleString('fr-FR')}
                        </div>
                      )}
                      <div className="flex justify-between items-center opacity-30 text-[9px] font-black uppercase">
                        <span>{note.date}</span>
                        <button onClick={() => deleteNote(note.id)} className="p-2 hover:text-red-600 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {notesMode === 'history' && (
              <div className="space-y-8">
                <div className="bg-white/5 border border-white/10 p-8 sm:p-10 rounded-[3rem] sm:rounded-[3.5rem] shadow-2xl space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <h3 className="text-xl font-black italic uppercase flex items-center gap-3">
                      <StickyNote style={{ color: profile.color }} /> Historique complet
                    </h3>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => downloadFile('notes.json', JSON.stringify(filteredNotes, null, 2), 'application/json')}
                        className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 text-[10px] uppercase font-black tracking-widest"
                      >
                        <Download className="w-4 h-4" /> Export JSON
                      </button>
                      <button
                        onClick={() => {
                          const content = filteredNotes.map((note) => `- ${note.text} (${note.tags?.join(', ') || 'sans tags'})`).join('\n');
                          downloadFile('notes.txt', content, 'text/plain');
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 text-[10px] uppercase font-black tracking-widest"
                      >
                        <Download className="w-4 h-4" /> Export TXT
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={notesSearch}
                    onChange={(e) => setNotesSearch(e.target.value)}
                    placeholder="Rechercher une note ou un tag..."
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm font-semibold outline-none"
                  />
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredNotes.map((note) => (
                    <div
                      key={note.id}
                      className={`p-8 rounded-[2.5rem] relative group shadow-2xl ${note.reminderAt && new Date(note.reminderAt) <= new Date() ? 'ring-2 ring-red-500' : ''}`}
                      style={{ backgroundColor: note.color || NOTE_COLORS[0].hex, color: '#111' }}
                    >
                      <p className="font-bold text-lg mb-6 leading-tight">{note.text}</p>
                      {note.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {note.tags.map((tag) => (
                            <span key={tag} className="text-[9px] uppercase font-black tracking-widest px-2 py-1 rounded-full bg-black/10">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {note.reminderAt && (
                        <div className="text-[9px] uppercase font-black tracking-widest mb-4 flex items-center gap-2 opacity-70">
                          <Bell className="w-3 h-3" /> {new Date(note.reminderAt).toLocaleString('fr-FR')}
                        </div>
                      )}
                      <div className="flex justify-between items-center opacity-30 text-[9px] font-black uppercase">
                        <span>{note.date}</span>
                        <button onClick={() => deleteNote(note.id)} className="p-2 hover:text-red-600 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeCategory === 'settings' && (
          <div className="max-w-3xl mx-auto space-y-8 py-10 animate-in slide-in-from-right-8 duration-500 pb-24">
            <section className="bg-white/5 border border-white/10 p-8 sm:p-10 rounded-[3rem] sm:rounded-[3.5rem] shadow-2xl space-y-10 backdrop-blur-md">
              <h2 className="text-2xl font-black italic uppercase flex items-center gap-4">
                <Settings className="w-7 h-7" style={{ color: profile.color }} /> Configuration
              </h2>
              <div className="space-y-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-4">Nom du Pilote</label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => updateProfile({ name: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-2xl font-black outline-none focus:border-white/20"
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-4 flex items-center gap-2">
                    <Monitor className="w-3 h-3" /> Mode d'ouverture
                  </label>
                  <div className="grid grid-cols-2 gap-3 p-2 bg-black/40 rounded-3xl border border-white/5">
                    <button
                      onClick={() => updateProfile({ openMode: 'tab' })}
                      className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                        profile.openMode === 'tab' ? 'bg-white text-black' : 'text-white/40 hover:bg-white/5'
                      }`}
                    >
                      NOUVEL ONGLET
                    </button>
                    <button
                      onClick={() => updateProfile({ openMode: 'fullscreen' })}
                      className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                        profile.openMode === 'fullscreen' ? 'bg-red-600 text-white' : 'text-white/40 hover:bg-white/5'
                      }`}
                    >
                      PLEIN ÉCRAN
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-4 flex items-center gap-2">
                    <Palette className="w-3 h-3" /> Signature visuelle
                  </label>
                  <div className="flex gap-5 flex-wrap">
                    {THEME_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        onClick={() => updateProfile({ color: c.hex })}
                        className={`w-14 h-14 rounded-2xl transition-all ${profile.color === c.hex ? 'scale-110 ring-4 ring-white/20' : 'opacity-40 hover:opacity-80'}`}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white/5 border border-white/10 p-8 sm:p-10 rounded-[3rem] sm:rounded-[3.5rem] shadow-2xl space-y-6 backdrop-blur-md">
              <h3 className="text-xl font-black italic uppercase flex items-center gap-3">
                <Folder className="w-5 h-5" style={{ color: profile.color }} /> Dossiers personnalisés
              </h3>
              <input
                type="text"
                placeholder="Nom du dossier"
                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm font-semibold outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    createCollection(e.target.value.trim());
                    e.target.value = '';
                  }
                }}
              />
              <div className="grid gap-3">
                {collections.map((c) => (
                  <div key={c.id} className="flex items-center justify-between bg-black/40 border border-white/10 rounded-2xl p-4">
                    <span className="font-bold text-sm">{c.name}</span>
                    <button onClick={() => deleteCollection(c.id)} className="p-2 text-white/30 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeCategory === 'all' && (
          <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setAllSortMode('category')}
                className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest ${
                  allSortMode === 'category' ? 'bg-white text-black' : 'bg-white/5 text-white/40'
                }`}
              >
                Par catégorie
              </button>
              <button
                onClick={() => setAllSortMode((prev) => (prev === 'az' ? 'za' : 'az'))}
                className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest ${
                  allSortMode !== 'category' ? 'bg-white text-black' : 'bg-white/5 text-white/40'
                }`}
              >
                {allSortMode === 'za' ? 'Z/A' : 'A/Z'}
              </button>
            </div>

            {allSortMode === 'category' ? (
              <div className="space-y-10">
                {groupedAllApps.map((group) => (
                  <div key={group.label} className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white/30">{group.label}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
                      {group.apps.map((appItem) => (
                        <button
                          key={appItem.id}
                          onClick={() => handleAppLaunch(appItem.url)}
                          className="group flex flex-col items-center justify-between aspect-[4/3] rounded-[2.5rem] bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-white/20 transition-all shadow-xl active:scale-95 relative overflow-hidden p-4"
                        >
                          <div
                            className="w-20 h-20 rounded-3xl mb-3 flex items-center justify-center p-3 border border-white/10 bg-gradient-to-br from-white/10 to-white/0"
                            style={neonGlow(profile.color, 12)}
                          >
                            <img
                              src={resolveAppIcon(appItem)}
                              className="w-full h-full object-contain filter drop-shadow-lg"
                              alt=""
                              onError={(e) => {
                                e.target.src = getIcon(new URL(appItem.url).hostname);
                              }}
                            />
                          </div>
                          <div className="flex flex-col items-center gap-1 w-full">
                            <span className="font-black text-[10px] uppercase text-white/60 text-center leading-tight break-words min-h-[32px]">
                              {appItem.name}
                            </span>
                            <span className="text-[8px] uppercase tracking-widest text-white/30">{categoryLabelMap[appItem.category] || appItem.category}</span>
                          </div>
                          {!appItem.isDefault && (
                            <div className="absolute -top-2 -right-2 flex flex-col gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePin(appItem);
                                }}
                                className="p-2.5 bg-yellow-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-xl z-10"
                              >
                                <Pin className="w-4 h-4 text-black" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(appItem);
                                }}
                                className="p-2.5 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-xl z-10"
                              >
                                <Edit2 className="w-4 h-4 text-black" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteApp(appItem.id);
                                }}
                                className="p-2.5 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-xl z-10"
                              >
                                <Trash2 className="w-4 h-4 text-white" />
                              </button>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
                {allAppsSorted.map((appItem) => (
                  <button
                    key={appItem.id}
                    onClick={() => handleAppLaunch(appItem.url)}
                    className="group flex flex-col items-center justify-between aspect-[4/3] rounded-[2.5rem] bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-white/20 transition-all shadow-xl active:scale-95 relative overflow-hidden p-4"
                  >
                    <div
                      className="w-20 h-20 rounded-3xl mb-3 flex items-center justify-center p-3 border border-white/10 bg-gradient-to-br from-white/10 to-white/0"
                      style={neonGlow(profile.color, 12)}
                    >
                      <img
                        src={resolveAppIcon(appItem)}
                        className="w-full h-full object-contain filter drop-shadow-lg"
                        alt=""
                        onError={(e) => {
                          e.target.src = getIcon(new URL(appItem.url).hostname);
                        }}
                      />
                    </div>
                    <div className="flex flex-col items-center gap-1 w-full">
                      <span className="font-black text-[10px] uppercase text-white/60 text-center leading-tight break-words min-h-[32px]">
                        {appItem.name}
                      </span>
                      <span className="text-[8px] uppercase tracking-widest text-white/30">{categoryLabelMap[appItem.category] || appItem.category}</span>
                    </div>
                    {!appItem.isDefault && (
                      <div className="absolute -top-2 -right-2 flex flex-col gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePin(appItem);
                          }}
                          className="p-2.5 bg-yellow-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-xl z-10"
                        >
                          <Pin className="w-4 h-4 text-black" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(appItem);
                          }}
                          className="p-2.5 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-xl z-10"
                        >
                          <Edit2 className="w-4 h-4 text-black" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteApp(appItem.id);
                          }}
                          className="p-2.5 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-xl z-10"
                        >
                          <Trash2 className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {activeCategory !== 'home' && activeCategory !== 'settings' && activeCategory !== 'ai' && activeCategory !== 'notes' && activeCategory !== 'all' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 animate-in fade-in duration-500 pb-20">
            {filteredApps.map((appItem, idx) => (
              <button
                key={appItem.id || idx}
                onClick={() => handleAppLaunch(appItem.url)}
                className="group flex flex-col items-center justify-between aspect-[4/3] rounded-[2.5rem] bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-white/20 transition-all shadow-xl active:scale-95 relative overflow-hidden p-4"
                draggable={!!appItem.id}
                onDragStart={() => appItem.id && setDraggingAppId(appItem.id)}
                onDragOver={(e) => appItem.id && e.preventDefault()}
                onDrop={() => appItem.id && handleDrop(appItem.id)}
              >
                <div className="absolute left-4 top-4 opacity-40 flex items-center gap-2">
                  {appItem.id && <GripVertical className="w-4 h-4" />}
                  {appItem.pinned && <Pin className="w-3 h-3 text-yellow-400" />}
                </div>
                <div
                  className="w-20 h-20 rounded-3xl mb-3 flex items-center justify-center p-3 border border-white/10 bg-gradient-to-br from-white/10 to-white/0"
                  style={neonGlow(profile.color, 12)}
                >
                  <img
                    src={resolveAppIcon(appItem)}
                    className="w-full h-full object-contain filter drop-shadow-lg"
                    alt=""
                    onError={(e) => {
                      e.target.src = getIcon(new URL(appItem.url).hostname);
                    }}
                  />
                </div>
                <div className="flex flex-col items-center gap-1 w-full">
                  <span className="font-black text-[10px] uppercase text-white/60 text-center leading-tight break-words min-h-[32px]">
                    {appItem.name}
                  </span>
                </div>
                {appItem.id && (
                  <div className="absolute -top-2 -right-2 flex flex-col gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePin(appItem);
                      }}
                      className="p-2.5 bg-yellow-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-xl z-10"
                    >
                      <Pin className="w-4 h-4 text-black" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(appItem);
                      }}
                      className="p-2.5 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-xl z-10"
                    >
                      <Edit2 className="w-4 h-4 text-black" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteApp(appItem.id);
                      }}
                      className="p-2.5 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-xl z-10"
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  </div>
                )}
              </button>
            ))}
            <button
              onClick={openAddModal}
              className="flex flex-col items-center justify-center aspect-[4/3] rounded-[2.5rem] border-2 border-dashed border-white/10 hover:border-white/30 transition-all text-white/10 hover:text-white group active:scale-95"
            >
              <Plus className="w-8 h-8 mb-2 group-hover:scale-110" />
              <span className="font-black text-[9px] uppercase tracking-widest">Ajouter</span>
            </button>
          </div>
        )}
      </main>

      <button
        onClick={toggleFullscreen}
        className="fixed bottom-6 sm:bottom-8 right-6 sm:right-8 p-5 rounded-[2rem] border border-white/10 shadow-2xl z-[100] hover:scale-110 active:scale-90 transition-all bg-white/5 group overflow-hidden backdrop-blur-3xl"
      >
        <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity" style={{ backgroundColor: profile.color }} />
        <Maximize className="w-6 h-6 text-white/40 group-hover:text-white relative z-10" />
      </button>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl flex items-center justify-center z-[100] p-6 animate-in zoom-in duration-200">
          <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-2xl rounded-[3.5rem] p-10 space-y-8 shadow-2xl">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-center">
              {editingApp ? 'Modifier le raccourci' : 'Nouveau Raccourci'}
            </h2>
            <div className="space-y-4">
              <input
                type="text"
                value={newApp.name}
                onChange={(e) => {
                  setNewApp({ ...newApp, name: e.target.value });
                  if (!iconSearchQuery) setIconSearchQuery(e.target.value);
                }}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-lg outline-none focus:border-red-500 font-bold"
                placeholder="Nom du service"
              />
              <input
                type="text"
                value={newApp.url}
                onChange={(e) => setNewApp({ ...newApp, url: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-lg outline-none focus:border-red-500 font-bold"
                placeholder="Lien URL complet"
              />
              <select
                value={newApp.category}
                onChange={(e) => setNewApp({ ...newApp, category: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-lg outline-none font-bold"
              >
                {categories
                  .filter((cat) => !['ai', 'notes', 'all'].includes(cat.id))
                  .map((cat) => (
                    <option key={cat.id} value={cat.id} className="bg-[#111]">
                      {cat.label}
                    </option>
                  ))}
                {collections.map((c) => (
                  <option key={c.id} value={`collection:${c.id}`} className="bg-[#111]">
                    {c.name}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-white/40">
                  <input
                    type="checkbox"
                    checked={newApp.pinned}
                    onChange={(e) => setNewApp({ ...newApp, pinned: e.target.checked })}
                  />
                  Marquer comme favori
                </label>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-black">Image / Icône personnalisée</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={iconSearchQuery}
                    onChange={(e) => setIconSearchQuery(e.target.value)}
                    placeholder="Recherche Google Images"
                    className="flex-1 bg-black/40 border border-white/10 rounded-2xl p-4 text-sm font-semibold outline-none"
                  />
                  <button
                    onClick={() => openImageSearch(iconSearchQuery)}
                    className="px-4 py-3 rounded-2xl bg-white text-black text-[10px] uppercase font-black tracking-widest"
                  >
                    Chercher
                  </button>
                </div>
                <input
                  type="text"
                  value={appIconUrl}
                  onChange={(e) => setAppIconUrl(e.target.value)}
                  placeholder="Collez l'URL de l'image choisie"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm font-semibold outline-none"
                />
                <p className="text-[10px] uppercase tracking-widest text-white/30">Astuce: ouvrez l'image, copiez l'URL, puis collez-la ici.</p>
                {appIconUrl && (
                  <div className="flex items-center gap-4">
                    <img src={appIconUrl} alt="" className="w-16 h-16 rounded-2xl object-cover border border-white/10" />
                    <span className="text-[10px] uppercase tracking-widest text-white/40">Aperçu</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-5 rounded-3xl font-black text-xs bg-white/5 uppercase">
                Fermer
              </button>
              <button
                onClick={saveApp}
                className="flex-1 py-5 rounded-3xl font-black text-xs bg-red-600 uppercase"
              >
                {editingApp ? 'Mettre à jour' : 'Valider'}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="py-6 text-center opacity-10 select-none pointer-events-none z-50">
        <p className="text-[8px] font-black uppercase tracking-[1.5em] italic">Tesla OS Immersive • v16.0</p>
      </footer>
    </div>
  );
}
