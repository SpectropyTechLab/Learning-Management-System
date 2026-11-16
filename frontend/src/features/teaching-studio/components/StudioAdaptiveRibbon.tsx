import { ArrowUpRight, ChevronDown, ChevronUp } from 'lucide-react';
import type { ReactNode } from 'react';
import type { StudioRibbonTab, StudioRibbonTabId } from './studioRibbonModel';

export type StudioRibbonCommand = {
  id: string;
  label: string;
  icon: ReactNode;
  onExecute: () => void;
  disabled?: boolean;
  active?: boolean;
  danger?: boolean;
};

export type StudioRibbonGroup = {
  id: string;
  label: string;
  commands?: StudioRibbonCommand[];
  content?: ReactNode;
  launcher?: {
    label: string;
    onExecute: () => void;
  };
};

type Props = {
  tabs: StudioRibbonTab[];
  activeTab: StudioRibbonTabId;
  groups: StudioRibbonGroup[];
  onTabChange: (tab: StudioRibbonTabId) => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
};

const tabAccent = (tab: StudioRibbonTab, selected: boolean) => {
  if (!tab.contextual) return selected ? 'border-blue-800 text-blue-950' : 'border-transparent text-slate-600';
  const accent = tab.accent ?? 'violet';
  const colors = {
    blue: selected ? 'border-blue-700 bg-blue-50 text-blue-950' : 'border-transparent text-blue-800',
    violet: selected ? 'border-violet-700 bg-violet-50 text-violet-950' : 'border-transparent text-violet-800',
    emerald: selected ? 'border-emerald-700 bg-emerald-50 text-emerald-950' : 'border-transparent text-emerald-800',
    amber: selected ? 'border-amber-700 bg-amber-50 text-amber-950' : 'border-transparent text-amber-800',
  };
  return colors[accent];
};

export default function StudioAdaptiveRibbon({
  tabs,
  activeTab,
  groups,
  onTabChange,
  collapsed = false,
  onToggleCollapsed,
}: Props) {
  return (
    <section style={{ height: collapsed ? '2rem' : '6.35rem' }} className="studio-adaptive-ribbon relative z-[80] shrink-0 overflow-visible rounded-xl border border-slate-200 bg-white/95 shadow-sm transition-[height] duration-200" aria-label="Editor ribbon">
      <div role="tablist" aria-label="Editor command tabs" className="studio-ribbon-tabs flex h-8 min-w-0 items-end gap-0.5 overflow-hidden border-b border-slate-200 px-2 pt-0.5">
        {tabs.map((tab) => {
          const selected = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="studio-ribbon-command-panel"
              onClick={() => { onTabChange(tab.id); if (collapsed) onToggleCollapsed?.(); }}
              className={`min-w-0 shrink border-b-2 px-2 py-1 text-[11px] font-semibold transition-colors hover:bg-slate-50 ${tabAccent(tab, selected)}`}
            >
              {tab.label}
            </button>
          );
        })}
        {onToggleCollapsed ? (
          <button type="button" onClick={onToggleCollapsed} title={collapsed ? 'Show ribbon commands' : 'Hide ribbon commands'} aria-label={collapsed ? 'Show ribbon commands' : 'Hide ribbon commands'} className="ml-auto grid h-7 w-8 shrink-0 place-items-center rounded-t-md text-slate-600 hover:bg-slate-100">
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        ) : null}
      </div>
      <div id="studio-ribbon-command-panel" role="tabpanel" aria-hidden={collapsed} className={`studio-ribbon-groups h-[4.3rem] min-w-0 items-stretch gap-1 overflow-y-hidden px-2 py-1 ${activeTab === 'transitions' ? 'overflow-x-auto' : 'overflow-x-hidden'} ${collapsed ? 'hidden' : 'flex'}`}>
        {groups.length ? groups.map((group) => (
          <div key={group.id} className="studio-ribbon-group relative flex min-w-0 shrink flex-col border-r border-slate-200 pr-1 last:border-r-0">
            <div className="flex min-h-0 flex-1 items-center gap-0.5 overflow-hidden">
              {group.content}
              {(group.commands ?? []).map((command) => (
                <button
                  key={command.id}
                  type="button"
                  disabled={command.disabled}
                  onClick={command.onExecute}
                  title={command.label}
                  aria-label={command.label}
                  aria-pressed={command.active || undefined}
                  className={`studio-ribbon-command inline-flex min-h-9 min-w-9 max-w-16 flex-col items-center justify-center gap-0.5 rounded-lg border px-1.5 py-0.5 text-[9px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${command.danger ? 'border-red-200 text-red-700 hover:bg-red-50' : command.active ? 'border-blue-300 bg-blue-50 text-blue-950' : 'border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50'}`}
                >
                  <span aria-hidden="true">{command.icon}</span>
                  <span className="max-w-14 truncate">{command.label}</span>
                </button>
              ))}
            </div>
            <div className="relative mt-0.5 min-h-3 text-center text-[9px] font-medium text-slate-400">
              <span>{group.label}</span>
              {group.launcher ? (
                <button type="button" onClick={group.launcher.onExecute} title={group.launcher.label} aria-label={group.launcher.label} className="absolute bottom-0 right-0 grid h-3.5 w-3.5 place-items-center rounded-sm text-slate-500 hover:bg-blue-100 hover:text-blue-900">
                  <ArrowUpRight size={10} strokeWidth={2.5} />
                </button>
              ) : null}
            </div>
          </div>
        )) : (
          <p className="flex items-center px-2 text-xs text-slate-500">No commands are available for this selection.</p>
        )}
        <div id="studio-contextual-toolbar-host" className={`${activeTab === 'home' || activeTab === 'text-format' ? 'flex' : 'hidden'} min-w-0 empty:hidden shrink items-stretch overflow-hidden [&>*]:w-full`} aria-live="polite" />
      </div>
    </section>
  );
}
