import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import type { StudioTaxonomyTerm, StudioTaxonomyType } from '../api/studioTaxonomyApi';

type Props = {
  terms: StudioTaxonomyTerm[];
  type: Extract<StudioTaxonomyType, 'pedagogy' | 'bloom'>;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  emptyLabel?: string;
};

export default function StudioTaxonomySelect({ terms, type, value, onChange, placeholder, emptyLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const options = useMemo(() => terms.filter((term) => term.type === type), [terms, type]);
  const visibleOptions = useMemo(() => {
    const search = query.trim().toLowerCase();
    return search ? options.filter((term) => term.label.toLowerCase().includes(search)) : options;
  }, [options, query]);
  const selected = options.find((term) => String(term.id) === value);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  return <div ref={rootRef} className="relative mt-1">
    <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => { setOpen((current) => !current); setQuery(''); }} className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left font-normal text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100">
      <span className={selected ? 'truncate' : 'truncate text-slate-500'}>{selected?.label || placeholder}</span>
      <ChevronDown size={16} className={`shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open ? <div className="absolute left-0 right-0 top-full z-[90] mt-1 overflow-hidden rounded-lg border border-slate-300 bg-white shadow-xl">
      <div className="relative border-b border-slate-200 p-2"><Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${type}…`} className="w-full rounded-md border border-slate-300 py-2 pl-8 pr-2 text-sm font-normal outline-none focus:border-blue-600" /></div>
      <div role="listbox" className="max-h-52 overflow-y-auto overscroll-contain p-1">
        {emptyLabel && !query ? <button type="button" role="option" aria-selected={!value} onClick={() => { onChange(''); setOpen(false); }} className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-normal text-slate-600 hover:bg-slate-100"><span>{emptyLabel}</span>{!value ? <Check size={15} className="text-blue-700" /> : null}</button> : null}
        {visibleOptions.map((term) => <button key={term.id} type="button" role="option" aria-selected={String(term.id) === value} onClick={() => { onChange(String(term.id)); setOpen(false); }} className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-normal text-slate-800 hover:bg-blue-50"><span className="truncate">{term.label}</span>{String(term.id) === value ? <Check size={15} className="shrink-0 text-blue-700" /> : null}</button>)}
        {!visibleOptions.length ? <p className="px-3 py-4 text-center text-sm font-normal text-slate-500">No matching values</p> : null}
      </div>
    </div> : null}
  </div>;
}
