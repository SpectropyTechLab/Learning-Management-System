import { Dna, Flower2, Microscope, ScanSearch, TestTube2, Worm } from 'lucide-react';
import type { BiologyLabCatalogEntry } from './biologyLabModel';

export default function BiologyLabIcon({ entry, className = 'h-7 w-7' }: { entry: BiologyLabCatalogEntry; className?: string }) {
  const Icon = entry.mode === 'scope' ? Microscope : entry.mode === 'prep' ? ScanSearch : entry.mode === 'dissect' ? Flower2 : entry.mode === 'exp' ? TestTube2 : entry.mode === 'con' ? Dna : Worm;
  const colour = entry.mode === 'scope' ? 'text-blue-600' : entry.mode === 'prep' ? 'text-violet-600' : entry.mode === 'dissect' ? 'text-pink-600' : entry.mode === 'exp' ? 'text-emerald-600' : entry.mode === 'con' ? 'text-amber-600' : 'text-cyan-600';
  const badge = entry.launchKey.split(':')[1]?.slice(0, 2).toUpperCase() || entry.mode.slice(0, 2).toUpperCase();
  return <span className={`relative inline-grid place-items-center rounded-lg bg-white ${className}`} title={entry.title}><Icon className={`h-[78%] w-[78%] ${colour}`} strokeWidth={1.8}/><span className="absolute -bottom-1 -right-1 grid min-h-3 min-w-3 place-items-center rounded-full border border-white bg-slate-900 px-0.5 text-[6px] font-black leading-3 text-white shadow-sm">{badge}</span></span>;
}
