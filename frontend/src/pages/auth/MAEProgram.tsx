import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, Trophy, Monitor, Brain, 
  BarChart3, FileText, Users, Layers, 
  CheckCircle, Zap, Star, LayoutGrid,
  School, Search, Heart, MessageCircle,
  Play, Pause, Tablet, Lightbulb, GraduationCap,
  ArrowRight
} from 'lucide-react';

// --- CUSTOM MAESTRO ICON ---
const MaestroIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-600">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    <circle cx="12" cy="12" r="3" className="fill-purple-100/50" />
  </svg>
);

const MaestroPresentation = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true); 
  const DURATION = 10000; // Increased duration for reading content
  const totalSteps = 3; // Now exactly 3 steps as requested

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
      title: "Holistic Foundation",
      desc: "Curriculum, Targets & Digital",
      color: "bg-blue-600",
      content: (
        <div className="flex flex-col h-full relative overflow-hidden bg-slate-50 p-4 font-sans">
           {/* Header */}
           <div className="text-center mb-4 z-10">
              <h4 className="font-black text-2xl text-slate-800 uppercase tracking-tight">
                  Curriculum • Targets • Digital Edge
              </h4>
           </div>

           <div className="flex h-full pb-2 gap-3">
              
              {/* --- COL 1: CURRICULUM (Blue) --- */}
              <motion.div 
                initial={{y:20, opacity:0}} animate={{y:0, opacity:1}} transition={{delay:0.2}}
                className="w-1/3 bg-white rounded-xl shadow-md border-t-4 border-blue-600 p-3 flex flex-col gap-2 group hover:shadow-xl transition-all"
              >
                  <div className="flex items-center gap-2 border-b border-blue-100 pb-2">
                      <div className="bg-blue-100 p-1.5 rounded-lg"><BookOpen size={60} className="text-blue-600"/></div>
                      <h5 className="font-bold text-blue-900 text-s uppercase leading-tight">Curriculum &<br/>Material</h5>
                  </div>
                  
                  {/* List */}
                  <div className="space-y-2 flex-grow">
                      {['Techno Curriculum', 'Advanced Curriculum', 'Vertical Expansion'].map((item, i) => (
                          <motion.div key={i} whileHover={{x:5}} className="flex items-center gap-2 text-[15px] font-bold text-slate-600">
                              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                              {item}
                          </motion.div>
                      ))}
                      <div className="mt-3 bg-blue-50 p-2 rounded-lg border border-blue-100">
                          <p className="text-[20px] font-bold text-blue-800 mb-1">MATERIAL:</p>
                          <div className="flex gap-2">
                              <span className="text-[13px] bg-white px-2 py-1 rounded shadow-sm border">Concept Book</span>
                              <span className="text-[13px] bg-white px-2 py-1 rounded shadow-sm border">Workbook</span>
                          </div>
                      </div>
                  </div>
              </motion.div>

              {/* --- COL 2: TARGETS (Red/Orange) --- */}
              <motion.div 
                initial={{y:20, opacity:0}} animate={{y:0, opacity:1}} transition={{delay:0.4}}
                className="w-1/3 bg-gradient-to-b from-red-50 to-white rounded-xl shadow-md border-t-4 border-red-500 p-3 flex flex-col items-center text-center gap-2 group hover:scale-105 transition-transform"
              >
                  <motion.div animate={{scale:[1, 1.1, 1]}} transition={{duration:2, repeat:Infinity}}>
                      <Trophy size={60} className="text-red-500 fill-yellow-200 drop-shadow-sm" />
                  </motion.div>
                  <h5 className="font-black text-red-900 text-s uppercase">Target<br/>Competitive Exams</h5>
                  
                  <div className="flex flex-wrap justify-center gap-1.5 my-auto">
                      {['Olympiads', 'EAPCET', 'NEET', 'JEE Main', 'JEE Adv'].map((exam, i) => (
                          <span key={i} className="px-2 py-0.5 bg-white border border-red-100 rounded text-[15px] font-bold text-red-700 shadow-sm">{exam}</span>
                      ))}
                  </div>

                  <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-[15px] font-bold flex items-center gap-1">
                      <Star size={10} fill="currentColor"/> Suitable for All
                  </div>
              </motion.div>

              {/* --- COL 3: DIGITAL (Teal) --- */}
              <motion.div 
                initial={{y:20, opacity:0}} animate={{y:0, opacity:1}} transition={{delay:0.6}}
                className="w-1/3 bg-white rounded-xl shadow-md border-t-4 border-teal-600 p-3 flex flex-col gap-2 group hover:shadow-xl transition-all"
              >
                  <div className="flex items-center gap-2 border-b border-teal-100 pb-2">
                      <div className="bg-teal-100 p-1.5 rounded-lg"><Monitor size={60} className="text-teal-600"/></div>
                      <h5 className="font-bold text-teal-900 text-m uppercase leading-tight">Digital &<br/>Analytics Edge</h5>
                  </div>

                  <div className="space-y-3 flex-grow pt-1">
                      {/* DITP */}
                      <div className="flex gap-2 items-start">
                          <div className="mt-0.5 text-teal-500"><Tablet size={40}/></div>
                          <div>
                              <h6 className="text-[15px] font-black text-slate-800">DITP</h6>
                              <p className="text-[15px] text-slate-500 leading-tight">Digital Interactive Teaching Product (Content & Login)</p>
                          </div>
                      </div>
                      {/* RA Dashboard */}
                      <div className="flex gap-2 items-start">
                          <div className="mt-0.5 text-teal-500"><BarChart3 size={40}/></div>
                          <div>
                              <h6 className="text-[15px] font-black text-slate-800">RA DASHBOARD</h6>
                              <p className="text-[15px] text-slate-500 leading-tight">Reports: School, Class, Student, Teacher</p>
                          </div>
                      </div>
                  </div>
              </motion.div>

           </div>
        </div>
      )
    },
    {
      id: 2,
      title: "Assessment Architecture",
      desc: "Questions, Skills & Structure",
      color: "bg-purple-600",
      content: (
        <div className="flex flex-col h-full bg-purple-50 relative overflow-hidden font-sans p-5">
           
           <div className="text-center mb-6 z-10">
              <h4 className="font-black text-2xl text-purple-900 uppercase tracking-tight bg-white inline-block px-4 py-1 rounded-full shadow-sm">
                  Assessment & Skill Architecture
              </h4>
           </div>

           {/* CONNECTED FLOW CHART */}
           <div className="flex items-center justify-between h-full pb-4 px-2 relative">
              {/* Connecting Line */}
              <svg className="absolute top-1/2 left-0 w-full h-10 -translate-y-1/2 z-0 overflow-visible">
                  <motion.path 
                    d="M 50 20 L 200 20 L 350 20 L 500 20" 
                    stroke="#d8b4fe" strokeWidth="4" fill="none" strokeDasharray="10 5"
                    animate={{strokeDashoffset: [0, -20]}} transition={{duration: 1, repeat: Infinity, ease: "linear"}}
                  />
              </svg>

              {/* NODE 1: QUESTION TYPES */}
              <motion.div initial={{scale:0}} animate={{scale:1}} transition={{delay:0.2}} className="w-1/4 relative z-10 flex flex-col items-center">
                  <div className="w-35 h-35 bg-white rounded-full border-4 border-purple-400 flex flex-col items-center justify-center shadow-lg group hover:scale-110 transition-transform cursor-pointer">
                      <span className="text-3xl mb-1">❓</span>
                      <span className="text-[15px] font-black text-purple-900 text-center leading-none">QUESTION<br/>TYPES</span>
                  </div>
                  <div className="mt-2 bg-white/80 p-2 rounded-lg text-[13px] font-bold text-slate-600 text-center w-full shadow-sm backdrop-blur-sm">
                      Single/Multi MCQ<br/>Numerical • Matrix<br/>Assertion & Reasoning
                  </div>
              </motion.div>

              {/* NODE 2: SKILLS TARGET */}
              <motion.div initial={{scale:0}} animate={{scale:1}} transition={{delay:0.4}} className="w-1/4 relative z-10 flex flex-col items-center">
                   <div className="w-35 h-35 bg-white rounded-full border-4 border-purple-500 flex flex-col items-center justify-center shadow-lg group hover:scale-110 transition-transform cursor-pointer">
                      <span className="text-3xl mb-1">📶</span>
                      <span className="text-[15px] font-black text-purple-900 text-center leading-none">SKILLS<br/>TARGET</span>
                  </div>
                  <div className="mt-2 flex flex-col gap-0.5 w-16 items-center">
                      <div className="w-8 h-2 bg-red-400 rounded-sm"></div>
                      <div className="w-14 h-2 bg-yellow-400 rounded-sm"></div>
                      <div className="w-18 h-2 bg-green-400 rounded-sm"></div>
                      <span className="text-[13px] font-bold text-slate-500">Level 1,2,3</span>
                  </div>
              </motion.div>

              {/* NODE 3: EXAM STRUCTURE */}
              <motion.div initial={{scale:0}} animate={{scale:1}} transition={{delay:0.6}} className="w-1/4 relative z-10 flex flex-col items-center">
                   <div className="w-35 h-35 bg-white rounded-full border-4 border-purple-600 flex flex-col items-center justify-center shadow-lg group hover:scale-110 transition-transform cursor-pointer">
                      <span className="text-3xl mb-1">📅</span>
                      <span className="text-[15px] font-black text-purple-900 text-center leading-none">STRUCTURE<br/>(Total 25)</span>
                  </div>
                  <div className="mt-2 bg-white/80 p-2 rounded-lg text-[13px] font-bold text-slate-600 text-center w-full shadow-sm backdrop-blur-sm">
                      Part Tests: 18<br/>Unit Tests: 05<br/>Grand Tests: 02
                  </div>
              </motion.div>

               {/* NODE 4: MODES */}
               <motion.div initial={{scale:0}} animate={{scale:1}} transition={{delay:0.8}} className="w-1/4 relative z-10 flex flex-col items-center">
                   <div className="w-35 h-35 bg-white rounded-full border-4 border-purple-700 flex flex-col items-center justify-center shadow-lg group hover:scale-110 transition-transform cursor-pointer">
                      <span className="text-3xl mb-1">📝</span>
                      <span className="text-[15px] font-black text-purple-900 text-center leading-none">EXAM<br/>MODES</span>
                  </div>
                  <div className="mt-2 flex gap-1">
                      <span className="px-1.5 py-0.5 bg-purple-100 rounded text-[13px] font-bold text-purple-800">OMR</span>
                      <span className="px-1.5 py-0.5 bg-purple-100 rounded text-[13px] font-bold text-purple-800">TAB</span>
                  </div>
              </motion.div>

           </div>
        </div>
      )
    },
    {
      id: 3,
      title: "Ecosystem Support",
      desc: "Training, Audition & Growth",
      color: "bg-green-600",
      content: (
        <div className="flex flex-col h-full bg-gradient-to-br from-green-50 to-emerald-100 relative overflow-hidden font-sans p-6">
           
           <div className="text-center mb-8 z-10">
              <h4 className="font-black text-2xl text-green-900 uppercase tracking-tight bg-white inline-block px-6 py-2 rounded-full shadow-sm border border-green-200">
                 Ecosystem Support & Development
              </h4>
           </div>

           {/* HORIZONTAL PROCESS FLOW */}
           <div className="flex items-center justify-between gap-4 h-full pb-8">
              
              {[
                 { id: 11, t: "Teacher Training", sub: "Workshop", i: <Users size={50}/>, c: "border-green-500 text-green-600" },
                 { id: 12, t: "Academic", sub: "Audition", i: <Search size={50}/>, c: "border-emerald-500 text-emerald-600" },
                 { id: 13, t: "Subject Enrichment", sub: "Sessions", i: <Brain size={50}/>, c: "border-teal-500 text-teal-600" },
                 { id: 14, t: "Parent", sub: "Seminar", i: <MessageCircle size={50}/>, c: "border-cyan-500 text-cyan-600" },
              ].map((item, idx) => (
                 <motion.div 
                    key={idx}
                    initial={{y: 50, opacity: 0}}
                    animate={{y: 0, opacity: 1}}
                    transition={{delay: 0.3 + (idx * 0.2), type: "spring"}}
                    className="flex-1 flex flex-col items-center relative group"
                 >
                    {/* Arrow between items */}
                    {idx < 3 && (
                       <div className="absolute top-8 left-[60%] w-[80%] h-1 bg-green-200 z-0">
                          <motion.div 
                            className="h-full bg-green-400"
                            initial={{width:0}} animate={{width:"100%"}} transition={{delay: 0.8 + (idx*0.2), duration:0.5}}
                          />
                       </div>
                    )}

                    {/* Circle Icon */}
                    <div className={`w-35 h-35 bg-white rounded-full border-4 ${item.c} flex items-center justify-center shadow-lg relative z-10 group-hover:-translate-y-2 transition-transform duration-300`}>
                       {item.i}
                    </div>

                    {/* Number Badge 
                    <div className="absolute top-0 right-4 bg-slate-800 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full z-20 border-2 border-white">
                       {item.id}
                    </div>*/}

                    {/* Text */}
                    <div className="text-center mt-3 bg-white/60 p-2 rounded-lg backdrop-blur-sm w-full">
                       <h5 className="font-black text-slate-800 text-s leading-tight">{item.t}</h5>
                       <p className="text-[15px] font-bold text-slate-500">{item.sub}</p>
                    </div>
                 </motion.div>
              ))}

           </div>
        </div>
      )
    },
  ];

  const mobileSummaries = [
    [
      "Holistic foundation with curriculum, target exams, and digital enablement.",
      "Learning materials include techno curriculum, advanced curriculum, and vertical expansion.",
      "Digital support covers DITP and RA dashboard reporting for school, class, student, and teacher views.",
    ],
    [
      "Assessment architecture includes question types, skill levels, exam structure, and exam modes.",
      "Covers single and multi MCQ, numerical, matrix, and assertion and reasoning formats.",
      "Built for a structured mix of part tests, unit tests, grand tests, and both OMR and TAB modes.",
    ],
    [
      "Ecosystem support strengthens delivery beyond core academics.",
      "Includes teacher training, academic audition, subject enrichment sessions, and parent seminars.",
      "Focuses on continuous growth for teachers, students, and families.",
    ],
  ];

  return (
    <div className="mx-auto h-[78vh] max-h-[42rem] w-full max-w-8xl overflow-hidden rounded-3xl border-4 border-purple-100 bg-white font-sans shadow-2xl">
      <div className="flex h-full flex-col lg:hidden">
        <div className="border-b border-purple-100 bg-white p-4">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-purple-100 p-1.5"><MaestroIcon /></div>
            <div>
              <h2 className="text-base font-black leading-none tracking-tight text-slate-800">MAESTRO <span className="text-purple-600">PROGRAM</span></h2>
              <p className="mt-1 text-xs font-medium text-slate-500">{sections[activeStep].desc}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-full border border-purple-100 bg-white p-1 shadow-sm">
            <button
              onClick={() => setIsAutoPlay(false)}
              className={`rounded-full p-1.5 transition-all ${!isAutoPlay ? 'bg-purple-100 text-purple-800 shadow-inner' : 'text-slate-400'}`}
            >
              <Pause size={12} fill={!isAutoPlay ? "currentColor" : "none"} />
            </button>
            <button
              onClick={() => setIsAutoPlay(true)}
              className={`rounded-full p-1.5 transition-all ${isAutoPlay ? 'bg-purple-600 text-white shadow' : 'text-slate-400'}`}
            >
              <Play size={12} fill={isAutoPlay ? "currentColor" : "none"} />
            </button>
            <span className="pr-2 text-[10px] font-bold text-slate-500">{isAutoPlay ? 'Auto' : 'Manual'}</span>
          </div>
        </div>

        <div className="border-b border-purple-100 bg-purple-50/60 px-3 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {sections.map((section, index) => (
              <button
                key={section.id}
                onClick={() => { setActiveStep(index); setIsAutoPlay(false); }}
                className={`min-w-[9rem] rounded-2xl border px-3 py-2 text-left transition-all ${
                  activeStep === index
                    ? 'border-purple-200 bg-white text-slate-800 shadow-sm'
                    : 'border-transparent bg-purple-100/70 text-slate-500'
                }`}
              >
                <span className="block text-[10px] font-bold uppercase tracking-wider text-purple-500">Step 0{index + 1}</span>
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
                <div key={item} className="flex gap-3 rounded-2xl border border-purple-100 bg-purple-50/40 p-3">
                  <div className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-purple-500" />
                  <p className="text-sm leading-6 text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="hidden h-full lg:flex">
        <div className="flex w-1/4 flex-col border-r border-purple-100 bg-purple-50/50 z-20">
          <div className="border-b border-purple-100 bg-white p-5 shadow-sm z-10">
            <div className="mb-1 flex items-center gap-2">
               <div className="bg-purple-100 p-1.5 rounded-full"><MaestroIcon /></div>
               <h2 className="font-black text-lg text-slate-800 leading-none tracking-tight">MAESTRO<br/><span className="text-purple-600">PROGRAM</span></h2>
            </div>
            <div className="mt-4 flex w-fit items-center gap-2 rounded-full border border-purple-100 bg-white p-1 shadow-sm">
              <button 
                onClick={() => setIsAutoPlay(false)}
                className={`p-1.5 rounded-full transition-all ${!isAutoPlay ? 'bg-purple-100 shadow-inner text-purple-800' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Pause size={12} fill={!isAutoPlay ? "currentColor" : "none"}/>
              </button>
              <button 
                onClick={() => setIsAutoPlay(true)}
                className={`p-1.5 rounded-full transition-all ${isAutoPlay ? 'bg-purple-600 shadow text-white' : 'text-slate-400 hover:text-slate-600'}`}
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
                className={`relative flex-1 px-5 py-2 flex flex-col justify-center text-left transition-all duration-300 outline-none border-b border-purple-50 ${activeStep === index ? 'bg-white shadow-[inset_4px_0_0_0_#9333ea]' : 'hover:bg-purple-50'}`}
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
                  <span className={`text-[9px] font-bold uppercase tracking-wider mb-0.5 block ${activeStep === index ? 'text-purple-500' : 'text-slate-400'}`}>Step 0{index + 1}</span>
                  <h3 className={`font-bold text-sm leading-tight ${activeStep === index ? 'text-slate-800' : 'text-slate-400'}`}>{section.title}</h3>
                  <p className={`text-[10px] mt-1 truncate ${activeStep === index ? 'text-slate-500' : 'text-slate-300'}`}>{section.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-3/4 overflow-hidden bg-slate-50">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
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

export default MaestroPresentation;
