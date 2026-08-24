import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import logo from "/spectropy_logo.png";
import EventsPage from './Eventspage';
import FutureFoundationSlider from './FutureFoundationSlider';
import HappyClientsSlider from './HappyClientsSlider';
import ChallengesModal from '../../components/layout/landing/challenges';
import Programfuturefoundation from './FFProgram';
import SolutionFlow from '../../components/layout/landing//SolutionFlow';
import Programcatalyst from './CATProgram';
import Programmaestro from './MAEProgram';
import Programpionner from './PIOProgram';
import Fourpillars from './fourpillars';
import AwardsRewards from './AwardsRewards';

// --- SVGs for Icons ---
const MenuIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
);
const CloseIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
);
const ArrowRightIcon = () => (
    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
);
const PhoneIcon = () => (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
);
const MailIcon = () => (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
);
const WhatsAppIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12.04 2C6.55 2 2.09 6.46 2.09 11.95c0 1.95.57 3.77 1.56 5.31L2 22l4.93-1.6a9.9 9.9 0 0 0 5.11 1.4h.01c5.49 0 9.95-4.46 9.95-9.95S17.53 2 12.04 2zm0 17.92h-.01a7.9 7.9 0 0 1-4.03-1.11l-.29-.17-2.93.95.96-2.85-.19-.3a7.91 7.91 0 0 1-1.21-4.19C4.34 7.6 7.69 4.25 12.04 4.25c4.35 0 7.69 3.35 7.69 7.7 0 4.35-3.34 7.97-7.69 7.97zm4.34-5.8c-.24-.12-1.41-.7-1.63-.78-.22-.08-.38-.12-.55.12-.17.24-.63.78-.77.94-.14.16-.28.18-.52.06-.24-.12-1-.37-1.9-1.18-.7-.62-1.17-1.39-1.31-1.63-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.32-.75-1.8-.2-.48-.41-.41-.55-.42-.14 0-.3-.02-.46-.02-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2 0 1.18.86 2.32.98 2.48.12.16 1.7 2.6 4.12 3.65.58.25 1.03.4 1.38.52.58.18 1.11.15 1.53.09.47-.07 1.41-.58 1.61-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z" />
    </svg>
);
const LocationIcon = () => (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);
// Program Icons
const FutureIcon = () => <svg className="w-12 h-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>;
const CatalystIcon = () => <svg className="w-12 h-12 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
const MaestroIcon = () => <svg className="w-12 h-12 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const PioneerIcon = () => <svg className="w-12 h-12 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>;

type AppLink = {
    href: string;
    label: string;
    description: string;
    variant: 'blue' | 'indigo' | 'teal' | 'emerald' | 'slate';
    type: 'internal' | 'external';
};

const navItems = [
    { label: 'Home', action: 'scroll', target: 'home' },
    { label: 'Courses', action: 'scroll', target: 'courses' },
    { label: 'Why Foundation', action: 'scroll', target: 'why-foundation' },
    { label: 'Happy Clients', action: 'scroll', target: 'happy-clients' },
] as const;

const appLinks: AppLink[] = [
    {
        href: 'https://learning-management-system-jade-one.vercel.app/login',
        label: 'Spectropy OS',
        description: 'Central operating system for Spectropy products and intelligence workflows.',
        variant: 'blue',
        type: 'internal',
    },
    {
        href: 'https://ra-portal-frontend.vercel.app/login',
        label: 'RA Portal',
        description: 'Results and analysis portal for institution-level visibility.',
        variant: 'indigo',
        type: 'external',
    },
    {
        href: 'https://spectropy.m.frappe.cloud/desk',
        label: 'ERP',
        description: 'Enterprise resource planning workspace for operations and administration.',
        variant: 'slate',
        type: 'external',
    },
];

const appCardClasses: Record<AppLink['variant'], string> = {
    blue: 'bg-blue-50 border-blue-100 text-blue-800',
    indigo: 'bg-indigo-50 border-indigo-100 text-indigo-800',
    teal: 'bg-teal-50 border-teal-100 text-teal-800',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-800',
    slate: 'bg-slate-100 border-slate-200 text-slate-800',
};

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [showLoginOptions, setShowLoginOptions] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
            if (showLoginOptions) setShowLoginOptions(false);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [showLoginOptions]);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setIsMobileMenuOpen(false);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
        setIsMobileMenuOpen(false);
        setShowLoginOptions(false);
    };

    const openModal = (modalName: string) => {
        setActiveModal(modalName);
        setIsMobileMenuOpen(false);
        setShowLoginOptions(false);
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    };

    const closeModal = () => {
        setActiveModal(null);
        document.body.style.overflow = 'auto';
    };

    const closeMenus = () => {
        setIsMobileMenuOpen(false);
        setShowLoginOptions(false);
    };

    const handleAppAccess = (app: AppLink) => {
        closeMenus();

        if (app.type === 'internal') {
            navigate(app.href);
            return;
        }

        const openedWindow = window.open(app.href, '_blank', 'noopener,noreferrer');

        if (!openedWindow) {
            toast.error('Pop-up blocked. Please allow pop-ups or open the app link manually.');
            return;
        }

        toast.success(`${app.label} opened in a new tab.`);
    };

    const renderAppLink = (app: AppLink, compact = false) => {
        const className = compact
            ? `block w-full rounded-xl border px-4 py-3 text-left font-semibold transition-all hover:-translate-y-0.5 hover:shadow-md ${appCardClasses[app.variant]}`
            : `block w-full rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${appCardClasses[app.variant]}`;

        const content = (
            <>
                <h3 className={`${compact ? 'text-sm' : 'text-base'} font-bold`}>{app.label}</h3>
                <p className={`${compact ? 'mt-1 text-xs' : 'mt-2 text-xs'} text-slate-600`}>{app.description}</p>
            </>
        );

        return (
            <button
                key={app.label}
                type="button"
                onClick={() => handleAppAccess(app)}
                className={className}
            >
                {content}
            </button>
        );
    };

    // Happy clients slider is rendered directly below the Programs section.
    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 relative">

            {/* --- MODALS (Overlays) --- */}
            {activeModal && (
                <div className="fixed inset-0 z-[60] flex h-full w-full bg-white">
                    <div className="relative h-full w-full overflow-y-auto">
                        {activeModal !== 'events' && (
                            <button
                                onClick={closeModal}
                                className="absolute right-4 top-4 z-10 rounded-full bg-slate-100 p-2 transition-colors hover:bg-slate-200"
                            >
                                <CloseIcon />
                            </button>
                        )}

                        {/*<div className="p-8 md:p-12 h-full overflow-y-auto bg-red-500">*/}
                        {activeModal === 'events' && (
                            <button
                                onClick={closeModal}
                                className="absolute right-4 top-4 z-10 rounded-full bg-slate-100 p-2 transition-colors hover:bg-slate-200"
                            >
                                <CloseIcon />
                            </button>
                        )}

                        {/* Content for Core Challenges Modal */}
                        <div className="container mx-auto flex min-h-full items-center justify-center px-4 py-16 sm:px-6">

                            {/* Content for Core Challenges Modal (FULL SCREEN VERTICAL FLOW) */}
                            <ChallengesModal activeModal={activeModal} />
                            {/* Content for Solutions Modal */}
                            <SolutionFlow activeModal={activeModal} />

                            {/* Content for Programs Modal */}
                            {/* --- 1. FUTURE FOUNDATION MODAL (Detailed View) --- */}
                            {activeModal === 'program-future' && (
                                < Programfuturefoundation/>
                            )}

                            {/* --- 2. CATALYST PROGRAM MODAL (Detailed View) --- */}
                            {activeModal === 'program-catalyst' && (
                                < Programcatalyst />
                            )}

                            {/* --- 3. MAESTRO PROGRAM MODAL (Detailed View) --- */}
                            {activeModal === 'program-maestro' && (
                              <Programmaestro/>
                            )}
                            {/* --- 4. PIONEER PROGRAM MODAL (Detailed View) --- */}
                            {activeModal === 'program-pioneer' && (
                                < Programpionner/>
                            )}

                            {/* Content for Blog Modal */}

                            {activeModal === 'events' && (
                                <EventsPage />
                            )}

                            {activeModal === 'Awards/Rewards' && (
                                <AwardsRewards />
                            )}

                        </div>
                        {/*</div>*/}
                    </div>
                </div>
            )}

            {/* --- HEADER --- */}
            <header
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white shadow-md py-2' : 'bg-transparent py-4'
                    }`}
            >
                <div className="container mx-auto flex items-center justify-between gap-3 px-4 md:px-6">
                    {/* Logo */}
                    <div className="flex items-center cursor-pointer" onClick={() => scrollToSection('home')}>
                        {/* USER REQUEST 1: Logo Placeholder */}
                        <img
                            src={logo}
                            alt="Spectropy Logo"
                            className="h-10 md:h-12 w-auto object-contain"
                        />
                    </div>

                    {/* Desktop Nav */}
                    <nav className="hidden items-center space-x-5 lg:flex xl:space-x-7">
                        {navItems.map((item) => (
                            <button
                                key={item.label}
                                onClick={() => scrollToSection(item.target)}
                                className="text-sm font-semibold text-slate-600 hover:text-blue-700 transition-colors"
                            >
                                {item.label}
                            </button>
                        ))}
                        <button
                            onClick={() => openModal('Awards/Rewards')}
                            className="text-sm font-semibold text-slate-600 hover:text-blue-700 transition-colors"
                        >
                            Awards/Rewards
                        </button>

                        <button
                            onClick={() => setActiveModal('events')}
                            className="text-sm font-semibold text-slate-600 hover:text-blue-700 transition-colors"
                        >
                            Client Services
                        </button>

                        {/* USER REQUEST 6: Contact Button */}
                        <button
                            onClick={() => scrollToSection('contact-footer')}
                            className="text-sm font-semibold text-slate-600 hover:text-blue-700 transition-colors"
                        >
                            Contact
                        </button>

                        {/* USER REQUEST 7: Login with Web Apps Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowLoginOptions(!showLoginOptions)}
                                className="flex items-center rounded-full bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md"
                            >
                                Login
                                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>

                            {showLoginOptions && (
                                <div className="animate-fade-in absolute right-0 top-full z-50 mt-3 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-blue-100 bg-white p-4 shadow-2xl">
                                    <div className="mb-3 px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Quick Access
                                    </div>
                                    <div className="grid max-h-[60vh] gap-3 overflow-y-auto pr-1">
                                        {appLinks.map((app) => renderAppLink(app))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </nav>

                    {/* Mobile Menu Toggle */}
                    <button
                        className="rounded-full p-2 text-slate-700 transition-colors hover:bg-white/70 lg:hidden"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                    >
                        {isMobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
                    </button>
                </div>

                {/* Mobile Nav Dropdown */}
                {isMobileMenuOpen && (
                    <div className="absolute left-0 top-full w-full border-t border-slate-100 bg-white shadow-xl lg:hidden">
                        <div className="mx-auto flex max-h-[calc(100vh-5rem)] w-full max-w-7xl flex-col gap-4 overflow-y-auto px-4 py-4">
                        {navItems.map((item) => (
                            <button
                                key={item.label}
                                onClick={() => scrollToSection(item.target)}
                                className="border-b border-slate-100 py-2 text-left font-medium text-slate-700"
                            >
                                {item.label}
                            </button>
                        ))}
                        <button
                            onClick={() => openModal('Awards/Rewards')}
                            className="border-b border-slate-100 py-2 text-left font-medium text-slate-700"
                        >
                            Awards/Rewards
                        </button>
                        <button
                            onClick={() => openModal('events')}
                            className="border-b border-slate-100 py-2 text-left font-medium text-slate-700"
                        >
                            Client Services
                        </button>
                        <button
                            onClick={() => scrollToSection('contact-footer')}
                            className="border-b border-slate-100 py-2 text-left font-medium text-slate-700"
                        >
                            Contact
                        </button>
                        <div className="rounded-2xl bg-slate-50 p-4">
                            <span className="text-xs font-bold uppercase text-slate-400">Quick Access</span>
                            <div className="mt-3 grid gap-3">
                                {appLinks.map((app) => renderAppLink(app, true))}
                            </div>
                        </div>
                        </div>
                    </div>
                )}
            </header>

            {/* --- SCROLL 1: HERO + PURPOSE --- */}
            <section id="home" className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 pb-12 pt-24 sm:pt-28">
                <div className="pointer-events-none absolute right-0 top-0 h-full w-2/3 translate-x-1/4 transform bg-white opacity-40 skew-x-12"></div>

                {/* --- PART 1: HERO TEXT & BRIDGE VISUAL --- */}
                <div className="container relative z-10 mx-auto mb-12 grid items-center gap-10 px-4 sm:px-6 lg:min-h-[80vh] lg:grid-cols-2 lg:gap-12">

                    {/* Text Content */}
                    <div className="space-y-5 text-center lg:text-left">
                        <h1 className="text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl md:text-6xl">
                            Building the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Foundation</span> of the Future
                        </h1>
                        <div className="inline-block px-4 py-1.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-full uppercase tracking-wider mb-2">
                            The Purpose
                        </div>
                        <p className="mx-auto max-w-lg text-base leading-relaxed text-slate-600 sm:text-lg md:text-xl lg:mx-0">
                            Strengthen academic foundation in formative years. We bridge the critical gap between classroom learning and competitive successful.
                        </p>

                        <div className="flex flex-col justify-center gap-3 pt-2 sm:flex-row lg:justify-start">
                            <button
                                onClick={() => scrollToSection('courses')}
                                className="flex items-center justify-center rounded-xl bg-blue-900 px-6 py-4 text-base font-bold text-white shadow-lg transition-all hover:-translate-y-1 hover:bg-blue-800 hover:shadow-xl sm:px-8 sm:text-lg"
                            >
                                Explore Courses <ArrowRightIcon />
                            </button>
                            <button
                                onClick={() => scrollToSection('why-foundation')}
                                className="flex items-center justify-center rounded-xl border-2 border-slate-200 bg-white px-6 py-4 text-base font-bold text-slate-700 transition-all hover:border-blue-300 sm:px-8 sm:text-lg"
                            >
                                Why Foundation Matters
                            </button>
                        </div>
                    </div>

                    {/* Visual Column: Bridge + Vision */}
                    <div className="relative flex flex-col items-center">

                        {/* 1. The Bridge Concept */}
                        <div className="relative mb-6 w-full max-w-xl">
                            <div className="relative z-10 flex min-h-[360px] flex-col justify-between rounded-3xl border border-slate-100 bg-white p-4 shadow-2xl transition-transform hover:scale-[1.02] sm:min-h-[420px] sm:p-6 md:p-8">

                                <div className="text-center mb-3">
                                    <h3 className="inline-block px-3 py-1.5 bg-blue-100 text-blue-900 text-xl font-bold rounded-full uppercase tracking-wider mb-1">The Problem (The Gap)</h3>
                                </div>

                                {/* The Visual Bridge */}
                                <div className="relative flex flex-grow items-center justify-between px-1">
                                    {/* Left Pillar */}
                                    <div className="flex flex-col items-center z-10">
                                        <div className="flex h-20 w-14 items-center justify-center rounded-t-lg border-x-2 border-t-2 border-slate-300 bg-slate-200 sm:h-24 sm:w-16">
                                            <span className="text-4xl">🏫</span>
                                        </div>
                                        <span className="mt-2 text-center text-xs font-bold text-slate-600 sm:text-sm">Classroom </span>
                                    </div>

                                    {/* The Bridge & Gap */}
                                    <div className="-mt-4 mx-2 flex h-full flex-grow flex-col justify-end pb-8 sm:-mt-6">
                                        <div className="absolute bottom-8 left-0 w-5/12 h-2 bg-red-400 rounded-l-full transform -rotate-6 origin-left"></div>
                                        <div className="absolute bottom-8 right-0 w-5/12 h-2 bg-red-400 rounded-r-full transform rotate-6 origin-right"></div>

                                        {/* Gap Text */}
                                        <div className="absolute top-1/4 left-0 right-0 text-center">
                                            <span className="text-l text-red-500 font-bold bg-red-50 px-2 py-1 rounded">Deep Conceptual Gaps </span>
                                            <div className="text-2xl animate-bounce mt-1">⚡</div>
                                        </div>

                                        {/* Spectropy Solution Overlay */}
                                        <div className="absolute bottom-12 left-0 right-0 flex justify-center">
                                            <div className="z-20 rounded-full bg-blue-600 px-3 py-1 text-[11px] text-white shadow-lg sm:text-xs">
                                                Bridging the Gap
                                            </div>
                                        </div>
                                        <div className="absolute bottom-8 left-0 w-full h-2 bg-blue-500/30 rounded-full"></div>
                                    </div>

                                    {/* Right Pillar */}
                                    <div className="flex flex-col items-center z-10">
                                        <div className="flex h-20 w-14 items-center justify-center rounded-t-lg border-x-2 border-t-2 border-blue-200 bg-blue-100 sm:h-24 sm:w-16">
                                            <span className="text-4xl">🏆</span>
                                        </div>
                                        <span className="mt-2 text-center text-xs font-bold leading-tight text-slate-600 sm:text-sm">Competitive<br />Exams </span>
                                    </div>
                                </div>

                                <div className="mt-0 text-center pt-0">
                                    <p className="text-slate-500 text-xs md:text-sm">Weak fundamentals lead to exponential struggle in higher classes.</p>
                                </div>
                            </div>
                        </div>

                        {/* 2. The Vision Block (Added Below Problem Block) */}
                        <div className="flex w-full max-w-xl flex-col gap-4 rounded-2xl border border-indigo-100 bg-white p-4 shadow-lg transition-transform hover:scale-[1.02] sm:flex-row sm:items-center">
                            {/* Simple Image Placeholder */}
                            <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-4xl md:h-24 md:w-24">
                                🚀
                            </div>
                            {/* Vision Text */}
                            <div className="flex-grow">
                                <h4 className="text-indigo-900 font-extrabold text-sm md:text-base uppercase mb-1">The Vision: Future-Ready STEM Campus</h4>
                                <p className="text-slate-600 text-xs md:text-sm font-medium leading-snug">
                                    A movement for India's next generation.<br />
                                    <span className="text-indigo-600 font-bold">Every child learns with confidence .</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- PART 2: CHALLENGES & SOLUTION BLOCKS --- */}
                <div className="container relative z-10 mx-auto px-4 sm:px-6">
                    <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 md:gap-8 lg:gap-12">

                        {/* Core Challenges Block */}
                        <div className="bg-red-50 rounded-3xl p-8 md:p-10 border border-red-100 relative overflow-hidden group hover:shadow-xl transition-all">
                            <div className="absolute top-0 right-0 bg-red-200 text-red-800 text-xs font-bold px-3 py-1 rounded-bl-xl">THE PROBLEM</div>
                            <div className="mb-6">
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-3xl shadow-sm mb-4">⚠️</div>
                                <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">Core Challenges in Today's Learning </h3>
                                <p className="text-slate-700 mb-6">
                                    Curriculum is theoretical, conceptual gaps increase over time, and schools often lack diagnostic Tracking.
                                </p>
                                <button
                                    onClick={() => openModal('challenges')}
                                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center"
                                >
                                    More Info <ArrowRightIcon />
                                </button>
                            </div>
                            {/* Decorative BG element */}
                            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-red-200 rounded-full opacity-50 mix-blend-multiply filter blur-xl"></div>
                        </div>

                        {/* Spectropy Solution Block */}
                        <div className="bg-blue-50 rounded-3xl p-8 md:p-10 border border-blue-100 relative overflow-hidden group hover:shadow-xl transition-all">
                            <div className="absolute top-0 right-0 bg-blue-200 text-blue-800 text-xs font-bold px-3 py-1 rounded-bl-xl">THE SOLUTION</div>
                            <div className="mb-6">
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-3xl shadow-sm mb-4">💡</div>
                                <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">Spectropy IIT Foundation & STEM Solution</h3>
                                <p className="text-slate-700 mb-6">
                                    A comprehensive model with Structured Curriculum, AI Diagnostics, and Skill Development Ecosystem.
                                </p>
                                <button
                                    onClick={() => openModal('solution')}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center"
                                >
                                    More Info <ArrowRightIcon />
                                </button>
                            </div>
                            {/* Decorative BG element */}
                            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-200 rounded-full opacity-50 mix-blend-multiply filter blur-xl"></div>
                        </div>

                    </div>
                </div>
            </section>

            {/* --- SCROLL 2: CHALLENGES & SOLUTIONS (USER REQUEST 3 & 4) --- */}
            <section id="why-foundation" className="py-1 bg-white">               
                    
                    < Fourpillars />
                
            </section>

            <FutureFoundationSlider />

            {/* --- SCROLL 3: PROGRAMS + TRUST + CTA (USER REQUEST 5) --- */}
            <section id="courses" className="relative bg-slate-900 py-20 text-white sm:py-24">
                <div className="container mx-auto px-4 sm:px-6">
                    <div className="mb-12 text-center md:mb-16 md:text-left">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Programs Designed for Excellence</h2>
                        <p className="text-slate-400 max-w-2xl">Tailored academic architectures for every student's potential.</p>
                    </div>

                    <div className="mb-16 grid gap-6 md:grid-cols-2 lg:mb-20 lg:grid-cols-4">

                        {/* USER REQUEST 5: Future Foundation Program (New) */}
                        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 hover:border-blue-500 transition-all flex flex-col">
                            <div className="mb-4"><FutureIcon /></div>
                            <h3 className="text-xl font-bold mb-2">Future Foundation</h3>
                            <p className="text-blue-300 font-medium mb-4 text-xs">Academic Core & Goals </p>
                            <p className="text-slate-400 text-sm mb-6 flex-grow">Comprehensive blueprint bridging school curriculum with competitive excellence.</p>
                            <button onClick={() => openModal('program-future')} className="text-blue-400 text-sm font-bold hover:text-white flex items-center self-start">
                                More Info <ArrowRightIcon />
                            </button>
                        </div>

                        {/* Catalyst Program */}
                        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 hover:border-teal-500 transition-all flex flex-col">
                            <div className="mb-4"><CatalystIcon /></div>
                            <h3 className="text-xl font-bold mb-2">Catalyst Program</h3>
                            <p className="text-teal-300 font-medium mb-4 text-xs">Bridge to Competitive </p>
                            <p className="text-slate-400 text-sm mb-6 flex-grow">80% Foundation + 20% Advanced.Targeting NEET, EAPCET, Olympiads.</p>
                            <button onClick={() => openModal('program-catalyst')} className="text-teal-400 text-sm font-bold hover:text-white flex items-center self-start">
                                More Info <ArrowRightIcon />
                            </button>
                        </div>

                        {/* Maestro Program */}
                        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 hover:border-purple-500 transition-all transform md:-translate-y-4 shadow-2xl flex flex-col z-10">
                            <div className="mb-4"><MaestroIcon /></div>
                            <h3 className="text-xl font-bold mb-2">Maestro Program</h3>
                            <p className="text-purple-300 font-medium mb-4 text-xs">Holistic Excellence </p>
                            <p className="text-slate-400 text-sm mb-6 flex-grow">Vertical Expansion & Advanced Curriculum for JEE Main & Advanced.</p>
                            <button onClick={() => openModal('program-maestro')} className="text-purple-400 text-sm font-bold hover:text-white flex items-center self-start">
                                More Info <ArrowRightIcon />
                            </button>
                        </div>

                        {/* Pioneer Program */}
                        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 hover:border-orange-500 transition-all flex flex-col">
                            <div className="mb-4"><PioneerIcon /></div>
                            <h3 className="text-xl font-bold mb-2">Pioneer Program</h3>
                            <p className="text-orange-300 font-medium mb-4 text-xs">Elite Academic Program </p>
                            <p className="text-slate-400 text-sm mb-6 flex-grow">Level 5 Mastery (Rank Decider) questions for top tier successful.</p>
                            <button onClick={() => openModal('program-pioneer')} className="text-orange-400 text-sm font-bold hover:text-white flex items-center self-start">
                                More Info <ArrowRightIcon />
                            </button>
                        </div>
                    </div>

                    {/* Happy Clients Slider - keep inside the Programs section */}
                    <div id="happy-clients" className="mb-16 lg:mb-20">
                        <HappyClientsSlider />
                    </div>

                    {/* --- COMBINED CONTACT SECTION */}
                    <div id="contact-footer" className="py-12 sm:py-16 lg:py-20">

                        <div className="container mx-auto mb-10 px-4">
                            <p className="text-center text-slate-400 text-xs font-extrabold uppercase tracking-[0.2em] mb-6">
                                Trusted by Forward-Thinking Campuses
                            </p>
                            <div className="flex flex-wrap justify-center gap-8 opacity-50 grayscale transition-all duration-500 hover:grayscale-0 md:gap-8">
                                {/* Visual Placeholders for Logos - Replace with <img /> if needed */}
                                <h3 className="text-xl md:text-2xl font-serif font-bold text-slate-300 hover:text-slate-500 transition-colors cursor-default">CITY SCHOOL</h3>
                                <h3 className="text-xl md:text-2xl font-mono font-bold text-slate-300 hover:text-slate-500 transition-colors cursor-default">GLOBAL ACADEMY</h3>
                                <h3 className="text-xl md:text-2xl font-sans font-black italic text-slate-300 hover:text-slate-500 transition-colors cursor-default">STEM HIGH</h3>
                                <h3 className="text-xl md:text-2xl font-serif font-bold text-slate-300 hover:text-slate-500 transition-colors cursor-default">FUTURE FOUNDATION</h3>
                            </div>
                        </div>

                        {/* Main CTA & Contact Block */}
                        <div className="container mx-auto px-0">
                            <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 p-5 shadow-2xl sm:rounded-[2.5rem] sm:p-6">

                                {/* Abstract Background Decor */}
                                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
                                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl"></div>

                                <div className="relative z-10 flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center lg:gap-10">

                                    {/* LEFT: Heading & Actions */}
                                    <div className="space-y-5 text-center lg:w-1/2 lg:text-left">
                                        <h2 className="text-3xl font-extrabold leading-tight text-white md:text-5xl">
                                            Ready to Build a <br />
                                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400">Future-Ready School?</span>
                                        </h2>
                                        <p className="mx-auto max-w-md text-base leading-relaxed text-blue-200 sm:text-lg lg:mx-0">
                                            Join the partner network transforming academic ecosystems. Let's discuss your school's vision today.
                                        </p>
                                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
                                        </div>
                                    </div>

                                    {/* RIGHT: Contact Details Card */}
                                    <div className="w-full rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur-md sm:p-6 md:p-8 lg:w-5/12">
                                        <div className="space-y-3">

                                            {/* Address */}
                                            <div className="group flex items-start space-x-4">
                                                <div className="flex-shrink-0 w-12 h-12 bg-blue-600/20 rounded-full flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                    <LocationIcon />
                                                </div>
                                                <div>
                                                    <h4 className="text-white font-bold text-sm uppercase tracking-wide mb-1 opacity-80">Headquarters</h4>
                                                    <p className="break-words text-sm leading-relaxed text-blue-100">
                                                        G94H+MJP, Beside Guru Global School, <br />Hyderabad, Telangana 500085
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Divider */}
                                            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

                                            {/* Phones */}
                                            <div className="group flex items-start space-x-4">
                                                <div className="flex-shrink-0 w-12 h-12 bg-green-600/20 rounded-full flex items-center justify-center text-green-400 group-hover:bg-green-600 group-hover:text-white transition-all">
                                                    <PhoneIcon />
                                                </div>
                                                <div>
                                                    <h4 className="text-white font-bold text-sm uppercase tracking-wide mb-1 opacity-80">Call Us</h4>
                                                    <p className="text-blue-100 text-sm font-mono tracking-wide">
                                                        +91 90143 41237
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Divider */}
                                            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

                                            {/* WhatsApp */}
                                            <a
                                                href="https://wa.me/919014341237"
                                                target="_blank"
                                                rel="noreferrer"
                                                className="group flex items-start space-x-4"
                                                aria-label="Chat on WhatsApp with +91 90143 41237"
                                            >
                                                <div className="flex-shrink-0 w-12 h-12 bg-emerald-600/20 rounded-full flex items-center justify-center text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                                    <WhatsAppIcon />
                                                </div>
                                                <div>
                                                    <h4 className="text-white font-bold text-sm uppercase tracking-wide mb-1 opacity-80">WhatsApp</h4>
                                                    <p className="text-blue-100 text-sm font-mono tracking-wide">Chat with +91 90143 41237</p>
                                                </div>
                                            </a>

                                            {/* Divider */}
                                            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

                                            {/* Email */}
                                            <div className="group flex items-start space-x-4">
                                                <div className="flex-shrink-0 w-12 h-12 bg-purple-600/20 rounded-full flex items-center justify-center text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-all">
                                                    <MailIcon />
                                                </div>
                                                <div>
                                                    <h4 className="text-white font-bold text-sm uppercase tracking-wide mb-1 opacity-80">Email</h4>
                                                    <p className="text-blue-100 text-sm">contact@spectropy.com</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

        </div>
    );
};

export default LandingPage;
