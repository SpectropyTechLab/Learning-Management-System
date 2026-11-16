import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Archive,
  Blocks,
  ChevronDown,
  Image,
  Library,
  Link2,
  Package,
  UploadCloud,
  Video,
  type LucideIcon,
} from 'lucide-react';
import type { StudioResourceType } from '../api/studioResourcesApi';

export type InsertResourceType = Extract<
  StudioResourceType,
  'image' | 'video' | 'simulation' | 'external_link' | 'zip' | 'scorm'
>;

const resourceCommands: Array<{
  type: InsertResourceType;
  label: string;
  icon: LucideIcon;
}> = [
  { type: 'image', label: 'Image', icon: Image },
  { type: 'video', label: 'Video', icon: Video },
  { type: 'simulation', label: 'Simulation', icon: Blocks },
  { type: 'external_link', label: 'External Link', icon: Link2 },
  { type: 'zip', label: 'ZIP', icon: Archive },
  { type: 'scorm', label: 'SCORM', icon: Package },
];

type Props = {
  disabled?: boolean;
  onUpload: (type: InsertResourceType) => void;
  onFromResource: (type: InsertResourceType) => void;
};

export default function StudioInsertResourceButtons({ disabled, onUpload, onFromResource }: Props) {
  const [openType, setOpenType] = useState<InsertResourceType | null>(null);
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0 });
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openType) return undefined;
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !(target instanceof Element && target.closest('[data-insert-resource-menu]'))) {
        setOpenType(null);
      }
    };
    const closeOnViewportChange = () => setOpenType(null);
    document.addEventListener('pointerdown', close);
    window.addEventListener('resize', closeOnViewportChange);
    window.addEventListener('scroll', closeOnViewportChange, true);
    return () => {
      document.removeEventListener('pointerdown', close);
      window.removeEventListener('resize', closeOnViewportChange);
      window.removeEventListener('scroll', closeOnViewportChange, true);
    };
  }, [openType]);

  const toggleMenu = (type: InsertResourceType, button: HTMLButtonElement) => {
    if (disabled) return;
    if (openType === type) {
      setOpenType(null);
      return;
    }
    const bounds = button.getBoundingClientRect();
    setMenuPosition({ left: bounds.left, top: bounds.bottom + 4 });
    setOpenType(type);
  };

  const choose = (action: 'upload' | 'resource') => {
    if (!openType) return;
    const type = openType;
    setOpenType(null);
    if (action === 'upload') onUpload(type);
    else onFromResource(type);
  };

  return (
    <div ref={rootRef} className="flex items-center gap-0.5 px-1" aria-label="Insert Resources">
      {resourceCommands.map(({ type, label, icon: Icon }) => (
        <button
          key={type}
          type="button"
          disabled={disabled}
          title={`Insert ${label}`}
          aria-label={`Insert ${label}`}
          aria-haspopup="menu"
          aria-expanded={openType === type}
          onClick={(event) => toggleMenu(type, event.currentTarget)}
          className={`flex h-11 min-w-12 flex-col items-center justify-center gap-0.5 rounded-md px-1.5 text-[9px] font-semibold hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40 ${openType === type ? 'bg-blue-100 text-blue-950' : 'text-slate-700'}`}
        >
          <span className="flex items-center gap-0.5"><Icon size={17} /><ChevronDown size={9} /></span>
          <span>{label}</span>
        </button>
      ))}
      {openType && typeof document !== 'undefined'
        ? createPortal(
            <div
              data-insert-resource-menu
              role="menu"
              aria-label={`Insert ${openType}`}
              className="fixed z-[120] w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl"
              style={menuPosition}
            >
              <button type="button" role="menuitem" onClick={() => choose('upload')} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-blue-50">
                <UploadCloud size={16} className="text-blue-800" />
                Upload
              </button>
              <button type="button" role="menuitem" onClick={() => choose('resource')} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-blue-50">
                <Library size={16} className="text-blue-800" />
                From Resource
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
