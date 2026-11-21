import type { ReactNode } from 'react';

export type StudioTopicIconDescriptor = {
  key?: string;
  url?: string;
  alt?: string;
};

export const simulationTopicIconKey = (value: { subject?: string; kind?: string; title?: string; metadata?: Record<string, unknown> }) => {
  const supplied = value.metadata?.icon;
  if (supplied && typeof supplied === 'object' && typeof (supplied as { key?: unknown }).key === 'string') {
    return String((supplied as { key: string }).key);
  }
  const terms = `${value.subject || ''} ${value.kind || ''} ${value.title || ''}`.toLowerCase();
  if (/pendulum/.test(terms)) return 'pendulum';
  if (/spring|shm/.test(terms)) return 'spring';
  if (/projectile|free.fall/.test(terms)) return 'projectile';
  if (/wave|sine/.test(terms)) return 'wave';
  if (/orbit|circular|planet/.test(terms)) return 'orbit';
  if (/ohm|electric|circuit|bulb/.test(terms)) return 'electricity';
  if (/periodic/.test(terms)) return 'periodic';
  if (/atom/.test(terms)) return 'atom';
  if (/molecule/.test(terms)) return 'molecule';
  if (/reaction|chem/.test(terms)) return 'reaction';
  if (/cell/.test(terms)) return 'cell';
  if (/dna|genetic/.test(terms)) return 'dna';
  if (/heart|cardiac/.test(terms)) return 'heart';
  if (/circle|geometry/.test(terms)) return 'geometry';
  if (/quadratic|graph|function|math/.test(terms)) return 'graph';
  return value.subject === 'biology' ? 'cell'
    : value.subject === 'chemistry' ? 'reaction'
      : value.subject === 'mathematics' ? 'graph'
        : 'generic';
};

const common = { fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, strokeWidth: 4 };

const artwork = (key: string): ReactNode => {
  switch (key) {
    case 'pendulum': return <><path {...common} stroke="#795548" d="M10 53V9h29"/><path {...common} stroke="#7e57c2" d="M39 9v27"/><circle cx="39" cy="44" r="10" fill="#ffca28" stroke="#f57f17" strokeWidth="4"/><path {...common} stroke="#26a69a" d="M9 54h45"/></>;
    case 'spring': return <><path {...common} stroke="#546e7a" d="M8 55V8h44v8"/><path {...common} stroke="#42a5f5" d="M52 16l-10 5 19 7-19 7 19 7-9 5"/><rect x="39" y="46" width="25" height="15" rx="4" fill="#ef5350" stroke="#b71c1c" strokeWidth="3"/></>;
    case 'inclined': return <><path {...common} stroke="#1565c0" fill="#90caf9" d="M5 57h54V18z"/><g transform="rotate(-34 36 34)"><rect x="24" y="25" width="25" height="18" rx="4" fill="#ff8a65" stroke="#d84315" strokeWidth="3"/><circle cx="30" cy="44" r="4" fill="#37474f"/><circle cx="43" cy="44" r="4" fill="#37474f"/></g><path {...common} stroke="#43a047" d="M34 20L50 8m0 0l-5 1m5-1l-1 5"/></>;
    case 'buoyancy': return <><path {...common} stroke="#0288d1" fill="#b3e5fc" d="M10 23h44l-5 37H15z"/><path stroke="#29b6f6" strokeWidth="5" d="M13 38h38"/><rect x="25" y="27" width="15" height="20" rx="3" fill="#ffb74d" stroke="#ef6c00" strokeWidth="3"/><path {...common} stroke="#5c6bc0" d="M32 5v22M21 5h23"/></>;
    case 'measure': return <><path {...common} stroke="#455a64" d="M5 33h54"/><path {...common} stroke="#7e57c2" d="M14 17v32M24 24v18M50 20v26"/><rect x="25" y="25" width="24" height="16" rx="3" fill="#80cbc4" stroke="#00897b" strokeWidth="3"/><path stroke="#fff" strokeWidth="2" d="M31 28v10m6-10v10m6-10v10"/></>;
    case 'sound': return <><rect x="22" y="13" width="22" height="45" rx="5" fill="#b2dfdb" stroke="#00897b" strokeWidth="4"/><path {...common} stroke="#42a5f5" d="M27 42h12"/><path {...common} stroke="#ab47bc" d="M17 20C8 27 8 38 17 45M49 20c9 7 9 18 0 25"/><circle cx="33" cy="8" r="5" fill="#ffca28" stroke="#f57f17" strokeWidth="3"/></>;
    case 'projectile': return <><path {...common} stroke="#43a047" strokeDasharray="4 5" d="M7 49C21 7 45 7 58 49"/><circle cx="8" cy="48" r="7" fill="#ff7043"/><path {...common} stroke="#5c6bc0" d="M5 56h54"/></>;
    case 'wave': return <><path {...common} stroke="#0288d1" d="M4 33c8-22 16-22 24 0s16 22 32 0"/><path {...common} stroke="#8e24aa" d="M4 53h56"/><circle cx="28" cy="33" r="5" fill="#ffca28"/></>;
    case 'orbit': return <><circle cx="32" cy="32" r="7" fill="#ffca28"/><ellipse cx="32" cy="32" rx="27" ry="12" {...common} stroke="#42a5f5" transform="rotate(-25 32 32)"/><ellipse cx="32" cy="32" rx="27" ry="12" {...common} stroke="#ab47bc" transform="rotate(35 32 32)"/><circle cx="53" cy="19" r="5" fill="#ef5350"/></>;
    case 'electricity': return <><path fill="#ffd54f" stroke="#f57f17" strokeWidth="3" strokeLinejoin="round" d="M36 3L14 36h17l-4 25 24-36H35z"/><circle cx="11" cy="50" r="5" fill="#42a5f5"/><circle cx="54" cy="13" r="5" fill="#ef5350"/></>;
    case 'optics': return <><path fill="#80deea" stroke="#00838f" strokeWidth="4" d="M29 8c11 13 11 35 0 48 11-3 18-11 18-24S40 11 29 8z"/><path {...common} stroke="#ffca28" d="M3 24h24M3 40h24"/><path {...common} stroke="#ef5350" d="M45 22l16-8M45 42l16 8"/></>;
    case 'magnet': return <><path fill="none" stroke="#ef5350" strokeWidth="10" d="M13 12v24a19 19 0 0038 0V12"/><path stroke="#eceff1" strokeWidth="11" d="M13 12v11M51 12v11"/><path stroke="#1565c0" strokeWidth="5" d="M7 9h12M45 9h12"/></>;
    case 'heat': return <><path {...common} stroke="#ef5350" d="M18 55c-9-12 5-18 0-29M32 55c-9-12 5-18 0-35M46 55c-9-12 5-18 0-29"/><path {...common} stroke="#ffca28" d="M8 59h48"/></>;
    case 'atom': return <><circle cx="32" cy="32" r="6" fill="#ffca28"/><ellipse cx="32" cy="32" rx="26" ry="10" {...common} stroke="#42a5f5"/><ellipse cx="32" cy="32" rx="26" ry="10" {...common} stroke="#ab47bc" transform="rotate(60 32 32)"/><ellipse cx="32" cy="32" rx="26" ry="10" {...common} stroke="#26a69a" transform="rotate(-60 32 32)"/></>;
    case 'molecule': return <><circle cx="14" cy="35" r="9" fill="#42a5f5"/><circle cx="48" cy="18" r="10" fill="#ef5350"/><circle cx="49" cy="51" r="8" fill="#66bb6a"/><path {...common} stroke="#78909c" d="M22 31l17-9M22 40l19 8"/></>;
    case 'reaction': return <><path fill="#b2dfdb" stroke="#00897b" strokeWidth="4" d="M22 5h20M27 5v18L13 54q-2 5 5 5h28q7 0 5-5L37 23V5"/><path fill="#ff8a65" d="M19 46h26l5 10H14z"/><circle cx="27" cy="40" r="3" fill="#ffd54f"/><circle cx="38" cy="35" r="4" fill="#ab47bc"/></>;
    case 'periodic': return <><rect x="5" y="5" width="16" height="16" rx="3" fill="#42a5f5"/><rect x="24" y="5" width="16" height="16" rx="3" fill="#66bb6a"/><rect x="43" y="5" width="16" height="16" rx="3" fill="#ef5350"/><rect x="5" y="24" width="16" height="16" rx="3" fill="#ab47bc"/><rect x="24" y="24" width="16" height="16" rx="3" fill="#ffca28"/><rect x="43" y="24" width="16" height="16" rx="3" fill="#26c6da"/><rect x="14" y="43" width="36" height="16" rx="3" fill="#ff8a65"/></>;
    case 'cell': return <><path fill="#b2dfdb" stroke="#00897b" strokeWidth="4" d="M9 31C9 12 25 4 42 9c17 5 19 28 8 41-12 14-39 7-41-19z"/><circle cx="32" cy="31" r="10" fill="#ab47bc"/><ellipse cx="19" cy="20" rx="6" ry="3" fill="#ffca28"/><ellipse cx="43" cy="44" rx="7" ry="3" fill="#ef5350"/></>;
    case 'dna': return <><path {...common} stroke="#42a5f5" d="M15 5c0 18 34 18 34 36 0 9-8 14-17 18M49 5c0 18-34 18-34 36 0 9 8 14 17 18"/><path stroke="#ef5350" strokeWidth="3" d="M22 12h20M17 23h30M18 38h28M23 51h18"/></>;
    case 'heart': return <><path fill="#ef5350" stroke="#b71c1c" strokeWidth="4" d="M32 57C10 43 4 31 8 19c4-12 20-13 24-2 4-11 20-10 24 2 4 12-2 24-24 38z"/><path {...common} stroke="#fff" d="M15 34h9l4-9 7 18 5-9h9"/></>;
    case 'graph': return <><path {...common} stroke="#546e7a" d="M8 7v49h49"/><path {...common} stroke="#42a5f5" d="M13 47l12-14 10 7 18-24"/><circle cx="25" cy="33" r="4" fill="#ffca28"/><circle cx="53" cy="16" r="4" fill="#ef5350"/></>;
    case 'geometry': return <><path fill="#b3e5fc" stroke="#1565c0" strokeWidth="4" d="M7 55h50L38 9z"/><circle cx="38" cy="9" r="5" fill="#ef5350"/><path {...common} stroke="#ffca28" d="M22 55a15 15 0 0111-14"/></>;
    default: return <><circle cx="32" cy="32" r="24" fill="#e8eaf6" stroke="#5c6bc0" strokeWidth="4"/><path {...common} stroke="#ab47bc" d="M20 37l8 8 17-22"/><circle cx="19" cy="18" r="5" fill="#ffca28"/></>;
  }
};

export default function StudioTopicIcon({ descriptor, iconKey = 'generic', className = '' }: { descriptor?: StudioTopicIconDescriptor; iconKey?: string; className?: string }) {
  if (descriptor?.url) return <img src={descriptor.url} alt="" className={`object-contain ${className}`} />;
  return <svg viewBox="0 0 64 64" className={className} aria-hidden="true">{artwork(descriptor?.key || iconKey)}</svg>;
}
