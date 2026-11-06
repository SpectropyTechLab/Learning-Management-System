import { createElement, useCallback, useEffect, useRef, useState } from 'react';
import { EyeOff, Pause, Play, RotateCcw, SlidersHorizontal } from 'lucide-react';

interface Model3DViewerProps {
  src: string;
  alt: string;
  className?: string;
}

type ModelViewerElement = HTMLElement & {
  animationName: string;
  availableAnimations: string[];
  currentTime: number;
  timeScale: number;
  pause: () => void;
  play: (options?: { repetitions?: number }) => void;
};

export default function Model3DViewer({ src, alt, className = '' }: Model3DViewerProps) {
  const [ready, setReady] = useState(false);
  const [animations, setAnimations] = useState<string[]>([]);
  const [selectedAnimation, setSelectedAnimation] = useState('');
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [compact, setCompact] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const viewerRef = useRef<ModelViewerElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    void import('@google/model-viewer').then(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setAnimations([]);
    setSelectedAnimation('');
    setPlaying(false);
  }, [src]);

  const playAnimation = useCallback((restart = false) => {
    const viewer = viewerRef.current;
    if (!viewer || !selectedAnimation) return;
    viewer.animationName = selectedAnimation;
    viewer.timeScale = speed;
    if (restart) viewer.currentTime = 0;
    viewer.play({ repetitions: Infinity });
    setPlaying(true);
  }, [selectedAnimation, speed]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !selectedAnimation) return;
    viewer.animationName = selectedAnimation;
    viewer.timeScale = speed;
    viewer.currentTime = 0;
    viewer.play({ repetitions: Infinity });
    setPlaying(true);
  }, [selectedAnimation, speed]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!ready || !viewer) return;
    const synchronizeAnimations = () => {
      const available = [...(viewer.availableAnimations || [])];
      setAnimations(available);
      setSelectedAnimation((current) => available.includes(current) ? current : available[0] || '');
      setPlaying(available.length > 0);
    };
    viewer.addEventListener('load', synchronizeAnimations);
    // A cached GLB can finish loading before the React effect attaches.
    if (viewer.availableAnimations?.length) synchronizeAnimations();
    return () => viewer.removeEventListener('load', synchronizeAnimations);
  }, [ready, src]);

  useEffect(() => {
    const container = containerRef.current;
    if (!ready || !container) return;
    let previousCompact: boolean | null = null;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const nextCompact = width < 520 || height < 340;
      setCompact(nextCompact);
      if (previousCompact === null || previousCompact !== nextCompact) {
        setControlsVisible(!nextCompact);
        previousCompact = nextCompact;
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [ready]);

  const togglePlayback = () => {
    const viewer = viewerRef.current;
    if (!viewer || !selectedAnimation) return;
    if (playing) {
      viewer.pause();
      setPlaying(false);
      return;
    }
    playAnimation();
  };

  if (!ready) {
    return <div className={`grid place-items-center bg-slate-100 text-sm text-slate-600 ${className}`}>Loading 3D viewer…</div>;
  }

  const controlSize = compact ? 'h-8 w-8' : 'h-9 w-9';

  return <div ref={containerRef} className={`relative min-h-0 overflow-hidden bg-slate-50 ${className}`}>
    {createElement('model-viewer', {
      ref: (element: ModelViewerElement | null) => { viewerRef.current = element; },
      src,
      alt,
      style: { width: '100%', height: '100%', background: '#f8fafc' },
      'camera-controls': true,
      'auto-rotate': true,
      'shadow-intensity': '1',
      'interaction-prompt': 'auto',
      ar: true,
      loading: 'eager',
    })}
    {animations.length > 0 && !controlsVisible && <button type="button" onClick={() => setControlsVisible(true)} title="Show animation controls" aria-label="Show animation controls" className="absolute bottom-2 right-2 grid h-9 w-9 place-items-center rounded-full border border-white/50 bg-slate-950/80 text-white shadow-lg backdrop-blur">
      <SlidersHorizontal size={17} />
    </button>}
    {animations.length > 0 && controlsVisible && <div className={`absolute bottom-2 flex items-center border border-white/60 bg-slate-950/80 text-white shadow-lg backdrop-blur ${compact ? 'inset-x-1 gap-1 rounded-lg p-1' : 'left-1/2 max-w-[calc(100%-1rem)] -translate-x-1/2 gap-2 rounded-xl p-2'}`}>
      <label className="min-w-0 flex-1">
        <span className="sr-only">Animation</span>
        <select value={selectedAnimation} onChange={(event) => setSelectedAnimation(event.target.value)} className={`${compact ? 'h-8 max-w-full px-1 text-xs' : 'h-9 max-w-48 px-2 text-sm'} w-full rounded-lg border border-white/20 bg-slate-900 font-semibold text-white outline-none`}>
          {animations.map((animation) => <option key={animation} value={animation}>{animation}</option>)}
        </select>
      </label>
      <button type="button" onClick={togglePlayback} title={playing ? 'Pause animation' : 'Play animation'} aria-label={playing ? 'Pause animation' : 'Play animation'} className={`grid ${controlSize} shrink-0 place-items-center rounded-lg bg-white text-slate-900`}>
        {playing ? <Pause size={compact ? 14 : 16} /> : <Play size={compact ? 14 : 16} />}
      </button>
      <button type="button" onClick={() => playAnimation(true)} title="Replay animation" aria-label="Replay animation" className={`grid ${controlSize} shrink-0 place-items-center rounded-lg border border-white/30 text-white`}>
        <RotateCcw size={compact ? 14 : 16} />
      </button>
      <label className={`flex shrink-0 items-center gap-1 rounded-lg border border-white/20 text-xs font-semibold ${compact ? 'h-8 px-1' : 'h-9 px-2'}`}>
        {!compact && 'Speed'}
        <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))} className="bg-transparent text-white outline-none">
          {[0.5, 1, 1.5, 2].map((value) => <option key={value} value={value} className="bg-slate-900">{value}×</option>)}
        </select>
      </label>
      <button type="button" onClick={() => setControlsVisible(false)} title="Hide animation controls" aria-label="Hide animation controls" className={`grid ${controlSize} shrink-0 place-items-center rounded-lg border border-white/30 text-white`}>
        <EyeOff size={compact ? 14 : 16} />
      </button>
    </div>}
  </div>;
}
