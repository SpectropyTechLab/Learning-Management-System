import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowDown, ArrowDownLeft, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUp,
  ArrowUpLeft, ArrowUpRight, ChevronDown, Circle, Columns3, Diamond,
  AlignLeft, CaseSensitive, List, Maximize2, Minimize2, Plus, Rows3,
  SlidersHorizontal, Square, Type,
} from 'lucide-react';
import type { StudioElement } from '../types';
import {
  STUDIO_AMOUNT_EFFECTS,
  STUDIO_COLOUR_EFFECTS,
  STUDIO_SPIN_AMOUNT_OPTIONS,
  studioAnimationCapabilities,
  studioAnimationDirectionOptions,
  type StudioAnimationEffectDefinition,
} from './studioAnimationModel';
import StudioMotionPathEditor from './StudioMotionPathEditor';

type Choice = { value: string; label: string; icon: ReactNode };
type OptionGroup = { heading: string; value: string; choices: Choice[]; select: (value: string) => void };

const directionIcon = (direction: string): ReactNode => {
  const icons: Record<string, ReactNode> = {
    bottom: <ArrowUp size={22}/>, top: <ArrowDown size={22}/>, left: <ArrowRight size={22}/>, right: <ArrowLeft size={22}/>,
    'bottom-left': <ArrowUpRight size={22}/>, 'bottom-right': <ArrowUpLeft size={22}/>,
    'top-left': <ArrowDownRight size={22}/>, 'top-right': <ArrowDownLeft size={22}/>,
    horizontal: <Columns3 size={22}/>, vertical: <Rows3 size={22}/>, in: <Minimize2 size={22}/>, out: <Maximize2 size={22}/>,
    clockwise: <span className="text-2xl">↻</span>, 'counter-clockwise': <span className="text-2xl">↺</span>,
  };
  return icons[direction] || <ArrowUp size={22}/>;
};

function WheelSpokesIcon({ spokes }: { spokes: number }) {
  return <svg viewBox="0 0 32 32" aria-hidden="true" className="h-8 w-8 border border-slate-500 bg-sky-700">
    <circle cx="16" cy="16" r="14" fill="#1583bd"/>
    <g stroke="#dbeafe" strokeWidth="1.6">{Array.from({ length: spokes }, (_, index) => <line key={index} x1="16" y1="16" x2="16" y2="2.5" transform={`rotate(${(360 / spokes) * index} 16 16)`}/>)}</g>
    <circle cx="16" cy="16" r="1.5" fill="#dbeafe"/>
  </svg>;
}

function OptionGroups({ groups, close }: { groups: OptionGroup[]; close: () => void }) {
  return <div className="min-w-[168px] py-1.5">{groups.map((group, groupIndex) => <section key={group.heading} className={groupIndex ? 'border-t border-slate-200 pt-1.5' : ''}>
    <p className="px-3 pb-1 text-[11px] font-bold text-slate-700">{group.heading}</p>
    <div className="grid gap-0.5 px-1.5">{group.choices.map((choice) => <button
      key={choice.value} type="button" aria-pressed={group.value === choice.value}
      onClick={() => { group.select(choice.value); close(); }}
      className={`flex h-11 items-center gap-3 rounded px-2 text-left text-xs transition-colors ${group.value === choice.value ? 'bg-blue-100 font-semibold text-blue-950' : 'text-slate-800 hover:bg-slate-100'}`}
    ><span className="grid w-9 shrink-0 place-items-center text-blue-700">{choice.icon}</span><span>{choice.label}</span></button>)}</div>
  </section>)}</div>;
}

export default function StudioAnimationAdvancedOptions({ effect, element, onChange }: {
  effect: StudioAnimationEffectDefinition | null;
  element: StudioElement | null;
  onChange: (changes: Partial<StudioAnimationEffectDefinition>) => void;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || (target instanceof Element && target.closest('[data-animation-options-popup]'))) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  if (!effect || !element) return <button type="button" disabled className="flex h-14 w-20 flex-col items-center justify-center rounded-md text-[9px] text-slate-400"><SlidersHorizontal size={18}/><span>Effect Options</span></button>;

  const capabilities = studioAnimationCapabilities(element.type, element.content.visualType, effect.effect);
  const directionOptions = studioAnimationDirectionOptions(effect.effect);
  const groups: OptionGroup[] = [];

  if (effect.effect === 'wheel' || effect.effect === 'wheel-out') {
    groups.push({
      heading: 'Spokes', value: String(Number(effect.spokes) || 1),
      choices: [1, 2, 3, 4, 8].map((count) => ({ value: String(count), label: `${count} ${count === 1 ? 'Spoke' : 'Spokes'}`, icon: <WheelSpokesIcon spokes={count}/> })),
      select: (value) => onChange({ spokes: Number(value) }),
    });
  }
  if (capabilities.direction && !capabilities.splitMode && directionOptions.length) {
    groups.push({
      heading: 'Direction', value: String(effect.direction || directionOptions[0][0]),
      choices: directionOptions.map(([value, label]) => ({ value, label, icon: directionIcon(value) })),
      select: (direction) => onChange({ direction }),
    });
  }
  if (capabilities.splitMode) {
    groups.push({
      heading: 'Direction', value: `${String(effect.direction || 'horizontal')}:${String(effect.splitMode || 'out')}`,
      choices: [
        { value: 'horizontal:out', label: 'Horizontal Out', icon: <span className="flex"><Rows3 size={18}/><Maximize2 size={18}/></span> },
        { value: 'horizontal:in', label: 'Horizontal In', icon: <span className="flex"><Rows3 size={18}/><Minimize2 size={18}/></span> },
        { value: 'vertical:out', label: 'Vertical Out', icon: <span className="flex"><Columns3 size={18}/><Maximize2 size={18}/></span> },
        { value: 'vertical:in', label: 'Vertical In', icon: <span className="flex"><Columns3 size={18}/><Minimize2 size={18}/></span> },
      ],
      select: (value) => {
        const [direction, splitMode] = value.split(':');
        onChange({ direction, splitMode: splitMode as 'in' | 'out' });
      },
    });
  }
  if (capabilities.shapeKind) {
    groups.push({
      heading: 'Shape', value: String(effect.shapeKind || 'circle'),
      choices: [
        { value: 'circle', label: 'Circle', icon: <Circle size={22}/> }, { value: 'box', label: 'Box', icon: <Square size={22}/> },
        { value: 'diamond', label: 'Diamond', icon: <Diamond size={22}/> }, { value: 'plus', label: 'Plus', icon: <Plus size={22}/> },
      ], select: (shapeKind) => onChange({ shapeKind }),
    });
  }
  if (effect.effect === 'spin' || effect.effect === '3d-turntable') {
    groups.push({
      heading: 'Direction', value: effect.clockwise === false ? 'counter-clockwise' : 'clockwise',
      choices: [{ value: 'clockwise', label: 'Clockwise', icon: directionIcon('clockwise') }, { value: 'counter-clockwise', label: 'Counter-clockwise', icon: directionIcon('counter-clockwise') }],
      select: (value) => onChange({ clockwise: value === 'clockwise' }),
    });
  }
  if (effect.effect === 'spin') {
    groups.push({
      heading: 'Amount', value: String(Number(effect.rotation) || 360),
      choices: STUDIO_SPIN_AMOUNT_OPTIONS.map(([rotation, label]) => ({
        value: String(rotation), label, icon: <span className="text-base font-black">{rotation === 90 ? '¼' : rotation === 180 ? '½' : rotation === 360 ? '1×' : '2×'}</span>,
      })),
      select: (rotation) => onChange({ rotation: Number(rotation) }),
    });
  }
  if (capabilities.textSequence) {
    groups.push({
      heading: 'Animate text',
      value: String(effect.textSequence || 'object'),
      choices: [
        { value: 'object', label: 'As one object', icon: <Type size={22}/> },
        { value: 'paragraph', label: 'By paragraph', icon: <List size={22}/> },
        { value: 'word', label: 'By word', icon: <AlignLeft size={22}/> },
        { value: 'letter', label: 'By letter', icon: <CaseSensitive size={22}/> },
      ],
      select: (textSequence) => onChange({ textSequence }),
    });
  }

  const hasSpecialControl = capabilities.motionPath || STUDIO_COLOUR_EFFECTS.has(effect.effect) || STUDIO_AMOUNT_EFFECTS.has(effect.effect);
  const hasOptions = groups.length > 0 || hasSpecialControl;
  const bounds = buttonRef.current?.getBoundingClientRect();
  const closePopup = () => setOpen(false);
  let content: ReactNode = <OptionGroups groups={groups} close={closePopup}/>;
  if (!groups.length && capabilities.motionPath) content = <div className="w-[min(30rem,calc(100vw-1rem))] p-3"><p className="mb-2 text-xs font-bold text-slate-700">Path options</p><StudioMotionPathEditor effect={effect} onChange={onChange}/></div>;
  if (!groups.length && STUDIO_COLOUR_EFFECTS.has(effect.effect)) content = <label className="flex items-center gap-3 p-3 text-xs font-semibold text-slate-700">Effect colour<input type="color" aria-label="Animation colour" value={String(effect.color || '#2563eb')} onChange={(event) => onChange({ color: event.target.value })} className="h-8 w-14 rounded border border-slate-300"/></label>;
  if (!groups.length && STUDIO_AMOUNT_EFFECTS.has(effect.effect)) content = <label className="flex items-center gap-3 p-3 text-xs font-semibold text-slate-700">{effect.effect === 'transparency' ? 'Transparency' : 'Size'}<input aria-label="Animation amount" type="range" min={effect.effect === 'transparency' ? 0 : 10} max={effect.effect === 'transparency' ? 100 : 400} step={5} value={Number(effect.amount) || (effect.effect === 'transparency' ? 30 : effect.effect === 'pulse' ? 108 : 120)} onChange={(event) => onChange({ amount: Number(event.target.value) })}/></label>;

  return <>
    <button ref={buttonRef} type="button" disabled={!hasOptions} onClick={() => setOpen((value) => !value)} aria-haspopup="menu" aria-expanded={open}
      title={hasOptions ? `Effect Options for ${effect.effect.replace(/-/g, ' ')}` : 'This effect has no Effect Options'}
      className={`flex h-14 min-w-20 flex-col items-center justify-center rounded-md border px-2 text-[9px] font-semibold transition-colors disabled:cursor-not-allowed disabled:text-slate-300 ${open ? 'border-blue-400 bg-blue-50 text-blue-900' : 'border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50'}`}>
      <span className="flex items-center gap-0.5"><SlidersHorizontal size={18}/><ChevronDown size={11}/></span><span>Effect Options</span>
    </button>
    {open && hasOptions ? createPortal(<div data-animation-options-popup role="menu" className="fixed z-[260] max-h-[70vh] overflow-y-auto rounded-md border border-slate-400 bg-white shadow-2xl" style={{ top: Math.max(8, Math.min((bounds?.bottom || 120) + 2, window.innerHeight - 300)), left: Math.max(8, Math.min(Math.max(8, bounds?.left || 8), window.innerWidth - 500)) }}>{content}</div>, document.body) : null}
  </>;
}
