import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, CornerUpLeft, Download, ExternalLink, Maximize2, Presentation } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getApiErrorDetails } from '@/lib/api';
import type { Layout, ObjectType, Slide } from './layouts';
import { targetLayouts } from './targetLayouts';
import SlideCanvas from './SlideCanvas';
import StudioShell from './components/StudioShell';
import {
  abandonBranchRun,
  completeBranchRun,
  createBranchRun,
  enterBranch,
  getPublishedRelease,
  launchPublishedResource,
  previewPublishedResource,
  returnFromBranch,
} from './api/studioPublishedApi';
import type {
  PublishedBranch,
  PublishedRelease,
  PublishedResourceMapping,
  PublishedScreen,
} from './api/studioPublishedApi';

const textFrom = (content: Record<string, unknown>) => {
  const preferred = content.text ?? content.value ?? content.title ?? content.caption;
  if (typeof preferred === 'string') return preferred;
  const value = Object.values(content).find((item) => typeof item === 'string');
  return typeof value === 'string' ? value : '';
};

const layoutFor = (screen: PublishedScreen): Layout | null => {
  if (!screen.layout) return null;
  const known = targetLayouts.find((layout) => layout.id === screen.layout?.layout_key);
  if (known) return known;
  const slots = screen.layout.layout_data_json?.slots;
  if (!Array.isArray(slots)) return null;
  return {
    id: screen.layout.layout_key,
    name: screen.layout.name,
    purpose: screen.layout.description || '',
    catalog: 'target',
    slots: slots as Layout['slots'],
  };
};

function PublishedResource({ releaseId, mapping }: { releaseId: number; mapping: PublishedResourceMapping }) {
  const [source, setSource] = useState(mapping.external_url || '');
  const [error, setError] = useState('');

  useEffect(() => {
    if (mapping.external_url) return;
    let active = true;
    const request = ['html', 'zip', 'scorm', 'simulation'].includes(mapping.resource_type)
      ? launchPublishedResource(releaseId, mapping.resource_version_id).then((result) => {
        if (!result.launchable || !result.launch_url) throw new Error(result.message || 'Resource cannot be launched.');
        return result.launch_url;
      })
      : previewPublishedResource(releaseId, mapping.resource_version_id).then((result) => result.url);
    void request.then((url) => { if (active) setSource(url); }).catch((requestError) => {
      if (active) setError(getApiErrorDetails(requestError).message);
    });
    return () => { active = false; };
  }, [mapping.external_url, mapping.resource_type, mapping.resource_version_id, releaseId]);

  if (error) return <div className="grid h-full place-items-center bg-slate-950 p-3 text-center text-xs text-white">{error}</div>;
  if (!source) return <div className="grid h-full place-items-center bg-slate-950 text-xs text-white">Loading resource…</div>;
  if (mapping.resource_type === 'image') return <img src={source} alt={mapping.name} className="h-full w-full object-contain" />;
  if (mapping.resource_type === 'video' || mapping.mime_type?.startsWith('video/')) return <video src={source} controls className="h-full w-full" />;
  if (mapping.resource_type === 'presentation') return <div className="grid h-full place-items-center bg-gradient-to-br from-orange-50 to-amber-100 p-4 text-center"><div><Presentation className="mx-auto text-orange-700" size={42} /><p className="mt-2 font-semibold text-slate-900">{mapping.name}</p><p className="mt-1 text-xs text-slate-600">Open this PPSX file in Microsoft PowerPoint or another compatible app.</p><a href={source} download className="mt-3 inline-flex items-center gap-1 rounded-lg bg-orange-700 px-3 py-2 text-xs font-semibold text-white"><Download size={14} />Download and open</a></div></div>;
  return <div className="relative h-full w-full bg-white"><iframe src={source} title={mapping.name} className="h-full w-full border-0" sandbox="allow-scripts allow-forms allow-popups allow-pointer-lock" allowFullScreen />{mapping.resource_type === 'external_link' && <a href={source} target="_blank" rel="noreferrer" className="absolute right-2 top-2 rounded bg-white px-2 py-1 text-xs font-semibold text-blue-900 shadow"><ExternalLink size={13} className="inline" /> Open</a>}</div>;
}

function PublishedCanvas({ releaseId, screen }: { releaseId: number; screen: PublishedScreen }) {
  const layout = layoutFor(screen);
  const slide: Slide = {
    title: screen.title,
    creationMode: layout ? 'layout' : 'blank',
    objects: screen.elements.map((element) => ({
      id: element.element_key,
      slotId: element.slot_id || '',
      type: element.element_type as ObjectType,
      text: textFrom(element.content_json || {}),
      url: typeof element.content_json?.url === 'string' ? element.content_json.url : undefined,
      altText: typeof element.content_json?.altText === 'string' ? element.content_json.altText : undefined,
      caption: typeof element.content_json?.caption === 'string' ? element.content_json.caption : undefined,
    })),
  };
  const overlays = Object.fromEntries(screen.elements
    .filter((element) => element.resource_mapping)
    .map((element) => [element.element_key, <PublishedResource key={element.element_key} releaseId={releaseId} mapping={element.resource_mapping!} />]));

  if (!layout) return <div className="flex h-full min-h-[360px] flex-col justify-center rounded-xl bg-white p-10 shadow-xl"><h2 className="text-3xl font-bold text-slate-900">{screen.title}</h2><div className="mt-6 space-y-4">{screen.elements.map((element) => <div key={element.element_key} className="rounded-lg border border-slate-200 p-4 text-lg text-slate-700">{textFrom(element.content_json || {}) || element.element_type}</div>)}</div></div>;
  return <SlideCanvas layout={layout} slide={slide} objectOverlays={overlays} />;
}

export default function StudioSessionPlayerPage() {
  const params = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const playerRef = useRef<HTMLDivElement>(null);
  const [release, setRelease] = useState<PublishedRelease | null>(null);
  const [screenId, setScreenId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [branchRunId, setBranchRunId] = useState<number | null>(null);
  const [branchDepth, setBranchDepth] = useState(0);
  const [localBranchStack, setLocalBranchStack] = useState<number[]>([]);
  const [branchBusy, setBranchBusy] = useState(false);

  const sessionId = Number(params.sessionId);
  const releaseNumber = Number(params.releaseNumber);

  useEffect(() => {
    if (!Number.isInteger(sessionId) || !Number.isInteger(releaseNumber)) {
      setError('Invalid published Session route.'); setLoading(false); return;
    }
    void getPublishedRelease(sessionId, releaseNumber)
      .then((data) => {
        setRelease(data);
        const first = [...data.manifest.screens].sort((a, b) => a.display_order - b.display_order)[0];
        setScreenId(first?.screen_id ?? null);
      })
      .catch((requestError) => setError(getApiErrorDetails(requestError).message))
      .finally(() => setLoading(false));
  }, [releaseNumber, sessionId]);

  const screens = useMemo(() => [...(release?.manifest.screens || [])].sort((a, b) => a.display_order - b.display_order), [release]);
  const currentIndex = screens.findIndex((screen) => screen.screen_id === screenId);
  const screen = currentIndex >= 0 ? screens[currentIndex] : null;
  const isTrackedBranchUser = user?.role === 'teacher';

  const openBranch = async (branch: PublishedBranch) => {
    if (!release || !screen) return;
    setBranchBusy(true); setError('');
    try {
      if (isTrackedBranchUser) {
        let runId = branchRunId;
        if (!runId) {
          const run = await createBranchRun(release.id, release.session_id, screen.screen_id);
          runId = run.id;
          setBranchRunId(runId);
        }
        const result = await enterBranch(runId, branch.branch_key, {
          session_id: release.session_id,
          screen_id: screen.screen_id,
          release_id: release.id,
          reveal_state: {}, annotations: [], interaction_state: {}, focus: {},
        });
        setBranchDepth(result.run.current_depth);
        setScreenId(result.destination.screen_id);
      } else {
        setLocalBranchStack((stack) => [...stack, screen.screen_id]);
        setScreenId(branch.destination_screen_id);
      }
    } catch (requestError) {
      setError(getApiErrorDetails(requestError).message);
    } finally { setBranchBusy(false); }
  };

  const returnToOrigin = async () => {
    setBranchBusy(true); setError('');
    try {
      if (isTrackedBranchUser && branchRunId) {
        const result = await returnFromBranch(branchRunId);
        setBranchDepth(result.run.current_depth);
        setScreenId(result.restored_origin.screen_id);
      } else {
        const origin = localBranchStack.at(-1);
        if (origin) setScreenId(origin);
        setLocalBranchStack((stack) => stack.slice(0, -1));
      }
    } catch (requestError) {
      setError(getApiErrorDetails(requestError).message);
    } finally { setBranchBusy(false); }
  };

  const exitPlayer = async () => {
    if (branchRunId) {
      try {
        if (branchDepth === 0) await completeBranchRun(branchRunId);
        else await abandonBranchRun(branchRunId);
      } catch { /* Navigation should not be blocked by audit cleanup. */ }
    }
    navigate(-1);
  };

  const inBranch = branchDepth > 0 || localBranchStack.length > 0;
  return <StudioShell title="Session Player" subtitle={release ? `Published Release ${release.release_number}` : undefined} scrollContent={false} wrapContent={false}>
    <div ref={playerRef} className="flex h-full min-h-0 flex-col bg-slate-900 text-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3"><button type="button" onClick={() => void exitPlayer()} className="rounded-lg p-2 hover:bg-white/10" aria-label="Exit player"><ArrowLeft size={20} /></button><div><h2 className="font-semibold">{release?.manifest.session?.title || 'Published Session'}</h2><p className="text-xs text-slate-300">{screen ? `Screen ${screen.screen_number}: ${screen.title}` : 'Loading presentation'}</p></div></div>
        <button type="button" onClick={() => void playerRef.current?.requestFullscreen()} className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold hover:bg-white/10"><Maximize2 size={16} />Full screen</button>
      </header>
      <main className="min-h-0 flex-1 p-4">
        {loading && <div className="grid h-full place-items-center text-slate-300">Loading published Session…</div>}
        {!loading && error && !release && <div className="grid h-full place-items-center"><div className="rounded-xl border border-red-400/30 bg-red-950/40 p-6 text-red-100">{error}</div></div>}
        {!loading && release && screen && <PublishedCanvas releaseId={release.id} screen={screen} />}
        {!loading && release && !screen && <div className="grid h-full place-items-center text-slate-300">This release contains no Screens.</div>}
      </main>
      {error && release && <p className="mx-4 mb-2 rounded-lg bg-red-950/70 px-3 py-2 text-sm text-red-100">{error}</p>}
      {screen && screen.branches.length > 0 && <div className="flex flex-wrap items-center gap-2 border-t border-white/10 px-4 py-2"><span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Branches</span>{screen.branches.map((branch) => <button key={branch.branch_key} type="button" disabled={branchBusy} onClick={() => void openBranch(branch)} className="rounded-full bg-blue-600 px-3 py-1.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50">{branch.branch_key}</button>)}</div>}
      <footer className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
        {inBranch ? <button type="button" disabled={branchBusy} onClick={() => void returnToOrigin()} className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50"><CornerUpLeft size={18} />Return to main Screen</button> : <button type="button" disabled={currentIndex <= 0} onClick={() => setScreenId(screens[currentIndex - 1]?.screen_id)} className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2 font-semibold disabled:opacity-30"><ChevronLeft size={18} />Previous</button>}
        <span className="text-sm text-slate-300">{currentIndex + 1} / {screens.length}</span>
        <button type="button" disabled={inBranch || currentIndex < 0 || currentIndex >= screens.length - 1} onClick={() => setScreenId(screens[currentIndex + 1]?.screen_id)} className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2 font-semibold disabled:opacity-30">Next<ChevronRight size={18} /></button>
      </footer>
    </div>
  </StudioShell>;
}
