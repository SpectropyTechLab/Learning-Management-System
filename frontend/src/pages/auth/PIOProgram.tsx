import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Layers, Target, BookOpen, 
  Trophy, Puzzle, FileText, Tablet, 
  BarChart3, Monitor, Users, Search, 
  Brain, MessageCircle, Play, Pause, 
  CheckCircle, Star, Calendar, Flag
} from 'lucide-react';

// --- CUSTOM PIONEER ICON ---
const PioneerIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-600">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" y1="22" x2="4" y2="15" />
  </svg>
);

const PioneerPresentation = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true); 
  const DURATION = 10000; 
  const totalSteps = 4;

  // --- LOGIC ---
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
      title: "Elite Academics",
      desc: "Curriculum & 5-Level Mastery",
      color: "bg-indigo-600",
      content: (
        <div className="flex flex-col h-full relative overflow-hidden bg-slate-50 p-6 font-sans">
           
           <div className="text-center mb-6 z-10">
              <h4 className="font-black text-3xl text-indigo-900 uppercase tracking-tight">
                 Advanced Curriculum & Learning
              </h4>
           </div>

           <div className="flex h-full gap-8 pb-4">
              
              {/* --- LEFT: CURRICULUM & MATERIALS --- */}
              <motion.div 
                initial={{x:-20, opacity:0}} animate={{x:0, opacity:1}} transition={{delay:0.2}}
                className="w-1/2 flex flex-col gap-4"
              >
                 {/* Curriculum Card */}
                 <div className="bg-white rounded-xl shadow-md border-l-4 border-indigo-600 p-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                       <Rocket size={74} className="text-indigo-600"/>
                    </div>
                    <h5 className="font-black text-indigo-800 text-xl uppercase mb-3 flex items-center gap-2">
                       <Layers size={40}/> 3-Stage Curriculum
                    </h5>
                    <ul className="space-y-2">
                       <li className="flex items-center gap-2 text-s font-bold text-slate-700">
                          <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                          a. CO Curriculum <span className="text-slate-400 font-medium">(Foundation)</span>
                       </li>
                       <li className="flex items-center gap-2 text-s font-bold text-slate-700">
                          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                          b. Advanced Plus <span className="text-slate-400 font-medium">(Core)</span>
                       </li>
                       <li className="flex items-center gap-2 text-s font-bold text-slate-700">
                          <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                          c. Vertical Expansion <span className="text-slate-400 font-medium">(Accelerated)</span>
                       </li>
                    </ul>
                 </div>

                 {/* Material Card */}
                 <div className="bg-white rounded-xl shadow-md border-l-4 border-blue-500 p-4 flex items-center gap-4">
                    <div className="bg-blue-50 p-3 rounded-full"><BookOpen size={40} className="text-blue-600"/></div>
                    <div>
                       <h5 className="font-black text-slate-800 text-xl uppercase">Learning Material</h5>
                       <p className="text-[15px] font-bold text-slate-500">Vol 1: Comprehensive</p>
                       <p className="text-[15px] font-bold text-slate-500">Vol 2: Advanced Applications</p>
                    </div>
                 </div>
              </motion.div>

              {/* --- RIGHT: 5-LEVEL PYRAMID --- */}
              <div className="w-1/2 flex flex-col items-center justify-center relative">
                 <h5 className="text-xl font-black text-orange-600 uppercase mb-4 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
                    5-Level Mastery
                 </h5>
                 
                 <div className="flex flex-col-reverse items-center gap-1 w-full max-w-[280px]">
                    {[
                       {l: "Level 1: Foundation", c: "bg-indigo-900", w: "120%"},
                       {l: "Level 2: Application", c: "bg-indigo-700", w: "100%"},
                       {l: "Level 3: Critical Thinking", c: "bg-indigo-500", w: "80%"},
                       {l: "Level 4: Challenger", c: "bg-orange-500", w: "60%"},
                       {l: "Level 5: Rank Decider", c: "bg-yellow-400", w: "40%", t:"text-indigo-900"},
                    ].map((lvl, i) => (
                       <motion.div 
                          key={i}
                          initial={{opacity:0, y:20, scale:0.8}}
                          animate={{opacity:1, y:0, scale:1}}
                          transition={{delay: 0.5 + (i*0.15)}}
                          className={`${lvl.w} ${lvl.c} h-8 flex items-center justify-center rounded-sm shadow-sm relative group`}
                          style={{clipPath: "polygon(5% 0, 95% 0, 100% 100%, 0% 100%)"}}
                       >
                          <span className={`text-[15px] font-bold ${lvl.t || 'text-white'} whitespace-nowrap px-1`}>
                             {lvl.l}
                          </span>
                       </motion.div>
                    ))}
                 </div>
                 
                 {/* Target Icon */}
                 <motion.div 
                   animate={{rotate: 360}} transition={{duration: 20, repeat: Infinity, ease: "linear"}}
                   className="absolute top-0 right-0 text-indigo-100 -z-10"
                 >
                    <Target size={120} />
                 </motion.div>
              </div>

           </div>
        </div>
      )
    },
    {
      id: 2,
      title: "Competitive Focus",
      desc: "Exams & Question Types",
      color: "bg-orange-500",
      content: (
        <div className="flex flex-col h-full bg-white relative overflow-hidden font-sans p-6">
           
           <div className="text-center mb-6 z-10">
              <h4 className="font-black text-3xl text-slate-800 uppercase tracking-tight">
                 Target Exams & Question Types
              </h4>
           </div>

           <div className="flex h-full gap-6 pb-4">
              
              {/* --- LEFT: TARGET EXAMS (Trophy) --- */}
              <motion.div 
                 initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} transition={{delay:0.2}}
                 className="w-1/3 bg-orange-50 border-2 border-orange-100 rounded-2xl p-4 flex flex-col items-center text-center shadow-sm relative overflow-hidden"
              >
                 <div className="absolute top-0 left-0 w-full h-2 bg-orange-400"></div>
                 
                 <motion.div animate={{scale:[1, 1.1, 1]}} transition={{duration:2, repeat:Infinity}}>
                     <Trophy size={58} className="text-orange-500 fill-yellow-200 mb-4 drop-shadow-sm"/>
                 </motion.div>
                 
                 <h5 className="font-black text-orange-900 text-s uppercase mb-4">Target Exams</h5>
                 
                 <div className="flex flex-col gap-2 w-full">
                     {['Olympiads', 'EAPCET', 'NEET', 'JEE Main', 'JEE Advanced'].map((exam, i) => (
                         <div key={i} className="bg-white border border-orange-200 py-1.5 rounded-lg text-s font-bold text-slate-700 shadow-sm">
                             {exam}
                         </div>
                     ))}
                 </div>
              </motion.div>

              {/* --- RIGHT: QUESTION TYPES (Grid) --- */}
              <div className="w-2/3 flex flex-col gap-2">
                 <div className="flex items-center gap-2 mb-2">
                     <Puzzle className="text-indigo-600" size={30}/>
                     <h5 className="font-bold text-indigo-900 text-m uppercase">
                         Question Types <span className="text-s text-indigo-500 normal-case">(JEE Advanced & Olympiad Focus)</span>
                     </h5>
                 </div>

                 <div className="grid grid-cols-2 gap-3 h-full">
                     {[
                        {t: "MCQ Single Correct", i: <CheckCircle size={30}/>},
                        {t: "MCQ Multi Correct", i: <Layers size={30}/>},
                        {t: "Numerical Type", i: <BarChart3 size={30}/>},
                        {t: "Assertion & Reasoning", i: <Search size={30}/>},
                        {t: "Comprehension", i: <FileText size={30}/>},
                        {t: "Matrix Matching", i: <Puzzle size={30}/>},
                     ].map((q, i) => (
                        <motion.div 
                           key={i}
                           initial={{y:20, opacity:0}} animate={{y:0, opacity:1}} transition={{delay: 0.4 + (i*0.1)}}
                           className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex items-center gap-3 hover:bg-indigo-100 transition-colors"
                        >
                           <div className="bg-white p-1.5 rounded-full text-indigo-600 shadow-sm">{q.i}</div>
                           <span className="text-[15px] font-bold text-indigo-900 uppercase">{q.t}</span>
                        </motion.div>
                     ))}
                 </div>
              </div>

           </div>
        </div>
      )
    },
    {
      id: 3,
      title: "Assessment Regime",
      desc: "Structure & Modes",
      color: "bg-purple-600",
      content: (
        <div className="flex flex-col h-full bg-purple-50 relative overflow-hidden font-sans p-6">
           
           <div className="text-center mb-8 z-10">
              <h4 className="font-black text-3xl text-purple-900 uppercase tracking-tight">
                 Assessment Structure & Modes
              </h4>
           </div>

           <div className="flex h-full gap-8 items-center justify-center pb-10">
              
              {/* --- LEFT: EXAM COUNT (Calendar Style) --- */}
              <motion.div 
                 initial={{x:-50, opacity:0}} animate={{x:0, opacity:1}} transition={{type:"spring"}}
                 className="w-[45%] bg-white rounded-2xl shadow-xl border border-purple-200 p-6 relative overflow-hidden group"
              >
                  <div className="absolute top-0 left-0 w-full h-3 bg-purple-600"></div>
                  <div className="absolute top-3 left-4 flex gap-1">
                      <div className="w-1 h-3 bg-slate-300 rounded-full"></div>
                      <div className="w-1 h-3 bg-slate-300 rounded-full"></div>
                      <div className="w-1 h-3 bg-slate-300 rounded-full"></div>
                  </div>

                  <div className="flex justify-between items-start mt-4">
                      <div>
                          <h5 className="font-black text-purple-900 text-4xl">25</h5>
                          <p className="text-s font-bold text-slate-500 uppercase">Total Exams</p>
                      </div>
                      <Calendar size={52} className="text-purple-300 group-hover:text-purple-600 transition-colors"/>
                  </div>

                  <div className="mt-6 space-y-2">
                      <div className="flex justify-between text-s font-bold border-b border-dashed border-slate-200 pb-1">
                          <span className="text-slate-600">Part Tests</span>
                          <span className="text-purple-700">18</span>
                      </div>
                      <div className="flex justify-between text-s font-bold border-b border-dashed border-slate-200 pb-1">
                          <span className="text-slate-600">Unit Tests</span>
                          <span className="text-purple-700">05</span>
                      </div>
                      <div className="flex justify-between text-s font-bold">
                          <span className="text-slate-600">Grand Tests</span>
                          <span className="text-purple-700">02</span>
                      </div>
                  </div>
              </motion.div>

              {/* --- RIGHT: MODES (Cards) --- */}
              <div className="w-[45%] flex flex-col gap-4">
                  <motion.div 
                     initial={{x:50, opacity:0}} animate={{x:0, opacity:1}} transition={{delay:0.3}}
                     className="bg-white p-4 rounded-xl border-l-4 border-slate-600 shadow-md flex items-center gap-4"
                  >
                      <div className="bg-slate-100 p-3 rounded-full"><FileText size={44} className="text-slate-700"/></div>
                      <div>
                          <h6 className="font-black text-slate-800 text-s uppercase">Offline</h6>
                          <p className="text-[15px] font-bold text-slate-500">OMR Based</p>
                      </div>
                  </motion.div>

                  <motion.div 
                     initial={{x:50, opacity:0}} animate={{x:0, opacity:1}} transition={{delay:0.5}}
                     className="bg-white p-4 rounded-xl border-l-4 border-blue-500 shadow-md flex items-center gap-4"
                  >
                      <div className="bg-blue-50 p-3 rounded-full"><Tablet size={44} className="text-blue-600"/></div>
                      <div>
                          <h6 className="font-black text-blue-800 text-s uppercase">Online</h6>
                          <p className="text-[15px] font-bold text-blue-500">Tab Exams</p>
                      </div>
                  </motion.div>
              </div>

           </div>
        </div>
      )
    },
    {
      id: 4,
      title: "360° Ecosystem",
      desc: "Support & Development",
      color: "bg-teal-600",
      content: (
        <div className="flex flex-col h-full bg-gradient-to-r from-cyan-50 to-blue-50 relative overflow-hidden font-sans p-6">
           
           <div className="text-center mb-8 z-10">
              <h4 className="font-black text-2xl text-slate-800 uppercase tracking-tight bg-white inline-block px-6 py-2 rounded-full shadow-sm border border-slate-200">
                 Ecosystem & Support (360° Development)
              </h4>
           </div>

           {/* --- HORIZONTAL FLOW --- */}
           <div className="flex items-center justify-between gap-2 h-full pb-8 overflow-x-auto">
              
              {[
                 { id: "08", t: "RA Dashboard", sub: "Results & Analysis", i: <BarChart3 size={40}/>, c: "border-blue-600 text-blue-700" },
                 { id: "10", t: "DITP", sub: "Digital Teaching", i: <Monitor size={40}/>, c: "border-cyan-600 text-cyan-700" },
                 { id: "11", t: "Teacher Training", sub: "Workshop", i: <Users size={40}/>, c: "border-teal-600 text-teal-700" },
                 { id: "12", t: "Academic Audition", sub: "Quality Check", i: <Search size={40}/>, c: "border-orange-500 text-orange-600" },
                 { id: "13", t: "Enrichment", sub: "Sessions", i: <Brain size={40}/>, c: "border-red-500 text-red-600" },
                 { id: "14", t: "Parent Seminar", sub: "Engagement", i: <MessageCircle size={40}/>, c: "border-indigo-600 text-indigo-700" },
              ].map((item, idx) => (
                 <motion.div 
                    key={idx}
                    initial={{y: 50, opacity: 0}}
                    animate={{y: 0, opacity: 1}}
                    transition={{delay: 0.2 + (idx * 0.15), type: "spring"}}
                    className="flex-1 min-w-[90px] flex flex-col items-center relative group"
                 >
                    {/* Connection Line */}
                    {idx < 5 && (
                       <div className="absolute top-6 left-[60%] w-[80%] h-0.5 bg-slate-200 z-0">
                          <motion.div 
                            className="h-full bg-slate-400"
                            initial={{width:0}} animate={{width:"100%"}} transition={{delay: 0.5 + (idx*0.2), duration:0.5}}
                          />
                       </div>
                    )}

                    {/* Circle Icon */}
                    <div className={`w-22 h-22 bg-white rounded-full border-2 ${item.c} flex items-center justify-center shadow-md relative z-10 group-hover:scale-110 transition-transform duration-300`}>
                       {item.i}
                    </div>

                    {/* Text */}
                    <div className="text-center mt-2 w-full">
                       <h5 className="font-bold text-slate-800 text-[9px] uppercase leading-tight">{item.t}</h5>
                       <p className="text-[15px] font-bold text-slate-500">{item.sub}</p>
                    </div>
                 </motion.div>
              ))}

           </div>

           {/* Footer Badge */}
           <motion.div 
              initial={{y:20, opacity:0}} animate={{y:0, opacity:1}} transition={{delay:1.5}}
              className="absolute bottom-2 left-0 w-full text-center"
           >
              <span className="inline-block bg-orange-100 text-orange-800 text-[15px] font-bold px-4 py-1 rounded-full border border-orange-200">
                  Suitable for All Kinds of Students | Fostering Excellence
              </span>
           </motion.div>
        </div>
      )
    },
  ];

  const mobileSummaries = [
    [
      "Elite academics combine a three-stage curriculum with deeper learning materials.",
      "Students move through foundation, advanced plus, and vertical expansion pathways.",
      "The five-level mastery model is designed for high performance and rank-building preparation.",
    ],
    [
      "Competitive focus targets Olympiads, EAPCET, NEET, JEE Main, and JEE Advanced.",
      "Question exposure includes single and multi correct MCQ, numerical, assertion reasoning, comprehension, and matrix matching.",
      "The goal is to prepare students for tougher advanced-format exams with confidence.",
    ],
    [
      "Assessment regime uses a structured total of part tests, unit tests, and grand tests.",
      "Students can practice through offline OMR as well as online tab-based exam modes.",
      "This keeps evaluation frequent, measurable, and aligned with advanced benchmarks.",
    ],
    [
      "A full ecosystem surrounds the academic core with analytics, digital tools, and development support.",
      "Includes RA dashboard, DITP, teacher training, academic audition, enrichment sessions, and parent seminar support.",
      "Built to foster excellence across different student needs and school environments.",
    ],
  ];

  return (
    <div className="mx-auto h-[78vh] max-h-[42rem] w-full max-w-8xl overflow-hidden rounded-3xl border-4 border-indigo-50 bg-white font-sans shadow-2xl">
      <div className="flex h-full flex-col lg:hidden">
        <div className="border-b border-indigo-100 bg-white p-4">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-indigo-100 p-1.5"><PioneerIcon /></div>
            <div>
              <h2 className="text-base font-black leading-none tracking-tight text-slate-800">PIONEER <span className="text-indigo-600">PROGRAM</span></h2>
              <p className="mt-1 text-xs font-medium text-slate-500">Empowering Future Leaders</p>
            </div>
          </div>
          <div className="mt-4 flex w-fit items-center gap-2 rounded-full border border-indigo-100 bg-white p-1 shadow-sm">
            <button 
              onClick={() => setIsAutoPlay(false)}
              className={`p-1.5 rounded-full transition-all ${!isAutoPlay ? 'bg-indigo-100 shadow-inner text-indigo-800' : 'text-slate-400'}`}
            >
              <Pause size={12} fill={!isAutoPlay ? "currentColor" : "none"}/>
            </button>
            <button 
              onClick={() => setIsAutoPlay(true)}
              className={`p-1.5 rounded-full transition-all ${isAutoPlay ? 'bg-indigo-600 shadow text-white' : 'text-slate-400'}`}
            >
              <Play size={12} fill={isAutoPlay ? "currentColor" : "none"}/>
            </button>
            <span className="text-[10px] font-bold text-slate-500 pr-2">{isAutoPlay ? 'Auto' : 'Manual'}</span>
          </div>
        </div>

        <div className="border-b border-indigo-100 bg-indigo-50/60 px-3 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {sections.map((section, index) => (
              <button
                key={section.id}
                onClick={() => { setActiveStep(index); setIsAutoPlay(false); }}
                className={`min-w-[9rem] rounded-2xl border px-3 py-2 text-left transition-all ${
                  activeStep === index ? 'border-indigo-200 bg-white text-slate-800 shadow-sm' : 'border-transparent bg-indigo-100/70 text-slate-500'
                }`}
              >
                <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-600">Step 0{index + 1}</span>
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
                <div key={item} className="flex gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3">
                  <div className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-indigo-500" />
                  <p className="text-sm leading-6 text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="hidden h-full lg:flex">
        <div className="w-1/4 bg-slate-50 border-r border-indigo-100 flex flex-col z-20">
          <div className="p-5 border-b border-indigo-100 bg-white shadow-sm z-10">
            <div className="flex items-center gap-2 mb-1">
               <div className="bg-indigo-100 p-1.5 rounded-full"><PioneerIcon /></div>
               <h2 className="font-black text-lg text-slate-800 leading-none tracking-tight">PIONEER<br/><span className="text-indigo-600">PROGRAM</span></h2>
            </div>
            <p className="text-[9px] text-slate-500 font-bold leading-tight mt-1">Empowering Future Leaders</p>
            <div className="mt-4 flex items-center gap-2 bg-white border border-indigo-100 p-1 rounded-full w-fit shadow-sm">
              <button 
                onClick={() => setIsAutoPlay(false)}
                className={`p-1.5 rounded-full transition-all ${!isAutoPlay ? 'bg-indigo-100 shadow-inner text-indigo-800' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Pause size={12} fill={!isAutoPlay ? "currentColor" : "none"}/>
              </button>
              <button 
                onClick={() => setIsAutoPlay(true)}
                className={`p-1.5 rounded-full transition-all ${isAutoPlay ? 'bg-indigo-600 shadow text-white' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Play size={12} fill={isAutoPlay ? "currentColor" : "none"}/>
              </button>
              <span className="text-[10px] font-bold text-slate-500 pr-2">{isAutoPlay ? 'Auto' : 'Manual'}</span>
            </div>
          </div>

          <div className="flex-grow flex flex-col overflow-y-auto">
            {sections.map((section, index) => (
              <button
                key={section.id} 
                onClick={() => { setActiveStep(index); setIsAutoPlay(false); }} 
                className={`relative flex-1 px-5 py-2 flex flex-col justify-center text-left transition-all duration-300 outline-none border-b border-indigo-50 ${activeStep === index ? 'bg-white shadow-[inset_4px_0_0_0_#4f46e5]' : 'hover:bg-indigo-50'}`}
              >
                {activeStep === index && isAutoPlay && (
                  <motion.div 
                    className={`absolute bottom-0 left-0 h-1 ${section.color} opacity-30`}
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: DURATION / 1000, ease: "linear" }}
                  />
                )}

                <div className="relative z-10">
                  <span className={`text-[9px] font-bold uppercase tracking-wider mb-0.5 block ${activeStep === index ? 'text-indigo-600' : 'text-slate-400'}`}>Step 0{index + 1}</span>
                  <h3 className={`font-bold text-sm leading-tight ${activeStep === index ? 'text-slate-800' : 'text-slate-400'}`}>{section.title}</h3>
                  <p className={`text-[10px] mt-1 truncate ${activeStep === index ? 'text-slate-500' : 'text-slate-300'}`}>{section.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="w-3/4 relative bg-slate-50 overflow-hidden">
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

export default PioneerPresentation;
