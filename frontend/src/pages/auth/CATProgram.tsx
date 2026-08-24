import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, Target, Monitor, Brain, 
  BarChart3, FileText, Users, Layers, 
  CheckCircle, ChevronRight, GraduationCap,
  Play, Pause, Tablet, PenTool, LayoutGrid,
  PieChart, School, Zap, Search, Home,
  ArrowRight
} from 'lucide-react';

// --- CUSTOM ICONS ---
const CatalystIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-teal-600">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
  </svg>
);

const Programcatalyst = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true); 
  const DURATION = 8000; 
  const totalSteps = 4;

  // --- KEYBOARD & AUTO SCROLL LOGIC ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setIsAutoPlay(false);
      switch (e.key) {
        case 'ArrowRight':
        case 'PageDown':
        case ' ': 
          e.preventDefault();
          setActiveStep((prev) => (prev + 1) % totalSteps);
          break;
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault();
          setActiveStep((prev) => (prev === 0 ? totalSteps - 1 : prev - 1));
          break;
        default: break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    let interval: any;
    if (isAutoPlay) {
      interval = setInterval(() => {
        setActiveStep((prev) => (prev + 1) % totalSteps);
      }, DURATION);
    }
    return () => clearInterval(interval);
  }, [isAutoPlay]);

  // --- SECTIONS CONFIGURATION ---
  const sections = [
    {
      id: 1,
      title: "Academic Core",
      desc: "80% Foundation + 20% Advanced",
      color: "bg-teal-600",
      content: (
        <div className="flex flex-col h-full relative overflow-hidden bg-white p-6 font-sans">
           {/* Header */}
           <motion.div initial={{y:-20, opacity:0}} animate={{y:0, opacity:1}} className="text-center mb-6 z-10">
              <h4 className="font-black text-3xl text-teal-900 uppercase tracking-tight">
                 Academic Core
              </h4>
              <div className="h-1 w-16 bg-teal-600 mx-auto rounded-full mt-2"></div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Curriculum & Targets</p>
           </motion.div>

           <div className="flex items-center justify-between h-full pb-4 px-2 relative z-10 gap-6">
              
              {/* --- LEFT: THE 80/20 PIE CHART --- */}
              <div className="w-1/2 flex flex-col items-center justify-center relative">
                 <div className="relative w-74 h-74">
                    <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                       {/* 80% Segment (Blue/Foundation) */}
                       <motion.circle 
                         cx="50" cy="50" r="40" 
                         fill="transparent" 
                         stroke="#0f766e" // Teal-700
                         strokeWidth="20" 
                         strokeDasharray="251.2" 
                         strokeDashoffset="251.2" // Start empty
                         animate={{ strokeDashoffset: 50.24 }} // End at 80%
                         transition={{ duration: 1.5, ease: "easeOut" }}
                       />
                       {/* 20% Segment (Orange/Advanced) */}
                       <motion.circle 
                         cx="50" cy="50" r="40" 
                         fill="transparent" 
                         stroke="#f97316" // Orange-500
                         strokeWidth="20" 
                         strokeDasharray="251.2"
                         strokeDashoffset="301.44" // Offset to start after 80%
                         animate={{ strokeDashoffset: 251.2 }} // Fill the remaining 20%
                         transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                       />
                    </svg>

                    {/* Center Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                       <motion.div initial={{scale:0}} animate={{scale:1}} transition={{delay:1}} className="bg-white rounded-full p-2 shadow-sm z-10">
                          <div className="text-2xl font-black text-teal-800 leading-none">80%</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">Foundation</div>
                          <div className="w-8 h-[1px] bg-slate-200 my-1 mx-auto"></div>
                          <div className="text-xl font-black text-orange-500 leading-none">20%</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">Advanced</div>
                       </motion.div>
                    </div>

                    {/* Labels pointing to chart */}
                    <motion.div initial={{opacity:0, x:-20}} animate={{opacity:1, x:0}} transition={{delay:1.5}} className="absolute top-0 left-0 bg-teal-50 border border-teal-200 px-2 py-1 rounded shadow-sm">
                       <span className="text-[13px] font-bold text-teal-700">NCERT / SCERT</span>
                    </motion.div>
                    <motion.div initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} transition={{delay:1.7}} className="absolute bottom-0 right-0 bg-orange-50 border border-orange-200 px-2 py-1 rounded shadow-sm">
                       <span className="text-[13px] font-bold text-orange-700">Bridge to Competitive</span>
                    </motion.div>
                 </div>
              </div>

              {/* --- RIGHT: TARGET EXAMS --- */}
              <div className="w-1/2 flex flex-col gap-4">
                 <motion.div initial={{x:20, opacity:0}} animate={{x:0, opacity:1}} transition={{delay:0.5}} className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                       <Target className="text-teal-600" size={50}/>
                       <h5 className="font-bold text-slate-700 uppercase text-m">Target Exams</h5>
                    </div>
                    <div className="flex flex-wrap gap-2">
                       {['NEET', 'EAPCET', 'Olympiads'].map((exam, i) => (
                          <motion.span 
                             key={i}
                             initial={{scale:0}} animate={{scale:1}} transition={{delay: 0.8 + (i*0.1)}}
                             className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-s font-black shadow-sm"
                          >
                             {exam}
                          </motion.span>
                       ))}
                    </div>
                 </motion.div>

                 <motion.div initial={{x:20, opacity:0}} animate={{x:0, opacity:1}} transition={{delay:1.0}} className="bg-orange-50 border border-orange-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
                    <div className="bg-white p-2 rounded-full shadow-sm">
                       <Users size={50} className="text-orange-500" />
                    </div>
                    <div>
                       <h5 className="font-bold text-orange-900 text-m uppercase">Inclusivity</h5>
                       <p className="text-[15px] text-orange-800 font-semibold">Suitable for All Students</p>
                    </div>
                 </motion.div>
              </div>

           </div>
        </div>
      )
    },
    {
      id: 2,
      title: "Learning Ecosystem",
      desc: "Materials, Digital & Support",
      color: "bg-orange-500",
      content: (
        <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden font-sans p-6">
           {/* Header */}
           <div className="text-center mb-6 z-10">
              <h4 className="font-black text-3xl text-slate-800 uppercase tracking-tight">
                 Learning Ecosystem
              </h4>              
              <div className="h-1 w-16 bg-orange-500 mx-auto rounded-full mt-2"></div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Materials,Digital & Support</p>
           </div>

           <div className="grid grid-cols-2 gap-6 h-full pb-4">
              
              {/* --- LEFT: MATERIALS & DITP --- */}
              <div className="flex flex-col gap-3">
                 {/* Material Card */}
                 <motion.div 
                    initial={{x:-20, opacity:0}} animate={{x:0, opacity:1}} transition={{delay:0.2}}
                    className="flex-1 bg-white rounded-xl border-l-4 border-orange-400 shadow-sm p-4 flex items-center gap-4"
                 >
                    <div className="bg-orange-50 p-3 rounded-full">
                       <BookOpen size={50} className="text-orange-600"/>
                    </div>
                    <div>
                       <p className="text-xl font-bold text-slate-800">Learning Material</p>
                       <p className="text-s text-slate-500 font-semibold">Concept Book & Workbook</p>
                    </div>
                 </motion.div>

                 {/* DITP Card */}
                 <motion.div 
                    initial={{x:-20, opacity:0}} animate={{x:0, opacity:1}} transition={{delay:0.4}}
                    className="flex-1 bg-white rounded-xl border-l-4 border-slate-600 shadow-sm p-4 flex items-center gap-4"
                 >
                    <div className="bg-slate-100 p-3 rounded-full">
                       <Monitor size={50} className="text-slate-700"/>
                    </div>
                    <div>
                       <p className="text-xl font-bold text-slate-800">DITP (Digital Interactive Teaching Product)</p>
                       <p className="text-xs text-slate-500 font-semibold">Digital Content, Teacher Login & Teach</p>
                    </div>
                 </motion.div>
              </div>

              {/* --- RIGHT: SUPPORT SYSTEM --- */}
              <div className="flex flex-col gap-2">
                 <h5 className="text-[15px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">Support System</h5>
                 
                 {[
                    {t: "Teacher Training", i: <Users size={30}/>, c: "bg-blue-50 text-blue-700 border-blue-200"},
                    {t: "Enrichment Sessions", i: <Zap size={30}/>, c: "bg-pink-50 text-pink-700 border-pink-200"},
                    {t: "Parent Seminar", i: <Home size={30}/>, c: "bg-green-50 text-green-700 border-green-200"},
                 ].map((item, idx) => (
                    <motion.div 
                       key={idx}
                       initial={{y:10, opacity:0}} animate={{y:0, opacity:1}} transition={{delay: 0.6 + (idx*0.2)}}
                       className={`flex items-center gap-5 p-5 rounded-lg border ${item.c} shadow-sm`}
                    >
                       <div className="bg-white p-1.5 rounded-full shadow-sm">{item.i}</div>
                       <span className="text-s font-bold">{item.t}</span>
                    </motion.div>
                 ))}
              </div>

           </div>
        </div>
      )
    },
    {
      id: 3,
      title: "Assessment Engine",
      desc: "Structure & Focus",
      color: "bg-green-600",
      content: (
        <div className="flex flex-col h-full bg-white relative overflow-hidden font-sans p-4">
           {/* Header */}
           <div className="text-center mb-6 z-10">
              <h4 className="font-black text-3xl text-slate-800 uppercase tracking-tight">
                Assessment Engine 
              </h4>              
              <div className="h-1 w-16 bg-green-600 mx-auto rounded-full mt-2"></div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Materials,Digital & Support</p>
           </div>

           <div className="flex h-full items-center justify-center gap-8">
              
              {/* --- LEFT: THE PYRAMID STRUCTURE --- */}
              <div className="w-[45%] flex flex-col items-center">
                 <h5 className="text-s font-black text-green-800 uppercase mb-4">Exam Structure</h5>
                 <div className="relative w-full h-68">
                    <svg viewBox="0 0 250 180" className="w-full h-full drop-shadow-lg">
                       {/* Base - Part Tests */}
                       <motion.path d="M20 170 L220 170 L190 120 L50 120 Z" fill="#bbf7d0" stroke="#16a34a" strokeWidth="1" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay:0.2}} />
                       <motion.text x="120" y="155" fontSize="12" fill="#166534" fontWeight="800" textAnchor="middle" initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.3}}>PART TESTS</motion.text>
                       
                       {/* Middle - Unit Tests */}
                       <motion.path d="M55 115 L185 115 L160 70 L80 70 Z" fill="#4ade80" stroke="#15803d" strokeWidth="1" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay:0.4}} />
                       <motion.text x="120" y="100" fontSize="12" fill="#064e3b" fontWeight="800" textAnchor="middle" initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.5}}>UNIT TESTS</motion.text>
                       
                       {/* Top - Grand Test */}
                       <motion.path d="M85 65 L155 65 L120 10 Z" fill="#166534" stroke="#14532d" strokeWidth="1" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay:0.6}} />
                       <motion.text x="120" y="50" fontSize="10" fill="white" fontWeight="800" textAnchor="middle" initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.7}}>GRAND</motion.text>
                    </svg>
                 </div>
              </div>

              {/* --- RIGHT: FOCUS & MODES --- */}
              <div className="w-[50%] flex flex-col gap-4">
                 
                 {/* Question Focus Card */}
                 <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} transition={{delay:0.8}} className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
                    <CheckCircle className="text-green-600 mt-1" size={50} />
                    <div>
                       <h5 className="font-black text-green-900 text-xl">QUESTION FOCUS</h5>
                       <p className="text-s text-green-700 font-bold mt-1">MCQ SINGLE CORRECT ONLY</p>
                       <p className="text-[13px] text-green-600 mt-0.5">(Targeting Advanced Level)</p>
                    </div>
                 </motion.div>

                 {/* Modes */}
                 <div className="flex gap-3">
                    <motion.div initial={{x:20, opacity:0}} animate={{x:0, opacity:1}} transition={{delay:1.0}} className="flex-1 bg-slate-100 p-3 rounded-lg text-center border border-slate-200">
                       <FileText className="mx-auto mb-1 text-slate-600" size={40}/>
                       <span className="text-[13px] font-bold text-slate-600 uppercase">Offline (OMR)</span>
                    </motion.div>
                    <motion.div initial={{x:20, opacity:0}} animate={{x:0, opacity:1}} transition={{delay:1.2}} className="flex-1 bg-blue-50 p-3 rounded-lg text-center border border-blue-100">
                       <Tablet className="mx-auto mb-1 text-blue-600" size={40}/>
                       <span className="text-[13px] font-bold text-blue-600 uppercase">Online (Tab)</span>
                    </motion.div>
                 </div>

              </div>

           </div>
        </div>
      )
    },
    {
      id: 4,
      title: "Performance Analytics",
      desc: "Dashboards & Reports",
      color: "bg-slate-800",
      content: (
        <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden font-sans p-6">
            {/* Header */}
           <div className="text-center mb-6 z-10">
              <h4 className="font-black text-3xl text-slate-800 uppercase tracking-tight">
                Performance Analytics 
              </h4>              
              <div className="h-1 w-16 bg-slate-800 mx-auto rounded-full mt-2"></div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">RA Dashboard & Reports</p>
           </div>
           {/* DASHBOARD VISUALIZATION */}
           <motion.div 
             initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}
             className="w-full h-full bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 p-4 flex flex-col relative z-20"
           >
              {/* Fake Browser Top */}
              <div className="flex items-center gap-1.5 mb-4 border-b border-slate-700 pb-2">
                 <div className="w-2 h-2 rounded-full bg-red-500"></div>
                 <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                 <div className="w-2 h-2 rounded-full bg-green-500"></div>
                 <div className="ml-auto text-s font-mono text-teal-400">RA(Result & Analysis)</div>
              </div>

              <div className="flex gap-4 h-full">
                 
                 {/* Left: Graphs */}
                 <div className="w-2/3 flex flex-col gap-4">
                    <div className="flex-1 bg-slate-800 rounded-lg border border-slate-700 p-3 relative overflow-hidden">
                       <h6 className="text-[13px] text-slate-400 font-bold mb-2">PERFORMANCE TREND</h6>
                       <div className="flex items-end justify-between h-[80%] px-2">
                          {[30, 50, 45, 70, 60, 85, 90].map((h, i) => (
                             <motion.div 
                                key={i} 
                                initial={{height:0}} animate={{height:`${h}%`}} transition={{delay: 0.5 + (i*0.1)}} 
                                className="w-4 bg-teal-500 rounded-t-sm opacity-80 hover:opacity-100 transition-opacity"
                             />
                          ))}
                       </div>
                    </div>
                    
                    <div className="h-1/3 flex gap-4">
                       <div className="flex-1 bg-slate-800 rounded-lg border border-slate-700 p-2 flex items-center justify-center">
                           <div className="text-center">
                              <div className="text-2xl font-black text-white">4</div>
                              <div className="text-[13px] text-slate-400 uppercase">Key Reports</div>
                           </div>
                       </div>
                       <div className="flex-1 bg-slate-800 rounded-lg border border-slate-700 p-2 flex items-center justify-center">
                           <PieChart className="text-orange-500" size={50} />
                       </div>
                    </div>
                 </div>

                 {/* Right: Reports List */}
                 <div className="w-1/3 flex flex-col justify-between">
                    {['Student', 'Class', 'Teacher', 'School'].map((r, i) => (
                       <motion.div 
                          key={i}
                          initial={{x:10, opacity:0}} animate={{x:0, opacity:1}} transition={{delay: 1 + (i*0.2)}}
                          className="bg-slate-800 border-l-2 border-teal-500 p-2 rounded hover:bg-slate-700 transition-colors cursor-pointer"
                       >
                          <div className="flex items-center justify-between">
                             <span className="text-[15px] font-bold text-slate-300 uppercase">{r} Report</span>
                             <ArrowRight size={13} className="text-teal-500"/>
                          </div>
                       </motion.div>
                    ))}
                 </div>

              </div>
           </motion.div>

        </div>
      )
    },
  ];

  const mobileSummaries = [
    [
      "Academic core blends 80% foundation with 20% advanced preparation.",
      "Supports NCERT and SCERT learning while bridging students toward competitive exams.",
      "Targets NEET, EAPCET, and Olympiads with an inclusive approach for all students.",
    ],
    [
      "Learning ecosystem combines materials, digital products, and classroom support.",
      "Includes concept books, workbooks, DITP access, teacher training, enrichment sessions, and parent seminars.",
      "Designed to help schools deliver stronger day-to-day learning continuity.",
    ],
    [
      "Assessment engine uses a structured mix of part tests, unit tests, and grand tests.",
      "Focus remains on single-correct MCQ practice aligned to advanced preparation.",
      "Supports both offline OMR and online tab-based exam delivery.",
    ],
    [
      "Performance analytics are handled through the RA dashboard and reporting system.",
      "Reports are available across student, class, teacher, and school levels.",
      "Helps institutions spot trends early and act on measurable learning outcomes.",
    ],
  ];

  return (
    <div className="mx-auto h-[78vh] max-h-[42rem] w-full max-w-8xl overflow-hidden rounded-xl border border-slate-200 bg-white font-sans shadow-2xl">
      <div className="flex h-full flex-col lg:hidden">
        <div className="border-b border-teal-100 bg-teal-50/60 p-4">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-teal-100 p-1.5"><CatalystIcon /></div>
            <div>
              <h2 className="text-base font-black leading-none tracking-tight text-slate-800">CATALYST <span className="text-teal-600">PROGRAM</span></h2>
              <p className="mt-1 text-xs font-medium text-slate-500">{sections[activeStep].desc}</p>
            </div>
          </div>
          <div className="mt-4 flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white p-1">
            <button 
              onClick={() => setIsAutoPlay(false)}
              className={`p-1.5 rounded-md transition-all ${!isAutoPlay ? 'bg-slate-100 shadow-inner text-slate-800' : 'text-slate-400'}`}
            >
              <Pause size={12} fill={!isAutoPlay ? "currentColor" : "none"}/>
            </button>
            <button 
              onClick={() => setIsAutoPlay(true)}
              className={`p-1.5 rounded-md transition-all ${isAutoPlay ? 'bg-teal-600 shadow text-white' : 'text-slate-400'}`}
            >
              <Play size={12} fill={isAutoPlay ? "currentColor" : "none"}/>
            </button>
            <span className="text-[10px] font-bold text-slate-500 pr-1">{isAutoPlay ? 'Auto' : 'Manual'}</span>
          </div>
        </div>

        <div className="border-b border-slate-100 bg-slate-50 px-3 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {sections.map((section, index) => (
              <button
                key={section.id}
                onClick={() => { setActiveStep(index); setIsAutoPlay(false); }}
                className={`min-w-[9rem] rounded-2xl border px-3 py-2 text-left transition-all ${
                  activeStep === index ? 'border-teal-200 bg-white text-slate-800 shadow-sm' : 'border-transparent bg-white/60 text-slate-500'
                }`}
              >
                <span className="block text-[10px] font-bold uppercase tracking-wider text-teal-600">0{index + 1}</span>
                <span className="mt-1 block text-sm font-bold leading-tight">{section.title}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
          <div className="rounded-3xl bg-white p-4 shadow-sm">
            <h3 className="text-lg font-black text-slate-800">{sections[activeStep].title}</h3>
            <p className="mt-1 text-sm font-medium text-slate-500">{sections[activeStep].desc}</p>
            <div className="mt-4 space-y-3">
              {mobileSummaries[activeStep].map((item) => (
                <div key={item} className="flex gap-3 rounded-2xl border border-teal-100 bg-teal-50/40 p-3">
                  <div className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-teal-500" />
                  <p className="text-sm leading-6 text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="hidden h-full lg:flex">
        <div className="w-1/4 bg-slate-50 border-r border-slate-200 flex flex-col z-20">
          <div className="p-5 border-b border-teal-100 bg-teal-50/50 shadow-sm z-10">
            <div className="flex items-center gap-2 mb-1">
               <div className="bg-teal-100 p-1.5 rounded-full"><CatalystIcon /></div>
               <h2 className="font-black text-lg text-slate-800 leading-none tracking-tight">CATALYST<br/><span className="text-teal-600">PROGRAM</span></h2>
            </div>
            <div className="mt-4 flex items-center gap-2 bg-white border border-slate-200 p-1 rounded-lg w-fit">
              <button 
                onClick={() => setIsAutoPlay(false)}
                className={`p-1.5 rounded-md transition-all ${!isAutoPlay ? 'bg-slate-100 shadow-inner text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Pause size={12} fill={!isAutoPlay ? "currentColor" : "none"}/>
              </button>
              <button 
                onClick={() => setIsAutoPlay(true)}
                className={`p-1.5 rounded-md transition-all ${isAutoPlay ? 'bg-teal-600 shadow text-white' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Play size={12} fill={isAutoPlay ? "currentColor" : "none"}/>
              </button>
              <span className="text-[10px] font-bold text-slate-500 pr-1">{isAutoPlay ? 'Auto' : 'Manual'}</span>
            </div>
          </div>

          <div className="flex-grow flex flex-col overflow-y-auto">
            {sections.map((section, index) => (
              <button
                key={section.id} 
                onClick={() => { setActiveStep(index); setIsAutoPlay(false); }} 
                className={`relative flex-1 px-5 py-2 flex flex-col justify-center text-left transition-all duration-300 outline-none border-b border-slate-100 ${activeStep === index ? 'bg-white' : 'hover:bg-slate-100'}`}
              >
                {activeStep === index && (
                  <motion.div layoutId="activeLine" className={`absolute left-0 top-0 bottom-0 w-1 ${section.color}`} />
                )}
                {activeStep === index && isAutoPlay && (
                  <motion.div 
                    className={`absolute bottom-0 left-0 h-1 ${section.color} opacity-20`}
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: DURATION / 1000, ease: "linear" }}
                  />
                )}

                <div className="relative z-10">
                  <span className={`text-[9px] font-bold uppercase tracking-wider mb-0.5 block ${activeStep === index ? 'text-slate-500' : 'text-slate-300'}`}>0{index + 1}</span>
                  <h3 className={`font-bold text-sm leading-tight ${activeStep === index ? 'text-slate-800' : 'text-slate-400'}`}>{section.title}</h3>
                  <p className={`text-[10px] mt-1 truncate ${activeStep === index ? 'text-slate-500' : 'text-slate-300'}`}>{section.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="w-3/4 relative bg-slate-100 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: "circOut" }}
              className="h-full w-full"
            >
              <div className="h-full w-full bg-white shadow-inner">
                {sections[activeStep].content}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Programcatalyst;
