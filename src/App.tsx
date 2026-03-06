import React, { useEffect, useState, useRef } from "react";
import { 
  Rss, 
  Youtube, 
  Podcast, 
  MessageSquare, 
  ExternalLink, 
  Clock, 
  RefreshCw, 
  Moon, 
  Sun, 
  LayoutGrid, 
  List,
  Settings,
  Plus,
  Trash2,
  X,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  Check,
  Copy,
  Home,
  Menu
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import DOMPurify from "dompurify";

interface FeedItem {
  id: string;
  title: string;
  link: string;
  date: string;
  source: string;
  type: "reddit" | "youtube" | "podcast" | "blog";
  thumbnail: string | null;
  audioUrl?: string | null;
  summary?: string | null;
  content?: string | null;
}

interface UserFeed {
  id: number;
  url: string;
  type: string;
  name: string;
}

const FeedItemCard = React.memo(({ 
  item, 
  index, 
  isDarkMode, 
  readItems, 
  setSelectedItem, 
  toggleRead, 
  playingTrack, 
  isPlaying, 
  setIsPlaying, 
  setPlayingTrack,
  getIcon,
  formatDate
}: any) => {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`group relative overflow-hidden rounded-[28px] border transition-all duration-300 cursor-pointer ${
        isDarkMode 
          ? "bg-[#49454F]/10 border-[#49454F] hover:bg-[#49454F]/20" 
          : "bg-[#E7E0EB]/30 border-[#CAC4D0] hover:bg-[#E7E0EB]/50"
      } ${readItems.has(item.id) ? "opacity-60" : ""}`}
      onClick={() => setSelectedItem(item)}
    >
      <div className="flex flex-col sm:flex-row h-full">
        {item.thumbnail && (
          <div className="w-full sm:w-48 aspect-video sm:aspect-square overflow-hidden bg-[#1D1B20] shrink-0 relative">
            <img 
              src={item.thumbnail} 
              alt="" 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
            {item.audioUrl && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (playingTrack?.id === item.id) {
                    setIsPlaying(!isPlaying);
                  } else {
                    setPlayingTrack(item);
                    setIsPlaying(true);
                  }
                }}
                className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <div className="w-14 h-14 bg-[#D0BCFF] rounded-2xl flex items-center justify-center text-[#381E72] shadow-xl transform transition-transform hover:scale-110">
                  {playingTrack?.id === item.id && isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
                </div>
              </button>
            )}
          </div>
        )}
        
        <div className="flex-1 p-6 flex flex-col justify-between min-w-0" onClick={() => window.open(item.link, "_blank", "noopener,noreferrer")}>
          <div>
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-medium tracking-wide shrink-0 ${
                isDarkMode ? "bg-[#49454F] text-[#E6E1E5]" : "bg-[#E7E0EB] text-[#49454F]"
              }`}>
                {getIcon(item.type)}
                {item.source}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-[#938F99] font-medium shrink-0">
                <Clock className="w-3.5 h-3.5" />
                {formatDate(item.date)}
              </span>
            </div>
            
            <h2 className="text-xl font-medium leading-tight mb-3 group-hover:text-[#D0BCFF] transition-colors line-clamp-3 cursor-pointer">
              {item.title}
            </h2>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                isDarkMode ? "bg-[#49454F] text-[#E6E1E5]" : "bg-[#E7E0EB] text-[#49454F]"
              }`}>
                {item.source.charAt(0)}
              </div>
              <span className="text-sm text-[#938F99] truncate">{item.source}</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleRead(item.id);
                }}
                className={`p-2.5 rounded-full transition-colors ${
                  readItems.has(item.id) ? "text-[#6750A4]" : "text-[#938F99] hover:bg-[#49454F]/50"
                }`}
              >
                <Check className="w-5 h-5" />
              </button>
              {item.audioUrl && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (playingTrack?.id === item.id) {
                      setIsPlaying(!isPlaying);
                    } else {
                      setPlayingTrack(item);
                      setIsPlaying(true);
                    }
                  }}
                  className={`p-2.5 rounded-full transition-colors ${
                    playingTrack?.id === item.id ? "bg-[#D0BCFF] text-[#381E72]" : "hover:bg-[#49454F]/50 text-[#938F99]"
                  }`}
                >
                  {playingTrack?.id === item.id && isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
              )}
              <ExternalLink className="w-5 h-5 text-[#938F99] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
});

export default function App() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [userFeeds, setUserFeeds] = useState<UserFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return true;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);
  const [playingTrack, setPlayingTrack] = useState<FeedItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  
  // New States
  const [currentTab, setCurrentTab] = useState<"home" | "feeds" | "settings">("home");
  const [readItems, setReadItems] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("readItems");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [isQuickAddLoading, setIsQuickAddLoading] = useState(false);
  const feedCache = useRef<Map<string, { data: any, timestamp: number }>>(new Map());
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  useEffect(() => {
    localStorage.setItem("readItems", JSON.stringify(Array.from(readItems)));
  }, [readItems]);

  // New Feed Form
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [newFeedType, setNewFeedType] = useState("blog");
  const [newFeedName, setNewFeedName] = useState("");

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(() => setIsPlaying(false));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, playingTrack]);

  const fetchFeed = async () => {
    const cacheKey = "all_feeds";
    const cached = feedCache.current.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setItems(cached.data);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/feed");
      if (!response.ok) throw new Error("Failed to fetch feed");
      const data = await response.json();
      
      feedCache.current.set(cacheKey, { data, timestamp: Date.now() });
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserFeeds = async () => {
    try {
      const response = await fetch("/api/feeds");
      const data = await response.json();
      setUserFeeds(data);
    } catch (err) {
      console.error("Failed to fetch user feeds");
    }
  };

  useEffect(() => {
    fetchFeed();
    fetchUserFeeds();
  }, []);

  const handleAddFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newFeedUrl, type: newFeedType, name: newFeedName }),
      });
      if (!response.ok) throw new Error("Failed to add feed");
      setNewFeedUrl("");
      setNewFeedName("");
      fetchUserFeeds();
      fetchFeed();
    } catch (err) {
      alert("Error adding feed. It might already exist.");
    }
  };

  const handleDeleteFeed = async (id: number) => {
    try {
      await fetch(`/api/feeds/${id}`, { method: "DELETE" });
      fetchUserFeeds();
      fetchFeed();
    } catch (err) {
      console.error("Failed to delete feed");
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "reddit": return <MessageSquare className="w-4 h-4 text-[#FF4500]" />;
      case "youtube": return <Youtube className="w-4 h-4 text-[#FF0000]" />;
      case "podcast": return <Podcast className="w-4 h-4 text-[#6750A4]" />;
      case "blog": return <Rss className="w-4 h-4 text-[#0061A4]" />;
      default: return <Rss className="w-4 h-4 text-[#49454F]" />;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const toggleRead = (id: string) => {
    setReadItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isToday = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date("2026-03-05T10:00:00Z"); // Using the provided local time context
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const filteredItems = items.filter(item => selectedType === "all" || item.type === selectedType);
  const todayItems = filteredItems.filter(item => isToday(item.date));
  const otherItems = filteredItems.filter(item => !isToday(item.date));

  return (
    <div className={`h-[100dvh] w-full overflow-hidden flex flex-col transition-colors duration-300 ${isDarkMode ? "bg-[#1D1B20] text-[#E6E1E5]" : "bg-[#FEF7FF] text-[#1D1B20]"}`}>
      {/* Top App Bar */}
      <header className={`shrink-0 z-[100] border-b ${
        isDarkMode ? "bg-[#1D1B20] border-[#49454F]" : "bg-[#FEF7FF] border-[#CAC4D0]"
      }`}>
        <div className="px-4">
          <div className="h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#6750A4] rounded-lg flex items-center justify-center text-white shadow-sm">
                <Rss className="w-5 h-5" />
              </div>
              <h1 className="text-lg font-medium tracking-tight">
                {currentTab === "home" && "FeedReader"}
                {currentTab === "feeds" && "Meus Feeds"}
                {currentTab === "settings" && "Configurações"}
              </h1>
            </div>
            
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-full transition-colors ${
                  isDarkMode ? "hover:bg-[#49454F]/50 text-[#E6E1E5]" : "hover:bg-[#E7E0EB] text-[#49454F]"
                }`}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              {currentTab === "home" && (
                <button 
                  onClick={fetchFeed}
                  disabled={loading}
                  className={`p-2 rounded-full transition-colors ${
                    isDarkMode ? "hover:bg-[#49454F]/50 text-[#E6E1E5]" : "hover:bg-[#E7E0EB] text-[#49454F]"
                  } ${loading ? "animate-spin" : ""}`}
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Filter Bar (Only on Home) */}
          {currentTab === "home" && (
            <div className="flex items-center gap-2 py-2 overflow-x-auto no-scrollbar">
              {[
                { id: "all", label: "Tudo", icon: <Rss className="w-4 h-4" /> },
                { id: "blog", label: "Blogs", icon: <Rss className="w-4 h-4" /> },
                { id: "reddit", label: "Reddit", icon: <MessageSquare className="w-4 h-4" /> },
                { id: "youtube", label: "YouTube", icon: <Youtube className="w-4 h-4" /> },
                { id: "podcast", label: "Podcasts", icon: <Podcast className="w-4 h-4" /> },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setSelectedType(filter.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                    selectedType === filter.id
                      ? "bg-[#D0BCFF] text-[#381E72] shadow-sm"
                      : isDarkMode 
                        ? "bg-[#49454F]/30 text-[#E6E1E5] hover:bg-[#49454F]/50" 
                        : "bg-[#E7E0EB]/50 text-[#49454F] hover:bg-[#E7E0EB]"
                  }`}
                >
                  {filter.icon}
                  {filter.label}
                </button>
              ))}
              
              <div className="flex-1" />
              
              <button
                onClick={() => {
                  const allIds = items.map(i => i.id);
                  setReadItems(new Set(allIds));
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                  isDarkMode 
                    ? "text-[#D0BCFF] hover:bg-[#D0BCFF]/10" 
                    : "text-[#6750A4] hover:bg-[#6750A4]/10"
                }`}
              >
                <Check className="w-4 h-4" />
                Lido
              </button>
            </div>
          )}
        </div>
      </header>

      <main className={`flex-1 overflow-y-auto no-scrollbar relative ${playingTrack ? "pb-24" : ""}`}>
        {currentTab === "home" && (
          <div className="px-4 py-6 pb-32">
            {/* Highlights Section */}
            {todayItems.length > 0 && !loading && (
              <section className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-[#D0BCFF] rounded-full" />
                    <h2 className="text-xl font-medium tracking-tight">Destaques</h2>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-medium ${
                    isDarkMode ? "bg-[#49454F] text-[#E6E1E5]" : "bg-[#E7E0EB] text-[#49454F]"
                  }`}>
                    {todayItems.length} novos
                  </span>
                </div>
                
                <div className="flex flex-col gap-4">
                  {todayItems.slice(0, 2).map((item, index) => (
                    <motion.article
                      key={item.id + "highlight" + index}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`relative overflow-hidden rounded-2xl aspect-[16/10] group cursor-pointer shadow-md transition-all ${
                        isDarkMode ? "bg-[#1D1B20]" : "bg-white"
                      } ${readItems.has(item.id) ? "opacity-60 grayscale-[0.5]" : ""}`}
                      onClick={() => setSelectedItem(item)}
                    >
                      {item.thumbnail ? (
                        <img 
                          src={item.thumbnail} 
                          alt="" 
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className={`absolute inset-0 ${isDarkMode ? "bg-[#49454F]/20" : "bg-[#E7E0EB]/30"}`} />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                      
                      <div className="absolute bottom-0 left-0 right-0 p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 bg-[#D0BCFF] text-[#381E72] rounded-full text-[9px] font-bold uppercase tracking-wider">

                        {item.source}
                      </span>
                      <span className="text-white/70 text-[10px] font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(item.date)}
                      </span>
                    </div>
                    <h3 className="text-2xl font-medium text-white leading-tight line-clamp-2 group-hover:text-[#D0BCFF] transition-colors">
                      {item.title}
                    </h3>
                  </div>

                  <div className="absolute top-6 left-6 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleRead(item.id);
                      }}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        readItems.has(item.id) 
                          ? "bg-[#6750A4] text-white" 
                          : "bg-black/20 text-white backdrop-blur-md hover:bg-black/40"
                      }`}
                    >
                      <Check className="w-5 h-5" />
                    </button>
                  </div>

                  {item.audioUrl && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (playingTrack?.id === item.id) {
                          setIsPlaying(!isPlaying);
                        } else {
                          setPlayingTrack(item);
                          setIsPlaying(true);
                        }
                      }}
                      className="absolute top-6 right-6 w-14 h-14 bg-[#D0BCFF] rounded-2xl flex items-center justify-center text-[#381E72] shadow-xl transform transition-transform hover:scale-110"
                    >
                      {playingTrack?.id === item.id && isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
                    </button>
                  )}
                </motion.article>
              ))}
            </div>
          </section>
        )}

        {/* FAB for adding new feed - Removed for mobile nav */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl mb-8 flex items-center gap-3">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            {error}
          </div>
        )}

        {loading && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-zinc-500 font-medium">Fetching your favorite content...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {todayItems.length > 0 && (
              <div className="flex items-center gap-4 mb-2">
                <h3 className="text-sm font-medium text-[#938F99] uppercase tracking-widest">Anteriores</h3>
                <div className={`flex-1 h-px ${isDarkMode ? "bg-[#49454F]" : "bg-[#CAC4D0]"}`} />
              </div>
            )}
            
            <div className="space-y-6">
              <AnimatePresence mode="popLayout">
                {otherItems.map((item, index) => (
                  <FeedItemCard
                    key={item.id + index}
                    item={item}
                    index={index}
                    isDarkMode={isDarkMode}
                    readItems={readItems}
                    setSelectedItem={setSelectedItem}
                    toggleRead={toggleRead}
                    playingTrack={playingTrack}
                    isPlaying={isPlaying}
                    setIsPlaying={setIsPlaying}
                    setPlayingTrack={setPlayingTrack}
                    getIcon={getIcon}
                    formatDate={formatDate}
                  />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  )}

  {!loading && items.length === 0 && !error && currentTab === "home" && (
        <div className="text-center py-20">
          <p className="text-zinc-500">No items found in your feed.</p>
        </div>
      )}
      
      {currentTab === "feeds" && (
          <div className="px-4 py-6 pb-32 space-y-8">
            <div className={`p-6 rounded-3xl ${isDarkMode ? "bg-[#49454F]/20" : "bg-[#E7E0EB]/30"}`}>
              <h3 className="text-lg font-medium mb-4">Adicionar Novo Feed</h3>
              <form onSubmit={handleAddFeed} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-[#938F99]">URL do Feed ou Site</label>
                  <input
                    type="url"
                    required
                    value={newFeedUrl}
                    onChange={(e) => setNewFeedUrl(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl text-sm outline-none border transition-all ${
                      isDarkMode 
                        ? "bg-[#1D1B20] border-[#49454F] focus:border-[#D0BCFF]" 
                        : "bg-white border-[#CAC4D0] focus:border-[#6750A4]"
                    }`}
                    placeholder="https://..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-[#938F99]">Nome (Opcional)</label>
                    <input
                      type="text"
                      value={newFeedName}
                      onChange={(e) => setNewFeedName(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl text-sm outline-none border transition-all ${
                        isDarkMode 
                          ? "bg-[#1D1B20] border-[#49454F] focus:border-[#D0BCFF]" 
                          : "bg-white border-[#CAC4D0] focus:border-[#6750A4]"
                      }`}
                      placeholder="Meu Blog Favorito"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-[#938F99]">Tipo</label>
                    <select
                      value={newFeedType}
                      onChange={(e) => setNewFeedType(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl text-sm outline-none border transition-all appearance-none ${
                        isDarkMode 
                          ? "bg-[#1D1B20] border-[#49454F] focus:border-[#D0BCFF]" 
                          : "bg-white border-[#CAC4D0] focus:border-[#6750A4]"
                      }`}
                    >
                      <option value="blog">Blog / Notícias</option>
                      <option value="youtube">YouTube</option>
                      <option value="podcast">Podcast</option>
                      <option value="reddit">Reddit</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-[#6750A4] text-white rounded-xl text-sm font-medium hover:bg-[#6750A4]/90 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Adicionar Feed
                </button>
              </form>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Meus Feeds ({userFeeds.length})</h3>
              <div className="space-y-3">
                {userFeeds.map((feed) => (
                  <div 
                    key={feed.id}
                    className={`flex items-center justify-between p-4 rounded-2xl border ${
                      isDarkMode ? "bg-[#1D1B20] border-[#49454F]" : "bg-white border-[#CAC4D0]"
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isDarkMode ? "bg-[#49454F]" : "bg-[#E7E0EB]"
                      }`}>
                        {getIcon(feed.type as any)}
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-medium truncate">{feed.name || feed.url}</p>
                        <p className="text-xs text-[#938F99] truncate">{feed.url}</p>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        if (confirm("Remover este feed?")) {
                          await fetch(`/api/feeds/${feed.id}`, { method: "DELETE" });
                          fetchUserFeeds();
                          fetchFeed();
                        }
                      }}
                      className="p-2 text-red-400 hover:bg-red-400/10 rounded-full transition-colors shrink-0"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentTab === "settings" && (
          <div className="px-4 py-6 pb-32 space-y-8">
            <div className={`p-6 rounded-3xl ${isDarkMode ? "bg-[#49454F]/20" : "bg-[#E7E0EB]/30"}`}>
              <h3 className="text-lg font-medium mb-4">Aparência</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Modo Escuro</p>
                  <p className="text-sm text-[#938F99]">Alternar tema do aplicativo</p>
                </div>
                <button 
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className={`p-3 rounded-full transition-colors ${
                    isDarkMode ? "bg-[#49454F] text-[#E6E1E5]" : "bg-[#E7E0EB] text-[#49454F]"
                  }`}
                >
                  {isDarkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className={`shrink-0 border-t pb-safe z-[100] ${
        isDarkMode ? "bg-[#1D1B20] border-[#49454F]" : "bg-[#FEF7FF] border-[#CAC4D0]"
      }`}>
        <div className="flex items-center justify-around h-16 px-2">
          <button
            onClick={() => setCurrentTab("home")}
            className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${
              currentTab === "home" 
                ? isDarkMode ? "text-[#D0BCFF]" : "text-[#6750A4]" 
                : "text-[#938F99]"
            }`}
          >
            <div className={`px-4 py-1 rounded-full transition-colors ${
              currentTab === "home" ? (isDarkMode ? "bg-[#49454F]/50" : "bg-[#E7E0EB]") : ""
            }`}>
              <Home className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-medium">Início</span>
          </button>
          
          <button
            onClick={() => setCurrentTab("feeds")}
            className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${
              currentTab === "feeds" 
                ? isDarkMode ? "text-[#D0BCFF]" : "text-[#6750A4]" 
                : "text-[#938F99]"
            }`}
          >
            <div className={`px-4 py-1 rounded-full transition-colors ${
              currentTab === "feeds" ? (isDarkMode ? "bg-[#49454F]/50" : "bg-[#E7E0EB]") : ""
            }`}>
              <List className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-medium">Feeds</span>
          </button>

          <button
            onClick={() => setCurrentTab("settings")}
            className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${
              currentTab === "settings" 
                ? isDarkMode ? "text-[#D0BCFF]" : "text-[#6750A4]" 
                : "text-[#938F99]"
            }`}
          >
            <div className={`px-4 py-1 rounded-full transition-colors ${
              currentTab === "settings" ? (isDarkMode ? "bg-[#49454F]/50" : "bg-[#E7E0EB]") : ""
            }`}>
              <Settings className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-medium">Ajustes</span>
          </button>
        </div>
      </nav>

      {/* Reader View Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 sm:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedItem(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className={`relative w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-4xl sm:rounded-[32px] overflow-hidden flex flex-col shadow-2xl ${
                isDarkMode ? "bg-[#1D1B20] text-[#E6E1E5]" : "bg-[#FEF7FF] text-[#1D1B20]"
              }`}
            >
              {/* Modal Header */}
              <div className={`p-6 flex items-center justify-between border-b ${
                isDarkMode ? "border-[#49454F]" : "border-[#CAC4D0]"
              }`}>
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isDarkMode ? "bg-[#49454F]" : "bg-[#E7E0EB]"
                  }`}>
                    {getIcon(selectedItem.type)}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#938F99] truncate">
                      {selectedItem.source}
                    </p>
                    <p className="text-xs text-[#938F99]">{formatDate(selectedItem.date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedItem.link);
                    }}
                    className={`p-3 rounded-full transition-colors ${
                      isDarkMode ? "hover:bg-[#49454F]" : "hover:bg-[#E7E0EB]"
                    }`}
                    title="Copy Link"
                  >
                    <Copy className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => window.open(selectedItem.link, "_blank")}
                    className={`p-3 rounded-full transition-colors ${
                      isDarkMode ? "hover:bg-[#49454F]" : "hover:bg-[#E7E0EB]"
                    }`}
                    title="Open in Browser"
                  >
                    <ExternalLink className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => setSelectedItem(null)}
                    className={`p-3 rounded-full transition-colors ${
                      isDarkMode ? "hover:bg-[#49454F]" : "hover:bg-[#E7E0EB]"
                    }`}
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-8 sm:p-12">
                <div className="max-w-2xl mx-auto">
                  {selectedItem.thumbnail && (
                    <img
                      src={selectedItem.thumbnail}
                      alt=""
                      className="w-full aspect-video object-cover rounded-[24px] mb-8 shadow-lg"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <h2 className="text-3xl sm:text-4xl font-medium leading-tight mb-8">
                    {selectedItem.title}
                  </h2>
                  
                  <div 
                    className={`prose prose-lg max-w-none ${isDarkMode ? "prose-invert" : ""} 
                      prose-headings:font-medium prose-p:leading-relaxed prose-a:text-[#6750A4]`}
                    dangerouslySetInnerHTML={{ 
                      __html: DOMPurify.sanitize(selectedItem.content || selectedItem.summary || "No content available.") 
                    }}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className={`p-6 flex items-center justify-center border-t ${
                isDarkMode ? "border-[#49454F]" : "border-[#CAC4D0]"
              }`}>
                <button
                  onClick={() => {
                    toggleRead(selectedItem.id);
                    setSelectedItem(null);
                  }}
                  className="bg-[#6750A4] hover:bg-[#4F378B] text-white px-8 py-3 rounded-full font-medium flex items-center gap-2 transition-all shadow-md hover:shadow-lg"
                >
                  <Check className="w-5 h-5" />
                  {readItems.has(selectedItem.id) ? "Marcar como não lido" : "Marcar como lido"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Player */}
      <AnimatePresence>
        {playingTrack && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className={`fixed bottom-16 left-0 right-0 z-[90] border-t backdrop-blur-xl pb-safe ${
              isDarkMode ? "bg-[#1D1B20]/95 border-[#49454F]" : "bg-[#FEF7FF]/95 border-[#CAC4D0]"
            }`}
          >
            {/* Progress Bar */}
            <div 
              className={`absolute top-0 left-0 right-0 h-1.5 cursor-pointer group/progress ${
                isDarkMode ? "bg-[#49454F]" : "bg-[#E7E0EB]"
              }`}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percentage = x / rect.width;
                if (audioRef.current) {
                  audioRef.current.currentTime = percentage * duration;
                }
              }}
            >
              <div 
                className="h-full bg-[#D0BCFF] relative transition-all duration-100"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-[#D0BCFF] rounded-full shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity" />
              </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
              {playingTrack.thumbnail && (
                <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 hidden sm:block shadow-md">
                  <img src={playingTrack.thumbnail} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium truncate">{playingTrack.title}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[11px] text-[#938F99] truncate">{playingTrack.source}</p>
                  <span className="text-[11px] text-[#938F99] font-mono">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-4">
                <button
                  onClick={() => {
                    if (audioRef.current) {
                      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 15);
                    }
                  }}
                  className={`p-2 transition-colors ${isDarkMode ? "text-[#E6E1E5] hover:bg-[#49454F]" : "text-[#49454F] hover:bg-[#E7E0EB]"} rounded-full`}
                  title="Voltar 15s"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
                
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-12 h-12 bg-[#D0BCFF] rounded-full flex items-center justify-center text-[#381E72] hover:bg-[#EADDFF] transition-colors shadow-md"
                >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                </button>

                <button
                  onClick={() => {
                    if (audioRef.current) {
                      audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 30);
                    }
                  }}
                  className={`p-2 transition-colors ${isDarkMode ? "text-[#E6E1E5] hover:bg-[#49454F]" : "text-[#49454F] hover:bg-[#E7E0EB]"} rounded-full`}
                  title="Avançar 30s"
                >
                  <RotateCw className="w-5 h-5" />
                </button>

                <button
                  onClick={() => {
                    setPlayingTrack(null);
                    setIsPlaying(false);
                    setCurrentTime(0);
                  }}
                  className={`p-2 transition-colors ${isDarkMode ? "text-[#938F99] hover:bg-[#49454F]" : "text-[#938F99] hover:bg-[#E7E0EB]"} rounded-full ml-2`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <audio
                ref={audioRef}
                autoPlay
                src={playingTrack.audioUrl || ""}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => {
                  setIsPlaying(false);
                  setCurrentTime(0);
                }}
                className="hidden"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
