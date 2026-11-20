import { useEffect, useRef } from 'react';
import type { SimulationDocument } from './simulationStudioModel';
import { drawNativeSimulation } from './nativeSimulationRenderers';
import { drawCatalogSimulation } from './catalogSimulationRenderer';

type Props = { simulation: SimulationDocument; paused?: boolean; resetToken?: number; onChange?: (simulation: SimulationDocument) => void };
type Palette = { accent: string; text: string; muted: string; red: string; green: string; yellow: string };
type ElementHitbox = { atomicNumber: number; x: number; y: number; width: number; height: number };

const palette: Palette = {
  accent: '#4fa3ff', text: '#e9ebef', muted: '#768196', red: '#ff5e7e', green: '#2ecc71', yellow: '#f1c40f',
};

const arrow = (context: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string) => {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  context.strokeStyle = color; context.fillStyle = color; context.lineWidth = 3;
  context.beginPath(); context.moveTo(x1, y1); context.lineTo(x2, y2); context.stroke();
  context.beginPath(); context.moveTo(x2, y2);
  context.lineTo(x2 - 12 * Math.cos(angle - 0.45), y2 - 12 * Math.sin(angle - 0.45));
  context.lineTo(x2 - 12 * Math.cos(angle + 0.45), y2 - 12 * Math.sin(angle + 0.45));
  context.closePath(); context.fill();
};

const label = (context: CanvasRenderingContext2D, text: string, x: number, y: number, color = palette.text, align: CanvasTextAlign = 'left', size = 18) => {
  context.fillStyle = color; context.textAlign = align; context.textBaseline = 'middle'; context.font = `600 ${size}px Inter, sans-serif`; context.fillText(text, x, y);
};

const grid = (context: CanvasRenderingContext2D, width: number, height: number) => {
  context.strokeStyle = '#20324a'; context.lineWidth = 1;
  for (let x = 0; x <= width; x += 40) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke(); }
  for (let y = 0; y <= height; y += 40) { context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke(); }
};

const drawSimulation = (context: CanvasRenderingContext2D, width: number, height: number, time: number, simulation: SimulationDocument, hitboxes: ElementHitbox[]) => {
  const p = simulation.parameters;
  const o = simulation.options;
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#09111d'; context.fillRect(0, 0, width, height);
  if (o.grid) grid(context, width, height);
  const cx = width / 2; const cy = height / 2;

  if (drawNativeSimulation(context, width, height, time, simulation)) return;
  if (drawCatalogSimulation(context, width, height, time, simulation)) return;

  if (simulation.kind === 'scene' && simulation.scene) {
    context.fillStyle = simulation.scene.background; context.fillRect(0, 0, width, height);
    const controls = new Map((simulation.controls || []).map((control) => [control.key, control]));
    simulation.scene.nodes.forEach((source) => {
      const node = { ...source } as typeof source & Record<string, unknown>;
      let motionSpeed = source.motion?.speed || 0; let motionAmplitude = source.motion?.amplitude || 0;
      source.bindings?.forEach((binding) => {
        const control = controls.get(binding.parameter); if (!control) return;
        const raw = simulation.parameters[binding.parameter] ?? control.defaultValue;
        const ratio = control.max === control.min ? 0 : (raw - control.min) / (control.max - control.min);
        const resolved = binding.outputMin + ratio * (binding.outputMax - binding.outputMin);
        if (binding.property === 'motionSpeed') motionSpeed = resolved;
        else if (binding.property === 'motionAmplitude') motionAmplitude = resolved;
        else node[binding.property] = resolved;
      });
      let nx = Number(node.x); let ny = Number(node.y); let scale = 1; let rotation = 0;
      const motion = source.motion;
      if (motion) {
        const phase = time * motionSpeed + (motion.phase || 0);
        if (motion.type === 'orbit') { nx = (motion.centerX ?? nx) + (motion.radius || 0.2) * Math.cos(phase); ny = (motion.centerY ?? ny) + (motion.radius || 0.2) * Math.sin(phase); }
        if (motion.type === 'oscillate') { const amount = Math.sin(phase) * motionAmplitude; if (motion.axis !== 'y') nx += amount; if (motion.axis !== 'x') ny += amount; }
        if (motion.type === 'drift') { const amount = ((phase % 2) + 2) % 2 - 1; if (motion.axis !== 'y') nx += amount * motionAmplitude; if (motion.axis !== 'x') ny += amount * motionAmplitude; }
        if (motion.type === 'pulse') scale = 1 + Math.sin(phase) * motionAmplitude;
        if (motion.type === 'rotate') rotation = phase;
      }
      const px = nx * width; const py = ny * height; const px2 = Number(node.x2) * width; const py2 = Number(node.y2) * height;
      const nw = Number(node.width) * width; const nh = Number(node.height) * height; const radius = Number(node.radius) * Math.min(width, height);
      context.save(); context.globalAlpha = Number(node.opacity ?? 1); context.translate(px, py); context.rotate(rotation); context.scale(scale, scale);
      context.fillStyle = String(node.fill || palette.accent); context.strokeStyle = String(node.stroke || palette.text); context.lineWidth = Number(node.lineWidth || 3);
      if (node.type === 'circle') { context.beginPath(); context.arc(0, 0, radius, 0, Math.PI * 2); context.fill(); context.stroke(); }
      else if (node.type === 'ellipse') { context.beginPath(); context.ellipse(0, 0, nw / 2, nh / 2, 0, 0, Math.PI * 2); context.fill(); context.stroke(); }
      else if (node.type === 'rect') { context.beginPath(); context.roundRect(-nw / 2, -nh / 2, nw, nh, Math.min(18, nw / 8, nh / 8)); context.fill(); context.stroke(); }
      else if (node.type === 'line' || node.type === 'arrow') { context.beginPath(); context.moveTo(0, 0); context.lineTo(px2 - px, py2 - py); context.stroke(); if (node.type === 'arrow') arrow(context, 0, 0, px2 - px, py2 - py, String(node.stroke || palette.text)); }
      else if (node.type === 'text') { context.fillStyle = String(node.fill || palette.text); context.textAlign = 'center'; context.textBaseline = 'middle'; context.font = `700 ${Number(node.fontSize || 24)}px Inter, sans-serif`; context.fillText(String(node.text || ''), 0, 0); }
      else if (node.type === 'wave') { context.beginPath(); for (let index = 0; index <= 120; index += 1) { const localX = -nw / 2 + nw * index / 120; const localY = Math.sin(index / 120 * Math.PI * 4 - time * motionSpeed) * nh / 2; index ? context.lineTo(localX, localY) : context.moveTo(localX, localY); } context.stroke(); }
      else if (node.type === 'polygon' && node.points?.length) { context.beginPath(); node.points.forEach(([pointX, pointY], index) => { const localX = (pointX - nx) * width; const localY = (pointY - ny) * height; index ? context.lineTo(localX, localY) : context.moveTo(localX, localY); }); context.closePath(); context.fill(); context.stroke(); }
      context.restore();
    });
  } else if (simulation.kind === 'projectile') {
    const angle = p.a * Math.PI / 180; const duration = 2 * p.v * Math.sin(angle) / p.g;
    const range = p.v * p.v * Math.sin(2 * angle) / p.g; const maximum = (p.v * Math.sin(angle)) ** 2 / (2 * p.g);
    const ox = width * 0.07; const oy = height * 0.82; const scale = Math.min(width * 0.83 / Math.max(range, 1), height * 0.6 / Math.max(maximum, 0.5));
    const current = Math.min(time % (duration + 1.2), duration); const xAt = (value: number) => ox + p.v * Math.cos(angle) * value * scale; const yAt = (value: number) => oy - (p.v * Math.sin(angle) * value - 0.5 * p.g * value * value) * scale;
    context.strokeStyle = palette.muted; context.beginPath(); context.moveTo(0, oy); context.lineTo(width, oy); context.stroke();
    context.setLineDash([6, 8]); context.strokeStyle = '#516176'; context.beginPath(); for (let q = 0; q <= duration; q += duration / 80) q ? context.lineTo(xAt(q), yAt(q)) : context.moveTo(xAt(q), yAt(q)); context.stroke(); context.setLineDash([]);
    if (o.trail) { context.strokeStyle = palette.accent; context.lineWidth = 4; context.beginPath(); for (let q = 0; q <= current; q += duration / 100) q ? context.lineTo(xAt(q), yAt(q)) : context.moveTo(xAt(q), yAt(q)); context.stroke(); }
    const x = xAt(current); const y = yAt(current); context.fillStyle = palette.accent; context.beginPath(); context.arc(x, y, 12, 0, Math.PI * 2); context.fill();
    if (o.vectors) { const vx = p.v * Math.cos(angle); const vy = p.v * Math.sin(angle) - p.g * current; arrow(context, x, y, x + vx * 3, y, palette.green); arrow(context, x, y, x, y - vy * 3, palette.red); }
    if (o.labels) { label(context, `Range ${range.toFixed(1)} m`, width - 28, 32, palette.text, 'right'); label(context, `Maximum height ${maximum.toFixed(1)} m`, width - 28, 58, palette.muted, 'right', 15); }
  } else if (simulation.kind === 'pendulum') {
    const omega = Math.sqrt(p.g / p.L); const theta = p.th * Math.PI / 180 * Math.cos(omega * time); const pivotY = height * 0.12; const length = height * (0.24 + 0.5 * p.L / 4); const x = cx + length * Math.sin(theta); const y = pivotY + length * Math.cos(theta);
    context.strokeStyle = palette.text; context.lineWidth = 3; context.beginPath(); context.moveTo(cx, pivotY); context.lineTo(x, y); context.stroke(); context.fillStyle = palette.accent; context.beginPath(); context.arc(x, y, 24, 0, Math.PI * 2); context.fill();
    if (o.trail) { context.strokeStyle = '#4fa3ff66'; context.lineWidth = 8; context.beginPath(); context.arc(cx, pivotY, length, Math.PI / 2 - p.th * Math.PI / 180, Math.PI / 2 + p.th * Math.PI / 180); context.stroke(); }
    if (o.vectors) { arrow(context, x, y, x, y + 90, palette.red); arrow(context, x, y, x - (x - cx) * 0.3, y - (y - pivotY) * 0.3, palette.green); }
    if (o.labels) label(context, `T = ${(2 * Math.PI / omega).toFixed(2)} s`, 24, height - 30);
  } else if (simulation.kind === 'spring') {
    const omega = Math.sqrt(p.k / p.m); const displacement = p.A * Math.cos(omega * time); const wall = width * 0.1; const equilibrium = width * 0.58; const blockX = equilibrium + displacement * width * 0.009; const y = height * 0.34;
    context.fillStyle = palette.muted; context.fillRect(wall, y - 70, 10, 140); context.strokeStyle = palette.text; context.lineWidth = 3; context.beginPath(); context.moveTo(wall + 10, y); for (let i = 1; i < 18; i += 1) context.lineTo(wall + 10 + (blockX - wall - 70) * i / 18, y + (i % 2 ? -28 : 28)); context.lineTo(blockX - 60, y); context.stroke(); context.fillStyle = palette.accent; context.fillRect(blockX - 60, y - 60, 120, 120);
    if (o.vectors) arrow(context, blockX, y, blockX - displacement * 7, y, palette.red);
    if (o.trail) { context.strokeStyle = palette.accent; context.lineWidth = 3; context.beginPath(); for (let i = 0; i <= 220; i += 1) { const q = time - 5 + 5 * i / 220; const gy = height * 0.78 - Math.cos(omega * q) * p.A * 5; i ? context.lineTo(width * 0.08 + width * 0.84 * i / 220, gy) : context.moveTo(width * 0.08, gy); } context.stroke(); }
    if (o.labels) label(context, `Period ${(2 * Math.PI / omega).toFixed(2)} s`, width - 25, 30, palette.text, 'right');
  } else if (simulation.kind === 'wave') {
    const baseY = cy; context.strokeStyle = palette.accent; context.lineWidth = 5; context.beginPath(); for (let i = 0; i <= 400; i += 1) { const x = width * i / 400; const world = 4 * i / 400; const y = baseY - p.A * height * 0.035 * Math.sin(2 * Math.PI * (world / p.lam - p.f * time)); i ? context.lineTo(x, y) : context.moveTo(x, y); } context.stroke();
    if (o.labels) { label(context, `v = fλ = ${(p.f * p.lam).toFixed(2)} m/s`, width - 24, height - 30, palette.text, 'right'); label(context, `T = ${(1 / p.f).toFixed(2)} s`, 24, height - 30, palette.muted); }
  } else if (simulation.kind === 'circular') {
    const radius = Math.min(width, height) * 0.32 * p.r / 4; const angle = p.w * time; const x = cx + radius * Math.cos(angle); const y = cy - radius * Math.sin(angle);
    context.setLineDash([6, 8]); context.strokeStyle = palette.muted; context.lineWidth = 2; context.beginPath(); context.arc(cx, cy, radius, 0, Math.PI * 2); context.stroke(); context.setLineDash([]); context.fillStyle = palette.accent; context.beginPath(); context.arc(x, y, 18, 0, Math.PI * 2); context.fill();
    if (o.vectors) { arrow(context, x, y, x - 80 * Math.sin(angle), y - 80 * Math.cos(angle), palette.green); arrow(context, x, y, x + (cx - x) * 0.5, y + (cy - y) * 0.5, palette.red); }
    if (o.labels) label(context, `v = ${(p.w * p.r).toFixed(2)} m/s`, width - 24, 35, palette.green, 'right');
  } else if (simulation.kind === 'periodic-table') {
    const elements = simulation.elements || [];
    const selectedAtomicNumber = Math.round(p.selectedAtomicNumber || 1);
    const selected = elements.find((element) => element.atomicNumber === selectedAtomicNumber) || elements[0];
    const detailWidth = width > 850 ? Math.min(300, width * 0.28) : 0;
    const tableWidth = width - detailWidth - 24;
    const cellWidth = Math.max(18, Math.floor((tableWidth - 20) / 18));
    const cellHeight = Math.max(22, Math.min(52, Math.floor((height - 80) / 9)));
    const startX = 10;
    const startY = 42;
    const colors: Record<string, string> = {
      'alkali metal': '#f97316', 'alkaline earth metal': '#f1c40f', 'transition metal': '#4fa3ff',
      'post-transition metal': '#22c55e', metalloid: '#14b8a6', nonmetal: '#8b5cf6', halogen: '#ec4899',
      'noble gas': '#06b6d4', lanthanoid: '#fb7185', actinoid: '#c084fc',
    };
    hitboxes.length = 0;
    elements.forEach((element) => {
      const isLanthanoid = element.atomicNumber >= 57 && element.atomicNumber <= 71;
      const isActinoid = element.atomicNumber >= 89 && element.atomicNumber <= 103;
      const column = isLanthanoid ? element.atomicNumber - 55 : isActinoid ? element.atomicNumber - 87 : element.group;
      const row = isLanthanoid ? 8 : isActinoid ? 9 : element.period;
      const x = startX + (column - 1) * cellWidth;
      const y = startY + (row - 1) * cellHeight;
      const isSelected = element.atomicNumber === selectedAtomicNumber;
      context.fillStyle = `${colors[element.category] || '#64748b'}${isSelected ? 'ff' : 'bb'}`;
      context.strokeStyle = isSelected ? '#ffffff' : '#0f172a';
      context.lineWidth = isSelected ? 3 : 1;
      context.beginPath(); context.roundRect(x + 1, y + 1, cellWidth - 2, cellHeight - 2, 4); context.fill(); context.stroke();
      context.fillStyle = '#ffffff'; context.textAlign = 'center'; context.textBaseline = 'middle';
      context.font = `700 ${Math.max(9, Math.min(16, cellHeight * 0.34))}px Inter, sans-serif`;
      context.fillText(element.symbol, x + cellWidth / 2, y + cellHeight * 0.48);
      if (cellWidth >= 35) { context.font = '600 8px Inter, sans-serif'; context.fillText(String(element.atomicNumber), x + cellWidth / 2, y + cellHeight * 0.76); }
      hitboxes.push({ atomicNumber: element.atomicNumber, x, y, width: cellWidth, height: cellHeight });
    });
    label(context, 'Interactive Periodic Table · select an element', startX, 22, palette.text, 'left', 16);
    if (selected && detailWidth) {
      const panelX = width - detailWidth + 8;
      context.fillStyle = '#111d2d'; context.strokeStyle = colors[selected.category] || palette.accent; context.lineWidth = 3;
      context.beginPath(); context.roundRect(panelX, 26, detailWidth - 18, height - 52, 14); context.fill(); context.stroke();
      label(context, String(selected.atomicNumber), panelX + 20, 58, palette.muted, 'left', 16);
      label(context, selected.symbol, panelX + 20, 110, palette.text, 'left', 46);
      label(context, selected.name, panelX + 20, 148, colors[selected.category] || palette.accent, 'left', 20);
      label(context, `${selected.atomicMass} u`, panelX + 20, 178, palette.text, 'left', 15);
      label(context, `Group ${selected.group} · Period ${selected.period}`, panelX + 20, 205, palette.muted, 'left', 14);
      label(context, selected.category, panelX + 20, 232, palette.muted, 'left', 14);
      const centerX = panelX + (detailWidth - 18) / 2; const centerY = Math.min(height - 120, 350);
      context.fillStyle = palette.red; context.beginPath(); context.arc(centerX, centerY, 16, 0, Math.PI * 2); context.fill();
      selected.electronShells.forEach((electronCount, shellIndex) => {
        const radius = 28 + shellIndex * Math.min(17, (detailWidth - 70) / Math.max(1, selected.electronShells.length * 2));
        context.strokeStyle = '#64748b'; context.lineWidth = 1.5; context.beginPath(); context.arc(centerX, centerY, radius, 0, Math.PI * 2); context.stroke();
        for (let electron = 0; electron < electronCount; electron += 1) { const angle = time * 0.25 + electron * Math.PI * 2 / electronCount; context.fillStyle = palette.accent; context.beginPath(); context.arc(centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle), 3, 0, Math.PI * 2); context.fill(); }
      });
      label(context, `Shells: ${selected.electronShells.join(' · ')}`, centerX, height - 52, palette.text, 'center', 14);
    }
  } else if (simulation.kind === 'atom') {
    const shellCount = Math.max(1, Math.ceil(p.z / 2)); context.fillStyle = palette.red; context.beginPath(); context.arc(cx, cy, 34, 0, Math.PI * 2); context.fill();
    for (let shell = 1; shell <= shellCount; shell += 1) { const radius = 48 + shell * 34; context.strokeStyle = '#4fa3ff88'; context.beginPath(); context.ellipse(cx, cy, radius, radius * 0.45, shell * 0.55, 0, Math.PI * 2); context.stroke(); const count = Math.min(8, Math.max(1, p.z - (shell - 1) * 2)); for (let electron = 0; electron < count; electron += 1) { const a = time * p.rate + electron * Math.PI * 2 / count; const ex = cx + radius * Math.cos(a) * Math.cos(shell * 0.55) - radius * 0.45 * Math.sin(a) * Math.sin(shell * 0.55); const ey = cy + radius * Math.cos(a) * Math.sin(shell * 0.55) + radius * 0.45 * Math.sin(a) * Math.cos(shell * 0.55); context.fillStyle = palette.accent; context.beginPath(); context.arc(ex, ey, 7, 0, Math.PI * 2); context.fill(); } }
    if (o.labels) label(context, `Atomic number Z = ${p.z}`, 24, 30);
  } else if (simulation.kind === 'molecule') {
    const pulse = 1 + Math.sin(time * 5 * p.vibration) * 0.05; const length = Math.min(width, height) * 0.25 * pulse; const angle = p.angle * Math.PI / 180; const points = [[cx, cy], [cx - length * Math.cos(angle / 2), cy + length * Math.sin(angle / 2)], [cx + length * Math.cos(angle / 2), cy + length * Math.sin(angle / 2)]];
    context.strokeStyle = palette.text; context.lineWidth = 12; for (let i = 1; i < points.length; i += 1) { context.beginPath(); context.moveTo(points[0][0], points[0][1]); context.lineTo(points[i][0], points[i][1]); context.stroke(); }
    points.forEach(([x, y], index) => { context.fillStyle = index ? palette.accent : palette.red; context.beginPath(); context.arc(x, y, index ? 30 : 42, 0, Math.PI * 2); context.fill(); }); if (o.labels) label(context, `Bond angle ${p.angle.toFixed(0)}°`, cx, height * 0.82, palette.text, 'center');
  } else if (simulation.kind === 'reaction') {
    const rate = Math.min(1, (p.temp / 100) * p.conc * 60 / p.activation); const progress = (time * rate * 0.3) % 1; const left = width * 0.16; const right = width * 0.84;
    for (let i = 0; i < 24; i += 1) { const x = left + (right - left) * ((i / 24 + progress) % 1); const y = cy + Math.sin(i * 3.1 + time * p.temp / 15) * height * 0.25; context.fillStyle = i % 2 ? palette.accent : palette.yellow; context.beginPath(); context.arc(x, y, 10 + rate * 7, 0, Math.PI * 2); context.fill(); }
    if (o.labels) label(context, `Relative reaction rate ${(rate * 100).toFixed(1)}%`, cx, 35, palette.text, 'center');
  } else if (simulation.kind === 'cell') {
    const pulse = 1 + Math.sin(time * p.activity * 2) * 0.025; context.save(); context.translate(cx, cy); context.scale(pulse, pulse); context.fillStyle = '#2ecc7133'; context.strokeStyle = palette.green; context.lineWidth = 6; context.beginPath(); context.ellipse(0, 0, width * 0.32, height * 0.34, -0.12, 0, Math.PI * 2); context.fill(); context.stroke(); context.fillStyle = '#a66bff'; context.beginPath(); context.arc(-width * 0.06, 0, height * 0.1, 0, Math.PI * 2); context.fill(); for (let i = 0; i < 12; i += 1) { context.fillStyle = i % 2 ? palette.yellow : palette.accent; context.beginPath(); context.ellipse(Math.cos(i * 2.4) * width * 0.22, Math.sin(i * 1.8) * height * 0.23, 18, 9, i, 0, Math.PI * 2); context.fill(); } context.restore(); if (o.labels) label(context, 'Nucleus', cx - width * 0.06, cy, '#ffffff', 'center', 14);
  } else if (simulation.kind === 'dna') {
    const turns = p.turns; const margin = width * 0.12; for (let i = 0; i <= 160; i += 1) { const x = margin + (width - 2 * margin) * i / 160; const phase = turns * Math.PI * 2 * i / 160 + time * p.rate; const y1 = cy + Math.sin(phase) * height * 0.28; const y2 = cy - Math.sin(phase) * height * 0.28; if (i) { context.strokeStyle = palette.accent; context.lineWidth = 4; context.lineTo(x, y1); context.stroke(); context.beginPath(); context.moveTo(x, y2); } else { context.beginPath(); context.moveTo(x, y1); } if (i % 8 === 0) { context.strokeStyle = i % 16 ? palette.green : palette.red; context.lineWidth = 3; context.beginPath(); context.moveTo(x, y1); context.lineTo(x, y2); context.stroke(); } } if (o.labels) label(context, 'DNA double helix', cx, 30, palette.text, 'center');
  } else if (simulation.kind === 'heartbeat') {
    const beat = Math.pow(Math.max(0, Math.sin(time * p.bpm / 60 * Math.PI)), 8); const scale = 0.9 + beat * p.strength / 350; context.save(); context.translate(cx, cy); context.scale(scale, scale); context.fillStyle = palette.red; context.beginPath(); context.moveTo(0, 110); context.bezierCurveTo(-180, -10, -130, -150, 0, -60); context.bezierCurveTo(130, -150, 180, -10, 0, 110); context.fill(); context.restore(); if (o.trail) { context.strokeStyle = palette.green; context.lineWidth = 4; context.beginPath(); for (let i = 0; i <= 300; i += 1) { const x = width * i / 300; const phase = (i / 300 * 4 + time * p.bpm / 60) % 1; const y = height * 0.82 - (phase > 0.45 && phase < 0.55 ? Math.sin((phase - 0.45) * Math.PI / 0.1) * 70 : 0); i ? context.lineTo(x, y) : context.moveTo(x, y); } context.stroke(); } if (o.labels) label(context, `${p.bpm.toFixed(0)} bpm`, width - 25, 30, palette.text, 'right');
  } else if (['function', 'quadratic'].includes(simulation.kind)) {
    const sx = width / 20; const sy = height / 14; const ox = cx; const oy = cy; context.strokeStyle = '#526078'; context.lineWidth = 2; context.beginPath(); context.moveTo(0, oy); context.lineTo(width, oy); context.moveTo(ox, 0); context.lineTo(ox, height); context.stroke(); context.strokeStyle = palette.accent; context.lineWidth = 4; context.beginPath(); let started = false; for (let i = 0; i <= 500; i += 1) { const x = -10 + 20 * i / 500; const y = simulation.kind === 'function' ? p.a * Math.sin(p.b * x) + p.c : p.a * x * x + p.b * x + p.c; if (!Number.isFinite(y) || Math.abs(y) > 30) { started = false; continue; } const px = ox + x * sx; const py = oy - y * sy; started ? context.lineTo(px, py) : context.moveTo(px, py); started = true; } context.stroke(); if (o.labels) label(context, simulation.kind === 'function' ? 'y = a sin(bx) + c' : 'y = ax² + bx + c', 24, 28);
  } else if (simulation.kind === 'circle') {
    const radius = Math.min(width, height) * 0.34 * p.r / 8; context.strokeStyle = palette.accent; context.lineWidth = 5; context.beginPath(); context.arc(cx, cy, radius, 0, Math.PI * 2); context.stroke(); context.fillStyle = '#4fa3ff33'; context.beginPath(); context.moveTo(cx, cy); context.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + p.angle * Math.PI / 180); context.closePath(); context.fill(); arrow(context, cx, cy, cx + radius, cy, palette.yellow); if (o.labels) { label(context, `r = ${p.r.toFixed(1)}`, cx + radius / 2, cy - 18, palette.yellow, 'center'); label(context, `Area = ${(Math.PI * p.r * p.r).toFixed(2)}`, width - 24, 32, palette.text, 'right'); }
  }
};

export default function SimulationPreviewCanvas({ simulation, paused = false, resetToken = 0, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hitboxesRef = useRef<ElementHitbox[]>([]);
  const simulationRef = useRef(simulation);
  const pausedRef = useRef(paused);
  const elapsedRef = useRef(0);
  simulationRef.current = simulation; pausedRef.current = paused;

  useEffect(() => { elapsedRef.current = 0; }, [resetToken, simulation.templateId]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext('2d');
    if (!context) return undefined;
    let frame = 0; let previous = performance.now();
    const render = (now: number) => {
      const box = canvas.getBoundingClientRect(); const ratio = Math.min(2, window.devicePixelRatio || 1);
      const width = Math.max(1, Math.round(box.width * ratio)); const height = Math.max(1, Math.round(box.height * ratio));
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (!pausedRef.current) elapsedRef.current += (now - previous) / 1000 * simulationRef.current.speed;
      previous = now; drawSimulation(context, box.width, box.height, elapsedRef.current, simulationRef.current, hitboxesRef.current);
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, []);

  return <canvas ref={canvasRef} className="h-full w-full touch-manipulation" aria-label={`${simulation.title} live simulation preview`} onPointerDown={(event) => {
    if (simulation.kind !== 'periodic-table' || !onChange) return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - box.left; const y = event.clientY - box.top;
    const hit = hitboxesRef.current.find((item) => x >= item.x && x <= item.x + item.width && y >= item.y && y <= item.y + item.height);
    if (hit) onChange({ ...simulation, parameters: { ...simulation.parameters, selectedAtomicNumber: hit.atomicNumber } });
  }} />;
}

