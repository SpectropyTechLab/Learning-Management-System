import { useEffect, useMemo, useRef, useState } from 'react';
import type { ActivityDocument, SimulationId } from './activityBuilderModel';

type Control = [key: string, label: string, min: number, max: number, initial: number, step: number];
type Model = { name: string; controls: Control[] };
type Values = Record<string, number>;

export const ACTIVITY_SIMULATION_MODELS: Record<SimulationId, Model> = {
  projectile: { name: 'Projectile motion', controls: [['u', 'Speed u (m/s)', 5, 40, 20, 1], ['th', 'Angle θ (°)', 5, 85, 45, 1], ['g', 'g (m/s²)', 1.6, 25, 9.8, .1]] },
  pendulum: { name: 'Simple pendulum', controls: [['L', 'Length L (m)', .2, 3, 1, .05], ['g', 'g (m/s²)', 1.6, 25, 9.8, .1], ['A', 'Amplitude (°)', 5, 40, 15, 1]] },
  ohm: { name: 'Ohm’s law circuit', controls: [['V', 'Voltage V (V)', 0, 24, 12, .5], ['R', 'Resistance R (Ω)', 1, 50, 10, 1]] },
  wave: { name: 'Wave on a string', controls: [['A', 'Amplitude', .2, 1, .6, .05], ['f', 'Frequency (Hz)', .2, 3, 1, .1], ['lam', 'Wavelength λ', .5, 4, 2, .1]] },
  gas: { name: 'Ideal gas (PV = nRT)', controls: [['n', 'Moles n', .5, 4, 1, .1], ['T', 'Temperature (K)', 100, 800, 300, 10], ['V', 'Volume (L)', 5, 50, 22.4, .1]] },
  ph: { name: 'pH scale / dilution', controls: [['c', '[H⁺] exponent (10ˣ)', -14, 0, -3, 1]] },
  quad: { name: 'Quadratic graph y = ax² + bx + c', controls: [['a', 'a', -3, 3, 1, .1], ['b', 'b', -6, 6, 0, .1], ['c', 'c', -6, 6, -2, .1]] },
  trig: { name: 'Unit circle / trig', controls: [['t', 'Angle θ (°)', 0, 360, 30, 1]] },
  enzyme: { name: 'Enzyme kinetics (Michaelis–Menten)', controls: [['vmax', 'Vmax', 1, 10, 6, .1], ['km', 'Km', .2, 5, 1.5, .1], ['s', '[S] marker', 0, 10, 3, .1]] },
  pop: { name: 'Population growth (logistic)', controls: [['r', 'Growth rate r', .1, 1.5, .6, .05], ['K', 'Carrying capacity K', 50, 500, 300, 10]] },
  lens: { name: 'Convex lens image formation', controls: [['f', 'Focal length f (cm)', 5, 30, 12, 1], ['u', 'Object distance u (cm)', 4, 60, 30, 1]] },
  spring: { name: 'Spring–mass SHM', controls: [['k', 'Spring constant k (N/m)', 5, 100, 40, 1], ['m', 'Mass m (kg)', .1, 5, 1, .1], ['A', 'Amplitude (m)', .2, 1, .6, .05]] },
  decay: { name: 'Radioactive decay / half-life', controls: [['h', 'Half-life (s)', 1, 10, 3, .5], ['N0', 'Initial nuclei N₀', 100, 1000, 400, 50]] },
  titr: { name: 'Acid–base titration curve', controls: [['vb', 'NaOH added (mL)', 0, 50, 10, .5]] },
  linear: { name: 'Straight line y = mx + c', controls: [['m', 'Slope m', -4, 4, 1, .1], ['c', 'Intercept c', -6, 6, 2, .1]] },
  coin: { name: 'Probability: coin tosses', controls: [['n', 'Number of tosses', 10, 2000, 500, 10], ['p', 'P(heads)', .1, .9, .5, .05]] },
  prey: { name: 'Predator–prey cycles', controls: [['a', 'Prey growth α', .4, 1.6, 1, .05], ['g', 'Predator death γ', .2, 1.2, .6, .05]] },
  mendel: { name: 'Monohybrid cross (Punnett)', controls: [['p1', 'Parent 1 (0=TT 1=Tt 2=tt)', 0, 2, 1, 1], ['p2', 'Parent 2 (0=TT 1=Tt 2=tt)', 0, 2, 1, 1]] },
};

export function drawActivitySimulation(ctx: CanvasRenderingContext2D, width: number, height: number, id: SimulationId, p: Values, time: number, accent: string) {
  ctx.clearRect(0, 0, width, height);
  const u = Math.min(width, height) / 100;
  const line = (x1: number, y1: number, x2: number, y2: number, colour = 'rgba(233,236,241,.7)', size = 2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = colour; ctx.lineWidth = size; ctx.stroke(); };
  const text = (value: string, x: number, y: number, size = u * 4, colour = 'rgba(255,255,255,.92)', align: CanvasTextAlign = 'left') => { ctx.fillStyle = colour; ctx.font = `700 ${size}px Inter, sans-serif`; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(value, x, y); };
  const axes = () => { line(u * 10, height - u * 13, width - u * 6, height - u * 13); line(u * 10, height - u * 13, u * 10, u * 8); return { x: u * 10, y: height - u * 13, w: width - u * 16, h: height - u * 21 }; };
  const graph = (fn: (x: number) => number, minX: number, maxX: number, minY: number, maxY: number, colour = accent) => { const box = axes(); ctx.beginPath(); for (let i = 0; i <= 180; i += 1) { const x = minX + (maxX - minX) * i / 180; const y = fn(x); const px = box.x + i / 180 * box.w; const py = box.y - (y - minY) / (maxY - minY) * box.h; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.strokeStyle = colour; ctx.lineWidth = 3; ctx.stroke(); return box; };

  if (id === 'projectile') {
    const angle = p.th * Math.PI / 180;
    const flight = 2 * p.u * Math.sin(angle) / p.g;
    const range = p.u ** 2 * Math.sin(2 * angle) / p.g;
    const maxHeight = (p.u * Math.sin(angle)) ** 2 / (2 * p.g);
    const box = axes();
    const pixelsPerMetre = Math.min(box.w / Math.max(1, range * 1.06), box.h / Math.max(1, maxHeight * 1.28));
    const positionAt = (elapsed: number) => {
      const x = p.u * Math.cos(angle) * elapsed;
      const y = Math.max(0, p.u * Math.sin(angle) * elapsed - .5 * p.g * elapsed * elapsed);
      return { x: box.x + x * pixelsPerMetre, y: box.y - y * pixelsPerMetre };
    };
    ctx.beginPath();
    for (let index = 0; index <= 80; index += 1) {
      const point = positionAt(flight * index / 80);
      if (index) ctx.lineTo(point.x, point.y); else ctx.moveTo(point.x, point.y);
    }
    ctx.strokeStyle = 'rgba(255,255,255,.45)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
    const elapsed = Math.min(time % (flight + .6), flight);
    const ball = positionAt(elapsed);
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, u * 2, 0, Math.PI * 2);
    ctx.fillStyle = accent;
    ctx.fill();
    text(`Range ${range.toFixed(1)} m · Height ${maxHeight.toFixed(1)} m`, u * 5, u * 6);
    return;
  }
  if (id === 'pendulum') { const omega = Math.sqrt(p.g / p.L); const a = p.A * Math.PI / 180 * Math.cos(omega * time); const x = width / 2; const y = u * 12; const length = Math.min(height * .66, u * (25 * p.L + 10)); const bx = x + Math.sin(a) * length; const by = y + Math.cos(a) * length; line(x - u * 16, y, x + u * 16, y, undefined, 4); line(x, y, bx, by, undefined, 3); ctx.beginPath(); ctx.arc(bx, by, u * 4, 0, Math.PI * 2); ctx.fillStyle = accent; ctx.fill(); text(`T = ${(2 * Math.PI / omega).toFixed(2)} s`, u * 5, height - u * 7); return; }
  if (id === 'ohm') { const current = p.V / p.R; const cx = width / 2; const cy = height * .48; ctx.strokeStyle = accent; ctx.lineWidth = 4; ctx.strokeRect(cx - u * 34, cy - u * 21, u * 68, u * 42); text(`${p.R} Ω`, cx, cy - u * 28, u * 4, undefined, 'center'); text(`I = ${current.toFixed(2)} A · P = ${(p.V * current).toFixed(1)} W`, u * 6, height - u * 8); return; }
  if (id === 'wave') { ctx.beginPath(); for (let x = 0; x <= width - u * 8; x += 2) { const y = height / 2 - p.A * u * 25 * Math.sin(2 * Math.PI * (x / (u * 20) / p.lam - p.f * time)); if (x) ctx.lineTo(u * 4 + x, y); else ctx.moveTo(u * 4, y); } ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.stroke(); text(`v = fλ = ${(p.f * p.lam).toFixed(2)}`, u * 5, height - u * 7); return; }
  if (id === 'gas') { const pressure = p.n * .0821 * p.T / p.V; const x = width * .12; const y = u * 12; const w = width * (.18 + .48 * p.V / 50); const h = height - u * 27; ctx.strokeStyle = '#fff'; ctx.strokeRect(x, y, w, h); for (let i = 0; i < Math.round(p.n * 18); i += 1) { ctx.beginPath(); ctx.arc(x + ((Math.abs(Math.sin(i * 13)) + time * .08 * (i % 3 + 1)) % 1) * w, y + ((Math.abs(Math.sin(i * 79)) + time * .07 * (i % 2 + 1)) % 1) * h, u * 1.2, 0, Math.PI * 2); ctx.fillStyle = accent; ctx.fill(); } text(`P = ${pressure.toFixed(2)} atm`, u * 5, height - u * 7); return; }
  if (id === 'ph') { const ph = -p.c; const w = width - u * 12; for (let i = 0; i <= 14; i += 1) { ctx.fillStyle = `hsla(${i < 7 ? i * 15 : 120 + (i - 7) * 25},70%,50%,.8)`; ctx.fillRect(u * 6 + i * w / 15, height * .36, w / 15 - 2, u * 14); text(String(i), u * 6 + i * w / 15 + w / 30, height * .58, u * 3, undefined, 'center'); } const x = u * 6 + ph * w / 15 + w / 30; ctx.beginPath(); ctx.moveTo(x, height * .34); ctx.lineTo(x - u * 2.5, height * .25); ctx.lineTo(x + u * 2.5, height * .25); ctx.fillStyle = '#fff'; ctx.fill(); text(`pH = ${ph}`, u * 6, height - u * 10); return; }
  if (id === 'quad') { graph((x) => p.a * x * x + p.b * x + p.c, -8, 8, -10, 10); text(`D = ${(p.b ** 2 - 4 * p.a * p.c).toFixed(2)}`, u * 5, u * 6); return; }
  if (id === 'linear') { graph((x) => p.m * x + p.c, -8, 8, -10, 10); text(`y = ${p.m.toFixed(1)}x + ${p.c.toFixed(1)}`, u * 5, u * 6); return; }
  if (id === 'trig') { const cx = width * .42; const cy = height / 2; const radius = Math.min(width, height) * .32; const a = p.t * Math.PI / 180; line(cx - radius, cy, cx + radius, cy); line(cx, cy - radius, cx, cy + radius); ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.strokeStyle = '#fff'; ctx.stroke(); line(cx, cy, cx + Math.cos(a) * radius, cy - Math.sin(a) * radius, accent, 3); text(`sin ${Math.sin(a).toFixed(3)}`, width * .77, cy - u * 7, u * 4); text(`cos ${Math.cos(a).toFixed(3)}`, width * .77, cy, u * 4); return; }
  if (id === 'enzyme') { graph((s) => p.vmax * s / (p.km + s), 0, 10, 0, 10); text(`v = ${(p.vmax * p.s / (p.km + p.s)).toFixed(2)}`, u * 5, u * 6); return; }
  if (id === 'pop') { graph((t) => p.K / (1 + (p.K - 10) / 10 * Math.exp(-p.r * t)), 0, 30, 0, 500); text(`K = ${p.K}`, u * 5, u * 6); return; }
  if (id === 'lens') { const ox = width / 2; const oy = height * .58; line(u * 2, oy, width - u * 2, oy); ctx.beginPath(); ctx.ellipse(ox, oy, u * 1.7, height * .36, 0, 0, Math.PI * 2); ctx.strokeStyle = accent; ctx.stroke(); const scale = Math.min(width / 150, height / 70); const objectX = ox - p.u * scale; line(objectX, oy, objectX, oy - height * .2, '#fff', 4); const v = Math.abs(p.u - p.f) < .01 ? Infinity : 1 / (1 / p.f - 1 / p.u); if (Number.isFinite(v)) { const ix = ox + v * scale; const ih = height * .2 * -v / p.u; line(ix, oy, ix, oy - ih, '#ff8a4c', 4); line(objectX, oy - height * .2, ix, oy - ih, '#f5c451'); text(`v = ${v.toFixed(1)} cm · m = ${(-v / p.u).toFixed(2)}`, u * 4, u * 6); } return; }
  if (id === 'spring') { const omega = Math.sqrt(p.k / p.m); const bx = width * .58 + p.A * Math.cos(omega * time) * width * .22; const cy = height / 2; ctx.beginPath(); ctx.moveTo(u * 8, cy); for (let i = 1; i < 15; i += 1) ctx.lineTo(u * 8 + (bx - u * 16) * i / 15, cy + (i % 2 ? -1 : 1) * u * 4); ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.fillStyle = accent; ctx.fillRect(bx - u * 8, cy - u * 8, u * 16, u * 16); text(`T = ${(2 * Math.PI / omega).toFixed(2)} s`, u * 5, u * 7); return; }
  if (id === 'decay') { graph((t) => p.N0 * Math.pow(.5, t / p.h), 0, p.h * 5, 0, p.N0); text(`Half-life ${p.h} s · N₀ ${p.N0}`, u * 5, u * 6); return; }
  if (id === 'titr') { const ph = (v: number) => Math.max(0, Math.min(14, 7 + (v - 25) * .5)); graph(ph, 0, 50, 0, 14); text(`NaOH ${p.vb.toFixed(1)} mL · pH ${ph(p.vb).toFixed(2)}`, u * 5, u * 6); return; }
  if (id === 'coin') { graph((n) => p.p + Math.sin(n * 1.7) * .4 / Math.sqrt(Math.max(1, n)), 1, p.n, 0, 1); text(`${p.n} tosses · P(heads) ${p.p.toFixed(2)}`, u * 5, u * 6); return; }
  if (id === 'prey') { const box = graph((t) => 50 + 25 * Math.sin(p.a * t), 0, 20, 0, 100, '#3ddc97'); ctx.beginPath(); for (let i = 0; i <= 180; i += 1) { const y = 45 + 20 * Math.sin(p.a * i / 9 - 1.25) * p.g; if (i) ctx.lineTo(box.x + i / 180 * box.w, box.y - y / 100 * box.h); else ctx.moveTo(box.x, box.y - y / 100 * box.h); } ctx.strokeStyle = '#ff6b6b'; ctx.stroke(); text('■ Prey', u * 5, u * 6, u * 3.5, '#3ddc97'); text('■ Predator', u * 27, u * 6, u * 3.5, '#ff6b6b'); return; }
  const genes = ['TT', 'Tt', 'tt']; const first = genes[Math.round(p.p1)]; const second = genes[Math.round(p.p2)]; const size = Math.min(width * .2, height * .27); const x0 = width / 2 - size; const y0 = height * .2; const counts: Record<string, number> = {}; text(`${first} × ${second}`, u * 5, u * 6, u * 5); for (let row = 0; row < 2; row += 1) for (let column = 0; column < 2; column += 1) { const gene = [first[column], second[row]].sort().join(''); counts[gene] = (counts[gene] || 0) + 1; ctx.strokeStyle = '#fff'; ctx.strokeRect(x0 + column * size, y0 + row * size, size, size); text(gene, x0 + column * size + size / 2, y0 + row * size + size / 2, u * 6, undefined, 'center'); } text(`TT : Tt : tt = ${counts.TT || 0} : ${counts.Tt || 0} : ${counts.tt || 0}`, u * 5, height - u * 8);
}

function SimulationCanvas({ model, values, accent }: { model: SimulationId; values: Values; accent: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const valuesRef = useRef(values); valuesRef.current = values;
  useEffect(() => { const canvas = canvasRef.current; if (!canvas) return; let frame = 0; const started = performance.now(); const resize = () => { const rect = canvas.getBoundingClientRect(); const ratio = window.devicePixelRatio || 1; canvas.width = Math.max(1, Math.round(rect.width * ratio)); canvas.height = Math.max(1, Math.round(rect.height * ratio)); }; const observer = new ResizeObserver(resize); observer.observe(canvas); resize(); const render = (now: number) => { const context = canvas.getContext('2d'); const ratio = window.devicePixelRatio || 1; if (context) { context.setTransform(ratio, 0, 0, ratio, 0, 0); drawActivitySimulation(context, canvas.width / ratio, canvas.height / ratio, model, valuesRef.current, (now - started) / 1000, accent); } frame = requestAnimationFrame(render); }; frame = requestAnimationFrame(render); return () => { observer.disconnect(); cancelAnimationFrame(frame); }; }, [accent, model]);
  return <canvas ref={canvasRef} className="h-full min-h-0 w-full" aria-label={`${ACTIVITY_SIMULATION_MODELS[model].name} interactive model`}/>;
}

export default function ActivitySimulationPreview({ activity, question, answer, revealed, marked, onMark }: { activity: ActivityDocument; question: string; answer: string; revealed: boolean; marked: boolean; onMark: (correct: boolean) => void }) {
  const modelKey = activity.simulation || 'projectile'; const model = ACTIVITY_SIMULATION_MODELS[modelKey];
  const [saved, setSaved] = useState<Partial<Record<SimulationId, Values>>>({});
  const values = useMemo(() => Object.fromEntries(model.controls.map(([key, , , , initial]) => [key, saved[modelKey]?.[key] ?? initial])), [model, modelKey, saved]);
  const update = (key: string, value: number) => setSaved((current) => ({ ...current, [modelKey]: { ...current[modelKey], [key]: value } }));
  return <div className="grid h-full min-h-0 w-full grid-cols-[42%_58%]">
    <section className="min-h-0 p-2"><SimulationCanvas model={modelKey} values={values} accent={activity.accent}/></section>
    <section className="min-h-0 overflow-auto border-l border-white/10 px-5 py-4"><p className="text-sm text-slate-400">{model.name}</p><h2 className="mt-2 text-xl font-black">{question || 'Change the controls and observe.'}</h2><div className="mt-5 grid gap-4">{model.controls.map(([key, label, min, max, initial, step]) => <label key={key} className="grid grid-cols-[minmax(105px,1fr)_minmax(90px,1.3fr)_44px] items-center gap-2 text-xs text-slate-200"><span>{label}</span><input type="range" min={min} max={max} step={step} value={values[key] ?? initial} onChange={(event) => update(key, Number(event.target.value))} style={{ accentColor: activity.accent }}/><output className="text-right font-bold">{Number(values[key]).toFixed(step < 1 ? 1 : 0)}</output></label>)}</div>{revealed ? <><div className="mt-5 border-l-4 border-emerald-400 p-3 text-sm text-emerald-100">{answer || 'Discuss the observation and prediction.'}</div>{!marked ? <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => onMark(true)} className="rounded-lg border border-emerald-400 px-3 py-2 text-sm font-bold text-emerald-200">Mark correct (+{activity.points})</button><button type="button" onClick={() => onMark(false)} className="rounded-lg border border-red-400 px-3 py-2 text-sm font-bold text-red-200">Needs revision (-{activity.negativeMarks})</button></div> : <p className="mt-4 text-xs text-slate-400">This prediction has been marked.</p>}</> : <p className="mt-5 text-xs text-slate-400">Predict → change sliders → Next to reveal explanation</p>}</section>
  </div>;
}
