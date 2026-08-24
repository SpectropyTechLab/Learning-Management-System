import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  MapPin, 
  Search, 
  PlayCircle, 
  X,
  School,
  Youtube,
  FileText,
  Link as LinkIcon
} from 'lucide-react';
import publicApi from '../../lib/publicApi';

// Define Event interface
interface Event {
  id: string;
  school: string;
  date: string;
  title: string;
  type: 'image' | 'video' | 'pdf' | 'youtube' | 'link';
  src: string;
  description: string;
}

const EventsPage = () => {
  // --- STATE ---
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [selectedSchool, setSelectedSchool] = useState("All Schools");
  const [selectedDate, setSelectedDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  
  // Real data state
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schoolSearch, setSchoolSearch] = useState("");


  // --- FETCH REAL DATA ---
  useEffect(() => {
  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await publicApi.get('/community/content');
      if (response.data.success && Array.isArray(response.data.data)) {
        setEvents(response.data.data);
      } else {
        setError('Unexpected response format');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Unable to load events. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  fetchEvents();
}, []);

  // --- DYNAMIC SCHOOLS LIST ---
  /*const schools = useMemo(() => {
    const unique = Array.from(new Set(events.map(e => e.school)));
    return ['All Schools', ...unique.sort()];
  }, [events]);*/
  // Replace your existing `schools` useMemo with this
const allSchools = useMemo(() => {
  return Array.from(new Set(events.map(e => e.school))).sort();
}, [events]);

const filteredSchools = useMemo(() => {
  if (!schoolSearch.trim()) return allSchools;
  const term = schoolSearch.toLowerCase();
  return allSchools.filter(school => school.toLowerCase().includes(term));
}, [allSchools, schoolSearch]);
  
  // --- FILTER LOGIC ---
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchSchool = selectedSchool === "All Schools" || event.school === selectedSchool;
      const matchDate = selectedDate ? event.date === selectedDate : true;
      const matchSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          event.school.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSchool && matchDate && matchSearch;
    });
  }, [events, selectedSchool, selectedDate, searchQuery]);

  // --- ANIMATION VARIANTS ---
  const sidebarVariants = {
    open: { width: 320, x: 0, opacity: 1 },
    closed: { width: 0, x: -320, opacity: 0 },
    mobileOpen: { width: "85%", opacity: 1, x: 0 },
  };

  return (
    <div className="flex w-full max-w-full h-screen bg-slate-50 overflow-hidden font-sans text-slate-800">
      
      {/* --- LEFT PANEL (SIDEBAR) --- */}
      <motion.aside
        initial={false}
        animate={isSidebarOpen ? "open" : "closed"}
        variants={sidebarVariants}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`bg-white border-r border-slate-200 shadow-xl z-20 flex flex-col h-full absolute md:relative ${!isSidebarOpen && 'hidden md:block'}`}
      >
        <div className="p-10 h-full flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold bg-linear-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">
              Spectropy
            </h2>
            <button 
              onClick={() => setSidebarOpen(false)} 
              className="md:hidden p-2 rounded-full hover:bg-slate-100"
            >
              <X size={20} />
            </button>
          </div>

          {/* School Selector */}
          {/* School Selector */}
<div className="mb-8">
  <label className="block text-sm font-semibold text-slate-500 mb-2 uppercase tracking-wider">
    Select Campus
  </label>
  
  {loading ? (
    <div className="text-sm text-slate-400">Loading schools...</div>
  ) : error ? (
    <div className="text-sm text-red-500">Failed to load schools</div>
  ) : (
    <>
      {/* Search Input */}
      <div className="relative mb-2">
        <input
          type="text"
          placeholder="Type to search schools..."
          value={schoolSearch}
          onChange={(e) => setSchoolSearch(e.target.value)}
          className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        {schoolSearch && (
          <button
            onClick={() => setSchoolSearch('')}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* School List */}
      <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
        <button
          key="all"
          onClick={() => {
            setSelectedSchool("All Schools");
            setSchoolSearch(""); // optional: clear search on select
          }}
          className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-3 ${
            selectedSchool === "All Schools"
              ? "bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <School size={18} className={selectedSchool === "All Schools" ? "text-indigo-600" : "text-slate-400"} />
          <span className="truncate text-sm font-medium">All Schools</span>
        </button>
        
        {filteredSchools.map((school) => (
          <button
            key={school}
            onClick={() => {
              setSelectedSchool(school);
              setSchoolSearch(""); // optional: clear after selection
            }}
            className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-3 ${
              selectedSchool === school
                ? "bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <School size={18} className={selectedSchool === school ? "text-indigo-600" : "text-slate-400"} />
            <span className="truncate text-sm font-medium">{school}</span>
          </button>
        ))}
        
        {filteredSchools.length === 0 && schoolSearch && (
          <div className="text-sm text-slate-500 px-4 py-2 text-center">
            No schools found
          </div>
        )}
      </div>
    </>
  )}
</div>

          <hr className="border-slate-100 mb-8" />

          {/* Calendar (Styled Input) */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-slate-500 mb-2 uppercase tracking-wider">
              Filter by Date
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CalendarIcon className="h-5 w-5 text-indigo-500" />
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm shadow-sm transition-shadow group-hover:shadow-md"
              />
            </div>
            {selectedDate && (
              <button 
                onClick={() => setSelectedDate("")}
                className="text-xs text-red-500 mt-2 hover:underline pl-1"
              >
                Clear Date
              </button>
            )}
          </div>
          
        </div>
      </motion.aside>

      {/* --- RIGHT PANEL (CONTENT) --- */}
      <main className="flex-1 min-w-0 flex flex-col h-full relative overflow-hidden">
        
        {/* Header Bar */}
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </button>
            <h1 className="text-xl font-bold text-slate-800">Client Services</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block w-64">
              <input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            </div>
            <div className="h-8 w-8 rounded-full bg-linear-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold text-xs shadow-md cursor-pointer">
              SP
            </div>
          </div>
        </header>

        {/* Scrollable Event Grid */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-slate-500">Loading events...</div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-red-500">
              <p>{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-2 text-indigo-600 underline"
              >
                Retry
              </button>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Search size={48} className="mb-4 opacity-50" />
              <p className="text-lg">No events found for this criteria.</p>
            </div>
          ) : (
            <motion.div 
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              <AnimatePresence>
                {filteredEvents.map((event) => (
                  <motion.div
  layout
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, scale: 0.9 }}
  key={event.id}
  onClick={() => {
    if (event.type === 'pdf' || event.type === 'youtube' || event.type === 'link') {
      window.open(event.src, '_blank');
      setSelectedEvent(null);
    } else {
      setSelectedEvent(event);
    }
  }}
  className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border border-slate-100 hover:-translate-y-1"
>
                    
                    {/* Thumbnail */}
<div className="relative h-48 bg-slate-200 overflow-hidden">
  {event.type === 'video' ? (
    <>
      <video 
        src={event.src} 
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
        muted 
        loop 
        onMouseOver={e => (e.target as HTMLVideoElement).play()} 
        onMouseOut={e => (e.target as HTMLVideoElement).pause()}
      />
      <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover:bg-black/10 transition-colors">
        <PlayCircle className="text-white w-12 h-12 opacity-90 drop-shadow-lg" />
      </div>
      <span className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md font-medium">Video</span>
      
      {/* ✅ Overlay for video */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 pt-12">
        <span className="text-white/90 text-xs font-medium flex items-center gap-1">
          <MapPin size={12} /> {event.school}
        </span>
      </div>
    </>
  ) : event.type === 'youtube' ? (
    <a href={event.src} target="_blank" rel="noopener noreferrer" className="w-full h-full">
      {event.src.includes('v=') ? (
        <img 
          src={`https://img.youtube.com/vi/${event.src.split('v=')[1].split('&')[0]}/0.jpg`}
          alt="YouTube thumbnail"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-red-100">
          <Youtube size={48} className="text-red-600" />
          <span className="text-xs mt-1">YouTube</span>
        </div>
      )}
    </a>
  ) : event.type === 'pdf' ? (
    <a 
      href={event.src} 
      target="_blank" 
      rel="noopener noreferrer"
      className="w-full h-full flex flex-col items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 transition"
    >
      <FileText size={48} />
      <span className="text-xs mt-2 font-medium underline">View PDF</span>
    </a>
  ) : event.type === 'link' ? (
    <div className="w-full h-full flex flex-col items-center justify-center bg-blue-50">
      <LinkIcon size={48} className="text-blue-600" />
      <span className="text-xs mt-2">External Link</span>
    </div>
  ) : (
    // image
    <>
      <img 
        src={event.src} 
        alt={event.title} 
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
      
      {/* ✅ Overlay for image */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 pt-12">
        <span className="text-white/90 text-xs font-medium flex items-center gap-1">
          <MapPin size={12} /> {event.school}
        </span>
      </div>
    </>
  )}
</div>
                    {/* Content */}
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md uppercase tracking-wide">
                          {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 leading-tight mb-2 group-hover:text-indigo-600 transition-colors">
                        {event.title}
                      </h3>
                      <p className="text-sm text-slate-500 line-clamp-2">
                        {event.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </main>

      {/* --- MODAL / LIGHTBOX --- */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
            onClick={() => setSelectedEvent(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl overflow-hidden shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col md:flex-row"
            >
              {/* Media Section */}
              <div className="w-full md:w-2/3 bg-black flex items-center justify-center relative">
                {selectedEvent.type === 'video' ? (
                  <video controls autoPlay className="w-full h-full max-h-[60vh] md:max-h-full object-contain">
                    <source src={selectedEvent.src} type="video/mp4" />
                  </video>
                ) : (
                  <img src={selectedEvent.src} alt={selectedEvent.title} className="w-full h-full object-contain" />
                )}
                <button 
                  onClick={() => setSelectedEvent(null)}
                  className="absolute top-4 left-4 bg-black/50 text-white p-2 rounded-full md:hidden"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Details Section */}
              <div className="w-full md:w-1/3 p-8 flex flex-col bg-white overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-3 py-1 rounded-full uppercase">
                    {selectedEvent.type}
                  </span>
                  <button 
                    onClick={() => setSelectedEvent(null)}
                    className="hidden md:block text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <h2 className="text-2xl font-bold text-slate-900 mb-2">{selectedEvent.title}</h2>
                <div className="flex items-center text-slate-500 text-sm mb-6 gap-2">
                  <CalendarIcon size={16} />
                  {new Date(selectedEvent.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>

                <div className="flex items-center gap-2 mb-6 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="bg-white p-2 rounded-lg shadow-sm text-indigo-600">
                    <School size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase">School</p>
                    <p className="text-sm font-semibold text-slate-700">{selectedEvent.school}</p>
                  </div>
                </div>

                <p className="text-slate-600 leading-relaxed mb-8">
                  {selectedEvent.description}
                </p>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EventsPage;
