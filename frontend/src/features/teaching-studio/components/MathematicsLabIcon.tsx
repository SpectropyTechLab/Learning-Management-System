import StudioTopicIcon from './StudioTopicIcon';
import type { MathematicsLabCatalogEntry } from './mathematicsLabModel';

const keyFor = (entry: MathematicsLabCatalogEntry) => /geometry|mensuration|trigonometry|coordinate/.test(entry.topic) ? 'geometry' : /calculus|statistics|linear-programming|function/.test(entry.topic) ? 'graph' : 'generic';
const badgeFor = (entry: MathematicsLabCatalogEntry) => {
  const text = entry.title.toLowerCase();
  if (/pythagoras/.test(text)) return 'a²'; if (/triangle/.test(text)) return '△'; if (/circle|arc|chord|tangent/.test(text)) return '○';
  if (/fraction|rational/.test(text)) return '½'; if (/root|surd/.test(text)) return '√'; if (/integral/.test(text)) return '∫';
  if (/derivative|slope/.test(text)) return 'f′'; if (/probability|bayes/.test(text)) return 'P'; if (/matrix/.test(text)) return '[ ]';
  if (/vector/.test(text)) return '→'; if (/angle|trigonometric|sine|cosine/.test(text)) return 'θ'; if (/equation|algebra|polynomial/.test(text)) return 'x';
  return entry.id.slice(0, 3).toUpperCase();
};
export default function MathematicsLabIcon({ entry, className = 'h-7 w-7' }: { entry: MathematicsLabCatalogEntry; className?: string }) {
  return <span className={`relative inline-grid place-items-center ${className}`} title={entry.title}><StudioTopicIcon iconKey={keyFor(entry)} className="h-full w-full"/><span className="absolute -bottom-1 -right-1 grid min-h-3 min-w-3 place-items-center rounded-full border border-white bg-slate-900 px-0.5 text-[6px] font-black leading-3 text-white shadow-sm">{badgeFor(entry)}</span></span>;
}
