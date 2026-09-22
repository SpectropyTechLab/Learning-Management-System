import {useEffect,useRef,useState} from 'react';
import type {MotionScene,Slide} from './types';
export const defaultScene = ():MotionScene => ({version:1,kind:'motion-path',firstLeg:40,secondLeg:30,duration:8,yaw:35,elevation:35,cinematic:true,color:'#55d9f5'});
export function MotionEditor({slide,edit}:{slide:Slide;edit:(fn:(s:Slide)=>void)=>void}) {
 const c=slide.scene;
 return <fieldset><legend>2D / 3D motion scene</legend>{!c?<button onClick={()=>{if((slide.activity?.kind && slide.activity.kind!=='none')||slide.interaction.type!=='none'){if(!window.confirm('Replace this activity with a motion scene? Undo restores it.'))return;}edit(s=>{s.scene=defaultScene();delete s.activity;s.interaction.type='none';});}}>Add motion scene</button>:<>
 <p>Right-angle journey. Distances are metres; timing is illustrative playback.</p>
 {([['firstLeg','First leg (m)',1,100],['secondLeg','Second leg (m)',1,100],['duration','Playback duration (s)',2,60],['yaw','Camera yaw',-180,180],['elevation','Camera elevation',15,80]] as const).map(([key,label,min,max])=><label key={key}>{label}<input type="number" min={min} max={max} value={c[key]} onChange={e=>edit(s=>{if(s.scene)s.scene[key]=Math.max(min,Math.min(max,Number(e.target.value)));})}/></label>)}
 <label>Object color<input type="color" value={c.color} onChange={e=>edit(s=>{if(s.scene)s.scene.color=e.target.value;})}/></label>
 <label><input type="checkbox" checked={c.cinematic} onChange={e=>edit(s=>{if(s.scene)s.scene.cinematic=e.target.checked;})}/>Cinematic camera sweep</label>
 <button onClick={()=>edit(s=>{delete s.scene;})}>Remove scene</button></>}</fieldset>;
}
export function MotionView({config}:{config:MotionScene}) {
 const [progress,setProgress]=useState(0),[playing,setPlaying]=useState(false),[mode,setMode]=useState<'2d'|'3d'>('2d'),[error,setError]=useState('');
 const host=useRef<HTMLDivElement>(null),runtime=useRef<{draw(p:number):void;orbit(delta:number):void;dispose():void}|null>(null),current=useRef(progress);current.current=progress;
 useEffect(()=>{if(!playing)return;let frame=0,last=performance.now();const tick=(now:number)=>{const dt=Math.min((now-last)/1000,.1);last=now;setProgress(p=>Math.min(1,p+dt/config.duration));frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);},[playing,config.duration]);
 useEffect(()=>{if(progress>=1)setPlaying(false);runtime.current?.draw(progress);},[progress]);
 useEffect(()=>{if(mode!=='3d'||!host.current)return;let active=true;setError('');import('./motion-renderer.js').then(({mountMotion})=>{if(!active||!host.current)return;try{runtime.current=mountMotion(host.current,config);runtime.current.draw(current.current);}catch{setError('3D unavailable on this device. Use the equivalent 2D view.');setMode('2d');}}).catch(()=>{if(active){setError('3D could not load. Use the equivalent 2D view.');setMode('2d');}});return()=>{active=false;runtime.current?.dispose();runtime.current=null;};},[mode,config]);
 const travelled=progress*(config.firstLeg+config.secondLeg),x=Math.min(travelled,config.firstLeg),y=Math.max(0,travelled-config.firstLeg),scale=240/Math.max(config.firstLeg,config.secondLeg),px=80+x*scale,py=300-y*scale;
 return <section className="ds-motion" aria-label="Motion simulation">
 <div className="ds-motion-stage">{mode==='3d'?<div className="ds-webgl" ref={host}/>:<svg viewBox="0 0 600 350" role="img" aria-label="Two-dimensional right-angle journey"><rect width="600" height="350" fill="#091b2e"/><path d={`M80 300H${80+config.firstLeg*scale}V${300-config.secondLeg*scale}`} fill="none" stroke="#5586a9" strokeWidth="4"/><path d={`M80 300H${px}V${py}`} fill="none" stroke={config.color} strokeWidth="5"/><line x1="80" y1="300" x2={px} y2={py} stroke="#ffd076" strokeWidth="3" strokeDasharray="8 5"/><circle cx={px} cy={py} r="10" fill={config.color}/><text x="90" y="330" fill="white" fontSize="16">First leg: {config.firstLeg} m • Second leg: {config.secondLeg} m</text></svg>}</div>
 <div className="ds-motion-controls"><button onClick={()=>{if(progress>=1)setProgress(0);setPlaying(p=>!p);}}>{playing?'Pause motion':'Play motion'}</button><button onClick={()=>{setPlaying(false);setProgress(0);}}>Reset motion</button><button onClick={()=>setMode(m=>m==='2d'?'3d':'2d')}>{mode==='2d'?'View in 3D':'View in 2D'}</button>{mode==='3d'&&<><button onClick={()=>runtime.current?.orbit(-15)}>Rotate left</button><button onClick={()=>runtime.current?.orbit(15)}>Rotate right</button></>}<label>Timeline<input aria-label="Motion timeline" type="range" min="0" max="1" step="0.001" value={progress} onChange={e=>{setPlaying(false);setProgress(Number(e.target.value));}}/></label></div>
 <p role="status">Distance: {travelled.toFixed(1)} m · Displacement: {Math.hypot(x,y).toFixed(1)} m</p><small>Cyan route: distance. Gold arrow: displacement. Ideal perpendicular journey; playback is illustrative.</small>{error&&<p role="alert">{error}</p>}
 </section>;
}
