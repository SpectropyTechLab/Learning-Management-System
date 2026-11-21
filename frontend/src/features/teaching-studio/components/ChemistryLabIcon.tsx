import StudioTopicIcon from './StudioTopicIcon';
import type { ChemistryLabCatalogEntry } from './chemistryLabModel';

const labBadge: Record<string, string> = {
  'sep-salt': 'NaCl', solubility: 'aq', 'nat-ind': 'In', neutral: 'pH', rust: 'Fe', crystal: 'Cu',
  oxides: 'O₂', displace: '↔', conduct: 'e⁻', colloid: 'T', 'mp-bp': '°C', 'fe-s': 'FeS',
  conserv: 'Σm', 'ink-chroma': 'Rf', ph10: 'pH', 'acid-prop': 'H⁺', 'rxn-types': 'Rx',
  reactivity: 'M', soap: 'C₁₇', ethanoic: 'Ac', anion: '−', cation: '+', flame: 'λ',
  'titr-naoh': 'OH', 'titr-na2co3': 'CO₃', 'titr-oxalic': 'Mn', 'titr-mohr': 'Fe²',
  'leaf-chroma': 'Chl', enthalpy: 'ΔH', equil: '⇌', kinetics: 'k', func: 'R', biomol: 'Bio',
  daniell: 'Zn', sols: 'Sol',
};

const iconKey = (entry: ChemistryLabCatalogEntry) => {
  const text = `${entry.title} ${entry.topicLabel}`.toLowerCase();
  if (/electro|conduct|cell|emf/.test(text)) return 'electricity';
  if (/heat|enthalpy|melting|boiling|temperature/.test(text)) return 'heat';
  if (/atom|ion|flame|metal/.test(text)) return 'atom';
  if (/reaction|rate|equilibrium|neutral|titr/.test(text)) return 'reaction';
  if (/carbon|organic|biomol|functional/.test(text)) return 'molecule';
  return 'chemistry';
};

export default function ChemistryLabIcon({ entry, className = 'h-7 w-7' }: { entry: ChemistryLabCatalogEntry; className?: string }) {
  return <span className={`relative inline-grid place-items-center ${className}`} title={entry.title}>
    <StudioTopicIcon iconKey={iconKey(entry)} className="h-full w-full" />
    <span className="absolute -bottom-1 -right-1 grid min-h-3 min-w-3 place-items-center rounded-full border border-white bg-slate-900 px-0.5 text-[6px] font-black leading-3 text-white shadow-sm">{labBadge[entry.id] || 'Ch'}</span>
  </span>;
}
