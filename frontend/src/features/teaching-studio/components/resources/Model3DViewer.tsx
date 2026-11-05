import { createElement, useEffect, useState } from 'react';

interface Model3DViewerProps {
  src: string;
  alt: string;
  className?: string;
}

export default function Model3DViewer({ src, alt, className = '' }: Model3DViewerProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void import('@google/model-viewer').then(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  if (!ready) {
    return <div className={`grid place-items-center bg-slate-100 text-sm text-slate-600 ${className}`}>Loading 3D viewer…</div>;
  }

  return createElement('model-viewer', {
    src,
    alt,
    class: className,
    style: { width: '100%', height: '100%', background: '#f8fafc' },
    'camera-controls': true,
    'auto-rotate': true,
    'shadow-intensity': '1',
    'interaction-prompt': 'auto',
    ar: true,
    loading: 'eager',
  });
}
