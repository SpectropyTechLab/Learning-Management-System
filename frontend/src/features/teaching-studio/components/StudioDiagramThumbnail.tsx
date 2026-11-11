import type { SmartDiagramLayoutDefinition } from './smartDiagramModel';
import type { ReactNode } from 'react';

const Rect = ({ x, y, w, h, fill = '#1d4ed8', rx = 7 }: { x: number; y: number; w: number; h: number; fill?: string; rx?: number }) =>
  <rect x={x} y={y} width={w} height={h} rx={rx} fill={fill} />;

const Line = ({ x1, y1, x2, y2, arrow = false }: { x1: number; y1: number; x2: number; y2: number; arrow?: boolean }) =>
  <g><line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#64748b" strokeWidth="3" />{arrow ? <path d={`M${x2 - 7} ${y2 - 5}L${x2} ${y2}L${x2 - 7} ${y2 + 5}`} fill="none" stroke="#64748b" strokeWidth="3" /> : null}</g>;

export default function StudioDiagramThumbnail({ layout }: { layout: SmartDiagramLayoutDefinition }) {
  const b = '#1d4ed8'; const c = '#0891b2'; const o = '#f59e0b'; const g = '#16a34a';
  const id = layout.id;
  let visual: ReactNode;
  if (id === 'vertical-box-list') visual = <>{[12,37,62].map((y, i) => <Rect key={y} x={30 + i * 7} y={y} w={100 - i * 14} h={18} fill={i % 2 ? c : b} />)}</>;
  else if (id === 'horizontal-bullet-list') visual = <>{[21,45,69].map((y, i) => <g key={y}><circle cx="30" cy={y} r="6" fill={i === 1 ? c : b}/><Rect x={44} y={y - 6} w={86} h={12} fill="#94a3b8" rx={4}/></g>)}</>;
  else if (id === 'chevron-process') visual = <>{[8,56,104].map((x, i) => <path key={x} d={`M${x} 25H${x + 39}L${x + 49} 45L${x + 39} 65H${x}L${x + 10} 45Z`} fill={i === 1 ? c : b}/>)}</>;
  else if (id === 'vertical-process') visual = <>{[7,34,61].map((y, i) => <g key={y}><Rect x={50} y={y} w={60} h={20} fill={i === 1 ? c : b}/>{i < 2 ? <Line x1={80} y1={y + 20} x2={80} y2={y + 27} arrow/> : null}</g>)}</>;
  else if (id === 'basic-cycle' || id === 'continuous-cycle') visual = <>{[[-1.57,b],[0.52,c],[2.62,o]].map(([angle, fill], i) => { const a=Number(angle); const x=80+Math.cos(a)*30; const y=45+Math.sin(a)*27; return <g key={i}><circle cx={x} cy={y} r="13" fill={String(fill)}/>{id === 'continuous-cycle' ? <path d={`M${80+Math.cos(a+.35)*30} ${45+Math.sin(a+.35)*27}A30 27 0 0 1 ${80+Math.cos(a+1.55)*30} ${45+Math.sin(a+1.55)*27}`} fill="none" stroke="#64748b" strokeWidth="4"/> : null}</g>;})}</>;
  else if (id === 'radial-cycle' || id === 'radial-relationship') visual = <><circle cx="80" cy="45" r="14" fill={o}/>{[[80,12],[126,45],[80,78],[34,45]].map(([x,y],i)=><g key={i}><Line x1={80} y1={45} x2={x} y2={y}/><circle cx={x} cy={y} r="10" fill={i%2?c:b}/></g>)}</>;
  else if (id === 'horizontal-hierarchy') visual = <><Rect x={10} y={34} w={38} h={22}/><Line x1={48} y1={45} x2={72} y2={45}/>{[15,40,65].map((y,i)=><g key={y}><Line x1={72} y1={45} x2={88} y2={y+8}/><Rect x={88} y={y} w={55} h={16} fill={i===1?c:b}/></g>)}</>;
  else if (id === 'organization-chart' || id === 'labelled-hierarchy') visual = <><Rect x={58} y={5} w={44} h={18}/><path d="M80 23V42M28 42H132M28 42V60M80 42V60M132 42V60" fill="none" stroke="#64748b" strokeWidth="3"/>{[8,60,112].map((x,i)=><Rect key={x} x={x} y={60} w={40} h={18} fill={i===1?c:b}/>)}</>;
  else if (id === 'opposing-ideas') visual = <><Rect x={8} y={25} w={56} h={40}/><Rect x={96} y={25} w={56} h={40} fill={c}/><circle cx="80" cy="45" r="9" fill={o}/><Line x1={64} y1={45} x2={71} y2={45}/><Line x1={89} y1={45} x2={96} y2={45}/></>;
  else if (id === 'basic-matrix' || id === 'titled-matrix') visual = <>{[[28,8,b],[82,8,c],[28,47,o],[82,47,g]].map(([x,y,fill])=><Rect key={`${x}-${y}`} x={Number(x)} y={Number(y)} w={49} h={34} fill={String(fill)}/>)}{id === 'titled-matrix' ? <circle cx="80" cy="45" r="12" fill="#fff" stroke="#334155" strokeWidth="3"/> : null}</>;
  else if (id === 'basic-pyramid' || id === 'inverted-pyramid') visual = <g transform={id === 'inverted-pyramid' ? 'rotate(180 80 45)' : undefined}><path d="M80 5L145 82H15Z" fill={b}/><path d="M38 55H122M57 32H103" stroke="white" strokeWidth="3"/></g>;
  else if (id === 'picture-grid') visual = <>{[15,58,101].map((x,i)=><g key={x}><circle cx={x+20} cy="30" r="18" fill={i===1?c:b}/><Rect x={x} y={56} w={40} h={9} fill="#64748b" rx={3}/><Rect x={x+7} y={70} w={26} h={5} fill="#94a3b8" rx={2}/></g>)}</>;
  else if (id === 'picture-caption-list') visual = <>{[10,38,66].map((y,i)=><g key={y}><circle cx="32" cy={y+8} r="10" fill={i===1?c:b}/><Rect x={50} y={y+2} w={86} h={12} fill="#64748b" rx={4}/></g>)}</>;
  else if (id === 'basic-timeline' || id === 'alternating-timeline') visual = <><Line x1={14} y1={45} x2={146} y2={45}/>{[28,62,96,130].map((x,i)=><g key={x}><circle cx={x} cy="45" r="8" fill={i%2?c:b}/><Rect x={x-13} y={id==='alternating-timeline'?(i%2?61:15):62} w={26} h={7} fill="#94a3b8" rx={2}/></g>)}</>;
  else if (id === 'side-by-side-comparison') visual = <><Rect x={12} y={12} w={62} h={66}/><Rect x={86} y={12} w={62} h={66} fill={c}/>{[28,42,56].map(y=><g key={y}><Line x1={23} y1={y} x2={62} y2={y}/><Line x1={97} y1={y} x2={136} y2={y}/></g>)}</>;
  else if (id === 'balance-comparison') visual = <><Line x1={80} y1={18} x2={80} y2={70}/><Line x1={35} y1={30} x2={125} y2={30}/><path d="M18 65L35 34L52 65ZM108 65L125 34L142 65Z" fill={b}/><Rect x={60} y={70} w={40} h={8} fill="#64748b"/></>;
  else if (id === 'fishbone') visual = <><Line x1={20} y1={45} x2={140} y2={45} arrow/>{[38,65,92,119].map((x,i)=><g key={x}><Line x1={x} y1={45} x2={x-15} y2={i%2?73:17}/><circle cx={x-15} cy={i%2?73:17} r="7" fill={i%2?c:b}/></g>)}<path d="M140 32L154 45L140 58Z" fill={o}/></>;
  else if (id === 'basic-funnel') visual = <><path d="M18 8H142L103 79H57Z" fill={b}/><path d="M37 35H123M49 57H111" stroke="white" strokeWidth="4"/></>;
  else if (layout.variant === 1) visual = <>{[10,36,62].map((y,i)=><Rect key={y} x={20+i*9} y={y} w={120-i*18} h={18} fill={i%2?c:b}/>)}</>;
  else if (layout.variant === 2) visual = <>{[[12,10],[60,10],[108,10],[36,54],[84,54]].map(([x,y],i)=><Rect key={`${x}-${y}`} x={x} y={y} w={40} h={25} fill={i%2?c:b}/>)}</>;
  else if (layout.variant === 3) visual = <>{[12,50,88,126].map((x,i)=><g key={x}><Rect x={x} y={8+i*17} w={30} h={22} fill={i%2?c:b}/>{i<3?<Line x1={x+30} y1={19+i*17} x2={x+38} y2={36+i*17} arrow/>:null}</g>)}</>;
  else if (layout.variant === 4) visual = <>{[[15,12],[103,12],[15,55],[103,55]].map(([x,y],i)=><Rect key={`${x}-${y}`} x={x} y={y} w={42} h={23} fill={i%2?c:b}/>)}<circle cx="80" cy="45" r="12" fill={o}/></>;
  else if (layout.variant === 5) visual = <>{[[-2.5,b],[-1.8,c],[-1.1,o],[-.4,g]].map(([a,fill],i)=><circle key={i} cx={80+Math.cos(Number(a))*55} cy={74+Math.sin(Number(a))*55} r="12" fill={String(fill)}/>)}</>;
  else if (layout.variant === 6) visual = <><Rect x={57} y={31} w={46} h={28} fill={o}/>{[[18,8],[105,8],[18,62],[105,62]].map(([x,y],i)=><g key={`${x}-${y}`}><Line x1={80} y1={45} x2={x+18} y2={y+10}/><Rect x={x} y={y} w={36} h={20} fill={i%2?c:b}/></g>)}</>;
  else if (layout.variant === 7) visual = <>{[[10,10],[58,10],[106,10],[34,56],[82,56]].map(([x,y],i)=><path key={`${x}-${y}`} d={`M${x+18} ${y}L${x+36} ${y+12}L${x+18} ${y+24}L${x} ${y+12}Z`} fill={i%2?c:b}/>)}</>;
  else if (layout.variant === 8) visual = <>{[8,32,56,80].map((y,i)=><Rect key={y} x={i%2?82:20} y={y} w={58} h={16} fill={i%2?c:b}/>)}</>;
  else if (layout.variant === 9) visual = <>{[0,1,2,3,4,5].map((i)=>{const a=-Math.PI/2+i*Math.PI/3;return <circle key={i} cx={80+Math.cos(a)*31} cy={45+Math.sin(a)*31} r="10" fill={i%2?c:b}/>;})}<circle cx="80" cy="45" r="10" fill={o}/></>;
  else if (layout.variant === 10) visual = <>{[8,45,82,119].map((x,i)=><g key={x}><Rect x={x} y={i%2?45:20} w={32} h={26} fill={i%2?c:b}/>{i<3?<Line x1={x+32} y1={i%2?58:33} x2={x+37} y2={(i+1)%2?58:33} arrow/>:null}</g>)}</>;
  else visual = <>{[8,56,104].map((x,i)=><g key={x}><Rect x={x} y={27} w={40} h={36} fill={i===1?c:b}/>{i<2?<Line x1={x+40} y1={45} x2={x+48} y2={45} arrow/>:null}</g>)}</>;
  return <svg viewBox="0 0 160 90" className="h-full w-full" role="img" aria-label={`${layout.name} preview`}>{visual}</svg>;
}
