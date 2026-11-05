import type { LucideIcon } from 'lucide-react';
import { Archive, Blocks, Code2, FileImage, Film, Link2, Package, Presentation, Video } from 'lucide-react';
import type { StudioResourceType } from '../../api/studioResourcesApi';

export const RESOURCE_TYPE_STYLES: Record<StudioResourceType, { icon: LucideIcon; badge: string; preview: string }> = {
  image: { icon: FileImage, badge: 'bg-emerald-100 text-emerald-800', preview: 'from-emerald-50 to-teal-100 text-emerald-700' },
  video: { icon: Video, badge: 'bg-red-100 text-red-700', preview: 'from-red-50 to-rose-100 text-red-700' },
  animation: { icon: Film, badge: 'bg-amber-100 text-amber-800', preview: 'from-amber-50 to-orange-100 text-amber-700' },
  simulation: { icon: Blocks, badge: 'bg-violet-100 text-violet-800', preview: 'from-violet-50 to-indigo-100 text-violet-700' },
  external_link: { icon: Link2, badge: 'bg-slate-100 text-slate-700', preview: 'from-slate-50 to-slate-200 text-slate-700' },
  html: { icon: Code2, badge: 'bg-blue-100 text-blue-800', preview: 'from-blue-50 to-sky-100 text-blue-700' },
  zip: { icon: Archive, badge: 'bg-purple-100 text-purple-800', preview: 'from-purple-50 to-fuchsia-100 text-purple-700' },
  scorm: { icon: Package, badge: 'bg-cyan-100 text-cyan-800', preview: 'from-cyan-50 to-blue-100 text-cyan-700' },
  presentation: { icon: Presentation, badge: 'bg-orange-100 text-orange-800', preview: 'from-orange-50 to-amber-100 text-orange-700' },
};

export const formatResourceDate = (value?: string) => {
  const date = value ? new Date(value) : null;
  return !date || Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
};
