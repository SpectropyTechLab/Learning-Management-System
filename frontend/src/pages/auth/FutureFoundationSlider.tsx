import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import bridge from "/bridge.png";
import pedagogy from "/pedagogy.png";
import ladder from "/ladder.png";
import ecosystem from "/ecosystem.png";
import blueprint from "/blueprint.png";
import students from "/students.png";

// --- IMAGE MAPPING ---
// In your project, import these images or use the correct paths
const images = {
  bridge: bridge,    // Future Foundation Bridge
  pedagogy: pedagogy,  // Rote vs Conceptual
  ladder: ladder,    // Steps to Mastery
  ecosystem: ecosystem, // 4-Pillar Ecosystem (Assessment focus)
  blueprint: blueprint, // Analytics/Blueprint
  students: students   // Future Ready Students
};

// --- SLIDE DATA ---
const slides = [
  {
    id: 1,
    badge: "The Vision",
    title: "Bridging the Gap",
    headline: "Building Thinkers, Not Just Test Takers",
    description: "We bridge the critical divide between standard school curriculum and competitive readiness (JEE/NEET). Our integrated model ensures students excel in board exams while building a rock-solid foundation for the future.",
    color: "from-blue-600 to-indigo-700",
    image: images.bridge,
    citation: ""
  },
  {
    id: 2,
    badge: "Integrated Pedagogy",
    title: "The Deep Learning Spiral",
    headline: "Unifying Science & Math for True Mastery",
    description: "We go beyond linear textbooks. As illustrated by our 'Deep Learning Spiral', we integrate the logic of Mathematics with the wonders of Science connecting DNA, atoms, and equations to transform static reading into dynamic, high-level understanding.",
    color: "from-teal-500 to-emerald-600",
    image: images.pedagogy,
    citation: ""
  },
  {
    id: 3,
    badge: "Skills Architecture",
    title: "Constructing Mastery",
    headline: "From Foundation to Lift-Off",
    description: "Visualized as a grand construction project, we guide students up the cognitive staircase. Starting with the bedrock of 'Remembering', we build through the mechanics of 'Application' and 'Analysis', culminating in the ultimate goal: 'Creation' where students launch their own ideas like rockets.",
    color: "from-purple-600 to-violet-700",
    image: images.ladder, // Maps to image_bd9544.png
    citation: ""
  },
  {
    id: 4,
    badge: "Integrated Ecosystem",
    title: "The Assessment Core",
    headline: "High-Performance Testing Architecture",
    description: "Part of our 4-Pillar Blueprint, the Assessment engine connects seamlessly with Pedagogy and Analytics. Offering both Offline OMR and Online Tab exams, it provides the robust conditioning students need for competitive success.",
    color: "from-orange-500 to-red-500",
    image: images.ecosystem, // Maps to image_bbb106.png
    citation: ""
  },
  {
    id: 5,
    badge: "Analytics Engine",
    title: "Mission Control",
    headline: "AI-Driven Results & Analysis",
    description: "Functioning as 'Mission Control' for academics, our RA Dashboard offers four tiers of reporting: School, Class, Teacher, and Student. It acts as an 'MRI for Education'—going beyond simple scores (thermometers) to reveal deep 'conceptual fractures' and provide a measurable path to healing.",
    color: "from-blue-800 to-slate-900",
    image: images.blueprint, // Maps to image_bd988d.png
    citation: ""
  },
  {
    id: 6,
    badge: "The Ultimate Goal",
    title: "Future-Ready Students",
    headline: "Confident, Digital-First & Globally Competitive",
    description: "As visualized, our students walk a path of 'Integrated Intelligence'—where academic rigor meets digital fluency. They emerge not just as test-takers, but as confident leaders equipped with the scientific temper needed for IITs, AIIMS, and the challenges of tomorrow.",
    color: "from-indigo-600 to-purple-600",
    image: images.students, // Maps to image_bd98d0.png
    citation: ""
  }
];

const FutureFoundationSlider = () => {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const length = slides.length;
  const delay = 5000; // 6 seconds per slide for better reading

  const resetTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  useEffect(() => {
    if (isPaused) return;
    resetTimeout();
    timeoutRef.current = setTimeout(() => {
      setCurrent((prev) => (prev === length - 1 ? 0 : prev + 1));
    }, delay);
    return () => resetTimeout();
  }, [current, isPaused, length]);

  const nextSlide = () => setCurrent(current === length - 1 ? 0 : current + 1);
  const prevSlide = () => setCurrent(current === 0 ? length - 1 : current - 1);

  return (
    <section 
      className="w-full bg-slate-50 py-8 px-4 md:px-4 overflow-hidden font-sans"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="max-w-7xl mx-auto">
        
        {/* Section Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-5 tracking-tight">
            The Future Foundation Vision
          </h2>
          <p className="text-l text-slate-500 max-w-2xl mx-auto font-medium">
            Redefining academic excellence through a scientifically designed, integrated ecosystem.
          </p>
        </div>

        {/* Slider Container */}
        <div className="relative w-full h-[600px] md:h-[400px] bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 group">
          
          {/* Slides */}
          <div className="w-full h-full relative">
            <AnimatePresence mode="wait">
                <motion.div
                    key={current}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 flex flex-col md:flex-row h-full"
                >
                    {/* Text Content (Left on Desktop) */}
                    <div className="w-full md:w-[45%] p-8 md:p-12 flex flex-col justify-center bg-white order-2 md:order-1 h-1/2 md:h-full relative z-20">
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="inline-block self-start px-4 py-1 mb-4 text-xs font-bold tracking-wider uppercase rounded-full bg-slate-100 text-slate-700 border border-slate-200"
                      >
                        {slides[current].badge}
                      </motion.div>
                      
                      <motion.h3 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-2xl md:text-4xl font-black text-slate-900 mb-4 leading-tight"
                      >
                        {slides[current].headline}
                      </motion.h3>
                      
                      <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-slate-600 text-sm md:text-base leading-relaxed mb-6 font-medium"
                      >
                        {slides[current].description}
                      </motion.p>
                      
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mt-auto md:mt-0 uppercase tracking-widest">
                        <span className="w-8 h-0.5 bg-slate-300"></span>
                        <span>{slides[current].title}</span>
                      </div>
                    </div>

                    {/* Visual Content (Right on Desktop) */}
                    <div className={`w-full md:w-[55%] h-1/2 md:h-full relative overflow-hidden order-1 md:order-2 bg-linear-to-br ${slides[current].color} flex items-center justify-center p-6`}>
                      
                      {/* Abstract Background Blurs */}
                      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
                      <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>

                      {/* THE IMAGE */}
                      <motion.div 
                        className="relative z-10 w-full max-w-md h-auto rounded-xl shadow-2xl overflow-hidden border-4 border-white/20"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.02 }}
                        transition={{ duration: 0.5 }}
                      >
                         <motion.img 
                            src={slides[current].image} 
                            alt={slides[current].title}
                            className="w-full h-full object-cover"
                            // Gentle floating animation to keep it alive
                            animate={{ y: [-5, 5, -5] }}
                            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                         />
                      </motion.div>
                    </div>

                </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-[25%] md:top-1/2 transform -translate-y-1/2 z-30 w-12 h-12 bg-white/80 hover:bg-white text-slate-900 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 backdrop-blur-sm border border-slate-100"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <button
            onClick={nextSlide}
            className="absolute right-4 top-[25%] md:top-1/2 transform -translate-y-1/2 z-30 w-12 h-12 bg-white/80 hover:bg-white text-slate-900 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 backdrop-blur-sm border border-slate-100"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Dots Indicator */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30 flex space-x-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrent(index)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === current ? 'bg-slate-800 w-8' : 'bg-slate-300 w-2 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>

        </div>
      </div>
    </section>
  );
};

export default FutureFoundationSlider;