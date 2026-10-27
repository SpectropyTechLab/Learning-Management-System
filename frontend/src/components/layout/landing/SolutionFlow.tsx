import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- 1. CUSTOM GRAPHICS COMPONENTS ---

const GraphicArchitecture = () => (
    <div className="w-full h-full flex flex-col items-center justify-center p-2">
        <div className="flex flex-col md:flex-row items-center gap-4 w-full justify-center">
            {/* Curriculum */}
            <div className="text-center flex-1 min-w-[80px]">
                <div className="w-10 h-10 md:w-14 md:h-14 bg-blue-50 rounded-full flex items-center justify-center text-xl md:text-2xl mb-2 mx-auto border border-blue-100 shadow-sm">📚</div>
                <h4 className="font-bold text-blue-900 text-[9px] md:text-[10px] mb-1">IIT Foundation</h4>
                <p className="text-[7px] md:text-[9px] text-slate-500 leading-tight">Math, Physics, Chem, Bio</p>
            </div>

            {/* Divider */}
            <div className="w-full h-px md:w-px md:h-12 bg-blue-200/50"></div>

            {/* Olympiad */}
            <div className="text-center flex-1 min-w-[80px]">
                <div className="w-10 h-10 md:w-14 md:h-14 bg-yellow-50 rounded-full flex items-center justify-center text-xl md:text-2xl mb-2 mx-auto border border-yellow-100 shadow-sm">🏆</div>
                <h4 className="font-bold text-blue-900 text-[9px] md:text-[10px] mb-1">Olympiad</h4>
                <p className="text-[7px] md:text-[9px] text-slate-500 leading-tight">NSO, IMO, NTSE</p>
            </div>
        </div>
    </div>
);

const GraphicSkills = () => (
    <div className="w-full h-full flex flex-col items-center justify-center">
        <div className="w-10 h-10 text-2xl mb-2 animate-pulse">🧠</div>
        <div className="flex items-center justify-center gap-1 w-full">
            <div className="bg-green-50 border border-green-400 rounded-lg p-1.5 text-[8px] font-bold text-green-800 text-center w-16 md:w-20 shadow-sm">
                Problem<br />Solving
            </div>
            <div className="text-green-400 text-lg font-bold">→</div>
            <div className="bg-green-50 border border-green-400 rounded-lg p-1.5 text-[8px] font-bold text-green-800 text-center w-16 md:w-20 shadow-sm">
                Critical<br />Thinking
            </div>
            <div className="text-green-400 text-lg font-bold">→</div>
            <div className="bg-green-50 border border-green-400 rounded-lg p-1.5 text-[8px] font-bold text-green-800 text-center w-16 md:w-20 shadow-sm">
                Analytical<br />Reasoning
            </div>
        </div>
    </div>
);

const GraphicTools = () => (
    <div className="w-full h-full flex items-center justify-center">
        <div className="grid grid-cols-4 gap-2 w-full px-1">
            {[
                { icon: "📱", label: "Micro Learning" },
                { icon: "💻", label: "Digital Content" },
                { icon: "📝", label: "Tab Exams" },
                { icon: "📊", label: "Analytics" }
            ].map((item, i) => (
                <div key={i} className="flex flex-col items-center text-center">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center text-lg mb-1 shadow-sm border border-purple-100">
                        {item.icon}
                    </div>
                    <p className="text-[6px] md:text-[8px] font-bold text-slate-600 leading-tight">{item.label}</p>
                </div>
            ))}
        </div>
    </div>
);

const GraphicSupport = () => (
    <div className="w-full h-full flex flex-col items-center justify-center">
        <div className="flex justify-between items-center w-full px-1">
            {[
                { icon: "👪", label: "Seminars" },
                { icon: "👨‍🏫", label: "Training" },
                { icon: "🧠", label: "Enrichment" },
                { icon: "📋", label: "Auditions" }
            ].map((item, i, arr) => (
                <React.Fragment key={i}>
                    <div className="flex flex-col items-center z-10">
                        <div className="w-8 h-8 md:w-12 md:h-12 border-2 border-orange-400 rounded-full flex items-center justify-center bg-white shadow-sm text-sm md:text-xl mb-1">
                            {item.icon}
                        </div>
                        <p className="text-[6px] md:text-[8px] font-bold text-slate-800 text-center leading-tight max-w-[50px]">
                            {item.label}
                        </p>
                    </div>
                    {i < arr.length - 1 && (
                        <div className="flex-1 h-0.5 bg-orange-200 mx-1 -mt-4 relative">
                            <div className="absolute right-0 -top-1.5 text-orange-400 text-[8px] hidden md:block">➜</div>
                        </div>
                    )}
                </React.Fragment>
            ))}
        </div>
    </div>
);

// --- MAIN COMPONENT ---

type StepId = 1 | 2 | 3 | 4;

interface SolutionContent {
    title: string;
    subtitle?: string;
    desc: string;
    graphic: React.ReactNode;
    bg: string;
    text: string;
    accent: string;
}

const SolutionFlow: React.FC<{ activeModal: string | null; onClose?: () => void }> = ({ activeModal, onClose }) => {
    // STATE
    const [showModal, setShowModal] = useState(false);
    const [viewMode, setViewMode] = useState('intro'); // 'intro' | 'split'
    const [activeStep, setActiveStep] = useState<StepId>(1);

    // HELPERS
    const lastScrollTime = useRef(0);
    const touchStartY = useRef(0);

    // SYNC STATE
    useEffect(() => {
        if (activeModal === 'solution') {
            setShowModal(true);
            setViewMode('intro');
            setActiveStep(1);
        } else {
            setShowModal(false);
        }
    }, [activeModal]);

    const handleInternalClose = () => {
        setShowModal(false);
        if (onClose) onClose();
    };

    // AUTO-TRANSITION
    useEffect(() => {
        if (viewMode !== 'intro' || !showModal) return;
        const timer = setTimeout(() => setViewMode('split'), 4500);
        return () => clearTimeout(timer);
    }, [viewMode, showModal]);

    // HANDLERS
    const handleNext = () => setActiveStep((prev) => Math.min(prev + 1, 4) as StepId);
    const handlePrev = () => setActiveStep((prev) => Math.max(prev - 1, 1) as StepId);

    // INPUT LISTENERS
    useEffect(() => {
        if (viewMode !== 'split' || !showModal) return;

        const handleWheel = (e: WheelEvent) => {
            if (Date.now() - lastScrollTime.current < 600) return;
            if (e.deltaY > 30) {
                handleNext();
                lastScrollTime.current = Date.now();
            } else if (e.deltaY < -30) {
                handlePrev();
                lastScrollTime.current = Date.now();
            }
        };

        const handleTouchStart = (e: TouchEvent) => {
            touchStartY.current = e.touches[0].clientY;
        };

        const handleTouchEnd = (e: TouchEvent) => {
            const diff = touchStartY.current - e.changedTouches[0].clientY;
            if (Math.abs(diff) > 50) {
                if (diff > 0) {
                    handleNext();
                } else {
                    handlePrev();
                }
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowRight':
                case 'PageDown':
                case 'ArrowDown':
                    e.preventDefault();
                    handleNext();
                    break;
                case 'ArrowLeft':
                case 'PageUp':
                case 'ArrowUp':
                    e.preventDefault();
                    handlePrev();
                    break;
                case 'Escape':
                    handleInternalClose();
                    break;
            }
        };

        window.addEventListener('wheel', handleWheel, { passive: false });
        window.addEventListener('touchstart', handleTouchStart);
        window.addEventListener('touchend', handleTouchEnd);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('wheel', handleWheel);
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchend', handleTouchEnd);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [viewMode, showModal, activeStep]);

    // DATA
    const contentData: Record<StepId, SolutionContent> = {
        1: {
            title: "ACADEMIC ARCHITECTURE",
            desc: "Comprehensive IIT Foundation Curriculum (Grades 6-10) covering Math, Physics, Chemistry, Biology alongside dedicated Olympiad Training.",
            graphic: <GraphicArchitecture />,
            bg: "bg-blue-50", text: "text-blue-700", accent: "border-blue-600"
        },
        2: {
            title: "SKILL ECOSYSTEM",
            desc: "A structured approach to cognitive growth, moving students from basic Problem Solving to Critical Thinking and advanced Analytical Reasoning.",
            graphic: <GraphicSkills />,
            bg: "bg-green-50", text: "text-green-700", accent: "border-green-600"
        },
        3: {
            title: "TECH LAYER",
            subtitle: "ADVANCED TOOLS",
            desc: "Integrating Micro-Learning strategies, rich Digital Content, Tab-based Exams, and deep Analytics for real-time performance tracking.",
            graphic: <GraphicTools />,
            bg: "bg-purple-50", text: "text-purple-700", accent: "border-purple-600"
        },
        4: {
            title: "SCHOOL SUPPORT",
            desc: "A 360-degree partnership including Parent Seminars, Teacher Training Workshops, Subject Enrichment, and Student Academic Auditions.",
            graphic: <GraphicSupport />,
            bg: "bg-orange-50", text: "text-orange-700", accent: "border-orange-600"
        }
    };

    // SNAKE PATH
    const steps = [
        { id: 1 as StepId, title: "ACADEMIC ARCHITECTURE", color: "bg-blue-600", x: 100, y: 100 },
        { id: 2 as StepId, title: "SKILL ECOSYSTEM", color: "bg-green-600", x: 400, y: 260 },
        { id: 3 as StepId, title: "TECH LAYER", color: "bg-purple-600", x: 100, y: 430 },
        { id: 4 as StepId, title: "SCHOOL SUPPORT", color: "bg-orange-600", x: 400, y: 600 },
    ];
    const tension = 100;

    return (
        <AnimatePresence>
            {showModal && (
                <motion.div
                    className="inset-0 z-50 flex items-center justify-center p-6 h-full w-full "
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                >

                    {/* MAIN CONTAINER: 80% WIDTH */}
                    <motion.div
                        className="relative w-full h-full max-w-6xl max-h-[800px] bg-white rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row z-10"
                        initial={{ scale: 0.95, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 20 }}
                        transition={{ duration: 0.4 }}
                    >
                        {/* === LEFT PANEL: 30% WIDTH === */}
                        <motion.div
                            layout
                            className="relative border-r border-slate-100 bg-slate-50/80 flex flex-col items-center overflow-hidden shrink-0"
                            animate={{
                                width: window.innerWidth < 768 ? "100%" : (viewMode === 'split' ? "37%" : "100%"),
                                height: window.innerWidth < 768 && viewMode === 'split' ? "100%" : "100%"
                            }}
                            transition={{ duration: 0.4, ease: "easeInOut" }}
                        >
                            {viewMode === 'intro' && (
                                <button
                                    onClick={() => setViewMode('split')}
                                    className="absolute top-4 right-4 z-50 text-[10px] font-bold text-slate-400 hover:text-slate-700 uppercase tracking-widest border border-slate-200 px-3 py-1.5 rounded-full bg-white hover:bg-slate-50 transition-colors"
                                >
                                    Skip Intro
                                </button>
                            )}

                            <div className="w-full pt-4 pb-2 px-4 text-center z-20 shrink-0">
                                <h2 className="text-lg md:text-xl font-black text-slate-900 leading-none uppercase tracking-tight">
                                    THE SPECTROPY <span className="text-blue-600">SOLUTION</span>
                                </h2>
                                <p className="text-slate-500 text-[9px] md:text-[10px] mt-1 font-medium tracking-wide">
                                    Seamless Integration. Measurable Results.
                                </p>
                            </div>

                            <div className="flex-1 w-full flex items-center justify-center relative min-h-0 p-2">
                                {/* FIXED: Added max-w-[400px] to constrain width */}
                                <div className="relative w-full max-w-[400px] h-auto aspect-[500/700] max-h-full mx-auto">

                                    {/* FIXED: Removed preserveAspectRatio="none" and added w-full */}
                                    <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none" viewBox="0 0 500 700">
                                        <defs>
                                            <linearGradient id="solutionGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                                <stop offset="0%" stopColor="#2563eb" />
                                                <stop offset="33%" stopColor="#16a34a" />
                                                <stop offset="66%" stopColor="#9333ea" />
                                                <stop offset="100%" stopColor="#ea580c" />
                                            </linearGradient>
                                        </defs>

                                        {/* Background Path */}
                                        <path
                                            d={`M ${steps[0].x} ${steps[0].y} 
                                            C ${steps[0].x} ${steps[0].y + tension}, ${steps[1].x} ${steps[1].y - tension}, ${steps[1].x} ${steps[1].y}
                                            C ${steps[1].x} ${steps[1].y + tension}, ${steps[2].x} ${steps[2].y - tension}, ${steps[2].x} ${steps[2].y}
                                            C ${steps[2].x} ${steps[2].y + tension}, ${steps[3].x} ${steps[3].y - tension}, ${steps[3].x} ${steps[3].y}`}
                                            fill="none" stroke="#e2e8f0" strokeWidth="6" strokeLinecap="round" strokeDasharray="12 12"
                                        />

                                        {/* Animated Path */}
                                        <motion.path
                                            d={`M ${steps[0].x} ${steps[0].y} 
                                            C ${steps[0].x} ${steps[0].y + tension}, ${steps[1].x} ${steps[1].y - tension}, ${steps[1].x} ${steps[1].y}
                                            C ${steps[1].x} ${steps[1].y + tension}, ${steps[2].x} ${steps[2].y - tension}, ${steps[2].x} ${steps[2].y}
                                            C ${steps[2].x} ${steps[2].y + tension}, ${steps[3].x} ${steps[3].y - tension}, ${steps[3].x} ${steps[3].y}`}
                                            fill="none" stroke="url(#solutionGradient)" strokeWidth="6" strokeLinecap="round"
                                            initial={{ pathLength: 0 }}
                                            animate={{
                                                pathLength: viewMode === 'intro' ? 1 : (activeStep - 1) / 3
                                            }}
                                            transition={{ duration: 1.5, ease: "easeInOut" }}
                                        />
                                    </svg>

                                    {/* Nodes */}
                                    {steps.map((step, index) => {
                                        const isActive = activeStep === step.id && viewMode === 'split';
                                        const isIntro = viewMode === 'intro';
                                        const theme = contentData[step.id];
                                        const leftPos = `${(step.x / 500) * 100}%`;
                                        const topPos = `${(step.y / 700) * 100}%`;
                                        const isRightEdge = step.x > 350;

                                        return (
                                            <div key={step.id} className="absolute w-0 h-0 z-20" style={{ left: leftPos, top: topPos }}>
                                                <div className="group cursor-pointer" onClick={() => viewMode === 'split' && setActiveStep(step.id)}>
                                                    <motion.div
                                                        className={`absolute -translate-x-1/2 -translate-y-1/2 w-81 h-8 md:w-12 md:h-12 rounded-full ${step.color} shadow-lg shadow-slate-300/50 border-2 md:border-4 ${isActive ? `border-slate-800` : 'border-white'} flex items-center justify-center transition-all duration-300 ${(!isActive && !isIntro) ? 'opacity-80 hover:opacity-100' : 'opacity-100'}`}
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: isActive ? 1.2 : 1 }}
                                                        transition={{ delay: index * 0.6, type: "spring", stiffness: 200 }}
                                                    >
                                                        <span className="text-white font-bold text-xs md:text-sm">{step.id}</span>
                                                        {isActive && (
                                                            <motion.div layoutId="solutionRing" className={`absolute -inset-2 md:-inset-3 rounded-full border-[3px] ${theme.accent} border-dashed animate-spin-slow opacity-60`} />
                                                        )}
                                                    </motion.div>

                                                    <motion.div
                                                        className={`absolute top-1/2 -translate-y-1/2 w-24 md:w-32 px-2 py-1.5 rounded-lg shadow-sm border transition-all duration-300 pointer-events-none md:pointer-events-auto
                                                            ${isRightEdge ? 'right-6 md:right-9 text-right origin-right' : 'left-6 md:left-9 text-left origin-left'}
                                                            ${isActive ? `${theme.bg} ${theme.text} ${theme.accent} opacity-100 scale-100 z-30` : 'bg-white/70 text-slate-400 border-slate-100 opacity-0 lg:opacity-80 scale-95 z-10 grayscale hover:grayscale-0 hover:scale-100 hover:opacity-100 hover:bg-white hover:text-slate-600 hover:shadow-md'}`}
                                                        initial={{ scale: 0.8, opacity: 0 }}
                                                        animate={{ scale: isActive ? 1.05 : 0.95, opacity: (window.innerWidth < 768 && !isActive) ? 0 : 1 }}
                                                        transition={{ delay: (index * 0.6) + 0.3 }}
                                                    >
                                                        <span className="text-[7px] md:text-[9px] font-extrabold uppercase tracking-wider block leading-tight">{step.title}</span>
                                                    </motion.div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>

                        {/* === RIGHT PANEL: 70% WIDTH (flex-1) === */}
                        <motion.div
                            layout
                            className="flex-1 bg-white relative p-6 md:p-12 flex flex-col items-center justify-center overflow-y-auto md:overflow-hidden"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: viewMode === 'split' ? 1 : 0 }}
                            transition={{ delay: 0.2, duration: 0.4 }}
                        >
                            <AnimatePresence mode='wait'>
                                {viewMode === 'split' && (
                                    <motion.div
                                        key={activeStep}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.3, ease: "easeOut" }}
                                        className="w-full max-w-2xl text-center flex flex-col h-full md:h-auto justify-center"
                                    >
                                        <div className={`mb-4 md:mb-6 p-4 md:p-6 rounded-3xl ${contentData[activeStep].bg} border-2 ${contentData[activeStep].accent} shadow-sm flex justify-center items-center relative overflow-hidden h-36 md:h-52 shrink-0`}>
                                            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-current to-transparent" style={{ color: contentData[activeStep].text.replace('text-', '') }}></div>
                                            <div className="relative z-10 w-full flex justify-center h-full">
                                                {contentData[activeStep].graphic}
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-center gap-1 md:gap-2 mb-2 md:mb-4">
                                            <span className={`px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest border ${contentData[activeStep].bg} ${contentData[activeStep].text} ${contentData[activeStep].accent}`}>
                                                Step 0{activeStep}
                                            </span>
                                            <h3 className="text-xl md:text-3xl font-black text-slate-800 leading-none uppercase tracking-tight mt-1">
                                                {contentData[activeStep].title}
                                            </h3>
                                            {contentData[activeStep].subtitle && (
                                                <h4 className={`text-xs md:text-sm font-bold ${contentData[activeStep].text} opacity-80 uppercase tracking-widest`}>
                                                    {contentData[activeStep].subtitle}
                                                </h4>
                                            )}
                                        </div>

                                        <p className="text-slate-600 leading-relaxed text-xs md:text-base font-medium mx-auto max-w-lg px-2 md:px-0">
                                            {contentData[activeStep].desc}
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {viewMode === 'split' && (
                                <div className="absolute bottom-4 right-4 md:bottom-8 md:right-8 flex gap-3 z-40">
                                    <button onClick={handlePrev} disabled={activeStep === 1} className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-slate-600 bg-white shadow-sm">
                                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" /></svg>
                                    </button>
                                    <button onClick={handleNext} disabled={activeStep === 4} className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-slate-600 bg-white shadow-sm">
                                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
                                    </button>
                                </div>
                            )}
                        </motion.div>

                        <style>{`
                            .animate-spin-slow { animation: spin 12s linear infinite; }
                            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                        `}</style>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SolutionFlow;