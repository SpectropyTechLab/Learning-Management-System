import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, Target, Monitor, Brain, 
  BarChart3, FileText, Users, Layers, 
  CheckCircle, ChevronRight, GraduationCap,
  Play, Pause, Tablet, PenTool, LayoutGrid,
  PieChart, School, FileCheck, Search, HelpCircle,
  Home, User, Presentation, MessagesSquare
} from 'lucide-react';

// Helper Icon for Numerical
const BinaryIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2"/>
    <path d="M8 10h.01"/><path d="M12 10h.01"/><path d="M16 10h.01"/>
    <path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/>
  </svg>
);

const AutoPresentation = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true); 
  const DURATION = 8000; 
  const totalSteps = 4;

  // --- 1. KEYBOARD NAVIGATION LOGIC (NEW) ---

  // --- 2. AUTO SCROLL LOGIC ---
  // --- KEYBOARD NAVIGATION HOOK ---
  useEffect(() => {
    // Added ': KeyboardEvent' type definition
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Pause auto-play immediately on user interaction
      setIsAutoPlay(false);

      switch (e.key) {
        // Next Step: Right Arrow, PageDown, Space
        case 'ArrowRight':
        case 'PageDown':
        case ' ': // Spacebar
          e.preventDefault(); // Stop the page from scrolling down
          setActiveStep((prev) => (prev + 1) % totalSteps);
          break;

        // Previous Step: Left Arrow, PageUp
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault(); // Stop the page from scrolling up
          setActiveStep((prev) => (prev === 0 ? totalSteps - 1 : prev - 1));
          break;

        default:
          break;
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup on unmount
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- AUTO SCROLL LOGIC ---
  useEffect(() => {
    // Added ': any' type definition
    let interval: any;
    
    if (isAutoPlay) {
      interval = setInterval(() => {
        setActiveStep((prev) => (prev + 1) % totalSteps);
      }, DURATION);
    }
    return () => clearInterval(interval);
  }, [isAutoPlay]);

  const sections = [
    {
      id: 1,
      title: "Foundation & Targets",
      desc: "NCERT Curriculum & Competitive Goals",
      color: "bg-blue-600",
      content: (
        <div className="flex flex-col h-full relative overflow-hidden bg-gradient-to-br from-white to-slate-50 p-6">
           {/* Header Title */}
           <motion.div initial={{y:-20, opacity:0}} animate={{y:0, opacity:1}} className="text-center mb-8 z-10 relative">
              <h4 className="font-black text-2xl text-slate-800 uppercase tracking-tight inline-block relative after:content-[''] after:absolute after:-bottom-2 after:left-1/2 after:-translate-x-1/2 after:w-16 after:h-1 after:bg-blue-500 after:rounded-full">
                 1. Foundation & Targets
              </h4>
              <p className="text-slate-500 text-sm font-medium mt-3">(Core Curriculum & Competitive Goals)</p>
           </motion.div>

           <div className="flex items-center justify-between h-full pb-8 px-4 relative z-10">
              
              {/* --- STEP 1: LEFT SIDE (Curriculum & Material) --- */}
              <div className="w-[45%] flex flex-col items-center z-10 p-4 bg-white rounded-2xl shadow-lg border border-slate-100 relative overflow-hidden group hover:shadow-xl transition-shadow">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-teal-400"></div>
                  
                  {/* Book Stack Animation */}
                  <div className="flex items-center gap-6 mb-6 w-full justify-center">
                    <div className="relative w-24 h-28 drop-shadow-xl">
                        {/* Book 1 */}
                        <motion.div initial={{x:-50, opacity:0}} animate={{x:0, opacity:1}} transition={{delay:0.2}} className="absolute bottom-0 left-0 w-24 h-7 bg-blue-700 rounded-sm border-l-4 border-blue-300 shadow-md z-30"></motion.div>
                        {/* Book 2 */}
                        <motion.div initial={{x:-50, opacity:0}} animate={{x:0, opacity:1}} transition={{delay:0.3}} className="absolute bottom-7 left-1 w-22 h-7 bg-orange-500 rounded-sm border-l-4 border-orange-300 shadow-md z-20"></motion.div>
                        {/* Book 3 (Open) */}
                        <motion.div initial={{x:-50, opacity:0}} animate={{x:0, opacity:1}} transition={{delay:0.4}} className="absolute bottom-14 left-2 w-20 h-7 bg-white border-2 border-slate-200 rounded-sm z-10 flex items-center justify-center shadow-sm">
                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide">NCERT</span>
                        </motion.div>
                        {/* Govt Stamp Badge */}
                        <motion.div initial={{scale:0}} animate={{scale:1}} transition={{delay:0.6}} className="absolute -top-3 -right-3 bg-gradient-to-br from-white to-slate-100 border-2 border-blue-500 rounded-full w-12 h-12 flex items-center justify-center shadow-lg z-40">
                             <School size={20} className="text-blue-600"/>
                        </motion.div>
                    </div>
                    
                    <div className="text-left">
                        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.5}} className="font-black text-slate-800 text-base leading-tight uppercase">
                            <span className="text-blue-600">Curriculum:</span><br/>
                            NCERT / SCERT<br/>
                            <span className="text-slate-500 font-bold text-xs normal-case bg-slate-100 px-2 py-0.5 rounded-full mt-1 inline-block">State Board Content</span>
                        </motion.div>
                    </div>
                  </div>

                  {/* Learning Material Icons */}
                  <div className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-teal-400"></div>
                      <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{delay:1.5}} className="text-[10px] font-bold text-teal-700 uppercase tracking-widest mb-3 pl-2">
                          Learning Material
                      </motion.div>
                      <div className="flex justify-around items-start gap-2 pl-2">
                          {[
                              {icon: <FileText size={22} className="text-teal-600"/>, t: "Conceptual", t2: "Synopsis", d:0.9, c:"bg-teal-100 border-teal-200"},
                              {icon: <CheckCircle size={22} className="text-blue-600"/>, t: "Class", t2: "Worksheet", d:1.1, c:"bg-blue-100 border-blue-200"},
                              {icon: <Home size={22} className="text-orange-600"/>, t: "Home", t2: "Worksheet", d:1.3, c:"bg-orange-100 border-orange-200"}
                          ].map((item, i) => (
                              <motion.div key={i} initial={{y:20, opacity:0}} animate={{y:0, opacity:1}} transition={{delay: item.d}} className="flex flex-col items-center text-center group/icon">
                                  <div className={`w-12 h-12 rounded-full ${item.c} border flex items-center justify-center mb-2 shadow-sm group-hover/icon:scale-110 transition-transform`}>
                                      {item.icon}
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-700 leading-tight uppercase">{item.t}<br/>{item.t2}</span>
                              </motion.div>
                          ))}
                      </div>
                  </div>
              </div>

              {/* --- ARROW ANIMATION --- */}
              <div className="w-[10%] flex items-center justify-center relative z-0">
                  <motion.div 
                    initial={{pathLength:0, opacity:0}} 
                    animate={{pathLength:1, opacity:1}} 
                    transition={{delay:1.6, duration:0.5}}
                    className="text-blue-300/50 absolute"
                  >
                     <ChevronRight size={80} strokeWidth={4} />
                  </motion.div>
                  <motion.div 
                    initial={{x:-20, opacity:0}} 
                    animate={{x:0, opacity:1}} 
                    transition={{delay:1.7, duration:0.5}}
                    className="text-blue-600 relative z-10"
                  >
                     <ChevronRight size={48} strokeWidth={3} />
                  </motion.div>
              </div>

              {/* --- STEP 2: RIGHT SIDE (Target Exams) --- */}
              <div className="w-[45%] flex flex-col items-center z-10 p-4 bg-slate-800 rounded-2xl shadow-lg relative overflow-hidden text-white group hover:shadow-xl transition-shadow border border-slate-700">
                   {/* Mountain Graphic */}
                   <div className="relative w-48 h-36 mb-4">
                       {/* Mountain 1 (Back) */}
                       <motion.div initial={{y:100}} animate={{y:0}} transition={{delay:1.8, type:"spring", stiffness:100}} className="absolute bottom-0 left-0 w-full h-full flex items-end justify-center">
                            <svg viewBox="0 0 100 60" className="w-full h-full drop-shadow-2xl">
                                <defs>
                                    <linearGradient id="mountainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" style={{stopColor:'#1e293b', stopOpacity:1}} />
                                    <stop offset="100%" style={{stopColor:'#0f172a', stopOpacity:1}} />
                                    </linearGradient>
                                    <linearGradient id="snowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" style={{stopColor:'#ffffff', stopOpacity:1}} />
                                    <stop offset="100%" style={{stopColor:'#e2e8f0', stopOpacity:1}} />
                                    </linearGradient>
                                </defs>
                                {/* Left Peak */}
                                <polygon points="0,60 30,25 60,60" fill="#334155" />
                                {/* Right Peak */}
                                <polygon points="40,60 80,15 100,60" fill="#475569" />
                                {/* Main Center Peak */}
                                <polygon points="20,60 50,5 80,60" fill="url(#mountainGrad)" />
                                {/* Snow Cap */}
                                <path d="M50 5 L62 22 L50 18 L38 22 Z" fill="url(#snowGrad)" />
                            </svg>
                       </motion.div>
                       
                       {/* Flags */}
                       {[12, 32, 22].map((h, i) => (
                           <motion.div key={i} initial={{opacity:0, y:20, scale:0}} animate={{opacity:1, y:0, scale:1}} transition={{delay:2.2 + (i*0.2), type:"spring"}} className={`absolute top-${h} ${i===0?'left-[49%]':i===1?'left-[29%]':'left-[76%]'} -translate-x-1/2`}>
                               <div className="flex flex-col items-center group/flag">
                                   <div className="w-5 h-3.5 bg-red-500 rounded-sm mb-[-1px] relative shadow-sm border-l border-red-700 overflow-hidden">
                                       <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-slate-900"></div>
                                       <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/30 opacity-0 group-hover/flag:opacity-100 transition-opacity"></div>
                                   </div>
                                   <div className="w-[2px] h-7 bg-slate-900"></div>
                               </div>
                           </motion.div>
                       ))}
                   </div>

                   <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{delay:2.5}} className="text-center relative z-10">
                       <div className="bg-red-500 text-white text-xs font-bold uppercase px-3 py-1 rounded-full mb-2 inline-block shadow-sm">
                         <Target size={14} className="inline mr-1"/> Target Exams
                       </div>
                       <p className="text-xs font-bold text-blue-100 leading-relaxed px-4 py-2 bg-slate-700/50 rounded-lg border border-slate-600/50 shadow-inner">
                           JEE Advanced • JEE Main<br/>
                           NEET • EAPCET • Olympiads
                       </p>
                   </motion.div>
                   
                   {/* Background Glow */}
                   <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 to-transparent pointer-events-none"></div>
              </div>

           </div>
        </div>
      )
    },
     {
      id: 2,
      title: "Pedagogy & Skills",
      desc: "Digital Teaching & Cognitive Growth",
      color: "bg-yellow-400",
      content: (
        <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden font-sans">
           {/* Background Decorations */}
           <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full blur-2xl opacity-60 pointer-events-none"></div>
           <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-100 rounded-full blur-2xl opacity-60 pointer-events-none"></div>

           {/* Header */}
           <div className="text-center pt-5 pb-2 z-10">
              <h4 className="font-black text-2xl text-slate-800 uppercase tracking-tight">
                 Pedagogy & Skill Development
              </h4>
              <div className="h-1 w-24 bg-indigo-600 mx-auto rounded-full mt-1 mb-1"></div>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">How We Teach & Build</p>
           </div>

           <div className="flex-grow p-5 flex flex-col gap-4 relative z-10">
              
              {/* --- TOP ROW: TEACHING & WORKSHOPS --- */}
              <div className="flex gap-5 h-[55%]">
                  
                  {/* 1. DITP (Tablet Style) */}
                  <motion.div 
                    initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}
                    className="w-1/2 bg-white rounded-2xl shadow-lg border-b-4 border-indigo-500 p-2 relative overflow-hidden group flex flex-col items-center justify-center"
                  >
                      {/* TABLET GRAPHIC */}
                      <div className="relative w-48 h-32 transform group-hover:scale-105 transition-transform duration-500">
                          <svg viewBox="0 0 200 140" className="w-full h-full drop-shadow-lg">
                              {/* Tablet Frame */}
                              <rect x="10" y="10" width="180" height="120" rx="10" fill="#1e293b" />
                              <rect x="20" y="20" width="160" height="100" rx="2" fill="#eff6ff" />
                              
                              {/* Cloud Icon (Animated) */}
                              <g transform="translate(40, 40)">
                                <motion.path 
                                  d="M10 20 C10 10 25 10 30 20 C35 15 45 15 50 20 C55 20 55 35 50 35 L10 35 C5 35 5 20 10 20 Z" 
                                  fill="#3b82f6" stroke="#2563eb" strokeWidth="2"
                                  animate={{ y: [0, -3, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                />
                                <path d="M30 25 L30 15" stroke="white" strokeWidth="3" strokeLinecap="round" />
                                <path d="M25 20 L30 15 L35 20" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                              </g>

                              {/* Circuit/Tech Lines */}
                              <circle cx="45" cy="80" r="3" fill="#f59e0b" />
                              <circle cx="65" cy="80" r="3" fill="#f59e0b" />
                              <path d="M45 77 L45 65 M65 77 L65 65" stroke="#94a3b8" strokeWidth="2" />
                              <path d="M35 65 L75 65" stroke="#94a3b8" strokeWidth="2" />
                              
                              {/* Teacher Avatar */}
                              <g transform="translate(100, 30)">
                                  {/* Body/Suit */}
                                  <path d="M10 90 L10 60 Q10 50 20 50 L60 50 Q70 50 70 60 L70 90 Z" fill="#1e3a8a" />
                                  {/* Shirt */}
                                  <path d="M30 50 L40 80 L50 50 Z" fill="white" />
                                  {/* Tie */}
                                  <path d="M38 50 L40 70 L42 50" stroke="#dc2626" strokeWidth="4" />
                                  {/* Head */}
                                  <circle cx="40" cy="30" r="18" fill="#fcd34d" />
                                  <path d="M22 25 Q40 5 58 25 Q58 10 40 10 Q22 10 22 25" fill="#1e293b" />
                              </g>
                          </svg>
                      </div>
                      
                      <div className="text-center mt-1">
                          <h5 className="font-black text-indigo-900 text-s">DITP(Digital Interactive Teaching Product)</h5>
                          <p className="text-[10px] font-bold text-slate-500 leading-tight">Digital Teaching Content, Teacher Login & Teach</p>
                      </div>
                  </motion.div>

                  {/* 2. WORKSHOPS (Circular Icons) */}
                  <motion.div 
                    initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }}
                    className="w-1/2 flex flex-col items-center justify-center gap-2"
                  >
                      <div className="flex items-center gap-1 w-full justify-center">
                          {/* Circle 1: Teacher Training */}
                          <div className="flex flex-col items-center">
                              <div className="w-20 h-20 bg-white rounded-full border-2 border-blue-200 shadow-md flex items-center justify-center p-2 relative group hover:border-blue-400 transition-colors">
                                  <svg viewBox="0 0 100 100" className="w-full h-full">
                                      {/* Board */}
                                      <rect x="20" y="10" width="40" height="30" fill="#f1f5f9" stroke="#64748b" strokeWidth="2"/>
                                      {/* Teacher */}
                                      <circle cx="75" cy="40" r="8" fill="#3b82f6"/>
                                      <path d="M65 80 L85 80 L80 50 L70 50 Z" fill="#1d4ed8"/>
                                      <line x1="70" y1="50" x2="40" y2="25" stroke="#1d4ed8" strokeWidth="2"/> {/* Pointer */}
                                      {/* Students */}
                                      <circle cx="30" cy="80" r="6" fill="#94a3b8"/>
                                      <circle cx="50" cy="80" r="6" fill="#94a3b8"/>
                                      <circle cx="10" cy="80" r="6" fill="#94a3b8"/>
                                  </svg>
                              </div>
                              <span className="text-[15px] font-bold text-slate-600 text-center mt-1 leading-tight">Teacher<br/>Training</span>
                          </div>

                          {/* Connector Line */}
                          <div className="w-8 h-1 bg-slate-300 rounded-full"></div>

                          {/* Circle 2: Enrichment */}
                          <div className="flex flex-col items-center">
                              <div className="w-20 h-20 bg-white rounded-full border-2 border-teal-200 shadow-md flex items-center justify-center p-2 relative group hover:border-teal-400 transition-colors">
                                  <svg viewBox="0 0 100 100" className="w-full h-full">
                                      {/* Book */}
                                      <path d="M10 70 L90 70 L90 30 L10 30 Z" fill="#ccfbf1" stroke="#0f766e" strokeWidth="2"/>
                                      <line x1="50" y1="30" x2="50" y2="70" stroke="#0f766e" strokeWidth="1"/>
                                      {/* Magnifying Glass */}
                                      <motion.g animate={{ x: [-5, 5, -5], y: [-5, 5, -5] }} transition={{ duration: 4, repeat: Infinity }}>
                                          <circle cx="50" cy="45" r="18" stroke="#f59e0b" strokeWidth="3" fill="rgba(255,255,255,0.3)"/>
                                          <line x1="62" y1="57" x2="80" y2="75" stroke="#b45309" strokeWidth="4" strokeLinecap="round"/>
                                      </motion.g>
                                  </svg>
                              </div>
                              <span className="text-[15px] font-bold text-slate-600 text-center mt-1 leading-tight">Subject<br/>Enrichment</span>
                          </div>
                      </div>
                  </motion.div>
              </div>

              {/* --- BOTTOM ROW: BLOOM'S TAXONOMY (Text Inside Bar) --- */}
              <motion.div 
                 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}
                 className="h-[50%] bg-white rounded-2xl shadow-lg border border-slate-100 p-3 relative overflow-hidden"
              >
                  <div className="flex justify-center items-center mb-1 gap-2">
                     {/* Brain Icon */}
                     <div className="w-5 h-5 relative">
                        <Brain className="text-rose-500 w-full h-full" />
                        <motion.div 
                          animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                          className="absolute -top-1 -right-1 text-slate-400"
                        >
                           <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <circle cx="12" cy="12" r="3" />
                              <path d="M12 2V4 M12 20V22 M2 12H4 M20 12H22" />
                           </svg>
                        </motion.div>
                     </div>
                     <h5 className="font-black text-slate-800 text-s uppercase tracking-wide">Skills Target (Bloom's)</h5>
                  </div>

                  {/* STAIRCASE ANIMATION */}
                  <div className="w-full h-full flex items-end justify-center gap-2 pb-2 px-2">
                      {[
                        {l:"Remember", c:"bg-yellow-400 border-yellow-500", h:25},
                        {l:"Understand", c:"bg-orange-400 border-orange-500", h:38},
                        {l:"Apply", c:"bg-rose-400 border-rose-500", h:51},
                        {l:"Analyse", c:"bg-purple-400 border-purple-500", h:64},
                        {l:"Evaluate", c:"bg-blue-400 border-blue-500", h:77},
                        {l:"Create", c:"bg-teal-400 border-teal-500", h:90},
                      ].map((step, i) => (
                        <div key={i} className="flex-1 h-full flex flex-col justify-end items-center group">
                            
                            {/* Animated Bar containing Number AND Text */}
                            <motion.div 
                                initial={{ height: 0 }}
                                animate={{ height: `${step.h}%` }}
                                transition={{ delay: 0.8 + (i * 0.2), duration: 0.6, type: "spring" }}
                                className={`w-full ${step.c} rounded-t-md relative shadow-md border-b-0 border-r-2 border-l-2 border-t-2 overflow-hidden flex flex-col items-center justify-start pt-2 gap-0.5`}
                            >
                                <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent"></div>
                                
                                {/* Number */}
                                <span className="relative z-10 text-white font-black text-[12px] leading-none drop-shadow-sm">{i+1}</span>
                                
                                {/* Label Inside */}
                                <span className="relative z-10 text-white font-bold text-[10px] uppercase tracking-tighter leading-none text-center px-0.5 break-words">
                                    {step.l}
                                </span>
                            </motion.div>
                            
                        </div>
                      ))}
                  </div>
              </motion.div>

           </div>
        </div>
      )
    },
    {
      id: 3,
      title: "Assessment Regime",
      desc: "Architecture & Modes",
      color: "bg-orange-500",
      content: (
        <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden font-sans">
           {/* Background Decorations */}
           <div className="absolute top-[-50px] left-[-50px] w-64 h-64 bg-orange-100 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
           <div className="absolute bottom-[-20px] right-[-20px] w-64 h-64 bg-blue-100 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

           {/* Header */}
           <div className="text-center pt-5 pb-4 z-10">
              <h4 className="font-black text-2xl text-slate-800 uppercase tracking-tight">
                 Assessment Architecture
              </h4>
              <div className="h-1 w-24 bg-orange-500 mx-auto rounded-full mt-2 mb-1"></div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Testing Regime & Question Types</p>
           </div>

           <div className="flex-grow px-8 pb-6 flex gap-8 relative z-10">
              
              {/* --- LEFT COLUMN: PYRAMID & MODES --- */}
              <div className="w-[45%] flex flex-col gap-6">
                  
                  {/* STEP 1: EXAM STRUCTURE (Large 3D Pyramid) */}
                  <div className="flex-grow bg-white rounded-3xl shadow-xl border border-slate-100 p-4 relative overflow-hidden flex flex-col items-center justify-center group hover:shadow-2xl transition-shadow duration-500">
                      
                      {/* PYRAMID SVG */}
                      <div className="w-full h-48 relative">
                          <svg viewBox="0 0 240 180" className="w-full h-full drop-shadow-xl">
                              
                              {/* Base Layer (Part Tests) - Blue */}
                              <motion.g initial={{y:50, opacity:0}} animate={{y:0, opacity:1}} transition={{delay:0.2, type:"spring", stiffness: 100}}>
                                  {/* Front Face */}
                                  <path d="M20 170 L220 170 L190 120 L50 120 Z" fill="#1e3a8a" stroke="#172554" strokeWidth="1"/>
                                  {/* Side Face Shading */}
                                  <path d="M220 170 L190 120 L195 120 L225 170 Z" fill="#172554" opacity="0.3"/>
                                  {/* Text */}
                                  <text x="120" y="150" fontSize="14" fill="white" fontWeight="900" textAnchor="middle" style={{textShadow: "0px 2px 4px rgba(0,0,0,0.5)"}}>PART TESTS</text>
                                  <text x="120" y="162" fontSize="10" fill="#bfdbfe" fontWeight="600" textAnchor="middle">THE FOUNDATION</text>
                              </motion.g>

                              {/* Middle Layer (Unit Tests) - Green */}
                              <motion.g initial={{y:50, opacity:0}} animate={{y:0, opacity:1}} transition={{delay:0.4, type:"spring", stiffness: 100}}>
                                  {/* Front Face */}
                                  <path d="M55 115 L185 115 L160 70 L80 70 Z" fill="#16a34a" stroke="#14532d" strokeWidth="1"/>
                                  {/* Side Face Shading */}
                                  <path d="M185 115 L160 70 L165 70 L190 115 Z" fill="#14532d" opacity="0.3"/>
                                  {/* Text */}
                                  <text x="120" y="98" fontSize="14" fill="white" fontWeight="900" textAnchor="middle" style={{textShadow: "0px 2px 4px rgba(0,0,0,0.5)"}}>UNIT TESTS</text>
                              </motion.g>

                              {/* Top Layer (Grand Test) - Orange */}
                              <motion.g initial={{y:50, opacity:0}} animate={{y:0, opacity:1}} transition={{delay:0.6, type:"spring", stiffness: 100}}>
                                  {/* Front Face */}
                                  <path d="M85 65 L155 65 L120 10 Z" fill="#f97316" stroke="#c2410c" strokeWidth="1"/>
                                  {/* Side Face Shading */}
                                  <path d="M155 65 L120 10 L125 10 L160 65 Z" fill="#c2410c" opacity="0.3"/>
                                  {/* Text */}
                                  <text x="120" y="45" fontSize="10" fill="white" fontWeight="900" textAnchor="middle" style={{textShadow: "0px 2px 4px rgba(0,0,0,0.5)"}}>GRAND</text>
                                  <text x="120" y="58" fontSize="9" fill="#fed7aa" fontWeight="600" textAnchor="middle">FINAL GOAL</text>
                              </motion.g>
                          </svg>
                      </div>
                  </div>

                  {/* STEP 2: MODE OF EXAMS (Animated Cards) */}
                  <div className="grid grid-cols-2 gap-4 h-28">
                      {/* Offline Card */}
                      <motion.div 
                        initial={{x:-20, opacity:0}} animate={{x:0, opacity:1}} transition={{delay:0.8}}
                        className="bg-white rounded-2xl shadow-md border-l-4 border-slate-500 p-3 flex flex-col items-center justify-center gap-2 group hover:scale-105 transition-transform"
                      >
                          <div className="p-2 bg-slate-100 rounded-full">
                             <FileText size={24} className="text-slate-600"/>
                          </div>
                          <div className="text-center">
                             <span className="block text-xs font-black text-slate-700 uppercase">Offline</span>
                             <span className="text-[10px] font-bold text-slate-500">OMR Based</span>
                          </div>
                      </motion.div>

                      {/* Online Card */}
                      <motion.div 
                        initial={{x:20, opacity:0}} animate={{x:0, opacity:1}} transition={{delay:0.9}}
                        className="bg-white rounded-2xl shadow-md border-l-4 border-blue-500 p-3 flex flex-col items-center justify-center gap-2 group hover:scale-105 transition-transform"
                      >
                          <div className="p-2 bg-blue-50 rounded-full">
                             <Tablet size={24} className="text-blue-600"/>
                          </div>
                          <div className="text-center">
                             <span className="block text-xs font-black text-blue-700 uppercase">Online</span>
                             <span className="text-[10px] font-bold text-blue-500">Tab Exams</span>
                          </div>
                      </motion.div>
                  </div>

              </div>

              {/* --- RIGHT COLUMN: QUESTION TYPES --- */}
              <div className="w-[55%] bg-white rounded-3xl shadow-xl border border-slate-100 p-6 relative overflow-hidden flex flex-col">
                  {/* STEP 3: QUESTION TYPES */}
                  <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-100">
                      <div className="bg-orange-100 p-2 rounded-lg">
                        <LayoutGrid size={24} className="text-orange-600"/> 
                      </div>
                      <div>
                          <h5 className="font-black text-slate-800 text-lg uppercase leading-none mb-1">Question Types</h5>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Comprehensive Coverage for JEE/NEET</p>
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 flex-grow content-center">
                      {[
                        { icon: <CheckCircle size={20}/>, label: "Single Correct", sub: "MCQ", c:"text-blue-600 bg-blue-50 border-blue-200" },
                        { icon: <Layers size={20}/>, label: "Multi Correct", sub: "MCQ", c:"text-indigo-600 bg-indigo-50 border-indigo-200" },
                        { icon: <BinaryIcon />, label: "Numerical", sub: "Value Type", c:"text-teal-600 bg-teal-50 border-teal-200" },
                        { icon: <Search size={20}/>, label: "Assertion", sub: "& Reasoning", c:"text-orange-600 bg-orange-50 border-orange-200" },
                        { icon: <FileText size={20}/>, label: "Passage", sub: "Comprehension", c:"text-purple-600 bg-purple-50 border-purple-200" },
                        { icon: <LayoutGrid size={20}/>, label: "Matrix", sub: "Matching", c:"text-rose-600 bg-rose-50 border-rose-200" },
                      ].map((q, i) => (
                        <motion.div 
                          key={i}
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 1 + (i * 0.1), type: "spring" }}
                          whileHover={{ scale: 1.05 }}
                          className={`p-3 rounded-xl border-2 ${q.c} flex items-center gap-3 shadow-sm cursor-default`}
                        >
                          <div className={`p-2 rounded-full bg-white shadow-sm`}>{q.icon}</div>
                          <div>
                              <span className="block text-xs font-black uppercase leading-tight">{q.label}</span>
                              <span className="text-[10px] font-semibold opacity-70">{q.sub}</span>
                          </div>
                        </motion.div>
                      ))}
                  </div>
              </div>

           </div>
        </div>
      )
    },
    {
      id: 4,
      title: "Analytics & Support",
      desc: "Feedback & Community",
      color: "bg-teal-500",
      content: (
        <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden font-sans">
           {/* Background Decorations */}
           <div className="absolute top-[-20px] left-[-20px] w-64 h-64 bg-teal-100 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
           <div className="absolute bottom-[-20px] right-[-20px] w-64 h-64 bg-blue-100 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

           {/* Header */}
           <div className="text-center pt-4 pb-2 z-10">
              <h4 className="font-black text-2xl text-slate-800 uppercase tracking-tight">
                 Analytics & Holistic Support
              </h4>
              <div className="h-1 w-24 bg-teal-500 mx-auto rounded-full mt-1 mb-1"></div>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Feedback & Community Ecosystem</p>
           </div>

           <div className="flex-grow px-6 pb-6 flex gap-4 relative z-10">
              
              {/* --- LEFT SIDE: RA DASHBOARD & REPORTS (Dominant 65%) --- */}
              <div className="w-[65%] flex items-center bg-white rounded-3xl shadow-xl border border-slate-100 p-2 overflow-hidden relative">
                  
                  {/* DASHBOARD VISUAL (Laptop Screen Style) */}
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}
                    className="w-[55%] h-[90%] bg-slate-900 rounded-xl shadow-2xl border-2 border-slate-700 p-3 flex flex-col relative z-20"
                  >
                      {/* Top Bar */}
                      <div className="w-full h-5 border-b border-slate-700 flex items-center px-1 gap-1 mb-2">
                         <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                         <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                         <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                         <span className="ml-auto text-[15px] font-mono text-teal-400">RA(Results & Analysis)</span>
                      </div>

                      {/* Charts Grid */}
                      <div className="grid grid-cols-2 grid-rows-2 gap-2 flex-grow">
                          
                          {/* 1. Pie Chart */}
                          <div className="bg-slate-800 rounded border border-slate-700 flex flex-col items-center justify-center p-1">
                              <div className="relative w-12 h-12">
                                  <svg viewBox="0 0 32 32" className="w-full h-full transform -rotate-90">
                                      <circle cx="16" cy="16" r="16" fill="#0f172a" />
                                      <motion.circle cx="16" cy="16" r="8" fill="transparent" stroke="#2dd4bf" strokeWidth="16" strokeDasharray="60 100" 
                                        initial={{strokeDasharray: "0 100"}} animate={{strokeDasharray: "60 100"}} transition={{duration: 1.5, delay:0.5}}
                                      />
                                      <motion.circle cx="16" cy="16" r="8" fill="transparent" stroke="#f43f5e" strokeWidth="16" strokeDasharray="30 100" strokeDashoffset="-60"
                                        initial={{strokeDasharray: "0 100"}} animate={{strokeDasharray: "30 100"}} transition={{duration: 1.5, delay: 1}}
                                      />
                                  </svg>
                              </div>
                              <span className="text-[15px] text-slate-400 mt-1">Overview</span>
                          </div>

                          {/* 2. Bar Chart */}
                          <div className="bg-slate-800 rounded border border-slate-700 flex flex-col justify-end px-2 pb-1">
                              <div className="flex justify-between items-end h-full gap-1">
                                  {[40, 80, 60, 95].map((h, i) => (
                                      <motion.div key={i} initial={{height:0}} animate={{height:`${h}%`}} transition={{delay: 1+(i*0.2)}} className="w-2 bg-blue-500 rounded-t-sm"/>
                                  ))}
                              </div>
                              <span className="text-[15px] text-slate-400 text-center mt-1">Stats</span>
                          </div>

                          {/* 3. Line Chart (Span 2) */}
                          <div className="col-span-2 bg-slate-800 rounded border border-slate-700 relative p-1 flex items-end">
                              <svg viewBox="0 0 100 30" className="w-full h-full overflow-visible">
                                  <motion.path 
                                    d="M0 25 L20 15 L40 20 L60 5 L80 10 L100 0" 
                                    fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                    initial={{pathLength: 0}} animate={{pathLength: 1}} transition={{duration: 2, delay: 1.5}}
                                  />
                                  <motion.path 
                                    d="M0 25 L20 15 L40 20 L60 5 L80 10 L100 0 L100 30 L0 30 Z" 
                                    fill="#fbbf24" fillOpacity="0.2" stroke="none"
                                    initial={{opacity: 0}} animate={{opacity: 0.2}} transition={{delay: 2.5}}
                                  />
                              </svg>
                              <span className="absolute top-1 left-2 text-[15px] text-slate-400">Progress Trend</span>
                          </div>
                      </div>
                  </motion.div>

                  {/* CONNECTING TREE LINES (Animated) */}
                  <div className="w-[15%] h-full relative">
                      <svg className="w-full h-full" viewBox="0 0 50 200" preserveAspectRatio="none">
                          {/* Branching Lines */}
                          <motion.path d="M0 100 C 25 100, 25 30, 50 30" fill="none" stroke="#0d9488" strokeWidth="2" strokeDasharray="100" initial={{strokeDashoffset:100}} animate={{strokeDashoffset:0}} transition={{delay:1.5, duration:1}} />
                          <motion.path d="M0 100 C 25 100, 25 75, 50 75" fill="none" stroke="#16a34a" strokeWidth="2" strokeDasharray="100" initial={{strokeDashoffset:100}} animate={{strokeDashoffset:0}} transition={{delay:1.7, duration:1}} />
                          <motion.path d="M0 100 C 25 100, 25 125, 50 125" fill="none" stroke="#ea580c" strokeWidth="2" strokeDasharray="100" initial={{strokeDashoffset:100}} animate={{strokeDashoffset:0}} transition={{delay:1.9, duration:1}} />
                          <motion.path d="M0 100 C 25 100, 25 170, 50 170" fill="none" stroke="#2563eb" strokeWidth="2" strokeDasharray="100" initial={{strokeDashoffset:100}} animate={{strokeDashoffset:0}} transition={{delay:2.1, duration:1}} />
                          {/* Center Node */}
                          <circle cx="0" cy="100" r="3" fill="#64748b" />
                      </svg>
                  </div>

                  {/* REPORT CARDS LIST */}
                  <div className="w-[30%] flex flex-col justify-around py-4 h-full">
                      {[
                        {l: "School Report", i: <School size={16}/>, c: "text-teal-700 bg-teal-50 border-teal-200"},
                        {l: "Class Report", i: <Users size={16}/>, c: "text-green-700 bg-green-50 border-green-200"},
                        {l: "Student Report", i: <Users size={16}/>, c: "text-orange-700 bg-orange-50 border-orange-200"},
                        {l: "Teacher Report", i: <FileText size={16}/>, c: "text-blue-700 bg-blue-50 border-blue-200"}
                      ].map((item, idx) => (
                          <motion.div 
                            key={idx}
                            initial={{x: 20, opacity: 0}} animate={{x: 0, opacity: 1}} transition={{delay: 2 + (idx * 0.2)}}
                            className={`flex items-center gap-2 p-2 rounded-lg border-l-4 shadow-sm ${item.c} bg-white`}
                          >
                              <div className="bg-white/50 p-1 rounded-full">{item.i}</div>
                              <span className="text-[12px] font-bold uppercase leading-tight">{item.l}</span>
                          </motion.div>
                      ))}
                  </div>

                  {/* Caption */}
                  
              </div>

              {/* --- RIGHT SIDE: SEMINAR & SUITABILITY (Compact 35%) --- */}
              <div className="w-[35%] flex flex-col gap-4">
                  
                  {/* STEP 2: PARENT SEMINAR */}
                  <motion.div 
                    initial={{y:20, opacity:0}} animate={{y:0, opacity:1}} transition={{delay: 0.5}}
                    className="h-1/2 bg-white rounded-2xl shadow-lg border-b-4 border-yellow-400 p-4 flex flex-col items-center justify-center relative overflow-hidden group hover:shadow-xl transition-all"
                  >
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-300 to-orange-400"></div>
                      
                      {/* New Presentation Icon */}
                      <div className="bg-yellow-100 p-3 rounded-full mb-2 shadow-sm group-hover:scale-110 transition-transform">
                          <Users size={32} className="text-yellow-600" />
                      </div>
                      
                      <h5 className="font-black text-slate-800 text-xs uppercase">Parent Seminar</h5>
                      <p className="text-[8px] text-slate-500 font-bold mt-1">Guidance & Interaction</p>
                  </motion.div>

                  {/* STEP 3: SUITABLE FOR ALL */}
                  <motion.div 
                     initial={{y:20, opacity:0}} animate={{y:0, opacity:1}} transition={{delay: 0.8}}
                     className="h-1/2 bg-white rounded-2xl shadow-lg border-b-4 border-blue-400 p-4 flex flex-col items-center justify-center relative overflow-hidden group hover:shadow-xl transition-all"
                  >
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-cyan-400"></div>
                      
                      {/* New Graduation Cap Icon Cluster */}
                      <div className="relative mb-3 group-hover:scale-110 transition-transform">
                          <div className="bg-blue-100 p-3 rounded-full shadow-sm relative z-10">
                             <GraduationCap size={32} className="text-blue-600" />
                          </div>
                          {/* Decorative small icons behind */}
                          <Users size={20} className="text-cyan-400 absolute -top-1 -left-3 opacity-50" />
                          <Users size={20} className="text-indigo-400 absolute -bottom-1 -right-3 opacity-50" />
                      </div>

                      <h5 className="font-black text-slate-800 text-[15px] uppercase text-center leading-tight">Suitable for All<br/><span className="text-blue-600">Kinds of Students</span></h5>
                  </motion.div>

              </div>

           </div>
        </div>
      )
    },
  ];

  const mobileSummaries = [
    [
      "Foundation and targets align NCERT and SCERT learning with competitive exam goals.",
      "Students use conceptual synopsis, class worksheets, and home worksheets for stronger fundamentals.",
      "The program connects classroom learning to JEE Advanced, JEE Main, NEET, EAPCET, and Olympiads.",
    ],
    [
      "Pedagogy combines digital teaching, workshops, and cognitive skill development.",
      "DITP supports digital teaching content, teacher login, and lesson delivery.",
      "The model also builds academic, creative, and classroom readiness through guided activities.",
    ],
    [
      "Assessment design includes question types, exam modes, and a structured testing approach.",
      "Students prepare through single correct, multi correct, numerical, assertion reasoning, passage, and matrix formats.",
      "Delivery supports both offline OMR practice and online tab-based testing.",
    ],
    [
      "Analytics and support help schools track outcomes and strengthen the full learning ecosystem.",
      "RA reporting supports school, class, student, and teacher-level analysis.",
      "Parent seminars and inclusive support ensure the program stays usable for all kinds of learners.",
    ],
  ];

  return (
    <div className="mx-auto h-[78vh] max-h-[42rem] w-full max-w-8xl overflow-hidden rounded-xl border border-slate-200 bg-white font-sans shadow-2xl">
      <div className="flex h-full flex-col lg:hidden">
        <div className="border-b border-slate-200 bg-white p-4">
          <h2 className="text-base font-black leading-none tracking-tight text-slate-800">FUTURE <span className="text-blue-600">FOUNDATION</span></h2>
          <p className="mt-2 text-xs font-medium text-slate-500">{sections[activeStep].desc}</p>
          <div className="mt-4 flex w-fit items-center gap-2 rounded-lg bg-slate-100 p-1">
            <button 
              onClick={() => setIsAutoPlay(false)}
              className={`p-1.5 rounded-md transition-all ${!isAutoPlay ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}
            >
              <Pause size={12} fill={!isAutoPlay ? "currentColor" : "none"}/>
            </button>
            <button 
              onClick={() => setIsAutoPlay(true)}
              className={`p-1.5 rounded-md transition-all ${isAutoPlay ? 'bg-blue-600 shadow text-white' : 'text-slate-400'}`}
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
                  activeStep === index ? 'border-blue-200 bg-white text-slate-800 shadow-sm' : 'border-transparent bg-white/60 text-slate-500'
                }`}
              >
                <span className="block text-[10px] font-bold uppercase tracking-wider text-blue-600">Step 0{index + 1}</span>
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
                <div key={item} className="flex gap-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-3">
                  <div className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-blue-500" />
                  <p className="text-sm leading-6 text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="hidden h-full lg:flex">
        <div className="w-1/4 bg-slate-50 border-r border-slate-200 flex flex-col z-20">
          <div className="p-5 border-b border-slate-200 bg-white shadow-sm z-10">
            <h2 className="font-black text-lg text-slate-800 leading-none tracking-tight">FUTURE<br/><span className="text-blue-600">FOUNDATION</span></h2>
            <div className="mt-4 flex items-center gap-2 bg-slate-100 p-1 rounded-lg w-fit">
              <button 
                onClick={() => setIsAutoPlay(false)}
                className={`p-1.5 rounded-md transition-all ${!isAutoPlay ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Pause size={12} fill={!isAutoPlay ? "currentColor" : "none"}/>
              </button>
              <button 
                onClick={() => setIsAutoPlay(true)}
                className={`p-1.5 rounded-md transition-all ${isAutoPlay ? 'bg-blue-600 shadow text-white' : 'text-slate-400 hover:text-slate-600'}`}
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
                className={`relative flex-1 px-5 py-2 flex flex-col justify-center text-left transition-all duration-300 outline-none ${activeStep === index ? 'bg-white' : 'hover:bg-slate-100'}`}
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
                  <span className={`text-[9px] font-bold uppercase tracking-wider mb-0.5 block ${activeStep === index ? 'text-slate-500' : 'text-slate-300'}`}>Step 0{index + 1}</span>
                  <h3 className={`font-bold text-sm leading-tight ${activeStep === index ? 'text-slate-800' : 'text-slate-400'}`}>{section.title}</h3>
                  <p className={`text-[10px] mt-1 ${activeStep === index ? 'text-slate-500' : 'text-slate-300'}`}>{section.desc}</p>
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

export default AutoPresentation;
