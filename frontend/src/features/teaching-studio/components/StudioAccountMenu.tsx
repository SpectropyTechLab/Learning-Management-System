import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Home, LogOut, Moon, Settings, Sun, UserRound } from 'lucide-react';

export type StudioThemePreference = 'light' | 'dark';

interface StudioAccountMenuProps {
  collapsed: boolean;
  name: string;
  email: string;
  theme: StudioThemePreference;
  onThemeChange: (theme: StudioThemePreference) => void;
  onHome: () => void;
  onProfile?: () => void;
  onLogout: () => void | Promise<void>;
}

const themeOptions = [
  { value: 'light' as const, label: 'Light', icon: Sun },
  { value: 'dark' as const, label: 'Dark', icon: Moon },
];

export default function StudioAccountMenu({
  collapsed,
  name,
  email,
  theme,
  onThemeChange,
  onHome,
  onProfile,
  onLogout,
}: StudioAccountMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const initial = name.trim().charAt(0).toUpperCase() || 'U';

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`group relative flex w-full items-center rounded-xl text-left text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 ${collapsed ? 'justify-center p-2' : 'gap-3 px-2 py-2'}`}
        aria-label="Open account and Studio settings"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-100 text-sm font-bold text-blue-900">{initial}</span>
        {!collapsed ? <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{name}</span><span className="block truncate text-xs text-slate-500">Account & settings</span></span> : null}
        {!collapsed ? <ChevronDown size={16} className={`shrink-0 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} /> : null}
        {collapsed ? <span role="tooltip" className="pointer-events-none absolute left-full top-1/2 z-[70] ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white group-hover:md:block group-focus-visible:md:block">Account & settings</span> : null}
      </button>

      {open ? <div role="menu" aria-label="Account and Studio settings" className="absolute bottom-full left-0 z-[80] mb-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-800 shadow-xl md:bottom-0 md:left-full md:mb-0 md:ml-2">
        <div className="border-b border-slate-200 px-4 py-3"><p className="truncate text-sm font-semibold">{name}</p><p className="mt-0.5 truncate text-xs text-slate-500">{email}</p></div>
        <div className="p-2">
          <button type="button" role="menuitem" onClick={() => { setOpen(false); onHome(); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-slate-100"><Home size={17} />LMS Home</button>
          {onProfile ? <button type="button" role="menuitem" onClick={() => { setOpen(false); onProfile(); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-slate-100"><UserRound size={17} />Profile</button> : null}
        </div>
        <div className="border-y border-slate-200 px-3 py-3">
          <div className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-500"><Settings size={14} />Appearance</div>
          <div className="grid grid-cols-2 gap-1" role="group" aria-label="Studio appearance">
            {themeOptions.map(({ value, label, icon: Icon }) => <button key={value} type="button" onClick={() => onThemeChange(value)} className={`flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-xs font-medium ${theme === value ? 'bg-blue-900 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`} aria-pressed={theme === value}><Icon size={16} />{label}</button>)}
          </div>
        </div>
        <div className="p-2"><button type="button" role="menuitem" onClick={() => { setOpen(false); void onLogout(); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"><LogOut size={17} />Logout</button></div>
      </div> : null}
    </div>
  );
}
