import type { LucideIcon } from 'lucide-react';
import { Archive, Box, Blocks, Code2, FileImage, FileText, Film, Link2, Package, Presentation, Video } from 'lucide-react';
import type { StudioResourceType } from '../../api/studioResourcesApi';

const KNOWN_RESOURCE_TYPE_STYLES: Record<StudioResourceType, { icon: LucideIcon; badge: string; preview: string }> = {
  image: { icon: FileImage, badge: 'bg-emerald-100 text-emerald-800', preview: 'from-emerald-50 to-teal-100 text-emerald-700' },
  video: { icon: Video, badge: 'bg-red-100 text-red-700', preview: 'from-red-50 to-rose-100 text-red-700' },
  animation: { icon: Film, badge: 'bg-amber-100 text-amber-800', preview: 'from-amber-50 to-orange-100 text-amber-700' },
  simulation: { icon: Blocks, badge: 'bg-violet-100 text-violet-800', preview: 'from-violet-50 to-indigo-100 text-violet-700' },
  external_link: { icon: Link2, badge: 'bg-slate-100 text-slate-700', preview: 'from-slate-50 to-slate-200 text-slate-700' },
  html: { icon: Code2, badge: 'bg-blue-100 text-blue-800', preview: 'from-blue-50 to-sky-100 text-blue-700' },
  zip: { icon: Archive, badge: 'bg-purple-100 text-purple-800', preview: 'from-purple-50 to-fuchsia-100 text-purple-700' },
  scorm: { icon: Package, badge: 'bg-cyan-100 text-cyan-800', preview: 'from-cyan-50 to-blue-100 text-cyan-700' },
  presentation: { icon: Presentation, badge: 'bg-orange-100 text-orange-800', preview: 'from-orange-50 to-amber-100 text-orange-700' },
  model_3d: { icon: Box, badge: 'bg-indigo-100 text-indigo-800', preview: 'from-indigo-50 to-violet-100 text-indigo-700' },
  document: { icon: FileText, badge: 'bg-sky-100 text-sky-800', preview: 'from-sky-50 to-blue-100 text-sky-700' },
};

export const DEFAULT_RESOURCE_TYPE_STYLE = {
  icon: Package,
  badge: 'bg-slate-100 text-slate-700',
  preview: 'from-slate-50 to-slate-200 text-slate-700',
};

export const RESOURCE_TYPE_STYLES = new Proxy(KNOWN_RESOURCE_TYPE_STYLES, {
  get: (styles, property: string | symbol) =>
    typeof property === 'string'
      ? styles[property as StudioResourceType] ?? DEFAULT_RESOURCE_TYPE_STYLE
      : Reflect.get(styles, property),
});

export const getResourceTypeStyle = (type: string | null | undefined) =>
  RESOURCE_TYPE_STYLES[type as StudioResourceType] ?? DEFAULT_RESOURCE_TYPE_STYLE;

export const formatResourceTypeLabel = (type: string | null | undefined) => {
  if (!type) return 'Resource';
  return type
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

export const formatResourceDate = (value?: string) => {
  const date = value ? new Date(value) : null;
  return !date || Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
};
