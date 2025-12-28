
import React, { useState, useEffect, useMemo } from 'react';
import { discoverEvents } from '../services/gemini';
import { GroundingSource, EventItem } from '../types';
import { 
  Search, 
  Loader2, 
  ExternalLink, 
  Calendar as CalIcon, 
  MapPin, 
  X, 
  Info, 
  Sparkles, 
  Navigation, 
  Heart, 
  Clock, 
  AlertCircle,
  Share2,
  Check,
  Tag,
  ShieldCheck,
  Filter,
  Search as SearchIcon,
  Instagram,
  Globe,
  Share,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const EVENTS_PER_PAGE = 12;

export const Events: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [favorites, setFavorites] = useState<EventItem[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [hideOutdated, setHideOutdated] = useState(true);
  const [showAccessibleOnly, setShowAccessibleOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const categories = ['All', 'Party', 'Culture', 'Workshop', 'Social', 'Clubbing', 'Outdoor'];

  useEffect(() => {
    const savedFavorites = localStorage.getItem('escale_favorites');
    if (savedFavorites) {
      try { setFavorites(JSON.parse(savedFavorites)); } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('escale_favorites', JSON.stringify(favorites));
  }, [favorites]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [query, showFavoritesOnly, showAccessibleOnly, selectedCategory]);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (showFavoritesOnly) setShowFavoritesOnly(false);
    setLoading(true);
    try {
      const data = await discoverEvents(query || "upcoming parties and student events in Paris and suburbs");
      setEvents(data.events);
      setSources(data.sources);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInitial = async () => {
    setLoading(true);
    try {
      const data = await discoverEvents("all student events, parties, and gatherings in Paris area for the next 7 days");
      setEvents(data.events);
      setSources(data.sources);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInitial(); }, []);

  const isFavorited = (id: string) => favorites.some(fav => fav.id === id);

  const toggleFavorite = (e: React.MouseEvent, event: EventItem) => {
    e.stopPropagation();
    if (isFavorited(event.id)) {
      setFavorites(prev => prev.filter(fav => fav.id !== event.id));
    } else {
      setFavorites(prev => [...prev, event]);
    }
  };

  const handleShare = async (e: React.MouseEvent, event: EventItem) => {
    e.stopPropagation();
    const timeInfo = event.startTime ? ` at ${event.startTime}${event.endTime ? ` - ${event.endTime}` : ''}` : '';
    const shareText = `🇫🇷 *${event.title}* in Paris!\n📅 ${event.date}${timeInfo}\n📍 ${event.location}\n\nCheck it out on L'Escale Paris:`;
    const shareUrl = window.location.origin;

    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        setCopiedId(event.id);
        setTimeout(() => setCopiedId(null), 2000);
      } catch (err) {
        console.error("Error copying to clipboard:", err);
      }
    }
  };

  const isPast = (isoDate: string) => {
    const eventDate = new Date(isoDate);
    const now = new Date();
    return eventDate.getTime() < (now.getTime() - (6 * 60 * 60 * 1000));
  };

  const filteredEvents = useMemo(() => {
    let list = showFavoritesOnly ? favorites : events;
    if (hideOutdated) list = list.filter(e => !isPast(e.isoDate));
    if (showAccessibleOnly) list = list.filter(e => e.isAccessible);
    if (selectedCategory !== 'All') {
      list = list.filter(e => e.category.toLowerCase().includes(selectedCategory.toLowerCase()));
    }

    return [...list].sort((a, b) => new Date(a.isoDate).getTime() - new Date(b.isoDate).getTime());
  }, [showFavoritesOnly, favorites, events, hideOutdated, showAccessibleOnly, selectedCategory]);

  const totalPages = Math.ceil(filteredEvents.length / EVENTS_PER_PAGE);
  const displayedEvents = useMemo(() => {
    const start = (currentPage - 1) * EVENTS_PER_PAGE;
    return filteredEvents.slice(start, start + EVENTS_PER_PAGE);
  }, [filteredEvents, currentPage]);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="p-6 space-y-6 relative min-h-screen pb-32">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="space-y-1 flex-1">
          <h2 className="text-3xl font-serif font-bold text-slate-900">Le Pulse</h2>
          <p className="text-slate-500 text-sm">Paris & Suburbs: Every event, verified or niche.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
          <button 
            onClick={() => setShowAccessibleOnly(!showAccessibleOnly)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all shadow-sm ${
              showAccessibleOnly 
              ? 'bg-amber-100 text-amber-700 border border-amber-200' 
              : 'bg-white text-slate-500 border border-stone-200 hover:bg-stone-50'
            }`}
          >
            <ShieldCheck className={`w-3 h-3 ${showAccessibleOnly ? 'fill-current' : ''}`} />
            Safe Bets Only
          </button>

          <button onClick={() => setShowFavoritesOnly(!showFavoritesOnly)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all shadow-sm ${showFavoritesOnly ? 'bg-pink-100 text-pink-600 border-pink-200' : 'bg-white text-slate-500 border-stone-200 hover:bg-stone-50'}`}>
            <Heart className={`w-3 h-3 ${showFavoritesOnly ? 'fill-current' : ''}`} />
            My Journey
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {!showFavoritesOnly && (
          <form onSubmit={handleSearch} className="relative">
            <input 
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search e.g. 'Underground Techno' or 'Suburbs'..."
              className="w-full bg-white border border-stone-200 rounded-2xl py-4 pl-12 pr-4 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          </form>
        )}

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2 rounded-full text-[11px] font-bold whitespace-nowrap transition-all shadow-sm border ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white border-slate-900 scale-105'
                  : 'bg-white text-slate-500 border-stone-200 hover:border-slate-300 hover:bg-stone-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-stone-100 pb-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          {loading ? 'Discovering...' : `${filteredEvents.length} events found`}
        </p>
        {!loading && totalPages > 1 && (
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
            Page {currentPage} of {totalPages}
          </p>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-slate-400 animate-pulse font-medium mt-4">Lili is digging deep for local events...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedEvents.length > 0 ? displayedEvents.map((event) => {
              const expired = isPast(event.isoDate);
              return (
                <div 
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className={`bg-white rounded-3xl border transition-all cursor-pointer group active:scale-[0.98] relative ${
                    event.isAccessible ? 'border-amber-200 shadow-[0_8px_30px_rgba(255,191,0,0.05)]' : 'border-stone-100 shadow-sm'
                  } hover:shadow-xl hover:border-blue-100 ${expired ? 'opacity-60' : ''}`}
                >
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-wrap gap-2">
                        <span className="bg-slate-50 text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border border-stone-100/50">
                          {event.category}
                        </span>
                        {event.isAccessible && (
                          <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 border border-amber-100/50">
                            <ShieldCheck className="w-3 h-3" /> Safe Bet
                          </span>
                        )}
                        {!event.isAccessible && (
                          <span className="bg-purple-50 text-purple-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 border border-purple-100/50">
                            <Navigation className="w-3 h-3" /> Deep Local
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors leading-tight min-h-[3rem] line-clamp-2">
                      {event.title}
                    </h3>
                    
                    <div className="flex flex-col gap-2 text-xs text-slate-500">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg ${expired ? 'bg-stone-100' : 'bg-blue-50'}`}>
                          <CalIcon className={`w-3.5 h-3.5 ${expired ? 'text-slate-400' : 'text-blue-500'}`} />
                        </div>
                        <div className="flex flex-col">
                          <span className={expired ? 'line-through decoration-slate-300' : 'font-medium text-slate-700'}>{event.date}</span>
                          {event.startTime && (
                            <span className="text-[9px] font-bold text-blue-600 uppercase">
                              <Clock className="w-3 h-3 inline mr-1" />
                              {event.startTime}{event.endTime ? ` - ${event.endTime}` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg ${expired ? 'bg-stone-100' : 'bg-red-50'}`}>
                          <MapPin className={`w-3.5 h-3.5 ${expired ? 'text-slate-400' : 'text-red-500'}`} />
                        </div>
                        <span className="truncate font-medium text-slate-700">{event.location}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-stone-50">
                      <span className="text-[10px] text-slate-400 italic font-medium truncate max-w-[60%]">{event.vibe}</span>
                      <div className="flex gap-1">
                          <button 
                            onClick={(e) => handleShare(e, event)} 
                            title="Share Event"
                            className="p-2 hover:bg-stone-50 rounded-lg transition-all text-slate-400 hover:text-blue-600 relative group/share"
                          >
                            {copiedId === event.id ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Share2 className="w-4 h-4" />
                            )}
                          </button>
                          <button onClick={(e) => toggleFavorite(e, event)} className="p-2 hover:bg-pink-50 rounded-lg transition-all group/fav">
                            <Heart className={`w-4 h-4 transition-all ${isFavorited(event.id) ? 'text-pink-500 fill-current' : 'text-slate-300 group-hover/fav:text-pink-400'}`} />
                          </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="col-span-full text-center py-24 bg-white rounded-[3rem] border border-dashed border-stone-200">
                <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <SearchIcon className="w-10 h-10 text-stone-200" />
                </div>
                <h4 className="text-xl font-serif font-bold text-slate-800 mb-2">No results found</h4>
                <button onClick={fetchInitial} className="text-blue-600 font-bold text-sm hover:underline">Reset search</button>
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col items-center gap-4 pt-12">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-3 bg-white border border-stone-200 rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-stone-50 transition-all shadow-sm"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <div className="flex items-center gap-1.5 px-2">
                  {[...Array(totalPages)].map((_, i) => {
                    const pageNum = i + 1;
                    // Show current page, and maybe 1 before/after if many
                    if (
                      totalPages > 6 &&
                      pageNum !== 1 &&
                      pageNum !== totalPages &&
                      (pageNum < currentPage - 1 || pageNum > currentPage + 1)
                    ) {
                      if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                        return <span key={pageNum} className="text-slate-300 px-1">...</span>;
                      }
                      return null;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`w-10 h-10 rounded-2xl text-xs font-bold transition-all ${
                          currentPage === pageNum
                            ? 'bg-slate-900 text-white shadow-lg scale-110'
                            : 'bg-white border border-stone-200 text-slate-500 hover:bg-stone-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button 
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-3 bg-white border border-stone-200 rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-stone-50 transition-all shadow-sm"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                Showing {Math.min(filteredEvents.length, (currentPage - 1) * EVENTS_PER_PAGE + 1)}-{Math.min(filteredEvents.length, currentPage * EVENTS_PER_PAGE)} of {filteredEvents.length}
              </p>
            </div>
          )}
        </>
      )}

      {selectedEvent && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setSelectedEvent(null)} />
          <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 duration-300 flex flex-col max-h-[90vh]">
            <button onClick={() => setSelectedEvent(null)} className="absolute top-6 right-6 z-20 bg-black/30 hover:bg-black/50 text-white p-2.5 rounded-full backdrop-blur-md transition-all"><X className="w-5 h-5" /></button>
            <div className="h-56 relative shrink-0">
              <img src={`https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=Paris+${encodeURIComponent(selectedEvent.location)}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent" />
            </div>
            <div className="p-8 space-y-8 overflow-y-auto no-scrollbar">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="bg-slate-900 text-white font-bold text-[10px] uppercase tracking-widest px-3 py-1 rounded-full">{selectedEvent.category}</span>
                  {selectedEvent.isAccessible ? (
                    <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 border border-amber-200">
                      <ShieldCheck className="w-3.5 h-3.5" /> Beginner Friendly
                    </span>
                  ) : (
                    <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 border border-purple-200">
                      <Navigation className="w-3.5 h-3.5" /> Local Intelligence Req.
                    </span>
                  )}
                </div>
                <h2 className="text-3xl font-serif font-bold text-slate-900 leading-tight">{selectedEvent.title}</h2>
                <div className={`p-4 rounded-2xl flex gap-3 ${selectedEvent.isAccessible ? 'bg-amber-50/50 border border-amber-100' : 'bg-purple-50/50 border border-purple-100'}`}>
                  <Info className={`w-5 h-5 shrink-0 mt-0.5 ${selectedEvent.isAccessible ? 'text-amber-500' : 'text-purple-500'}`} />
                  <p className={`text-xs leading-relaxed font-medium ${selectedEvent.isAccessible ? 'text-amber-800' : 'text-purple-800'}`}>
                    <span className="font-bold block mb-1">Lili's Guidance:</span>
                    {selectedEvent.accessibilityReason}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6 border-y border-stone-100 py-6">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">When</p>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-bold text-slate-800 flex items-center gap-2.5">
                      <CalIcon className="w-4 h-4 text-blue-600" /> {selectedEvent.date}
                    </p>
                    {selectedEvent.startTime && (
                      <p className="text-xs font-bold text-blue-600 flex items-center gap-2.5 ml-6.5">
                        <Clock className="w-3.5 h-3.5" /> {selectedEvent.startTime}{selectedEvent.endTime ? ` - ${selectedEvent.endTime}` : ''}
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Where</p>
                  <p className="text-sm font-bold text-slate-800 flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 text-red-600" /> {selectedEvent.location}
                  </p>
                </div>
              </div>

              {!selectedEvent.isAccessible && (
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">How to find more info</p>
                  <div className="flex flex-wrap gap-2">
                    <a 
                      href={`https://www.google.com/search?q=${encodeURIComponent(selectedEvent.title + " " + selectedEvent.location + " Paris")}`}
                      target="_blank"
                      className="flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 rounded-xl text-xs font-bold transition-colors"
                    >
                      <Globe className="w-3.5 h-3.5" /> Google Search
                    </a>
                    <a 
                      href={`https://www.instagram.com/explore/tags/${selectedEvent.title.replace(/\s+/g, '').toLowerCase()}/`}
                      target="_blank"
                      className="flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 rounded-xl text-xs font-bold transition-colors"
                    >
                      <Instagram className="w-3.5 h-3.5" /> Check Instagram
                    </a>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">About the Event</p>
                <p className="text-slate-600 text-sm leading-relaxed font-light">{selectedEvent.description}</p>
              </div>

              <div className="pt-4 flex gap-4 pb-4">
                <button 
                  onClick={(e) => handleShare(e, selectedEvent)}
                  className="bg-stone-100 text-slate-900 py-4.5 rounded-[1.5rem] font-bold flex-1 flex items-center justify-center gap-2.5 shadow-sm hover:bg-stone-200 transition-all border border-stone-200"
                >
                  {copiedId === selectedEvent.id ? <Check className="w-5 h-5 text-green-600" /> : <Share className="w-5 h-5" />}
                  {copiedId === selectedEvent.id ? "Copied Link" : "Share Event"}
                </button>
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvent.location + " Paris")}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-[1.5] bg-slate-900 text-white py-4.5 rounded-[1.5rem] font-bold text-center flex items-center justify-center gap-2.5 shadow-xl hover:bg-slate-800 hover:-translate-y-1 transition-all"
                >
                  <MapPin className="w-5 h-5" />
                  Get Directions
                </a>
                <button 
                  onClick={(e) => toggleFavorite(e, selectedEvent)} 
                  className={`p-4.5 rounded-[1.5rem] border transition-all shadow-lg ${
                    isFavorited(selectedEvent.id) 
                    ? 'bg-pink-50 border-pink-100 text-pink-500' 
                    : 'bg-stone-50 border-stone-100 text-slate-400'
                  }`}
                >
                  <Heart className={`w-6 h-6 ${isFavorited(selectedEvent.id) ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
