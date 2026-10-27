import React from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, Brain, ClipboardCheck, BarChart3, 
  Settings, Layers, ChevronRight, PenTool,
  CheckCircle, Search, Monitor, FileText
} from 'lucide-react';

const FutureFoundationEcosystem = () => {
  
  // Configuration based on the uploaded image
  const pillars = [
    {
      id: "foundation",
      title: "FOUNDATION",
      subtitle: "NCERT/SCERT Aligned + Synopsis",
      icon: <BookOpen className="w-10 h-10" />,
      color: "bg-blue-500",
      lightColor: "bg-blue-50",
      borderColor: "border-blue-200",
      textColor: "text-blue-600",
      position: "top-left", // Logic for desktop layout
      details: ["Conceptual Synopsis", "Board Aligned Content"]
    },
    {
      id: "pedagogy",
      title: "PEDAGOGY",
      subtitle: "Bloom's Taxonomy (Remember to Create)",
      icon: <Brain className="w-10 h-10" />,
      color: "bg-green-500",
      lightColor: "bg-green-50",
      borderColor: "border-green-200",
      textColor: "text-green-600",
      position: "top-right",
      details: ["Cognitive Growth", "Skill Ladder"]
    },
    {
      id: "assessment",
      title: "ASSESSMENT",
      subtitle: "Offline OMR + Online Tab",
      icon: <ClipboardCheck className="w-10 h-10" />,
      color: "bg-orange-500",
      lightColor: "bg-orange-50",
      borderColor: "border-orange-200",
      textColor: "text-orange-600",
      position: "bottom-left",
      details: ["High-Performance Arch.", "Hybrid Testing"]
    },
    {
      id: "analytics",
      title: "ANALYTICS",
      subtitle: "RA Dashboard (AI-Driven)",
      icon: <BarChart3 className="w-10 h-10" />,
      color: "bg-purple-500",
      lightColor: "bg-purple-50",
      borderColor: "border-purple-200",
      textColor: "text-purple-600",
      position: "bottom-right",
      details: ["AI Diagnostics", "Personalized Path"]
    }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto py-16 px-4 relative">
       
       <div className="text-center mb-1">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-1">
            Our Solution – The <span className="text-blue-600">Future Foundation</span> Ecosystem
          </h2>
          <p className="text-lg text-slate-600">A Comprehensive Ecosystem, Not Just a Class</p>
       </div>

       {/* --- DESKTOP ANIMATED LAYOUT --- */}
       <div className="relative h-[540px] hidden lg:block">
          
          {/* CENTRAL CORE (The Engine) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-58 h-58 flex items-center justify-center">
              {/* Spinning Gears Background */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-4 border-dashed border-slate-300 rounded-full"
              />
              <motion.div 
                animate={{ rotate: -360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute inset-4 border-2 border-slate-200 rounded-full"
              />
              
              {/* Core Content */}
              <div className="w-42 h-42 bg-white rounded-full shadow-[0_0_40px_rgba(37,99,235,0.2)] border-4 border-blue-100 flex flex-col items-center justify-center text-center p-2 relative z-30">
                  <Settings className="w-10 h-10 text-slate-400 mb-1 animate-spin-slow" />
                  <span className="text-[15px] font-black text-slate-800 uppercase leading-tight">Comprehensive<br/>Blueprint<br/>Ecosystem</span>
              </div>
          </div>

          {/* CONNECTING PIPES (SVG) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              {/* Top Left Pipe */}
              <motion.path 
                d="M 500 300 L 250 150" 
                stroke="url(#gradBlue)" strokeWidth="4" fill="none"
                strokeDasharray="10 10"
                animate={{ strokeDashoffset: [0, -20] }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              {/* Top Right Pipe */}
              <motion.path 
                d="M 680 300 L 930 150" 
                stroke="url(#gradGreen)" strokeWidth="4" fill="none"
                strokeDasharray="10 10"
                animate={{ strokeDashoffset: [0, 20] }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              {/* Bottom Left Pipe */}
              <motion.path 
                d="M 500 300 L 250 450" 
                stroke="url(#gradOrange)" strokeWidth="4" fill="none"
                strokeDasharray="10 10"
                animate={{ strokeDashoffset: [0, 20] }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              {/* Bottom Right Pipe */}
              <motion.path 
                d="M 680 300 L 930 450" 
                stroke="url(#gradPurple)" strokeWidth="4" fill="none"
                strokeDasharray="10 10"
                animate={{ strokeDashoffset: [0, -20] }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              
              <defs>
                <linearGradient id="gradBlue" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#93c5fd" />
                </linearGradient>
                <linearGradient id="gradGreen" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#86efac" />
                </linearGradient>
                <linearGradient id="gradOrange" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#fdba74" />
                </linearGradient>
                <linearGradient id="gradPurple" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#d8b4fe" />
                </linearGradient>
              </defs>
          </svg>

          {/* PILLAR CARDS */}
          {pillars.map((pillar) => {
             // Positioning logic
             const posClass = 
               pillar.position === 'top-left' ? 'top-10 left-[10%]' :
               pillar.position === 'top-right' ? 'top-10 right-[10%]' :
               pillar.position === 'bottom-left' ? 'bottom-10 left-[10%]' :
               'bottom-10 right-[10%]';

             return (
               <motion.div 
                 key={pillar.id}
                 whileHover={{ scale: 1.05, y: -5 }}
                 className={`absolute ${posClass} w-82 bg-white rounded-2xl shadow-xl border-t-4 ${pillar.color} p-5 z-10 cursor-pointer group`}
               >
                  <div className={`w-15 h-12 ${pillar.lightColor} ${pillar.textColor} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                     {pillar.icon}
                  </div>
                  <h3 className={`text-lg font-black ${pillar.textColor} mb-1 uppercase`}>{pillar.title}</h3>
                  <p className="text-xs font-bold text-slate-500 mb-3">{pillar.subtitle}</p>
                  
                  {/* Expanded details */}
                  <div className="space-y-1">
                     {pillar.details.map((d, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-50 p-1.5 rounded">
                           <div className={`w-1.5 h-1.5 rounded-full ${pillar.color}`}></div>
                           {d}
                        </div>
                     ))}
                  </div>

                  {/* 3D Effect Base */}
                  <div className={`absolute bottom-0 left-0 w-full h-2 ${pillar.color} opacity-20 rounded-b-2xl transform translate-y-1`}></div>
               </motion.div>
             );
          })}
       </div>

       {/* --- MOBILE STACKED LAYOUT --- */}
       <div className="grid md:grid-cols-2 gap-6 lg:hidden">
          {pillars.map((pillar, idx) => (
             <div key={idx} className={`bg-white rounded-xl shadow-lg border-l-4 ${pillar.color} p-6`}>
                 <div className="flex items-center gap-4 mb-4">
                     <div className={`p-3 rounded-full ${pillar.lightColor} ${pillar.textColor}`}>
                        {pillar.icon}
                     </div>
                     <div>
                        <h3 className={`font-bold ${pillar.textColor}`}>{pillar.title}</h3>
                        <p className="text-xs text-slate-500">{pillar.subtitle}</p>
                     </div>
                 </div>
                 <div className="space-y-2">
                     {pillar.details.map((d, i) => (
                        <div key={i} className="text-sm text-slate-600 flex items-center gap-2">
                           <CheckCircle size={14} className={pillar.textColor}/> {d}
                        </div>
                     ))}
                 </div>
             </div>
          ))}
       </div>

    </div>
  );
};

export default FutureFoundationEcosystem;