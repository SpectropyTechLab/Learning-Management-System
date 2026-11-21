import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';

interface ResourceFrameProps {
  source: string;
  title: string;
  className?: string;
  frameKey?: string;
  width?: number | null;
  height?: number | null;
  onRuntimeMessage?: (data: Record<string, unknown>) => void;
  onReady?: () => void;
}

interface ExternalLinkFrameProps extends ResourceFrameProps {
  openLinkLabel?: string;
}

interface FittedFrameViewportProps {
  width?: number | null;
  height?: number | null;
  className?: string;
  children: ReactNode;
}

function FittedFrameViewport({ width, height, className = '', children }: FittedFrameViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const aspectRatio = width && height && width > 0 && height > 0 ? width / height : 16 / 9;

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const updateSize = () => setContainerSize({
      width: container.clientWidth,
      height: container.clientHeight,
    });
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const fittedSize = containerSize.width > 0 && containerSize.height > 0
    ? containerSize.width / containerSize.height > aspectRatio
      ? { width: containerSize.height * aspectRatio, height: containerSize.height }
      : { width: containerSize.width, height: containerSize.width / aspectRatio }
    : { width: '100%', height: '100%' };

  return (
    <div ref={containerRef} className={`flex items-center justify-center overflow-hidden bg-slate-950 ${className}`}>
      <div className="relative shrink-0 overflow-hidden bg-white" style={fittedSize}>
        {children}
      </div>
    </div>
  );
}

export function ExternalLinkFrame({
  source,
  title,
  className = '',
  openLinkLabel = 'Open in new tab',
  width,
  height,
  onReady,
}: ExternalLinkFrameProps) {
  return (
    <div className={`relative overflow-hidden bg-slate-950 ${className}`}>
      <FittedFrameViewport width={width} height={height} className="h-full w-full">
        <iframe
          key={source}
          src={source}
          title={title}
          className="h-full w-full border-0"
          sandbox="allow-scripts allow-same-origin X-Frame-Options"
          allow="fullscreen"
          allowFullScreen
          onLoad={onReady}
        />
      </FittedFrameViewport>
      <a
        href={source}
        target="_blank"
        rel="noreferrer"
        className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-xs font-bold text-blue-900 shadow"
      >
        <ExternalLink size={14} />
        {openLinkLabel}
      </a>
    </div>
  );
}

export function ExecutableResourceFrame({
  source,
  title,
  className = '',
  frameKey,
  width,
  height,
  onRuntimeMessage,
  onReady,
}: ResourceFrameProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    if (!onRuntimeMessage) return;
    const receive = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow || !event.data || typeof event.data !== 'object') return;
      onRuntimeMessage(event.data as Record<string, unknown>);
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [onRuntimeMessage]);
  return (
    <FittedFrameViewport width={width} height={height} className={className}>
      <iframe
        ref={frameRef}
        key={frameKey ?? source}
        src={source}
        title={title}
        className="h-full w-full border-0 bg-white"
        sandbox="allow-scripts allow-popups allow-top-navigation-by-user-activation allow-pointer-lock allow-forms allow-modals allow-downloads allow-presentation"
        allow="fullscreen"
        allowFullScreen
        onLoad={onReady}
      />
    </FittedFrameViewport>
  );
}
