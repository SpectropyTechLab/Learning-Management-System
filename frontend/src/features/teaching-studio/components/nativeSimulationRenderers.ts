import type { SimulationDocument } from './simulationStudioModel';

export const drawNativeSimulation = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  simulation: SimulationDocument,
) => {
  const p = simulation.parameters;
  const kind = simulation.kind;
  if (!['spring', 'ohm', 'free-fall', 'planetary-orbit', 'kinetic-energy'].includes(kind)) return false;
  const label = (text: string, x: number, y: number, color = '#eaf2ff', align: CanvasTextAlign = 'left', size = 20) => {
    context.fillStyle = color; context.textAlign = align; context.textBaseline = 'middle';
    context.font = `700 ${size}px Segoe UI, sans-serif`; context.fillText(text, x, y);
  };
  const arrow = (x1: number, y1: number, x2: number, y2: number, color: string) => {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    context.strokeStyle = color; context.fillStyle = color; context.lineWidth = 4;
    context.beginPath(); context.moveTo(x1, y1); context.lineTo(x2, y2); context.stroke();
    context.beginPath(); context.moveTo(x2, y2);
    context.lineTo(x2 - 14 * Math.cos(angle - 0.45), y2 - 14 * Math.sin(angle - 0.45));
    context.lineTo(x2 - 14 * Math.cos(angle + 0.45), y2 - 14 * Math.sin(angle + 0.45));
    context.closePath(); context.fill();
  };
  context.clearRect(0, 0, width, height);

  if (kind === 'spring') {
    const background = context.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, '#f6f1e8'); background.addColorStop(1, '#dbe6ee');
    context.fillStyle = background; context.fillRect(0, 0, width, height);
    const omega = Math.sqrt(p.k / p.m); const displacement = p.A * Math.cos(omega * time);
    const wall = width * 0.1; const equilibrium = width * 0.58; const blockX = equilibrium + displacement * width * 0.009; const y = height * 0.42;
    context.fillStyle = '#475569'; context.fillRect(wall - 18, y - 105, 24, 210);
    context.strokeStyle = '#64748b'; context.lineWidth = 3;
    for (let q = y - 105; q < y + 105; q += 18) { context.beginPath(); context.moveTo(wall - 18, q); context.lineTo(wall + 6, q + 14); context.stroke(); }
    context.strokeStyle = '#334155'; context.lineWidth = 5; context.beginPath(); context.moveTo(wall + 6, y);
    for (let i = 1; i < 22; i += 1) context.lineTo(wall + 6 + (blockX - wall - 78) * i / 22, y + (i % 2 ? -32 : 32));
    context.lineTo(blockX - 72, y); context.stroke();
    const block = context.createLinearGradient(blockX - 70, y - 70, blockX + 70, y + 70);
    block.addColorStop(0, '#38bdf8'); block.addColorStop(1, '#1d4ed8'); context.fillStyle = block;
    context.beginPath(); context.roundRect(blockX - 72, y - 72, 144, 144, 18); context.fill();
    context.fillStyle = '#0f172a'; context.fillRect(width * 0.05, y + 74, width * 0.9, 10);
    const velocity = -p.A * omega * Math.sin(omega * time); const acceleration = -omega * omega * displacement;
    arrow(blockX, y - 94, blockX + velocity * 9, y - 94, '#16a34a');
    arrow(blockX, y + 112, blockX + acceleration * 1.2, y + 112, '#ef4444');
    context.strokeStyle = '#2563eb'; context.lineWidth = 4; context.beginPath();
    for (let i = 0; i <= 260; i += 1) { const q = time - 5 + 5 * i / 260; const gy = height * 0.82 - Math.cos(omega * q) * p.A * 7; const gx = width * 0.08 + width * 0.84 * i / 260; i ? context.lineTo(gx, gy) : context.moveTo(gx, gy); } context.stroke();
    label(`Spring–Mass SHM`, 28, 34, '#0f172a', 'left', 27); label(`T = ${(2 * Math.PI / omega).toFixed(2)} s`, width - 28, 36, '#1d4ed8', 'right');
    return true;
  }

  if (kind === 'ohm') {
    const background = context.createLinearGradient(0, 0, 0, height);
    background.addColorStop(0, '#101827'); background.addColorStop(1, '#05070c'); context.fillStyle = background; context.fillRect(0, 0, width, height);
    const current = p.V / p.R; const power = p.V * current; const glow = Math.min(1, power / 48); const cx = width * 0.58; const cy = height * 0.42;
    context.strokeStyle = '#e2e8f0'; context.lineWidth = 6; context.beginPath(); context.roundRect(width * 0.14, height * 0.18, width * 0.72, height * 0.48, 35); context.stroke();
    context.fillStyle = '#ef4444'; context.fillRect(width * 0.12, cy - 70, 16, 140); context.fillStyle = '#334155'; context.fillRect(width * 0.16, cy - 48, 10, 96);
    label(`${p.V.toFixed(1)} V`, width * 0.14, cy + 105, '#fca5a5', 'center', 19);
    const halo = context.createRadialGradient(cx, cy, 10, cx, cy, 150);
    halo.addColorStop(0, `rgba(255,238,120,${0.85 * glow})`); halo.addColorStop(0.35, `rgba(251,191,36,${0.42 * glow})`); halo.addColorStop(1, 'rgba(251,191,36,0)'); context.fillStyle = halo; context.fillRect(cx - 160, cy - 160, 320, 320);
    context.strokeStyle = '#f8fafc'; context.lineWidth = 5; context.beginPath(); context.arc(cx, cy, 64, 0, Math.PI * 2); context.stroke();
    context.strokeStyle = '#fbbf24'; context.lineWidth = 8; context.beginPath(); context.moveTo(cx - 32, cy + 12); context.lineTo(cx - 12, cy - 20); context.lineTo(cx + 12, cy + 20); context.lineTo(cx + 32, cy - 12); context.stroke();
    context.fillStyle = '#111827'; context.beginPath(); context.roundRect(width * 0.72, cy - 55, 110, 110, 18); context.fill(); context.strokeStyle = '#38bdf8'; context.stroke();
    label('A', width * 0.72 + 55, cy - 10, '#7dd3fc', 'center', 30); label(`${current.toFixed(2)} A`, width * 0.72 + 55, cy + 28, '#ffffff', 'center', 17);
    for (let i = 0; i < 12; i += 1) { const q = ((i / 12 + time * Math.max(0.08, current) * 0.12) % 1); const x = width * 0.14 + q * width * 0.72; context.fillStyle = '#38bdf8'; context.beginPath(); context.arc(x, height * 0.18, 5, 0, Math.PI * 2); context.fill(); }
    label(`OHM'S LAW`, 28, 36, '#ffffff', 'left', 28); label(`V = IR`, 28, height - 72, '#38bdf8', 'left', 30); label(`Power = ${power.toFixed(2)} W`, width - 28, height - 72, '#fbbf24', 'right', 24); label(`Resistance ${p.R.toFixed(1)} Ω`, width - 28, 38, '#cbd5e1', 'right', 18);
    return true;
  }

  if (kind === 'free-fall') {
    const sky = context.createLinearGradient(0, 0, 0, height); sky.addColorStop(0, '#60a5fa'); sky.addColorStop(0.72, '#dbeafe'); sky.addColorStop(0.73, '#84cc16'); sky.addColorStop(1, '#365314'); context.fillStyle = sky; context.fillRect(0, 0, width, height);
    const fallTime = Math.sqrt(2 * p.h0 / p.g); const elapsed = Math.min(time % (fallTime + 1.1), fallTime); const heightNow = Math.max(0, p.h0 - 0.5 * p.g * elapsed * elapsed); const velocity = p.g * elapsed;
    const ground = height * 0.76; const top = height * 0.12; const scale = (ground - top) / p.h0; const ballY = ground - heightNow * scale;
    context.fillStyle = '#64748b'; context.fillRect(width * 0.18, top, width * 0.18, ground - top); context.fillStyle = '#94a3b8'; for (let y = top + 28; y < ground - 20; y += 55) for (let x = width * 0.2; x < width * 0.34; x += 42) context.fillRect(x, y, 22, 30);
    context.setLineDash([8, 10]); context.strokeStyle = '#ffffffaa'; context.lineWidth = 3; context.beginPath(); context.moveTo(width * 0.48, top); context.lineTo(width * 0.48, ground); context.stroke(); context.setLineDash([]);
    for (let i = 0; i < 7; i += 1) { const prior = Math.max(0, elapsed - i * 0.12); const py = ground - Math.max(0, p.h0 - 0.5 * p.g * prior * prior) * scale; context.fillStyle = `rgba(239,68,68,${1 - i * 0.12})`; context.beginPath(); context.arc(width * 0.48, py, 15 - i, 0, Math.PI * 2); context.fill(); }
    const ball = context.createRadialGradient(width * 0.48 - 7, ballY - 8, 2, width * 0.48, ballY, 22); ball.addColorStop(0, '#fecaca'); ball.addColorStop(0.35, '#ef4444'); ball.addColorStop(1, '#7f1d1d'); context.fillStyle = ball; context.beginPath(); context.arc(width * 0.48, ballY, 22, 0, Math.PI * 2); context.fill();
    arrow(width * 0.54, ballY, width * 0.54, Math.min(ground, ballY + 40 + velocity * 2.2), '#facc15');
    label('FREE FALL', 28, 36, '#0f172a', 'left', 28); label(`Height ${heightNow.toFixed(1)} m`, width - 32, height * 0.28, '#0f172a', 'right', 24); label(`Speed ${velocity.toFixed(1)} m/s`, width - 32, height * 0.36, '#b91c1c', 'right', 24); label(`Fall time ${fallTime.toFixed(2)} s`, width - 32, height * 0.44, '#334155', 'right', 20);
    return true;
  }

  if (kind === 'planetary-orbit') {
    const space = context.createRadialGradient(width * 0.35, height * 0.42, 20, width * 0.5, height * 0.5, width * 0.75); space.addColorStop(0, '#172554'); space.addColorStop(0.55, '#090d24'); space.addColorStop(1, '#02030a'); context.fillStyle = space; context.fillRect(0, 0, width, height);
    for (let i = 0; i < 90; i += 1) { const x = (i * 97) % width; const y = (i * 53) % height; context.fillStyle = i % 7 ? '#ffffff88' : '#bfdbfe'; context.fillRect(x, y, i % 5 ? 1.5 : 2.5, i % 5 ? 1.5 : 2.5); }
    const major = Math.min(width * 0.36, height * 0.43) * (0.45 + p.a / 5); const minor = major * Math.sqrt(1 - p.e * p.e); const focus = major * p.e; const centerX = width * 0.5; const centerY = height * 0.52; const angle = time * 0.45; const px = centerX + major * Math.cos(angle); const py = centerY + minor * Math.sin(angle); const starX = centerX + focus;
    context.strokeStyle = '#93c5fd88'; context.lineWidth = 3; context.setLineDash([9, 10]); context.beginPath(); context.ellipse(centerX, centerY, major, minor, 0, 0, Math.PI * 2); context.stroke(); context.setLineDash([]);
    context.fillStyle = '#f59e0b22'; context.beginPath(); context.moveTo(starX, centerY); context.lineTo(px, py); context.arc(centerX, centerY, major, 0, angle, angle < 0); context.closePath(); context.fill();
    const sun = context.createRadialGradient(starX - 8, centerY - 8, 2, starX, centerY, 60); sun.addColorStop(0, '#fff7ae'); sun.addColorStop(0.35, '#fbbf24'); sun.addColorStop(1, '#f9731600'); context.fillStyle = sun; context.beginPath(); context.arc(starX, centerY, 62, 0, Math.PI * 2); context.fill(); context.fillStyle = '#fbbf24'; context.beginPath(); context.arc(starX, centerY, 30, 0, Math.PI * 2); context.fill();
    const planet = context.createRadialGradient(px - 8, py - 8, 2, px, py, 24); planet.addColorStop(0, '#dbeafe'); planet.addColorStop(0.4, '#3b82f6'); planet.addColorStop(1, '#1e3a8a'); context.fillStyle = planet; context.beginPath(); context.arc(px, py, 24, 0, Math.PI * 2); context.fill();
    context.strokeStyle = '#fbbf24'; context.lineWidth = 3; context.beginPath(); context.moveTo(starX, centerY); context.lineTo(px, py); context.stroke();
    const distance = Math.hypot(px - starX, py - centerY) / Math.max(1, major) * p.a;
    label('PLANETARY ORBIT', 28, 36, '#ffffff', 'left', 28); label(`Semi-major axis ${p.a.toFixed(1)} AU`, width - 28, 36, '#93c5fd', 'right', 18); label(`Eccentricity ${p.e.toFixed(2)}`, width - 28, 66, '#c4b5fd', 'right', 18); label(`Current distance ≈ ${distance.toFixed(2)} AU`, 28, height - 36, '#fcd34d', 'left', 20);
    return true;
  }

  const background = context.createLinearGradient(0, 0, 0, height); background.addColorStop(0, '#f8fafc'); background.addColorStop(1, '#dbeafe'); context.fillStyle = background; context.fillRect(0, 0, width, height);
  const energy = 0.5 * p.m * p.v * p.v; const momentum = p.m * p.v; const roadY = height * 0.67; const cartX = width * 0.28 + ((time * p.v * 22) % (width * 0.48));
  context.fillStyle = '#334155'; context.fillRect(width * 0.06, roadY, width * 0.88, 18); context.strokeStyle = '#ffffff'; context.lineWidth = 3; context.setLineDash([28, 20]); context.beginPath(); context.moveTo(width * 0.07, roadY + 9); context.lineTo(width * 0.93, roadY + 9); context.stroke(); context.setLineDash([]);
  for (let i = 0; i < 8; i += 1) { context.strokeStyle = `rgba(37,99,235,${0.55 - i * 0.055})`; context.lineWidth = 4; context.beginPath(); context.moveTo(cartX - 90 - i * 22, roadY - 50 + i * 5); context.lineTo(cartX - 25, roadY - 50 + i * 5); context.stroke(); }
  const cart = context.createLinearGradient(cartX - 75, roadY - 100, cartX + 75, roadY - 20); cart.addColorStop(0, '#22c55e'); cart.addColorStop(1, '#15803d'); context.fillStyle = cart; context.beginPath(); context.roundRect(cartX - 76, roadY - 92, 152, 68, 18); context.fill();
  context.fillStyle = '#0f172a'; for (const dx of [-48, 48]) { context.beginPath(); context.arc(cartX + dx, roadY - 16, 22, 0, Math.PI * 2); context.fill(); context.fillStyle = '#94a3b8'; context.beginPath(); context.arc(cartX + dx, roadY - 16, 8, 0, Math.PI * 2); context.fill(); context.fillStyle = '#0f172a'; }
  arrow(cartX, roadY - 118, cartX + Math.min(200, 35 + p.v * 5), roadY - 118, '#2563eb');
  const barWidth = Math.min(width * 0.36, energy / 2500 * width * 0.36); context.fillStyle = '#cbd5e1'; context.fillRect(width * 0.58, height * 0.25, width * 0.36, 34); context.fillStyle = '#f59e0b'; context.fillRect(width * 0.58, height * 0.25, barWidth, 34);
  label('KINETIC ENERGY', 28, 36, '#0f172a', 'left', 28); label(`½mv² = ${energy.toFixed(1)} J`, width * 0.58, height * 0.2, '#92400e', 'left', 24); label(`Momentum = ${momentum.toFixed(1)} kg·m/s`, width * 0.58, height * 0.37, '#1d4ed8', 'left', 20); label(`${p.m.toFixed(1)} kg`, cartX, roadY - 58, '#ffffff', 'center', 18);
  return true;
};
