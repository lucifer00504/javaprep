import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  BookOpen, Layers, Code as CodeIcon, CheckCircle, RotateCcw, BrainCircuit, 
  Trophy, Target, Filter, Upload, FileJson, AlertCircle, Zap, User, Bot, 
  Play, Shuffle, Search, Trash2, X, Send, Loader, Copy, Check, Sparkles, 
  GraduationCap, Timer, Pause, PlayCircle, Star, Volume2, VolumeX, Mic, MicOff,
  ChevronRight, Settings, Eye, EyeOff, Key
} from 'lucide-react';

// --- UTILITY ---
const shuffleArray = (array) => {
  let shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const extractSubject = (text) => {
  if (!text) return "the topic";
  const commonSubjects = [
    "HashMap", "Kafka", "Spring Boot", "Microservices", "Saga Pattern", 
    "String", "Singleton", "Garbage Collection", "JPA", "SQL", "OAuth2", 
    "JWT", "Circuit Breaker", "API Gateway", "Multi-threading", "Stream API",
    "JVM", "Transaction Management", "Caching", "Redis"
  ];
  const lowerText = String(text).toLowerCase();
  for (let s of commonSubjects) {
    if (lowerText.includes(s.toLowerCase())) return s;
  }
  return "this technical concept";
};

// TTS Helper
const speakText = (text, setSpeakingState) => {
  if (!text || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel(); 
  const msg = new SpeechSynthesisUtterance(String(text));
  msg.rate = 0.95; 
  msg.onstart = () => setSpeakingState && setSpeakingState(true);
  msg.onend = () => setSpeakingState && setSpeakingState(false);
  msg.onerror = () => setSpeakingState && setSpeakingState(false);
  window.speechSynthesis.speak(msg);
};

const stopSpeech = () => {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
};

// --- API FETCHER WITH AUTO FALLBACK ---
const fetchGeminiWithBackoff = async (payload, apiKey, maxRetries = 3) => {
  if (!apiKey) throw new Error("API Key is missing. Please configure it in Settings.");
  
  // Robust Fallback Array: Steps down through models to avoid "Not Found" API errors
  const modelsToTry = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-preview-09-2025",
    "gemini-1.5-flash",
    "gemini-1.5-pro"
  ];
  
  let lastErrorMsg = "";

  for (const modelId of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
    let delay = 1000;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(payload) 
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          lastErrorMsg = errorData?.error?.message || `HTTP ${response.status}`;
          
          if (response.status === 404 || lastErrorMsg.toLowerCase().includes("not found")) {
            break; // Break retry loop to immediately fall back to the next model
          }
          throw new Error(lastErrorMsg);
        }
        return await response.json();
      } catch (err) {
        lastErrorMsg = err.message;
        if (err.message.toLowerCase().includes("not found")) {
          break; // Stop retrying this model if it's explicitly not found
        }
        if (i === maxRetries - 1 && modelId === modelsToTry[modelsToTry.length - 1]) {
          throw err; // All models and retries failed
        }
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
      }
    }
  }
  throw new Error(lastErrorMsg || "No compatible Gemini model found for this API key.");
};

// --- PREMIUM UI COMPONENTS ---

const CodeBlock = ({ code = "" }) => {
  const [copied, setCopied] = useState(false);
  const cleanCode = typeof code === 'string' ? code.trim() : String(code);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cleanCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = cleanCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-slate-700 bg-[#0f172a] shadow-lg shadow-slate-900/20 w-full">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/80 border-b border-slate-700/80">
        <div className="flex space-x-2">
          <div className="w-3 h-3 rounded-full bg-rose-500"></div>
          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
        </div>
        <button onClick={handleCopy} className="text-xs font-medium text-slate-400 hover:text-white flex items-center space-x-1 transition-colors">
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
      <div className="p-4 overflow-x-auto custom-scrollbar">
        <pre className="text-emerald-300 font-mono text-sm leading-relaxed whitespace-pre">
          <code>{cleanCode}</code>
        </pre>
      </div>
    </div>
  );
};

const SafeMarkdownRenderer = ({ text = "" }) => {
  if (!text) return null;
  const safeText = String(text);
  const sections = safeText.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2">
      {sections.map((section, idx) => {
        if (section.startsWith('```')) {
          const code = section.replace(/```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
          
          // FIX: Prevent massive block rendering for single-line AI code fragments
          if (!code.includes('\n') && code.length < 60) {
            return <code key={idx} className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-mono text-[0.95em] border border-indigo-100 mx-1">{code}</code>;
          }
          return <CodeBlock key={idx} code={code} />;
        }
        
        const lines = section.split('\n');
        const elements = [];
        let currentList = [];

        lines.forEach((line, lineIdx) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
            currentList.push(trimmed.substring(2));
          } else {
            if (currentList.length > 0) {
              elements.push(
                <ul key={`list-${lineIdx}`} className="list-disc pl-5 space-y-1 my-2">
                  {currentList.map((item, i) => <li key={i} className="text-slate-700 font-medium">{parseInlineStyles(item)}</li>)}
                </ul>
              );
              currentList = [];
            }
            if (trimmed) {
              elements.push(<div key={`p-${lineIdx}`} className="text-slate-700 leading-relaxed font-medium mb-2 whitespace-pre-wrap">{parseInlineStyles(line)}</div>);
            }
          }
        });

        if (currentList.length > 0) {
          elements.push(<ul key="list-final" className="list-disc pl-5 space-y-1 my-2">{currentList.map((item, i) => <li key={i} className="text-slate-700 font-medium">{parseInlineStyles(item)}</li>)}</ul>);
        }
        return <div key={idx}>{elements}</div>;
      })}
    </div>
  );
};

const parseInlineStyles = (text) => {
  if (typeof text !== 'string') return text;
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-md font-mono text-[0.9em] border border-indigo-100">{part.slice(1, -1)}</code>;
    return part;
  });
};

const AnswerBlock = ({ text = "" }) => {
  if (!text) return null;
  const safeText = String(text);
  const isCodeHeavy = safeText.includes('public ') || (safeText.includes('{') && safeText.includes('}') && safeText.includes(';'));
  if (isCodeHeavy && !safeText.includes('```')) return <CodeBlock code={safeText} />;
  return (
    <div className="text-left w-full text-sm font-medium rounded-xl p-5 shadow-sm border bg-white border-slate-200">
      <SafeMarkdownRenderer text={safeText} />
    </div>
  );
};

// --- VOICE DICTATION ---
const VoiceInput = ({ onTranscript, disabled = false }) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) transcript += event.results[i][0].transcript;
        }
        if (transcript) onTranscript(transcript);
      };
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, [onTranscript]);

  const toggleListening = () => {
    if (isListening) recognitionRef.current?.stop();
    else { setIsListening(true); recognitionRef.current?.start(); }
  };

  if (!recognitionRef.current) return null;
  return (
    <button onClick={toggleListening} disabled={disabled} className={`p-2.5 rounded-xl transition-all ${isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'} disabled:opacity-30 shadow-sm border border-slate-200`}>
      {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
    </button>
  );
};

// --- FOCUS TIMER ---
const FocusTimer = () => {
  const [timeLeft, setTimeLeft] = useState(25 * 60); 
  const [isActive, setIsActive] = useState(false);
  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) interval = setInterval(() => setTimeLeft(timeLeft - 1), 1000);
    else if (timeLeft === 0) setIsActive(false);
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  return (
    <div className="flex items-center space-x-2 bg-indigo-950/40 rounded-lg px-3 py-1.5 border border-indigo-500/30 backdrop-blur-sm">
      <Timer className="w-4 h-4 text-indigo-200" />
      <span className="font-mono text-sm text-white w-11 text-center">{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
      <button onClick={() => setIsActive(!isActive)} className="text-indigo-200 hover:text-white transition focus:outline-none">{isActive ? <Pause className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}</button>
      <button onClick={() => { setIsActive(false); setTimeLeft(25 * 60); }} className="text-indigo-300 hover:text-rose-400 transition ml-1 focus:outline-none" title="Reset to 25m"><RotateCcw className="w-3.5 h-3.5" /></button>
    </div>
  );
};

// --- CORE APP ---
const DEFAULT_DATA = [{ id: "topic_0", name: "Java Problems", category: "Core", questions: [{ id: "t0_q0", question: "Write a Program to reverse a string manually.", answer: "public String reverseString(String input) { ... }" }] }];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeContext, setActiveContext] = useState(null); 
  const [showMobileAI, setShowMobileAI] = useState(false); 
  
  const [studyData, setStudyData] = useState(() => {
    try { const saved = localStorage.getItem('sde2_prep_data'); return saved ? JSON.parse(saved) : DEFAULT_DATA; } catch (e) { return DEFAULT_DATA; }
  });

  const [bookmarkedCards, setBookmarkedCards] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sde2_bookmarked_cards') || '[]'); } catch { return []; }
  });

  const [masteredCards, setMasteredCards] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sde2_mastered_cards') || '[]'); } catch { return []; }
  });

  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('sde2_gemini_api_key') || "");

  useEffect(() => {
    const autoLoad = async () => {
      if (window.STUDY_DATA) { setStudyData(window.STUDY_DATA); return; }
      try {
        const response = await fetch('data.js');
        if (response.ok) {
          const text = await response.text();
          const start = text.indexOf('[');
          const end = text.lastIndexOf(']') + 1;
          if (start !== -1) {
            const data = JSON.parse(text.substring(start, end));
            if (Array.isArray(data)) setStudyData(data);
          }
        }
      } catch (err) {}
    };
    if (studyData.length === 1 && studyData[0].id === 'topic_0') autoLoad();
  }, [studyData.length]);

  useEffect(() => { localStorage.setItem('sde2_prep_data', JSON.stringify(studyData)); }, [studyData]);
  useEffect(() => { localStorage.setItem('sde2_bookmarked_cards', JSON.stringify(bookmarkedCards)); }, [bookmarkedCards]);
  useEffect(() => { localStorage.setItem('sde2_mastered_cards', JSON.stringify(masteredCards)); }, [masteredCards]);
  useEffect(() => { localStorage.setItem('sde2_gemini_api_key', geminiApiKey); }, [geminiApiKey]);

  const totalQuestions = useMemo(() => studyData.reduce((acc, topic) => acc + (topic.questions?.length || 0), 0), [studyData]);
  const isDataPresent = studyData.length > 1 || (studyData.length === 1 && studyData[0].questions?.length > 1);

  const clearData = () => {
    if (window.confirm("Reset all local study progress?")) {
      localStorage.removeItem('sde2_prep_data');
      localStorage.removeItem('sde2_mastered_cards');
      localStorage.removeItem('sde2_bookmarked_cards');
      setStudyData(DEFAULT_DATA); setBookmarkedCards([]); setMasteredCards([]);
    }
  };

  const toggleBookmark = (id) => {
    if (!id) return;
    setBookmarkedCards(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]);
  };

  return (
    <div className="h-screen bg-slate-50 text-slate-900 font-sans flex flex-col overflow-hidden selection:bg-indigo-200 selection:text-indigo-900">
      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <nav className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-900 text-white shadow-lg z-40 border-b border-indigo-700/50">
        <div className="w-full mx-auto px-4 flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="bg-white/10 p-1.5 rounded-lg border border-white/10"><BrainCircuit className="w-6 h-6 text-indigo-200" /></div>
            <span className="font-bold text-lg tracking-tight hidden md:block text-white">SDE II PrepHub</span>
          </div>
          <div className="flex items-center flex-1 justify-center space-x-1.5 overflow-x-auto hide-scrollbar px-4">
            {[
              { id: 'dashboard', icon: Layers, label: 'Dashboard' },
              { id: 'flashcards', icon: BookOpen, label: 'Flashcards' },
              { id: 'mock', icon: CheckCircle, label: 'Topic Drill' },
              { id: 'simulator', icon: Zap, label: 'Real Simulator' },
              { id: 'coach', icon: Target, label: 'Career Coach' },
              { id: 'settings', icon: Settings, label: 'Settings' }
            ].map((tab) => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setActiveContext(null); stopSpeech(); }}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg transition-all whitespace-nowrap text-sm font-medium
                  ${activeTab === tab.id ? 'bg-white/15 text-white shadow-inner' : 'text-indigo-100 hover:bg-white/10'}`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
          <div className="hidden lg:block"><FocusTimer /></div>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden bg-[#f8fafc]">
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <div className="max-w-4xl mx-auto pb-24 lg:pb-8">
            {activeTab === 'dashboard' && <Dashboard studyData={studyData} setStudyData={setStudyData} totalQuestions={totalQuestions} onClear={clearData} bookmarkedCount={bookmarkedCards.length} masteredCards={masteredCards} isDataPresent={isDataPresent} />}
            {activeTab === 'flashcards' && <Flashcards studyData={studyData} setActiveContext={setActiveContext} bookmarkedCards={bookmarkedCards} toggleBookmark={toggleBookmark} masteredCards={masteredCards} setMasteredCards={setMasteredCards} />}
            {activeTab === 'mock' && <MockInterview studyData={studyData} setActiveContext={setActiveContext} bookmarkedCards={bookmarkedCards} toggleBookmark={toggleBookmark} />}
            {activeTab === 'simulator' && <RealInterviewSimulator studyData={studyData} setActiveContext={setActiveContext} bookmarkedCards={bookmarkedCards} toggleBookmark={toggleBookmark} geminiApiKey={geminiApiKey} />}
            {activeTab === 'coach' && <CareerCoach />}
            {activeTab === 'settings' && <SettingsView apiKey={geminiApiKey} setApiKey={setGeminiApiKey} onClear={clearData} />}
          </div>
        </main>
        <aside className={`flex flex-col bg-white z-50 lg:z-30 ${showMobileAI ? 'fixed inset-0 top-16' : 'hidden'} lg:relative lg:flex lg:w-[400px] xl:w-[450px] lg:h-full lg:border-l lg:border-slate-200 shadow-xl`}>
          <AITeacherCore activeContext={activeContext} studyData={studyData} geminiApiKey={geminiApiKey} onClose={() => setShowMobileAI(false)} />
        </aside>
        {!showMobileAI && (
          <button onClick={() => setShowMobileAI(true)} className="lg:hidden fixed bottom-6 right-6 z-40 bg-indigo-600 text-white p-4 rounded-full shadow-2xl hover:scale-105 border border-indigo-500"><Bot className="w-6 h-6" /></button>
        )}
      </div>
    </div>
  );
}

// --- DASHBOARD ---
function Dashboard({ studyData, totalQuestions, bookmarkedCount, masteredCards, isDataPresent, setStudyData, onClear }) {
  const masteredCount = masteredCards.length;
  const progress = totalQuestions > 0 ? Math.round((masteredCount / totalQuestions) * 100) : 0;
  const [search, setSearch] = useState('');

  const results = useMemo(() => {
    if (!search.trim()) return [];
    const r = [];
    studyData.forEach(t => t.questions?.forEach(q => {
      if (q.question.toLowerCase().includes(search.toLowerCase())) r.push({ ...q, topic: t.name });
    }));
    return r;
  }, [studyData, search]);

  const handleFile = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => {
      try {
        const text = ev.target.result;
        const start = text.indexOf('['); const end = text.lastIndexOf(']') + 1;
        const data = JSON.parse(text.substring(start, end));
        if (Array.isArray(data)) setStudyData(data);
      } catch (err) { alert("Parsing failed."); }
    };
    r.readAsText(f);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-indigo-100 flex flex-col justify-center">
          <div className="flex justify-between items-end mb-4">
            <div><h2 className="text-xl font-bold text-slate-800">Mastery Index</h2><p className="text-sm text-slate-500">Global progress tracking.</p></div>
            <div className="text-3xl font-extrabold text-indigo-600">{progress}%</div>
          </div>
          <div className="w-full bg-indigo-100 rounded-full h-3 mb-2"><div className="bg-indigo-600 h-3 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div></div>
          <div className="flex justify-between text-xs font-bold text-indigo-800 uppercase tracking-widest"><span>{masteredCount} Mastered</span><span>{totalQuestions} Total</span></div>
        </div>
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-amber-100 text-center flex flex-col items-center justify-center">
          <Star className="w-10 h-10 text-amber-500 fill-amber-500 mb-2" />
          <h3 className="text-2xl font-extrabold text-amber-600">{bookmarkedCount}</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Starred Items</p>
        </div>
      </div>
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search entire syllabus..." className="w-full pl-12 pr-4 py-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium" />
        </div>
        {search && (
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
            {results.length === 0 ? <p className="text-slate-400 text-center italic">No matches found.</p> : results.map((res, i) => (
              <div key={i} className="p-5 border rounded-2xl bg-white hover:border-indigo-300 transition-colors shadow-sm"><span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1 block">{res.topic}</span><h4 className="font-bold mb-3">{res.question}</h4><AnswerBlock text={res.answer} /></div>
            ))}
          </div>
        )}
        {!isDataPresent && (
          <div className="border-2 border-dashed border-indigo-200 bg-indigo-50/20 p-10 rounded-2xl text-center">
            <FileJson className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
            <label className="cursor-pointer bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition inline-block">Load data.js File<input type="file" onChange={handleFile} className="hidden" /></label>
          </div>
        )}
        {isDataPresent && <button onClick={onClear} className="text-rose-500 font-bold text-xs hover:underline uppercase tracking-widest">Reset Progress</button>}
      </div>
    </div>
  );
}

// --- SETTINGS VIEW ---
function SettingsView({ apiKey, setApiKey, onClear }) {
  const [showKey, setShowKey] = useState(false);
  const [saveStatus, setSaveStatus] = useState(false);
  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><Settings className="w-6 h-6 text-indigo-600 mr-2" />System Settings</h2>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center"><Key className="w-4 h-4 mr-1 text-indigo-500" />Gemini API Key</label>
            <div className="relative group">
              <input type={showKey ? "text" : "password"} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Enter key..." className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-sm" />
              <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors">{showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
            </div>
          </div>
          <button onClick={() => { setSaveStatus(true); setTimeout(() => setSaveStatus(false), 2000); }} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold transition flex items-center shadow-md">{saveStatus ? <Check className="w-4 h-4 mr-2" /> : <Layers className="w-4 h-4 mr-2" />}{saveStatus ? 'Updated' : 'Update Key'}</button>
        </div>
      </div>
      <div className="bg-rose-50 p-8 rounded-3xl border border-rose-100">
        <h3 className="text-lg font-bold text-rose-800 mb-2">Reset</h3>
        <p className="text-sm text-rose-600 mb-6">Resetting clears Mastery and Bookmarks.</p>
        <button onClick={onClear} className="flex items-center px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-bold hover:bg-rose-700 transition"><Trash2 className="w-4 h-4 mr-2" />Clear Progress</button>
      </div>
    </div>
  );
}

// --- CORE AI TEACHER COMPONENT ---
function AITeacherCore({ activeContext, studyData, geminiApiKey, onClose }) {
  const [messages, setMessages] = useState([{ role: 'model', text: "Hello! I'm your SDE II AI Mentor. I provide direct, concise, and senior-level answers. What do you want to review?" }]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

  const suggestedPrompts = useMemo(() => {
    if (activeContext) {
      const text = (activeContext.question || activeContext.front || '').toLowerCase();
      const isCodeRelated = text.match(/(program|code|write|implement|algorithm|java)/i);
      let pool = isCodeRelated ? ["Explain code step-by-step", "Time & Space complexity?", "Optimized implementation?"] : ["Explain concept simply", "Production trade-offs?", "Real-world example?"];
      return shuffleArray(pool).slice(0, 3);
    }
    return ["Top Spring Boot questions?", "SDE II Design patterns?", "Behavioral round tips?"];
  }, [activeContext]);

  const handleSend = async (suggestedText) => {
    const userMsg = typeof suggestedText === 'string' ? suggestedText.trim() : input.trim();
    if (!userMsg || isTyping) return;
    if (!geminiApiKey) {
      setMessages(prev => [...prev, { role: 'user', text: userMsg }, { role: 'model', text: "⚠️ **API Key Missing**: Please go to **Settings** and enter your key." }]);
      setInput(''); return;
    }
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);
    try {
      const topicNames = studyData.map(t => t.name || t.category).join(', ');
      const systemPrompt = `You are a Senior Staff Engineer mentoring a SDE II. CRITICAL: 1. Extreme brevity. 2. Output code blocks + max 3 bullets. 3. No introductions. Skip intro sentences like "Sure, I can help". Context: ${topicNames.substring(0, 300)}... Screen: Q: ${activeContext?.question || 'None'} A: ${activeContext?.answer || 'None'}`;
      const payload = {
        contents: messages.map(msg => ({ role: msg.role === 'model' ? 'model' : 'user', parts: [{ text: String(msg.text) }] })),
        systemInstruction: { parts: [{ text: systemPrompt }] }
      };
      payload.contents.push({ role: 'user', parts: [{ text: userMsg }] });
      
      const result = await fetchGeminiWithBackoff(payload, geminiApiKey);
      const aiReply = result.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
      setMessages(prev => [...prev, { role: 'model', text: aiReply }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: `❌ Error: ${error.message}` }]);
    } finally { setIsTyping(false); }
  };

  return (
    <div className="flex flex-col h-full bg-white relative w-full overflow-hidden border-l border-slate-200">
      <div className="bg-white border-b border-slate-200 p-4 flex justify-between items-center z-10 shadow-sm">
        <div className="flex items-center space-x-3"><div className="bg-gradient-to-br from-indigo-500 to-indigo-700 p-2 rounded-xl shadow-sm"><Bot className="w-5 h-5 text-white" /></div><span className="font-bold text-slate-800">AI Mentor</span></div>
        <button onClick={onClose} className="lg:hidden text-slate-400 p-2 bg-slate-50 rounded-lg"><X className="w-5 h-5" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 flex flex-col space-y-6">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] p-4 rounded-2xl shadow-sm border ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-800'}`}>
              {msg.role === 'user' ? <p className="text-sm font-medium">{msg.text}</p> : <SafeMarkdownRenderer text={msg.text} />}
            </div>
          </div>
        ))}
        {!isTyping && messages[messages.length - 1]?.role === 'model' && (
          <div className="flex flex-wrap justify-end gap-2 pt-2">
             {suggestedPrompts.map((p, i) => (<button key={i} onClick={() => handleSend(p)} className="text-left px-3 py-1.5 bg-white border border-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl hover:bg-indigo-50 transition-all shadow-sm">{p}</button>))}
          </div>
        )}
        {isTyping && (<div className="flex justify-start"><div className="bg-white p-4 rounded-2xl shadow-sm flex items-center space-x-3"><Loader className="w-4 h-4 text-indigo-500 animate-spin" /><span className="text-sm text-slate-500">Thinking...</span></div></div>)}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 bg-white border-t border-slate-200 flex flex-col space-y-2">
        <div className="flex items-end space-x-2">
          <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} rows={Math.min(Math.max(input.split('\n').length, 1), 4)} placeholder="Ask technical doubt..." className="flex-1 bg-slate-50 border rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm resize-none" />
          <div className="flex flex-col space-y-2"><VoiceInput onTranscript={(t) => setInput(prev => prev + t)} /><button onClick={() => handleSend()} disabled={isTyping || !input.trim()} className="bg-indigo-600 text-white p-3.5 rounded-xl hover:bg-indigo-700 disabled:opacity-30 flex items-center justify-center shadow-md"><Send className="w-4 h-4" /></button></div>
        </div>
      </div>
    </div>
  );
}

// --- REAL INTERVIEW SIMULATOR ---
function RealInterviewSimulator({ studyData, setActiveContext, bookmarkedCards, toggleBookmark, geminiApiKey }) {
  const [state, setState] = useState('idle'); 
  const [currentModule, setCurrentModule] = useState('');
  const [qMain, setQMain] = useState(null);
  const [qFollowup, setQFollowup] = useState(null);
  const [ansMain, setAnsMain] = useState('');
  const [ansFollowup, setAnsFollowup] = useState('');
  const [feedbackMain, setFeedbackMain] = useState(null);
  const [feedbackFollowup, setFeedbackFollowup] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const startRound = () => {
    stopSpeech();
    const valid = studyData.filter(t => t.questions?.length > 0);
    if (!valid.length) return;
    const topic = valid[Math.floor(Math.random() * valid.length)];
    const main = topic.questions[Math.floor(Math.random() * topic.questions.length)];
    
    let follow = topic.questions.find(q => q.id !== main.id);
    if (!follow) follow = { id: "dyn_"+Date.now(), question: `Follow-up: Discuss the high-availability trade-offs of this ${extractSubject(main.question)} architecture.`, answer: "SDE II Focus: Address replication lag, quorum requirements, and multi-region failover logic." };

    setCurrentModule(topic.name); setQMain(main); setQFollowup(follow);
    setAnsMain(''); setAnsFollowup(''); setFeedbackMain(null); setFeedbackFollowup(null);
    setState('main'); setActiveContext(main);
    setTimeout(() => speakText(main?.question, setIsSpeaking), 500);
  };

  const analyze = async (user, ideal, question, setFeedback) => {
    if (!geminiApiKey) return;
    setIsAnalyzing(true);
    try {
      const prompt = `Critique candidate's SDE II answer. Q: ${question}. Candidate: ${user}. Ideal: ${ideal}. Return 3 concise bullets: Correct aspects, Missing Depth, SDE II Pro-tip. Use markdown.`;
      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: "You are a Senior Staff Engineer Interviewer." }] }
      };
      const res = await fetchGeminiWithBackoff(payload, geminiApiKey);
      setFeedback(res.candidates?.[0]?.content?.parts?.[0]?.text || "Unable to analyze.");
    } catch (e) { setFeedback("Feedback unavailable."); } finally { setIsAnalyzing(false); }
  };

  const submitMain = async () => {
    stopSpeech();
    if (geminiApiKey) await analyze(ansMain, qMain?.answer, qMain?.question, setFeedbackMain);
    setState('followup'); setActiveContext(qFollowup);
    speakText(qFollowup?.question, setIsSpeaking);
  };

  const submitFollowup = async () => {
    stopSpeech();
    if (geminiApiKey) await analyze(ansFollowup, qFollowup?.answer, qFollowup?.question, setFeedbackFollowup);
    setState('review');
  };

  if (state === 'idle') return (
    <div className="max-w-3xl mx-auto bg-white p-12 rounded-3xl shadow-sm border text-center animate-in zoom-in-95">
      <Zap className="w-16 h-16 text-indigo-500 mx-auto mb-6" />
      <h2 className="text-3xl font-extrabold mb-4 tracking-tight text-slate-800">SDE II Simulator</h2>
      <p className="text-slate-500 mb-10 text-lg leading-relaxed">Technical rounds with real-time AI critique of your trade-off analysis.</p>
      <button onClick={startRound} className="bg-indigo-600 text-white px-10 py-4 rounded-xl font-bold hover:shadow-xl transition-all shadow-md">Launch Round</button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-slate-900 text-white p-5 rounded-2xl flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-4">
          <div className="bg-indigo-600 p-2.5 rounded-xl relative">
            <Bot className="w-6 h-6 text-white" />
            {isSpeaking && <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-ping"></span>}
          </div>
          <div><h3 className="font-bold text-sm text-indigo-300 uppercase tracking-widest">SDE II Interviewer</h3><p className="text-xs">{currentModule}</p></div>
        </div>
        {isAnalyzing && <div className="flex items-center text-indigo-300 text-xs animate-pulse space-x-2"><Loader className="w-4 h-4 animate-spin" /><span>AI Analyzing...</span></div>}
        <button onClick={() => { setState('idle'); setActiveContext(null); stopSpeech(); }} className="text-slate-400 text-xs font-bold hover:text-white transition px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800">End Round</button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
        {state === 'main' ? (
          <div className="space-y-8">
            <div className="bg-slate-50 p-6 rounded-2xl border font-bold text-lg text-slate-800 leading-relaxed shadow-sm relative group">
              {qMain?.question}
              <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => isSpeaking ? stopSpeech() : speakText(qMain?.question, setIsSpeaking)} className="p-1.5 bg-white rounded-md border shadow-sm text-slate-400">{isSpeaking ? <VolumeX className="w-4" /> : <Volume2 className="w-4" />}</button>
                <button onClick={() => toggleBookmark(qMain?.id)} className={`p-1.5 rounded-md border shadow-sm ${bookmarkedCards.includes(qMain?.id) ? 'text-amber-500' : 'text-slate-300'}`}><Star className="w-4" /></button>
              </div>
            </div>
            <div className="flex items-end space-x-2">
              <textarea value={ansMain} onChange={(e) => setAnsMain(e.target.value)} placeholder="Type or dictate your answer..." className="flex-1 p-6 border rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-mono text-sm" rows="5" />
              <div className="flex flex-col space-y-2 mb-2"><VoiceInput onTranscript={t => setAnsMain(v => v + ' ' + t)} disabled={isAnalyzing} /><button onClick={submitMain} disabled={isAnalyzing || !ansMain.trim()} className="bg-indigo-600 text-white p-3 rounded-xl shadow-lg focus:outline-none"><ChevronRight className="w-5 h-5" /></button></div>
            </div>
          </div>
        ) : state === 'followup' ? (
          <div className="space-y-8 animate-in slide-in-from-right-4">
            <div className="bg-orange-50/50 p-6 rounded-2xl border border-orange-200 font-bold text-lg text-slate-800 leading-relaxed shadow-sm relative group">
              {qFollowup?.question}
              <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => isSpeaking ? stopSpeech() : speakText(qFollowup?.question, setIsSpeaking)} className="p-1.5 bg-white rounded-md border shadow-sm text-slate-400">{isSpeaking ? <VolumeX className="w-4" /> : <Volume2 className="w-4" />}</button>
                {!qFollowup?.id.includes('dynamic') && <button onClick={() => toggleBookmark(qFollowup?.id)} className={`p-1.5 rounded-md border shadow-sm ${bookmarkedCards.includes(qFollowup?.id) ? 'text-amber-500' : 'text-slate-300'}`}><Star className="w-4" /></button>}
              </div>
            </div>
            <div className="flex items-end space-x-2">
              <textarea value={ansFollowup} onChange={(e) => setAnsFollowup(e.target.value)} placeholder="Your deep-dive response..." className="flex-1 p-6 border rounded-2xl border-orange-200 focus:ring-4 focus:ring-orange-500/10 outline-none font-mono text-sm" rows="5" />
              <div className="flex flex-col space-y-2 mb-2">
                <VoiceInput onTranscript={t => setAnsFollowup(v => v + ' ' + t)} disabled={isAnalyzing} />
                <button onClick={submitFollowup} disabled={isAnalyzing || !ansFollowup.trim()} className="bg-orange-600 text-white p-3 rounded-xl shadow-lg focus:outline-none"><CheckCircle className="w-5 h-5" /></button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in">
            <div className="flex items-center space-x-3"><Trophy className="w-10 h-10 text-emerald-500" /><h2 className="text-3xl font-extrabold text-emerald-900 tracking-tight">Round Review</h2></div>
            <div className="space-y-8">
              <div className="p-6 bg-indigo-50/30 rounded-2xl border shadow-sm space-y-4">
                 <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Initial Concept</h4>
                 <div className="font-bold text-slate-800">{qMain?.question}</div>
                 {feedbackMain && <div className="p-4 bg-white rounded-xl border border-indigo-100 shadow-sm"><SafeMarkdownRenderer text={feedbackMain} /></div>}
                 <details><summary className="cursor-pointer text-xs font-bold text-indigo-500">View Ideal logic</summary><div className="mt-4"><AnswerBlock text={qMain?.answer} /></div></details>
              </div>
              <div className="p-6 bg-orange-50/30 rounded-2xl border border-orange-100 shadow-sm space-y-4">
                 <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Part 2: Deep Dive</h4>
                 <div className="font-bold text-slate-800">{qFollowup?.question}</div>
                 {feedbackFollowup && <div className="p-4 bg-white rounded-xl border border-orange-100 shadow-sm"><SafeMarkdownRenderer text={feedbackFollowup} /></div>}
                 <details><summary className="cursor-pointer text-xs font-bold text-orange-500">View Ideal logic</summary><div className="mt-4"><AnswerBlock text={qFollowup?.answer} /></div></details>
              </div>
            </div>
            <div className="flex justify-center pt-6"><button onClick={startRound} className="bg-slate-900 text-white px-12 py-4 rounded-2xl font-bold flex items-center hover:scale-105 transition shadow-xl"><RotateCcw className="w-5 h-5 mr-2" /> Start Next Round</button></div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- FLASHCARDS ---
function Flashcards({ studyData, setActiveContext, bookmarkedCards, toggleBookmark, masteredCards, setMasteredCards }) {
  const [selectedTopicName, setSelectedTopicName] = useState('All');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isRandomized, setIsRandomized] = useState(false);
  const [filterMode, setFilterMode] = useState('all'); 
  const flattened = useMemo(() => {
    let list = []; studyData.forEach(t => t.questions?.forEach(q => list.push({ id: q.question, topicName: t.name, front: q.question, back: q.answer })));
    return list;
  }, [studyData]);
  const topics = ['All', ...new Set(flattened.map(c => c.topicName))];
  const filtered = useMemo(() => {
    let f = selectedTopicName === 'All' ? flattened : flattened.filter(c => c.topicName === selectedTopicName);
    if (filterMode === 'learning') f = f.filter(c => !masteredCards.includes(c.id));
    if (filterMode === 'starred') f = f.filter(c => bookmarkedCards.includes(c.id));
    if (isRandomized) return shuffleArray(f);
    return f;
  }, [flattened, selectedTopicName, isRandomized, filterMode, masteredCards, bookmarkedCards]);
  const card = filtered[currentIndex];
  useEffect(() => { setActiveContext(card); }, [card, setActiveContext]);
  const handleNext = (rating) => {
    if (rating === 'Easy' && card && !masteredCards.includes(card.id)) setMasteredCards([...masteredCards, card.id]);
    setIsFlipped(false);
    setTimeout(() => { setCurrentIndex(p => filtered.length > 1 ? (p + 1) % filtered.length : 0); }, 150);
  };
  useEffect(() => {
    const kd = (e) => {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT' || !filtered.length) return;
      if (e.code === 'Space') { e.preventDefault(); setIsFlipped(v => !v); }
      if (isFlipped) {
        if (e.key === '1') handleNext('Again'); if (e.key === '2') handleNext('Hard'); if (e.key === '3') handleNext('Good'); if (e.key === '4') handleNext('Easy');
      }
    };
    window.addEventListener('keydown', kd); return () => window.removeEventListener('keydown', kd);
  }, [isFlipped, card, filtered.length]);
  
  if (!filtered.length) return <div className="text-center p-20 bg-white rounded-3xl border border-slate-200 shadow-sm animate-in zoom-in-95"><GraduationCap className="w-20 h-20 text-emerald-500 mx-auto mb-6" /><h3 className="text-2xl font-bold">Queue Empty</h3><button onClick={() => setFilterMode('all')} className="mt-6 bg-indigo-600 text-white px-8 py-2 rounded-xl shadow-md hover:bg-indigo-700 transition">Reset Filters</button></div>;
  
  const isB = bookmarkedCards.includes(card?.id);
  
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in zoom-in-95 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div><h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Flashcards</h2><p className="text-sm text-slate-500 font-medium">Card {currentIndex+1} of {filtered.length}</p></div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner">
             <button onClick={() => setFilterMode('all')} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${filterMode==='all'?'bg-white shadow-sm':'text-slate-500'}`}>All</button>
             <button onClick={() => setFilterMode('learning')} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${filterMode==='learning'?'bg-white shadow-sm text-emerald-600':'text-slate-500'}`}>Learning</button>
             <button onClick={() => setFilterMode('starred')} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center ${filterMode==='starred'?'bg-white shadow-sm text-amber-600':'text-slate-500'}`}><Star className="w-3 h-3 mr-1 fill-current" /> Starred</button>
          </div>
          <button onClick={() => { setIsRandomized(!isRandomized); setCurrentIndex(0); }} className={`p-2 rounded-xl border transition shadow-sm ${isRandomized ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white hover:bg-slate-50'}`}><Shuffle className="w-4 h-4" /></button>
          <select value={selectedTopicName} onChange={(e) => { setSelectedTopicName(e.target.value); setCurrentIndex(0); }} className="bg-white border p-2 rounded-xl text-xs font-bold w-44 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm">{topics.map(t => <option key={t} value={t}>{t}</option>)}</select>
        </div>
      </div>

      <div className="relative w-full h-[450px] cursor-pointer perspective-1000 group" onClick={() => setIsFlipped(!isFlipped)}>
        <div className={`w-full h-full transform-style-3d transition-transform duration-500 relative rounded-3xl shadow-2xl border bg-white ${isFlipped ? 'rotate-y-180' : ''}`}>
          
          {/* Front Side */}
          <div className={`absolute inset-0 backface-hidden flex flex-col justify-center items-center p-12 text-center transition-opacity duration-300 ${isFlipped ? 'opacity-0 z-0 pointer-events-none' : 'opacity-100 z-10'}`}>
            <button onClick={(e) => { e.stopPropagation(); toggleBookmark(card?.id); }} className={`absolute top-8 right-8 p-2 rounded-full transition ${isB ? 'bg-amber-50 text-amber-500' : 'bg-slate-50 text-slate-300 hover:bg-slate-100'}`}><Star className={`w-8 h-8 ${isB ? 'fill-current' : ''}`} /></button>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase rounded-lg mb-6 tracking-widest">{card?.topicName}</span>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-800 leading-snug">{card?.front}</h3>
            {masteredCards.includes(card?.id) && <div className="mt-4 flex items-center text-emerald-500 text-xs font-bold uppercase tracking-widest"><CheckCircle className="w-4 h-4 mr-1"/> Mastered</div>}
            <p className="text-slate-400 text-xs font-bold absolute bottom-8 uppercase tracking-widest bg-slate-50 px-4 py-1.5 rounded-lg border">Flip: [Space]</p>
          </div>

          {/* Back Side */}
          <div className={`absolute inset-0 backface-hidden rotate-y-180 bg-indigo-50/20 flex flex-col transition-opacity duration-300 ${isFlipped ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 w-full rounded-3xl">
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest text-center border-b pb-4 mb-4 block w-full border-indigo-100">Target Solution</span>
              <AnswerBlock text={card?.back} />
            </div>
          </div>

        </div>
      </div>

      {isFlipped && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-in slide-in-from-bottom-2">
          {['Again', 'Hard', 'Good', 'Easy'].map((l, i) => (<button key={i} onClick={(e) => { e.stopPropagation(); handleNext(l); }} className={`relative p-4 rounded-xl font-bold border transition shadow-sm hover:shadow-md hover:-translate-y-0.5 ${i===0?'bg-rose-50 border-rose-200 text-rose-700':i===1?'bg-orange-50 border-orange-200 text-orange-700':i===2?'bg-blue-50 border-blue-200 text-blue-700':'bg-emerald-50 border-emerald-200 text-emerald-700'}`}><span className="absolute top-2 right-3 text-[10px] opacity-30">[ {i+1} ]</span>{l}</button>))}
        </div>
      )}
    </div>
  );
}

// --- MOCK INTERVIEW ---
function MockInterview({ studyData, setActiveContext, bookmarkedCards, toggleBookmark }) {
  const [selected, setSelected] = useState('All');
  const [idx, setIdx] = useState(0);
  const [rev, setRev] = useState(false);
  const [isS, setIsS] = useState(false);
  const flat = useMemo(() => {
    let l = []; studyData.forEach(t => t.questions?.forEach(q => l.push({ ...q, topic: t.name }))); return l;
  }, [studyData]);
  const topics = ['All', ...new Set(flat.map(c => c.topic))];
  const filtered = selected === 'All' ? flat : flat.filter(c => c.topic === selected);
  const q = filtered[idx];
  useEffect(() => { setActiveContext(q); }, [q, setActiveContext]);
  const isB = bookmarkedCards.includes(q?.id);
  if (!q) return <div className="p-20 text-center font-bold text-slate-400">Please load data via Dashboard.</div>;
  return (
    <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in transition-all">
      <div className="bg-white border-b border-slate-100 p-5 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center space-x-3 text-indigo-600 font-bold text-sm uppercase bg-indigo-50 px-4 py-2 rounded-lg"><BookOpen className="w-4 h-4" /><span>{q.topic}</span></div>
        <select value={selected} onChange={(e) => { setSelected(e.target.value); setIdx(0); setRev(false); }} className="bg-white border border-slate-200 text-xs font-bold text-slate-700 rounded-xl p-2 w-48 outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm">{topics.map(t => <option key={t} value={t}>{t}</option>)}</select>
      </div>
      <div className="w-full bg-slate-100 h-1.5"><div className="bg-indigo-500 h-1.5 transition-all duration-500" style={{ width: `${(idx/filtered.length)*100}%` }}></div></div>
      <div className="p-8 sm:p-12">
        <div className="mb-8 relative group"><span className="text-slate-400 font-bold text-xs uppercase mb-3 block tracking-widest">Question {idx+1} of {filtered.length}</span><h2 className="text-xl sm:text-2xl font-bold leading-snug pr-20 text-slate-800">{q.question}</h2><div className="absolute top-0 right-0 flex space-x-2"><button onClick={() => isS ? stopSpeech() : speakText(q?.question, setIsS)} className="p-2.5 bg-slate-50 border border-slate-200 text-slate-400 hover:text-indigo-600 transition shadow-sm">{isS ? <VolumeX className="w-5" /> : <Volume2 className="w-5" />}</button><button onClick={() => toggleBookmark(q?.id)} className={`p-2.5 transition rounded-lg border shadow-sm ${isB ? 'bg-amber-50 text-amber-500 border-amber-200' : 'bg-white border-slate-200 text-slate-300'}`}><Star className={`w-5 ${isB ? 'fill-current' : ''}`} /></button></div></div>
        {!rev ? <button onClick={() => { setRev(true); stopSpeech(); }} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-black transition shadow-lg shadow-indigo-100">Reveal Standard Answer</button> : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4"><div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-8 shadow-inner"><h4 className="text-indigo-800 font-bold mb-5 uppercase text-[10px] tracking-widest border-b pb-3 border-indigo-100">Reference Logic</h4><AnswerBlock text={q.answer} /></div><button onClick={() => { setIdx(v => (v+1)%filtered.length); setRev(false); stopSpeech(); }} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 transition shadow-indigo-100">Next Scenario</button></div>
        )}
      </div>
    </div>
  );
}

const CareerCoach = () => (
  <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 rounded-3xl p-10 text-white shadow-2xl relative overflow-hidden">
      <h2 className="text-3xl sm:text-4xl font-extrabold mb-3 tracking-tight">SDE II Strategy</h2>
      <p className="text-indigo-200 text-lg max-w-2xl leading-relaxed">Transition from code implementation to scalable systems thinking.</p>
    </div>
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 hover:border-indigo-300 transition-all group">
        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center"><div className="bg-indigo-100 p-2 rounded-lg mr-3 group-hover:bg-indigo-600 transition-colors"><Target className="w-5 h-5 text-indigo-600 group-hover:text-white" /></div> Senior Resumes</h3>
        <ul className="space-y-4 text-slate-600 text-sm font-medium leading-relaxed">
          <li>• Focus on metrics: "Reduced P99 latency by 40% using Redis" rather than "Added caching."</li>
          <li>• Highlight ownership of Design Documents and Cross-functional initiatives.</li>
        </ul>
      </div>
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 hover:border-emerald-300 transition-all group">
        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center"><div className="bg-emerald-100 p-2 rounded-lg mr-3 group-hover:bg-emerald-500 transition-colors"><CodeIcon className="w-5 h-5 text-emerald-600 group-hover:text-white" /></div> Mastery Portfolios</h3>
        <ul className="space-y-4 text-slate-600 text-sm font-medium leading-relaxed">
          <li>• Build a custom Rate Limiter or Distributed Lock Manager in Java.</li>
          <li>• Contribute performance patches to core frameworks like Spring or Hibernate.</li>
        </ul>
      </div>
    </div>
  </div>
);