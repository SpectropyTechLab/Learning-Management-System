import { useEffect, useMemo, useRef, useState } from 'react';
import type { SimulationDocument } from '../simulationStudioModel';
import { injectPhysicsProject, toPhysicsRuntimeProject, type PhysicsNativeProject } from './physicsRuntimeProject';

let runtimePromise: Promise<string> | null = null;
const loadRuntime = () => runtimePromise ||= fetch('/simulation-runtimes/physics.html').then((response) => {
  if (!response.ok) throw new Error(`Physics runtime could not be loaded (${response.status}).`);
  return response.text();
});

export type PhysicsRuntimeCommand = {
  id: number;
  action: 'reset' | 'back' | 'play' | 'forward' | 'speed' | 'seek' | 'setVariable' | 'graph' | 'view' | 'newSimulation';
  value?: number | boolean | string;
  key?: string;
};
export type PhysicsRuntimeState = {
  value: number; min: number; max: number; unit: string; label: string; playing: boolean; speed: number;
  values: Record<string, number>;
};

export default function PhysicsRuntimePreview({ simulation, resetToken = 0, command, onState, onProject, presentationScale = 1 }: {
  simulation: SimulationDocument;
  resetToken?: number;
  command?: PhysicsRuntimeCommand | null;
  onState?: (state: PhysicsRuntimeState) => void;
  onProject?: (project: PhysicsNativeProject) => void;
  presentationScale?: number;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [runtime, setRuntime] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void loadRuntime().then((html) => { if (active) setRuntime(html); }).catch((reason) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Physics runtime could not be loaded.');
    });
    return () => { active = false; };
  }, []);
  const source = useMemo(
    () => runtime ? injectPhysicsProject(runtime, simulation) : '',
    // Ordinary edits are synchronized into the live runtime below. Rebuild the
    // iframe only when the selected template or explicit reset instance changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [runtime, simulation.templateId, resetToken],
  );
  const syncRuntime = () => frameRef.current?.contentWindow?.postMessage({
    spx: 'control', action: 'sync', project: toPhysicsRuntimeProject(simulation),
  }, '*');
  useEffect(() => { syncRuntime(); }, [simulation]);
  useEffect(() => {
    if (!command) return;
    frameRef.current?.contentWindow?.postMessage({ spx: 'control', action: command.action, value: command.value, key: command.key }, '*');
  }, [command]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      if (event.data?.spx === 'state') onState?.(event.data as PhysicsRuntimeState);
      if (event.data?.spx === 'project' && event.data.project) onProject?.(event.data.project as PhysicsNativeProject);
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [onProject, onState]);
  if (error) return <div className="grid h-full place-items-center p-6 text-sm text-red-300">{error}</div>;
  if (!source) return <div className="grid h-full place-items-center text-sm text-cyan-200">Loading Physics runtime…</div>;
  const scale = Math.max(1, Math.min(1.5, presentationScale));
  return (
    <iframe
      ref={frameRef}
      key={`${simulation.templateId}-${resetToken}`}
      title={`${simulation.title} Physics simulation`}
      srcDoc={source}
      onLoad={syncRuntime}
      sandbox="allow-scripts allow-same-origin"
      className="border-0 bg-[#09111d]"
      style={scale > 1 ? { width: `${100 / scale}%`, height: `${100 / scale}%`, transform: `scale(${scale})`, transformOrigin: 'top left' } : { width: '100%', height: '100%' }}
    />
  );
}
