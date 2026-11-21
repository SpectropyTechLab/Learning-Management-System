/* Generated from the approved Physics Lab reference. Do not hand edit. */

/* ae2ec0df-c6c9-4992-86c2-9b7a344a7835 */
(function(){
const W=1000,H=560,R=Math.PI/180;
const C={ink:'#e8eef7',dim:'#8d9bb0',pink:'#1d2733',amber:'#ffb547',cyan:'#4fd6ff',lime:'#b6f35c',rose:'#ff6b9a',violet:'#b18cff',teal:'#3ee0c0',red:'#ff4d4d',blue:'#4c7dff',cu:'#d9964a'};
const FS='"IBM Plex Sans",system-ui,sans-serif',FM='"IBM Plex Mono",ui-monospace,monospace';
const cl=(v,a,b)=>Math.max(a,Math.min(b,v));
const avg=a=>a.reduce((x,y)=>x+y,0)/(a.length||1);
function T(c,s,x,y,o){o=o||{};c.font=(o.w||500)+' '+(o.s||15)+'px '+(o.m?FM:FS);c.fillStyle=o.c||C.ink;c.textAlign=o.a||'left';c.textBaseline=o.b||'alphabetic';c.fillText(s,x,y);}
function L(c,x1,y1,x2,y2,col,w,d){c.beginPath();c.strokeStyle=col;c.lineWidth=w||2;c.setLineDash(d||[]);c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();c.setLineDash([]);}
function P(c,pts,fill,st,w){c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(st){c.strokeStyle=st;c.lineWidth=w||1;c.stroke();}}
function RR(c,x,y,w,h,r,fill,st,lw){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(st){c.strokeStyle=st;c.lineWidth=lw||1;c.stroke();}}
function G(c,x1,y1,x2,y2,st){const g=c.createLinearGradient(x1,y1,x2,y2);st.forEach((s,i)=>g.addColorStop(i/(st.length-1),s));return g;}
function ball(c,x,y,r,hi,lo){const g=c.createRadialGradient(x-r*.35,y-r*.4,r*.1,x,y,r);g.addColorStop(0,'#ffffff');g.addColorStop(.22,hi);g.addColorStop(1,lo);c.beginPath();c.arc(x,y,r,0,7);c.fillStyle=g;c.fill();}
function head(c,x,y,a,col,s){s=s||10;c.save();c.translate(x,y);c.rotate(a);P(c,[[s*.6,0],[-s*.6,-s*.5],[-s*.6,s*.5]],col);c.restore();}
function ray(c,x1,y1,x2,y2,col,w,d){L(c,x1,y1,x2,y2,col,w||2.5,d);if(!d)head(c,(x1+x2)/2,(y1+y2)/2,Math.atan2(y2-y1,x2-x1),col,12);}
function arc(c,x,y,r,a1,a2,col,w){c.beginPath();c.strokeStyle=col;c.lineWidth=w||1.5;c.arc(x,y,r,a1,a2,a2<a1);c.stroke();}
function room(c,bench){c.fillStyle=G(c,0,0,0,H,['#1b2738','#0e1621']);c.fillRect(0,0,W,H);c.strokeStyle='rgba(255,255,255,0.035)';c.lineWidth=1;c.beginPath();for(let x=0;x<=W;x+=40){c.moveTo(x,0);c.lineTo(x,H)}for(let y=0;y<=H;y+=40){c.moveTo(0,y);c.lineTo(W,y)}c.stroke();
if(bench!==false){P(c,[[40,452],[960,452],[1000,488],[0,488]],G(c,0,452,0,488,['#7a5a3e','#4f3726']));P(c,[[0,488],[1000,488],[1000,H],[0,H]],G(c,0,488,0,H,['#3b291c','#1f150e']));L(c,40,452,960,452,'rgba(255,225,190,0.3)',1.5);}}
function paper(c){room(c,false);c.save();c.shadowColor='rgba(0,0,0,0.5)';c.shadowBlur=30;c.shadowOffsetY=10;RR(c,110,24,780,512,6,'#f4f1ea');c.restore();c.strokeStyle='rgba(60,90,130,0.09)';c.lineWidth=1;c.beginPath();for(let x=130;x<890;x+=20){c.moveTo(x,24);c.lineTo(x,536)}for(let y=44;y<536;y+=20){c.moveTo(110,y);c.lineTo(890,y)}c.stroke();}
function shadowE(c,x,y,rx){c.fillStyle='rgba(0,0,0,0.35)';c.beginPath();c.ellipse(x,y,rx,rx*.2,0,0,7);c.fill();}
function stand(c,x,top,ax){shadowE(c,x-10,472,85);P(c,[[x-80,460],[x+60,460],[x+70,468],[x-90,468]],'#6f7b8c');RR(c,x-90,468,160,10,2,'#3b4451');c.fillStyle=G(c,x-5,0,x+5,0,['#77849a','#eef2f7','#6c788c']);c.fillRect(x-5,top,10,460-top);if(ax!=null){const x1=Math.min(x,ax),x2=Math.max(x,ax);c.fillStyle=G(c,0,top+8,0,top+16,['#eef2f7','#77849a']);c.fillRect(x1,top+8,x2-x1,8);}RR(c,x-11,top+2,22,20,3,'#3f4958','#1f2630');}
function meter(c,cx,cy,r,val,min,max,sym,col,unit){const bw=2*r+30,bh=r*1.25+34,bx=cx-bw/2,by=cy-r-14;RR(c,bx+4,by+6,bw,bh,10,'rgba(0,0,0,0.45)');RR(c,bx,by,bw,bh,10,G(c,0,by,0,by+bh,['#3a4454','#222a35']),'#56627a',1.5);RR(c,bx+8,by+8,bw-16,r*0.95+10,6,'#f2efe6');const px=cx,py=by+12+r*0.95;
for(let k=0;k<=20;k++){const a=(-140+5*k)*R,l=k%2?r*0.07:r*0.13;L(c,px+Math.cos(a)*(r*0.86-l),py+Math.sin(a)*(r*0.86-l),px+Math.cos(a)*r*0.86,py+Math.sin(a)*r*0.86,'#1d2733',k%2?1:1.6);if(k%4===0){const v=min+(max-min)*k/20;T(c,(Math.abs(v%1)>0.001?v.toFixed(1):Math.round(v))+'',px+Math.cos(a)*r*0.62,py+Math.sin(a)*r*0.62,{s:Math.max(9,r*0.17),a:'center',b:'middle',c:'#1d2733'})}}
arc(c,px,py,r*0.86,-140*R,-40*R,'#1d2733',1.2);T(c,sym,px,py-r*0.25,{s:r*0.3,w:700,a:'center',b:'middle',c:'#b3261e'});
const f=cl((val-min)/(max-min),-0.03,1.03),a=(-140+100*f)*R;L(c,px,py,px+Math.cos(a)*r*0.92,py+Math.sin(a)*r*0.92,'#d7263d',2);c.beginPath();c.arc(px,py,4,0,7);c.fillStyle='#1d2733';c.fill();
if(unit!==undefined)T(c,unit,cx,by+bh-9,{m:1,s:Math.max(11,r*0.21),a:'center',c:col||C.lime,w:600});}
function watch(c,x,y,r,t){RR(c,x-8,y-r-22,16,14,3,'#8792a3');c.beginPath();c.arc(x,y,r+8,0,7);c.fillStyle=G(c,x-r,y-r,x+r,y+r,['#dfe5ec','#6d7888']);c.fill();c.beginPath();c.arc(x,y,r,0,7);c.fillStyle='#f5f3ec';c.fill();for(let k=0;k<60;k++){const a=k*6*R-Math.PI/2,l=k%5?5:10;L(c,x+Math.cos(a)*(r-l),y+Math.sin(a)*(r-l),x+Math.cos(a)*(r-2),y+Math.sin(a)*(r-2),'#1d2733',k%5?1:2)}const a=(t%60)/60*2*Math.PI-Math.PI/2;L(c,x,y,x+Math.cos(a)*(r-8),y+Math.sin(a)*(r-8),'#d7263d',2.5);c.beginPath();c.arc(x,y,4,0,7);c.fillStyle='#d7263d';c.fill();RR(c,x-40,y+r*0.28,80,24,4,'#1d2733');T(c,t.toFixed(2)+' s',x,y+r*0.28+17,{m:1,s:14,a:'center',c:C.lime,w:600});}
function hint(c,s,dark){T(c,s,W/2,H-14,{a:'center',s:14,c:dark?'rgba(29,39,51,0.6)':'rgba(232,238,247,0.55)'});}

const S=window.LabSims=window.LabSims||{};

S.pendulum={title:'Simple Pendulum',topic:'mech',grades:[7,9,11],
aim:'Measure the time period of a simple pendulum, study how it depends on length, and find g from the L–T² graph.',
apparatus:['Clamp stand & split cork','Metallic bob with thread','Stopwatch','Metre scale','Protractor'],
formula:'T = 2π √(L / g)     g = 4π² L / T²',
procedure:['Set the effective length L with the slider.','Drag the bob sideways (keep amplitude small) or tap “Release bob”.','The stopwatch starts as the bob first passes the mean position.','After at least 10 oscillations tap “Record reading”.','Repeat for 5–6 lengths. The L–T² graph is a straight line.'],
controls:[{k:'L',label:'Effective length',type:'range',min:20,max:120,step:1,def:80,unit:'cm'},{k:'amp',label:'Amplitude',type:'range',min:2,max:15,step:1,def:8,unit:'°'},{k:'g',label:'Location',type:'select',def:9.8,options:[[9.8,'Earth'],[1.62,'Moon'],[3.72,'Mars']]}],
init(p){return{th:p.amp*R,w:0,run:false,t:0,n:-1,tLast:0}},
actions:[{label:'Release bob',run(s,p){Object.assign(s,{th:p.amp*R,w:0,run:true,t:0,n:-1,tLast:0})}},{label:'Stop',run(s,p){Object.assign(s,{th:p.amp*R,w:0,run:false,t:0,n:-1,tLast:0})}}],
onChange(s,p){Object.assign(s,{th:p.amp*R,w:0,run:false,t:0,n:-1,tLast:0})},
step(s,p,dt){if(!s.run)return;const Lm=p.L/100,n=8,h=dt/n;for(let i=0;i<n;i++){const pr=s.th;s.w+=-(p.g/Lm)*Math.sin(s.th)*h;s.th+=s.w*h;if(s.n>=0)s.t+=h;if(pr<0&&s.th>=0){s.n++;if(s.n===0)s.t=0;s.tLast=s.t;}}},
pointer(s,p,x,y,ph){const px=560,py=62,Lp=p.L*3.1,bx=px+Math.sin(s.th)*Lp,by=py+Math.cos(s.th)*Lp;if(ph==='down'&&Math.hypot(x-bx,y-by)<45){Object.assign(s,{drag:true,run:false,n:-1,t:0,w:0})}if(!s.drag)return null;if(ph==='up'){s.drag=false;s.run=true;s.w=0;return null}const a=cl(Math.atan2(x-px,y-py),-15*R,15*R);s.th=a;return{amp:Math.max(2,Math.round(Math.abs(a)/R))}},
draw(c,s,p,t){room(c);const px=560,py=62,Lp=p.L*3.1;
RR(c,352,py,40,390,3,'#efe6c8','#b9ab80');for(let cm=0;cm<=125;cm++){const y=py+cm*3.1;if(y>450)break;L(c,392,y,392-(cm%10?(cm%5?6:10):16),y,'#3b3325',cm%10?1:1.5);if(cm%10===0&&cm)T(c,cm+'',358,y+4,{s:10,m:1,c:'#3b3325'})}
stand(c,300,40,px+24);RR(c,px-10,py-12,20,14,3,'#b08255');
c.beginPath();c.moveTo(px,py);c.arc(px,py,86,70*R,110*R);c.closePath();c.fillStyle='rgba(79,214,255,0.1)';c.fill();c.strokeStyle='rgba(79,214,255,0.5)';c.lineWidth=1;c.stroke();
for(let a=-20;a<=20;a+=5){const q=(90-a)*R;L(c,px+Math.cos(q)*76,py+Math.sin(q)*76,px+Math.cos(q)*86,py+Math.sin(q)*86,'rgba(79,214,255,0.8)',1)}
L(c,px,py,px,py+Lp+24,'rgba(255,255,255,0.2)',1,[6,6]);
const bx=px+Math.sin(s.th)*Lp,by=py+Math.cos(s.th)*Lp;L(c,392,by,bx-16,by,'rgba(255,181,71,0.5)',1,[3,4]);
shadowE(c,bx,474,18);L(c,px,py,bx,by,'#dfe6ee',1.5);ball(c,bx,by,15,'#ffcf7a','#7a4d0e');
T(c,'L = '+p.L+' cm',px+30,py+Lp/2,{s:15,w:600,c:C.amber});
watch(c,845,160,72,s.n>=0?s.t:0);T(c,'Oscillations',845,292,{a:'center',s:13,c:C.dim});T(c,Math.max(0,s.n)+'',845,326,{a:'center',s:32,w:600,m:1,c:C.amber});
if(!s.run)hint(c,'Drag the bob sideways and let go — or tap “Release bob”');},
readings(s,p){const n=Math.max(0,s.n);return[['Length L',p.L,'cm'],['Oscillations n',n,''],['Time t',(s.n>=0?s.t:0).toFixed(2),'s'],['Period T = t/n',n?(s.tLast/n).toFixed(3):'—','s']]},
columns:['L (cm)','n','t (s)','T (s)','T² (s²)'],
record(s,p){const n=Math.max(0,s.n);if(n<5)return{error:'Let the bob complete at least 5 oscillations first.'};const Tp=s.tLast/n;return[p.L,n,+s.tLast.toFixed(2),+Tp.toFixed(3),+(Tp*Tp).toFixed(3)]},
plot:{x:0,y:4},
result(rows){return 'g = 4π²L/T²  ≈  '+avg(rows.map(r=>4*Math.PI*Math.PI*(r[0]/100)/r[4])).toFixed(2)+' m/s²'}};

S.spring={title:"Hooke's Law — Spring Constant",topic:'mech',grades:[9,11],
aim:'Verify Hooke’s law and find the spring constant of a helical spring from its load–extension graph.',
apparatus:['Helical spring on rigid stand','Slotted masses with hanger (50 g each)','Vertical metre scale','Pointer'],
formula:'F = k x     k = F / x = mg / x',
procedure:['Note the pointer position with no load (zero).','Add slotted masses in steps of 50 g.','Wait until the spring comes to rest and read the extension.','Tap “Record reading” for each load.','Plot F against x; the slope gives k.'],
controls:[{k:'m',label:'Load (slotted mass)',type:'range',min:0,max:500,step:50,def:100,unit:'g'},{k:'k',label:'Spring',type:'select',def:20,options:[[10,'Soft'],[20,'Medium'],[40,'Stiff']]}],
init(p){return{y:p.m/1000*9.8/p.k,v:0}},
step(s,p,dt){const eq=p.m/1000*9.8/p.k,M=p.m/1000+0.04,n=8,h=dt/n;for(let i=0;i<n;i++){const a=p.k*(eq-s.y)/M-2.2*s.v;s.v+=a*h;s.y+=s.v*h}},
draw(c,s,p){room(c);const hx=520,hy=66,nat=110,ext=s.y*300,y0=hy+8+nat,y1=y0+ext;stand(c,380,44,hx+20);L(c,hx,hy-6,hx,hy+8,'#cfd6df',3);
c.beginPath();c.moveTo(hx,hy+8);c.lineTo(hx,hy+18);const n=18,top=hy+18,bot=y1-10;for(let i=0;i<=n;i++)c.lineTo(hx+(i%2?17:-17),top+(bot-top)*(i+.5)/(n+1));c.lineTo(hx,bot);c.lineTo(hx,y1);c.strokeStyle='#c9d3de';c.lineWidth=2.6;c.stroke();
RR(c,612,y0-14,46,212,3,'#efe6c8','#b9ab80');for(let cm=0;cm<=64;cm++){const y=y0+cm*3;L(c,612,y,612+(cm%10?(cm%5?6:10):16),y,'#3b3325',cm%10?1:1.5);if(cm%10===0)T(c,cm+'',632,y+4,{s:10,m:1,c:'#3b3325'})}T(c,'cm',635,y0-18,{s:11,c:C.dim});
L(c,hx,y1,605,y1,C.red,2);head(c,608,y1,0,C.red,8);
const nd=Math.round(p.m/50);L(c,hx,y1,hx,y1+10,'#b0bac6',3);let yy=y1+10;RR(c,hx-30,yy,60,7,3,'#8f9aa8');yy+=7;for(let i=0;i<nd;i++){RR(c,hx-32,yy,64,9,3,G(c,hx-32,0,hx+32,0,['#8a6420','#f1c56a','#9c7327']),'#5d4312',0.8);yy+=10}
T(c,p.m+' g',hx-44,y1+24,{a:'right',s:15,w:600,c:C.amber});T(c,'x = '+(s.y*100).toFixed(1)+' cm',700,y1+5,{s:15,w:600,c:C.lime,m:1});},
readings(s,p){const F=p.m*0.0098,x=s.y*100;return[['Load m',p.m,'g'],['Force F = mg',F.toFixed(3),'N'],['Extension x',x.toFixed(1),'cm'],['F / x',x>0.05?(F/(x/100)).toFixed(1):'—','N/m']]},
columns:['m (g)','F (N)','x (cm)'],
record(s,p){if(Math.abs(s.v)>0.01)return{error:'Wait for the spring to come to rest.'};return[p.m,+(p.m*0.0098).toFixed(3),+(s.y*100).toFixed(1)]},
plot:{x:2,y:1},
result(rows){const r=rows.filter(r=>r[2]>0);return r.length?'Spring constant k = F/x ≈ '+avg(r.map(r=>r[1]/(r[2]/100))).toFixed(1)+' N/m':''}};

S.inclined={title:'Friction on an Inclined Plane',topic:'mech',grades:[8,11],
aim:'Find the angle of repose and the coefficient of static friction between a block and different surfaces.',
apparatus:['Adjustable inclined plane with protractor','Wooden block','Glass, wood and sandpaper surfaces'],
formula:'Block slides when tan θ > μs      μs = tan θ(repose)',
procedure:['Choose a surface and keep the plane horizontal.','Increase the angle slowly, 1° at a time.','Record a reading at each angle: does the block stay or slide?','The smallest angle at which it slides is the angle of repose.','Repeat for other surfaces and compare.'],
controls:[{k:'a',label:'Angle of incline θ',type:'range',min:0,max:45,step:1,def:10,unit:'°'},{k:'mu',label:'Surface',type:'select',def:0.35,options:[[0.2,'Glass'],[0.35,'Wood'],[0.6,'Sandpaper']]},{k:'m',label:'Block mass',type:'range',min:0.5,max:3,step:0.5,def:1,unit:'kg'}],
init(){return{d:0,v:0}},
actions:[{label:'Reset block to top',run(s){s.d=0;s.v=0}}],
onChange(s,p,k){if(k!=='m'){s.v=0;if(s.d>=610)s.d=0;}},
step(s,p,dt){const th=p.a*R,slides=Math.tan(th)>p.mu;if(s.d>=620){s.v=0;return}if(slides||s.v>0){const a=9.8*(Math.sin(th)-0.8*p.mu*Math.cos(th));s.v=Math.max(0,s.v+a*dt);s.d=Math.min(620,s.d+s.v*dt*140)}s.mov=s.v>0.001},
draw(c,s,p){room(c);const th=p.a*R,Bx=150,By=452,Lp=700,Ax=Bx+Lp*Math.cos(th),Ay=By-Lp*Math.sin(th);const surf={0.2:'#a6e1f2',0.35:'#b98147',0.6:'#7d6a52'}[p.mu]||'#b98147';
c.fillStyle='rgba(0,0,0,0.35)';c.beginPath();c.ellipse((Bx+Ax)/2,462,Lp/2,10,0,0,7);c.fill();P(c,[[Bx,By],[Ax,By],[Ax,Ay]],G(c,0,Ay,0,By,['#5a6574','#353e4a']),'#1d2430',1);L(c,Bx,By,Ax,Ay,surf,8);
arc(c,Bx,By,95,0,-th,C.amber,2);T(c,'θ = '+p.a+'°',Bx+108,By-14,{s:17,w:600,c:C.amber});
const ux=Math.cos(th),uy=-Math.sin(th),nx=-Math.sin(th),ny=-Math.cos(th),al=Lp-40-s.d,cx=Bx+ux*al+nx*29,cy=By+uy*al+ny*29;
c.save();c.translate(cx,cy);c.rotate(-th);RR(c,-40,-25,80,50,5,G(c,0,-25,0,25,['#7aa4ff','#2f55b8']),'#1b2f6a',1.5);T(c,p.m+' kg',0,6,{a:'center',s:15,w:600});c.restore();
const mg=p.m*9.8,sc=6,N=mg*Math.cos(th),slides=Math.tan(th)>p.mu,fr=s.mov||slides?0.8*p.mu*N:mg*Math.sin(th);
ray(c,cx,cy,cx,cy+mg*sc*0.7+20,C.amber,2.5);T(c,'mg',cx+8,cy+mg*sc*0.7+18,{s:14,w:600,c:C.amber});
ray(c,cx,cy,cx+nx*(N*sc*0.7+20),cy+ny*(N*sc*0.7+20),C.cyan,2.5);T(c,'N',cx+nx*(N*sc*0.7+30),cy+ny*(N*sc*0.7+30),{s:14,w:600,c:C.cyan});
if(fr>0.01){const fl=fr*sc*1.4+14;ray(c,cx+ux*40,cy+uy*40,cx+ux*(40+fl),cy+uy*(40+fl),C.rose,2.5);T(c,'f',cx+ux*(48+fl),cy+uy*(48+fl)-6,{s:15,w:600,c:C.rose})}
T(c,s.mov?'SLIDING':(s.d>=620?'AT BOTTOM':'AT REST'),870,70,{a:'center',s:22,w:700,m:1,c:s.mov?C.rose:C.lime});},
readings(s,p){const th=p.a*R,mg=p.m*9.8;return[['tan θ',Math.tan(th).toFixed(3),''],['Down-slope pull mg sinθ',(mg*Math.sin(th)).toFixed(2),'N'],['Max. friction μmg cosθ',(p.mu*mg*Math.cos(th)).toFixed(2),'N'],['Block',s.mov||Math.tan(th)>p.mu?'Slides':'At rest','']]},
columns:['Surface','θ (°)','tan θ','Block'],
record(s,p){return[{0.2:'Glass',0.35:'Wood',0.6:'Sandpaper'}[p.mu],p.a,+Math.tan(p.a*R).toFixed(3),Math.tan(p.a*R)>p.mu?'Slides':'At rest']},
result(rows){const out=[];['Glass','Wood','Sandpaper'].forEach(n=>{const sl=rows.filter(r=>r[0]===n&&r[3]==='Slides').sort((a,b)=>a[1]-b[1]);if(!sl.length)return;const th=sl[0][1],rest=rows.filter(r=>r[0]===n&&r[3]==='At rest'&&r[1]<th).map(r=>r[1]),lo=rest.length?Math.max(...rest):null;if(lo!==null&&th-lo<=1)out.push(n+': θr ≈ '+th+'°, μs = tan θr ≈ '+sl[0][2]);else out.push(n+': θr lies between '+(lo===null?'0':lo)+'° and '+th+'° — go up 1° at a time between these to find it exactly')});return out.join('   ·   ')}};

const DEN={7.87:['Iron','#8e98a6','#4b525c'],2.7:['Aluminium','#dfe5ec','#8b949f'],8.96:['Copper','#e59a64','#8a4a22']};
const LIQ={1:['Water','rgba(79,179,255,0.38)'],1.1:['Salt water','rgba(110,210,235,0.42)'],0.8:['Kerosene','rgba(232,198,90,0.38)']};
S.buoyancy={title:"Archimedes' Principle",topic:'mech',grades:[8,9],
aim:'Show that the loss in weight of a solid immersed in a liquid equals the weight of the liquid it displaces.',
apparatus:['Spring balance (0–10 N)','Solid of volume 100 cm³','Overflow can','Measuring cylinder','Stand, thread, liquids'],
formula:'Loss of weight = Buoyant force = ρ(liquid) · V(immersed) · g',
procedure:['Hang the solid from the spring balance and note its weight in air.','Fill the overflow can up to the spout.','Lower the solid gradually into the liquid.','At each step read the balance and the displaced liquid in the cylinder.','Compare loss of weight with weight of displaced liquid.'],
controls:[{k:'obj',label:'Solid',type:'select',def:7.87,options:[[7.87,'Iron'],[2.7,'Aluminium'],[8.96,'Copper']]},{k:'liq',label:'Liquid',type:'select',def:1,options:[[1,'Water'],[1.1,'Salt water'],[0.8,'Kerosene']]},{k:'imm',label:'Lower into liquid',type:'range',min:0,max:100,step:10,def:0,unit:'%'}],
init(p){return{im:p.imm}},
step(s,p,dt){s.im+=(p.imm-s.im)*Math.min(1,dt*3);s.flow=p.imm-s.im>0.8},
vals(s,p){const Wa=p.obj*100/1000*9.8,B=p.liq*100*(s.im/100)/1000*9.8;return{Wa,B,Wp:Wa-B,vol:s.im}},
draw(c,s,p,t){room(c);const v=this.vals(s,p),d=DEN[p.obj],lq=LIQ[p.liq];stand(c,300,30,500);
L(c,480,46,480,56,'#cfd6df',2);RR(c,460,56,40,150,6,G(c,460,0,500,0,['#9aa6b6','#e8edf3','#8d99aa']),'#4a5566');RR(c,468,64,24,132,2,'#f6f1dc');for(let n=0;n<=10;n++){const y=66+n*12.6;L(c,468,y,478,y,'#3b3325',1);if(n%2===0)T(c,n+'',484,y+4,{s:9,m:1,c:'#3b3325'})}const pyy=66+v.Wp*12.6;L(c,466,pyy,494,pyy,C.red,3);T(c,'N',480,202,{s:9,a:'center',c:'#3b3325'});L(c,480,206,480,216,'#cfd6df',2);
const top=240+80*s.im/100;L(c,480,216,480,top,'#e8e2d0',1.2);
shadowE(c,480,466,95);RR(c,398,292,164,170,[4,4,10,10],'rgba(220,235,245,0.06)');
RR(c,450,top,60,80,5,G(c,450,0,510,0,[d[2],d[1],d[2]]));c.beginPath();c.ellipse(480,top+2,30,6,0,0,7);c.fillStyle=d[1];c.fill();
c.fillStyle=lq[1];c.fillRect(400,320,160,140);L(c,400,320,560,320,'rgba(255,255,255,0.5)',1.2);
c.strokeStyle='rgba(220,235,245,0.55)';c.lineWidth=2.5;c.beginPath();c.moveTo(398,292);c.lineTo(398,462);c.lineTo(562,462);c.lineTo(562,292);c.stroke();
P(c,[[560,316],[638,338],[636,346],[560,326]],'rgba(220,235,245,0.4)');
if(s.flow){for(let i=0;i<4;i++){const f=((t*2+i/4)%1);c.beginPath();c.arc(640,346+f*(462-346-v.vol*1.1),3,0,7);c.fillStyle=lq[1].replace(/0\.\d+\)/,'0.9)');c.fill()}}
shadowE(c,665,466,40);const cy0=462-v.vol*1.15;c.fillStyle=lq[1];c.fillRect(642,cy0,46,462-cy0);RR(c,640,332,50,132,[2,2,6,6],null,'rgba(220,235,245,0.6)',2);for(let ml=0;ml<=100;ml+=10){const y=462-ml*1.15;L(c,640,y,ml%50?650:656,y,'rgba(232,238,247,0.7)',1);if(ml%20===0)T(c,ml+'',696,y+4,{s:10,m:1,c:C.dim})}T(c,'mL',696,322,{s:10,c:C.dim});
T(c,d[0]+' block',540,top+45,{s:13,c:C.ink});T(c,lq[0],410,445,{s:13,w:600,c:'#e8eef7'});
T(c,'Wʹ = '+v.Wp.toFixed(2)+' N',800,120,{s:22,w:600,m:1,c:C.amber,a:'center'});T(c,'spring balance',800,142,{s:12,c:C.dim,a:'center'});
T(c,v.vol.toFixed(0)+' mL',800,300,{s:22,w:600,m:1,c:C.cyan,a:'center'});T(c,'liquid displaced',800,322,{s:12,c:C.dim,a:'center'});},
readings(s,p){const v=this.vals(s,p);return[['Weight in air W',v.Wa.toFixed(2),'N'],['Apparent weight Wʹ',v.Wp.toFixed(2),'N'],['Loss W − Wʹ',v.B.toFixed(2),'N'],['Weight displaced',(p.liq*v.vol/1000*9.8).toFixed(2),'N']]},
columns:['Immersed (%)','Wʹ (N)','Loss (N)','Wt. displaced (N)'],
record(s,p){if(Math.abs(p.imm-s.im)>0.5)return{error:'Wait for the block to settle.'};const v=this.vals(s,p);return[p.imm,+v.Wp.toFixed(2),+v.B.toFixed(2),+(p.liq*v.vol/1000*9.8).toFixed(2)]},
plot:{x:3,y:2},
result(rows){if(!rows.length)return'';const f=rows.find(r=>r[0]===100);return'Loss of weight = weight of liquid displaced → Archimedes’ principle verified.'+(f?'   ·   Density of solid = W/(V·g) ≈ '+((f[1]+f[2])/0.98).toFixed(2)+' g/cm³':'   ·   Record at 100 % immersion to find density.')}};

const OBJ={18.6:'Steel ball',24.3:'Metal cylinder',12.8:'Glass marble',0:'Nothing (zero check)'};
S.vernier={title:'Vernier Callipers',topic:'meas',grades:[9,11],
aim:'Use Vernier callipers to measure the diameter of a small spherical or cylindrical body.',
apparatus:['Vernier callipers (LC 0.1 mm)','Steel ball','Metal cylinder','Glass marble'],
formula:'LC = 1 MSD − 1 VSD = 0.1 mm     D = MSR + (VSC × LC)',
procedure:['Close the jaws with nothing between them and check for zero error.','Place the object and slide the movable jaw until it grips the object.','Read the main scale just before the vernier zero (MSR).','Find the vernier division that coincides with a main scale mark (VSC).','Record; repeat 3 times and take the mean.'],
controls:[{k:'obj',label:'Object between jaws',type:'select',def:18.6,options:[[18.6,'Steel ball'],[24.3,'Cylinder'],[12.8,'Marble'],[0,'None']]},{k:'jaw',label:'Slide jaw',type:'range',min:0,max:60,step:0.1,def:30,unit:'mm'},{k:'rev',label:'Show my reading',type:'toggle',def:false}],
init(){return{}},
onChange(s,p,k){if(k==='obj'&&p.jaw<+p.obj)p.jaw=+p.obj},
J(p){return Math.max(p.jaw,+p.obj)},
drawScale(c,J,hl){const x0=150,S=10,vx=x0+J*S;RR(c,70,150,880,70,4,G(c,0,150,0,220,['#e9edf2','#aab4c1','#d5dbe3']),'#6d7888');
for(let mm=0;mm<=78;mm++){const x=x0+mm*S,l=mm%10?(mm%5?12:18):28;L(c,x,220,x,220-l,hl===mm?'#2e9e2e':'#1d2733',hl===mm?2.6:1.2);if(mm%10===0)T(c,mm/10+'',x,184,{a:'center',s:14,w:600,c:'#1d2733'})}T(c,'cm',905,170,{s:12,c:'#1d2733'});
RR(c,vx-2,220,160,60,[0,0,6,6],G(c,0,220,0,280,['#dfe4ea','#9ea9b7']),'#6d7888');for(let k=0;k<=10;k++){const x=vx+k*9,on=hl!=null&&k===Math.round(J*10)%10;L(c,x,220,x,220+(k%5?12:20),on?'#2e9e2e':'#1d2733',on?2.6:1.2);if(k%5===0)T(c,k+'',x,258,{a:'center',s:12,c:'#1d2733'})}
for(let i=0;i<5;i++)L(c,vx+110+i*7,262,vx+110+i*7,276,'#6d7888',2);},
draw(c,s,p){room(c,false);RR(c,40,20,920,520,14,'#141e2b');const J=this.J(p),D=+p.obj,x0=150,S=10,vx=x0+J*S,n=Math.round(J*10)%10,hl=Math.floor(J+1e-6)+n;
P(c,[[70,220],[x0,220],[x0,512],[x0-24,512],[x0-44,300],[70,286]],G(c,70,0,x0,0,['#9ea9b7','#e5e9ee']),'#6d7888');
P(c,[[vx,280],[vx,512],[vx+24,512],[vx+44,300],[vx+60,280]],G(c,vx,0,vx+60,0,['#e5e9ee','#9ea9b7']),'#6d7888');
if(D>0){const r=D*S/2,cx=x0+r;if(D===24.3){RR(c,x0,300,D*S,190,4,G(c,x0,0,x0+D*S,0,['#6e7784','#d5dce4','#5b6370']));c.beginPath();c.ellipse(cx,300,r,12,0,0,7);c.fillStyle='#c4ccd6';c.fill()}else ball(c,cx,398,r,D===12.8?'#9fe3d0':'#c9d2dc',D===12.8?'#1f7a68':'#4d5663')}
this.drawScale(c,J,hl);
c.save();RR(c,420,28,500,110,10,'#0b1119','#3ee0c0',1.5);c.clip();c.translate(670-(vx+45)*4,83-222*4);c.scale(4,4);this.drawScale(c,J,hl);c.restore();T(c,'MAGNIFIED ×4',432,48,{s:11,w:600,c:C.teal});
T(c,'LC = 0.1 mm',80,60,{s:16,w:600,m:1,c:C.teal});T(c,OBJ[p.obj]||'',80,86,{s:14,c:C.dim});
hint(c,'Drag the movable jaw — then read MSR and the coinciding vernier division');},
pointer(s,p,x,y,ph){const vx=150+this.J(p)*10;if(ph==='down'&&x>vx-20&&x<vx+160&&y>150&&y<520){s.drag=true;s.off=x-vx}if(!s.drag)return null;if(ph==='up'){s.drag=false;return null}return{jaw:Math.round(cl((x-s.off-150)/10,Math.max(0,+p.obj),60)*10)/10}},
readings(s,p){const J=this.J(p),msr=Math.floor(J+1e-6),n=Math.round(J*10)%10,r=p.rev;return[['Least count','0.1','mm'],['MSR',r?msr:'?','mm'],['VSC',r?n:'?','div'],['Reading',r?J.toFixed(1):'?','mm']]},
columns:['Object','MSR (mm)','VSC','D (mm)'],
record(s,p){const J=this.J(p);if(+p.obj&&Math.abs(p.jaw-p.obj)>0.05)return{error:'Close the jaw so it just grips the object.'};return[OBJ[p.obj].split(' (')[0],Math.floor(J+1e-6),Math.round(J*10)%10,+J.toFixed(1)]},
result(rows){const m={};rows.forEach(r=>(m[r[0]]=m[r[0]]||[]).push(r[3]));return Object.keys(m).map(k=>k+': mean D = '+avg(m[k]).toFixed(2)+' mm').join('   ·   ')}};

function resAt(p){const lam=34300/p.f,e=1.5;return Math.max(...[lam/4-e,3*lam/4-e].map(l=>Math.exp(-Math.pow((p.L-l)/0.8,2))))}
S.resonance={title:'Resonance Tube — Speed of Sound',topic:'sound',grades:[8,9,11],
aim:'Find the speed of sound in air at room temperature using a resonance tube and two resonance positions.',
apparatus:['Resonance tube with water reservoir','Tuning forks (288–512 Hz)','Rubber pad','Metre scale'],
formula:'l₂ − l₁ = λ/2     v = 2 f (l₂ − l₁)',
procedure:['Choose a tuning fork and tap “Strike tuning fork” (turn sound on to hear it).','Slowly change the air-column length by moving the water level.','Find the position of loudest sound (first resonance l₁) and record.','Increase the length to find the second resonance l₂ and record.','Speed of sound v = 2f(l₂ − l₁). Repeat with another fork.'],
controls:[{k:'f',label:'Tuning fork',type:'select',def:512,options:[[288,'288 Hz'],[384,'384 Hz'],[480,'480 Hz'],[512,'512 Hz']]},{k:'L',label:'Air column length',type:'range',min:5,max:95,step:0.1,def:10,unit:'cm'},{k:'snd',label:'Sound',type:'toggle',def:true}],
init(){return{time:0,strike:null,loud:0,res:0}},
actions:[{label:'Strike tuning fork',run(s,p){s.strike=s.time;if(!p.snd)return;try{if(!s.ac){const A=window.AudioContext||window.webkitAudioContext;s.ac=new A();s.osc=s.ac.createOscillator();s.gn=s.ac.createGain();s.gn.gain.value=0;s.osc.connect(s.gn).connect(s.ac.destination);s.osc.start()}s.ac.resume()}catch(e){}}}],
step(s,p,dt){s.time+=dt;const dec=s.strike==null?0:Math.exp(-(s.time-s.strike)/4);s.dec=dec;s.res=resAt(p);s.loud=dec*(0.05+0.95*s.res);if(s.osc){s.osc.frequency.value=p.f;s.gn.gain.setTargetAtTime(p.snd?0.2*dec*(0.03+0.97*s.res):0,s.ac.currentTime,0.03)}},
dispose(s){try{s.osc&&s.osc.stop();s.ac&&s.ac.close()}catch(e){}},
draw(c,s,p,t){room(c);const tx=455,top=70,k=3.6,lvl=top+p.L*k,bot=top+100*k;stand(c,340,40,tx-25);RR(c,tx-32,150,64,12,3,'#3f4958');RR(c,tx-32,360,64,12,3,'#3f4958');
RR(c,tx-70,top,26,360,2,'#efe6c8','#b9ab80');for(let cm=0;cm<=100;cm++){const y=top+cm*k;L(c,tx-44,y,tx-44-(cm%10?(cm%5?5:9):14),y,'#3b3325',1);if(cm%10===0)T(c,cm+'',tx-66,y+4,{s:9,m:1,c:'#3b3325'})}
c.fillStyle='rgba(79,179,255,0.45)';c.fillRect(tx-24,lvl,48,bot-lvl);L(c,tx-24,lvl,tx+24,lvl,'#bfe6ff',2);
const lam=34300/p.f*k,e=1.5*k,A=22*s.loud;if(A>0.3){c.beginPath();for(let y=top;y<=lvl;y+=3)c.lineTo(tx-A*Math.abs(Math.cos(2*Math.PI*(y-top+e)/lam))*Math.sin(t*9),y);c.strokeStyle='rgba(177,140,255,0.9)';c.lineWidth=2;c.stroke();c.beginPath();for(let y=top;y<=lvl;y+=3)c.lineTo(tx+A*Math.abs(Math.cos(2*Math.PI*(y-top+e)/lam))*Math.sin(t*9),y);c.stroke();}
c.strokeStyle='rgba(220,235,245,0.6)';c.lineWidth=2.5;c.beginPath();c.moveTo(tx-25,top);c.lineTo(tx-25,bot);c.moveTo(tx+25,top);c.lineTo(tx+25,bot);c.stroke();
c.beginPath();c.moveTo(tx,bot);c.bezierCurveTo(tx,bot+60,690,bot+60,690,lvl+50);c.strokeStyle='#7a2d2d';c.lineWidth=9;c.stroke();
stand(c,760,40,700);RR(c,650,lvl-40,80,90,[6,6,14,14],'rgba(220,235,245,0.1)','rgba(220,235,245,0.6)',2);c.fillStyle='rgba(79,179,255,0.45)';c.fillRect(652,lvl,76,48);L(c,652,lvl,728,lvl,'#bfe6ff',2);RR(c,695,lvl-10,70,8,2,'#3f4958');
const vib=3*s.dec*Math.sin(t*70);RR(c,tx-3,0,6,14,1,'#aab4c1');RR(c,tx-16,12,32,8,3,'#aab4c1');RR(c,tx-16-vib,14,7,48,2,'#cfd6df');RR(c,tx+9+vib,14,7,48,2,'#cfd6df');T(c,p.f+' Hz',tx+30,40,{s:14,w:600,m:1,c:C.violet});
for(let i=0;i<3&&s.loud>0.08;i++){const r=((t*1.2+i/3)%1)*80;c.beginPath();c.arc(tx,50,20+r,-0.9,-2.24,true);c.strokeStyle='rgba(177,140,255,'+(s.loud*(1-r/80))+')';c.lineWidth=2;c.stroke()}
RR(c,850,90,56,340,8,'#0c1219','#3a4658');const hh=336*s.loud;RR(c,852,428-hh,52,hh,6,G(c,0,428,0,90,['#6a4fd1','#b18cff','#ffe08a']));T(c,'LOUDNESS',878,80,{a:'center',s:12,w:600,c:C.dim});T(c,Math.round(s.loud*100)+'',878,458,{a:'center',s:22,w:600,m:1,c:C.violet});
T(c,'l = '+p.L.toFixed(1)+' cm',tx+40,lvl+5,{s:16,w:600,m:1,c:C.cyan});
if(s.strike==null)hint(c,'Tap “Strike tuning fork”, then move the water level to find the loudest sound');},
readings(s,p){return[['Frequency f',p.f,'Hz'],['Air column l',p.L.toFixed(1),'cm'],['Resonance',Math.round(s.res*100),'%'],['Loudness',Math.round(s.loud*100),'%']]},
columns:['f (Hz)','l (cm)'],
record(s,p){if(s.strike==null||s.loud<0.05)return{error:'Strike the tuning fork first — no sound in the tube.'};if(s.res<0.8)return{error:'Not at resonance — adjust the water level to the loudest position.'};return[p.f,+p.L.toFixed(1)]},
result(rows){const g={};rows.forEach(r=>(g[r[0]]=g[r[0]]||[]).push(r[1]));const out=[];Object.keys(g).forEach(f=>{const a=g[f],d=Math.max(...a)-Math.min(...a);if(d>15)out.push(f+' Hz: v = 2f(l₂−l₁) ≈ '+(2*f*d/100).toFixed(0)+' m/s')});return out.join('   ·   ')||'Record both l₁ and l₂ for a fork to compute v.'}};

window.LabKit={W,H,R,C,T,L,P,RR,G,ball,head,ray,arc,room,paper,stand,meter,watch,cl,avg,shadowE,hint,FS,FM};
})();

/* 2853849f-170f-4f18-aa88-629a194abfbd */
(function(){
const K=window.LabKit;const {W,H,R,C,T,L,P,RR,G,ball,head,ray,arc,room,paper,stand,meter,watch,cl,avg,shadowE,hint}=K;
const S=window.LabSims;
function thermo(c,x,top,bot,v,mn,mx,tc){RR(c,x-9,top,18,bot-top+4,9,'rgba(235,242,250,0.92)','#9fb0c4',1);const span=bot-top-16,f=cl((v-mn)/(mx-mn),0,1);RR(c,x-3,bot-span*f-6,6,span*f+12,3,'#d62839');c.beginPath();c.arc(x,bot+8,13,0,7);c.fillStyle='#d62839';c.fill();for(let k=mn;k<=mx;k+=5){const y=bot-span*(k-mn)/(mx-mn);L(c,x+10,y,x+(k%10?15:20),y,tc||C.ink,1);if(k%10===0)T(c,k+'',x+24,y+4,{s:11,m:1,c:tc||C.ink})}}
function lcd(c,x,y,w,txt,col,lab){RR(c,x,y,w,50,8,'#0b1119','#3a4658');T(c,txt,x+w/2,y+34,{a:'center',s:24,w:600,m:1,c:col||C.lime});if(lab)T(c,lab,x+w/2,y-8,{a:'center',s:12,c:C.dim})}
function weights(c,x,y,n,w,th){w=w||56;th=th||10;L(c,x,y,x,y+10,'#b0bac6',3);let yy=y+10;RR(c,x-w/2+4,yy,w-8,6,3,'#8f9aa8');yy+=6;for(let i=0;i<n;i++){RR(c,x-w/2,yy,w,th-1,3,G(c,x-w/2,0,x+w/2,0,['#8a6420','#f1c56a','#9c7327']),'#5d4312',0.8);yy+=th}return yy}
function mmss(t){const m=Math.floor(t/60),s=Math.floor(t%60);return(m<10?'0':'')+m+':'+(s<10?'0':'')+s}
function metal(c,x,y,w,h){return G(c,x,0,x+w,0,['#7a8698','#eef2f6','#9aa6b6','#5d6876'])}
window.LabKit3={thermo,lcd,weights,mmss};

const SGN={0.82:'Copper wire',1.47:'Steel sheet',2.36:'Thick wire',0:'Zero check'};
S.screwGauge={title:'Screw Gauge',topic:'meas',grades:[11],
aim:'Use a screw gauge to measure the diameter of a wire and the thickness of a sheet, correcting for zero error.',
apparatus:['Screw gauge (pitch 0.5 mm, 50 divisions)','Copper wire','Steel sheet','Thick wire'],
formula:'LC = pitch ÷ circular divisions = 0.5 ÷ 50 = 0.01 mm\nReading = PSR + (CSR × LC)\nCorrected = Observed − Zero error',
procedure:['Close the gauge with nothing between the studs (Object: None) and note the zero error.','Place the object and turn the thimble (drag it, or use − / +) until the spindle just touches it.','Read the pitch scale (PSR) visible on the sleeve.','Read the circular-scale division (CSR) on the reference line.','Record; subtract the zero error to get the corrected reading.'],
controls:[{k:'obj',label:'Object between studs',type:'select',def:0.82,options:[[0.82,'Wire'],[1.47,'Sheet'],[2.36,'Thick wire'],[0,'None']]},{k:'pos',label:'Turn thimble',type:'range',min:0,max:6,step:0.01,def:2,unit:'mm'},{k:'ze',label:'Gauge zero error',type:'select',def:0.03,options:[[0,'None'],[0.03,'+0.03 mm'],[-0.02,'−0.02 mm']]},{k:'rev',label:'Show my reading',type:'toggle',def:false}],
init(){return{}},
onChange(s,p,k){if(k==='obj'&&p.pos<+p.obj)p.pos=+p.obj},
rd(p){return Math.max(p.pos,+p.obj)+(+p.ze)},
parts(r){const psr=Math.floor((r+1e-6)/0.5)*0.5;return{psr,csr:((Math.round((r-psr)/0.01))%50+50)%50}},
scale(c,r,ay,x0){const e=x0+r*25;RR(c,x0-10,ay-20,280,40,2,G(c,0,ay-20,0,ay+20,['#cfd6df','#f4f6f9','#8d99aa']),'#6d7888');L(c,x0-10,ay,e,ay,'#1d2733',1.4);
for(let k=0;k<=10;k++){const x=x0+k*25;if(x<=e+0.5){L(c,x,ay,x,ay-12,'#1d2733',1.4);T(c,k+'',x,ay-14,{a:'center',s:9,w:600,c:'#1d2733'})}const xh=x0+(k+0.5)*25;if(xh<=e+0.5)L(c,xh,ay,xh,ay+10,'#1d2733',1.2)}
P(c,[[e,ay-34],[e+16,ay-46],[e+160,ay-46],[e+160,ay+46],[e+16,ay+46],[e,ay+34]],G(c,0,ay-46,0,ay+46,['#7c8796','#eef2f6','#a9b3c0','#5d6876']),'#4a5566');
for(let k=0;k<14;k++)L(c,e+40+k*8,ay-46,e+40+k*8,ay+46,'rgba(0,0,0,0.12)',1);
const cv=((r%0.5)+0.5)%0.5/0.01;for(let d=Math.floor(cv)-7;d<=Math.ceil(cv)+7;d++){const y=ay+(cv-d)*5;if(Math.abs(y-ay)>32)continue;const n=((d%50)+50)%50;L(c,e,y,e+(n%5?7:12),y,'#1d2733',n%5?1:1.4);if(n%5===0)T(c,n+'',e+15,y+3.5,{s:8,m:1,c:'#1d2733'})}
RR(c,e+160,ay-20,44,40,4,G(c,0,ay-20,0,ay+20,['#9aa6b6','#e8edf3','#6d7888']),'#4a5566');},
draw(c,s,p){room(c,false);RR(c,40,20,920,520,14,'#141e2b');const gap=Math.max(p.pos,+p.obj),r=this.rd(p),ay=360,x0=470,xa=260,xs=xa+gap*25;
c.beginPath();c.moveTo(220,ay-10);c.lineTo(220,ay+90);c.quadraticCurveTo(220,ay+150,290,ay+150);c.lineTo(400,ay+150);c.quadraticCurveTo(450,ay+150,450,ay+90);c.lineTo(450,ay);c.strokeStyle='#33507a';c.lineWidth=38;c.lineCap='round';c.stroke();c.lineCap='butt';
RR(c,430,ay-28,50,56,6,'#2c4466');RR(c,200,ay-14,xa-200,28,3,G(c,0,ay-14,0,ay+14,['#9aa6b6','#f1f4f7','#7a8698']));RR(c,xs,ay-12,x0-xs,24,2,G(c,0,ay-12,0,ay+12,['#9aa6b6','#f1f4f7','#7a8698']));
const o=+p.obj;if(o>0){if(o===1.47)RR(c,xa,ay-80,o*25,160,2,G(c,xa,0,xa+o*25,0,['#7d8794','#d9dee5','#7d8794']));else RR(c,xa,ay-90,o*25,180,o*6,G(c,xa,0,xa+o*25,0,['#8a4a22','#f0b47c','#8a4a22']))}
this.scale(c,r,ay,x0);
c.save();RR(c,380,30,560,170,12,'#0b1119','#3ee0c0',1.5);c.clip();const e=x0+r*25;c.translate(640-e*3,115-ay*3);c.scale(3,3);this.scale(c,r,ay,x0);c.restore();T(c,'MAGNIFIED ×3',396,52,{s:11,w:600,c:C.teal});
T(c,'Pitch 0.5 mm · 50 div',70,60,{s:15,w:600,m:1,c:C.teal});T(c,'LC = 0.01 mm',70,84,{s:15,w:600,m:1,c:C.teal});T(c,SGN[p.obj]||'',70,112,{s:14,c:C.dim});
hint(c,'Drag the thimble to turn the screw · read PSR on the sleeve and CSR on the thimble');},
pointer(s,p,x,y,ph){const e=470+this.rd(p)*25;if(ph==='down'&&x>e-20&&x<e+220&&Math.abs(y-360)<70){s.drag=true;s.off=x-e}if(!s.drag)return null;if(ph==='up'){s.drag=false;return null}return{pos:Math.round(cl((x-s.off-470)/25-(+p.ze),+p.obj,6)*100)/100}},
readings(s,p){const r=this.rd(p),q=this.parts(r),v=p.rev;return[['Least count','0.01','mm'],['PSR',v?q.psr.toFixed(1):'?','mm'],['CSR',v?q.csr:'?','div'],['Observed',v?r.toFixed(2):'?','mm'],['Corrected',v?(r-p.ze).toFixed(2):'?','mm']]},
columns:['Object','PSR (mm)','CSR','Observed (mm)','Corrected (mm)'],
record(s,p){const o=+p.obj;if(o>0&&p.pos-o>0.005)return{error:'Turn the thimble until the spindle just touches the object.'};if(o===0&&p.pos>0.005)return{error:'Close the gauge fully for the zero check.'};const r=this.rd(p),q=this.parts(r);return[SGN[p.obj],q.psr,q.csr,+r.toFixed(2),+(r-p.ze).toFixed(2)]},
result(rows){const m={};rows.filter(r=>r[0]!=='Zero check').forEach(r=>(m[r[0]]=m[r[0]]||[]).push(r[4]));const z=rows.find(r=>r[0]==='Zero check');return(z?'Zero error = '+(z[3]>=0?'+':'')+z[3].toFixed(2)+' mm   ·   ':'')+Object.keys(m).map(k=>k+': '+avg(m[k]).toFixed(2)+' mm').join('   ·   ')}};

S.vectors={title:'Parallelogram Law of Vectors',topic:'mech',grades:[11],
aim:'Verify the parallelogram law of vector addition with Gravesand’s apparatus.',
apparatus:["Gravesand's apparatus (board with two pulleys)",'Slotted weights with hangers','Thread, white sheet','Protractor & scale'],
formula:'R = √(P² + Q² + 2PQ cos θ)\nThe diagonal of the parallelogram on P and Q equals R and points vertically up.',
procedure:['Hang weights P and Q over the pulleys and R at the central knot.','Let the knot come to rest; mark the directions of the three threads.','Draw OA = P and OB = Q to scale along the threads; complete the parallelogram.','Measure the diagonal OC — compare with R (vertically upward).','Record and repeat with different weights.'],
controls:[{k:'P',label:'Weight P (left)',type:'range',min:50,max:400,step:50,def:200,unit:'g'},{k:'Q',label:'Weight Q (right)',type:'range',min:50,max:400,step:50,def:250,unit:'g'},{k:'R',label:'Weight R (centre)',type:'range',min:50,max:500,step:50,def:350,unit:'g'},{k:'cons',label:'Draw parallelogram',type:'toggle',def:true}],
eq(p){const a0=p.P,b0=p.Q,r0=p.R,ca=(a0*a0+r0*r0-b0*b0)/(2*a0*r0),cb=(b0*b0+r0*r0-a0*a0)/(2*b0*r0);if(ca<=0.08||cb<=0.08||ca>=0.999||cb>=0.999)return null;const a=Math.acos(ca),b=Math.acos(cb),h=480/(Math.tan(a)+Math.tan(b));if(h>335||h<30)return null;return{a,b,x:260+h*Math.tan(a),y:90+h}},
init(p){const e=this.eq(p);return e?{x:e.x,y:e.y}:{x:500,y:250}},
step(s,p,dt){const e=this.eq(p);if(e){s.x+=(e.x-s.x)*Math.min(1,dt*4);s.y+=(e.y-s.y)*Math.min(1,dt*4)}},
ang(p){const e=this.eq(p);if(!e)return null;const a=Math.round(e.a/R),b=Math.round(e.b/R),th=(a+b)*R;return{a,b,Rc:Math.sqrt(p.P*p.P+p.Q*p.Q+2*p.P*p.Q*Math.cos(th))}},
draw(c,s,p){room(c);const e=this.eq(p),A=[260,90],B=[740,90],O=[s.x,s.y];
RR(c,200,30,600,500,8,G(c,200,0,800,0,['#6b4a2a','#9a6d42','#6b4a2a']));RR(c,300,120,400,330,2,'#f4f1ea');
[A,B].forEach(q=>{RR(c,q[0]-6,q[1]-40,12,30,2,'#3f4958');ball(c,q[0],q[1],22,'#d5dbe3','#4a5566');c.beginPath();c.arc(q[0],q[1],5,0,7);c.fillStyle='#1d2733';c.fill()});
L(c,O[0],O[1],A[0],A[1]-22,'#3b3325',2);L(c,O[0],O[1],B[0],B[1]-22,'#3b3325',2);L(c,A[0]-22,A[1],A[0]-22,260,'#e8e2d0',2);L(c,B[0]+22,B[1],B[0]+22,260,'#e8e2d0',2);L(c,O[0],O[1],O[0],O[1]+22,'#3b3325',2);
weights(c,A[0]-22,260,p.P/50,44,8);weights(c,B[0]+22,260,p.Q/50,44,8);weights(c,O[0],O[1]+22,p.R/50,44,6);
T(c,'P = '+p.P+' g',A[0]-60,250,{a:'right',s:15,w:600,c:C.amber});T(c,'Q = '+p.Q+' g',B[0]+60,250,{s:15,w:600,c:C.cyan});T(c,'R = '+p.R+' g',O[0]+36,O[1]+50,{s:15,w:600,c:'#b3261e'});
c.beginPath();c.arc(O[0],O[1],5,0,7);c.fillStyle='#1d2733';c.fill();
if(!e){T(c,'No equilibrium — each weight must be less than the sum of the other two',500,500,{a:'center',s:17,w:600,c:C.rose});return}
if(p.cons){const sc=0.4,uA=[A[0]-O[0],A[1]-22-O[1]],uB=[B[0]-O[0],B[1]-22-O[1]];const nA=Math.hypot(...uA),nB=Math.hypot(...uB);const pa=[O[0]+uA[0]/nA*p.P*sc,O[1]+uA[1]/nA*p.P*sc],pb=[O[0]+uB[0]/nB*p.Q*sc,O[1]+uB[1]/nB*p.Q*sc],pc=[pa[0]+pb[0]-O[0],pa[1]+pb[1]-O[1]];
L(c,O[0],O[1],pa[0],pa[1],'#c77700',3);L(c,O[0],O[1],pb[0],pb[1],'#0f7fa8',3);L(c,pa[0],pa[1],pc[0],pc[1],'#555',1.5,[6,5]);L(c,pb[0],pb[1],pc[0],pc[1],'#555',1.5,[6,5]);ray(c,O[0],O[1],pc[0],pc[1],'#2e8b2e',3);L(c,O[0],O[1],O[0],O[1]-p.R*sc,'rgba(179,38,30,0.7)',2,[3,4]);T(c,'C',pc[0]+8,pc[1],{s:15,w:700,c:'#2e8b2e'});T(c,'A',pa[0]-16,pa[1],{s:14,w:700,c:'#c77700'});T(c,'B',pb[0]+8,pb[1],{s:14,w:700,c:'#0f7fa8'})}
const g=this.ang(p);T(c,'α = '+g.a+'°   β = '+g.b+'°',500,150,{a:'center',s:15,w:600,c:'#1d2733'});},
readings(s,p){const g=this.ang(p);if(!g)return[['Equilibrium','none','']];return[['α (P from vertical)',g.a,'°'],['β (Q from vertical)',g.b,'°'],['Diagonal OC (calc.)',g.Rc.toFixed(1),'g'],['Error vs R',(Math.abs(g.Rc-p.R)/p.R*100).toFixed(1),'%']]},
columns:['P (g)','Q (g)','R (g)','α (°)','β (°)','OC (g)'],
record(s,p){const g=this.ang(p);if(!g)return{error:'No equilibrium with these weights.'};return[p.P,p.Q,p.R,g.a,g.b,+g.Rc.toFixed(1)]},
result(rows){return rows.length?'Mean error between diagonal OC and R ≈ '+avg(rows.map(r=>Math.abs(r[5]-r[2])/r[2]*100)).toFixed(1)+' % → parallelogram law verified.':''}};

const UB={140:'Body A',75:'Body B',220:'Body C'};
S.moments={title:'Principle of Moments — Mass of a Body',topic:'mech',grades:[9,11],
aim:'Find the mass of a given body using a metre scale balanced on a knife edge (principle of moments).',
apparatus:['Metre scale','Knife edge (fulcrum)','Known slotted mass','Unknown body with thread'],
formula:'Anticlockwise moment = Clockwise moment\nM × d₁ = m × d₂     →     m = M d₁ / d₂',
procedure:['Balance the metre scale at its 50 cm mark on the knife edge.','Hang the known mass on the left and the unknown body on the right.','Slide them (drag) until the scale is horizontal again.','Record d₁ and d₂ measured from the fulcrum.','Repeat for 3 positions; find the mean mass.'],
controls:[{k:'M',label:'Known mass',type:'select',def:100,options:[[50,'50 g'],[100,'100 g'],[200,'200 g']]},{k:'U',label:'Unknown body',type:'select',def:140,options:[[140,'Body A'],[75,'Body B'],[220,'Body C']]},{k:'xm',label:'Known mass at',type:'range',min:5,max:45,step:0.5,def:20,unit:'cm'},{k:'xu',label:'Unknown body at',type:'range',min:55,max:95,step:0.5,def:80,unit:'cm'}],
init(){return{a:0}},
tq(p){return p.M*(50-p.xm)-p.U*(p.xu-50)},bal(p){return Math.abs(this.tq(p))<=p.U*0.26},
step(s,p,dt){const tg=this.bal(p)?0:cl(-this.tq(p)/300,-1,1)*6*R;s.a+=(tg-s.a)*Math.min(1,dt*4)},
hp(s,x){return[500+Math.cos(s.a)*(x-50)*8,300+Math.sin(s.a)*(x-50)*8]},
pointer(s,p,x,y,ph){if(ph==='down'){const m=this.hp(s,p.xm),u=this.hp(s,p.xu);s.drag=Math.abs(x-m[0])<40?'xm':Math.abs(x-u[0])<40?'xu':null}if(ph==='up')s.drag=null;if(!s.drag)return null;const cm=Math.round((50+(x-500)/8)*2)/2;return{[s.drag]:s.drag==='xm'?cl(cm,5,45):cl(cm,55,95)}},
draw(c,s,p){room(c);P(c,[[500,306],[455,452],[545,452]],G(c,0,300,0,452,['#aab4c1','#4a5566']));
c.save();c.translate(500,300);c.rotate(s.a);RR(c,-405,-16,810,20,2,'#efe6c8','#b9ab80');for(let cm=0;cm<=100;cm++){const x=(cm-50)*8;L(c,x,4,x,4-(cm%10?(cm%5?5:8):12),'#3b3325',1);if(cm%10===0)T(c,cm+'',x,-6,{a:'center',s:9,m:1,c:'#3b3325'})}c.restore();
const m=this.hp(s,p.xm),u=this.hp(s,p.xu);L(c,m[0],m[1]+4,m[0],m[1]+60,'#e8e2d0',1.5);weights(c,m[0],m[1]+60,p.M/50,50);L(c,u[0],u[1]+4,u[0],u[1]+70,'#e8e2d0',1.5);
const r=12+p.U/12;P(c,[[u[0]-r,u[1]+80],[u[0]-r*0.6,u[1]+70],[u[0]+r*0.7,u[1]+72],[u[0]+r,u[1]+90],[u[0]+r*0.7,u[1]+70+r*1.4],[u[0]-r*0.8,u[1]+70+r*1.3]],G(c,0,u[1]+70,0,u[1]+70+r*1.4,['#9a8f80','#5b5246']),'#2e2924');T(c,UB[p.U],u[0],u[1]+70+r*1.4+20,{a:'center',s:14,w:600,c:C.ink});T(c,p.M+' g',m[0]-34,m[1]+80,{a:'right',s:14,w:600,c:C.amber});
const b=this.bal(p);T(c,b?'BALANCED':'NOT BALANCED',500,80,{a:'center',s:24,w:700,m:1,c:b?C.lime:C.rose});T(c,'d₁ = '+(50-p.xm).toFixed(1)+' cm',(m[0]+500)/2,250,{a:'center',s:15,w:600,c:C.amber});T(c,'d₂ = '+(p.xu-50).toFixed(1)+' cm',(u[0]+500)/2,250,{a:'center',s:15,w:600,c:C.cyan});
hint(c,'Drag the masses along the scale until it balances');},
readings(s,p){return[['d₁ (known)',(50-p.xm).toFixed(1),'cm'],['d₂ (unknown)',(p.xu-50).toFixed(1),'cm'],['M × d₁',(p.M*(50-p.xm)).toFixed(0),'g·cm'],['Scale',this.bal(p)?'Balanced':'Tilted','']]},
columns:['Body','M (g)','d₁ (cm)','d₂ (cm)','m = Md₁/d₂ (g)'],
record(s,p){if(!this.bal(p))return{error:'Balance the scale first.'};return[UB[p.U],p.M,+(50-p.xm).toFixed(1),+(p.xu-50).toFixed(1),+(p.M*(50-p.xm)/(p.xu-50)).toFixed(1)]},
result(rows){const g={};rows.forEach(r=>(g[r[0]]=g[r[0]]||[]).push(r[4]));return Object.keys(g).map(k=>k+': m ≈ '+avg(g[k]).toFixed(1)+' g').join('   ·   ')}};

S.boyle={title:"Boyle's Law",topic:'heat',grades:[11],
aim:'Study how the pressure of a fixed mass of air varies with its volume at constant temperature and plot P against 1/V.',
apparatus:["Boyle's law apparatus (closed & open tubes)",'Mercury with rubber tubing','Vertical metre scale','Barometer (P₀ = 76 cm of Hg)'],
formula:'P = P₀ + h      P × V = constant      (V ∝ l in a uniform tube)',
procedure:['Note the atmospheric pressure P₀ from the barometer.','Raise or lower the open tube (drag it) and wait for the mercury to settle.','Read the difference in mercury levels h (+ if open side is higher) and the air column l.','Record 6–8 readings above and below the starting level.','Plot P against 1/l — a straight line shows P ∝ 1/V.'],
controls:[{k:'H',label:'Raise / lower open tube',type:'range',min:-24,max:24,step:1,def:0,unit:'cm'}],
solve(H){let lo=-15,hi=19;for(let i=0;i<50;i++){const x=(lo+hi)/2;if((76+H-2*x)*(20-x)-1520>0)lo=x;else hi=x}return(lo+hi)/2},
init(p){return{x:this.solve(p.H)}},step(s,p,dt){s.x+=(this.solve(p.H)-s.x)*Math.min(1,dt*3)},
pointer(s,p,x,y,ph){const top=90-5*p.H;if(ph==='down'&&Math.abs(x-600)<45){s.drag=true;s.off=y-top}if(ph==='up')s.drag=false;if(!s.drag)return null;return{H:Math.round(cl((90-(y-s.off))/5,-24,24))}},
draw(c,s,p){room(c,false);const x=s.x,l=20-x,dh=p.H-2*x,cx=400,ox=600,yc=80+5*l,yo=yc-5*dh,top=90-5*p.H,bot=top+290,Hg=G(c,0,0,20,0,['#8d99aa','#f4f6f9','#7a8698']);
RR(c,250,510,500,20,4,'#3b4451');c.fillStyle=G(c,495,0,505,0,['#77849a','#eef2f7','#6c788c']);c.fillRect(495,30,10,480);
RR(c,466,40,24,460,2,'#efe6c8','#b9ab80');for(let cm=0;cm<=90;cm++){const y=50+cm*5;L(c,490,y,490-(cm%10?(cm%5?5:9):14),y,'#3b3325',1);if(cm%10===0)T(c,cm+'',470,y+4,{s:9,m:1,c:'#3b3325'})}
c.beginPath();c.moveTo(cx,422);c.bezierCurveTo(cx,520,ox,bot+100,ox,bot);c.strokeStyle='#4a2a2a';c.lineWidth=16;c.stroke();c.strokeStyle='#aab4c1';c.lineWidth=6;c.stroke();
c.fillStyle='rgba(150,205,255,0.25)';c.fillRect(cx-9,80,18,yc-80);c.save();c.translate(cx-9,0);c.fillStyle=G(c,0,0,18,0,['#8d99aa','#f4f6f9','#7a8698']);c.fillRect(0,yc,18,422-yc);c.restore();RR(c,cx-11,70,22,354,[11,11,2,2],null,'rgba(220,235,245,0.75)',2);
c.save();c.translate(ox-9,0);c.fillStyle=G(c,0,0,18,0,['#8d99aa','#f4f6f9','#7a8698']);c.fillRect(0,yo,18,bot-yo);c.restore();c.strokeStyle='rgba(220,235,245,0.75)';c.lineWidth=2;c.beginPath();c.moveTo(ox-11,top);c.lineTo(ox-11,bot);c.moveTo(ox+11,top);c.lineTo(ox+11,bot);c.stroke();
RR(c,cx+10,120,86,10,2,'#3f4958');RR(c,504,top+40,86,10,2,'#3f4958');
L(c,cx+12,yc,ox-12,yc,'rgba(255,181,71,0.8)',1.5,[5,4]);L(c,ox+12,yo,700,yo,'rgba(255,181,71,0.8)',1.5,[5,4]);L(c,ox+12,yc,700,yc,'rgba(255,181,71,0.8)',1.5,[5,4]);L(c,690,yc,690,yo,C.amber,2);
T(c,'h = '+(dh>=0?'+':'')+dh.toFixed(1)+' cm',705,(yc+yo)/2+5,{s:16,w:600,m:1,c:C.amber});T(c,'air  l = '+l.toFixed(1)+' cm',cx-20,(80+yc)/2,{a:'right',s:16,w:600,m:1,c:C.cyan});L(c,cx-14,80,cx-14,yc,C.cyan,2);
T(c,'P = '+(76+dh).toFixed(1)+' cm Hg',820,90,{a:'center',s:22,w:700,m:1,c:C.lime});T(c,'P₀ = 76 cm Hg',820,116,{a:'center',s:13,c:C.dim});hint(c,'Drag the open tube up or down');},
readings(s,p){const l=20-s.x,dh=p.H-2*s.x;return[['h (level difference)',dh.toFixed(1),'cm'],['Pressure P',(76+dh).toFixed(1),'cm Hg'],['Air column l',l.toFixed(1),'cm'],['P × l',((76+dh)*l).toFixed(0),'']]},
columns:['h (cm)','P (cm Hg)','l (cm)','1/l (cm⁻¹)','P × l'],
record(s,p){if(Math.abs(this.solve(p.H)-s.x)>0.03)return{error:'Wait for the mercury to settle.'};const l=+(20-s.x).toFixed(1),dh=+(p.H-2*s.x).toFixed(1),P0=+(76+dh).toFixed(1);return[dh,P0,l,+(1/l).toFixed(4),+(P0*l).toFixed(0)]},
plot:{x:3,y:1},result(rows){return rows.length?'P × l ≈ '+avg(rows.map(r=>r[4])).toFixed(0)+' (constant) → Boyle’s law verified.':''}};

const LQ2={w:['Water',0.072,1000,'rgba(79,179,255,0.5)'],a:['Alcohol',0.022,790,'rgba(200,170,255,0.45)'],s:['Soap solution',0.03,1010,'rgba(140,230,190,0.5)']};
S.capillary={title:'Surface Tension — Capillary Rise',topic:'heat',grades:[11],
aim:'Determine the surface tension of water (and other liquids) by the capillary rise method.',
apparatus:['Capillary tubes of known radius','Beaker with liquid','Travelling microscope / scale','Stand & clamp'],
formula:'T = r h ρ g / 2      (contact angle ≈ 0°)      h ∝ 1/r',
procedure:['Dip clean capillary tubes vertically into the liquid.','Wait for the liquid to rise and settle.','Measure the height h of the meniscus above the liquid surface in the selected tube.','Record for each tube radius.','Compute T; plot h against 1/r.'],
controls:[{k:'liq',label:'Liquid',type:'select',def:'w',options:[['w','Water'],['a','Alcohol'],['s','Soap solution']]},{k:'r',label:'Measure tube',type:'select',def:0.3,options:[[0.2,'r = 0.20 mm'],[0.3,'r = 0.30 mm'],[0.5,'r = 0.50 mm']]}],
hOf(liq,r){const q=LQ2[liq];return 2*q[1]/(r/1000*q[2]*9.8)*100},
init(){return{h:{0.2:0,0.3:0,0.5:0}}},onChange(s,p,k){if(k==='liq')s.h={0.2:0,0.3:0,0.5:0}},
step(s,p,dt){[0.2,0.3,0.5].forEach(r=>{s.h[r]+=(this.hOf(p.liq,r)-s.h[r])*Math.min(1,dt*1.2)})},
draw(c,s,p){room(c);const q=LQ2[p.liq],sy=360,k=28;stand(c,200,50,640);
RR(c,280,300,440,152,[4,4,14,14],'rgba(220,235,245,0.06)');c.fillStyle=q[3];c.fillRect(282,sy,436,90);L(c,282,sy,718,sy,'rgba(255,255,255,0.6)',1.5);c.strokeStyle='rgba(220,235,245,0.6)';c.lineWidth=2.5;c.beginPath();c.moveTo(280,296);c.lineTo(280,452);c.lineTo(720,452);c.lineTo(720,296);c.stroke();
[[0.2,410],[0.3,500],[0.5,590]].forEach(([r,x])=>{const w=r*22,h=s.h[r]*k,sel=r===p.r;c.fillStyle=q[3].replace(/0\.\d+\)/,'0.85)');c.fillRect(x-w,sy-h,2*w,430-(sy-h));c.beginPath();c.moveTo(x-w,sy-h);c.quadraticCurveTo(x,sy-h+w*1.4,x+w,sy-h);c.fillStyle='#0e1621';c.fill();RR(c,x-w-3,70,2*w+6,360,2,null,sel?'#ffffff':'rgba(220,235,245,0.55)',sel?2.5:1.5);T(c,'r='+r,x,62,{a:'center',s:12,w:600,m:1,c:sel?C.ink:C.dim});
if(sel){const sx=x+w+14;RR(c,sx,sy-230,26,236,2,'#efe6c8','#b9ab80');for(let mm=0;mm<=80;mm++){const yy=sy-mm*k/10;L(c,sx,yy,sx+(mm%10?(mm%5?5:9):14),yy,'#3b3325',1);if(mm%10===0)T(c,mm/10+'',sx+16,yy+4,{s:9,m:1,c:'#3b3325'})}L(c,x-w-10,sy-h,sx,sy-h,C.amber,1.5,[4,3]);T(c,'h = '+s.h[r].toFixed(2)+' cm',sx+34,sy-h+5,{s:16,w:600,m:1,c:C.amber})}});
T(c,q[0],300,440,{s:14,w:600,c:C.ink});T(c,'Narrower tube → higher rise',820,200,{a:'center',s:14,c:C.dim});},
readings(s,p){const q=LQ2[p.liq],h=s.h[p.r];return[['Radius r',p.r.toFixed(2),'mm'],['Rise h',h.toFixed(2),'cm'],['T = rhρg/2',(p.r/1000*h/100*q[2]*9.8/2).toFixed(4),'N/m']]},
columns:['Liquid','r (mm)','1/r (mm⁻¹)','h (cm)','T (N/m)'],
record(s,p){const q=LQ2[p.liq],h=+s.h[p.r].toFixed(2);if(Math.abs(this.hOf(p.liq,p.r)-s.h[p.r])>0.02)return{error:'Wait for the liquid to stop rising.'};return[q[0],p.r,+(1/p.r).toFixed(2),h,+(p.r/1000*h/100*q[2]*9.8/2).toFixed(4)]},
plot:{x:2,y:3},result(rows){const g={};rows.forEach(r=>(g[r[0]]=g[r[0]]||[]).push(r[4]));return Object.keys(g).map(k=>k+': T ≈ '+avg(g[k]).toFixed(4)+' N/m').join('   ·   ')}};

const VL={g:['Glycerine',1.41,1260,'rgba(255,205,110,0.32)'],c:['Castor oil',0.99,961,'rgba(240,225,130,0.32)']};
S.viscosity={title:"Viscosity — Stokes' Law (Terminal Velocity)",topic:'heat',grades:[11],
aim:'Determine the coefficient of viscosity of a liquid by measuring the terminal velocity of steel balls falling through it.',
apparatus:['Tall glass jar with glycerine / castor oil','Steel balls of different radii','Stopwatch','Rubber bands as marks A and B (30 cm apart)'],
formula:'v = 2 r² (ρ − σ) g / 9η      η = 2 r² (ρ − σ) g / 9v      (ρ steel = 7800 kg/m³)',
procedure:['Choose a ball radius and tap “Drop ball”.','The ball reaches terminal velocity before mark A.','The stopwatch runs from mark A to mark B automatically.','Record t; v = 30 cm / t.','Repeat for other radii; plot v against r² and compute η.'],
controls:[{k:'r',label:'Steel ball radius',type:'select',def:1.5,options:[[1,'1.0 mm'],[1.5,'1.5 mm'],[2,'2.0 mm'],[2.5,'2.5 mm']]},{k:'liq',label:'Liquid',type:'select',def:'g',options:[['g','Glycerine'],['c','Castor oil']]},{k:'spd',label:'Simulation speed',type:'select',def:5,options:[[1,'×1 real'],[5,'×5'],[10,'×10']]}],
init(){return{y:-0.04,v:0,run:false,t:0,tA:null,tB:null}},
actions:[{label:'Drop ball',run(s){Object.assign(s,{y:-0.04,v:0,run:true,t:0,tA:null,tB:null})}}],
onChange(s,p,k){if(k!=='spd')Object.assign(s,{y:-0.04,v:0,run:false,t:0,tA:null,tB:null})},
vt(p){const q=VL[p.liq],r=p.r/1000;return 2*r*r*(7800-q[2])*9.8/(9*q[1])},
step(s,p,dt){if(!s.run)return;const q=VL[p.liq],r=p.r/1000,tau=2*7800*r*r/(9*q[1]),n=10,h=dt*p.spd/n,vt=this.vt(p);for(let i=0;i<n;i++){if(s.y<0)s.v+=9.8*h;else s.v=vt+(s.v-vt)*Math.exp(-h/tau);const py=s.y;s.y+=s.v*h;s.t+=h;if(py<0.15&&s.y>=0.15)s.tA=s.t;if(py<0.45&&s.y>=0.45)s.tB=s.t;if(s.y>=0.6){s.y=0.6;s.run=false;break}}},
tab(s){return s.tA==null?0:s.tB==null?s.t-s.tA:s.tB-s.tA},
draw(c,s,p){room(c,false);const q=VL[p.liq],y0=70,k=700;RR(c,380,500,240,16,4,'#3b4451');
c.fillStyle=q[3];c.fillRect(442,y0,116,430);L(c,442,y0,558,y0,'rgba(255,255,255,0.5)',1.5);RR(c,440,30,120,472,[4,4,8,8],null,'rgba(220,235,245,0.6)',2.5);
[[0.15,'A'],[0.45,'B']].forEach(([m,lab])=>{const y=y0+m*k;RR(c,436,y-3,128,6,3,'#d2342b');T(c,lab,575,y+6,{s:18,w:700,c:C.rose})});
RR(c,350,y0,24,430,2,'#efe6c8','#b9ab80');for(let cm=0;cm<=60;cm++){const y=y0+cm*7;L(c,374,y,374-(cm%10?(cm%5?5:9):14),y,'#3b3325',1);if(cm%10===0)T(c,cm+'',353,y+4,{s:9,m:1,c:'#3b3325'})}
ball(c,500,y0+s.y*k,p.r*4,'#e5e9ee','#4d5663');
watch(c,790,190,78,this.tab(s));T(c,'A → B timer',790,300,{a:'center',s:13,c:C.dim});T(c,'v = '+(s.tB?(30/(s.tB-s.tA)).toFixed(2):'—')+' cm/s',790,340,{a:'center',s:20,w:600,m:1,c:C.amber});
T(c,q[0],500,526,{a:'center',s:13,c:C.dim});if(!s.run&&s.tB==null)hint(c,'Tap “Drop ball”');},
readings(s,p){const t=s.tB?s.tB-s.tA:null,v=t?0.3/t:null,q=VL[p.liq],r=p.r/1000;return[['Radius r',p.r.toFixed(1),'mm'],['Time A → B',this.tab(s).toFixed(2),'s'],['Terminal v',v?(v*100).toFixed(2):'—','cm/s'],['η',v?(2*r*r*(7800-q[2])*9.8/(9*v)).toFixed(2):'—','Pa·s']]},
columns:['Liquid','r (mm)','r² (mm²)','t (s)','v (cm/s)'],
record(s,p){if(s.tB==null)return{error:'Let the ball pass both marks first.'};const t=+(s.tB-s.tA).toFixed(2);return[VL[p.liq][0],p.r,+(p.r*p.r).toFixed(2),t,+(30/t).toFixed(3)]},
plot:{x:2,y:4},result(rows){const g={};rows.forEach(r=>{const q=r[0]==='Glycerine'?VL.g:VL.c,rr=r[1]/1000;(g[r[0]]=g[r[0]]||[]).push(2*rr*rr*(7800-q[2])*9.8/(9*r[4]/100))});return Object.keys(g).map(k=>k+': η ≈ '+avg(g[k]).toFixed(2)+' Pa·s').join('   ·   ')}};

S.cooling={title:"Thermometer & Newton's Law of Cooling",topic:'heat',grades:[7,11],
aim:'Read a laboratory thermometer and study how hot water cools with time; plot the cooling curve.',
apparatus:['Copper calorimeter with stirrer','Double-walled enclosure','Laboratory thermometer (0–110 °C)','Stopwatch','Hot water'],
formula:'Rate of cooling ∝ (T − Ts)      T = Ts + (T₀ − Ts) e^(−kt)',
procedure:['Pour hot water into the calorimeter and place it in the enclosure.','Start the stopwatch.','Read the thermometer at regular intervals (e.g. every minute) and record.','Continue until the temperature falls by about 30 °C.','Plot temperature against time — the cooling curve.'],
controls:[{k:'T0',label:'Initial water temperature',type:'range',min:60,max:95,step:5,def:90,unit:'°C'},{k:'Ts',label:'Room temperature',type:'range',min:20,max:35,step:1,def:28,unit:'°C'},{k:'surf',label:'Calorimeter surface',type:'select',def:0.0016,options:[[0.0016,'Blackened'],[0.001,'Polished']]},{k:'spd',label:'Simulation speed',type:'select',def:30,options:[[10,'×10'],[30,'×30'],[60,'×60']]}],
init(p){return{T:p.T0,t:0,run:false}},
actions:[{label:'Start / pause stopwatch',run(s){s.run=!s.run}},{label:'Pour fresh hot water',run(s,p){Object.assign(s,{T:p.T0,t:0,run:false})}}],
onChange(s,p,k){if(k!=='spd')Object.assign(s,{T:p.T0,t:0,run:false})},
step(s,p,dt){if(!s.run)return;const d=dt*p.spd;s.t+=d;s.T=p.Ts+(s.T-p.Ts)*Math.exp(-p.surf*d)},
draw(c,s,p,t){room(c);RR(c,320,250,260,202,8,G(c,320,0,580,0,['#6b4a2a','#9a6d42','#6b4a2a']));RR(c,345,262,210,190,6,'#2a1d12');
const blk=p.surf>0.0012;RR(c,370,280,160,166,[4,4,10,10],blk?G(c,370,0,530,0,['#1b1b1d','#3a3a3e','#141416']):G(c,370,0,530,0,['#8a4a22','#f0b47c','#8a4a22']));c.fillStyle='rgba(79,179,255,0.45)';c.fillRect(376,310,148,130);
if(s.T>55)for(let i=0;i<4;i++){const f=((t*0.5+i/4)%1);c.beginPath();c.moveTo(400+i*30,300-f*80);c.bezierCurveTo(390+i*30,280-f*80,415+i*30,265-f*80,400+i*30,245-f*80);c.strokeStyle='rgba(255,255,255,'+(0.25*(1-f)*(s.T-55)/40)+')';c.lineWidth=3;c.stroke()}
L(c,420,200,420,420,'#aab4c1',3);L(c,405,420,435,420,'#aab4c1',3);thermo(c,480,50,400,s.T,0,110);
lcd(c,680,110,200,mmss(s.t),C.amber,'STOPWATCH (min:s)');lcd(c,680,220,200,s.T.toFixed(1)+' °C',C.rose,'THERMOMETER');lcd(c,680,330,200,p.Ts+' °C',C.cyan,'ROOM TEMPERATURE');
if(!s.run)hint(c,'Tap “Start / pause stopwatch” and record a reading every minute');},
readings(s,p){return[['Time',mmss(s.t),'min:s'],['Temperature T',s.T.toFixed(1),'°C'],['T − Ts',(s.T-p.Ts).toFixed(1),'°C']]},
columns:['t (min)','T (°C)','T − Ts (°C)'],
record(s,p){return[+(s.t/60).toFixed(1),+s.T.toFixed(1),+(s.T-p.Ts).toFixed(1)]},plot:{x:0,y:1,fit:false},
result(rows){const r=rows.filter(x=>x[2]>0.5);if(r.length<3)return'Record at least 3 readings at different times.';const n=r.length,xs=r.map(x=>x[0]),ys=r.map(x=>Math.log(x[2])),sx=xs.reduce((a,b)=>a+b),sy=ys.reduce((a,b)=>a+b),sxx=xs.reduce((a,b)=>a+b*b,0),sxy=xs.reduce((a,b,i)=>a+b*ys[i],0),d=n*sxx-sx*sx;if(!d)return'';const k=-(n*sxy-sx*sy)/d;return'ln(T − Ts) falls linearly with time → rate of cooling ∝ (T − Ts).  k ≈ '+k.toFixed(3)+' per min'}};

const MET={cu:['Copper',0.385,'#e59a64','#8a4a22'],al:['Aluminium',0.9,'#dfe5ec','#8b949f'],fe:['Iron',0.45,'#8e98a6','#4b525c'],br:['Brass',0.38,'#e8c35a','#8a6a1a']};
S.specificHeat={title:'Specific Heat — Method of Mixtures',topic:'heat',grades:[11],
aim:'Determine the specific heat capacity of a solid by the method of mixtures.',
apparatus:['Steam heater with boiler','Copper calorimeter (60 g) with stirrer','Thermometers','Solid (metal) and water','Beam balance'],
formula:'Heat lost by solid = Heat gained by water + calorimeter\nm c (T₁ − T) = (M × 4.18 + 60 × 0.385)(T − T₂)',
procedure:['Choose the metal and the masses of solid and water.','Heat the solid in steam until it reaches 100 °C (T₁).','Note the water temperature T₂ (room temperature).','Drop the solid quickly into the calorimeter, stir, and wait for the final steady temperature T.','Record and compute c.'],
controls:[{k:'met',label:'Solid',type:'select',def:'cu',options:Object.keys(MET).map(k=>[k,MET[k][0]])},{k:'ms',label:'Mass of solid m',type:'range',min:50,max:200,step:25,def:100,unit:'g'},{k:'mw',label:'Mass of water M',type:'range',min:50,max:200,step:25,def:100,unit:'g'}],
init(){return{ph:'idle',Tsol:28,Tw:28}},
actions:[{label:'Heat solid in steam',run(s){if(s.ph==='idle')s.ph='heat'}},{label:'Drop into calorimeter',run(s){if(s.ph==='heat'&&s.Tsol>99.4){s.ph='mix';s.Tsol=100}}},{label:'Start again',run(s){Object.assign(s,{ph:'idle',Tsol:28,Tw:28})}}],
onChange(s){Object.assign(s,{ph:'idle',Tsol:28,Tw:28})},
Tf(p){const a=p.ms*MET[p.met][1],b=p.mw*4.18+60*0.385;return(a*100+b*28)/(a+b)},
step(s,p,dt){if(s.ph==='heat'){s.Tsol+=(100.2-s.Tsol)*Math.min(1,dt*0.8);if(s.Tsol>100)s.Tsol=100}if(s.ph==='mix'){const f=this.Tf(p);s.Tw+=(f-s.Tw)*Math.min(1,dt*0.9);s.Tsol+=(f-s.Tsol)*Math.min(1,dt*1.6)}},
draw(c,s,p,t){room(c);const m=MET[p.met];
RR(c,150,370,140,82,6,'#3b4451');for(let i=0;i<3;i++){const fl=1+0.1*Math.sin(t*12+i);c.beginPath();c.moveTo(195+i*25,410);c.quadraticCurveTo(185+i*25,390-12*fl,195+i*25,370-22*fl);c.quadraticCurveTo(205+i*25,390-12*fl,195+i*25,410);c.fillStyle=s.ph==='heat'?'rgba(80,160,255,0.85)':'rgba(80,160,255,0.25)';c.fill()}
RR(c,160,300,120,70,[30,30,6,6],G(c,160,0,280,0,['#8d99aa','#e8edf3','#6d7888']));RR(c,170,110,100,190,8,G(c,170,0,270,0,['#8a4a22','#e9a56b','#8a4a22']),'#5a2f12');RR(c,190,130,60,150,4,'#2a1d12');
if(s.ph==='heat')for(let i=0;i<3;i++){const f=((t*0.6+i/3)%1);c.beginPath();c.arc(220+Math.sin(t*2+i)*8,280-f*140,6+f*6,0,7);c.fillStyle='rgba(255,255,255,'+(0.25*(1-f))+')';c.fill()}
if(s.ph!=='mix'){L(c,220,100,220,180,'#e8e2d0',1.5);RR(c,203,180,34,44,4,G(c,203,0,237,0,[m[3],m[2],m[3]]))}
L(c,250,80,250,160,'#aab4c1',2);T(c,'Solid '+s.Tsol.toFixed(1)+' °C',220,70,{a:'center',s:16,w:600,m:1,c:C.rose});T(c,'STEAM HEATER',220,474,{a:'center',s:12,w:600,c:C.dim});
RR(c,560,280,240,172,8,G(c,560,0,800,0,['#6b4a2a','#9a6d42','#6b4a2a']));RR(c,600,300,160,150,[4,4,10,10],G(c,600,0,760,0,['#8a4a22','#f0b47c','#8a4a22']));c.fillStyle='rgba(79,179,255,0.45)';c.fillRect(606,330+(200-p.mw)*0.25,148,114-(200-p.mw)*0.25);
if(s.ph==='mix')RR(c,640,398,34,44,4,G(c,640,0,674,0,[m[3],m[2],m[3]]));L(c,620,230,620,440,'#aab4c1',3);thermo(c,720,100,410,s.Tw,0,100);T(c,'CALORIMETER',680,474,{a:'center',s:12,w:600,c:C.dim});
lcd(c,400,90,150,s.Tw.toFixed(1)+' °C',C.cyan,'WATER');
const msg={idle:'Tap “Heat solid in steam”',heat:s.Tsol>99.4?'Solid at 100 °C — tap “Drop into calorimeter”':'Heating the solid…',mix:Math.abs(s.Tw-this.Tf(p))<0.05?'Steady final temperature reached — record':'Stirring… wait for steady temperature'}[s.ph];T(c,msg,475,200,{a:'center',s:15,w:600,c:C.amber});},
readings(s,p){return[['Solid T₁',s.Tsol.toFixed(1),'°C'],['Water now',s.Tw.toFixed(1),'°C'],['Initial water T₂','28.0','°C'],['Stage',{idle:'Ready',heat:'Heating',mix:'Mixing'}[s.ph],'']]},
columns:['Metal','m (g)','M (g)','T₁ (°C)','T₂ (°C)','T (°C)','c (J/g·°C)'],
record(s,p){if(s.ph!=='mix'||Math.abs(s.Tw-this.Tf(p))>0.05)return{error:'Drop the hot solid in and wait for a steady final temperature.'};const T0=+s.Tw.toFixed(1),cc=(p.mw*4.18+60*0.385)*(T0-28)/(p.ms*(100-T0));return[MET[p.met][0],p.ms,p.mw,100,28,T0,+cc.toFixed(3)]},
result(rows){const g={};rows.forEach(r=>(g[r[0]]=g[r[0]]||[]).push(r[6]));return Object.keys(g).map(k=>k+': c ≈ '+avg(g[k]).toFixed(3)+' J/g·°C').join('   ·   ')}};

function sbal(c,x,y,f,dir,lab){RR(c,x,y-26,240,52,10,G(c,0,y-26,0,y+26,['#e5e9ee','#8792a3']),'#4a5566');RR(c,x+14,y-14,212,28,3,'#f6f1dc');for(let n=0;n<=10;n++){const xx=dir>0?x+20+n*20:x+220-n*20;L(c,xx,y-14,xx,y-14+(n%5?8:12),'#3b3325',1);T(c,n+'',xx,y+12,{a:'center',s:10,m:1,c:'#3b3325'})}const px=dir>0?x+20+f*20:x+220-f*20;P(c,[[px,y-16],[px-6,y-26],[px+6,y-26]],C.red);L(c,px,y-16,px,y+4,C.red,2.5);T(c,lab,x+120,y-36,{a:'center',s:15,w:700,c:C.ink});}
S.thirdLaw={title:"Newton's Third Law — Two Spring Balances",topic:'mech',grades:[9],
aim:'Verify Newton’s third law of motion using two spring balances pulling on each other.',
apparatus:['Two identical spring balances (0–10 N)','Rigid hook on wall','String'],
formula:'Force of A on B = − Force of B on A      (action = reaction, opposite in direction)',
procedure:['Hook balance A to the wall and balance B to A.','Pull B (drag the hand) to different forces.','Read both balances each time.','Try the arrangement where both ends are pulled.','Record and compare.'],
controls:[{k:'F',label:'Pull',type:'range',min:0,max:10,step:0.5,def:4,unit:'N'},{k:'mode',label:'Arrangement',type:'select',def:'wall',options:[['wall','A hooked to wall'],['both','Both pulled']]}],
init(p){return{f:p.F}},step(s,p,dt){s.f+=(p.F-s.f)*Math.min(1,dt*5)},
pointer(s,p,x,y,ph){if(ph==='down')s.drag=x>620;if(ph==='up')s.drag=false;if(!s.drag)return null;return{F:Math.round(cl((x-680)/12,0,10)*2)/2}},
draw(c,s,p){room(c);const f=s.f,y=280,sh=f*3;
if(p.mode==='wall'){RR(c,40,120,40,320,2,G(c,40,0,80,0,['#6d7888','#3b4451']));for(let yy=130;yy<440;yy+=18)L(c,40,yy,80,yy+12,'#2b323c',1.5);L(c,80,y,120,y,'#cfd6df',4)}else{RR(c,30,y-22,70,44,20,'#e2b48c','#a87553');L(c,100,y,120,y,'#cfd6df',4)}
sbal(c,120-(p.mode==='both'?sh:0),y,f,1,'Balance A');L(c,360,y,400+sh*0,y,'#cfd6df',4);sbal(c,400,y,f,-1,'Balance B');L(c,640,y,680+f*12,y,'#cfd6df',4);
RR(c,680+f*12,y-22,70,44,20,'#e2b48c','#a87553');T(c,'pull',715+f*12,y+42,{a:'center',s:13,c:C.dim});
if(f>0.2){ray(c,380,y-70,380+f*14+20,y-70,C.amber,3);ray(c,380,y+70,380-f*14-20,y+70,C.cyan,3);T(c,'A pulls B  (action)',380,y-84,{a:'center',s:14,w:600,c:C.amber});T(c,'B pulls A  (reaction)',380,y+98,{a:'center',s:14,w:600,c:C.cyan})}
T(c,'A = '+f.toFixed(1)+' N',240,y+80,{a:'center',s:20,w:700,m:1,c:C.lime});T(c,'B = '+f.toFixed(1)+' N',520,y+80+50,{a:'center',s:20,w:700,m:1,c:C.lime});hint(c,'Drag the hand to pull');},
readings(s,p){return[['Balance A',s.f.toFixed(1),'N'],['Balance B',s.f.toFixed(1),'N'],['Difference','0.0','N']]},
columns:['Arrangement','A (N)','B (N)'],record(s,p){if(Math.abs(s.f-p.F)>0.05)return{error:'Wait for the pointers to settle.'};return[p.mode==='wall'?'Wall':'Both pulled',p.F,p.F]},plot:{x:1,y:2},
result(rows){return rows.length?'Both balances always read the same → action and reaction are equal and opposite.':''}};

const HN=['Top','Middle','Bottom'];
S.liquidPressure={title:'Liquid Pressure Increases with Depth',topic:'mech',grades:[8,9],
aim:'Show that pressure in a liquid increases with depth, using water jets from holes at different heights.',
apparatus:['Plastic bottle with 3 holes at different heights','Adhesive tape','Water supply (tap)','Stand, measuring scale'],
formula:'P = h ρ g      Jet speed v = √(2 g h)\nRange on table R = 2 √(h × H)   (H = height of hole above table)',
procedure:['Fill the bottle and keep the tap running to hold the level constant.','Remove the tape from the holes (switch).','Observe which jet reaches farthest.','Measure the horizontal range of each jet on the table and record.','Repeat with a different water level.'],
controls:[{k:'Hw',label:'Water level',type:'range',min:28,max:40,step:1,def:38,unit:'cm'},{k:'open',label:'Remove tape from holes',type:'toggle',def:false},{k:'hole',label:'Measure hole',type:'select',def:1,options:[[0,'Top'],[1,'Middle'],[2,'Bottom']]}],
init(){return{ph:0}},step(s,p,dt){s.ph+=dt},hy:[25,15,5],
calc(p){return this.hy.map(y=>{const d=p.Hw-y,v=Math.sqrt(2*9.8*d/100),fall=(y+15)/100;return{y,d,v,x:v*Math.sqrt(2*fall/9.8)*100,fall}})},
draw(c,s,p,t){room(c);const k=6,base=362,bx=300,cs=this.calc(p);RR(c,180,base,140,90,4,'#3b4451');
c.fillStyle='rgba(79,179,255,0.45)';c.fillRect(204,base-p.Hw*k,94,p.Hw*k);RR(c,200,base-240,100,240,[18,18,6,6],null,'rgba(220,235,245,0.7)',2.5);L(c,250,40,250,base-p.Hw*k,'rgba(79,179,255,0.6)',4);RR(c,236,30,40,16,3,'#8792a3');
RR(c,320,452,560,10,2,'#efe6c8');for(let cm=0;cm<=90;cm+=5){const x=bx+cm*k;L(c,x,452,x,452+(cm%10?4:8),'#3b3325',1);if(cm%10===0)T(c,cm+'',x,476,{a:'center',s:10,m:1,c:C.ink})}
cs.forEach((h,i)=>{const hy=base-h.y*k,sel=i===p.hole;T(c,HN[i]+'  d = '+h.d+' cm',190,hy+4,{a:'right',s:13,w:sel?700:500,c:sel?C.amber:C.dim});if(!p.open){RR(c,294,hy-8,14,16,2,'#e8d27a');return}
c.beginPath();for(let tt=0;;tt+=0.005){const x=bx+h.v*tt*600,y=hy+0.5*9.8*tt*tt*600;c.lineTo(x,y);if(y>=452)break}c.strokeStyle=sel?'rgba(130,200,255,0.95)':'rgba(130,200,255,0.6)';c.lineWidth=sel?5:3.5;c.stroke();
const tl=Math.sqrt(2*h.fall/9.8);for(let j=0;j<5;j++){const tt=((t*0.6+j/5)%1)*tl;c.beginPath();c.arc(bx+h.v*tt*600,hy+0.5*9.8*tt*tt*600,2.5,0,7);c.fillStyle='#e6f6ff';c.fill()}if(sel){const lx=bx+h.x*k;L(c,lx,440,lx,452,C.amber,3);T(c,h.x.toFixed(1)+' cm',lx,432,{a:'center',s:15,w:600,m:1,c:C.amber})}});
if(!p.open)hint(c,'Switch on “Remove tape from holes”');},
readings(s,p){const h=this.calc(p)[p.hole];return[['Depth of hole',h.d,'cm'],['Pressure at the hole',(h.d/100*1000*9.8).toFixed(0),'Pa'],['Jet speed',h.v.toFixed(2),'m/s'],['Range',p.open?h.x.toFixed(1):'—','cm']]},
columns:['Hole','Depth (cm)','Range (cm)'],record(s,p){if(!p.open)return{error:'Remove the tape first.'};const h=this.calc(p)[p.hole];return[HN[p.hole],h.d,+h.x.toFixed(1)]},plot:{x:1,y:2,fit:false},
result(rows){if(rows.length<2)return'';const b=[...rows].sort((a,c)=>c[2]-a[2])[0];return'Deeper hole → greater pressure → faster jet (v = √2gh), so liquid pressure increases with depth.   ·   Farthest jet here: '+b[0]+' hole ('+b[2]+' cm). Range also depends on the height of the hole above the table, so the deepest jet need not land farthest.'}};

S.motion={title:'Uniform & Non-uniform Motion',topic:'mech',grades:[6,7,9],
aim:'Measure the distance covered by a toy car in equal time intervals and plot a distance–time graph to tell uniform from non-uniform motion.',
apparatus:['Toy car on a 2 m track','Measuring scale on the track','Stopwatch','Chalk for marking'],
formula:'Speed = distance ÷ time      Uniform motion → straight-line distance–time graph',
procedure:['Choose the type of motion and tap “Start / pause car”.','A chalk mark appears every second.','Pause and record time and distance at several moments (or record while it runs).','Plot distance against time.','A straight line means uniform motion; a curve means non-uniform.'],
controls:[{k:'type',label:'Type of motion',type:'select',def:'u',options:[['u','Uniform'],['a','Speeding up'],['d','Slowing down']]},{k:'v',label:'Speed setting',type:'range',min:10,max:30,step:2,def:16,unit:'cm/s'}],
init(){return{t:0,x:0,run:false,marks:[]}},
actions:[{label:'Start / pause car',run(s){s.run=!s.run}},{label:'Reset car',run(s){Object.assign(s,{t:0,x:0,run:false,marks:[]})}}],
onChange(s){Object.assign(s,{t:0,x:0,run:false,marks:[]})},
pos(p,t){if(p.type==='u')return p.v*t;if(p.type==='a')return 0.5*(p.v/8)*t*t;const u=2*p.v,a=u*u/380,ts=u/a;return t<ts?u*t-0.5*a*t*t:190},
step(s,p,dt){if(!s.run)return;const pt=s.t;s.t+=dt;if(Math.floor(s.t)>Math.floor(pt))s.marks.push([Math.floor(s.t),this.pos(p,Math.floor(s.t))]);s.x=Math.min(200,this.pos(p,s.t));if(s.x>=200||(p.type==='d'&&s.x>=189.99))s.run=false},
draw(c,s,p,t){room(c);const X=x=>100+x*4;RR(c,90,330,820,26,3,'#4a5566');RR(c,90,356,820,30,2,'#efe6c8');for(let cm=0;cm<=200;cm+=5){const x=X(cm);L(c,x,356,x,356+(cm%10?6:12),'#3b3325',1);if(cm%20===0)T(c,cm+'',x,380,{a:'center',s:10,m:1,c:'#3b3325'})}
s.marks.forEach(m=>{const x=X(m[1]);L(c,x,326,x,340,'#ffffff',3);T(c,m[0]+'s',x,320,{a:'center',s:11,w:600,c:C.ink})});
const cx=X(s.x);RR(c,cx-56,278,60,34,8,G(c,0,278,0,312,['#ff6b6b','#b3261e']));RR(c,cx-46,262,36,22,6,'#ff8b8b');RR(c,cx-40,266,24,14,3,'#bfe6ff');[cx-44,cx-10].forEach(w=>{c.save();c.translate(w,316);c.rotate(s.x/4);ball(c,0,0,12,'#555c66','#0b0d10');L(c,-8,0,8,0,'#aab4c1',2);c.restore()});
lcd(c,600,90,140,s.t.toFixed(1)+' s',C.amber,'STOPWATCH');lcd(c,760,90,150,s.x.toFixed(1)+' cm',C.lime,'DISTANCE');if(!s.run&&s.t===0)hint(c,'Tap “Start / pause car”');},
readings(s,p){return[['Time t',s.t.toFixed(1),'s'],['Distance',s.x.toFixed(1),'cm'],['Average speed',s.t?(s.x/s.t).toFixed(1):'—','cm/s']]},
columns:['t (s)','Distance (cm)'],record(s){if(s.t<=0)return{error:'Start the car first.'};return[+s.t.toFixed(1),+s.x.toFixed(1)]},plot:{x:0,y:1,fit:false},
result(rows){if(rows.length<3)return'Record at least 3 readings.';const r=[...rows].sort((a,b)=>a[0]-b[0]),v=[];for(let i=1;i<r.length;i++)if(r[i][0]>r[i-1][0])v.push((r[i][1]-r[i-1][1])/(r[i][0]-r[i-1][0]));const m=avg(v),sp=Math.max(...v)-Math.min(...v);return sp<0.12*m?'Equal distances in equal times → uniform motion, speed ≈ '+m.toFixed(1)+' cm/s':'Speed changes between intervals → non-uniform motion'}};

window.LabParts=(window.LabParts||0)+1;
})();


/* 2316bfed-614c-431f-afd8-cff53e02a3af */
(function(){
const K=window.LabKit;const {W,H,R,C,T,L,P,RR,G,ball,head,ray,arc,room,paper,stand,meter,cl,avg,shadowE,hint}=K;
const S=window.LabSims;
const ink='#1d2733';
function pin(c,x,y){c.beginPath();c.arc(x,y,6,0,7);c.fillStyle='#1d2733';c.fill();c.beginPath();c.arc(x-2,y-2,2,0,7);c.fillStyle='#fff';c.fill();}
function isect(p,d,a,b){const ex=b[0]-a[0],ey=b[1]-a[1],den=d[0]*ey-d[1]*ex;const t=((a[0]-p[0])*ey-(a[1]-p[1])*ex)/den;return[p[0]+d[0]*t,p[1]+d[1]*t];}
function wire(c,pts,col,w){c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.strokeStyle=col||'#d9964a';c.lineWidth=w||4;c.lineJoin='round';c.lineCap='round';c.stroke();}
function perim(pts){let t=0;for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];t+=Math.hypot(b[0]-a[0],b[1]-a[1])}return t}
function along(pts,d){const tot=perim(pts);d=((d%tot)+tot)%tot;for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length],l=Math.hypot(b[0]-a[0],b[1]-a[1]);if(d<=l){const f=d/l;return[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f]}d-=l}return pts[0]}
function electrons(c,pts,ph,n){const tot=perim(pts);for(let k=0;k<n;k++){const q=along(pts,ph+k*tot/n);c.beginPath();c.arc(q[0],q[1],3.2,0,7);c.fillStyle='rgba(130,235,255,0.95)';c.fill()}}
function board(c){room(c,false);c.save();c.shadowColor='rgba(0,0,0,0.5)';c.shadowBlur=24;RR(c,40,30,920,500,18,'#152131','#26384f',1.5);c.restore();c.fillStyle='rgba(255,255,255,0.05)';for(let x=60;x<950;x+=24)for(let y=50;y<520;y+=24){c.fillRect(x,y,2,2)}}
function cells(c,x,y,n){const w=66,tw=n*w;for(let i=0;i<n;i++){const cx=x-tw/2+i*w;RR(c,cx+2,y-16,w-12,32,6,G(c,0,y-16,0,y+16,['#566275','#1e242d','#3a4454']),'#0c1016');RR(c,cx+2,y-16,12,32,[6,0,0,6],'#b6f35c');RR(c,cx+w-10,y-6,5,12,1,'#c9d1db');T(c,'1.5V',cx+w/2+4,y+4,{s:10,a:'center',m:1})}T(c,'Battery '+(1.5*n).toFixed(1)+' V',x,y-26,{a:'center',s:13,c:C.dim})}
function plugKey(c,x,y,on){RR(c,x-44,y-20,88,40,7,'#20262f','#3a4658');RR(c,x-36,y-12,30,24,3,G(c,0,y-12,0,y+12,['#f3cf7a','#a0761e']));RR(c,x+6,y-12,30,24,3,G(c,0,y-12,0,y+12,['#f3cf7a','#a0761e']));if(on){ball(c,x,y-4,12,'#555c66','#0b0d10')}else{ball(c,x+34,y-40,12,'#555c66','#0b0d10')}T(c,on?'K (closed)':'K (open) — tap',x,y+36,{a:'center',s:12,c:on?C.lime:C.amber})}
function rheo(c,x,y1,y2,f,lab){RR(c,x-18,y1,36,y2-y1,6,G(c,x-18,0,x+18,0,['#6b4a2a','#d69a55','#6b4a2a']));c.strokeStyle='rgba(60,35,15,0.6)';c.lineWidth=1;c.beginPath();for(let y=y1+4;y<y2;y+=4){c.moveTo(x-18,y);c.lineTo(x+18,y+2)}c.stroke();L(c,x+30,y1-6,x+30,y2+6,'#aab4c1',4);const ys=y1+(y2-y1)*f;RR(c,x-24,ys-10,62,20,4,'#3f4958','#8792a3');T(c,lab||'Rh',x+44,y1+4,{s:13,c:C.dim})}
function resistor(c,x,y,lab){RR(c,x-50,y-14,100,28,12,G(c,0,y-14,0,y+14,['#efe2c0','#c8b489']));['#8b4a1c','#111','#c0392b','#d4af37'].forEach((b,i)=>{c.fillStyle=b;c.fillRect(x-30+i*16,y-14,7,28)});T(c,lab,x,y+34,{a:'center',s:13,w:600,c:C.ink})}

S.reflection={title:'Laws of Reflection (Plane Mirror)',topic:'light',grades:[6,7,8],
aim:'Verify that the angle of reflection equals the angle of incidence, and that incident ray, normal and reflected ray lie in one plane.',
apparatus:['Plane mirror strip with holder','Drawing board & white sheet','Pins','Protractor'],
formula:'∠ i = ∠ r',
procedure:['Draw the normal at the point where the ray meets the mirror.','Set the angle of incidence (or drag the incident ray).','Observe the reflected ray through the pins.','Measure ∠r with the protractor and record.','Repeat for 5 different angles.'],
controls:[{k:'i',label:'Angle of incidence ∠i',type:'range',min:0,max:80,step:1,def:30,unit:'°'},{k:'pins',label:'Show pins',type:'toggle',def:true}],
init(){return{}},
pointer(s,p,x,y,ph){if(ph==='down')s.drag=true;if(ph==='up')s.drag=false;if(!s.drag||y>=398)return null;return{i:Math.round(cl(Math.abs(Math.atan2(500-x,400-y))/R,0,80))}},
draw(c,s,p){paper(c);const i=p.i*R,Lr=300,O=[500,400];c.beginPath();c.arc(500,400,170,Math.PI,2*Math.PI);c.fillStyle='rgba(79,160,220,0.08)';c.fill();c.strokeStyle='rgba(40,110,170,0.45)';c.lineWidth=1;c.stroke();
for(let a=0;a<=180;a+=5){const q=Math.PI+a*R;L(c,500+Math.cos(q)*(a%10?164:158),400+Math.sin(q)*(a%10?164:158),500+Math.cos(q)*170,400+Math.sin(q)*170,'rgba(40,110,170,0.7)',1);if(a%30===0)T(c,Math.abs(90-a)+'°',500+Math.cos(q)*145,400+Math.sin(q)*145+4,{a:'center',s:11,c:'rgba(40,90,140,0.9)'})}
c.fillStyle='#9aa7b6';c.fillRect(200,400,600,12);for(let x=205;x<800;x+=12)L(c,x,412,x-8,424,'#6d7888',1.2);L(c,200,400,800,400,'#2b3a4a',3);T(c,'MIRROR',790,440,{a:'right',s:12,w:600,c:'#4a5566'});
L(c,500,400,500,95,'#555',1.5,[8,6]);T(c,'N',500,86,{a:'center',s:14,w:700,c:'#333'});
const Pp=[500-Math.sin(i)*Lr,400-Math.cos(i)*Lr],Q=[500+Math.sin(i)*Lr,400-Math.cos(i)*Lr];ray(c,Pp[0],Pp[1],500,400,'#d62839',3);ray(c,500,400,Q[0],Q[1],'#1f6fd6',3);
if(p.i>0){arc(c,500,400,62,-90*R,-(90+p.i)*R,'#d62839',2);arc(c,500,400,74,-90*R,-(90-p.i)*R,'#1f6fd6',2)}
T(c,'∠i = '+p.i+'°',500-Math.sin(i/2)*98-10,400-Math.cos(i/2)*98,{a:'right',s:16,w:700,c:'#d62839'});T(c,'∠r = '+p.i+'°',500+Math.sin(i/2)*98+10,400-Math.cos(i/2)*98,{s:16,w:700,c:'#1f6fd6'});
if(p.pins){[.5,.85].forEach(f=>{pin(c,500-Math.sin(i)*Lr*f,400-Math.cos(i)*Lr*f);pin(c,500+Math.sin(i)*Lr*f,400-Math.cos(i)*Lr*f)})}
T(c,'Incident ray',Pp[0]-6,Pp[1]-10,{a:'center',s:13,c:'#d62839'});T(c,'Reflected ray',Q[0]+6,Q[1]-10,{a:'center',s:13,c:'#1f6fd6'});hint(c,'Drag on the sheet to move the incident ray',true);},
readings(s,p){return[['Angle of incidence ∠i',p.i,'°'],['Angle of reflection ∠r',p.i,'°'],['∠i − ∠r',0,'°']]},
columns:['∠i (°)','∠r (°)'],record(s,p){return[p.i,p.i]},plot:{x:0,y:1},
result(rows){return rows.length?'∠r = ∠i in every observation — law of reflection verified.':''}};

S.glassSlab={title:'Refraction through a Glass Slab',topic:'light',grades:[9,10],
aim:'Trace the path of a ray of light through a rectangular glass slab and measure ∠i, ∠r, ∠e and the lateral shift.',
apparatus:['Rectangular glass slab','Drawing board & sheet','Pins','Protractor'],
formula:'n = sin i / sin r      ∠e = ∠i      d = t sin(i − r) / cos r',
procedure:['Outline the slab and draw the normal at the entry point.','Choose ∠i (or drag the incident ray).','Look through the slab and fix pins in line with the emergent ray.','Join the points and measure ∠r and ∠e.','Record for 4–5 angles and compute n.'],
controls:[{k:'i',label:'Angle of incidence ∠i',type:'range',min:10,max:75,step:1,def:40,unit:'°'},{k:'n',label:'Slab material',type:'select',def:1.5,options:[[1.5,'Crown glass'],[1.33,'Water tank'],[1.65,'Flint glass']]}],
init(){return{}},
geo(p){const i=p.i*R,r=Math.asin(Math.sin(i)/p.n),t=8;return{i,r,d:t*Math.sin(i-r)/Math.cos(r)}},
pointer(s,p,x,y,ph){if(ph==='down')s.drag=true;if(ph==='up')s.drag=false;if(!s.drag||y>=188||x>=420)return null;return{i:Math.round(cl(Math.atan2(420-x,190-y)/R,10,75))}},
draw(c,s,p){paper(c);const {i,r,d}=this.geo(p),O=[420,190],O2=[420+160*Math.tan(r),350];
c.save();c.shadowColor='rgba(40,110,150,0.3)';c.shadowBlur=14;RR(c,280,190,440,160,3,'rgba(130,205,235,0.32)','#3a7a92',2);c.restore();T(c,'GLASS SLAB  t = 8 cm',700,338,{a:'right',s:12,w:600,c:'#2d6378'});
L(c,420,70,420,290,'#555',1.3,[7,6]);L(c,O2[0],250,O2[0],480,'#555',1.3,[7,6]);
const P0=[420-Math.sin(i)*200,190-Math.cos(i)*200],E=[O2[0]+Math.sin(i)*190,350+Math.cos(i)*190];
L(c,420,190,420+Math.sin(i)*320,190+Math.cos(i)*320,'rgba(214,40,57,0.45)',1.5,[6,5]);
ray(c,P0[0],P0[1],420,190,'#d62839',3);ray(c,420,190,O2[0],350,'#e36414',3);ray(c,O2[0],350,E[0],E[1],'#1f6fd6',3);
arc(c,420,190,52,-90*R,-(90+p.i)*R,'#d62839',2);arc(c,420,190,52,90*R,(90-r/R)*R,'#e36414',2);arc(c,O2[0],350,52,90*R,(90-p.i)*R,'#1f6fd6',2);
T(c,'∠i',396-Math.sin(i/2)*50,150,{a:'right',s:15,w:700,c:'#d62839'});T(c,'∠r',432,262,{s:15,w:700,c:'#e36414'});T(c,'∠e',O2[0]+14,418,{s:15,w:700,c:'#1f6fd6'});
[.3,.7].forEach(f=>{pin(c,420-Math.sin(i)*200*f,190-Math.cos(i)*200*f);pin(c,O2[0]+Math.sin(i)*190*(f+.2),350+Math.cos(i)*190*(f+.2))});
T(c,'lateral shift d = '+d.toFixed(2)+' cm',870,480,{a:'right',s:14,w:600,c:'#1d2733'});hint(c,'Drag above the slab to change the angle of incidence',true);},
readings(s,p){const g=this.geo(p);return[['∠i',p.i,'°'],['∠r',(g.r/R).toFixed(1),'°'],['∠e',p.i,'°'],['n = sin i / sin r',(Math.sin(g.i)/Math.sin(g.r)).toFixed(3),''],['Lateral shift',g.d.toFixed(2),'cm']]},
columns:['∠i (°)','∠r (°)','∠e (°)','sin i/sin r'],record(s,p){const g=this.geo(p);return[p.i,+(g.r/R).toFixed(1),p.i,+(Math.sin(g.i)/Math.sin(g.r)).toFixed(3)]},plot:{x:0,y:1,fit:false},
result(rows){return rows.length?'Refractive index n ≈ '+avg(rows.map(r=>r[3])).toFixed(3)+'  ·  ∠e = ∠i (emergent ray parallel to incident ray)':''}};

function candle(c,x,ay,k,t){c.save();c.translate(x,ay);c.scale(Math.abs(k),k);RR(c,-7,-22,14,42,2,G(c,-7,0,7,0,['#d9d2c0','#fffaf0','#c9c0aa']));const fl=1+0.06*Math.sin(t*13)+0.04*Math.sin(t*23);c.beginPath();c.moveTo(0,-22-26*fl);c.quadraticCurveTo(10,-30,0,-22);c.quadraticCurveTo(-10,-30,0,-22-26*fl);c.fillStyle='#ffb13b';c.fill();c.beginPath();c.ellipse(0,-31,3,6,0,0,7);c.fillStyle='#fff6c9';c.fill();L(c,0,-22,0,-26,'#222',1.5);c.restore();}
function benchSim(mir){const X0=50,PX=9,AX=250,OX=X0+(mir?90:50)*PX,umax=mir?80:48;
return{title:mir?'Concave Mirror — Focal Length':'Convex Lens — Image Formation & f',topic:'light',grades:[7,10,12],
aim:mir?'Obtain real images of a candle with a concave mirror for different object distances and find its focal length.':'Obtain real images of a candle with a convex lens for different object distances and find its focal length.',
apparatus:['Optical bench with scale',mir?'Concave mirror on holder':'Convex lens on holder','Candle (object)','White screen'],
formula:mir?'1/v + 1/u = 1/f      f = uv / (u + v)   (magnitudes)':'1/v − 1/u = 1/f      f = uv / (u + v)   (magnitudes)',
procedure:['Place the '+(mir?'mirror':'lens')+' on the bench and choose u (or drag the candle).','Move the screen (slider or drag) until the image is sharp.','When sharpness > 80 %, tap “Record reading”.','Repeat for 5 object distances beyond F.','Compute f for each; plot 1/u against 1/v.'],
controls:[{k:'f',label:'Focal length (unknown)',type:'select',def:15,options:[[10,'A'],[15,'B'],[20,'C']]},{k:'u',label:'Object distance u',type:'range',min:5,max:umax,step:0.5,def:30,unit:'cm'},{k:'sd',label:'Screen distance v',type:'range',min:5,max:umax,step:0.5,def:mir?22:36,unit:'cm'},{k:'rays',label:'Ray diagram',type:'toggle',def:false}],
init(){return{}},
img(p){if(p.u>p.f+0.01){const v=p.u*p.f/(p.u-p.f);return{real:true,v,m:v/p.u}}const v=p.u*p.f/(p.f-p.u+1e-6);return{real:false,v,m:v/p.u}},
sharp(p){const im=this.img(p);return im.real?Math.exp(-Math.abs(p.sd-im.v)/1.4):0},
xo(p){return OX-p.u*PX},xs(p){return mir?OX-p.sd*PX:OX+p.sd*PX},
pointer(s,p,x,y,ph){if(ph==='down'){s.drag=Math.abs(x-this.xo(p))<30?'u':Math.abs(x-this.xs(p))<30?'sd':null}if(ph==='up')s.drag=null;if(!s.drag)return null;const cm=(x-X0)/PX;let v=s.drag==='u'?(mir?90:50)-cm:(mir?90-cm:cm-50);v=Math.round(cl(v,5,umax)*2)/2;return{[s.drag]:v}},
draw(c,s,p,t){room(c);const im=this.img(p),xo=this.xo(p),xs=this.xs(p),h=48,sh=this.sharp(p);
[80,920].forEach(x=>RR(c,x-8,430,16,26,2,'#3b4451'));RR(c,40,395,920,18,4,G(c,0,395,0,413,['#e5ebf2','#7a8698']));RR(c,40,413,920,24,[0,0,4,4],'#e7d7a0');for(let cm=0;cm<=100;cm++){const x=X0+cm*PX;L(c,x,413,x,413+(cm%10?(cm%5?5:9):13),'#3b3325',1);if(cm%10===0)T(c,cm+'',x,434,{a:'center',s:10,m:1,c:'#3b3325'})}
L(c,40,AX,960,AX,'rgba(255,255,255,0.18)',1,[10,8]);
const F1=mir?OX-p.f*PX:OX+p.f*PX;[1,2].forEach(n=>{const fx=mir?OX-n*p.f*PX:OX+n*p.f*PX;if(p.rays){L(c,fx,AX-6,fx,AX+6,C.ink,2);T(c,(n===1?'F':'2F'),fx,AX+22,{a:'center',s:12,w:600,c:C.dim})}if(!mir&&p.rays){const bx=OX-n*p.f*PX;L(c,bx,AX-6,bx,AX+6,C.ink,2);T(c,n===1?'F':'2F',bx,AX+22,{a:'center',s:12,w:600,c:C.dim})}});
const up=(x,top)=>{RR(c,x-15,383,30,14,3,'#5b6677','#2b323c');c.fillStyle=G(c,x-3,0,x+3,0,['#77849a','#eef2f7','#6c788c']);c.fillRect(x-3,top,6,383-top)};
up(xo,AX+22);c.save();c.globalCompositeOperation='lighter';const gl=c.createRadialGradient(xo,AX-34,2,xo,AX-34,70);gl.addColorStop(0,'rgba(255,190,90,0.45)');gl.addColorStop(1,'rgba(255,190,90,0)');c.fillStyle=gl;c.fillRect(xo-70,AX-104,140,140);c.restore();candle(c,xo,AX,1,t);
if(mir){up(OX+6,AX+80);c.beginPath();c.moveTo(OX-10,AX-82);c.quadraticCurveTo(OX+14,AX,OX-10,AX+82);c.strokeStyle='#e8eef4';c.lineWidth=5;c.stroke();c.beginPath();c.moveTo(OX-4,AX-84);c.quadraticCurveTo(OX+20,AX,OX-4,AX+84);c.strokeStyle='#5b6677';c.lineWidth=5;c.stroke()}
else{up(OX,AX+82);c.beginPath();c.ellipse(OX,AX,11,80,0,0,7);c.fillStyle='rgba(140,210,255,0.3)';c.fill();c.strokeStyle='#8fd8ff';c.lineWidth=2;c.stroke()}
up(xs,AX+96);RR(c,xs-6,AX-96,12,192,2,G(c,xs-6,0,xs+6,0,['#bdb7aa','#f4f1ea']));if(sh>0.2){L(c,xs+(mir?6:-6),AX,xs+(mir?6:-6),AX+h*im.m,'rgba(255,190,90,'+sh+')',3)}
if(p.rays){const ty=AX-h,a='#ffd166',b='#6ee7ff';const ext=(x1,y1,x2,y2,xt)=>y1+(y2-y1)*(xt-x1)/(x2-x1);
if(!mir){L(c,xo,ty,OX,ty,a,2);L(c,OX,ty,980,ext(OX,ty,F1,AX,980),a,2);L(c,xo,ty,980,ext(xo,ty,OX,AX,980),b,2);if(!im.real){const vx=OX-im.v*PX,vy=AX-h*im.m;L(c,OX,ty,vx,vy,a,1.5,[5,5]);L(c,xo,ty,vx,vy,b,1.5,[5,5]);candle(c,vx,AX,im.m,t)}}
else{L(c,xo,ty,OX,ty,a,2);L(c,OX,ty,20,ext(OX,ty,F1,AX,20),a,2);L(c,xo,ty,OX,AX,b,2);L(c,OX,AX,20,ext(OX,AX,OX+(OX-xo),ty,20),b,2);if(!im.real){const vx=OX+im.v*PX,vy=AX-h*im.m;L(c,OX,ty,Math.min(vx,990),ext(OX,ty,F1,AX,Math.min(vx,990)),a,1.5,[5,5]);L(c,OX,AX,Math.min(vx,990),ext(OX,AX,OX+(OX-xo),ty,Math.min(vx,990)),b,1.5,[5,5])}}}
const ix=400;RR(c,ix,6,200,140,10,'#0b1119','#3a4658');T(c,'VIEW ON SCREEN',ix+12,24,{s:11,w:600,c:C.dim});c.save();RR(c,ix+12,32,176,106,4,'#efebe2');c.clip();
if(im.real){const blur=Math.min(18,Math.abs(p.sd-im.v)*2.4);const g2=c.createRadialGradient(ix+100,85,4,ix+100,85,80);g2.addColorStop(0,'rgba(255,190,90,'+(0.25+0.3*(1-sh))+')');g2.addColorStop(1,'rgba(255,190,90,0)');c.fillStyle=g2;c.fillRect(ix+12,32,176,106);c.filter='blur('+blur.toFixed(1)+'px)';c.globalAlpha=0.35+0.65*sh;candle(c,ix+100,74,-Math.min(im.m,4)*0.8,t);c.filter='none';c.globalAlpha=1}
else T(c,'No image on screen',ix+100,90,{a:'center',s:13,c:'#6b6457'});c.restore();
T(c,'sharpness '+Math.round(sh*100)+'%',ix+212,28,{s:13,w:600,m:1,c:sh>0.8?C.lime:C.amber});
hint(c,'Drag the candle or the screen along the bench');},
readings(s,p){const sh=this.sharp(p),im=this.img(p);return[['Object distance u',p.u.toFixed(1),'cm'],['Screen distance v',p.sd.toFixed(1),'cm'],['Image sharpness',Math.round(sh*100),'%'],['Image',sh>0.8?('Real, inverted, '+(im.m>1.05?'magnified':im.m<0.95?'diminished':'same size')):(im.real?'Blurred':'Virtual'),'']]},
columns:['u (cm)','v (cm)','1/u (cm⁻¹)','1/v (cm⁻¹)','f (cm)'],
record(s,p){if(this.sharp(p)<0.8)return{error:'Move the screen until the image is sharp (above 80 %).'};return[p.u,p.sd,+(1/p.u).toFixed(4),+(1/p.sd).toFixed(4),+(p.u*p.sd/(p.u+p.sd)).toFixed(2)]},
plot:{x:2,y:3},result(rows){return rows.length?'Mean focal length f ≈ '+avg(rows.map(r=>r[4])).toFixed(1)+' cm':''}}}
S.lens=benchSim(false);S.mirror=benchSim(true);S.mirror.grades=[7,10,12];

S.prism={title:'Prism — Angle of Deviation',topic:'light',grades:[10,12],
aim:'Trace rays through a glass prism, draw the i–D curve and find the angle of minimum deviation and refractive index.',
apparatus:['Equilateral glass prism (A = 60°)','Drawing board & sheet','Pins','Protractor'],
formula:'D = i + e − A      n = sin((A + Dm)/2) / sin(A/2)',
procedure:['Place the prism and draw the normal on the first face.','Set ∠i (or drag the incident ray) and look for the emergent ray through the other face.','Record ∠e and the deviation D.','Repeat from 30° to 70° in steps of 5°.','Plot i against D and find Dm from the lowest point.'],
controls:[{k:'i',label:'Angle of incidence ∠i',type:'range',min:30,max:70,step:1,def:40,unit:'°'},{k:'n',label:'Prism material',type:'select',def:1.52,options:[[1.52,'Crown glass'],[1.62,'Flint glass']]},{k:'white',label:'White light (dispersion)',type:'toggle',def:false}],
init(){return{}},
geo(p,n){n=n||p.n;const A=60*R,i=p.i*R,r1=Math.asin(Math.sin(i)/n),r2=A-r1,sE=n*Math.sin(r2);if(sE>1)return{tir:true,r1,r2};const e=Math.asin(sE);return{r1,r2,e,D:i+e-A}},
pointer(s,p,x,y,ph){if(ph==='down')s.drag=true;if(ph==='up')s.drag=false;if(!s.drag||x>420)return null;return{i:Math.round(cl(30-Math.atan2(240-y,425-x)/R,30,70))}},
draw(c,s,p){paper(c);const Tp=[500,110],Lp=[350,370],Rp=[650,370],P1=[425,240],i=p.i*R;
c.save();c.shadowColor='rgba(40,110,150,0.3)';c.shadowBlur=14;P(c,[Tp,Lp,Rp],'rgba(130,205,235,0.3)','#2f6f8f',2);c.restore();T(c,'A = 60°',500,150,{a:'center',s:13,w:600,c:'#2d6378'});
L(c,P1[0]-Math.cos(30*R)*90,P1[1]-Math.sin(30*R)*90,P1[0]+Math.cos(30*R)*60,P1[1]+Math.sin(30*R)*60,'#555',1.3,[7,6]);
const d0=[Math.cos(30*R-i),Math.sin(30*R-i)],st=[P1[0]-d0[0]*260,P1[1]-d0[1]*260];ray(c,st[0],st[1],P1[0],P1[1],'#d62839',3);
const cols=p.white?[['#e63946',-0.012],['#f77f00',-0.008],['#fcbf49',-0.004],['#2a9d8f',0],['#1f6fd6',0.005],['#5a3fc0',0.01],['#8e2de2',0.014]]:[['#d62839',0]];
let main=null;cols.forEach(([col,dn])=>{const g=this.geo(p,p.n+dn),d1=[Math.cos(30*R-g.r1),Math.sin(30*R-g.r1)],P2=isect(P1,d1,Rp,Tp);L(c,P1[0],P1[1],P2[0],P2[1],p.white?col:'#e36414',p.white?1.5:3);if(g.tir)return;const a2=-30*R+g.e,E=[P2[0]+Math.cos(a2)*260,P2[1]+Math.sin(a2)*260];if(p.white)L(c,P2[0],P2[1],E[0],E[1],col,2.5);else ray(c,P2[0],P2[1],E[0],E[1],'#1f6fd6',3);if(dn===0)main={P2,a2,g}});
const g=this.geo(p);if(g.tir){T(c,'Total internal reflection — no emergent ray',500,470,{a:'center',s:16,w:700,c:'#b3261e'});return}
const P2=main?main.P2:isect(P1,[Math.cos(30*R-g.r1),Math.sin(30*R-g.r1)],Rp,Tp),a2=-30*R+g.e;
L(c,P2[0]-Math.cos(-30*R)*60,P2[1]-Math.sin(-30*R)*60,P2[0]+Math.cos(-30*R)*90,P2[1]+Math.sin(-30*R)*90,'#555',1.3,[7,6]);
L(c,P1[0],P1[1],P1[0]+d0[0]*330,P1[1]+d0[1]*330,'rgba(214,40,57,0.4)',1.4,[6,5]);L(c,P2[0],P2[1],P2[0]-Math.cos(a2)*170,P2[1]-Math.sin(a2)*170,'rgba(31,111,214,0.4)',1.4,[6,5]);
[.35,.75].forEach(f=>{pin(c,st[0]+d0[0]*260*f,st[1]+d0[1]*260*f);pin(c,P2[0]+Math.cos(a2)*260*(f+.1),P2[1]+Math.sin(a2)*260*(f+.1))});
T(c,'∠i = '+p.i+'°',st[0]+10,st[1]-14,{s:15,w:700,c:'#d62839'});T(c,'∠e = '+(g.e/R).toFixed(1)+'°',P2[0]+Math.cos(a2)*200,P2[1]+Math.sin(a2)*200+28,{s:15,w:700,c:'#1f6fd6'});
T(c,'D = '+(g.D/R).toFixed(1)+'°',870,70,{a:'right',s:22,w:700,m:1,c:'#1d2733'});T(c,'angle of deviation',870,92,{a:'right',s:12,c:'#5a6472'});hint(c,'Drag left of the prism to change ∠i',true);},
readings(s,p){const g=this.geo(p);if(g.tir)return[['∠i',p.i,'°'],['Emergent ray','none (TIR)','']];return[['∠i',p.i,'°'],['∠e',(g.e/R).toFixed(1),'°'],['Deviation D',(g.D/R).toFixed(1),'°'],['r₁ + r₂',((g.r1+g.r2)/R).toFixed(1),'°']]},
columns:['∠i (°)','∠e (°)','∠D (°)'],record(s,p){const g=this.geo(p);if(g.tir)return{error:'No emergent ray at this angle.'};return[p.i,+(g.e/R).toFixed(1),+(g.D/R).toFixed(1)]},plot:{x:0,y:2,fit:false},
result(rows){if(rows.length<3)return'Record at least 3 angles to see the minimum.';const m=rows.reduce((a,b)=>b[2]<a[2]?b:a);return'Dm ≈ '+m[2]+'° at i ≈ '+m[0]+'°   ·   n = sin((A+Dm)/2)/sin(A/2) ≈ '+(Math.sin((60+m[2])/2*R)/Math.sin(30*R)).toFixed(3)}};

S.shadow={title:'Light, Shadows & Umbra',topic:'light',grades:[6],
aim:'Show that light travels in straight lines and study how the size of a shadow changes with the position of the object.',
apparatus:['Torch with pin-hole / frosted bulb','Ball on a stand','White screen','Metre scale'],
formula:'Shadow size = object size × (source-to-screen ÷ source-to-object)',
procedure:['Keep the source and the screen 60 cm apart in a dark room.','Place the ball between them; note the shadow on the screen.','Move the ball closer to the source and record the shadow size.','Move it towards the screen and record again.','Switch to the frosted bulb to see umbra (dark) and penumbra (partial) shadow.'],
controls:[{k:'d',label:'Ball distance from source',type:'range',min:10,max:52,step:1,def:22,unit:'cm'},{k:'src',label:'Light source',type:'select',def:'pt',options:[['pt','Pin-hole torch'],['ext','Frosted bulb']]}],
init(){return{}},
geo(p){const r=3,Rs=p.src==='ext'?2:0.001,q=60/p.d;return{hu:Math.max(0,Rs+(r-Rs)*q),hp:(Rs+r)*q-Rs}},
pointer(s,p,x,y,ph){if(ph==='down')s.drag=Math.abs(x-(100+p.d*13))<50;if(ph==='up')s.drag=false;if(!s.drag)return null;return{d:Math.round(cl((x-100)/13,10,52))}},
draw(c,s,p){room(c);c.fillStyle='rgba(0,0,0,0.45)';c.fillRect(0,0,W,H);const sx=100,AX=250,k=13,xs=880,xb=sx+p.d*k,r=39,ext=p.src==='ext',Rs=ext?26:2,g=this.geo(p),hu=g.hu*k,hp=g.hp*k;
P(c,[[sx,AX-Rs],[xs,AX-230],[xs,AX+210],[sx,AX+Rs]],'rgba(255,221,130,0.08)');
RR(c,xs,40,16,420,2,'#e9e4d8');c.fillStyle='rgba(60,55,50,0.55)';c.fillRect(xs,Math.max(40,AX-hp),16,Math.min(420,2*hp));c.fillStyle='#1b1a19';c.fillRect(xs,Math.max(40,AX-hu),16,Math.min(420,2*hu));
[[AX-Rs,AX-r],[AX+Rs,AX+r],[AX+Rs,AX-r],[AX-Rs,AX+r]].forEach(([y1,y2],j)=>{if(!ext&&j>1)return;const ye=y1+(y2-y1)*(xs-sx)/(xb-sx);L(c,sx,y1,xs,ye,j<2?'rgba(255,221,130,0.7)':'rgba(255,221,130,0.35)',1.3,[6,5])});
RR(c,xb-3,AX+r,6,460-AX-r,1,'#8792a3');RR(c,xb-24,456,48,10,2,'#3f4958');ball(c,xb,AX,r,'#ff9a6b','#6a2410');
RR(c,sx-3,AX+30,6,430-AX-30+30,1,'#8792a3');RR(c,sx-24,456,48,10,2,'#3f4958');
const gl=c.createRadialGradient(sx,AX,2,sx,AX,ext?110:50);gl.addColorStop(0,'rgba(255,236,170,0.9)');gl.addColorStop(1,'rgba(255,236,170,0)');c.fillStyle=gl;c.beginPath();c.arc(sx,AX,ext?110:50,0,7);c.fill();
if(ext)ball(c,sx,AX,Rs,'#fff4c2','#e0b64a');else{RR(c,sx-60,AX-18,58,36,6,'#39424f');c.beginPath();c.arc(sx,AX,4,0,7);c.fillStyle='#fffbe6';c.fill()}
T(c,p.d+' cm',(sx+xb)/2,AX+r+50,{a:'center',s:14,w:600,m:1,c:C.amber});L(c,sx,AX+r+32,xb,AX+r+32,C.amber,1);T(c,(60-p.d)+' cm',(xb+xs)/2,AX+r+50,{a:'center',s:14,w:600,m:1,c:C.dim});
RR(c,630,20,220,170,10,'#0b1119','#3a4658');T(c,'SCREEN (FRONT VIEW)',642,40,{s:11,w:600,c:C.dim});c.save();RR(c,642,50,196,128,4,'#efebe2');c.clip();const cx=740,cy=114,f=0.28;if(ext){const pg=c.createRadialGradient(cx,cy,hu*f,cx,cy,hp*f);pg.addColorStop(0,'rgba(30,28,26,0.95)');pg.addColorStop(1,'rgba(30,28,26,0)');c.fillStyle=pg;c.beginPath();c.arc(cx,cy,hp*f,0,7);c.fill()}c.beginPath();c.arc(cx,cy,hu*f,0,7);c.fillStyle='#1b1a19';c.fill();c.restore();
hint(c,'Drag the ball between the source and the screen');},
readings(s,p){const g=this.geo(p);return[['Source → ball',p.d,'cm'],['Ball → screen',60-p.d,'cm'],['Shadow (umbra) diameter',(2*g.hu).toFixed(1),'cm'],['Penumbra diameter',p.src==='ext'?(2*g.hp).toFixed(1):'—','cm']]},
columns:['Source → ball (cm)','Shadow dia. (cm)'],record(s,p){return[p.d,+(2*this.geo(p).hu).toFixed(1)]},plot:{x:0,y:1,fit:false},
result(rows){return rows.length>1?'The shadow gets smaller as the ball moves away from the source — light travels in straight lines.':''}};

const LOOP=[[140,110],[860,110],[860,360],[140,360]];
const RS={5:'5 Ω',10:'10 Ω',15:'5 Ω + 10 Ω (series)',3.333:'5 Ω ‖ 10 Ω (parallel)'};
S.ohm={title:"Ohm's Law — V–I Graph",topic:'elec',grades:[10,12],
aim:'Study the dependence of current (I) on potential difference (V) across a resistor and find its resistance; verify series and parallel combinations.',
apparatus:['Battery eliminator / cells','Resistor(s)','Ammeter (0–2 A)','Voltmeter (0–6 V)','Rheostat','Plug key, connecting wires'],
formula:'V = I R      R(series) = R₁ + R₂      1/R(parallel) = 1/R₁ + 1/R₂',
procedure:['Close the plug key (tap it on the board).','Adjust the rheostat (drag its slider) to change the current.','Read the ammeter and voltmeter and record.','Take 5–6 readings; plot V against I.','Change to series / parallel combination and repeat.'],
controls:[{k:'cells',label:'Cells in battery',type:'range',min:1,max:4,step:1,def:2,unit:''},{k:'rh',label:'Rheostat',type:'range',min:0,max:100,step:5,def:50,unit:'%'},{k:'R',label:'Resistor',type:'select',def:5,options:[[5,'5 Ω'],[10,'10 Ω'],[15,'Series'],[3.333,'Parallel']]},{k:'key',label:'Plug key',type:'toggle',def:false}],
init(){return{ph:0}},
vi(p){const E=1.5*p.cells,rh=20*p.rh/100,I=p.key?E/(p.R+rh+0.5):0;return{I,V:I*p.R,rh}},
step(s,p,dt){s.ph+=this.vi(p).I*150*dt},
pointer(s,p,x,y,ph){if(ph==='down'){if(Math.hypot(x-640,y-110)<50)return{key:!p.key};s.drag=x>90&&x<200&&y>130&&y<350}if(ph==='up')s.drag=false;if(!s.drag)return null;return{rh:Math.round(cl((y-150)/180*100,0,100)/5)*5}},
draw(c,s,p){board(c);const {I,V}=this.vi(p);wire(c,[...LOOP,LOOP[0]]);wire(c,[[430,360],[430,488],[437,488]]);wire(c,[[570,360],[570,488],[563,488]]);if(I>0)electrons(c,LOOP,s.ph,44);
RR(c,160,90,280,40,4,'#152131');cells(c,300,110,p.cells);plugKey(c,640,110,p.key);rheo(c,140,150,330,p.rh/100,'Rheostat');resistor(c,500,360,'R = '+RS[p.R]);
meter(c,860,245,58,I,0,2,'A',C.amber,I.toFixed(2)+' A');meter(c,500,478,48,V,0,6,'V',C.lime,V.toFixed(2)+' V');
T(c,'Ammeter',860,160,{a:'center',s:12,c:C.dim});T(c,'Voltmeter',620,470,{s:12,c:C.dim});if(!p.key)hint(c,'Tap the plug key to close the circuit · drag the rheostat slider');},
readings(s,p){const v=this.vi(p);return[['Voltmeter V',v.V.toFixed(2),'V'],['Ammeter I',v.I.toFixed(3),'A'],['V / I',v.I?(v.V/v.I).toFixed(2):'—','Ω'],['Rheostat',v.rh.toFixed(0),'Ω']]},
columns:['Resistor','V (V)','I (A)','R = V/I (Ω)'],record(s,p){const v=this.vi(p);if(!p.key)return{error:'Close the plug key first.'};return[RS[p.R].split(' (')[0],+v.V.toFixed(2),+v.I.toFixed(3),+(v.V/v.I).toFixed(2)]},plot:{x:2,y:1},
result(rows){const g={};rows.forEach(r=>(g[r[0]]=g[r[0]]||[]).push(r[3]));return Object.keys(g).map(k=>k+' → R ≈ '+avg(g[k]).toFixed(2)+' Ω').join('   ·   ')}};

const XW={4.2:'Wire A',6.8:'Wire B',2.5:'Wire C'};
S.meterBridge={title:'Metre Bridge — Unknown Resistance',topic:'elec',grades:[12],
aim:'Find the resistance of a given wire using a metre bridge (Wheatstone bridge principle) and hence its resistivity.',
apparatus:['Metre bridge','Resistance box','Unknown wire (X)','Galvanometer (centre-zero)','Jockey, cell, key'],
formula:'R / X = l / (100 − l)      X = R (100 − l) / l',
procedure:['Choose a value R from the resistance box.','Slide the jockey along the wire (drag it) while watching the galvanometer.','Find the null point where the deflection is zero.','Record l; repeat with 3 values of R.','Compute X for each and take the mean.'],
controls:[{k:'Rk',label:'Resistance box R',type:'select',def:5,options:[[2,'2 Ω'],[3,'3 Ω'],[5,'5 Ω'],[8,'8 Ω']]},{k:'X',label:'Unknown resistance',type:'select',def:4.2,options:[[4.2,'Wire A'],[6.8,'Wire B'],[2.5,'Wire C']]},{k:'l',label:'Jockey position l',type:'range',min:1,max:99,step:0.1,def:30,unit:'cm'}],
init(){return{g:0}},
dev(p){const l0=100*p.Rk/(p.Rk+p.X);return cl((p.l-l0)*1.4,-30,30)},
step(s,p,dt){s.g+=(this.dev(p)-s.g)*Math.min(1,dt*8)},
pointer(s,p,x,y,ph){const xj=100+p.l*8;if(ph==='down')s.drag=Math.abs(x-xj)<40&&y>300;if(ph==='up')s.drag=false;if(!s.drag)return null;return{l:Math.round(cl((x-100)/8,1,99)*10)/10}},
draw(c,s,p){room(c,false);c.save();c.shadowColor='rgba(0,0,0,0.5)';c.shadowBlur=24;RR(c,60,170,880,280,10,G(c,0,170,0,450,['#8a633f','#5a3d25']));c.restore();
const cs='#e0a150';[[[100,390],[100,236],[330,236]],[[430,236],[570,236]],[[670,236],[900,236],[900,390]]].forEach(pt=>wire(c,pt,cs,12));
RR(c,335,196,90,64,6,'#15181d','#3a4050');for(let i=0;i<4;i++)ball(c,350+i*20,214,6,'#e5e9ee','#5b6370');T(c,'R = '+p.Rk+' Ω',380,248,{a:'center',s:12,w:600,m:1,c:C.amber});
c.strokeStyle='#c07a3a';c.lineWidth=3;c.beginPath();c.moveTo(570,236);for(let i=0;i<=10;i++)c.lineTo(580+i*8,236+(i%2?-10:10));c.lineTo(670,236);c.stroke();T(c,'X ('+XW[p.X]+')',620,272,{a:'center',s:12,w:600,c:C.ink});
L(c,100,390,900,390,'#dfe6ee',2.5);RR(c,96,398,808,30,3,'#efe6c8');for(let cm=0;cm<=100;cm++){const x=100+cm*8;L(c,x,398,x,398+(cm%10?(cm%5?5:9):13),'#3b3325',1);if(cm%10===0)T(c,cm+'',x,424,{a:'center',s:10,m:1,c:'#3b3325'})}
T(c,'A',84,396,{s:14,w:700});T(c,'C',908,396,{s:14,w:700});T(c,'B',500,224,{a:'center',s:14,w:700});
wire(c,[[500,236],[500,150]],'#d9964a',3);meter(c,500,92,48,s.g,-30,30,'G',C.rose,s.g.toFixed(1)+' div');
const xj=100+p.l*8;c.beginPath();c.moveTo(548,120);c.bezierCurveTo(640,150,xj+60,300,xj,330);c.strokeStyle='#c0392b';c.lineWidth=3;c.stroke();P(c,[[xj-14,316],[xj+14,316],[xj+5,346],[xj,392],[xj-5,346]],G(c,xj-14,0,xj+14,0,['#6d7888','#e5e9ee','#6d7888']),'#3b4451');RR(c,xj-16,300,32,18,4,'#2b323c');
wire(c,[[100,450],[100,500],[370,500]],'#d9964a',3);wire(c,[[630,500],[900,500],[900,450]],'#d9964a',3);RR(c,370,484,110,32,6,'#2b323c');T(c,'Cell  2 V',425,505,{a:'center',s:12,m:1});plugKey(c,570,500,true);
T(c,'l = '+p.l.toFixed(1)+' cm',xj,286,{a:'center',s:15,w:600,m:1,c:C.lime});hint(c,'Drag the jockey along the wire to find the null point');},
readings(s,p){return[['Balancing length l',p.l.toFixed(1),'cm'],['100 − l',(100-p.l).toFixed(1),'cm'],['Galvanometer',s.g.toFixed(1),'div'],['R (box)',p.Rk,'Ω']]},
columns:['Wire','R (Ω)','l (cm)','100 − l (cm)','X (Ω)'],
record(s,p){if(Math.abs(this.dev(p))>0.5)return{error:'Galvanometer must read zero (null point) before recording.'};return[XW[p.X],p.Rk,p.l,+(100-p.l).toFixed(1),+(p.Rk*(100-p.l)/p.l).toFixed(2)]},
result(rows){const g={};rows.forEach(r=>(g[r[0]]=g[r[0]]||[]).push(r[4]));return Object.keys(g).map(k=>k+': X ≈ '+avg(g[k]).toFixed(2)+' Ω').join('   ·   ')}};

const Ifw=V=>1e-5*(Math.exp(V/0.052)-1),Irv=V=>1+0.08*V;
S.diode={title:'P–N Junction Diode Characteristics',topic:'elec',grades:[12],
aim:'Draw the I–V characteristic curves of a p–n junction diode in forward and reverse bias.',
apparatus:['Silicon p–n junction diode','Battery & potential divider','Milliammeter / microammeter','Voltmeter','Key, wires'],
formula:'Forward: I rises sharply after the knee (~0.6–0.7 V)      Reverse: tiny saturation current (µA)',
procedure:['Connect the diode in forward bias.','Increase V in small steps with the potential divider.','Record V and I (mA) at each step.','Switch to reverse bias; record V and I (µA).','Plot I against V for both.'],
controls:[{k:'bias',label:'Bias',type:'select',def:'f',options:[['f','Forward'],['r','Reverse']]},{k:'v',label:'Potential divider',type:'range',min:0,max:100,step:2,def:0,unit:'%'}],
init(){return{ph:0}},
vi(p){if(p.bias==='f'){const V=0.82*p.v/100;return{V,I:Ifw(V),u:'mA'}}const V=20*p.v/100;return{V,I:V>0?Irv(V):0,u:'µA'}},
step(s,p,dt){const v=this.vi(p);s.ph+=(p.bias==='f'?Math.min(v.I,80)/80:v.I/20)*150*dt},
pointer(s,p,x,y,ph){if(ph==='down')s.drag=x>90&&x<200&&y>130&&y<350;if(ph==='up')s.drag=false;if(!s.drag)return null;return{v:Math.round(cl((y-150)/180*100,0,100)/2)*2}},
draw(c,s,p){board(c);const v=this.vi(p),f=p.bias==='f';wire(c,[...LOOP,LOOP[0]]);wire(c,[[430,360],[430,488],[437,488]]);wire(c,[[570,360],[570,488],[563,488]]);if(v.I>0.05)electrons(c,LOOP,s.ph,44);
RR(c,160,90,280,40,4,'#152131');cells(c,300,110,f?1:4);rheo(c,140,150,330,p.v/100,'Potential divider');
RR(c,462,346,76,28,12,'#1e1f24','#3a3d45');c.fillStyle='#d5dbe3';c.fillRect(f?516:474,346,9,28);T(c,f?'Diode — forward bias':'Diode — reverse bias',500,396,{a:'center',s:13,w:600,c:C.ink});
meter(c,860,245,58,f?v.I:v.I,0,f?100:5,f?'mA':'µA',C.amber,(f?v.I.toFixed(2):v.I.toFixed(2))+' '+v.u);meter(c,500,478,48,v.V,0,f?1:20,'V',C.lime,v.V.toFixed(f?3:1)+' V');
const ox=495,oy=282;RR(c,245,142,500,180,8,'rgba(10,16,24,0.7)','#2a3a50');L(c,255,oy,735,oy,'#5a6a80',1);L(c,ox,150,ox,314,'#5a6a80',1);T(c,'I',ox+6,160,{s:12,c:C.dim});T(c,'V',728,oy-6,{s:12,c:C.dim});T(c,'reverse (µA)',262,oy+22,{s:11,c:C.dim});T(c,'forward (mA)',730,oy+22,{a:'right',s:11,c:C.dim});
c.beginPath();for(let V=0;V<=0.82;V+=0.01)c.lineTo(ox+V/0.82*235,oy-Math.min(Ifw(V),100)/100*128);c.strokeStyle='rgba(182,243,92,0.35)';c.lineWidth=2;c.stroke();c.beginPath();for(let V=0;V<=20;V+=0.5)c.lineTo(ox-V/20*235,oy+(V>0?Irv(V):0)*5);c.stroke();
const dx=f?ox+v.V/0.82*235:ox-v.V/20*235,dy=f?oy-Math.min(v.I,100)/100*128:oy+v.I*5;c.beginPath();c.arc(dx,dy,6,0,7);c.fillStyle=C.lime;c.fill();hint(c,'Drag the potential-divider slider to change the applied voltage');},
readings(s,p){const v=this.vi(p);return[['Bias',p.bias==='f'?'Forward':'Reverse',''],['Voltage V',v.V.toFixed(p.bias==='f'?3:1),'V'],['Current I',v.I.toFixed(p.bias==='f'?2:2),v.u]]},
columns:['Bias','V (V)','I (mA)'],record(s,p){const v=this.vi(p),f=p.bias==='f';return[f?'Fwd':'Rev',+(f?v.V:-v.V).toFixed(3),+(f?v.I:-v.I/1000).toFixed(f?2:4)]},plot:{x:1,y:2,fit:false},
result(rows){const f=rows.filter(r=>r[0]==='Fwd'&&r[2]>=1).sort((a,b)=>a[1]-b[1]);return f.length?'Knee voltage ≈ '+f[0][1].toFixed(2)+' V (current rises sharply beyond this).':'Record forward readings above 0.6 V to find the knee.'}};

const MAT={cu:['Copper wire',1,'#e0a150'],al:['Aluminium foil',0.95,'#d7dde5'],fe:['Iron nail',0.85,'#8e98a6'],gr:['Pencil lead',0.4,'#3a3a3a'],sw:['Salt water',0.3,'#6ac6e8'],rb:['Rubber band',0,'#c89060'],wd:['Wooden stick',0,'#9a6a3a'],pl:['Plastic scale',0,'#6fa8ff'],gl:['Glass rod',0,'#bfe6f2']};
S.conductors={title:'Conductors & Insulators',topic:'elec',grades:[6,7],
aim:'Test which materials allow electric current to pass through them using a simple circuit with a bulb.',
apparatus:['Electric cell','Torch bulb with holder','Switch','Connecting wires with clips','Test materials'],
formula:'Bulb glows → conductor      Bulb does not glow → insulator',
procedure:['Make the circuit with a gap between the two clips.','Place a material in the gap.','Close the switch (tap it) and watch the bulb.','Record whether the bulb glows.','Repeat for all materials and classify them.'],
controls:[{k:'mat',label:'Material in the gap',type:'select',def:'cu',options:Object.keys(MAT).map(k=>[k,MAT[k][0]])},{k:'sw',label:'Switch',type:'toggle',def:false}],
init(){return{ph:0}},
b(p){return p.sw?MAT[p.mat][1]:0},
step(s,p,dt){s.ph+=this.b(p)*120*dt},
pointer(s,p,x,y,ph){if(ph==='down'&&Math.hypot(x-820,y-275)<55)return{sw:!p.sw};return null},
draw(c,s,p,t){board(c);const b=this.b(p),m=MAT[p.mat],lp=[[160,130],[820,130],[820,420],[160,420]];
wire(c,[[300,420],[420,420]]);wire(c,[[580,420],[820,420],[820,310]]);wire(c,[[820,240],[820,130],[160,130],[160,420],[165,420]]);if(b>0)electrons(c,lp,s.ph,36);
RR(c,160,396,140,48,10,G(c,0,396,0,444,['#e9504f','#8a1d1d']),'#4a0f0f');RR(c,160,396,40,48,[10,0,0,10],G(c,0,396,0,444,['#3a3f47','#15181c']));RR(c,300,410,8,20,2,'#c9d1db');T(c,'CELL 1.5 V',240,425,{a:'center',s:12,w:700});T(c,'+',290,390,{s:16,w:700,c:C.rose});
RR(c,470,120,60,30,4,'#2b323c');if(b>0){const r=60+170*b,g=c.createRadialGradient(500,82,10,500,82,r);g.addColorStop(0,'rgba(255,230,140,'+(0.9*b)+')');g.addColorStop(1,'rgba(255,230,140,0)');c.fillStyle=g;c.beginPath();c.arc(500,82,r,0,7);c.fill()}c.beginPath();c.arc(500,82,36,0,7);c.fillStyle=b>0?'rgba(255,245,200,'+(0.3+0.6*b)+')':'rgba(220,235,245,0.18)';c.fill();c.strokeStyle='rgba(220,235,245,0.6)';c.lineWidth=2;c.stroke();c.beginPath();c.moveTo(490,118);c.lineTo(492,90);for(let i=0;i<6;i++)c.lineTo(492+i*3.2,84+(i%2?-5:5));c.lineTo(510,90);c.lineTo(510,118);c.strokeStyle=b>0?'#fff3b0':'#8792a3';c.lineWidth=1.8;c.stroke();
RR(c,790,240,60,70,6,'#20262f','#3a4658');const la=p.sw?0:-0.7;c.save();c.translate(806,300);c.rotate(la);RR(c,0,-5,52,10,3,'#c9d1db');c.restore();ball(c,806,300,6,'#e5e9ee','#5b6370');ball(c,842,300,5,'#f3cf7a','#a0761e');T(c,p.sw?'Switch ON':'Switch OFF — tap',820,334,{a:'center',s:12,c:p.sw?C.lime:C.amber});
RR(c,410,410,20,20,3,'#c0392b');RR(c,570,410,20,20,3,'#1d1d1d');
const k=p.mat;if(k==='sw'){RR(c,440,380,120,70,[4,4,12,12],'rgba(106,198,232,0.35)','rgba(220,235,245,0.6)',2);L(c,430,420,470,400,'#aab4c1',3);L(c,570,420,530,400,'#aab4c1',3)}
else if(k==='cu'){c.beginPath();c.moveTo(430,420);c.bezierCurveTo(470,400,530,440,570,420);c.strokeStyle=m[2];c.lineWidth=4;c.stroke()}
else if(k==='al'){P(c,[[428,410],[470,406],[500,414],[540,404],[572,410],[570,430],[520,434],[480,428],[430,432]],G(c,0,404,0,434,['#f2f5f8','#9aa4b0']))}
else if(k==='fe'){RR(c,430,415,130,10,2,G(c,0,415,0,425,['#c9d1db','#6d7888']));RR(c,558,408,8,24,2,'#8e98a6')}
else if(k==='gr'){RR(c,440,410,120,20,2,'#f2c14e');RR(c,428,416,14,8,1,'#333');RR(c,558,416,14,8,1,'#333')}
else if(k==='rb'){c.beginPath();c.ellipse(500,420,72,10,0,0,7);c.strokeStyle=m[2];c.lineWidth=5;c.stroke()}
else{RR(c,428,412,144,16,3,k==='gl'?'rgba(191,230,242,0.6)':m[2],'rgba(0,0,0,0.3)');if(k==='pl')for(let x=434;x<568;x+=6)L(c,x,412,x,418,'#1d2733',1)}
T(c,m[0],500,480,{a:'center',s:17,w:600,c:C.ink});T(c,p.sw?(b>0.6?'Bulb glows brightly':b>0?'Bulb glows dimly':'Bulb does not glow'):'',500,506,{a:'center',s:14,c:b>0?C.amber:C.dim});},
readings(s,p){const b=this.b(p);return[['Material',MAT[p.mat][0],''],['Circuit',p.sw?'Closed':'Open',''],['Bulb',!p.sw?'Off':b>0.6?'Bright':b>0?'Dim':'No glow','']]},
columns:['Material','Bulb','Type'],record(s,p){if(!p.sw)return{error:'Close the switch first.'};const b=this.b(p);return[MAT[p.mat][0],b>0.6?'Glows':b>0?'Glows dimly':'No glow',b>0?'Conductor':'Insulator']},
result(rows){const c1=rows.filter(r=>r[2]==='Conductor').map(r=>r[0]),i1=rows.filter(r=>r[2]==='Insulator').map(r=>r[0]);return(c1.length?'Conductors: '+[...new Set(c1)].join(', '):'')+(i1.length?'   ·   Insulators: '+[...new Set(i1)].join(', '):'')}};

function Bf(poles,x,y){let bx=0,by=0;for(const q of poles){const dx=x-q.x,dy=y-q.y,r2=dx*dx+dy*dy+120,r3=r2*Math.sqrt(r2);bx+=q.q*dx/r3;by+=q.q*dy/r3}return[bx,by]}
S.magnet={title:'Magnetic Field Lines of a Bar Magnet',topic:'mag',grades:[6,10,12],
aim:'Map the magnetic field around a bar magnet (and pairs of magnets) using a compass and iron filings.',
apparatus:['Bar magnets','Magnetic compass','Iron filings','Drawing board & sheet'],
formula:'Field lines leave N and enter S; they never cross. Closer lines → stronger field.',
procedure:['Place the magnet at the centre of the sheet.','Sprinkle iron filings and tap the board — watch the pattern.','Move the compass (drag on the sheet) and note the needle direction.','Try two magnets with like and unlike poles facing.','Sketch the field lines in your notebook.'],
controls:[{k:'mode',label:'Show with',type:'select',def:'filings',options:[['filings','Iron filings'],['compass','Compasses'],['lines','Field lines']]},{k:'setup',label:'Arrangement',type:'select',def:'single',options:[['single','One magnet'],['like','N facing N'],['unlike','N facing S']]}],
init(){let sd=7;const rnd=()=>(sd=(sd*16807)%2147483647)/2147483647;const pts=[];for(let i=0;i<2600;i++)pts.push([120+rnd()*760,34+rnd()*492]);return{m1:{x:500,y:280},m2:{x:680,y:280},probe:{x:500,y:130},pts}},
onChange(s,p,k){if(k==='setup'){if(p.setup==='single')s.m1={x:500,y:280};else{s.m1={x:330,y:280};s.m2={x:670,y:280}}}},
mags(s,p){const a=[{x:s.m1.x,y:s.m1.y,d:1}];if(p.setup!=='single')a.push({x:s.m2.x,y:s.m2.y,d:p.setup==='like'?-1:1});return a},
poles(s,p){const o=[];this.mags(s,p).forEach(m=>{o.push({x:m.x+m.d*62,y:m.y,q:1},{x:m.x-m.d*62,y:m.y,q:-1})});return o},
pointer(s,p,x,y,ph){const inM=m=>Math.abs(x-m.x)<80&&Math.abs(y-m.y)<26;if(ph==='down'){s.drag=inM(s.m1)?'m1':(p.setup!=='single'&&inM(s.m2))?'m2':'probe';s.ox=x-(s.drag==='probe'?x:s[s.drag].x);s.oy=y-(s.drag==='probe'?y:s[s.drag].y)}if(ph==='up'){s.drag=null;return null}if(!s.drag)return null;const t=s[s.drag];t.x=cl(x-s.ox,190,810);t.y=cl(y-s.oy,60,500);return null},
draw(c,s,p){paper(c);const po=this.poles(s,p),ms=this.mags(s,p),inside=(x,y)=>ms.some(m=>Math.abs(x-m.x)<78&&Math.abs(y-m.y)<22);
if(p.mode==='filings'){c.lineCap='round';for(const [x,y] of s.pts){if(inside(x,y))continue;const b=Bf(po,x,y),m=Math.hypot(b[0],b[1]),a=cl(m*9000,0.12,0.95),ux=b[0]/m*4.5,uy=b[1]/m*4.5;c.strokeStyle='rgba(40,40,46,'+a+')';c.lineWidth=1.4;c.beginPath();c.moveTo(x-ux,y-uy);c.lineTo(x+ux,y+uy);c.stroke()}}
else if(p.mode==='compass'){for(let x=145;x<880;x+=50)for(let y=55;y<520;y+=50){if(inside(x,y))continue;const b=Bf(po,x,y),a=Math.atan2(b[1],b[0]);c.beginPath();c.arc(x,y,15,0,7);c.fillStyle='rgba(255,255,255,0.8)';c.fill();c.strokeStyle='rgba(29,39,51,0.35)';c.lineWidth=1;c.stroke();c.save();c.translate(x,y);c.rotate(a);P(c,[[13,0],[0,-3.5],[0,3.5]],'#d62839');P(c,[[-13,0],[0,-3.5],[0,3.5]],'#4a5566');c.restore()}}
else{c.lineWidth=1.5;for(const q of po){if(q.q<0)continue;for(let k=0;k<16;k++){const a0=k/16*2*Math.PI;let x=q.x+Math.cos(a0)*10,y=q.y+Math.sin(a0)*10,mid=null;c.beginPath();c.moveTo(x,y);for(let i=0;i<500;i++){const b=Bf(po,x,y),m=Math.hypot(b[0],b[1])||1;x+=b[0]/m*4;y+=b[1]/m*4;c.lineTo(x,y);if(i===45)mid=[x,y,Math.atan2(b[1],b[0])];if(x<110||x>890||y<24||y>536)break;if(po.some(o=>o.q<0&&Math.hypot(o.x-x,o.y-y)<8))break}c.strokeStyle='rgba(190,30,60,0.75)';c.stroke();if(mid)head(c,mid[0],mid[1],mid[2],'rgba(190,30,60,0.9)',9)}}}
ms.forEach(m=>{c.save();c.shadowColor='rgba(0,0,0,0.35)';c.shadowBlur=10;c.shadowOffsetY=4;RR(c,m.x-75,m.y-20,150,40,4,'#555');c.restore();const nL=m.d<0;RR(c,m.x-75,m.y-20,75,40,[4,0,0,4],G(c,0,m.y-20,0,m.y+20,nL?['#ff6b6b','#b3261e']:['#6f9bff','#2344a8']));RR(c,m.x,m.y-20,75,40,[0,4,4,0],G(c,0,m.y-20,0,m.y+20,nL?['#6f9bff','#2344a8']:['#ff6b6b','#b3261e']));T(c,nL?'N':'S',m.x-40,m.y+7,{a:'center',s:20,w:700});T(c,nL?'S':'N',m.x+40,m.y+7,{a:'center',s:20,w:700})});
const pr=s.probe,b=Bf(po,pr.x,pr.y),a=Math.atan2(b[1],b[0]);c.beginPath();c.arc(pr.x,pr.y,34,0,7);c.fillStyle=G(c,0,pr.y-34,0,pr.y+34,['#e5e9ee','#8792a3']);c.fill();c.beginPath();c.arc(pr.x,pr.y,28,0,7);c.fillStyle='#fbfaf6';c.fill();c.save();c.translate(pr.x,pr.y);c.rotate(a);P(c,[[25,0],[0,-5],[0,5]],'#d62839');P(c,[[-25,0],[0,-5],[0,5]],'#4a5566');c.restore();c.beginPath();c.arc(pr.x,pr.y,3,0,7);c.fillStyle='#1d2733';c.fill();
hint(c,'Drag a magnet to move it · drag anywhere else to move the compass',true);},
readings(s,p){const b=Bf(this.poles(s,p),s.probe.x,s.probe.y),m=Math.hypot(b[0],b[1]);let a=Math.round(-Math.atan2(b[1],b[0])/R);if(a<0)a+=360;return[['Field strength (relative)',(m*1e5).toFixed(1),''],['Compass N points',a,'°'],['Arrangement',{single:'One magnet',like:'Like poles',unlike:'Unlike poles'}[p.setup],'']]},
note:'Observation activity — sketch the field pattern for each arrangement. Note the neutral point between like poles, where the compass shows no preferred direction.'};

S.induction={title:'Electromagnetic Induction',topic:'mag',grades:[10,12],
aim:'Show that a changing magnetic field through a coil induces a current, and study how its direction and size depend on motion, pole and number of turns.',
apparatus:['Coil of insulated copper wire','Bar magnet','Centre-zero galvanometer','Connecting wires'],
formula:'e = − N dΦ/dt   (Faraday & Lenz)',
procedure:['Connect the coil to the galvanometer.','Push the magnet into the coil (drag it) — note the deflection.','Hold it still — note the reading. Pull it out — note the direction.','Move it faster; change the pole facing the coil; change turns.','Record each case.'],
controls:[{k:'turns',label:'Turns in coil',type:'select',def:100,options:[[50,'50'],[100,'100'],[200,'200']]},{k:'pol',label:'Pole facing coil',type:'select',def:'N',options:[['N','North'],['S','South']]}],
init(){return{mx:300,prevPhi:null,g:0,peak:0,peakT:0,time:0,auto:false,v:0,px:300,mot:'—'}},
actions:[{label:'Auto push & pull',run(s){s.auto=!s.auto;s.t0=s.time}}],
phi(mx){const mc=mx-95;return 1/(1+Math.pow((680-mc)/80,2))},
step(s,p,dt){s.time+=dt;if(s.auto&&!s.drag)s.mx=445+245*Math.sin((s.time-s.t0)*1.8-1.57);const ph=this.phi(s.mx);if(s.prevPhi==null)s.prevPhi=ph;const dphi=(ph-s.prevPhi)/Math.max(dt,1e-3);s.prevPhi=ph;s.v=(s.mx-s.px)/Math.max(dt,1e-3);s.px=s.mx;const tgt=cl(-dphi*2.2*(p.turns/100)*(p.pol==='N'?1:-1)*1.8,-10,10);s.g+=(tgt-s.g)*Math.min(1,dt*10);if(Math.abs(s.g)>Math.abs(s.peak)||s.time-s.peakT>2){if(Math.abs(s.g)>0.2){s.peak=s.g;s.peakT=s.time;s.mot=s.v>0?'Pushed in':'Pulled out'}else if(s.time-s.peakT>2)s.peak=0}},
pointer(s,p,x,y,ph){if(ph==='down'&&x>s.mx-200&&x<s.mx+20&&Math.abs(y-300)<40){s.drag=true;s.auto=false;s.off=x-s.mx}if(ph==='up')s.drag=false;if(s.drag)s.mx=cl(x-s.off,200,700);return null},
draw(c,s,p){room(c);const cx0=570,cx1=790,ay=300,r=58,n=Math.min(30,p.turns/6);
wire(c,[[574,244],[574,150],[625,150],[625,133]],'#d9964a',3);wire(c,[[786,244],[786,150],[735,150],[735,133]],'#d9964a',3);meter(c,680,88,55,s.g,-10,10,'G',C.rose,s.g.toFixed(1)+' div');
RR(c,cx0,ay-r,cx1-cx0,2*r,4,'rgba(200,210,220,0.08)');for(let i=0;i<=n;i++){const x=cx0+6+i*(cx1-cx0-12)/n;L(c,x+5,ay-r,x,ay+r,'rgba(140,80,30,0.8)',3)}
shadowE(c,s.mx-95,468,100);const N=p.pol==='N',mx=s.mx;RR(c,mx-190,ay-22,95,44,[4,0,0,4],G(c,0,ay-22,0,ay+22,N?['#6f9bff','#2344a8']:['#ff6b6b','#b3261e']));RR(c,mx-95,ay-22,95,44,[0,4,4,0],G(c,0,ay-22,0,ay+22,N?['#ff6b6b','#b3261e']:['#6f9bff','#2344a8']));T(c,N?'S':'N',mx-142,ay+8,{a:'center',s:22,w:700});T(c,N?'N':'S',mx-48,ay+8,{a:'center',s:22,w:700});
for(let i=0;i<=n;i++){const x=cx0+6+i*(cx1-cx0-12)/n;L(c,x,ay-r,x+5,ay+r,'rgba(230,160,80,0.85)',3)}c.beginPath();c.ellipse(cx0,ay,12,r,0,0,7);c.strokeStyle='rgba(220,235,245,0.4)';c.lineWidth=2;c.stroke();c.beginPath();c.ellipse(cx1,ay,12,r,0,0,7);c.stroke();
RR(c,cx0,ay+r+8,cx1-cx0,8,2,'#3f4958');T(c,p.turns+' turns',680,ay+r+36,{a:'center',s:14,w:600,c:C.amber});
const sp=Math.abs(s.v);if(sp>30)ray(c,mx-95,ay-44,mx-95+(s.v>0?70:-70),ay-44,C.cyan,2.5);
T(c,Math.abs(s.g)<0.3?'No induced current':(s.g>0?'Current →  (deflection right)':'←  Current (deflection left)'),200,120,{s:18,w:600,c:Math.abs(s.g)<0.3?C.dim:C.rose});
hint(c,'Drag the magnet into and out of the coil — or tap “Auto push & pull”');},
readings(s,p){return[['Galvanometer',s.g.toFixed(1),'div'],['Magnet speed',(Math.abs(s.v)/10).toFixed(0),'cm/s'],['Peak deflection',s.peak.toFixed(1),'div']]},
columns:['Pole facing coil','Turns','Motion','Peak deflection (div)'],
record(s,p){if(Math.abs(s.peak)<0.3)return{error:'Move the magnet first — no deflection seen yet.'};const r=[p.pol==='N'?'North':'South',p.turns,s.mot,+s.peak.toFixed(1)];s.peak=0;return r},
result(rows){return rows.length?'Deflection only while the magnet moves; direction reverses with motion or pole; larger with more turns and faster motion.':''}};

window.LabKit2={board,cells,plugKey,rheo,resistor,wire,electrons,pin,isect,candle};window.LabParts=(window.LabParts||0)+1;
})();


/* 39a46e6c-0044-4bf1-921e-c0a60dcbeb04 */
(function(){
const K=window.LabKit;const {W,H,R,C,T,L,P,RR,G,ball,head,ray,arc,room,paper,stand,meter,watch,cl,avg,shadowE,hint}=K;
const K2=window.LabKit2,K3=window.LabKit3;const S=window.LabSims;
function tone(s,on,f,g){try{if(on&&!s.ac){const A=window.AudioContext||window.webkitAudioContext;s.ac=new A();s.osc=s.ac.createOscillator();s.gn=s.ac.createGain();s.gn.gain.value=0;s.osc.connect(s.gn).connect(s.ac.destination);s.osc.start()}if(s.ac){if(on)s.ac.resume();s.osc.frequency.value=f;s.gn.gain.setTargetAtTime(on?g:0,s.ac.currentTime,0.03)}}catch(e){}}
function untone(s){try{s.osc&&s.osc.stop();s.ac&&s.ac.close()}catch(e){}s.ac=null}
function rbox(c,x,y,lab){RR(c,x-80,y-24,160,48,6,'#15181d','#3a4050');for(let i=0;i<5;i++)ball(c,x-56+i*28,y-4,7,'#f3cf7a','#8a6a1a');T(c,lab,x,y+42,{a:'center',s:13,w:600,m:1,c:C.amber})}
function tap(c,x,y,on,lab){RR(c,x-44,y-20,88,40,7,'#20262f','#3a4658');RR(c,x-36,y-12,30,24,3,G(c,0,y-12,0,y+12,['#f3cf7a','#a0761e']));RR(c,x+6,y-12,30,24,3,G(c,0,y-12,0,y+12,['#f3cf7a','#a0761e']));if(on)ball(c,x,y-4,12,'#555c66','#0b0d10');else ball(c,x+34,y-38,12,'#555c66','#0b0d10');T(c,lab+(on?' closed':' open — tap'),x,y+36,{a:'center',s:12,c:on?C.lime:C.amber})}

S.sonometer={title:'Sonometer — Frequency & Length',topic:'sound',grades:[11,12],
aim:'Study how the resonant length of a stretched wire depends on frequency (law of length) and on tension.',
apparatus:['Sonometer box with bridges','Steel wire, pulley & hanger','Slotted kg weights','Tuning forks (256–512 Hz)','Paper rider'],
formula:'f = (1 / 2l) √(T / μ)      f × l = constant (T fixed)      l ∝ √T (f fixed)',
procedure:['Hang a load to set the tension; place the paper rider in the middle of the wire.','Tap “Strike fork & place on box”.','Move the bridge (drag it) until the rider flutters and falls — resonance.','Record l; repeat for each tuning fork, then for other loads.','Check f × l is constant; plot l against 1/f.'],
controls:[{k:'f',label:'Tuning fork',type:'select',def:256,options:[[256,'256'],[288,'288'],[320,'320'],[384,'384'],[480,'480'],[512,'512']]},{k:'m',label:'Load (tension)',type:'select',def:2,options:[[1,'1 kg'],[2,'2 kg'],[3,'3 kg'],[4,'4 kg']]},{k:'l',label:'Vibrating length l',type:'range',min:10,max:60,step:0.1,def:40,unit:'cm'},{k:'snd',label:'Sound',type:'toggle',def:true}],
init(){return{time:0,strike:null,res:0,amp:0,dec:0,off:false,ry:0}},
fs(p){return Math.sqrt(p.m*9.8/0.001)/(2*p.l/100)},
actions:[{label:'Strike fork & place on box',run(s,p){s.strike=s.time;s.off=false;s.ry=0;if(p.snd)tone(s,true,p.f,0)}}],
onChange(s,p,k){if(k!=='snd'){s.off=false;s.ry=0}},dispose(s){untone(s)},
step(s,p,dt){s.time+=dt;s.dec=s.strike==null?0:Math.exp(-(s.time-s.strike)/5);s.res=Math.exp(-Math.pow((this.fs(p)-p.f)/(p.f*0.012),2));s.amp=s.dec*s.res;if(s.amp>0.5&&!s.off)s.off=true;if(s.off)s.ry=Math.min(1,s.ry+dt*1.4);if(s.ac)tone(s,p.snd,p.f,0.15*s.dec*(0.15+0.85*s.res))},
pointer(s,p,x,y,ph){const xb=150+p.l*12;if(ph==='down')s.drag=Math.abs(x-xb)<40&&y>250&&y<360;if(ph==='up')s.drag=false;if(!s.drag)return null;return{l:Math.round(cl((x-150)/12,10,60)*10)/10}},
draw(c,s,p,t){room(c);const y=300,xa=150,xb=150+p.l*12;RR(c,90,330,820,110,6,G(c,0,330,0,440,['#b98147','#6b4a2a']),'#3b2614');[300,700].forEach(x=>{c.beginPath();c.arc(x,385,18,0,7);c.fillStyle='#2a1d12';c.fill()});
for(let cm=0;cm<=60;cm++){const x=xa+cm*12;L(c,x,330,x,330+(cm%10?(cm%5?5:9):14),'#2a1d12',1);if(cm%10===0)T(c,cm+'',x,356,{a:'center',s:10,m:1,c:'#2a1d12'})}
RR(c,96,y-8,14,40,3,'#3f4958');ball(c,930,y+14,16,'#d5dbe3','#4a5566');
L(c,103,y,xa,y,'#dfe6ee',1.6);L(c,xb,y,930,y-2,'#dfe6ee',1.6);L(c,946,y+14,946,380,'#dfe6ee',1.6);for(let i=0;i<p.m;i++)RR(c,926,380+i*16,40,14,3,G(c,926,0,966,0,['#4b525c','#aab4c1','#4b525c']));
c.beginPath();for(let x=xa;x<=xb;x+=4)c.lineTo(x,y+s.amp*14*Math.sin(Math.PI*(x-xa)/(xb-xa))*Math.sin(t*50));c.strokeStyle='#eef3f8';c.lineWidth=1.8;c.stroke();
[xa,xb].forEach((x,i)=>P(c,[[x,y-2],[x-12,330],[x+12,330]],i?'#c9d1db':'#8792a3','#3b4451'));
const mx=(xa+xb)/2;if(!s.off){const j=s.amp*5*Math.sin(t*60);P(c,[[mx-9,y+2+j],[mx,y-10+j],[mx+9,y+2+j]],'#ff6b9a')}else{const fy=y-10-60*Math.sin(Math.PI*Math.min(1,s.ry*1.6))+s.ry*30;P(c,[[mx+30*s.ry-9,fy+12],[mx+30*s.ry,fy],[mx+30*s.ry+9,fy+12]],'#ff6b9a')}
const v=3*s.dec*Math.sin(t*70);RR(c,795,300,8,30,2,'#aab4c1');RR(c,785,280,28,8,3,'#aab4c1');RR(c,785-v,230,7,52,2,'#cfd6df');RR(c,806+v,230,7,52,2,'#cfd6df');T(c,p.f+' Hz',830,250,{s:14,w:600,m:1,c:C.violet});
T(c,'l = '+p.l.toFixed(1)+' cm',mx,y-30,{a:'center',s:16,w:600,m:1,c:C.cyan});T(c,p.m+' kg',946,380+p.m*16+18,{a:'center',s:13,w:600,c:C.amber});
T(c,s.off?'RESONANCE — rider thrown off':s.res>0.5&&s.dec>0.05?'Rider fluttering…':'',500,90,{a:'center',s:20,w:700,c:C.rose});if(s.strike==null)hint(c,'Strike the fork, then drag the movable bridge');},
readings(s,p){return[['Fork frequency',p.f,'Hz'],['Length l',p.l.toFixed(1),'cm'],['f × l',(p.f*p.l/100).toFixed(1),'Hz·m'],['Resonance',Math.round(s.res*100),'%']]},
columns:['Load (kg)','f (Hz)','1/f (ms)','l (cm)','f × l (Hz·m)'],
record(s,p){if(s.res<0.8)return{error:'Not at resonance — move the bridge until the rider is thrown off.'};return[p.m,p.f,+(1000/p.f).toFixed(3),p.l,+(p.f*p.l/100).toFixed(1)]},plot:{x:2,y:3},
result(rows){const g={};rows.forEach(r=>(g[r[0]]=g[r[0]]||[]).push(r[4]));return Object.keys(g).map(k=>k+' kg: f×l ≈ '+avg(g[k]).toFixed(1)+' Hz·m (wave speed ≈ '+(2*avg(g[k])).toFixed(0)+' m/s)').join('   ·   ')}};

S.slinky={title:'Speed of a Pulse in a Slinky',topic:'sound',grades:[9],
aim:'Determine the speed of a pulse travelling along a stretched slinky.',
apparatus:['Slinky (long spring)','Stopwatch','Measuring tape','Smooth floor'],
formula:'v = distance ÷ time = (number of trips × L) ÷ t',
procedure:['Stretch the slinky to length L; the far end is held fixed.','Tap “Send pulse” — a sharp jerk at the free end.','The stopwatch counts trips as the pulse reflects back and forth.','After a few trips, record the trips and the time.','Repeat for other lengths and pulse types.'],
controls:[{k:'L',label:'Stretched length L',type:'select',def:4,options:[[3,'3 m'],[4,'4 m'],[5,'5 m']]},{k:'kind',label:'Pulse type',type:'select',def:'t',options:[['t','Transverse'],['l','Longitudinal']]}],
init(){return{run:false,d:0,t:0,tLast:0,n:0}},v(p){return 1.5*p.L},
actions:[{label:'Send pulse',run(s){Object.assign(s,{run:true,d:0,t:0,tLast:0,n:0})}}],
onChange(s){Object.assign(s,{run:false,d:0,t:0,tLast:0,n:0})},
step(s,p,dt){if(!s.run)return;s.t+=dt;s.d+=this.v(p)*dt;const n=Math.floor(s.d/p.L);if(n>s.n){s.n=n;s.tLast=s.t}if(s.n>=8)s.run=false},
draw(c,s,p,t){room(c);const x0=110,x1=890,y=300,N=150,seg=s.d/p.L,n=Math.floor(seg),f=seg-n,pos=n%2?1-f:f,sg=n%2?-1:1,amp=s.run?Math.pow(0.88,n):0;
RR(c,x1+4,200,20,200,3,'#3f4958');RR(c,x0-70,y-22,60,44,20,'#e2b48c','#a87553');
for(let i=0;i<=N;i++){const u=i/N,g=Math.exp(-Math.pow((u-pos)/0.045,2))*amp;let x=x0+u*(x1-x0),yy=y;if(p.kind==='t')yy=y-g*70*sg;else x+=g*22*sg*(n%2?-1:1)*Math.sign(u-pos||1)*-1;c.beginPath();c.ellipse(x,yy,3,20,0,0,7);c.strokeStyle=i%2?'#c9d3de':'#9aa6b6';c.lineWidth=1.4;c.stroke()}
L(c,x0,y+50,x1,y+50,'rgba(255,255,255,0.3)',1);T(c,'L = '+p.L+' m',(x0+x1)/2,y+70,{a:'center',s:15,w:600,c:C.amber});
watch(c,820,120,62,s.t);T(c,'Trips',660,90,{a:'center',s:13,c:C.dim});T(c,s.n+'',660,130,{a:'center',s:36,w:600,m:1,c:C.violet});if(!s.run&&s.n===0)hint(c,'Tap “Send pulse”');},
readings(s,p){return[['Length L',p.L,'m'],['Trips',s.n,''],['Time',s.tLast.toFixed(2),'s'],['Speed v',s.n?(s.n*p.L/s.tLast).toFixed(2):'—','m/s']]},
columns:['Pulse','L (m)','Trips','t (s)','v (m/s)'],
record(s,p){if(s.n<2)return{error:'Let the pulse make at least 2 trips.'};return[p.kind==='t'?'Transverse':'Longitudinal',p.L,s.n,+s.tLast.toFixed(2),+(s.n*p.L/s.tLast).toFixed(2)]},
result(rows){const g={};rows.forEach(r=>(g[r[1]+' m']=g[r[1]+' m']||[]).push(r[4]));return Object.keys(g).map(k=>'L = '+k+': v ≈ '+avg(g[k]).toFixed(2)+' m/s').join('   ·   ')}};

S.soundReflection={title:'Laws of Reflection of Sound',topic:'sound',grades:[9],
aim:'Verify that sound reflects from a hard surface with the angle of reflection equal to the angle of incidence.',
apparatus:['Two long tubes','Hard reflecting board','Ticking clock','Screen between tubes','Protractor'],
formula:'∠ i = ∠ r      (incident sound, normal and reflected sound in one plane)',
procedure:['Fix tube 1 at an angle ∠i to the normal with the clock at its end.','Listen through tube 2 and turn it (drag) until the ticking is loudest.','Read ∠r from the protractor.','Record; repeat for other angles of incidence.','Compare ∠i and ∠r.'],
controls:[{k:'i',label:'Tube 1 angle ∠i',type:'range',min:20,max:70,step:1,def:40,unit:'°'},{k:'r',label:'Tube 2 angle ∠r',type:'range',min:10,max:80,step:1,def:22,unit:'°'},{k:'scr',label:'Screen between tubes',type:'toggle',def:true}],
init(){return{}},loud(p){return Math.exp(-Math.pow((p.r-p.i)/4,2))*(p.scr?1:0.85)+(p.scr?0:0.15)},
pointer(s,p,x,y,ph){if(ph==='down')s.drag=x>505&&y>110;if(ph==='up')s.drag=false;if(!s.drag)return null;return{r:Math.round(cl(Math.atan2(x-500,y-100)/R,10,80))}},
draw(c,s,p,t){room(c,false);RR(c,40,20,920,520,14,'#1a2433');const O=[500,100],ld=this.loud(p);RR(c,240,60,520,30,4,G(c,0,60,0,90,['#aab4c1','#5b6677']));for(let x=250;x<760;x+=14)L(c,x,60,x-10,52,'#5b6677',1.5);T(c,'HARD BOARD',500,48,{a:'center',s:12,w:600,c:C.dim});
L(c,500,90,500,460,'rgba(255,255,255,0.35)',1.5,[8,6]);T(c,'normal',510,470,{s:12,c:C.dim});
c.beginPath();c.arc(500,100,120,0.15*Math.PI,0.85*Math.PI);c.strokeStyle='rgba(79,214,255,0.4)';c.lineWidth=1;c.stroke();for(let a=10;a<=80;a+=10)[1,-1].forEach(sg=>{const q=Math.PI/2-sg*a*R;L(c,500+Math.cos(q)*112,100+Math.sin(q)*112,500+Math.cos(q)*120,100+Math.sin(q)*120,'rgba(79,214,255,0.7)',1)});
const tube=(a,sg,col)=>{const ux=sg*Math.sin(a*R),uy=Math.cos(a*R),x1=500+ux*50,y1=100+uy*50,x2=500+ux*380,y2=100+uy*380;c.lineCap='round';L(c,x1,y1,x2,y2,'#3a4658',30);L(c,x1,y1,x2,y2,col,22);c.lineCap='butt';return[x2,y2,ux,uy]};
const e1=tube(p.i,-1,'#7a5a3e'),e2=tube(p.r,1,'#5a6e8a');
for(let k=0;k<4;k++){const f=((t*0.8+k/4)%1);const d1=380-f*330;c.beginPath();c.arc(500+e1[2]*d1,100+e1[3]*d1,10,0,7);c.strokeStyle='rgba(255,225,140,'+(0.8*(1-f*0.3))+')';c.lineWidth=2;c.stroke();const d2=50+f*330;c.beginPath();c.arc(500+e2[2]*d2,100+e2[3]*d2,10,0,7);c.strokeStyle='rgba(255,225,140,'+(0.85*ld*(1-f*0.5))+')';c.stroke()}
if(p.scr)RR(c,494,140,12,250,2,'#cfc6b0');ball(c,e1[0],e1[1],24,'#ffe3a3','#b07a1a');const ha=t*2;L(c,e1[0],e1[1],e1[0]+Math.cos(ha)*16,e1[1]+Math.sin(ha)*16,'#1d2733',2);
c.beginPath();c.arc(e2[0],e2[1],22,-0.5*Math.PI,0.8*Math.PI);c.strokeStyle='#e2b48c';c.lineWidth=10;c.stroke();
T(c,'∠i = '+p.i+'°',500-Math.sin(p.i/2*R)*150-10,100+Math.cos(p.i/2*R)*150,{a:'right',s:16,w:700,c:C.amber});T(c,'∠r = '+p.r+'°',500+Math.sin(p.r/2*R)*150+10,100+Math.cos(p.r/2*R)*150,{s:16,w:700,c:C.cyan});
RR(c,870,110,50,330,8,'#0c1219','#3a4658');const hh=326*ld;RR(c,872,438-hh,46,hh,6,G(c,0,438,0,110,['#6a4fd1','#b18cff','#ffe08a']));T(c,'LOUDNESS',895,100,{a:'center',s:12,w:600,c:C.dim});T(c,Math.round(ld*100)+'',895,468,{a:'center',s:22,w:600,m:1,c:C.violet});hint(c,'Drag on the right to turn tube 2 · find the loudest tick');},
readings(s,p){return[['∠i',p.i,'°'],['∠r',p.r,'°'],['Loudness',Math.round(this.loud(p)*100),'%']]},
columns:['∠i (°)','∠r (°)'],record(s,p){if(this.loud(p)<0.85)return{error:'Turn tube 2 to the loudest position first.'};return[p.i,p.r]},plot:{x:0,y:1},
result(rows){return rows.length?'Loudest when ∠r = ∠i → laws of reflection hold for sound.':''}};

S.cro={title:'Sound on an Oscilloscope — Pitch & Loudness',topic:'sound',grades:[8,9,11],
aim:'Display sound waves on a CRO; relate frequency to pitch, amplitude to loudness, and measure the time period.',
apparatus:['Signal generator & loudspeaker','Microphone','Cathode-ray oscilloscope (CRO)'],
formula:'f = 1 / T      T = (divisions per cycle) × (time-base ms/div)',
procedure:['Set a frequency and amplitude; switch on sound to hear it.','Count the horizontal divisions for one complete wave on the CRO.','T = divisions × time-base; f = 1/T.','Raise the frequency — waves crowd together and the pitch rises.','Raise the amplitude — waves grow taller and the sound is louder.'],
controls:[{k:'f',label:'Frequency',type:'range',min:100,max:1000,step:10,def:250,unit:'Hz'},{k:'A',label:'Amplitude (loudness)',type:'range',min:10,max:100,step:5,def:60,unit:'%'},{k:'tb',label:'Time base',type:'select',def:1,options:[[0.5,'0.5 ms/div'],[1,'1 ms/div'],[2,'2 ms/div']]},{k:'snd',label:'Play sound',type:'toggle',def:false}],
init(){return{time:0}},onChange(s,p,k){if(k==='snd'||s.ac)tone(s,p.snd,p.f,0.12*p.A/100)},step(s,p,dt){s.time+=dt},dispose(s){untone(s)},
draw(c,s,p,t){room(c);const sx=450,sy=90,dv=32,cy=sy+4*dv,amp=3*p.A/100;
RR(c,110,300,70,110,8,'#2b323c');c.beginPath();c.ellipse(180,355,22,48,0,0,7);c.fillStyle='#59626e';c.fill();c.beginPath();c.ellipse(180,355,8,16,0,0,7);c.fillStyle='#1d2733';c.fill();RR(c,135,410,20,42,2,'#3f4958');
for(let k=0;k<6;k++){const f=((t*Math.min(3,p.f/150)+k/6)%1);c.beginPath();c.arc(185,355,30+f*140,-0.5,0.5);c.strokeStyle='rgba(177,140,255,'+(p.A/100*(1-f))+')';c.lineWidth=2;c.stroke()}
RR(c,346,330,24,44,10,'#aab4c1');L(c,358,374,358,452,'#3f4958',4);c.beginPath();c.moveTo(358,340);c.bezierCurveTo(400,300,400,420,420,400);c.strokeStyle='#1d2733';c.lineWidth=4;c.stroke();
RR(c,420,60,520,392,14,G(c,0,60,0,452,['#5b6677','#2b323c']),'#1d2430',2);RR(c,sx-6,sy-6,10*dv+12,8*dv+12,10,'#0a0f0a');c.save();RR(c,sx,sy,10*dv,8*dv,6,'#0d1a10');c.clip();
c.strokeStyle='rgba(120,255,160,0.15)';c.lineWidth=1;for(let i=0;i<=10;i++){L(c,sx+i*dv,sy,sx+i*dv,sy+8*dv,'rgba(120,255,160,0.15)',1)}for(let j=0;j<=8;j++)L(c,sx,sy+j*dv,sx+10*dv,sy+j*dv,'rgba(120,255,160,0.15)',1);L(c,sx,cy,sx+10*dv,cy,'rgba(120,255,160,0.35)',1);L(c,sx+5*dv,sy,sx+5*dv,sy+8*dv,'rgba(120,255,160,0.35)',1);
c.beginPath();for(let x=0;x<=10*dv;x++){const tm=x/dv*p.tb/1000;c.lineTo(sx+x,cy-amp*dv*Math.sin(2*Math.PI*p.f*tm))}c.shadowColor='#7dff9b';c.shadowBlur=10;c.strokeStyle='#9dffb4';c.lineWidth=2.2;c.stroke();c.restore();
[['TIME/DIV',820,130],['VOLTS/DIV',820,230],['POSITION',820,330]].forEach(([l,x,y])=>{ball(c,x,y,26,'#8792a3','#2b323c');L(c,x,y,x+18,y-12,'#e8eef7',2);T(c,l,x,y+44,{a:'center',s:11,w:600,c:C.ink})});
T(c,p.tb+' ms/div',sx,sy+8*dv+30,{s:13,m:1,c:C.lime});T(c,'1 div = 1 V',sx+10*dv,sy+8*dv+30,{a:'right',s:13,m:1,c:C.lime});const pitch=p.f<300?'Low pitch':p.f<600?'Medium pitch':'High pitch';T(c,pitch+' · '+(p.A<40?'soft':p.A<75?'moderate':'loud'),170,90,{a:'center',s:18,w:600,c:C.violet});},
readings(s,p){const Tm=1000/p.f;return[['Frequency f',p.f,'Hz'],['Divisions per cycle',(Tm/p.tb).toFixed(2),'div'],['Time period T',Tm.toFixed(2),'ms'],['Amplitude',(3*p.A/100).toFixed(1),'div']]},
columns:['f (Hz)','Div / cycle','T (ms)','Amplitude (div)'],record(s,p){const Tm=1000/p.f;return[p.f,+(Tm/p.tb).toFixed(2),+Tm.toFixed(2),+(3*p.A/100).toFixed(1)]},plot:{x:0,y:2,fit:false},
result(rows){return rows.length?'f × T = 1 in every reading. Higher frequency → higher pitch; larger amplitude → louder sound.':''}};

S.pinhole={title:'Pinhole Camera',topic:'light',grades:[6],
aim:'Make a pinhole camera and study the image of a candle: its nature and how its size changes.',
apparatus:['Box with a pinhole at one end','Tracing-paper screen at the other end','Candle','Metre scale'],
formula:'Image height ÷ Object height = Box length ÷ Object distance',
procedure:['Light the candle in a dark room and point the pinhole at it.','Look at the image on the tracing-paper screen.','Move the candle closer / farther and note the image size.','Change the box length and the size of the hole.','Record the image height each time.'],
controls:[{k:'d',label:'Candle distance from pinhole',type:'range',min:30,max:100,step:5,def:60,unit:'cm'},{k:'Lb',label:'Box length',type:'range',min:10,max:30,step:1,def:20,unit:'cm'},{k:'hole',label:'Hole size',type:'select',def:1,options:[[1,'Pin-prick'],[3,'Medium'],[6,'Large']]}],
init(){return{}},hi(p){return 24*p.Lb/p.d},
pointer(s,p,x,y,ph){if(ph==='down')s.drag=x<540;if(ph==='up')s.drag=false;if(!s.drag)return null;return{d:Math.round(cl((560-x)/4.5,30,100)/5)*5}},
draw(c,s,p,t){room(c);c.fillStyle='rgba(0,0,0,0.5)';c.fillRect(0,0,W,H);const k=4.5,ph=560,ay=270,xo=ph-p.d*k,xs=ph+p.Lb*k,ih=this.hi(p)*k,oh=24*k;
const gl=c.createRadialGradient(xo,ay-oh/2,4,xo,ay-oh/2,120);gl.addColorStop(0,'rgba(255,200,100,0.5)');gl.addColorStop(1,'rgba(255,200,100,0)');c.fillStyle=gl;c.fillRect(xo-120,ay-oh/2-120,240,240);
K2.candle(c,xo,ay+oh/2-20,oh/68,t);
L(c,xo,ay-oh/2+6,xs,ay+ih/2,'rgba(255,209,102,0.7)',1.5);L(c,xo,ay+oh/2,xs,ay-ih/2,'rgba(110,231,255,0.7)',1.5);
RR(c,ph,ay-95,xs-ph,190,4,'rgba(40,45,55,0.85)','#5b6677',2);RR(c,xs-4,ay-95,8,190,1,'rgba(240,235,220,0.8)');c.fillStyle='#0e1621';c.fillRect(ph-3,ay-p.hole,6,2*p.hole);
c.save();c.globalAlpha=0.5;c.translate(xs-6,ay);c.scale(1,-1);RR(c,-2,-ih/2,4,ih,1,'#ffcf7a');c.restore();
RR(c,700,40,240,190,10,'#0b1119','#3a4658');T(c,'SCREEN VIEW',712,60,{s:11,w:600,c:C.dim});c.save();RR(c,712,70,216,148,4,'#e9e3d3');c.clip();c.filter='blur('+(p.hole*1.3).toFixed(1)+'px)';c.globalAlpha=Math.min(1,0.35+p.hole*0.11);K2.candle(c,820,130,-ih/60*1.8,t);c.filter='none';c.globalAlpha=1;c.restore();
L(c,xo,ay+130,ph,ay+130,C.amber,1.5);T(c,'d = '+p.d+' cm',(xo+ph)/2,ay+150,{a:'center',s:14,w:600,m:1,c:C.amber});L(c,ph,ay+110,xs,ay+110,C.cyan,1.5);T(c,'L = '+p.Lb,(ph+xs)/2,ay+128,{a:'center',s:13,w:600,m:1,c:C.cyan});hint(c,'Drag the candle closer or farther');},
readings(s,p){return[['Object distance',p.d,'cm'],['Box length',p.Lb,'cm'],['Image height',this.hi(p).toFixed(1),'cm'],['Image','Inverted, '+(p.hole>3?'blurred & bright':p.hole>1?'slightly blurred':'sharp & dim'),'']]},
columns:['d (cm)','L (cm)','Image height (cm)'],record(s,p){return[p.d,p.Lb,+this.hi(p).toFixed(1)]},
result(rows){return rows.length?'Image is always inverted; it grows when the box is longer or the candle is closer. (Candle height = '+avg(rows.map(r=>r[2]*r[0]/r[1])).toFixed(0)+' cm)':''}};

S.travellingMicroscope={title:'Refractive Index — Travelling Microscope',topic:'light',grades:[12],
aim:'Find the refractive index of a glass slab using a travelling microscope (real depth ÷ apparent depth).',
apparatus:['Travelling microscope','Glass slab','Lycopodium powder','Paper with ink cross mark'],
formula:'n = real depth ÷ apparent depth = (R₃ − R₁) ÷ (R₃ − R₂)',
procedure:['With no slab, focus the microscope on the cross mark — R₁.','Place the slab over the mark; raise the microscope until the mark is sharp again — R₂.','Focus on the powder on top of the slab — R₃.','Record each reading when the eyepiece image is sharp.','n = (R₃ − R₁)/(R₃ − R₂).'],
controls:[{k:'slab',label:'Glass slab over mark',type:'toggle',def:false},{k:'n',label:'Slab',type:'select',def:1.5,options:[[1.5,'Crown glass'],[1.62,'Flint glass']]},{k:'z',label:'Microscope height',type:'range',min:5,max:9,step:0.005,def:5.6,unit:'cm'}],
Z0:5.215,TT:2.85,init(){return{}},
targets(p){return p.slab?[['R₂ · mark through slab',this.Z0+this.TT*(1-1/p.n)],['R₃ · top of slab',this.Z0+this.TT]]:[['R₁ · mark (no slab)',this.Z0]]},
focus(p){let b=null;this.targets(p).forEach(q=>{const sh=Math.exp(-Math.abs(p.z-q[1])/0.015);if(!b||sh>b.sh)b={lab:q[0],sh,z:q[1]}});return b},
pointer(s,p,x,y,ph){const yo=390-(p.z-this.Z0)*50;if(ph==='down'){s.drag=x>540&&x<860;s.off=y-yo}if(ph==='up')s.drag=false;if(!s.drag)return null;return{z:Math.round(cl(this.Z0+(390-(y-s.off))/50,5,9)*200)/200}},
draw(c,s,p){room(c);const yo=390-(p.z-this.Z0)*50,tg=this.targets(p),fm=tg[0][1],sh=this.focus(p);
RR(c,520,440,360,14,3,'#3b4451');c.fillStyle=G(c,814,0,826,0,['#77849a','#eef2f7','#6c788c']);c.fillRect(814,40,12,400);RR(c,830,40,30,400,2,'#efe6c8','#b9ab80');for(let mm=0;mm<=80;mm++){const zz=5+mm*0.05,y=390-(zz-this.Z0)*50;if(y<44||y>436)continue;L(c,830,y,830+(mm%2?5:mm%10?8:12),y,'#3b3325',1);if(mm%20===0)T(c,zz.toFixed(0),846,y+4,{s:9,m:1,c:'#3b3325'})}
RR(c,600,yo-130,220,16,3,'#4a5566');P(c,[[826,yo-122],[836,yo-128],[836,yo-116]],C.red);RR(c,585,yo-170,30,170,4,G(c,585,0,615,0,['#2b323c','#6d7888','#2b323c']));RR(c,580,yo-190,40,22,4,'#1d2430');RR(c,590,yo-6,20,10,2,'#aab4c1');
RR(c,540,436,140,6,1,'#f4f1ea');L(c,592,432,608,440,'#1d4bb3',2);L(c,608,432,592,440,'#1d4bb3',2);
if(p.slab){RR(c,520,440-this.TT*50,160,this.TT*50,2,'rgba(140,210,240,0.28)','#5aa6c4',1.5);for(let i=0;i<20;i++){c.fillStyle='#e8d27a';c.fillRect(530+i*7,440-this.TT*50-2,2,2)}L(c,540,440-this.TT*50/p.n*(p.n-1)*0+ -(this.TT*(1-1/p.n))*50,680,440-(this.TT*(1-1/p.n))*50,'rgba(29,75,179,0.7)',1,[4,4])}
const ex=260,ey=230,er=150;c.beginPath();c.arc(ex,ey,er+10,0,7);c.fillStyle='#1d2430';c.fill();c.save();c.beginPath();c.arc(ex,ey,er,0,7);c.clip();c.fillStyle=p.slab?'#dfeef3':'#f4f1ea';c.fillRect(ex-er,ey-er,2*er,2*er);
const bm=Math.min(16,Math.abs(p.z-fm)*120);c.filter='blur('+bm.toFixed(1)+'px)';L(c,ex-50,ey-50,ex+50,ey+50,'#1d4bb3',6);L(c,ex+50,ey-50,ex-50,ey+50,'#1d4bb3',6);c.filter='none';
if(p.slab){const bp=Math.min(16,Math.abs(p.z-tg[1][1])*120);c.filter='blur('+bp.toFixed(1)+'px)';let sd=3;for(let i=0;i<70;i++){sd=(sd*16807)%2147483647;const a=sd/2147483647*6.28;sd=(sd*16807)%2147483647;const rr=Math.sqrt(sd/2147483647)*er;c.fillStyle='#c9a227';c.beginPath();c.arc(ex+Math.cos(a)*rr,ey+Math.sin(a)*rr,3,0,7);c.fill()}c.filter='none'}
L(c,ex-er,ey,ex+er,ey,'rgba(0,0,0,0.5)',1);L(c,ex,ey-er,ex,ey+er,'rgba(0,0,0,0.5)',1);c.restore();T(c,'EYEPIECE VIEW',ex,ey-er-20,{a:'center',s:12,w:600,c:C.dim});
T(c,sh.sh>0.8?'In focus: '+sh.lab:'Image blurred — adjust height',ex,ey+er+36,{a:'center',s:15,w:600,c:sh.sh>0.8?C.lime:C.amber});hint(c,'Drag the microscope up or down to focus');},
readings(s,p){const f=this.focus(p);return[['Microscope reading',p.z.toFixed(3),'cm'],['Sharpness',Math.round(f.sh*100),'%'],['In focus',f.sh>0.8?f.lab.split(' ·')[0]:'—','']]},
columns:['Focused on','Reading (cm)'],record(s,p){const f=this.focus(p);if(f.sh<0.8)return{error:'Focus until the image is sharp.'};return[f.lab,+p.z.toFixed(3)]},
result(rows){const g=k=>{const r=rows.filter(x=>x[0].startsWith(k));return r.length?r[r.length-1][1]:null};const a=g('R₁'),b=g('R₂'),c2=g('R₃');if(a==null||b==null||c2==null)return'Record R₁, R₂ and R₃ to find n.';return'Real depth = '+(c2-a).toFixed(3)+' cm · apparent depth = '+(c2-b).toFixed(3)+' cm → n ≈ '+((c2-a)/(c2-b)).toFixed(3)}};

S.potentiometer={title:'Potentiometer — Compare EMFs & Internal Resistance',topic:'elec',grades:[12],
aim:'Compare the EMFs of two primary cells, and find the internal resistance of a cell, using a potentiometer.',
apparatus:['Potentiometer (4 wires × 100 cm)','2 V accumulator, rheostat, key','Leclanché & Daniell cells','Galvanometer & jockey','Resistance box (shunt)'],
formula:'E₁ / E₂ = l₁ / l₂      r = R (l₁ − l₂) / l₂',
procedure:['Keep the rheostat fixed throughout so the potential gradient stays the same.','Choose a cell; slide the jockey (drag it on the wires) until the galvanometer reads zero.','Record balancing lengths for Leclanché (l₁) and Daniell (l₂) → E₁/E₂.','Connect a shunt R across the Leclanché cell and find the new length.','Compute r = R(l₁ − l₂)/l₂ for each R.'],
controls:[{k:'cell',label:'Cell in secondary circuit',type:'select',def:'L',options:[['L','Leclanché'],['D','Daniell']]},{k:'Rs',label:'Shunt resistance R',type:'select',def:0,options:[[0,'Off'],[10,'10 Ω'],[5,'5 Ω'],[2,'2 Ω']]},{k:'rh',label:'Rheostat',type:'select',def:0.5,options:[[0,'0 Ω'],[0.5,'0.5 Ω'],[1,'1 Ω']]},{k:'l',label:'Jockey position l',type:'range',min:0,max:400,step:0.5,def:150,unit:'cm'}],
init(){return{g:0}},
V(p){const E=p.cell==='L'?1.45:1.08,r=p.cell==='L'?1.2:2;return p.Rs?E*p.Rs/(p.Rs+r):E},kk(p){return 8/(4+p.rh)/400},
dev(p){return cl((this.V(p)-this.kk(p)*p.l)*120,-30,30)},step(s,p,dt){s.g+=(this.dev(p)-s.g)*Math.min(1,dt*8)},
pos(l){const i=Math.min(3,Math.floor(l/100)),c=l-i*100;return{x:i%2?850-c*7:150+c*7,y:200+i*75}},
pointer(s,p,x,y,ph){const j=this.pos(p.l);if(ph==='down')s.drag=y>170&&y<460&&x>120&&x<880;if(ph==='up')s.drag=false;if(!s.drag)return null;const i=cl(Math.round((y-200)/75),0,3),cc=cl(i%2?(850-x)/7:(x-150)/7,0,100);return{l:Math.round((i*100+cc)*2)/2}},
draw(c,s,p){K2.board(c);const cs='#d9964a';
K2.wire(c,[[150,200],[110,200],[110,110],[200,110]]);K2.wire(c,[[320,110],[420,110]]);K2.wire(c,[[520,110],[600,110]]);K2.wire(c,[[740,110],[920,110],[920,64],[70,64],[70,425],[150,425]]);
RR(c,200,90,120,40,6,'#2b323c','#56627a');T(c,'2 V',260,116,{a:'center',s:14,w:700,m:1,c:C.lime});K2.plugKey(c,470,110,true);RR(c,600,94,140,32,6,G(c,0,94,0,126,['#d69a55','#6b4a2a']));T(c,'Rh '+p.rh+' Ω',670,146,{a:'center',s:12,c:C.dim});
for(let i=0;i<4;i++){const y=200+i*75;RR(c,146,y+4,708,18,2,'#efe6c8');for(let cm=0;cm<=100;cm+=5){const x=i%2?850-cm*7:150+cm*7;L(c,x,y+4,x,y+4+(cm%10?5:9),'#3b3325',1);if(cm%20===0)T(c,(i*100+cm)+'',x,y+20,{a:'center',s:9,m:1,c:'#3b3325'})}L(c,150,y,850,y,'#e7c9a0',2.5);if(i<3){const ex=i%2?150:850;RR(c,ex-8,y-4,16,83,3,'#b8892a')}}
K2.wire(c,[[110,200],[110,505],[220,505]]);RR(c,220,486,110,38,6,'#2b323c','#56627a');T(c,p.cell==='L'?'Leclanché':'Daniell',275,510,{a:'center',s:12,w:600,c:C.ink});K2.wire(c,[[330,505],[905,505],[905,372]]);
if(p.Rs){K2.wire(c,[[200,505],[200,470],[230,470]]);K2.wire(c,[[320,470],[350,470],[350,505]]);RR(c,230,456,90,28,4,'#15181d','#3a4050');T(c,p.Rs+' Ω',275,475,{a:'center',s:12,m:1,c:C.amber})}
meter(c,905,318,36,s.g,-30,30,'G',C.rose,s.g.toFixed(1));
const j=this.pos(p.l);c.beginPath();c.moveTo(905,268);c.bezierCurveTo(905,200,j.x+60,j.y-90,j.x,j.y-30);c.strokeStyle='#c0392b';c.lineWidth=3;c.stroke();P(c,[[j.x-12,j.y-34],[j.x+12,j.y-34],[j.x+4,j.y-8],[j.x,j.y],[j.x-4,j.y-8]],G(c,j.x-12,0,j.x+12,0,['#6d7888','#e5e9ee','#6d7888']),'#3b4451');RR(c,j.x-14,j.y-48,28,16,4,'#2b323c');
T(c,'l = '+p.l.toFixed(1)+' cm',j.x,j.y-56,{a:'center',s:14,w:600,m:1,c:C.lime});hint(c,'Drag the jockey along the wires to find zero deflection');},
readings(s,p){return[['Balancing length l',p.l.toFixed(1),'cm'],['Galvanometer',s.g.toFixed(1),'div'],['Potential gradient',(this.kk(p)*1000).toFixed(3),'mV/cm'],['Shunt',p.Rs?p.Rs+' Ω':'Off','']]},
columns:['Cell','R (Ω)','l (cm)'],record(s,p){if(Math.abs(this.dev(p))>0.6)return{error:'Galvanometer must read zero before recording.'};return[p.cell==='L'?'Leclanché':'Daniell',p.Rs?p.Rs:'—',p.l]},
result(rows){const f=(c,R)=>{const a=rows.filter(r=>r[0]===c&&r[1]===R).map(r=>r[2]);return a.length?avg(a):null};const out=[],l1=f('Leclanché','—'),l2=f('Daniell','—');if(l1&&l2)out.push('E₁/E₂ = l₁/l₂ ≈ '+(l1/l2).toFixed(3));if(l1){const rs=[];[10,5,2].forEach(R=>{const lr=f('Leclanché',R);if(lr)rs.push(R*(l1-lr)/lr)});if(rs.length)out.push('Internal resistance r ≈ '+avg(rs).toFixed(2)+' Ω')}return out.join('   ·   ')||'Record the Leclanché length without shunt first.'}};

S.galvanometer={title:'Galvanometer — Half-deflection Method',topic:'elec',grades:[12],
aim:'Find the resistance of a galvanometer by the half-deflection method and its figure of merit.',
apparatus:['Moving-coil galvanometer','Battery (2 V)','High resistance box R','Low resistance box S (shunt)','Keys K₁ and K₂'],
formula:'G = R S / (R − S)      Figure of merit k = E / ((R + G) θ)',
procedure:['With K₂ open, set R for a large deflection θ (note it).','Close K₂ (tap it) and adjust the shunt S until the deflection becomes θ/2.','Record R, θ and S.','Repeat for 3–4 values of R.','Compute G and the figure of merit k.'],
controls:[{k:'R',label:'High resistance R',type:'range',min:2500,max:9000,step:500,def:4000,unit:'Ω'},{k:'K2',label:'Key K₂ (shunt)',type:'toggle',def:false},{k:'S',label:'Shunt S',type:'range',min:20,max:300,step:1,def:200,unit:'Ω'}],
Gr:96,kf:3e-5,E:2,init(){return{th:0}},
th0(p){return this.E/((p.R+this.Gr)*this.kf)},th(p){if(!p.K2)return this.th0(p);const Gs=this.Gr*p.S/(this.Gr+p.S),I=this.E/(p.R+Gs);return I*p.S/(this.Gr+p.S)/this.kf},
step(s,p,dt){s.th+=(this.th(p)-s.th)*Math.min(1,dt*6)},
pointer(s,p,x,y,ph){if(ph==='down'&&Math.hypot(x-620,y-440)<55)return{K2:!p.K2};return null},
draw(c,s,p){K2.board(c);K2.wire(c,[[180,110],[860,110],[860,290],[590,290]]);K2.wire(c,[[410,290],[180,290],[180,110]]);K2.wire(c,[[300,290],[300,440],[400,440]]);K2.wire(c,[[540,440],[576,440]]);K2.wire(c,[[664,440],[720,440],[720,290]]);
RR(c,230,90,110,40,6,'#2b323c','#56627a');T(c,'2 V',285,116,{a:'center',s:14,w:700,m:1,c:C.lime});K2.plugKey(c,470,110,true);rbox(c,700,110,'R = '+p.R+' Ω');
meter(c,500,290,60,s.th,0,30,'G',C.rose,s.th.toFixed(1)+' div');RR(c,400,422,140,36,6,'#15181d','#3a4050');T(c,'S = '+p.S+' Ω',470,446,{a:'center',s:13,w:600,m:1,c:C.amber});tap(c,620,440,p.K2,'K₂');
T(c,'θ₀ (K₂ open) = '+this.th0(p).toFixed(1)+' div',90,80,{s:15,w:600,m:1,c:C.ink});if(p.K2)T(c,'Target θ₀/2 = '+(this.th0(p)/2).toFixed(1)+' div',90,500,{s:15,w:600,m:1,c:C.amber});},
readings(s,p){return[['θ now',s.th.toFixed(1),'div'],['θ₀ (K₂ open)',this.th0(p).toFixed(1),'div'],['Target θ₀/2',(this.th0(p)/2).toFixed(1),'div'],['K₂',p.K2?'Closed':'Open','']]},
columns:['R (Ω)','θ (div)','S (Ω)','θ/2 (div)','G (Ω)','k (µA/div)'],
record(s,p){if(!p.K2)return{error:'Close K₂ and adjust S until the deflection halves.'};const t0=+this.th0(p).toFixed(1),t=this.th(p);if(Math.abs(t-t0/2)>0.25)return{error:'Adjust S until the deflection is exactly θ/2.'};const G0=p.R*p.S/(p.R-p.S);return[p.R,t0,p.S,+t.toFixed(1),+G0.toFixed(1),+(this.E/((p.R+G0)*t0)*1e6).toFixed(2)]},
result(rows){return rows.length?'G ≈ '+avg(rows.map(r=>r[4])).toFixed(1)+' Ω   ·   figure of merit k ≈ '+avg(rows.map(r=>r[5])).toFixed(2)+' µA/div':''}};

S.zener={title:'Zener Diode — Reverse Breakdown',topic:'elec',grades:[12],
aim:'Draw the reverse-bias I–V characteristic of a Zener diode and find its breakdown voltage.',
apparatus:['Zener diode (5.1 V)','DC supply 0–10 V with potential divider','Series resistor 200 Ω','Milliammeter','Voltmeter'],
formula:'Below Vz: almost no current      At Vz: current rises sharply, voltage stays ≈ Vz',
procedure:['Connect the Zener in reverse bias with the 200 Ω resistor.','Increase the supply in small steps (drag the divider slider).','Record V across the diode and the current I at each step.','Note where the current suddenly rises — the breakdown voltage.','Plot I against V.'],
controls:[{k:'v',label:'Supply (potential divider)',type:'range',min:0,max:100,step:2,def:0,unit:'%'}],
init(){return{ph:0}},
vi(p){const Vs=10*p.v/100,Vz=5.1;if(Vs<=Vz)return{Vs,V:Vs,I:0.002*Vs};const I=(Vs-Vz)/205;return{Vs,V:Vz+I*5,I:I*1000}},
step(s,p,dt){s.ph+=this.vi(p).I/25*150*dt},
pointer(s,p,x,y,ph){if(ph==='down')s.drag=x>90&&x<200&&y>130&&y<350;if(ph==='up')s.drag=false;if(!s.drag)return null;return{v:Math.round(cl((y-150)/180*100,0,100)/2)*2}},
draw(c,s,p){K2.board(c);const v=this.vi(p),LP=[[140,110],[860,110],[860,360],[140,360]];K2.wire(c,[...LP,LP[0]]);K2.wire(c,[[430,360],[430,488],[437,488]]);K2.wire(c,[[570,360],[570,488],[563,488]]);if(v.I>0.3)K2.electrons(c,LP,s.ph,44);
RR(c,230,90,150,40,6,'#2b323c','#56627a');T(c,'DC 0–10 V',305,116,{a:'center',s:13,w:600,m:1,c:C.lime});K2.rheo(c,140,150,330,p.v/100,'Potential divider');K2.resistor(c,640,110,'200 Ω');
RR(c,462,346,76,28,12,'#2a1f3a','#4a3d5c');c.fillStyle='#d5dbe3';c.fillRect(474,346,9,28);T(c,'Zener 5.1 V — reverse bias',500,396,{a:'center',s:13,w:600,c:C.ink});
meter(c,860,245,58,v.I,0,30,'mA',C.amber,v.I.toFixed(2)+' mA');meter(c,500,478,48,v.V,0,10,'V',C.lime,v.V.toFixed(2)+' V');
const ox=280,oy=300;RR(c,245,150,500,180,8,'rgba(10,16,24,0.7)','#2a3a50');L(c,ox,oy,730,oy,'#5a6a80',1);L(c,ox,160,ox,oy,'#5a6a80',1);T(c,'I (mA)',ox+6,172,{s:11,c:C.dim});T(c,'V (V)',726,oy+18,{a:'right',s:11,c:C.dim});
c.beginPath();for(let q=0;q<=100;q+=1){const w=this.vi({v:q});c.lineTo(ox+w.V/6*440,oy-w.I/25*130)}c.strokeStyle='rgba(255,181,71,0.35)';c.lineWidth=2;c.stroke();c.beginPath();c.arc(ox+v.V/6*440,oy-v.I/25*130,6,0,7);c.fillStyle=C.amber;c.fill();hint(c,'Drag the potential-divider slider');},
readings(s,p){const v=this.vi(p);return[['Supply',v.Vs.toFixed(1),'V'],['Zener voltage V',v.V.toFixed(2),'V'],['Current I',v.I.toFixed(2),'mA']]},
columns:['V (V)','I (mA)'],record(s,p){const v=this.vi(p);return[+v.V.toFixed(2),+v.I.toFixed(2)]},plot:{x:0,y:1,fit:false},
result(rows){const r=rows.filter(x=>x[1]>=1).sort((a,b)=>a[0]-b[0]);return r.length?'Breakdown voltage Vz ≈ '+r[0][0].toFixed(2)+' V':'Increase the supply beyond 5 V to see breakdown.'}};

S.electromagnet={title:'Electromagnet',topic:'mag',grades:[7,10],
aim:'Make an electromagnet and study how its strength depends on the current, the number of turns and the core.',
apparatus:['Iron nail (core)','Insulated copper wire','Cells','Switch','Steel pins'],
formula:'Strength ∝ current × number of turns (much stronger with an iron core)',
procedure:['Wind the wire on the nail and connect it to the cells through the switch.','Close the switch (tap it) and watch the pins below.','Count the pins lifted; open the switch and watch them drop.','Change cells, turns and core; record each time.','Compare the strengths.'],
controls:[{k:'cells',label:'Cells',type:'range',min:1,max:4,step:1,def:2,unit:''},{k:'turns',label:'Turns of wire',type:'select',def:50,options:[[20,'20'],[50,'50'],[100,'100']]},{k:'core',label:'Core',type:'select',def:'fe',options:[['fe','Iron nail'],['no','Pencil (no iron)']]},{k:'sw',label:'Switch',type:'toggle',def:false}],
init(){let sd=11;const rnd=()=>(sd=(sd*16807)%2147483647)/2147483647;const pins=[];for(let i=0;i<34;i++)pins.push({x0:390+rnd()*220,y0:434+rnd()*12,a0:rnd()*3.14,f:0});return{pins}},
n(p){return p.sw?Math.min(30,Math.floor(p.cells*p.turns*(p.core==='fe'?0.15:0.012))):0},
step(s,p,dt){const n=this.n(p);s.pins.forEach((q,i)=>{q.f+=((i<n?1:0)-q.f)*Math.min(1,dt*(i<n?6:9))})},
pointer(s,p,x,y,ph){if(ph==='down'&&Math.hypot(x-200,y-330)<60)return{sw:!p.sw};return null},
draw(c,s,p){room(c);const fe=p.core==='fe';stand(c,700,112,500);
RR(c,488,120,24,14,3,'#8792a3');RR(c,494,130,12,215,2,fe?G(c,494,0,506,0,['#6d7888','#d5dbe3','#6d7888']):G(c,494,0,506,0,['#c99a3a','#f2d38a','#c99a3a']));P(c,[[494,345],[506,345],[500,358]],fe?'#8792a3':'#333');
const nt=Math.min(40,p.turns/2.5);for(let i=0;i<nt;i++){const y=170+i*(150/nt);c.beginPath();c.ellipse(500,y,12,3,0,0,7);c.strokeStyle='#d9964a';c.lineWidth=2;c.stroke()}
if(p.sw){c.strokeStyle='rgba(255,107,154,0.35)';c.lineWidth=1.5;for(let k=1;k<=3;k++){c.beginPath();c.ellipse(500,250,30+k*22,130+k*16,0,0,7);c.stroke()}}
K2.wire(c,[[488,170],[300,170],[300,250],[240,250]]);K2.wire(c,[[488,320],[300,320],[300,330],[244,330]]);K2.wire(c,[[156,330],[110,330],[110,250],[140,250]]);
for(let i=0;i<p.cells;i++)RR(c,140+i*25-(p.cells-1)*0,236,22,28,3,G(c,0,236,0,264,['#e9504f','#8a1d1d']));T(c,p.cells+' cell'+(p.cells>1?'s':''),190,222,{a:'center',s:13,c:C.dim});
RR(c,156,316,88,28,6,'#20262f','#3a4658');c.save();c.translate(170,330);c.rotate(p.sw?0:-0.6);RR(c,0,-4,62,8,3,'#c9d1db');c.restore();ball(c,170,330,5,'#e5e9ee','#5b6370');T(c,p.sw?'Switch ON':'Switch OFF — tap',200,366,{a:'center',s:12,c:p.sw?C.lime:C.amber});
RR(c,370,446,260,10,3,'#3f4958');
s.pins.forEach((q,i)=>{const tx=500+((i%6)-2.5)*6,ty=362+Math.floor(i/6)*7,f=q.f,x=q.x0+(tx-q.x0)*f,y=q.y0+(ty-q.y0)*f,a=q.a0+(1.57+((i%3)-1)*0.35-q.a0)*f;c.save();c.translate(x,y);c.rotate(a);L(c,-9,0,9,0,'#cfd6df',1.6);c.beginPath();c.arc(-9,0,2,0,7);c.fillStyle='#e5e9ee';c.fill();c.restore()});
T(c,this.n(p)+' pins lifted',500,90,{a:'center',s:22,w:700,m:1,c:C.rose});},
readings(s,p){return[['Current',p.sw?(0.4*p.cells).toFixed(1):'0.0','A'],['Turns',p.turns,''],['Core',p.core==='fe'?'Iron':'None',''],['Pins lifted',this.n(p),'']]},
columns:['Cells','Turns','Core','Pins lifted'],record(s,p){if(!p.sw)return{error:'Close the switch first.'};return[p.cells,p.turns,p.core==='fe'?'Iron':'Pencil',this.n(p)]},
result(rows){return rows.length>1?'More cells (current) and more turns lift more pins; an iron core makes the magnet far stronger.':''}};

window.LabParts=(window.LabParts||0)+1;
})();


/* c4f61af5-2618-5410-ac53-0e946cbe2271 */
(function(){
const K=window.LabKit;const {W,H,R,C,T,L,P,RR,G,ball,head,ray,arc,room,meter,watch,cl,avg,hint}=K;
const S=window.LabSims;
const bg=c=>room(c,false);
const lin=pts=>{const n=pts.length,sx=pts.reduce((a,p)=>a+p[0],0),sy=pts.reduce((a,p)=>a+p[1],0),sxx=pts.reduce((a,p)=>a+p[0]*p[0],0),sxy=pts.reduce((a,p)=>a+p[0]*p[1],0),d=n*sxx-sx*sx;if(n<2||Math.abs(d)<1e-12)return null;const b=(n*sxy-sx*sy)/d;return{b,a:(sy-b*sx)/n}};
const box=(c,x,y,w,h,title)=>{RR(c,x,y,w,h,10,'rgba(10,12,16,0.75)','rgba(255,255,255,0.12)',1);if(title)T(c,title,x+12,y+22,{s:14,w:600,c:C.dim})};
const arrow=(c,x1,y1,x2,y2,col,w)=>{L(c,x1,y1,x2,y2,col,w||3);head(c,x2,y2,Math.atan2(y2-y1,x2-x1),col,14)};

/* 1 ─ Projectile motion */
S.projectile={title:'Projectile Motion — Range & Angle',topic:'mech',grades:[11],
aim:'Launch a projectile at different angles with the same speed; find the angle of maximum range and verify R = u² sin 2θ / g.',
apparatus:['Projectile launcher with protractor','Steel ball','Measuring tape','Stopwatch'],
formula:'R = u² sin 2θ / g      H = u² sin² θ / 2g      T = 2u sin θ / g',
procedure:['Set the launch speed u.','Set the launch angle θ.','Tap “Launch” and let the ball land.','Record θ, range R and maximum height H.','Repeat for 15°, 30°, 45°, 60°, 75°. Complementary angles give the same range.'],
controls:[{k:'u',label:'Launch speed u',type:'range',min:10,max:28,step:1,def:20,unit:'m/s'},{k:'th',label:'Launch angle θ',type:'range',min:5,max:85,step:5,def:30,unit:'°'},{k:'g',label:'Location',type:'select',def:9.8,options:[[9.8,'Earth'],[1.62,'Moon']]},{k:'trail',label:'Keep old paths',type:'toggle',def:true}],
actions:[{label:'Launch',run(s,p){s.t=0;s.fly=true;s.done=false;s.maxY=0}}],
init(){return{t:0,fly:false,done:false,paths:[],maxY:0}},
onChange(s,p,k){s.fly=false;s.done=false;s.t=0;if(k==='u'||k==='g')s.paths=[]},
sc(p){return Math.min(760/(p.u*p.u/p.g),330/(p.u*p.u/(2*p.g)))},
step(s,p,dt){if(!s.fly)return;s.t+=dt*1.6;const Tf=2*p.u*Math.sin(p.th*R)/p.g;if(s.t>=Tf){s.t=Tf;s.fly=false;s.done=true;if(p.trail)s.paths.push({th:p.th,u:p.u});}},
pos(p,t){return[p.u*Math.cos(p.th*R)*t,p.u*Math.sin(p.th*R)*t-0.5*p.g*t*t]},
draw(c,s,p){bg(c);const k=this.sc(p),ox=110,oy=470;L(c,60,oy,960,oy,'rgba(232,238,247,0.35)',2);
const stp=[1,2,5,10,20,50,100,200].find(v=>v*k>=70)||500;for(let m=0;m*k<=820;m+=stp){L(c,ox+m*k,oy,ox+m*k,oy+8,C.dim,1);T(c,m+'',ox+m*k,oy+26,{a:'center',s:13,m:1,c:C.dim})}T(c,'m',ox+830,oy+26,{s:13,c:C.dim});
s.paths.forEach(q=>{c.beginPath();const Tf=2*q.u*Math.sin(q.th*R)/p.g;for(let i=0;i<=60;i++){const t=Tf*i/60,x=q.u*Math.cos(q.th*R)*t,y=q.u*Math.sin(q.th*R)*t-0.5*p.g*t*t;i?c.lineTo(ox+x*k,oy-y*k):c.moveTo(ox,oy)}c.strokeStyle='rgba(79,214,255,0.28)';c.lineWidth=2;c.stroke();const R0=q.u*q.u*Math.sin(2*q.th*R)/p.g;T(c,q.th+'°',ox+R0*k,oy-8,{a:'center',s:13,c:C.cyan})});
const Tf=2*p.u*Math.sin(p.th*R)/p.g;c.beginPath();for(let i=0;i<=60;i++){const t=Math.min(s.t,Tf)*i/60,[x,y]=this.pos(p,t);i?c.lineTo(ox+x*k,oy-y*k):c.moveTo(ox,oy)}c.strokeStyle=C.amber;c.lineWidth=3;c.stroke();
c.save();c.translate(ox,oy);c.rotate(-p.th*R);RR(c,-10,-11,70,22,5,'#5a6577','#a9b4c3',1.5);c.restore();arc(c,ox,oy,46,-p.th*R,0,C.lime,2);T(c,'θ = '+p.th+'°',ox+54,oy-10,{s:16,w:600,c:C.lime});
const [bx,by]=this.pos(p,s.t);ball(c,ox+bx*k,oy-by*k,9,'#c7d0dc','#4a5566');
if(s.fly||s.done){const vx=p.u*Math.cos(p.th*R),vy=p.u*Math.sin(p.th*R)-p.g*s.t;arrow(c,ox+bx*k,oy-by*k,ox+bx*k+vx*3,oy-by*k-vy*3,C.rose,2.5);arrow(c,ox+bx*k,oy-by*k,ox+bx*k,oy-by*k+30,C.violet,2.5);T(c,'g',ox+bx*k+8,oy-by*k+34,{s:15,c:C.violet})}
if(s.done){const Rr=p.u*p.u*Math.sin(2*p.th*R)/p.g;L(c,ox,oy+40,ox+Rr*k,oy+40,C.amber,2);T(c,'R = '+Rr.toFixed(1)+' m',ox+Rr*k/2,oy+60,{a:'center',s:18,w:700,c:C.amber,m:1})}
if(!s.fly&&!s.done)hint(c,'Set u and θ, then tap “Launch”');},
readings(s,p){const Hm=Math.pow(p.u*Math.sin(p.th*R),2)/(2*p.g),Tf=2*p.u*Math.sin(p.th*R)/p.g,Rr=p.u*p.u*Math.sin(2*p.th*R)/p.g;return[['Angle θ',p.th,'°'],['Range R',s.done?Rr.toFixed(1):'—','m'],['Max height H',s.done?Hm.toFixed(1):'—','m'],['Time of flight',s.done?Tf.toFixed(2):(s.t/1).toFixed(2),'s']]},
columns:['θ (°)','sin 2θ','R (m)','H (m)'],
record(s,p){if(!s.done)return{error:'Launch the ball and let it land first.'};return[p.th,+Math.sin(2*p.th*R).toFixed(3),+(p.u*p.u*Math.sin(2*p.th*R)/p.g).toFixed(1),+(Math.pow(p.u*Math.sin(p.th*R),2)/(2*p.g)).toFixed(1)]},
plot:{x:0,y:2,fit:false},
result(rows){if(rows.length<2)return'';const b=[...rows].sort((a,c)=>c[2]-a[2])[0];const f=lin(rows.map(r=>[r[1],r[2]]));return'Maximum range at θ ≈ '+b[0]+'°.'+(f?'   ·   R ∝ sin 2θ: slope u²/g ≈ '+f.b.toFixed(1)+' m':'')}};

/* 2 ─ Centripetal force */
S.circular={title:'Uniform Circular Motion — Centripetal Force',topic:'mech',grades:[11],
aim:'Measure the centripetal force needed to keep a body in a circle and verify F = m v² / r.',
apparatus:['Whirling apparatus (top view)','Force sensor in the string','Masses','Stopwatch','Metre scale'],
formula:'F = m v² / r = m ω² r      v = 2π r / T',
procedure:['Choose the mass m and radius r.','Set the speed v.','Read the string tension F on the force sensor.','Record and repeat for several speeds.','Plot F against v²; slope = m / r. Tap “Cut the string” to see the direction the body leaves.'],
controls:[{k:'m',label:'Mass m',type:'range',min:50,max:250,step:25,def:100,unit:'g'},{k:'r',label:'Radius r',type:'range',min:0.2,max:0.8,step:0.1,def:0.5,unit:'m'},{k:'v',label:'Speed v',type:'range',min:0.5,max:4,step:0.5,def:2,unit:'m/s'}],
actions:[{label:'Cut the string',run(s){s.cut=true;s.cx=null}},{label:'Reconnect',run(s){s.cut=false}}],
init(){return{a:0,cut:false,cx:null}},
onChange(s){s.cut=false;s.cx=null},
step(s,p,dt){if(!s.cut){s.a+=p.v/p.r*dt}else{if(s.cx==null){const rp=p.r*380;s.cx=500+Math.cos(s.a)*rp;s.cy=280+Math.sin(s.a)*rp;s.dx=-Math.sin(s.a);s.dy=Math.cos(s.a);s.tt=0}s.tt+=dt}},
draw(c,s,p){bg(c);const cx=500,cy=280,rp=p.r*380;c.setLineDash([6,6]);c.beginPath();c.arc(cx,cy,rp,0,7);c.strokeStyle='rgba(232,238,247,0.25)';c.lineWidth=1.5;c.stroke();c.setLineDash([]);
ball(c,cx,cy,12,'#c7d0dc','#4a5566');T(c,'axis',cx,cy+30,{a:'center',s:13,c:C.dim});
let bx,by;if(!s.cut){bx=cx+Math.cos(s.a)*rp;by=cy+Math.sin(s.a)*rp;L(c,cx,cy,bx,by,'#cfd6df',2);const mx=(cx+bx)/2,my=(cy+by)/2;RR(c,mx-18,my-10,36,20,4,'#2d3746',C.lime,1.5);
const F=p.m/1000*p.v*p.v/p.r,fl=cl(F*25,20,140),ux=(cx-bx)/rp,uy=(cy-by)/rp;arrow(c,bx,by,bx+ux*fl,by+uy*fl,C.rose,3);T(c,'F',bx+ux*fl+6,by+uy*fl,{s:18,w:700,c:C.rose});
const tx=-Math.sin(s.a),ty=Math.cos(s.a);arrow(c,bx,by,bx+tx*p.v*30,by+ty*p.v*30,C.cyan,3);T(c,'v',bx+tx*p.v*30+6,by+ty*p.v*30,{s:18,w:700,c:C.cyan});}
else{bx=s.cx+s.dx*s.tt*p.v*120;by=s.cy+s.dy*s.tt*p.v*120;L(c,s.cx,s.cy,bx,by,'rgba(79,214,255,0.4)',2,[6,5]);T(c,'String cut → the body moves along the tangent (no outward force!)',500,40,{a:'center',s:18,w:600,c:C.amber})}
ball(c,bx,by,8+p.m/25,'#ffd08a','#a8661c');
box(c,800,30,180,70,'FORCE SENSOR');T(c,(s.cut?0:p.m/1000*p.v*p.v/p.r).toFixed(3)+' N',890,82,{a:'center',s:24,w:700,m:1,c:C.lime});},
readings(s,p){const F=p.m/1000*p.v*p.v/p.r;return[['Speed v',p.v.toFixed(1),'m/s'],['v²',(p.v*p.v).toFixed(2),'m²/s²'],['Tension F',s.cut?'0.000':F.toFixed(3),'N'],['Period T',(2*Math.PI*p.r/p.v).toFixed(2),'s']]},
columns:['m (g)','r (m)','v (m/s)','v² (m²/s²)','F (N)'],
record(s,p){if(s.cut)return{error:'Reconnect the string first.'};return[p.m,p.r,p.v,+(p.v*p.v).toFixed(2),+(p.m/1000*p.v*p.v/p.r).toFixed(3)]},
plot:{x:3,y:4},
result(rows){const f=lin(rows.map(r=>[r[3],r[4]]));const r0=rows[0];return f&&rows.length>1?'Slope of F–v² ≈ '+f.b.toFixed(3)+' kg/m;  m/r = '+(r0[0]/1000/r0[1]).toFixed(3)+' kg/m → F = mv²/r verified (keep m and r fixed).':''}};

/* 3 ─ Collisions */
S.collision={title:'Collisions — Conservation of Momentum',topic:'mech',grades:[9,11],
aim:'Study elastic and perfectly inelastic collisions of two gliders on an air track; show that total momentum is conserved while kinetic energy may not be.',
apparatus:['Air track','Two gliders with masses','Velocity sensors (photogates)','Velcro pad for sticking'],
formula:'m₁u₁ + m₂u₂ = m₁v₁ + m₂v₂      Elastic: KE conserved      Perfectly inelastic: v = m₁u₁ / (m₁ + m₂)',
procedure:['Choose the masses and the type of collision.','Set the speed of glider A (B starts at rest).','Tap “Launch”.','After the collision, record the velocities.','Compare total momentum and kinetic energy before and after.'],
controls:[{k:'m1',label:'Mass of A',type:'select',def:0.2,options:[[0.1,'100 g'],[0.2,'200 g'],[0.4,'400 g']]},{k:'m2',label:'Mass of B',type:'select',def:0.2,options:[[0.1,'100 g'],[0.2,'200 g'],[0.4,'400 g']]},{k:'u1',label:'Speed of A',type:'range',min:0.2,max:1.2,step:0.1,def:0.6,unit:'m/s'},{k:'type',label:'Collision',type:'select',def:'e',options:[['e','Elastic (spring bumper)'],['i','Perfectly inelastic (velcro)']]}],
actions:[{label:'Launch',run(s,p){Object.assign(s,{x1:0.15,x2:0.55,v1:p.u1,v2:0,hit:false,run:true})}}],
init(){return{x1:0.15,x2:0.55,v1:0,v2:0,hit:false,run:false}},
onChange(s){Object.assign(s,{x1:0.15,x2:0.55,v1:0,v2:0,hit:false,run:false})},
step(s,p,dt){if(!s.run)return;dt*=0.8;s.x1+=s.v1*dt;s.x2+=s.v2*dt;if(!s.hit&&s.x2-s.x1<=0.1){s.hit=true;const a=p.m1,b=p.m2,u=s.v1;if(p.type==='e'){s.v1=(a-b)/(a+b)*u;s.v2=2*a/(a+b)*u}else{s.v1=s.v2=a*u/(a+b)}s.x1=s.x2-0.1}
if(p.type==='i'&&s.hit)s.x1=s.x2-0.1;if(s.x2>1.05||s.x1<-0.1)s.run=false},
draw(c,s,p){bg(c);const ox=60,k=820;RR(c,40,330,920,22,4,G(c,0,330,0,352,['#c9d1db','#6f7b8c']));for(let i=0;i<40;i++){c.beginPath();c.arc(60+i*22.5,341,2,0,7);c.fillStyle='#3b4451';c.fill()}
const gl=(x,m,col,lab,v)=>{const w=60+m*120,X=ox+x*k;RR(c,X-w/2,290,w,40,6,col,'rgba(255,255,255,0.4)',1.5);T(c,lab,X,316,{a:'center',s:18,w:700,c:'#0a1018'});T(c,(m*1000)+' g',X,282,{a:'center',s:14,c:C.dim});if(Math.abs(v)>0.005)arrow(c,X,250,X+v*120,250,C.cyan,3);T(c,v.toFixed(2)+' m/s',X,236,{a:'center',s:15,m:1,c:C.cyan})};
gl(s.x1,p.m1,C.amber,'A',s.v1);gl(s.x2,p.m2,C.teal,'B',s.v2);
const pb=p.m1*(s.hit?p.u1:s.v1),pa=p.m1*s.v1+p.m2*s.v2,kb=0.5*p.m1*Math.pow(s.hit?p.u1:s.v1,2),ka=0.5*p.m1*s.v1*s.v1+0.5*p.m2*s.v2*s.v2;
box(c,140,400,330,120,'BEFORE');T(c,'p = '+pb.toFixed(3)+' kg·m/s',160,452,{s:20,w:600,m:1});T(c,'KE = '+(kb*1000).toFixed(1)+' mJ',160,490,{s:20,w:600,m:1});
box(c,530,400,330,120,s.hit?'AFTER':'NOW');T(c,'p = '+pa.toFixed(3)+' kg·m/s',550,452,{s:20,w:600,m:1,c:C.lime});T(c,'KE = '+(ka*1000).toFixed(1)+' mJ',550,490,{s:20,w:600,m:1,c:C.lime});
if(!s.run&&!s.hit)hint(c,'Tap “Launch”');},
readings(s,p){return[['v₁ after',s.hit?s.v1.toFixed(2):'—','m/s'],['v₂ after',s.hit?s.v2.toFixed(2):'—','m/s'],['Momentum after',(p.m1*s.v1+p.m2*s.v2).toFixed(3),'kg·m/s'],['KE lost',s.hit?((1-(p.m1*s.v1*s.v1+p.m2*s.v2*s.v2)/(p.m1*p.u1*p.u1))*100).toFixed(0):'—','%']]},
columns:['Type','m₁ (kg)','m₂ (kg)','u₁ (m/s)','v₁ (m/s)','v₂ (m/s)','p before','p after','KE lost (%)'],
record(s,p){if(!s.hit)return{error:'Launch and let the gliders collide first.'};const pb=p.m1*p.u1,pa=p.m1*s.v1+p.m2*s.v2;return[p.type==='e'?'Elastic':'Inelastic',p.m1,p.m2,p.u1,+s.v1.toFixed(2),+s.v2.toFixed(2),+pb.toFixed(3),+pa.toFixed(3),+((1-(p.m1*s.v1*s.v1+p.m2*s.v2*s.v2)/(p.m1*p.u1*p.u1))*100).toFixed(0)]},
plot:{x:6,y:7},
result(rows){return'Momentum before = momentum after in every collision.   ·   KE is conserved only in elastic collisions (KE lost ≈ 0 %).'}};

/* 4 ─ SHM spring–mass */
S.shm={title:'Spring–Mass Oscillator (SHM)',topic:'mech',grades:[11],
aim:'Study simple harmonic motion of a mass on a spring; show that T² ∝ m and find the spring constant k.',
apparatus:['Spring with frictionless trolley','Slotted masses','Stopwatch','Displacement sensor'],
formula:'T = 2π √(m / k)      T² = (4π² / k) m      x = A sin(ωt)',
procedure:['Choose the spring and the mass.','Tap “Pull & release”. The stopwatch counts 10 oscillations.','Record when 10 oscillations are complete.','Repeat for 4–5 masses.','Plot T² against m; k = 4π² / slope.'],
controls:[{k:'m',label:'Mass m',type:'range',min:100,max:1000,step:100,def:400,unit:'g'},{k:'k',label:'Spring',type:'select',def:20,options:[[10,'k = 10 N/m'],[20,'k = 20 N/m'],[40,'k = 40 N/m']]},{k:'A',label:'Amplitude',type:'range',min:2,max:10,step:1,def:6,unit:'cm'}],
actions:[{label:'Pull & release',run(s,p){Object.assign(s,{x:p.A/100,v:0,t:0,n:0,run:true,last:1,trace:[],t0:null,T10:0})}}],
init(){return{x:0,v:0,t:0,n:0,run:false,last:1,trace:[]}},
onChange(s){Object.assign(s,{x:0,v:0,t:0,n:0,run:false,trace:[],t0:null,T10:0})},
step(s,p,dt){if(!s.run)return;const m=p.m/1000,N=10,h=dt/N;for(let i=0;i<N;i++){const a=-p.k/m*s.x;s.v+=a*h;s.x+=s.v*h;s.t+=h;const sg=Math.sign(s.x)||s.last;if(sg>0&&s.last<0&&s.n<10){if(s.t0==null){s.t0=s.t}else{s.n++}}s.last=sg}if(s.t0!=null&&s.n<10)s.T10=s.t-s.t0;s.trace.push([s.t,s.x]);if(s.trace.length>600)s.trace.shift()},
draw(c,s,p){bg(c);const wx=90,eq=420,X=eq+s.x*1500;RR(c,70,140,20,150,3,'#4a5566');RR(c,60,290,880,10,3,'rgba(232,238,247,0.25)');
c.beginPath();c.moveTo(wx,215);const n=16;for(let i=0;i<=n;i++)c.lineTo(wx+(X-60-wx)*i/n,215+(i%2?-18:18)*(i>0&&i<n?1:0));c.lineTo(X-60,215);c.strokeStyle='#c9d3de';c.lineWidth=2.6;c.stroke();
RR(c,X-60,170,120,90,8,G(c,0,170,0,260,['#ffcf7a','#b9741f']),'#6e4512',1.5);T(c,p.m+' g',X,222,{a:'center',s:20,w:700,c:'#2a1a05'});L(c,eq,120,eq,310,'rgba(182,243,92,0.5)',1.5,[5,5]);T(c,'mean',eq,112,{a:'center',s:13,c:C.lime});
box(c,560,330,400,200,'x – t');const ox=575,oy=440;L(c,ox,oy,945,oy,'rgba(255,255,255,0.2)',1);if(s.trace.length>1){const t0=s.trace[0][0];c.beginPath();s.trace.forEach(([t,x],i)=>{const px=ox+(t-t0)*60,py=oy-x*800;i?c.lineTo(px,py):c.moveTo(px,py)});c.strokeStyle=C.amber;c.lineWidth=2.5;c.stroke()}
watch(c,200,430,70,s.T10||0);T(c,'Oscillations: '+s.n+' / 10',350,420,{s:20,w:700,c:C.cyan});if(!s.run)hint(c,'Tap “Pull & release”');},
readings(s,p){const T10=s.n>=10?s.T10:null;return[['Oscillations',s.n,''],['Time for 10',(s.T10||0).toFixed(2),'s'],['Period T',T10?(T10/10).toFixed(3):'—','s'],['T²',T10?Math.pow(T10/10,2).toFixed(3):'—','s²']]},
columns:['m (kg)','k (N/m)','t₁₀ (s)','T (s)','T² (s²)'],
record(s,p){if(s.n<10)return{error:'Wait until 10 oscillations are complete.'};const Tp=s.T10/10;return[p.m/1000,p.k,+s.T10.toFixed(2),+Tp.toFixed(3),+(Tp*Tp).toFixed(3)]},
plot:{x:0,y:4},
result(rows){const ks=rows.map(r=>4*Math.PI*Math.PI*r[0]/r[4]);return'k = 4π²m / T² ≈ '+avg(ks).toFixed(1)+' N/m   ·   T² ∝ m (straight line through origin); T does not depend on amplitude.'}};

/* 5 ─ Doppler effect */
S.doppler={title:'Doppler Effect in Sound',topic:'sound',grades:[11],
aim:'Observe how the frequency heard by a stationary listener changes when a sound source moves towards or away from them.',
apparatus:['Sound source (siren) on a track','Stationary microphone with frequency counter','Speed control'],
formula:'Source approaching: f′ = f v / (v − vₛ)      Source receding: f′ = f v / (v + vₛ)      v (sound) = 340 m/s',
procedure:['Choose the source frequency f.','Set the source speed vₛ and direction.','Watch the wavefronts bunch up in front and spread out behind.','Read f′ on the counter and record.','Repeat for several speeds.'],
controls:[{k:'f',label:'Source frequency f',type:'range',min:200,max:800,step:50,def:500,unit:'Hz'},{k:'vs',label:'Source speed vₛ',type:'range',min:0,max:150,step:10,def:60,unit:'m/s'},{k:'dir',label:'Source moving',type:'select',def:1,options:[[1,'Towards listener'],[-1,'Away from listener']]}],
init(){return{t:0,waves:[],x:0}},
onChange(s){s.waves=[];s.t=0},
step(s,p,dt){s.t+=dt;const sp=p.vs/340*90*p.dir;s.x+=sp*dt;if(s.x>230)s.x=-230;if(s.x<-230)s.x=230;s.acc=(s.acc||0)+dt;if(s.acc>0.18){s.acc=0;s.waves.push({x:400+s.x,t:s.t})}s.waves=s.waves.filter(w=>s.t-w.t<6)},
draw(c,s,p){bg(c);const cy=260;s.waves.forEach(w=>{const r=(s.t-w.t)*90;c.beginPath();c.arc(w.x,cy,r,0,7);c.strokeStyle='rgba(177,140,255,'+cl(0.7-r/700,0.05,0.7)+')';c.lineWidth=2;c.stroke()});
const sx=400+s.x;RR(c,sx-26,cy-18,52,36,8,G(c,0,cy-18,0,cy+18,['#ff8aa8','#b52a52']));if(p.vs>0)arrow(c,sx,cy-40,sx+p.dir*(30+p.vs/2),cy-40,C.rose,3);T(c,'source',sx,cy+42,{a:'center',s:14,c:C.dim});
const lx=880;RR(c,lx-14,cy-30,28,60,12,'#cfd6df');L(c,lx,cy+30,lx,cy+90,'#cfd6df',3);T(c,'listener',lx,cy+110,{a:'center',s:14,c:C.dim});
const fp=this.fp(p);box(c,600,26,370,90,'FREQUENCY COUNTER (listener)');T(c,fp.toFixed(1)+' Hz',785,90,{a:'center',s:34,w:700,m:1,c:fp>p.f+0.5?C.lime:fp<p.f-0.5?C.amber:C.ink});
T(c,fp>p.f+0.5?'Higher pitch than source':fp<p.f-0.5?'Lower pitch than source':'Same pitch',785,140,{a:'center',s:16,c:C.dim});},
fp(p){return p.dir>0?p.f*340/(340-p.vs):p.f*340/(340+p.vs)},
readings(s,p){const fp=this.fp(p);return[['Source f',p.f,'Hz'],['Heard f′',fp.toFixed(1),'Hz'],['Shift f′ − f',(fp-p.f).toFixed(1),'Hz'],['vₛ / v',(p.vs/340).toFixed(3),'']]},
columns:['Direction','vₛ (m/s)','f (Hz)','f′ (Hz)','f′/f'],
record(s,p){const fp=this.fp(p);return[p.dir>0?'Towards':'Away',p.vs,p.f,+fp.toFixed(1),+(fp/p.f).toFixed(3)]},
plot:{x:1,y:3,fit:false},
result(rows){return'Approaching source → f′ > f; receding source → f′ < f. The rise when approaching is larger than the fall when receding at the same speed.'}};

/* 6 ─ Coulomb's law */
S.coulomb={title:"Coulomb's Law — Force Between Charges",topic:'elec',grades:[12],
aim:'Measure the electrostatic force between two point charges and show that F ∝ q₁q₂ and F ∝ 1/r².',
apparatus:['Two small charged conducting spheres','Insulated stands on a scale','Force sensor (torsion balance)'],
formula:'F = k q₁ q₂ / r²      k = 1 / (4πε₀) = 9 × 10⁹ N·m²/C²',
procedure:['Choose the charges q₁ and q₂ (sign included).','Set the separation r.','Read the force and its direction (attraction or repulsion).','Record for 5–6 separations.','Plot F against 1/r²; the line passes through the origin.'],
controls:[{k:'q1',label:'Charge q₁',type:'range',min:-50,max:50,step:10,def:40,unit:'nC'},{k:'q2',label:'Charge q₂',type:'range',min:-50,max:50,step:10,def:30,unit:'nC'},{k:'r',label:'Separation r',type:'range',min:3,max:15,step:1,def:8,unit:'cm'}],
init(){return{}},
F(p){return 9e9*p.q1*1e-9*p.q2*1e-9/Math.pow(p.r/100,2)},
draw(c,s,p){bg(c);const cy=270,k=50,x1=500-p.r*k/2,x2=500+p.r*k/2,F=this.F(p),col=q=>q>0?['#ff9a9a','#b3261e']:q<0?['#9ab8ff','#1e4fb3']:['#d0d6de','#6c7888'];
[[x1,p.q1],[x2,p.q2]].forEach(([x,q])=>{L(c,x,cy+26,x,440,'#8792a3',4);RR(c,x-40,440,80,10,3,'#4a5566');const cc=col(q);ball(c,x,cy,24,cc[0],cc[1]);T(c,(q>0?'+':'')+q+' nC',x,cy-40,{a:'center',s:18,w:700,c:q>0?C.rose:q<0?C.blue:C.dim})});
L(c,x1,cy+70,x2,cy+70,C.dim,1.5);head(c,x1,cy+70,Math.PI,C.dim,9);head(c,x2,cy+70,0,C.dim,9);T(c,'r = '+p.r+' cm',500,cy+92,{a:'center',s:18,w:600,c:C.ink,m:1});
const len=cl(Math.abs(F)*4000,0,160),rep=F>0;if(Math.abs(F)>1e-9){arrow(c,x1-(rep?26:-26),cy,x1-(rep?26+len:-26-len),cy,C.amber,4);arrow(c,x2+(rep?26:-26),cy,x2+(rep?26+len:-26-len),cy,C.amber,4)}
box(c,330,30,340,80,'FORCE SENSOR');T(c,(Math.abs(F)*1000).toFixed(3)+' mN  '+(F>0?'repulsion':F<0?'attraction':''),500,90,{a:'center',s:22,w:700,m:1,c:C.lime});
T(c,'Like charges repel · unlike charges attract · equal and opposite forces (Newton’s 3rd law)',500,520,{a:'center',s:15,c:C.dim});},
readings(s,p){const F=this.F(p);return[['Force |F|',(Math.abs(F)*1000).toFixed(3),'mN'],['Nature',F>0?'Repulsive':F<0?'Attractive':'None',''],['1/r²',(1/Math.pow(p.r/100,2)).toFixed(0),'m⁻²'],['q₁q₂',(p.q1*p.q2),'nC²']]},
columns:['q₁ (nC)','q₂ (nC)','r (cm)','1/r² (m⁻²)','F (mN)'],
record(s,p){if(!p.q1||!p.q2)return{error:'Both charges must be non-zero.'};return[p.q1,p.q2,p.r,+(1/Math.pow(p.r/100,2)).toFixed(0),+(Math.abs(this.F(p))*1000).toFixed(3)]},
plot:{x:3,y:4},
result(rows){const ks=rows.map(r=>r[4]/1000*Math.pow(r[2]/100,2)/Math.abs(r[0]*r[1]*1e-18));return'k = F r² / q₁q₂ ≈ '+(avg(ks)/1e9).toFixed(2)+' × 10⁹ N·m²/C²   ·   F ∝ 1/r² (straight line on the F – 1/r² graph).'}};

/* 7 ─ RC circuit */
S.rc={title:'Charging & Discharging a Capacitor (RC)',topic:'elec',grades:[12],
aim:'Record the voltage across a capacitor while it charges through a resistor and find the time constant τ = RC.',
apparatus:['Battery (6 V)','Resistor R','Electrolytic capacitor C','Two-way key','Voltmeter','Stopwatch'],
formula:'Charging: V = E (1 − e^(−t/RC))      Discharging: V = V₀ e^(−t/RC)      τ = RC (V reaches 63 % of E)',
procedure:['Choose R and C. Note τ = RC.','Tap “Charge” — the stopwatch starts.','Record V every few seconds.','After about 5τ, tap “Discharge” and record again.','Plot V against t; read τ where V = 0.63 E.'],
controls:[{k:'R',label:'Resistor R',type:'select',def:20,options:[[10,'10 kΩ'],[20,'20 kΩ'],[47,'47 kΩ']]},{k:'C',label:'Capacitor C',type:'select',def:220,options:[[100,'100 µF'],[220,'220 µF'],[470,'470 µF']]}],
actions:[{label:'Charge',run(s){s.mode='c';s.t=0;s.V0=s.V}},{label:'Discharge',run(s){s.mode='d';s.t=0;s.V0=s.V}}],
init(){return{V:0,t:0,mode:null,V0:0}},
onChange(s){Object.assign(s,{V:0,t:0,mode:null,V0:0})},
step(s,p,dt){if(!s.mode)return;s.t+=dt;const tau=p.R*1e3*p.C*1e-6;s.V=s.mode==='c'?6-(6-s.V0)*Math.exp(-s.t/tau):s.V0*Math.exp(-s.t/tau)},
draw(c,s,p){bg(c);const col='#d9964a';const w=(a,b,d,e)=>L(c,a,b,d,e,col,4);
w(120,140,520,140);w(120,140,120,420);w(120,420,700,420);w(700,140,700,420);w(520,140,700,140);
RR(c,90,240,60,90,6,'#2d3746','#56627a',2);T(c,'6 V',120,292,{a:'center',s:16,w:700,c:C.amber});
RR(c,280,124,120,32,4,'#e8dcc0','#8a7a52',1.5);[300,325,350,375].forEach((x,i)=>RR(c,x,124,8,32,1,['#a0522d','#000','#ff8c00','#d4af37'][i]));T(c,'R = '+p.R+' kΩ',340,112,{a:'center',s:16,w:600,c:C.ink});
L(c,680,270,720,270,'#cfd6df',5);L(c,680,290,720,290,'#cfd6df',5);c.fillStyle='#0e1621';c.fillRect(696,272,8,16);T(c,'C = '+p.C+' µF',640,284,{a:'right',s:16,w:600});
const q=cl(s.V/6,0,1);for(let i=0;i<Math.round(q*8);i++){T(c,'+',684+i*4.5,264,{s:12,c:C.rose});T(c,'−',684+i*4.5,306,{s:12,c:C.blue})}
meter(c,860,250,60,s.V,0,8,'V',C.lime,s.V.toFixed(2)+' V');L(c,700,200,800,200,'#9fb0c4',2);L(c,700,360,800,360,'#9fb0c4',2);
T(c,s.mode==='c'?'Key → charging':s.mode==='d'?'Key → discharging':'Key open',420,470,{a:'center',s:18,w:600,c:C.cyan});watch(c,300,320,62,s.t);
T(c,'τ = RC = '+(p.R*p.C/1000).toFixed(1)+' s',420,510,{a:'center',s:18,w:700,c:C.amber,m:1});},
readings(s,p){return[['Time t',s.t.toFixed(1),'s'],['Voltage V',s.V.toFixed(2),'V'],['V / E',(s.V/6*100).toFixed(0),'%'],['τ = RC',(p.R*p.C/1000).toFixed(1),'s']]},
columns:['Mode','t (s)','V (V)'],
record(s,p){if(!s.mode)return{error:'Tap “Charge” first.'};return[s.mode==='c'?'Charging':'Discharging',+s.t.toFixed(1),+s.V.toFixed(2)]},
plot:{x:1,y:2,fit:false},
result(rows){const ch=rows.filter(r=>r[0]==='Charging').sort((a,b)=>a[1]-b[1]);for(let i=1;i<ch.length;i++){const a=ch[i-1],b=ch[i];if(a[2]<=3.78&&b[2]>=3.78){const t=a[1]+(3.78-a[2])*(b[1]-a[1])/(b[2]-a[2]);return'V reaches 63 % of E (3.78 V) at t ≈ '+t.toFixed(1)+' s → τ ≈ '+t.toFixed(1)+' s (compare RC).'}}return'Record readings on both sides of 3.78 V (63 % of E) to find τ.'}};

/* 8 ─ Photoelectric effect */
S.photoelectric={title:'Photoelectric Effect — Planck’s Constant',topic:'modern',grades:[12],
aim:'Find the stopping potential for light of different frequencies; determine Planck’s constant and the work function of the metal.',
apparatus:['Vacuum photocell','Monochromatic light source with filters','Variable retarding voltage','Micro-ammeter','Voltmeter'],
formula:'h f = φ + e V₀      V₀ = (h / e) f − φ / e      f = c / λ',
procedure:['Choose the metal and the wavelength λ.','Increase the retarding voltage until the photocurrent just becomes zero.','Record this stopping potential V₀.','Repeat for 4–5 wavelengths. Change intensity: V₀ does not change.','Plot V₀ against f: slope = h/e, x-intercept = threshold frequency.'],
controls:[{k:'met',label:'Metal',type:'select',def:2.28,options:[[2.28,'Sodium (φ 2.28 eV)'],[2.9,'Calcium (φ 2.9 eV)'],[4.3,'Zinc (φ 4.3 eV)']]},{k:'lam',label:'Wavelength λ',type:'range',min:200,max:650,step:10,def:400,unit:'nm'},{k:'I',label:'Intensity',type:'range',min:10,max:100,step:10,def:60,unit:'%'},{k:'V',label:'Retarding voltage',type:'range',min:0,max:4,step:0.02,def:0,unit:'V'}],
init(){return{e:[]}},
E(p){return 1240/p.lam},V0(p){return this.E(p)-p.met},
cur(p){const v0=this.V0(p);if(v0<=0)return 0;return p.I*0.5*cl((v0-p.V)/Math.max(v0,0.3),0,1)},
step(s,p,dt){const i=this.cur(p);if(Math.random()<i*dt*0.6)s.e.push({x:0,v0:Math.sqrt(Math.max(this.V0(p),0)),y:(Math.random()-0.5)*70});s.e.forEach(e=>{const a=-p.V*0.9;e.v=(e.v==null?e.v0*2.2:e.v+a*dt);e.x+=e.v*dt*90});s.e=s.e.filter(e=>e.x>=0&&e.x<330)},
draw(c,s,p){bg(c);const hue=p.lam<380?'#b18cff':p.lam<450?'#6f5bff':p.lam<495?'#3aa0ff':p.lam<570?'#4ade80':p.lam<590?'#facc15':'#f97316';
c.beginPath();c.ellipse(500,260,280,130,0,0,7);c.fillStyle='rgba(180,200,230,0.06)';c.fill();c.strokeStyle='rgba(200,220,240,0.4)';c.lineWidth=2;c.stroke();
RR(c,300,190,24,140,4,'#9aa5b4');T(c,'cathode',312,350,{a:'center',s:14,c:C.dim});RR(c,660,190,14,140,4,'#d9964a');T(c,'anode',667,350,{a:'center',s:14,c:C.dim});
c.save();c.globalAlpha=p.I/140;c.fillStyle=hue;P(c,[[60,90],[110,70],[322,200],[322,320]],hue);c.restore();T(c,'λ = '+p.lam+' nm',90,60,{s:18,w:700,c:hue});
s.e.forEach(e=>{c.beginPath();c.arc(326+e.x,260+e.y,4,0,7);c.fillStyle=C.cyan;c.fill()});
const i=this.cur(p);box(c,720,30,250,80,'MICRO-AMMETER');T(c,i.toFixed(2)+' µA',845,92,{a:'center',s:28,w:700,m:1,c:i>0?C.lime:C.rose});
box(c,720,130,250,70,'RETARDING V');T(c,p.V.toFixed(2)+' V',845,184,{a:'center',s:24,w:700,m:1,c:C.amber});
T(c,'Photon energy hf = '+this.E(p).toFixed(2)+' eV   ·   Work function φ = '+p.met+' eV',500,450,{a:'center',s:18,w:600});
T(c,this.V0(p)<=0?'Below threshold — NO electrons at any intensity':'Electrons emitted instantly; brighter light → more electrons, not faster ones',500,485,{a:'center',s:17,c:this.V0(p)<=0?C.rose:C.dim});},
readings(s,p){return[['Frequency f',(3e8/(p.lam*1e-9)/1e14).toFixed(2),'× 10¹⁴ Hz'],['Photon energy',this.E(p).toFixed(2),'eV'],['Photocurrent',this.cur(p).toFixed(2),'µA'],['Retarding V',p.V.toFixed(2),'V']]},
columns:['λ (nm)','f (10¹⁴ Hz)','V₀ (V)'],
record(s,p){const v0=this.V0(p);if(v0<=0)return{error:'No photoemission — this light is below the threshold frequency.'};if(this.cur(p)>0)return{error:'Increase the retarding voltage until the current just becomes zero.'};if(p.V-v0>0.1)return{error:'Too far — reduce V to the value where the current just becomes zero.'};return[p.lam,+(3e8/(p.lam*1e-9)/1e14).toFixed(2),+p.V.toFixed(2)]},
plot:{x:1,y:2},
result(rows){const f=lin(rows.map(r=>[r[1]*1e14,r[2]]));if(!f||rows.length<2)return'Record at least two wavelengths.';const h=f.b*1.602e-19;return'h = e × slope ≈ '+(h*1e34).toFixed(2)+' × 10⁻³⁴ J·s   ·   φ ≈ '+(-f.a).toFixed(2)+' eV   ·   threshold f₀ ≈ '+((-f.a/f.b)/1e14).toFixed(2)+' × 10¹⁴ Hz'}};

/* 9 ─ Radioactive decay */
S.decay={title:'Radioactive Decay — Half-life',topic:'modern',grades:[12],
aim:'Watch a sample of unstable nuclei decay at random; record the number left with time and find the half-life.',
apparatus:['Sample of 400 unstable nuclei (model)','Counter','Stopwatch'],
formula:'N = N₀ e^(−λt)      T½ = ln 2 / λ = 0.693 / λ',
procedure:['Choose the isotope (half-life).','Tap “Start”. Each nucleus decays at random.','Record N at regular time intervals.','Plot N against t (curve) — or ln N against t (straight line).','Find the time for N to halve. Reset and repeat: each run differs slightly — decay is random.'],
controls:[{k:'hl',label:'Isotope half-life',type:'select',def:4,options:[[2,'Isotope A (2 s)'],[4,'Isotope B (4 s)'],[8,'Isotope C (8 s)']]}],
actions:[{label:'Start / pause',run(s){s.run=!s.run}}],
init(){const n=[];for(let i=0;i<400;i++)n.push(1);return{n,t:0,run:false,N:400}},
onChange(s){Object.assign(s,this.init())},
step(s,p,dt){if(!s.run||s.N===0)return;s.t+=dt;const pr=1-Math.exp(-Math.LN2/p.hl*dt);let N=0;for(let i=0;i<400;i++){if(s.n[i]&&Math.random()<pr)s.n[i]=0;N+=s.n[i]}s.N=N},
draw(c,s,p){bg(c);for(let i=0;i<400;i++){const x=80+(i%25)*18,y=70+Math.floor(i/25)*24;c.beginPath();c.arc(x,y,7,0,7);c.fillStyle=s.n[i]?C.amber:'rgba(141,155,176,0.18)';c.fill()}
T(c,'● undecayed   ○ decayed',300,480,{a:'center',s:16,c:C.dim});box(c,600,60,360,110,'COUNTER');T(c,'N = '+s.N,780,135,{a:'center',s:40,w:700,m:1,c:C.lime});watch(c,780,320,80,s.t);
T(c,'N / N₀ = '+(s.N/4).toFixed(0)+' %',780,450,{a:'center',s:22,w:700,c:C.amber});if(!s.run&&s.t===0)hint(c,'Tap “Start / pause”');},
readings(s,p){return[['Time t',s.t.toFixed(1),'s'],['Undecayed N',s.N,''],['ln N',s.N?Math.log(s.N).toFixed(3):'—',''],['N / N₀',(s.N/400).toFixed(3),'']]},
columns:['t (s)','N','ln N'],
record(s,p){if(s.t===0)return{error:'Start the counter first.'};if(!s.N)return{error:'All nuclei have decayed.'};return[+s.t.toFixed(1),s.N,+Math.log(s.N).toFixed(3)]},
plot:{x:0,y:1,fit:false},
result(rows){const pts=[[0,Math.log(400)],...rows.map(r=>[r[0],r[2]])];const f=lin(pts);if(!f||rows.length<2)return'Record at least two readings.';const lam=-f.b;return'λ ≈ '+lam.toFixed(3)+' s⁻¹   ·   T½ = 0.693 / λ ≈ '+(Math.LN2/lam).toFixed(2)+' s (ln N – t is a straight line)'}};

/* 10 ─ LCR series resonance */
S.lcr={title:'Series LCR Circuit — Resonance',topic:'elec',grades:[12],
aim:'Vary the frequency of an AC source in a series LCR circuit, plot current against frequency and find the resonant frequency.',
apparatus:['AC signal generator (5 V rms)','Inductor L = 100 mH','Capacitor C','Resistor R','AC milliammeter'],
formula:'Z = √(R² + (X_L − X_C)²)      X_L = 2πfL      X_C = 1 / (2πfC)      f₀ = 1 / (2π√(LC))',
procedure:['Choose C and R.','Vary the frequency f in steps.','Record the current at each frequency.','Plot I against f; the peak is at resonance f₀.','Compare with 1/(2π√LC). A larger R makes the peak flatter (lower Q).'],
controls:[{k:'C',label:'Capacitor C',type:'select',def:2.2,options:[[1,'1 µF'],[2.2,'2.2 µF'],[4.7,'4.7 µF']]},{k:'R',label:'Resistor R',type:'select',def:20,options:[[20,'20 Ω'],[50,'50 Ω'],[100,'100 Ω']]},{k:'f',label:'Frequency f',type:'range',min:100,max:1200,step:10,def:300,unit:'Hz'}],
init(){return{t:0}},step(s,p,dt){s.t+=dt},
Z(p){const XL=2*Math.PI*p.f*0.1,XC=1/(2*Math.PI*p.f*p.C*1e-6);return{XL,XC,Z:Math.sqrt(p.R*p.R+Math.pow(XL-XC,2))}},
draw(c,s,p){bg(c);const col='#d9964a',w=(a,b,d,e)=>L(c,a,b,d,e,col,4);w(120,120,880,120);w(120,120,120,400);w(120,400,880,400);w(880,120,880,400);
c.beginPath();c.arc(120,260,36,0,7);c.fillStyle='#1d2733';c.fill();c.strokeStyle='#9fb0c4';c.lineWidth=2;c.stroke();c.beginPath();for(let i=0;i<=40;i++){const x=96+i*1.2,y=260-Math.sin(i/40*2*Math.PI)*14;i?c.lineTo(x,y):c.moveTo(x,y)}c.strokeStyle=C.lime;c.stroke();T(c,'~ 5 V',60,320,{s:16,c:C.lime});
c.fillStyle='#0e1621';c.fillRect(260,104,140,32);c.beginPath();for(let i=0;i<6;i++)c.arc(275+i*22,120,11,Math.PI,0);c.strokeStyle=col;c.lineWidth=4;c.stroke();T(c,'L = 100 mH',330,94,{a:'center',s:16,w:600});
c.fillStyle='#0e1621';c.fillRect(470,104,40,32);L(c,482,96,482,144,'#cfd6df',5);L(c,498,96,498,144,'#cfd6df',5);T(c,'C = '+p.C+' µF',490,170,{a:'center',s:16,w:600});
RR(c,600,106,110,28,4,'#e8dcc0','#8a7a52',1.5);T(c,'R = '+p.R+' Ω',655,94,{a:'center',s:16,w:600});
const z=this.Z(p),I=5/z.Z*1000;meter(c,500,300,70,I,0,250,'mA',C.lime,I.toFixed(1)+' mA');
const f0=1/(2*Math.PI*Math.sqrt(0.1*p.C*1e-6));box(c,640,200,320,170,'');T(c,'X_L = '+z.XL.toFixed(0)+' Ω',660,240,{s:20,w:600,m:1,c:C.cyan});T(c,'X_C = '+z.XC.toFixed(0)+' Ω',660,280,{s:20,w:600,m:1,c:C.violet});T(c,'Z = '+z.Z.toFixed(0)+' Ω',660,320,{s:20,w:600,m:1,c:C.amber});T(c,Math.abs(z.XL-z.XC)<p.R?'≈ resonance (X_L ≈ X_C)':(z.XL>z.XC?'inductive':'capacitive'),660,352,{s:16,c:C.dim});
T(c,'f = '+p.f+' Hz',300,470,{a:'center',s:22,w:700,c:C.amber,m:1});},
readings(s,p){const z=this.Z(p);return[['Frequency f',p.f,'Hz'],['Current I',(5/z.Z*1000).toFixed(1),'mA'],['Impedance Z',z.Z.toFixed(0),'Ω'],['X_L − X_C',(z.XL-z.XC).toFixed(0),'Ω']]},
columns:['f (Hz)','X_L (Ω)','X_C (Ω)','Z (Ω)','I (mA)'],
record(s,p){const z=this.Z(p);return[p.f,+z.XL.toFixed(0),+z.XC.toFixed(0),+z.Z.toFixed(0),+(5/z.Z*1000).toFixed(1)]},
plot:{x:0,y:4,fit:false},
result(rows){if(rows.length<3)return'Record at least three frequencies around the peak.';const b=[...rows].sort((a,c)=>c[4]-a[4])[0];return'Peak current at f ≈ '+b[0]+' Hz (resonance: X_L = X_C).'}};

window.LabParts=(window.LabParts||0)+1;
})();
(window.LabExtra=window.LabExtra||[]).push({order:['projectile','circular','collision','shm','doppler','coulomb','rc','photoelectric','decay','lcr'],
syl:{9:[['Conservation of momentum (collisions)','collision']],11:[['Projectile motion: range & angle','projectile'],['Uniform circular motion: centripetal force','circular'],['Collisions & conservation of momentum','collision'],['SHM: spring–mass oscillator','shm'],['Doppler effect','doppler']],12:[["Coulomb's law",'coulomb'],['RC circuit: charging & discharging','rc'],['Photoelectric effect: h and φ','photoelectric'],['Radioactive decay: half-life','decay'],['Series LCR resonance','lcr']]}});


/* a774a8e7-4eee-5d84-9f9f-1686ab8493ca */
(function(){
const K=window.LabKit;const {W,H,R,C,T,L,P,RR,G,ball,head,arc,room,meter,watch,cl,avg,hint}=K;
const S=window.LabSims;const bg=c=>room(c,false);
const z=v=>Math.abs(v)<5e-4?0:v;
const lin=pts=>{const n=pts.length,sx=pts.reduce((a,p)=>a+p[0],0),sy=pts.reduce((a,p)=>a+p[1],0),sxx=pts.reduce((a,p)=>a+p[0]*p[0],0),sxy=pts.reduce((a,p)=>a+p[0]*p[1],0),d=n*sxx-sx*sx;if(n<2||Math.abs(d)<1e-12)return null;const b=(n*sxy-sx*sy)/d;return{b,a:(sy-b*sx)/n}};
const box=(c,x,y,w,h,title)=>{RR(c,x,y,w,h,10,'rgba(10,12,16,0.75)','rgba(255,255,255,0.12)',1);if(title)T(c,title,x+12,y+22,{s:14,w:600,c:C.dim})};
const arrow=(c,x1,y1,x2,y2,col,w)=>{if(Math.hypot(x2-x1,y2-y1)<2)return;L(c,x1,y1,x2,y2,col,w||3);head(c,x2,y2,Math.atan2(y2-y1,x2-x1),col,14)};
const CU='#d9964a',wire=(c,pts,col)=>{c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.strokeStyle=col||CU;c.lineWidth=4;c.lineJoin='round';c.stroke()};
const res=(c,x,y,w,lab,vert)=>{if(vert){RR(c,x-13,y,26,w,4,'#e8dcc0','#8a7a52',1.5);T(c,lab,x+22,y+w/2+6,{s:16,w:600})}else{RR(c,x,y-13,w,26,4,'#e8dcc0','#8a7a52',1.5);T(c,lab,x+w/2,y-22,{a:'center',s:16,w:600})}};
const cell=(c,x,y,lab,vert)=>{c.fillStyle='#141518';if(vert){c.fillRect(x-20,y-10,40,20);L(c,x-20,y-6,x+20,y-6,'#e8eef7',3);L(c,x-10,y+6,x+10,y+6,'#e8eef7',5);T(c,lab,x+28,y+6,{s:16,w:700,c:C.amber})}else{c.fillRect(x-10,y-20,20,40);L(c,x-6,y-20,x-6,y+20,'#e8eef7',3);L(c,x+6,y-10,x+6,y+10,'#e8eef7',5);T(c,lab,x,y-28,{a:'center',s:16,w:700,c:C.amber})}};
const fmt=(v,d)=>{const a=Math.abs(v);if(a===0)return'0';if(a>=1e4||a<1e-3){const e=Math.floor(Math.log10(a));return(v/Math.pow(10,e)).toFixed(2)+'×10^'+e}return v.toFixed(d==null?3:d)};

/* ── FORCES & MOTION ─────────────────────────────── */
S.newton2={title:"Newton's Second Law — F = ma",topic:'mech',grades:[9,11],
aim:'Pull a trolley with different hanging weights, measure its acceleration and show that a ∝ F (mass fixed), i.e. F = ma.',
apparatus:['Low-friction trolley on a track','Pulley, string and slotted masses (hanger)','Two light gates 1 m apart / stopwatch','Metre scale'],
formula:'F = m a      a = 2s / t²      1 N = 1 kg·m/s²   ·   1 dyne = 1 g·cm/s² = 10⁻⁵ N',
procedure:['Choose the trolley mass.','Choose the hanging mass — its weight is the pulling force F.','Tap “Release” and time the trolley over 1 m.','Record t; a = 2s/t² is calculated.','Repeat for 5 forces and plot F against a. Slope = total mass.'],
controls:[{k:'M',label:'Trolley mass',type:'select',def:1,options:[[0.5,'0.5 kg'],[1,'1.0 kg'],[2,'2.0 kg']]},{k:'mh',label:'Hanging mass',type:'range',min:10,max:100,step:10,def:50,unit:'g'}],
actions:[{label:'Release',run(s){Object.assign(s,{x:0,v:0,t:0,run:true,done:false})}},{label:'Reset trolley',run(s){Object.assign(s,{x:0,v:0,t:0,run:false,done:false})}}],
init(){return{x:0,v:0,t:0,run:false,done:false}},onChange(s){Object.assign(s,{x:0,v:0,t:0,run:false,done:false})},
acc(p){const m=p.mh/1000;return m*9.8/(p.M+m)},
step(s,p,dt){if(!s.run)return;const a=this.acc(p);s.t+=dt;s.x=0.5*a*s.t*s.t;if(s.x>=1){s.x=1;s.t=Math.sqrt(2/a);s.run=false;s.done=true}},
draw(c,s,p){bg(c);const x0=120,k=640,ty=300;RR(c,90,ty,760,14,4,G(c,0,ty,0,ty+14,['#c9d1db','#6f7b8c']));RR(c,850,ty-60,14,74,3,'#6f7b8c');c.beginPath();c.arc(857,ty-6,14,0,7);c.fillStyle='#9aa5b4';c.fill();
[0,1].forEach(g=>{const gx=x0+40+g*k;L(c,gx,ty-110,gx,ty-6,'rgba(79,214,255,0.6)',2,[6,4]);T(c,g?'gate B (1 m)':'gate A',gx,ty-118,{a:'center',s:14,c:C.cyan})});
const tx=x0+s.x*k,tw=60+p.M*30;RR(c,tx,ty-46,tw,40,6,G(c,0,ty-46,0,ty-6,['#ffcf7a','#b9741f']),'#6e4512',1.5);[tx+12,tx+tw-12].forEach(wx=>{c.beginPath();c.arc(wx,ty-4,8,0,7);c.fillStyle='#2d3746';c.fill()});T(c,p.M+' kg',tx+tw/2,ty-20,{a:'center',s:16,w:700,c:'#2a1a05'});
L(c,tx+tw,ty-26,857,ty-20,'#e8eef7',1.5);const hy=ty+40+s.x*k*0.25;L(c,871,ty-6,871,hy,'#e8eef7',1.5);RR(c,856,hy,30,14+p.mh/5,3,'#8f9aa8','#56627a',1);T(c,p.mh+' g',900,hy+16,{s:16,w:600,c:C.amber});
arrow(c,tx+tw+4,ty-60,tx+tw+60,ty-60,C.rose,3);T(c,'F = '+(p.mh/1000*9.8).toFixed(3)+' N',tx+tw+66,ty-54,{s:16,w:700,c:C.rose});
watch(c,240,450,58,s.t);box(c,520,400,340,110,'');T(c,'a = 2s / t² = '+(s.done?(2/(s.t*s.t)).toFixed(3):'—')+' m/s²',540,446,{s:20,w:700,m:1,c:C.lime});T(c,'s = 1.00 m',540,482,{s:18,m:1,c:C.dim});
if(!s.run&&!s.done)hint(c,'Tap “Release”');},
readings(s,p){return[['Force F = mg',(p.mh/1000*9.8).toFixed(3),'N'],['Time t (1 m)',s.done?s.t.toFixed(2):'—','s'],['Acceleration a',s.done?(2/(s.t*s.t)).toFixed(3):'—','m/s²'],['Total mass',(p.M+p.mh/1000).toFixed(2),'kg']]},
columns:['M (kg)','F (N)','t (s)','a (m/s²)'],
record(s,p){if(!s.done)return{error:'Release the trolley and let it cross gate B first.'};return[p.M,+(p.mh/1000*9.8).toFixed(3),+s.t.toFixed(2),+(2/(s.t*s.t)).toFixed(3)]},
plot:{x:3,y:1},
result(rows){const f=lin(rows.map(r=>[r[3],r[1]]));return f&&rows.length>1?'Slope of F–a ≈ '+f.b.toFixed(2)+' kg ≈ total moving mass → F = ma.  Double the force → double the acceleration.':''}};

S.inertia={title:'Inertia — Passenger in a Braking Bus',topic:'mech',grades:[9],
aim:'See why a passenger lurches forward when a bus brakes: the body tends to continue its motion (Newton’s first law). Find the braking rate at which a block on the floor starts to slide.',
apparatus:['Trolley (bus) carrying a loose block (passenger)','Brake control','Surfaces of different friction'],
formula:'Block stays with the bus if a ≤ μ g      Block slides forward if a > μ g      (no forward force acts on it!)',
procedure:['Choose the floor surface (μ).','Set the braking deceleration a.','Tap “Drive & brake”.','Record whether the block slides forward.','Find the smallest a at which it slides; compare with μg. Try “Start suddenly”: the block slides backward.'],
controls:[{k:'mu',label:'Floor surface',type:'select',def:0.3,options:[[0.15,'Smooth (μ 0.15)'],[0.3,'Rubber mat (μ 0.3)'],[0.5,'Rough (μ 0.5)']]},{k:'a',label:'Braking deceleration',type:'range',min:1,max:8,step:0.5,def:4,unit:'m/s²'},{k:'mode',label:'Event',type:'select',def:'b',options:[['b','Brake suddenly'],['s','Start suddenly']]}],
actions:[{label:'Drive & brake',run(s,p){Object.assign(s,{t:0,run:true,X:0,V:p.mode==='b'?6:0,rel:0,rv:0,done:false})}}],
init(){return{t:0,run:false,X:0,V:0,rel:0,rv:0,done:false}},onChange(s){Object.assign(s,this.init())},
step(s,p,dt){if(!s.run)return;s.t+=dt;let A=0;if(p.mode==='b'){A=s.t>1?-p.a:0;}else{A=s.t>0.6&&s.V<8?p.a:0}
s.V=Math.max(0,s.V+A*dt);if(p.mode==='b'&&s.V===0)A=0;s.X+=s.V*dt;
const slip=Math.abs(A)>p.mu*9.8;if(slip||Math.abs(s.rv)>1e-3){const fr=-Math.sign(s.rv||-A)*p.mu*9.8;s.rv+=(-A+fr)*dt;if(Math.sign(s.rv)!==Math.sign(-A)&&!slip)s.rv=0}s.rel=cl(s.rel+s.rv*dt,-1.2,1.2);
if(s.t>4){s.run=false;s.done=true}},
draw(c,s,p){bg(c);L(c,40,420,960,420,'rgba(232,238,247,0.25)',2);const bx=260+((s.X*30)%300)*0;RR(c,240,250,460,150,14,G(c,0,250,0,400,['#ffcf7a','#c47f1e']),'#6e4512',2);[300,640].forEach(w=>{c.beginPath();c.arc(w,402,24,0,7);c.fillStyle='#2d3746';c.fill();c.beginPath();c.arc(w,402,9,0,7);c.fillStyle='#9aa5b4';c.fill()});
RR(c,260,270,420,110,8,'#1d2733');const ox=470+s.rel*150;RR(c,ox-30,320,60,60,6,G(c,0,320,0,380,['#9ab8ff','#3a5fb3']));c.beginPath();c.arc(ox,300,18,0,7);c.fillStyle='#ffd7b0';c.fill();
T(c,'Bus speed '+(s.V*3.6).toFixed(0)+' km/h',470,230,{a:'center',s:20,w:700,m:1,c:C.amber});
for(let i=0;i<12;i++){const lx=((i*90-s.X*60)%1000+1000)%1000;L(c,lx,440,lx+40,440,'rgba(232,238,247,0.2)',3)}
if(s.run&&Math.abs(s.rv)>0.01)T(c,s.rv>0?'Block slides FORWARD — it keeps moving (inertia of motion)':'Block slides BACKWARD — it stays at rest (inertia of rest)',500,120,{a:'center',s:20,w:700,c:C.rose});
box(c,720,40,250,90,'μ g');T(c,(p.mu*9.8).toFixed(2)+' m/s²',845,104,{a:'center',s:28,w:700,m:1,c:C.lime});if(!s.run&&!s.done)hint(c,'Tap “Drive & brake”');},
readings(s,p){return[['μ g (limit)',(p.mu*9.8).toFixed(2),'m/s²'],['Applied a',p.a.toFixed(1),'m/s²'],['Block',Math.abs(s.rel)>0.02?(s.rel>0?'Slid forward':'Slid back'):'Stayed',''],['Slide distance',(Math.abs(s.rel)*60).toFixed(0),'cm']]},
columns:['Surface μ','a (m/s²)','μg (m/s²)','Block'],
record(s,p){if(!s.done)return{error:'Run the bus first (wait until it finishes).'};return[p.mu,p.a,+(p.mu*9.8).toFixed(2),Math.abs(s.rel)>0.02?'Slides':'Stays']},
result(rows){const g={};rows.forEach(r=>{(g[r[0]]=g[r[0]]||[]).push(r)});return Object.keys(g).map(k=>{const sl=g[k].filter(r=>r[3]==='Slides').map(r=>r[1]),st=g[k].filter(r=>r[3]==='Stays').map(r=>r[1]);return'μ '+k+': slides for a > '+(st.length?Math.max(...st):'?')+' m/s² (μg = '+(k*9.8).toFixed(2)+')'}).join('   ·   ')}};

S.lift={title:'Apparent Weight in a Lift',topic:'mech',grades:[9,11],
aim:'Read a spring balance holding a mass inside a lift that accelerates up, down, moves uniformly or falls freely; relate the reading to R = m(g ± a).',
apparatus:['Lift (elevator) model','Spring balance (newton scale)','Known mass'],
formula:'Accelerating up: R = m(g + a)      Accelerating down: R = m(g − a)      Uniform velocity: R = mg      Free fall: R = 0',
procedure:['Choose the mass m.','Choose the motion of the lift and its acceleration a.','Read the spring balance (apparent weight).','Record and repeat for each motion.','Plot R against a (up = +, down = −); slope = m, intercept = mg.'],
controls:[{k:'m',label:'Mass m',type:'range',min:1,max:10,step:1,def:5,unit:'kg'},{k:'mot',label:'Lift motion',type:'select',def:'up',options:[['rest','At rest'],['uni','Uniform velocity'],['up','Accelerating up'],['dn','Accelerating down'],['ff','Free fall (cable cut)']]},{k:'a',label:'Acceleration a',type:'range',min:0,max:6,step:0.5,def:2,unit:'m/s²'}],
init(){return{y:0,t:0}},step(s,p,dt){s.t+=dt;const v=p.mot==='up'?1:p.mot==='dn'?-1:p.mot==='uni'?0.6:p.mot==='ff'?-2:0;s.y=((s.y+v*dt*40)%200+200)%200},
ae(p){return p.mot==='up'?p.a:p.mot==='dn'?-p.a:p.mot==='ff'?-9.8:0},
draw(c,s,p){bg(c);L(c,300,20,300,540,'rgba(232,238,247,0.15)',2);L(c,560,20,560,540,'rgba(232,238,247,0.15)',2);for(let i=-1;i<4;i++){const fy=((i*200+s.y)%800+800)%800-100;L(c,240,fy,620,fy,'rgba(232,238,247,0.12)',2)}
RR(c,320,120,220,320,10,'rgba(40,46,56,0.95)','#9aa5b4',2);if(p.mot!=='ff')L(c,430,20,430,120,'#cfd6df',3);else{L(c,430,20,430,60,'#cfd6df',3);T(c,'✂',440,80,{s:22,c:C.rose})}
const Rn=p.m*(9.8+this.ae(p)),ext=cl(Rn*3,0,150);L(c,430,140,430,160,'#cfd6df',3);RR(c,410,160,40,40+ext*0.4,6,'#e8dcc0','#8a7a52');c.beginPath();for(let i=0;i<=10;i++)c.lineTo(430+(i%2?10:-10),200+i*(ext*0.4+20)/10);c.strokeStyle='#5d4312';c.lineWidth=2;c.stroke();
const by=230+ext*0.4;L(c,430,by-10,430,by,'#cfd6df',2);RR(c,395,by,70,50,6,G(c,0,by,0,by+50,['#ffcf7a','#b9741f']));T(c,p.m+' kg',430,by+32,{a:'center',s:18,w:700,c:'#2a1a05'});
const ae=this.ae(p);if(Math.abs(ae)>0.01)arrow(c,600,280,600,280-ae*14,C.cyan,4);T(c,'a = '+(ae>0?'+':'')+ae.toFixed(1),620,286,{s:18,w:700,c:C.cyan});
box(c,690,60,280,110,'SPRING BALANCE');T(c,Rn.toFixed(1)+' N',830,130,{a:'center',s:36,w:700,m:1,c:Math.abs(ae)<0.01?C.ink:ae>0?C.lime:C.amber});T(c,'True weight mg = '+(p.m*9.8).toFixed(1)+' N',830,200,{a:'center',s:17,c:C.dim});
T(c,p.mot==='ff'?'Weightless! Balance reads zero':ae>0?'Feels heavier':ae<0?'Feels lighter':'Normal weight',830,240,{a:'center',s:20,w:700,c:C.rose});},
readings(s,p){const ae=this.ae(p),Rn=p.m*(9.8+ae);return[['Lift acceleration',ae.toFixed(1),'m/s²'],['Apparent weight R',Rn.toFixed(1),'N'],['True weight mg',(p.m*9.8).toFixed(1),'N'],['Apparent mass',(Rn/9.8).toFixed(2),'kgf']]},
columns:['Motion','a (m/s², up +)','R (N)','R / mg'],
record(s,p){const ae=this.ae(p),Rn=p.m*(9.8+ae),nm={rest:'Rest',uni:'Uniform',up:'Acc. up',dn:'Acc. down',ff:'Free fall'};return[nm[p.mot],+ae.toFixed(1),+Rn.toFixed(1),+(Rn/(p.m*9.8)).toFixed(2)]},
plot:{x:1,y:2},
result(rows){const f=lin(rows.map(r=>[r[1],r[2]]));return f&&rows.length>1?'Slope = m ≈ '+f.b.toFixed(2)+' kg;  intercept = mg ≈ '+f.a.toFixed(1)+' N.  Uniform motion gives the true weight; free fall gives zero.':''}};

S.forces={title:'Fundamental Forces — Gravity vs Electric',topic:'modern',grades:[9,11],
aim:'Compare the gravitational and electrostatic forces between two particles at the same distance, and see how much stronger the electric force is.',
apparatus:['Two particles (choose type)','Variable separation (log scale)'],
formula:'F_g = G m₁m₂ / r²   (G = 6.67×10⁻¹¹)      F_e = k q₁q₂ / r²   (k = 9×10⁹)      Both ∝ 1/r², so F_e / F_g is the same at every distance',
procedure:['Choose a pair of particles.','Change the separation r (powers of ten).','Read F_g, F_e and their ratio.','Record for 4–5 distances.','Plot log F against log r: slope −2 for both (inverse-square law).'],
controls:[{k:'pr',label:'Particles',type:'select',def:'pp',options:[['pp','Proton – proton'],['ep','Electron – proton'],['ee','Electron – electron']]},{k:'lr',label:'Separation r = 10^x m',type:'range',min:-15,max:-9,step:0.5,def:-10,unit:''}],
init(){return{}},
par(p){const mp=1.67e-27,me=9.11e-31;return{pp:[mp,mp,1,1],ep:[me,mp,-1,1],ee:[me,me,-1,-1]}[p.pr]},
F(p){const [m1,m2,q1,q2]=this.par(p),r=Math.pow(10,p.lr),e=1.6e-19;return{g:6.67e-11*m1*m2/(r*r),e:9e9*q1*q2*e*e/(r*r)}},
draw(c,s,p){bg(c);const [m1,m2,q1,q2]=this.par(p),f=this.F(p);const pc=(x,q,m,l)=>{ball(c,x,230,m>1e-28?30:16,q>0?'#ff9a9a':'#9ab8ff',q>0?'#b3261e':'#1e4fb3');T(c,l,x,290,{a:'center',s:16,c:C.dim})};
pc(260,q1,m1,p.pr[0]==='p'?'proton':'electron');pc(740,q2,m2,p.pr[1]==='p'?'proton':'electron');L(c,260,330,740,330,C.dim,1.5);T(c,'r = 10^'+p.lr+' m',500,320,{a:'center',s:18,w:600,m:1});
const bar=(y,v,col,lab)=>{const w=cl((Math.log10(Math.abs(v))+60)*9,4,860);RR(c,70,y,w,26,4,col);T(c,lab+'  '+fmt(Math.abs(v))+' N',80,y-8,{s:17,w:700,c:col})};
bar(400,f.g,C.teal,'Gravity (attractive)');bar(470,f.e,C.rose,'Electric ('+(f.e>0?'repulsive':'attractive')+')');T(c,'(bars on a logarithmic scale)',930,530,{a:'right',s:13,c:C.dim});
box(c,330,40,340,100,'F_e / F_g');T(c,fmt(Math.abs(f.e/f.g)),500,110,{a:'center',s:34,w:700,m:1,c:C.amber});
if(p.pr==='pp'&&p.lr<=-14.5)T(c,'At ~1 fm the strong NUCLEAR force (attractive, short-range) holds protons together',500,175,{a:'center',s:17,w:600,c:C.lime});},
readings(s,p){const f=this.F(p);return[['F_gravity',fmt(f.g),'N'],['F_electric',fmt(Math.abs(f.e)),'N'],['F_e / F_g',fmt(Math.abs(f.e/f.g)),''],['log₁₀ F_e',Math.log10(Math.abs(f.e)).toFixed(2),'']]},
columns:['Pair','log₁₀ r','log₁₀ F_g','log₁₀ F_e','F_e/F_g'],
record(s,p){const f=this.F(p);return[{pp:'p–p',ep:'e–p',ee:'e–e'}[p.pr],p.lr,+Math.log10(f.g).toFixed(2),+Math.log10(Math.abs(f.e)).toFixed(2),fmt(Math.abs(f.e/f.g))]},
plot:{x:1,y:3},
result(rows){const f=lin(rows.map(r=>[r[1],r[3]]));return f&&rows.length>1?'Slope of log F – log r ≈ '+f.b.toFixed(2)+' (inverse-square).  The ratio F_e/F_g does not change with distance — gravity is by far the weakest force.':''}};

/* ── ELECTROSTATICS ─────────────────────────────── */
S.charging={title:'Charging by Rubbing & the Electroscope',topic:'elec',grades:[8,12],
aim:'Charge objects by rubbing, find the sign of each charge, check that the charge is a whole number of electrons (Q = ne) and that total charge is conserved.',
apparatus:['Glass rod & silk','Ebonite rod & fur','Balloon & hair','Polythene & wool','Gold-leaf electroscope'],
formula:'Q = ± n e   (e = 1.6 × 10⁻¹⁹ C, n a whole number)      Charge gained by one = charge lost by the other (conservation)',
procedure:['Choose the pair of materials.','Tap “Rub 10 times”. Electrons move from one material to the other.','Touch the rod to the electroscope — the leaves diverge.','Record the charge on each object.','Rub more: Q grows in steps of e; the two charges are always equal and opposite.'],
controls:[{k:'pair',label:'Materials',type:'select',def:'gs',options:[['gs','Glass + silk'],['ef','Ebonite + fur'],['bh','Balloon + hair'],['pw','Polythene + wool']]},{k:'touch',label:'Touch rod to electroscope',type:'toggle',def:true}],
actions:[{label:'Rub 10 times',run(s){s.rubs+=10;s.n+=Math.round(6.25e9*(0.9+Math.random()*0.2))*10;s.anim=1}},{label:'Discharge (earth)',run(s){s.rubs=0;s.n=0}}],
init(){return{rubs:0,n:0,anim:0}},onChange(s,p,k){if(k==='pair'){s.rubs=0;s.n=0}},step(s,p,dt){s.anim=Math.max(0,s.anim-dt)},
info(p){return{gs:['Glass rod','Silk',1],ef:['Ebonite rod','Fur',-1],bh:['Balloon','Hair',-1],pw:['Polythene','Wool',-1]}[p.pair]},
draw(c,s,p){bg(c);const [a,b,sg]=this.info(p),Q=s.n*1.6e-19;const sh=s.anim?Math.sin(s.anim*40)*20:0;
c.save();c.translate(230+sh,200);c.rotate(-0.3);RR(c,-140,-16,280,32,14,p.pair==='gs'?'rgba(200,230,255,0.55)':p.pair==='ef'?'#2b2b2b':p.pair==='bh'?'#e04a6a':'#cfe3ff','#9aa5b4',1.5);const k=Math.min(14,Math.round(s.n/1e10));for(let i=0;i<k;i++)T(c,sg>0?'+':'−',-120+i*18,6,{s:18,w:700,c:sg>0?C.rose:C.blue});c.restore();
RR(c,120,290,180,70,12,p.pair==='gs'?'#e9e4f5':p.pair==='ef'?'#8a6a4a':p.pair==='bh'?'#3b2a1a':'#b9c8d6');for(let i=0;i<Math.min(9,Math.round(s.n/1e10));i++)T(c,sg>0?'−':'+',140+i*17,332,{s:18,w:700,c:sg>0?C.blue:C.rose});
T(c,a,230,160,{a:'center',s:17,w:600});T(c,b,210,385,{a:'center',s:17,w:600});
const ex=680;c.beginPath();c.arc(ex,250,110,Math.PI,0);c.lineTo(ex+110,430);c.lineTo(ex-110,430);c.closePath();c.strokeStyle='rgba(200,220,240,0.4)';c.lineWidth=2;c.stroke();ball(c,ex,110,18,'#e5e9ee','#8792a3');L(c,ex,128,ex,300,'#cfd6df',4);
const ang=p.touch?cl(Math.sqrt(Math.abs(Q)*1e9)*0.35,0,0.9):0;[1,-1].forEach(d=>{c.save();c.translate(ex,300);c.rotate(d*ang);RR(c,-3,0,6,90,2,'#f4c542');c.restore()});T(c,'Gold-leaf electroscope',ex,470,{a:'center',s:16,c:C.dim});
if(p.touch&&s.n)L(c,ex-24,104,420,150,'rgba(255,181,71,0.5)',2,[5,5]);
box(c,380,40,180,64,'');T(c,'n = '+fmt(s.n,0),470,80,{a:'center',s:18,w:700,m:1,c:C.amber});},
readings(s,p){const [a,b,sg]=this.info(p),Q=s.n*1.6e-19;return[['Electrons moved n',fmt(s.n,0),''],['Charge on '+a.split(' ')[0],(sg>0?'+':'−')+(Q*1e9).toFixed(2),'nC'],['Charge on '+b,(sg>0?'−':'+')+(Q*1e9).toFixed(2),'nC'],['Total charge','0.00','nC']]},
columns:['Pair','Rubs','n (electrons)','Q rod (nC)','Q cloth (nC)'],
record(s,p){if(!s.n)return{error:'Rub the materials first.'};const [a,b,sg]=this.info(p),Q=s.n*1.6e-10;return[a.split(' ')[0]+'/'+b,s.rubs,fmt(s.n,0),+(sg*Q).toFixed(3),+(-sg*Q).toFixed(3)]},
result(rows){return'Rod and cloth always carry equal and opposite charges → charge is conserved (only transferred). Q = ne with whole-number n → charge is quantised. Glass becomes +, ebonite/balloon/polythene become −.'}};

/* ── CURRENT ELECTRICITY ───────────────────────── */
S.drift={title:'Drift Velocity of Electrons',topic:'elec',grades:[12],
aim:'See electrons drifting slowly through a wire while moving randomly at high speed; relate current to drift velocity: I = n e A v_d.',
apparatus:['Copper / aluminium wire (magnified)','Battery with variable current','Ammeter'],
formula:'I = n e A v_d      J = I / A = n e v_d      v_d = e E τ / m      mobility μ = v_d / E',
procedure:['Choose the material and the wire thickness.','Set the current I.','Watch the slow drift (orange) against the fast random motion.','Read v_d and record.','Plot v_d against I: straight line. Thicker wire → smaller v_d for the same I.'],
controls:[{k:'mat',label:'Material',type:'select',def:'cu',options:[['cu','Copper'],['al','Aluminium']]},{k:'A',label:'Cross-section A',type:'select',def:1,options:[[0.5,'0.5 mm²'],[1,'1 mm²'],[2,'2 mm²']]},{k:'I',label:'Current I',type:'range',min:0,max:10,step:0.5,def:4,unit:'A'}],
init(){const e=[];for(let i=0;i<70;i++)e.push({x:Math.random()*760,y:Math.random()*120,vx:(Math.random()-0.5)*600,vy:(Math.random()-0.5)*600,tr:0});return{e}},
M(p){return p.mat==='cu'?{n:8.5e28,rho:1.7e-8}:{n:6.0e28,rho:2.8e-8}},
vd(p){return p.I/(this.M(p).n*1.6e-19*p.A*1e-6)},
step(s,p,dt){const d=this.vd(p)*1e3*600;s.e.forEach(e=>{e.tr-=dt;if(e.tr<=0){e.vx=(Math.random()-0.5)*700;e.vy=(Math.random()-0.5)*700;e.tr=0.1+Math.random()*0.1}e.x+=(e.vx-d)*dt;e.y+=e.vy*dt;if(e.y<0){e.y=0;e.vy*=-1}if(e.y>120){e.y=120;e.vy*=-1}e.x=(e.x+760)%760})},
draw(c,s,p){bg(c);const h=60+p.A*40,y0=250-h/2;RR(c,120,y0,760,h,h/2,G(c,0,y0,0,y0+h,[p.mat==='cu'?'#e7a265':'#d8dde4',p.mat==='cu'?'#8a4a22':'#7c8794']));
for(let i=0;i<8;i++)for(let j=0;j<3;j++){c.beginPath();c.arc(160+i*95,y0+h*(j+1)/4,7,0,7);c.fillStyle='rgba(255,255,255,0.35)';c.fill()}
s.e.forEach(e=>{c.beginPath();c.arc(120+e.x,y0+8+e.y/120*(h-16),4,0,7);c.fillStyle=C.cyan;c.fill()});
if(p.I>0){arrow(c,780,y0-40,900,y0-40,C.amber,3);T(c,'Conventional current I',780,y0-54,{s:16,c:C.amber});arrow(c,300,y0+h+40,180,y0+h+40,C.cyan,3);T(c,'electron drift',300,y0+h+60,{a:'right',s:16,c:C.cyan})}
cell(c,500,470,'',false);wire(c,[[120,250],[60,250],[60,470],[490,470]]);wire(c,[[510,470],[940,470],[940,250],[880,250]]);
const v=this.vd(p);box(c,640,40,330,100,'DRIFT VELOCITY');T(c,(v*1000).toFixed(3)+' mm/s',805,105,{a:'center',s:30,w:700,m:1,c:C.lime});
T(c,'Random (thermal) speed ≈ 10⁵ m/s — but the drift is only a fraction of a mm per second!',500,540,{a:'center',s:15,c:C.dim});},
readings(s,p){const m=this.M(p),v=this.vd(p),J=p.I/(p.A*1e-6),E=m.rho*J,tau=9.11e-31/(m.n*Math.pow(1.6e-19,2)*m.rho);return[['Drift velocity v_d',(v*1000).toFixed(3),'mm/s'],['Current density J',fmt(J,0),'A/m²'],['Field E = ρJ',E.toFixed(3),'V/m'],['Relaxation time τ',fmt(tau),'s']]},
columns:['Metal','A (mm²)','I (A)','J (A/m²)','v_d (mm/s)'],
record(s,p){if(!p.I)return{error:'Switch on a current first.'};return[p.mat==='cu'?'Cu':'Al',p.A,p.I,fmt(p.I/(p.A*1e-6),0),+(this.vd(p)*1000).toFixed(3)]},
plot:{x:2,y:4},
result(rows){const r=rows[0];return'v_d ∝ I and v_d ∝ 1/A.  n = I/(eA v_d) ≈ '+fmt(r[2]/(1.6e-19*r[1]*1e-6*r[4]/1000),0)+' electrons/m³ ('+r[0]+').'}};

S.resistivity={title:'Resistance of a Wire — Length, Area, Material, Temperature',topic:'elec',grades:[10,12],
aim:'Measure how the resistance of a wire depends on its length, thickness, material and temperature, and find the resistivity ρ.',
apparatus:['Wires of constantan, nichrome and copper','Metre scale with sliding jockey','Ohmmeter','Water bath (temperature)'],
formula:'R = ρ L / A      A = π d² / 4      R_T = R₀ (1 + α ΔT)      Stretched to n× length (same volume): R → n² R',
procedure:['Choose the material and the diameter.','Set the length L with the jockey.','Read R and record. Repeat for 5 lengths — R ∝ L.','Change the diameter: R ∝ 1/d².','Heat the wire: R rises for metals (almost none for constantan). Try “Stretch 2×”.'],
controls:[{k:'mat',label:'Material',type:'select',def:'ni',options:[['co','Constantan'],['ni','Nichrome'],['cu','Copper']]},{k:'d',label:'Diameter d',type:'select',def:0.3,options:[[0.2,'0.2 mm'],[0.3,'0.3 mm'],[0.5,'0.5 mm']]},{k:'L',label:'Length L',type:'range',min:10,max:100,step:10,def:50,unit:'cm'},{k:'T',label:'Temperature',type:'range',min:20,max:200,step:10,def:20,unit:'°C'},{k:'st',label:'Stretch to 2× length',type:'toggle',def:false}],
init(){return{}},
M(p){return{co:[49e-8,0.00001,'#c9b38a'],ni:[110e-8,0.0004,'#a8b0bb'],cu:[1.7e-8,0.0039,'#e08a4a']}[p.mat]},
R(p){const [rho,al]=this.M(p),L=p.L/100*(p.st?2:1),d=p.d/1000/(p.st?Math.SQRT2:1),A=Math.PI*d*d/4;return rho*(1+al*(p.T-20))*L/A},
draw(c,s,p){bg(c);const [,,col]=this.M(p);RR(c,80,330,840,40,6,'#efe6c8','#b9ab80');for(let cm=0;cm<=100;cm++){const x=100+cm*8;L(c,x,330,x,330+(cm%10?8:16),'#3b3325',cm%10?1:1.5);if(cm%10===0)T(c,cm+'',x,362,{a:'center',s:13,m:1,c:'#3b3325'})}
const L2=p.st?100:p.L,th=Math.max(2,p.d*12/(p.st?1.4:1));L(c,100,300,100+L2*8,300,col,th);if(p.T>20){c.save();c.globalAlpha=cl((p.T-20)/250,0,0.6);L(c,100,300,100+L2*8,300,'#ff5a2a',th+8);c.restore()}
RR(c,100+L2*8-8,260,16,50,4,'#cfd6df');T(c,'jockey',100+L2*8,250,{a:'center',s:14,c:C.dim});T(c,(p.st?'stretched: ':'')+'L = '+(p.st?2*p.L:p.L)+' cm',100,240,{s:18,w:700,c:C.amber});
const Rv=this.R(p);meter(c,500,150,64,Math.min(Rv,40),0,40,'Ω',C.lime,Rv.toFixed(3)+' Ω');
T(c,'d = '+(p.d/(p.st?Math.SQRT2:1)).toFixed(2)+' mm   ·   T = '+p.T+' °C',500,440,{a:'center',s:18,w:600});
if(p.st)T(c,'Stretched to 2× length: area halves → R becomes 4×',500,480,{a:'center',s:18,w:700,c:C.rose});},
readings(s,p){const Rv=this.R(p),[rho,al]=this.M(p);return[['Resistance R',Rv.toFixed(3),'Ω'],['Area A',(Math.PI*Math.pow(p.d/(p.st?Math.SQRT2:1),2)/4).toFixed(4),'mm²'],['ρ at T',fmt(rho*(1+al*(p.T-20))),'Ω·m'],['α',fmt(al),'/°C']]},
columns:['Material','d (mm)','L (cm)','T (°C)','R (Ω)'],
record(s,p){return[{co:'Constantan',ni:'Nichrome',cu:'Copper'}[p.mat]+(p.st?' (2×)':''),+(p.d/(p.st?Math.SQRT2:1)).toFixed(3),p.st?2*p.L:p.L,p.T,+this.R(p).toFixed(3)]},
plot:{x:2,y:4},
result(rows){const r=rows.map(r=>r[4]*Math.PI*Math.pow(r[1]/1000,2)/4/(r[2]/100));return'ρ = RA/L ≈ '+fmt(avg(r))+' Ω·m (mean).  R ∝ L, R ∝ 1/d², and R increases with temperature for metals.'}};

S.seriesParallel={title:'Resistors in Series & Parallel — Voltage and Current Division',topic:'elec',grades:[10,12],
aim:'Connect three resistors in series or in parallel; measure the voltage across and current through each and verify the combination rules.',
apparatus:['Battery (12 V)','Three resistors','Ammeters in each branch','Voltmeter','Connecting wires'],
formula:'Series: R = R₁ + R₂ + R₃, same I, V = V₁ + V₂ + V₃, Vᵢ = I Rᵢ      Parallel: 1/R = 1/R₁ + 1/R₂ + 1/R₃, same V, I = I₁ + I₂ + I₃, Iᵢ = V / Rᵢ',
procedure:['Choose the three resistors.','Choose series or parallel.','Read the total current and every voltage / branch current.','Record.','Check: series voltages add up to 12 V; parallel currents add up to the total.'],
controls:[{k:'mode',label:'Connection',type:'select',def:'s',options:[['s','Series'],['p','Parallel']]},{k:'R1',label:'R₁',type:'select',def:2,options:[[1,'1 Ω'],[2,'2 Ω'],[4,'4 Ω']]},{k:'R2',label:'R₂',type:'select',def:4,options:[[2,'2 Ω'],[4,'4 Ω'],[6,'6 Ω']]},{k:'R3',label:'R₃',type:'select',def:6,options:[[3,'3 Ω'],[6,'6 Ω'],[12,'12 Ω']]}],
init(){return{t:0}},step(s,p,dt){s.t+=dt},
calc(p){const r=[p.R1,p.R2,p.R3];if(p.mode==='s'){const Re=r[0]+r[1]+r[2],I=12/Re;return{Re,I,V:r.map(x=>I*x),Ib:[I,I,I]}}const Re=1/(1/r[0]+1/r[1]+1/r[2]);return{Re,I:12/Re,V:[12,12,12],Ib:r.map(x=>12/x)}},
draw(c,s,p){bg(c);const k=this.calc(p),r=[p.R1,p.R2,p.R3];cell(c,110,300,'12 V',true);
if(p.mode==='s'){wire(c,[[110,290],[110,120],[880,120],[880,470],[110,470],[110,310]]);[0,1,2].forEach(i=>{const x=230+i*220;c.fillStyle='#141518';c.fillRect(x-4,110,128,20);res(c,x,120,120,'R'+(i+1)+' = '+r[i]+' Ω');T(c,k.V[i].toFixed(2)+' V',x+60,165,{a:'center',s:20,w:700,m:1,c:C.lime})})}
else{wire(c,[[110,290],[110,100],[820,100],[820,480],[110,480],[110,310]]);[0,1,2].forEach(i=>{const y=170+i*110;wire(c,[[300,100],[300,y],[700,y],[700,100]].slice(0,4));wire(c,[[300,y],[300,480]]);wire(c,[[700,y],[700,480]]);c.fillStyle='#141518';c.fillRect(440,y-16,130,32);res(c,445,y,120,'R'+(i+1)+' = '+r[i]+' Ω');T(c,k.Ib[i].toFixed(2)+' A',600,y+6,{s:20,w:700,m:1,c:C.lime})})}
box(c,600,400,320,120,'');T(c,'R_eq = '+k.Re.toFixed(2)+' Ω',620,442,{s:22,w:700,m:1,c:C.amber});T(c,'I = '+k.I.toFixed(2)+' A',620,482,{s:22,w:700,m:1,c:C.cyan});
const ph=(s.t*120)%60;for(let x=110+ph;x<880;x+=60)if(p.mode==='s'){c.beginPath();c.arc(x,120,4,0,7);c.fillStyle='rgba(255,181,71,0.8)';c.fill()}},
readings(s,p){const k=this.calc(p);return[['R_eq',k.Re.toFixed(2),'Ω'],['Total I',k.I.toFixed(2),'A'],[p.mode==='s'?'V₁ + V₂ + V₃':'I₁ + I₂ + I₃',p.mode==='s'?(k.V[0]+k.V[1]+k.V[2]).toFixed(2):(k.Ib[0]+k.Ib[1]+k.Ib[2]).toFixed(2),p.mode==='s'?'V':'A'],['Power',(12*k.I).toFixed(1),'W']]},
columns:['Mode','R_eq (Ω)','I (A)','R₁: V or I','R₂: V or I','R₃: V or I'],
record(s,p){const k=this.calc(p),b=p.mode==='s'?k.V:k.Ib;return[p.mode==='s'?'Series (V)':'Parallel (I)',+k.Re.toFixed(2),+k.I.toFixed(2),+b[0].toFixed(2),+b[1].toFixed(2),+b[2].toFixed(2)]},
result(rows){return'Series: same current, voltages add to 12 V and divide in the ratio of R.  Parallel: same voltage, branch currents add to the total and divide in the inverse ratio of R; R_eq is smaller than the smallest resistor.'}};

S.kirchhoff={title:"Kirchhoff's Laws — Two-loop Circuit",topic:'elec',grades:[12],
aim:"Measure the currents in a two-source network and verify Kirchhoff's junction law (ΣI = 0) and loop law (ΣE = ΣIR).",
apparatus:['Two cells E₁ and E₂','Three resistors','Three ammeters','Connecting wires'],
formula:'Junction law: I₁ + I₂ = I₃   (charge conservation)      Loop law: E₁ − I₁R₁ − I₃R₃ = 0,  E₂ − I₂R₂ − I₃R₃ = 0   (energy conservation)',
procedure:['Set E₁, E₂ and the three resistors.','Read I₁, I₂ and I₃ (a negative value means opposite to the arrow).','Record.','Check I₁ + I₂ − I₃ = 0 at the junction.','Check the sum of EMFs equals the sum of IR drops in each loop.'],
controls:[{k:'E1',label:'E₁',type:'range',min:2,max:12,step:1,def:12,unit:'V'},{k:'E2',label:'E₂',type:'range',min:2,max:12,step:1,def:6,unit:'V'},{k:'R1',label:'R₁',type:'select',def:2,options:[[1,'1 Ω'],[2,'2 Ω'],[4,'4 Ω']]},{k:'R2',label:'R₂',type:'select',def:3,options:[[1,'1 Ω'],[3,'3 Ω'],[6,'6 Ω']]},{k:'R3',label:'R₃',type:'select',def:6,options:[[2,'2 Ω'],[6,'6 Ω'],[12,'12 Ω']]}],
init(){return{}},
calc(p){const V=(p.E1/p.R1+p.E2/p.R2)/(1/p.R1+1/p.R2+1/p.R3);return{V,I1:(p.E1-V)/p.R1,I2:(p.E2-V)/p.R2,I3:V/p.R3}},
draw(c,s,p){bg(c);const k=this.calc(p);wire(c,[[150,130],[850,130]]);wire(c,[[150,130],[150,450],[850,450],[850,130]]);wire(c,[[500,130],[500,450]]);
cell(c,150,380,'E₁ = '+p.E1+' V',true);cell(c,850,380,'E₂ = '+p.E2+' V',true);c.fillStyle='#141518';[[150,180],[850,180],[500,230]].forEach(([x,y])=>c.fillRect(x-14,y,28,110));res(c,150,185,100,'R₁ '+p.R1+'Ω',true);res(c,850,185,100,'R₂ '+p.R2+'Ω',true);res(c,500,235,100,'R₃ '+p.R3+'Ω',true);
const lab=(x,y,I,n,dir)=>{const col=I>=0?C.lime:C.rose;arrow(c,x,y,x+dir[0]*40,y+dir[1]*40,col,3);T(c,n+' = '+I.toFixed(3)+' A',x+dir[0]*50+(dir[0]?0:14),y+dir[1]*50+(dir[0]?6:0),{a:dir[0]<0?'right':'left',s:19,w:700,m:1,c:col})};
lab(300,110,k.I1,'I₁',[1,0]);lab(700,110,k.I2,'I₂',[-1,0]);lab(520,370,k.I3,'I₃',[0,1]);c.beginPath();c.arc(500,130,8,0,7);c.fillStyle=C.amber;c.fill();T(c,'junction',512,156,{s:14,c:C.amber});
box(c,250,480,500,64,'');T(c,'I₁ + I₂ − I₃ = '+z(k.I1+k.I2-k.I3).toFixed(3)+' A   ·   Loop 1: '+z(p.E1-k.I1*p.R1-k.I3*p.R3).toFixed(3)+' V',500,520,{a:'center',s:17,w:600,m:1});},
readings(s,p){const k=this.calc(p);return[['I₁',k.I1.toFixed(3),'A'],['I₂',k.I2.toFixed(3),'A'],['I₃',k.I3.toFixed(3),'A'],['Junction ΣI',z(k.I1+k.I2-k.I3).toFixed(3),'A']]},
columns:['E₁ (V)','E₂ (V)','I₁ (A)','I₂ (A)','I₃ (A)','I₁+I₂−I₃','Loop 1 ΣE−ΣIR'],
record(s,p){const k=this.calc(p);return[p.E1,p.E2,+k.I1.toFixed(3),+k.I2.toFixed(3),+k.I3.toFixed(3),+z(k.I1+k.I2-k.I3).toFixed(3),+z(p.E1-k.I1*p.R1-k.I3*p.R3).toFixed(3)]},
result(rows){return'Junction sum and loop sums are zero in every reading → Kirchhoff’s laws verified (conservation of charge and energy). A negative current just flows opposite to the arrow — e.g. E₂ being charged.'}};

S.joule={title:"Joule's Law of Heating — H = I²Rt",topic:'elec',grades:[10,12],
aim:'Heat water with a resistance coil and show that the heat produced is proportional to I² (for fixed R and t).',
apparatus:['Calorimeter with 200 g water and stirrer','Heating coil (R)','Rheostat, ammeter, battery','Thermometer','Stopwatch'],
formula:'H = I² R t  (joules)      H = (m c + C_cal) ΔT      P = I²R = V²/R      1 kWh = 3.6 × 10⁶ J',
procedure:['Choose R and set the current I.','Tap “Switch on”. The clock runs 10× faster.','After 2 minutes (120 s) record the temperature rise ΔT.','Cool the water (“New water”) and repeat for other currents.','Plot ΔT against I²: a straight line → H ∝ I².'],
controls:[{k:'R',label:'Coil resistance R',type:'select',def:5,options:[[2,'2 Ω'],[5,'5 Ω'],[10,'10 Ω']]},{k:'I',label:'Current I',type:'range',min:0.5,max:3,step:0.5,def:2,unit:'A'}],
actions:[{label:'Switch on / off',run(s){s.on=!s.on}},{label:'New water',run(s){Object.assign(s,{T:28,t:0,on:false})}}],
init(){return{T:28,t:0,on:false}},onChange(s){Object.assign(s,{T:28,t:0,on:false})},
step(s,p,dt){if(!s.on)return;const h=dt*10;s.t+=h;s.T+=p.I*p.I*p.R*h/(200*4.18+20);if(s.t>=120){s.t=120;s.on=false}},
draw(c,s,p){bg(c);RR(c,300,200,260,240,10,G(c,300,0,560,0,['#9aa5b4','#e5e9ee','#8792a3']));RR(c,316,240,228,190,6,'rgba(79,179,255,0.45)');
c.beginPath();for(let i=0;i<10;i++)c.arc(380+i*11,360,14,0,Math.PI*2);c.strokeStyle=s.on?'#ff6a2a':'#a8b0bb';c.lineWidth=3;c.stroke();L(c,380,346,380,170,'#a8b0bb',3);L(c,490,346,490,170,'#a8b0bb',3);
const f=cl((s.T-20)/80,0,1);RR(c,520,90,18,280,9,'rgba(235,242,250,0.92)','#9fb0c4');RR(c,526,370-260*f-6,6,260*f+10,3,'#d62839');T(c,s.T.toFixed(1)+' °C',560,120,{s:22,w:700,m:1,c:C.rose});
wire(c,[[380,170],[380,120],[180,120],[180,300]]);wire(c,[[490,170],[490,110],[640,110],[640,300]]);cell(c,180,310,'',true);meter(c,780,250,60,p.I,0,3,'A',C.lime,(s.on?p.I:0).toFixed(1)+' A');
watch(c,180,440,56,s.t);T(c,'R = '+p.R+' Ω',435,470,{a:'center',s:18,w:600});T(c,'ΔT = '+(s.T-28).toFixed(2)+' °C',435,510,{a:'center',s:22,w:700,m:1,c:C.amber});},
readings(s,p){return[['Time t',s.t.toFixed(0),'s'],['ΔT',(s.T-28).toFixed(2),'°C'],['Heat H = I²Rt',(p.I*p.I*p.R*s.t).toFixed(0),'J'],['Power I²R',(p.I*p.I*p.R).toFixed(1),'W']]},
columns:['R (Ω)','I (A)','I² (A²)','t (s)','ΔT (°C)'],
record(s,p){if(s.t<120)return{error:'Heat for the full 120 s first.'};return[p.R,p.I,+(p.I*p.I).toFixed(2),120,+(s.T-28).toFixed(2)]},
plot:{x:2,y:4},
result(rows){const f=lin(rows.map(r=>[r[2],r[4]]));return f&&rows.length>1?'ΔT ∝ I² (straight line, slope '+f.b.toFixed(3)+' °C/A²) → heat produced H ∝ I² R t. Doubling I gives 4× the heat.':''}};

S.bulbs={title:'Electric Bulbs in Series & Parallel',topic:'elec',grades:[10,12],
aim:'Connect two bulbs of different power ratings to the 220 V mains in series and in parallel; compare their brightness (actual power).',
apparatus:['220 V supply','Bulbs rated 40 W, 60 W and 100 W at 220 V','Wattmeters'],
formula:'R = V_rated² / P_rated   (R₄₀W > R₁₀₀W)      Series: same I → P = I²R → higher-R (lower-watt) bulb glows brighter      Parallel: same V → each gives its rated power',
procedure:['Choose the ratings of bulbs A and B.','Choose series or parallel.','Compare the glow and read each bulb’s actual power.','Record.','Explain: in series the 40 W bulb is brighter than the 100 W bulb!'],
controls:[{k:'P1',label:'Bulb A rating',type:'select',def:40,options:[[40,'40 W'],[60,'60 W'],[100,'100 W']]},{k:'P2',label:'Bulb B rating',type:'select',def:100,options:[[40,'40 W'],[60,'60 W'],[100,'100 W']]},{k:'mode',label:'Connection',type:'select',def:'s',options:[['s','Series'],['p','Parallel']]}],
init(){return{}},
calc(p){const R1=220*220/p.P1,R2=220*220/p.P2;if(p.mode==='s'){const I=220/(R1+R2);return{R1,R2,a:I*I*R1,b:I*I*R2,I}}return{R1,R2,a:p.P1,b:p.P2,I:220/R1+220/R2}},
draw(c,s,p){bg(c);const k=this.calc(p);const bulb=(x,y,P,lab)=>{const g=cl(P/100,0.03,1);const gr=c.createRadialGradient(x,y,4,x,y,40+120*g);gr.addColorStop(0,'rgba(255,230,150,'+(0.9*g)+')');gr.addColorStop(1,'rgba(255,200,90,0)');c.fillStyle=gr;c.beginPath();c.arc(x,y,40+120*g,0,7);c.fill();
c.beginPath();c.arc(x,y,34,0,7);c.fillStyle='rgba(255,250,230,'+(0.15+0.6*g)+')';c.fill();c.strokeStyle='#cfd6df';c.lineWidth=2;c.stroke();RR(c,x-16,y+30,32,22,3,'#8792a3');T(c,lab,x,y+80,{a:'center',s:18,w:700});T(c,P.toFixed(1)+' W',x,y+106,{a:'center',s:20,w:700,m:1,c:C.amber})};
if(p.mode==='s'){wire(c,[[120,300],[120,170],[880,170],[880,300]]);wire(c,[[120,320],[120,450],[880,450],[880,170]]);bulb(380,170,k.a,'A ('+p.P1+' W)');bulb(640,170,k.b,'B ('+p.P2+' W)')}
else{wire(c,[[120,300],[120,140],[820,140],[820,450],[120,450],[120,320]]);wire(c,[[380,140],[380,190]]);wire(c,[[380,250],[380,450]]);wire(c,[[640,140],[640,190]]);wire(c,[[640,250],[640,450]]);bulb(380,220,k.a,'A ('+p.P1+' W)');bulb(640,220,k.b,'B ('+p.P2+' W)')}
RR(c,90,290,60,40,6,'#2d3746','#56627a');T(c,'220 V',120,316,{a:'center',s:14,w:700,c:C.amber});
T(c,'R_A = '+k.R1.toFixed(0)+' Ω   ·   R_B = '+k.R2.toFixed(0)+' Ω   ·   Total power = '+(k.a+k.b).toFixed(1)+' W',500,520,{a:'center',s:17,w:600,m:1});},
readings(s,p){const k=this.calc(p);return[['Bulb A power',k.a.toFixed(1),'W'],['Bulb B power',k.b.toFixed(1),'W'],['Brighter',Math.abs(k.a-k.b)<0.1?'Equal':k.a>k.b?'A':'B',''],['Total current',k.I.toFixed(3),'A']]},
columns:['Mode','A rated (W)','B rated (W)','A actual (W)','B actual (W)','Total (W)'],
record(s,p){const k=this.calc(p);return[p.mode==='s'?'Series':'Parallel',p.P1,p.P2,+k.a.toFixed(1),+k.b.toFixed(1),+(k.a+k.b).toFixed(1)]},
result(rows){return'Parallel: each bulb gives its rated power — the 100 W bulb is brighter.  Series: the same current flows, so the bulb with larger R (lower wattage) is brighter, and the total power is less than either rating.'}};

S.household={title:'Household Circuit — Power, Fuse & Energy Bill',topic:'elec',grades:[10],
aim:'Switch on appliances in a domestic parallel circuit, find the current drawn, see when the fuse blows, and calculate energy used in kWh.',
apparatus:['220 V mains with live, neutral and earth','Fuse / MCB','Appliances: bulb, fan, TV, iron, heater','Energy meter'],
formula:'I = P / V      Fuse blows if I > rated current      Energy (kWh) = P(kW) × t(h)      1 kWh = 1 unit = 3.6 × 10⁶ J',
procedure:['Choose the fuse rating.','Switch appliances on one by one; watch the total current.','Find the combination that blows the fuse (overloading).','Set hours of use per day and read the units consumed and the cost.','Record. Try “Short circuit” — the fuse protects the wiring.'],
controls:[{k:'fuse',label:'Fuse / MCB rating',type:'select',def:5,options:[[5,'5 A (lighting)'],[15,'15 A (power)']]},{k:'bl',label:'Bulb 100 W',type:'toggle',def:true},{k:'fan',label:'Fan 75 W',type:'toggle',def:true},{k:'tv',label:'TV 120 W',type:'toggle',def:false},{k:'ir',label:'Iron 1000 W',type:'toggle',def:false},{k:'ht',label:'Heater 2000 W',type:'toggle',def:false},{k:'h',label:'Hours used per day',type:'range',min:1,max:12,step:1,def:5,unit:'h'}],
actions:[{label:'Short circuit',run(s){s.blown=true;s.why='short'}},{label:'Replace fuse',run(s){s.blown=false}}],
init(){return{blown:false}},
list:[['bl','Bulb',100],['fan','Fan',75],['tv','TV',120],['ir','Iron',1000],['ht','Heater',2000]],
P(p){return this.list.reduce((a,[k,,w])=>a+(p[k]?w:0),0)},
step(s,p){if(!s.blown&&this.P(p)/220>p.fuse){s.blown=true;s.why='over'}},
onChange(s){},
draw(c,s,p){bg(c);L(c,80,110,930,110,'#e04a4a',5);L(c,80,450,930,450,'#4a7de0',5);L(c,80,490,930,490,'#4ade80',3,[8,6]);T(c,'Live',60,116,{a:'right',s:15,c:'#e04a4a'});T(c,'Neutral',60,456,{a:'right',s:15,c:'#4a7de0'});T(c,'Earth',60,496,{a:'right',s:15,c:'#4ade80'});
RR(c,110,90,90,40,6,s.blown?'#5a1d1d':'#2d3746',s.blown?C.rose:'#9aa5b4',2);T(c,s.blown?'BLOWN':'FUSE '+p.fuse+'A',155,116,{a:'center',s:14,w:700,c:s.blown?C.rose:C.ink});
this.list.forEach(([k,n,w],i)=>{const x=280+i*135,on=p[k]&&!s.blown;L(c,x,110,x,190,'#e04a4a',3);RR(c,x-20,190,40,24,5,p[k]?C.lime:'#3b4451');T(c,p[k]?'ON':'OFF',x,207,{a:'center',s:12,w:700,c:'#0a1018'});L(c,x,214,x,280,'#cfd6df',3);
RR(c,x-50,280,100,90,10,on?'rgba(255,214,102,0.25)':'#1d2733',on?C.amber:'#3b4451',2);T(c,n,x,318,{a:'center',s:18,w:700,c:on?C.amber:C.dim});T(c,w+' W',x,344,{a:'center',s:15,m:1,c:C.dim});L(c,x,370,x,450,'#4a7de0',3);if(k==='ir'||k==='ht')L(c,x+30,370,x+30,490,'#4ade80',2,[4,4])});
const Pw=this.P(p),I=s.blown?0:Pw/220;box(c,300,20,380,70,'');T(c,'I = P / V = '+(Pw/220).toFixed(2)+' A'+(s.blown?' → no current':''),490,64,{a:'center',s:22,w:700,m:1,c:s.blown?C.rose:C.lime});
if(s.blown)T(c,s.why==='short'?'Short circuit! Huge current → fuse melts and breaks the circuit':'Overloading! Current exceeded '+p.fuse+' A → fuse blew',500,540,{a:'center',s:18,w:700,c:C.rose});
else T(c,'Energy per day = '+(Pw*p.h/1000).toFixed(2)+' kWh   ·   Cost @ ₹8/unit = ₹'+(Pw*p.h/1000*8).toFixed(2),500,540,{a:'center',s:18,w:700,m:1,c:C.amber});},
readings(s,p){const Pw=this.P(p);return[['Total power',Pw,'W'],['Current drawn',(Pw/220).toFixed(2),'A'],['Fuse',s.blown?'Blown':'OK',''],['Units per day',(Pw*p.h/1000).toFixed(2),'kWh']]},
columns:['Appliances ON','P (W)','I (A)','Fuse (A)','Status','kWh/day'],
record(s,p){const Pw=this.P(p);return[this.list.filter(([k])=>p[k]).map(x=>x[1]).join('+')||'none',Pw,+(Pw/220).toFixed(2),p.fuse,s.blown?'Blown':'OK',+(Pw*p.h/1000).toFixed(2)]},
result(rows){return'Appliances are in parallel: each gets 220 V and the currents add. When the total current exceeds the fuse rating the fuse melts (overloading). Units = kW × hours.'}};

/* ── MAGNETISM & EMI ───────────────────────────── */
S.fieldWire={title:'Magnetic Field of a Straight Wire & a Circular Loop',topic:'mag',grades:[10,12],
aim:'Measure the magnetic field produced by a current in a long straight wire, at the centre of a circular coil, and on its axis (Biot–Savart law).',
apparatus:['Long straight conductor / circular coil','DC supply & ammeter','Magnetic field sensor (teslameter)','Compass needle'],
formula:'Straight wire: B = μ₀ I / (2π r)      Coil centre: B = μ₀ N I / (2R)      Coil axis: B = μ₀ N I R² / [2 (R² + x²)^(3/2)]      μ₀ = 4π × 10⁻⁷ T·m/A',
procedure:['Choose the conductor.','Set the current I.','Set the distance d (r from wire / R of coil / x along axis).','Read B and record.','For the wire, plot B against 1/r — a straight line. Reverse I: the compass reverses.'],
controls:[{k:'mode',label:'Conductor',type:'select',def:'w',options:[['w','Straight wire (distance r)'],['c','Coil centre (radius R)'],['a','Coil axis (distance x, R = 5 cm)']]},{k:'I',label:'Current I',type:'range',min:-10,max:10,step:1,def:5,unit:'A'},{k:'d',label:'Distance d',type:'range',min:1,max:10,step:1,def:4,unit:'cm'},{k:'N',label:'Turns (coil)',type:'select',def:10,options:[[1,'1'],[10,'10'],[50,'50']]}],
init(){return{t:0}},step(s,p,dt){s.t+=dt},
B(p){const mu=4e-7*Math.PI,d=p.d/100;if(p.mode==='w')return mu*p.I/(2*Math.PI*d);if(p.mode==='c')return mu*p.N*p.I/(2*d);const Rr=0.05;return mu*p.N*p.I*Rr*Rr/(2*Math.pow(Rr*Rr+d*d,1.5))},
draw(c,s,p){bg(c);const B=this.B(p),cx=380,cy=280;
if(p.mode==='w'){for(let r=40;r<=240;r+=40){c.beginPath();c.arc(cx,cy,r,0,7);c.strokeStyle='rgba(255,107,154,'+(0.6-r/500)+')';c.lineWidth=2;c.stroke();head(c,cx+r,cy,p.I>=0?-Math.PI/2:Math.PI/2,C.rose,10)}
c.beginPath();c.arc(cx,cy,18,0,7);c.fillStyle='#d9964a';c.fill();T(c,p.I>=0?'⊙':'⊗',cx,cy+8,{a:'center',s:22,w:700,c:'#1d2733'});T(c,'current '+(p.I>=0?'out of page':'into page'),cx,cy+290-30,{a:'center',s:15,c:C.dim});
const sx=cx+p.d*24;c.beginPath();c.arc(sx,cy,8,0,7);c.fillStyle=C.lime;c.fill();L(c,cx,cy,sx,cy,C.lime,1.5,[5,4]);T(c,'r = '+p.d+' cm',(cx+sx)/2,cy+24,{a:'center',s:16,w:600,c:C.lime})}
else{const Rp=p.mode==='c'?p.d*20:100;c.beginPath();c.ellipse(cx,cy,Rp*0.35,Rp,0,0,7);c.strokeStyle='#d9964a';c.lineWidth=6;c.stroke();for(let i=-3;i<=3;i++){c.beginPath();c.ellipse(cx,cy,30+Math.abs(i)*55,22+Math.abs(i)*30,0,0,7);c.strokeStyle='rgba(255,107,154,0.18)';c.lineWidth=1.5;c.stroke()}
arrow(c,cx-60,cy,cx+60*Math.sign(p.I||1),cy,C.rose,3);const sx=p.mode==='a'?cx+p.d*24:cx;c.beginPath();c.arc(sx,cy,8,0,7);c.fillStyle=C.lime;c.fill();if(p.mode==='a'){L(c,cx,cy+40,sx,cy+40,C.lime,1.5,[5,4]);T(c,'x = '+p.d+' cm',(cx+sx)/2,cy+62,{a:'center',s:16,w:600,c:C.lime})}T(c,p.mode==='c'?'R = '+p.d+' cm, N = '+p.N:'R = 5 cm, N = '+p.N,cx,cy-Rp-16,{a:'center',s:16,w:600})}
box(c,700,40,270,90,'TESLAMETER');T(c,(B*1e6).toFixed(1)+' µT',835,104,{a:'center',s:30,w:700,m:1,c:C.lime});
const BH=35e-6,th=Math.atan2(B,BH);c.save();c.translate(835,300);c.beginPath();c.arc(0,0,70,0,7);c.fillStyle='#f2efe6';c.fill();c.strokeStyle='#8792a3';c.lineWidth=3;c.stroke();c.rotate(th);P(c,[[0,-60],[9,0],[-9,0]],'#d62839');P(c,[[0,60],[9,0],[-9,0]],'#1d2733');c.restore();T(c,'Compass deflection '+(th*180/Math.PI).toFixed(0)+'° (B_H = 35 µT)',835,400,{a:'center',s:15,c:C.dim});},
readings(s,p){const B=this.B(p);return[['Field B',(B*1e6).toFixed(2),'µT'],['Distance d',p.d,'cm'],['1/d',(100/p.d).toFixed(1),'m⁻¹'],['Deflection',(Math.atan2(B,35e-6)*180/Math.PI).toFixed(0),'°']]},
columns:['Conductor','I (A)','d (cm)','1/d (m⁻¹)','B (µT)'],
record(s,p){if(!p.I)return{error:'Switch on a current.'};return[{w:'Wire',c:'Coil centre',a:'Coil axis'}[p.mode],p.I,p.d,+(100/p.d).toFixed(1),+(this.B(p)*1e6).toFixed(2)]},
plot:{x:3,y:4},
result(rows){const w=rows.filter(r=>r[0]==='Wire');const f=w.length>1?lin(w.map(r=>[r[3],r[4]/1e6])):null;if(f){return'Wire: B ∝ 1/r.  μ₀ = 2π × slope / I ≈ '+(2*Math.PI*f.b/w[0][1]*1e7).toFixed(2)+' × 10⁻⁷ T·m/A (expected 4π = 12.57).'}return'B ∝ I in every case; at the coil centre B ∝ N I / R; on the axis B falls off quickly with x.'}};

S.currentForce={title:'Force on a Current-carrying Conductor',topic:'mag',grades:[10,12],
aim:'Measure the force on a wire carrying current in a magnetic field (F = BIL sin θ), find its direction by Fleming’s left-hand rule, and measure the force between two parallel currents.',
apparatus:['Current balance with horseshoe magnet','Rigid wire (L = 5 cm)','DC supply & ammeter','Pair of long parallel wires'],
formula:'Wire in field: F = B I L sin θ   (Fleming’s left-hand rule)      Parallel wires: F / L = μ₀ I₁ I₂ / (2π d) — like currents attract, unlike repel',
procedure:['Choose the arrangement.','Set the current (and B, θ or the second current and spacing).','Read the force on the balance.','Record for 5 currents — F ∝ I.','Reverse the current: the force reverses. For parallel wires, reverse one current: attraction becomes repulsion.'],
controls:[{k:'mode',label:'Arrangement',type:'select',def:'w',options:[['w','Wire in magnetic field'],['p','Two parallel wires']]},{k:'I',label:'Current I (I₁)',type:'range',min:-10,max:10,step:1,def:4,unit:'A'},{k:'B',label:'Field B (wire mode)',type:'range',min:0.1,max:0.5,step:0.1,def:0.3,unit:'T'},{k:'th',label:'Angle θ (wire mode)',type:'range',min:0,max:90,step:15,def:90,unit:'°'},{k:'I2',label:'Second current I₂',type:'range',min:-10,max:10,step:1,def:10,unit:'A'},{k:'dd',label:'Spacing d (parallel)',type:'range',min:1,max:10,step:1,def:2,unit:'cm'}],
init(){return{}},
F(p){if(p.mode==='w')return p.B*p.I*0.05*Math.sin(p.th*R);return 2e-7*p.I*p.I2/(p.dd/100)*1},
draw(c,s,p){bg(c);const F=this.F(p);
if(p.mode==='w'){RR(c,250,140,170,110,8,'#c0392b');RR(c,250,320,170,110,8,'#2c5aa0');T(c,'N',335,205,{a:'center',s:30,w:800,c:'#fff'});T(c,'S',335,385,{a:'center',s:30,w:800,c:'#fff'});
for(let x=270;x<=400;x+=26)arrow(c,x,256,x,312,'rgba(255,107,154,0.6)',2);T(c,'B = '+p.B+' T',440,232,{s:18,w:700,c:C.rose});
c.save();c.translate(335,285);c.rotate(-(90-p.th)*R);L(c,-200,0,200,0,'#d9964a',7);if(p.I)arrow(c,-120,-16,-40*Math.sign(p.I)-80+80*(p.I>0),-16,C.amber,3);c.restore();T(c,'I = '+p.I+' A,  θ = '+p.th+'°',335,470,{a:'center',s:18,w:700,c:C.amber});
if(Math.abs(F)>1e-6){T(c,F>0?'⊙ force out of page (towards you)':'⊗ force into page',335,110,{a:'center',s:18,w:700,c:C.lime})}
T(c,'Fleming’s left hand: First finger = Field, seCond finger = Current, thuMb = Motion',500,530,{a:'center',s:15,c:C.dim})}
else{const gap=40+p.dd*30,x1=420-gap/2,x2=420+gap/2,sh=cl(F*2000,-25,25);L(c,x1+sh,80,x1+sh,460,'#d9964a',7);L(c,x2-sh,80,x2-sh,460,'#d9964a',7);
[[x1+sh,p.I,'I₁'],[x2-sh,p.I2,'I₂']].forEach(([x,I,n])=>{if(I)arrow(c,x+18,I>0?300:220,x+18,I>0?220:300,C.amber,3);T(c,n+' = '+I+' A',x,490,{a:'center',s:17,w:700,c:C.amber})});
if(Math.abs(F)>1e-9){const at=F>0;arrow(c,x1+sh-10,160,x1+sh+(at?40:-40),160,C.lime,4);arrow(c,x2-sh+10,160,x2-sh+(at?-40:40),160,C.lime,4);T(c,at?'Like currents ATTRACT':'Unlike currents REPEL',420,60,{a:'center',s:20,w:700,c:C.lime})}
T(c,'d = '+p.dd+' cm',420,520,{a:'center',s:16,c:C.dim})}
box(c,680,140,290,100,p.mode==='w'?'FORCE ON WIRE':'FORCE PER METRE');T(c,(Math.abs(F)*1000).toFixed(p.mode==='w'?1:3)+(p.mode==='w'?' mN':' mN/m'),825,206,{a:'center',s:30,w:700,m:1,c:C.lime});},
readings(s,p){const F=this.F(p);return p.mode==='w'?[['Force F',(F*1000).toFixed(1),'mN'],['B I L',(p.B*Math.abs(p.I)*0.05*1000).toFixed(1),'mN'],['sin θ',Math.sin(p.th*R).toFixed(3),''],['Length L','5','cm']]:[['F per metre',(Math.abs(F)*1000).toFixed(3),'mN/m'],['Nature',F>0?'Attractive':F<0?'Repulsive':'—',''],['I₁ I₂',p.I*p.I2,'A²'],['Spacing d',p.dd,'cm']]},
columns:['Mode','I (A)','B (T) / I₂ (A)','θ (°) / d (cm)','F (mN or mN/m)'],
record(s,p){if(!p.I)return{error:'Set a non-zero current.'};const F=this.F(p);return p.mode==='w'?['Wire',p.I,p.B,p.th,+(F*1000).toFixed(1)]:['Parallel',p.I,p.I2,p.dd,+(F*1000).toFixed(3)]},
plot:{x:1,y:4},
result(rows){const w=rows.filter(r=>r[0]==='Wire'&&r[3]===90&&r[2]===rows[0][2]);const f=w.length>1?lin(w.map(r=>[r[1],r[4]/1000])):null;if(f){return'F ∝ I.  B = slope / L ≈ '+(f.b/0.05).toFixed(2)+' T (set '+w[0][2]+' T).  F is maximum at θ = 90° and zero when the wire is parallel to B.'}return'F ∝ I₁I₂/d between parallel wires — the basis of the definition of the ampere.'}};

S.chargeB={title:'Charged Particle in a Magnetic Field',topic:'mag',grades:[12],
aim:'Fire charged particles into a uniform magnetic field; measure the radius of the circular path and the time period, and see helical motion when entering at an angle.',
apparatus:['Particle source (proton / electron / alpha)','Uniform magnetic field region (into the page)','Track detector'],
formula:'r = m v sinθ / (q B)      T = 2π m / (q B)  (independent of speed!)      pitch p = 2π m v cosθ / (q B)      F = q v B sinθ ⟂ v → no work done',
procedure:['Choose the particle.','Set the speed v and the field B.','Fire at θ = 90°: the track is a circle — read r and T.','Record for 4–5 speeds; plot r against v.','Set θ < 90°: the path becomes a helix; read the pitch.'],
controls:[{k:'pt',label:'Particle',type:'select',def:'p',options:[['p','Proton'],['a','Alpha particle'],['e','Electron']]},{k:'v',label:'Speed v',type:'range',min:1,max:10,step:1,def:4,unit:'×10⁵ m/s'},{k:'B',label:'Field B',type:'range',min:0.02,max:0.2,step:0.02,def:0.1,unit:'T'},{k:'th',label:'Entry angle θ (with B)',type:'range',min:30,max:90,step:15,def:90,unit:'°'}],
init(){return{ph:0}},onChange(s){s.ph=0},step(s,p,dt){s.ph+=dt*2},
par(p){return{p:[1.67e-27,1.6e-19,'#ff9a9a'],a:[6.64e-27,3.2e-19,'#ffcf7a'],e:[9.11e-31,-1.6e-19,'#9ab8ff']}[p.pt]},
calc(p){const [m,q]=this.par(p),v=p.v*1e5,r=m*v*Math.sin(p.th*R)/(Math.abs(q)*p.B),Tp=2*Math.PI*m/(Math.abs(q)*p.B),pitch=Tp*v*Math.cos(p.th*R);return{r,Tp,pitch}},
draw(c,s,p){bg(c);for(let x=80;x<900;x+=60)for(let y=60;y<520;y+=60)T(c,'×',x,y,{a:'center',s:18,c:'rgba(255,107,154,0.35)'});
const k=this.calc(p),[m,q,col]=this.par(p),scale=200/Math.max(k.r,1e-9)*Math.min(1,k.r/(this.ref||k.r)),rp=180,cx=420,cy=290,dir=q>0?1:-1;
if(p.th===90){c.beginPath();c.arc(cx,cy,rp,0,7);c.strokeStyle='rgba(255,255,255,0.15)';c.lineWidth=1;c.stroke();const a=-Math.PI/2-dir*s.ph;c.beginPath();c.arc(cx,cy,rp,-Math.PI/2,a,dir>0);c.strokeStyle=col;c.lineWidth=3;c.stroke();const bx=cx+Math.cos(a)*rp,by=cy+Math.sin(a)*rp;ball(c,bx,by,9,'#fff',col);
arrow(c,bx,by,bx+(cx-bx)*0.3,by+(cy-by)*0.3,C.lime,3);T(c,'F',bx+(cx-bx)*0.34,by+(cy-by)*0.34,{s:16,w:700,c:C.lime});L(c,cx,cy,cx+rp,cy,C.dim,1.5,[5,4]);T(c,'r',cx+rp/2,cy-8,{a:'center',s:18,w:700,c:C.ink})}
else{c.beginPath();for(let i=0;i<=400;i++){const t=i/400*4*Math.PI,x=120+i*1.7,y=cy+Math.sin(t)*rp*0.6*Math.sin(p.th*R);i?c.lineTo(x,y):c.moveTo(x,y)}c.strokeStyle=col;c.lineWidth=3;c.stroke();T(c,'Helix: circular motion ⟂ B + uniform motion ∥ B (side view, B → right)',500,520,{a:'center',s:16,c:C.dim});arrow(c,120,90,300,90,C.rose,3);T(c,'B',310,96,{s:18,w:700,c:C.rose})}
box(c,680,30,290,150,'');T(c,'r = '+(k.r*100).toFixed(k.r<0.01?4:2)+' cm',700,74,{s:22,w:700,m:1,c:C.amber});T(c,'T = '+fmt(k.Tp)+' s',700,112,{s:22,w:700,m:1,c:C.cyan});if(p.th<90)T(c,'pitch = '+(k.pitch*100).toFixed(2)+' cm',700,150,{s:22,w:700,m:1,c:C.violet});
T(c,'(path drawn to fit the screen — read r from the panel)',420,505-(p.th<90?40:0),{a:'center',s:13,c:C.dim});},
readings(s,p){const k=this.calc(p);return[['Radius r',(k.r*100).toFixed(k.r<0.01?4:2),'cm'],['Period T',fmt(k.Tp),'s'],['Pitch',p.th<90?(k.pitch*100).toFixed(2):'—','cm'],['q/m',fmt(Math.abs(this.par(p)[1])/this.par(p)[0]),'C/kg']]},
columns:['Particle','v (10⁵ m/s)','B (T)','θ (°)','r (cm)','T (s)'],
record(s,p){const k=this.calc(p);return[{p:'Proton',a:'Alpha',e:'Electron'}[p.pt],p.v,p.B,p.th,+(k.r*100).toPrecision(4),fmt(k.Tp)]},
plot:{x:1,y:4},
result(rows){const r=rows.filter(x=>x[3]===90);if(r.length<2)return'Record at least two speeds at θ = 90°.';const f=lin(r.map(x=>[x[1],x[4]]));return'r ∝ v (straight line) while T stays the same at every speed → the basis of the cyclotron.  q/m = v/(rB) ≈ '+fmt(1e5/(f.b/100)/r[0][2])+' C/kg.'}};

S.acGenerator={title:'Magnetic Flux & the AC Generator (Faraday’s Law)',topic:'mag',grades:[10,12],
aim:'Rotate a coil in a magnetic field; watch the flux ϕ = NBA cos ωt change and the induced EMF e = NBAω sin ωt appear. Measure how the peak EMF depends on speed.',
apparatus:['Rectangular coil on an axle','Strong magnets (uniform field B)','Slip rings and brushes','CRO / voltmeter'],
formula:'ϕ = N B A cos θ   (θ = ωt)      e = − dϕ/dt = N B A ω sin ωt      e₀ = N B A ω = 2π f N B A',
procedure:['Choose the number of turns N, field B and coil area A.','Set the rotation frequency f.','Watch the ϕ – t and e – t graphs: e is maximum when ϕ is zero.','Record the peak EMF e₀.','Repeat for 4–5 speeds and plot e₀ against f.'],
controls:[{k:'N',label:'Turns N',type:'select',def:100,options:[[50,'50'],[100,'100'],[200,'200']]},{k:'B',label:'Field B',type:'range',min:0.05,max:0.5,step:0.05,def:0.2,unit:'T'},{k:'A',label:'Coil area A',type:'select',def:50,options:[[25,'25 cm²'],[50,'50 cm²'],[100,'100 cm²']]},{k:'f',label:'Rotation frequency f',type:'range',min:0.5,max:5,step:0.5,def:1,unit:'Hz'}],
init(){return{th:0,tr:[]}},onChange(s){s.tr=[]},
step(s,p,dt){s.th+=2*Math.PI*p.f*dt*0.25;s.tr.push(s.th);if(s.tr.length>420)s.tr.shift()},
draw(c,s,p){bg(c);RR(c,60,120,90,220,8,'#c0392b');RR(c,410,120,90,220,8,'#2c5aa0');T(c,'N',105,236,{a:'center',s:30,w:800,c:'#fff'});T(c,'S',455,236,{a:'center',s:30,w:800,c:'#fff'});for(let y=150;y<=310;y+=32)arrow(c,160,y,400,y,'rgba(255,107,154,0.35)',1.5);
const w=Math.cos(s.th)*110;RR(c,280-Math.abs(w),150,Math.max(4,2*Math.abs(w)),160,4,null,w>=0?'#e7a265':'#a8622e',6);L(c,280,110,280,350,'#cfd6df',3);
T(c,'θ = '+((s.th*180/Math.PI)%360).toFixed(0)+'°',280,390,{a:'center',s:18,w:700,c:C.amber});
const e0=p.N*p.B*p.A*1e-4*2*Math.PI*p.f,ph0=p.N*p.B*p.A*1e-4;box(c,540,40,430,220,'ϕ (cyan)   e (lime)  vs  time');box(c,540,280,430,110,'');
const ox=555,oy=150;L(c,ox,oy,955,oy,'rgba(255,255,255,0.2)',1);const tr=s.tr,t0=tr[0]||0;c.beginPath();tr.forEach((th,i)=>{const x=ox+i*0.95,y=oy-Math.cos(th)*80;i?c.lineTo(x,y):c.moveTo(x,y)});c.strokeStyle=C.cyan;c.lineWidth=2.5;c.stroke();c.beginPath();tr.forEach((th,i)=>{const x=ox+i*0.95,y=oy-Math.sin(th)*80;i?c.lineTo(x,y):c.moveTo(x,y)});c.strokeStyle=C.lime;c.lineWidth=2.5;c.stroke();
T(c,'ϕ = '+(ph0*Math.cos(s.th)).toFixed(3)+' Wb',560,322,{s:20,w:700,m:1,c:C.cyan});T(c,'e = '+(e0*Math.sin(s.th)).toFixed(2)+' V   (e₀ = '+e0.toFixed(2)+' V)',560,360,{s:20,w:700,m:1,c:C.lime});
T(c,'EMF is largest when the coil plane is parallel to B (ϕ = 0) — it is the rate of change of ϕ that matters',500,460,{a:'center',s:16,c:C.dim});T(c,'(animation slowed 4×)',500,490,{a:'center',s:13,c:C.dim});},
readings(s,p){const e0=p.N*p.B*p.A*1e-4*2*Math.PI*p.f;return[['Peak EMF e₀',e0.toFixed(2),'V'],['ω = 2πf',(2*Math.PI*p.f).toFixed(2),'rad/s'],['Max flux NBA',(p.N*p.B*p.A*1e-4).toFixed(3),'Wb'],['RMS EMF',(e0/Math.SQRT2).toFixed(2),'V']]},
columns:['N','B (T)','A (cm²)','f (Hz)','e₀ (V)'],
record(s,p){return[p.N,p.B,p.A,p.f,+(p.N*p.B*p.A*1e-4*2*Math.PI*p.f).toFixed(2)]},
plot:{x:3,y:4},
result(rows){const f=lin(rows.map(r=>[r[3],r[4]]));const r=rows[0];return f&&rows.length>1?'e₀ ∝ f.  Slope ≈ '+f.b.toFixed(2)+' V/Hz;  2πNBA = '+(2*Math.PI*r[0]*r[1]*r[2]*1e-4).toFixed(2)+' V/Hz → e₀ = NBAω verified.':''}};

window.LabParts=(window.LabParts||0)+1;
(window.LabExtra=window.LabExtra||[]).push({order:['newton2','inertia','lift','forces','charging','drift','resistivity','seriesParallel','kirchhoff','joule','bulbs','household','fieldWire','currentForce','chargeB','acGenerator'],
syl:{8:[['Charging by rubbing; electroscope','charging']],9:[['Inertia & Newton’s first law','inertia'],["Newton's second law F = ma",'newton2'],['Apparent weight in a lift','lift'],['Fundamental forces in nature','forces']],
10:[['Factors affecting resistance','resistivity'],['Series & parallel: voltage/current division','seriesParallel'],["Joule's heating effect H = I²Rt",'joule'],['Bulbs in series & parallel','bulbs'],['Domestic circuits, fuse & kWh','household'],['Magnetic field of wire & coil','fieldWire'],['Force on a conductor; Fleming’s left-hand rule','currentForce'],['AC generator','acGenerator']],
11:[["Newton's second law (F = ma)",'newton2'],['Apparent weight (lift)','lift'],['Fundamental forces','forces']],
12:[['Charge: quantisation & conservation','charging'],['Drift velocity, current density, mobility','drift'],['Resistivity & temperature dependence','resistivity'],["Kirchhoff's laws",'kirchhoff'],['Combination of resistors','seriesParallel'],['Combination of bulbs','bulbs'],["Joule's law; bulbs & fuse",'joule'],['Biot–Savart: wire, loop centre & axis','fieldWire'],['Force on conductor; parallel currents','currentForce'],['Charged particle in a magnetic field','chargeB'],['Magnetic flux & Faraday’s law (AC generator)','acGenerator']]}});
})();


/* 7d021892-3279-5132-be60-3cf565fe3ab9 */
(function(){
const K=window.LabKit;const {W,H,R,C,T,L,P,RR,G,ball,head,arc,room,meter,watch,cl,avg,hint}=K;
const S=window.LabSims;const bg=c=>room(c,false);
const lin=pts=>{const n=pts.length,sx=pts.reduce((a,p)=>a+p[0],0),sy=pts.reduce((a,p)=>a+p[1],0),sxx=pts.reduce((a,p)=>a+p[0]*p[0],0),sxy=pts.reduce((a,p)=>a+p[0]*p[1],0),d=n*sxx-sx*sx;if(n<2||Math.abs(d)<1e-12)return null;const b=(n*sxy-sx*sy)/d;return{b,a:(sy-b*sx)/n}};
const box=(c,x,y,w,h,title)=>{RR(c,x,y,w,h,10,'rgba(10,12,16,0.75)','rgba(255,255,255,0.12)',1);if(title)T(c,title,x+12,y+22,{s:14,w:600,c:C.dim})};
const arrow=(c,x1,y1,x2,y2,col,w)=>{if(Math.hypot(x2-x1,y2-y1)<2)return;L(c,x1,y1,x2,y2,col,w||3);head(c,x2,y2,Math.atan2(y2-y1,x2-x1),col,14)};
const fmt=(v,d)=>{const a=Math.abs(v);if(a===0)return'0';if(a>=1e5||a<1e-3){const e=Math.floor(Math.log10(a));return(v/Math.pow(10,e)).toFixed(2)+'×10^'+e}return v.toFixed(d==null?3:d)};
const earth=(c,x,y,r)=>{const g=c.createRadialGradient(x-r*.3,y-r*.3,r*.1,x,y,r);g.addColorStop(0,'#7fc3ff');g.addColorStop(.6,'#2a6fb3');g.addColorStop(1,'#123a66');c.beginPath();c.arc(x,y,r,0,7);c.fillStyle=g;c.fill()};
const graph=(c,x,y,w,h,title,xl,yl)=>{box(c,x,y,w,h,title);L(c,x+40,y+h-30,x+w-12,y+h-30,'rgba(255,255,255,0.35)',1.5);L(c,x+40,y+30,x+40,y+h-30,'rgba(255,255,255,0.35)',1.5);T(c,xl,x+w-14,y+h-10,{a:'right',s:13,c:C.dim});T(c,yl,x+44,y+40,{s:13,c:C.dim})};
const plotFn=(c,x0,y0,w,h,f,xmin,xmax,ymin,ymax,col)=>{c.beginPath();for(let i=0;i<=120;i++){const xv=xmin+(xmax-xmin)*i/120,yv=f(xv),px=x0+w*i/120,py=y0-h*(yv-ymin)/(ymax-ymin);i?c.lineTo(px,py):c.moveTo(px,py)}c.strokeStyle=col;c.lineWidth=2.5;c.stroke()};
const z=v=>Math.abs(v)<5e-3?0:v;
const GE=6.67e-11,ME=5.97e24,RE=6.4e6,g0=9.8;

/* ── GRAVITATION ─────────────────────────────── */
S.cavendish={title:"Newton's Law of Gravitation — Cavendish Balance",topic:'mech',grades:[9,11],
aim:'Measure the tiny attraction between lead spheres with a torsion balance; show F ∝ 1/r² and find the universal constant G.',
apparatus:['Torsion balance with small spheres (m)','Large lead spheres (M)','Light beam & scale (deflection)'],
formula:'F = G M m / r²      G = 6.67 × 10⁻¹¹ N·m²/kg²   [M⁻¹ L³ T⁻²]      Gravity is always attractive, acts along the line joining the masses',
procedure:['Choose the large mass M (small mass m = 0.73 kg).','Set the centre-to-centre distance r.','Read the force from the deflection of the light spot.','Record for 5 distances.','Plot F against 1/r²; G = slope / (M m).'],
controls:[{k:'M',label:'Large mass M',type:'select',def:158,options:[[50,'50 kg'],[100,'100 kg'],[158,'158 kg']]},{k:'r',label:'Distance r',type:'range',min:5,max:20,step:1,def:8,unit:'cm'}],
init(){return{t:0}},step(s,p,dt){s.t+=dt},
F(p){return GE*p.M*0.73/Math.pow(p.r/100,2)},
draw(c,s,p){bg(c);const F=this.F(p),th=F*6e4,cx=380,cy=280;L(c,cx,40,cx,cy,'#cfd6df',1.5);c.save();c.translate(cx,cy);c.rotate(-th);L(c,-160,0,160,0,'#cfd6df',4);ball(c,-160,0,14,'#e5e9ee','#8792a3');ball(c,160,0,14,'#e5e9ee','#8792a3');c.restore();
const d=p.r*6+20;ball(c,cx-160,cy+d,22+p.M/12,'#b8bec8','#3b4451');ball(c,cx+160,cy-d,22+p.M/12,'#b8bec8','#3b4451');T(c,'M',cx-160,cy+d+6,{a:'center',s:16,w:700,c:'#1d2733'});T(c,'m',cx+190,cy-6,{s:16,w:700,c:C.ink});
arrow(c,cx+160,cy+18,cx+160,cy+18-cl(F*2e7,10,70),C.rose,3);arrow(c,cx-160,cy-18,cx-160,cy-18+cl(F*2e7,10,70),C.rose,3);
c.beginPath();c.moveTo(cx,cy-60);c.lineTo(cx+Math.cos(-0.5+2*th)*480,cy-60+Math.sin(-0.5+2*th)*480);c.strokeStyle='rgba(255,90,90,0.5)';c.lineWidth=2;c.stroke();
box(c,640,40,330,100,'GRAVITATIONAL FORCE');T(c,(F*1e6).toFixed(3)+' µN',805,108,{a:'center',s:32,w:700,m:1,c:C.lime});T(c,'r = '+p.r+' cm   ·   m = 0.73 kg',805,170,{a:'center',s:17,c:C.dim});
T(c,'Weight of m = '+(0.73*9.8).toFixed(2)+' N — gravity between everyday objects is ~10⁻⁶ times smaller!',500,520,{a:'center',s:16,c:C.dim});},
readings(s,p){const F=this.F(p);return[['Force F',(F*1e6).toFixed(3),'µN'],['1/r²',(1e4/(p.r*p.r)).toFixed(1),'m⁻²'],['M m',(p.M*0.73).toFixed(1),'kg²'],['F / weight of m',fmt(F/(0.73*9.8)),'']]},
columns:['M (kg)','r (cm)','1/r² (m⁻²)','F (µN)'],
record(s,p){return[p.M,p.r,+(1e4/(p.r*p.r)).toFixed(1),+(this.F(p)*1e6).toFixed(4)]},
plot:{x:2,y:3},
result(rows){const f=lin(rows.map(r=>[r[2],r[3]*1e-6]));return f&&rows.length>1?'F ∝ 1/r².  G = slope / (Mm) ≈ '+(f.b/(rows[0][0]*0.73)/1e-11).toFixed(2)+' × 10⁻¹¹ N·m²/kg²':''}};

S.gVariation={title:'Variation of g — Height, Depth & Latitude',topic:'mech',grades:[9,11],
aim:'Find how the acceleration due to gravity changes as you go up from, or down into, the Earth, and with latitude because of Earth’s rotation.',
apparatus:['Model Earth (R = 6400 km)','Spring balance with a 60 kg person','Altitude / depth control'],
formula:'g = G M / R² ≈ 9.8 m/s²      Height: g_h = g R² / (R + h)² ≈ g (1 − 2h/R)      Depth: g_d = g (1 − d/R)  (zero at the centre)      Latitude: g_λ = g − ω² R cos² λ',
procedure:['Choose height or depth.','Move the person up or down with the slider.','Read g and the person’s weight.','Record for several values; plot g against the distance.','Compare: g falls with both height and depth; it is greatest at the poles.'],
controls:[{k:'mode',label:'Go',type:'select',def:'h',options:[['h','Above the surface (height h)'],['d','Inside the Earth (depth d)']]},{k:'x',label:'Height / depth',type:'range',min:0,max:6400,step:200,def:1600,unit:'km'},{k:'lat',label:'Latitude λ',type:'range',min:0,max:90,step:15,def:0,unit:'°'}],
init(){return{}},
g(p){const x=p.x*1e3,gl=9.832-Math.pow(7.27e-5,2)*RE*Math.pow(Math.cos(p.lat*R),2);return p.mode==='h'?gl*RE*RE/Math.pow(RE+x,2):gl*(1-x/RE)},
draw(c,s,p){bg(c);const cx=300,cy=290,r=150;earth(c,cx,cy,r);if(p.mode==='d'){c.beginPath();c.arc(cx,cy,r*0.55,0,7);c.fillStyle='rgba(255,140,60,0.25)';c.fill()}
const k=r/6400,rr=p.mode==='h'?r+p.x*k:r-p.x*k,a=-Math.PI/2+p.lat*R*0;c.beginPath();c.arc(cx,cy,rr,0,7);c.strokeStyle='rgba(255,181,71,0.35)';c.setLineDash([5,5]);c.lineWidth=1.5;c.stroke();c.setLineDash([]);
const px=cx,py=cy-rr;ball(c,px,py,10,'#ffd08a','#a8661c');arrow(c,px,py+12,px,py+12+cl(this.g(p)*6,8,60),C.rose,3);T(c,'g',px+10,py+50,{s:18,w:700,c:C.rose});
L(c,cx,cy,cx,cy-r,'rgba(255,255,255,0.3)',1);T(c,'R',cx-16,cy-r/2,{s:16,c:C.dim});
const g=this.g(p);box(c,560,30,410,110,'ACCELERATION DUE TO GRAVITY');T(c,g.toFixed(3)+' m/s²',765,100,{a:'center',s:34,w:700,m:1,c:C.lime});T(c,'Weight of 60 kg person = '+(60*g).toFixed(0)+' N',765,170,{a:'center',s:18,w:600});
graph(c,560,200,410,250,'g vs distance from centre','r/R','g');const x0=600,y0=420,gw=350,gh=180;plotFn(c,x0,y0,gw,gh,v=>v<1?v:1/(v*v),0,3,0,1,'rgba(79,214,255,0.8)');
const rv=p.mode==='h'?1+p.x/6400:1-p.x/6400;c.beginPath();c.arc(x0+gw*rv/3,y0-gh*(rv<1?rv:1/(rv*rv)),7,0,7);c.fillStyle=C.amber;c.fill();L(c,x0+gw/3,y0,x0+gw/3,y0-gh,'rgba(255,255,255,0.2)',1,[4,4]);T(c,'surface',x0+gw/3,y0+18,{a:'center',s:12,c:C.dim});},
readings(s,p){const g=this.g(p);return[['g here',g.toFixed(3),'m/s²'],['g / g₀',(g/g0).toFixed(3),''],[p.mode==='h'?'Approx. g(1 − 2h/R)':'g(1 − d/R)',p.mode==='h'?(g0*(1-2*p.x/6400)).toFixed(3):(g0*(1-p.x/6400)).toFixed(3),'m/s²'],['Distance from centre',(p.mode==='h'?6400+p.x:6400-p.x),'km']]},
columns:['Where','x (km)','λ (°)','g (m/s²)','g/g₀'],
record(s,p){const g=this.g(p);return[p.mode==='h'?'Height':'Depth',p.x,p.lat,+g.toFixed(3),+(g/g0).toFixed(3)]},
plot:{x:1,y:3,fit:false},
result(rows){return'g decreases with height (∝ 1/r²) and with depth (∝ r); it is zero at the centre. The approximation g(1 − 2h/R) holds only for h ≪ R. g is least at the equator (rotation) and greatest at the poles.'}};

S.gravPotential={title:'Gravitational Field & Potential — Shell and Solid Sphere',topic:'mech',grades:[11],
aim:'Plot the gravitational field E and potential V around a hollow shell and a solid sphere as you move from the centre to far outside.',
apparatus:['Spherical shell / solid sphere of mass M, radius R','Test mass (probe)'],
formula:'Outside (r ≥ R): E = GM/r², V = −GM/r      Shell inside: E = 0, V = −GM/R (constant)      Solid inside: E = GMr/R³, V = −GM(3R² − r²)/(2R³)      V(∞) = 0',
procedure:['Choose shell or solid sphere.','Move the probe with the r/R slider.','Read E and V (in units of GM/R² and GM/R).','Record from the centre to 4R.','Note: inside a shell E = 0 but V is NOT zero; V is most negative at the centre of a solid sphere (−1.5 GM/R).'],
controls:[{k:'obj',label:'Body',type:'select',def:'s',options:[['s','Spherical shell (hollow)'],['b','Solid sphere']]},{k:'r',label:'Probe distance r/R',type:'range',min:0,max:4,step:0.25,def:2,unit:''}],
init(){return{}},
EV(p){const r=p.r;if(r>=1)return[1/(r*r),-1/r];return p.obj==='s'?[0,-1]:[r,-(3-r*r)/2]},
draw(c,s,p){bg(c);const cx=230,cy=280,R0=90;c.beginPath();c.arc(cx,cy,R0,0,7);if(p.obj==='b'){c.fillStyle=G(c,cx-R0,0,cx+R0,0,['#6b7686','#c0c8d2','#6b7686']);c.fill()}else{c.strokeStyle='#c0c8d2';c.lineWidth=8;c.stroke()}
const px=cx+p.r*R0*0.95;L(c,cx,cy,px,cy,C.dim,1.5,[5,4]);ball(c,px,cy,8,'#ffd08a','#a8661c');const [E,V]=this.EV(p);if(E>0.001)arrow(c,px-10,cy-20,px-10-cl(E*80,10,80),cy-20,C.rose,3);T(c,'r = '+p.r.toFixed(2)+' R',px,cy+30,{a:'center',s:16,w:600,c:C.amber});
graph(c,520,30,450,240,'Field E (units GM/R²)','r/R','E');plotFn(c,560,240,400,180,v=>this.EV({obj:p.obj,r:v})[0],0,4,0,1.05,C.rose);c.beginPath();c.arc(560+400*p.r/4,240-180*E/1.05,7,0,7);c.fillStyle=C.amber;c.fill();
graph(c,520,290,450,240,'Potential V (units GM/R)','r/R','V');plotFn(c,560,500,400,180,v=>this.EV({obj:p.obj,r:v})[1],0,4,-1.55,0,C.cyan);c.beginPath();c.arc(560+400*p.r/4,500-180*(V+1.55)/1.55,7,0,7);c.fillStyle=C.amber;c.fill();
T(c,'E = '+E.toFixed(3)+'    V = '+V.toFixed(3),230,470,{a:'center',s:22,w:700,m:1,c:C.lime});},
readings(s,p){const [E,V]=this.EV(p);return[['r / R',p.r.toFixed(2),''],['E',E.toFixed(3),'GM/R²'],['V',V.toFixed(3),'GM/R'],['Region',p.r<1?'Inside':p.r===1?'Surface':'Outside','']]},
columns:['Body','r/R','E (GM/R²)','V (GM/R)'],
record(s,p){const [E,V]=this.EV(p);return[p.obj==='s'?'Shell':'Solid',p.r,+E.toFixed(3),+V.toFixed(3)]},
plot:{x:1,y:3,fit:false},
result(rows){return'Outside, both bodies act like a point mass at the centre. Inside a shell E = 0 and V is constant (= surface value). Inside a solid sphere E ∝ r and V is lowest (−1.5 GM/R) at the centre.'}};

S.satellite={title:'Satellites — Orbital & Escape Velocity',topic:'mech',grades:[11],
aim:'Launch a satellite horizontally at different speeds and heights: see it fall back, orbit in a circle, go into an ellipse, or escape. Measure orbital speed, period and energies.',
apparatus:['Model Earth (R = 6400 km, g = 9.8 m/s²)','Launcher at chosen height','Satellite of mass 1000 kg'],
formula:'v₀ = √(GM/r) = √(gR²/r)  (≈ 7.9 km/s near the surface)      T = 2π r / v₀      KE = GMm/2r,  PE = −GMm/r,  TE = −GMm/2r = PE/2      vₑ = √(2GM/R) ≈ 11.2 km/s',
procedure:['Set the height h of the launch point.','Set the launch speed as a multiple of the circular speed v₀.','Tap “Launch”.','At 1.0 × v₀ the orbit is a circle — record h, v₀ and T.','Try < 1 (falls back / ellipse inside), between 1 and 1.41 (ellipse) and ≥ 1.41 (escapes: v ≥ √2 v₀).'],
controls:[{k:'h',label:'Height h',type:'range',min:200,max:36000,step:200,def:1000,unit:'km'},{k:'f',label:'Launch speed ÷ v₀',type:'range',min:0.5,max:1.6,step:0.05,def:1,unit:'×'}],
actions:[{label:'Launch',run(s,p){const r=(6400+p.h)*1e3,v=Math.sqrt(GE*ME/r)*p.f;Object.assign(s,{x:0,y:r,vx:v,vy:0,tr:[],run:true,crash:false,esc:false,t:0})}}],
init(){return{run:false,tr:[]}},onChange(s){Object.assign(s,{run:false,tr:[]})},
step(s,p,dt){if(!s.run)return;const r0=(6400+p.h)*1e3,T0=2*Math.PI*Math.sqrt(r0*r0*r0/(GE*ME)),h=T0/6*dt/40;for(let i=0;i<40;i++){const r=Math.hypot(s.x,s.y),a=-GE*ME/(r*r*r);s.vx+=a*s.x*h;s.vy+=a*s.y*h;s.x+=s.vx*h;s.y+=s.vy*h;s.t+=h;if(r<RE){s.crash=true;s.run=false;break}if(r>20*r0+1e8){s.esc=true;s.run=false;break}}s.tr.push([s.x,s.y]);if(s.tr.length>900)s.tr.shift()},
draw(c,s,p){bg(c);const r0=(6400+p.h)*1e3,k=170/Math.max(r0,RE*1.6),cx=330,cy=280;earth(c,cx,cy,RE*k);c.beginPath();c.arc(cx,cy,r0*k,0,7);c.strokeStyle='rgba(255,255,255,0.15)';c.setLineDash([5,5]);c.stroke();c.setLineDash([]);
if(s.tr.length){c.beginPath();s.tr.forEach(([x,y],i)=>{const X=cx+x*k,Y=cy-y*k;i?c.lineTo(X,Y):c.moveTo(X,Y)});c.strokeStyle=s.crash?C.rose:C.amber;c.lineWidth=2.5;c.stroke();const [x,y]=s.tr[s.tr.length-1];ball(c,cx+x*k,cy-y*k,7,'#fff',C.amber)}else ball(c,cx,cy-r0*k,7,'#fff',C.amber);
const v0=Math.sqrt(GE*ME/r0),ve=Math.sqrt(2)*v0,Tp=2*Math.PI*r0/v0,m=1000;box(c,620,30,350,250,'');
[['v₀ (circular)',(v0/1e3).toFixed(2)+' km/s',C.lime],['vₑ from here',(ve/1e3).toFixed(2)+' km/s',C.rose],['Period T',(Tp/3600).toFixed(2)+' h',C.cyan],['KE',fmt(GE*ME*m/(2*r0))+' J',C.ink],['PE',fmt(-GE*ME*m/r0)+' J',C.ink],['TE = PE/2',fmt(-GE*ME*m/(2*r0))+' J',C.amber]].forEach(([a,b,col],i)=>{T(c,a,640,66+i*36,{s:17,c:C.dim});T(c,b,950,66+i*36,{a:'right',s:19,w:700,m:1,c:col})});
const fl=p.f;T(c,s.crash?'Fell back to Earth':s.esc?'ESCAPED — never returns':fl<0.999?'Speed < v₀ → falls inward (ellipse / crash)':fl<1.001?'Circular orbit':fl<1.414?'Elliptical orbit':'v ≥ √2 v₀ → escapes',795,330,{a:'center',s:19,w:700,c:s.crash||s.esc?C.rose:C.lime});
T(c,'Launch speed = '+(v0*p.f/1e3).toFixed(2)+' km/s',795,370,{a:'center',s:18,m:1,c:C.amber});if(!s.run&&!s.tr.length)hint(c,'Tap “Launch”');},
readings(s,p){const r0=(6400+p.h)*1e3,v0=Math.sqrt(GE*ME/r0);return[['Orbit radius r',(r0/1e3).toFixed(0),'km'],['v₀',(v0/1e3).toFixed(2),'km/s'],['Period T',(2*Math.PI*r0/v0/3600).toFixed(2),'h'],['Escape vₑ',(Math.sqrt(2)*v0/1e3).toFixed(2),'km/s']]},
columns:['h (km)','r (km)','v₀ (km/s)','T (h)','vₑ (km/s)'],
record(s,p){const r0=(6400+p.h)*1e3,v0=Math.sqrt(GE*ME/r0);return[p.h,6400+p.h,+(v0/1e3).toFixed(2),+(2*Math.PI*r0/v0/3600).toFixed(2),+(Math.sqrt(2)*v0/1e3).toFixed(2)]},
plot:{x:0,y:2,fit:false},
result(rows){const b=rows.find(r=>Math.abs(r[3]-24)<1);return'Higher orbit → slower speed, longer period. vₑ = √2 v₀ at every height.'+(b?'  T ≈ 24 h at h ≈ '+b[0]+' km → geostationary orbit.':'  Find the height where T = 24 h (geostationary ≈ 36 000 km).')}};

S.kepler={title:"Kepler's Laws of Planetary Motion",topic:'mech',grades:[9,11],
aim:'Watch a planet on an elliptical orbit: verify equal areas in equal times (2nd law) and T² ∝ a³ (3rd law).',
apparatus:['Sun at one focus','Planet on an elliptical orbit','Timer (years)'],
formula:'1st law: orbit is an ellipse with the Sun at one focus      2nd law: equal areas in equal times (dA/dt = L/2m = constant)      3rd law: T² ∝ a³  (T in years, a in AU: T² = a³)',
procedure:['Set the semi-major axis a and the eccentricity e.','Watch the coloured sectors: each is swept in the same time interval.','Note the planet is fastest at perihelion, slowest at aphelion.','Record a and T for 4–5 orbits.','Plot T² against a³: a straight line of slope 1.'],
controls:[{k:'a',label:'Semi-major axis a',type:'range',min:0.4,max:5,step:0.2,def:1.6,unit:'AU'},{k:'e',label:'Eccentricity e',type:'range',min:0,max:0.8,step:0.1,def:0.5,unit:''},{k:'sp',label:'Show equal-time sectors',type:'toggle',def:true}],
init(){return{t:0}},onChange(s){s.t=0},step(s,p,dt){s.t+=dt*0.25},
pos(p,tt){const Tp=Math.pow(p.a,1.5),M=2*Math.PI*((tt/Tp)%1);let E=M;for(let i=0;i<20;i++)E-=(E-p.e*Math.sin(E)-M)/(1-p.e*Math.cos(E));return[p.a*(Math.cos(E)-p.e),p.a*Math.sqrt(1-p.e*p.e)*Math.sin(E)]},
draw(c,s,p){bg(c);const k=Math.min(330/(p.a*(1+p.e)),200/(p.a*Math.sqrt(1-p.e*p.e))),cx=450,cy=280,b=p.a*Math.sqrt(1-p.e*p.e);
c.beginPath();c.ellipse(cx-p.a*p.e*k,cy,p.a*k,b*k,0,0,7);c.strokeStyle='rgba(255,255,255,0.3)';c.lineWidth=1.5;c.stroke();
const Tp=Math.pow(p.a,1.5),dT=Tp/12;if(p.sp)[0,6].forEach((i,j)=>{c.beginPath();c.moveTo(cx,cy);for(let q=0;q<=20;q++){const [x,y]=this.pos(p,i*dT+dT*q/20);c.lineTo(cx+x*k,cy-y*k)}c.closePath();c.fillStyle=j?'rgba(79,214,255,0.35)':'rgba(255,181,71,0.35)';c.fill()});
const gs=c.createRadialGradient(cx,cy,2,cx,cy,30);gs.addColorStop(0,'#fff6c0');gs.addColorStop(1,'rgba(255,190,60,0)');c.fillStyle=gs;c.beginPath();c.arc(cx,cy,30,0,7);c.fill();
const [x,y]=this.pos(p,s.t),[x2,y2]=this.pos(p,s.t+0.001),v=Math.hypot(x2-x,y2-y)/0.001;ball(c,cx+x*k,cy-y*k,9,'#b8e0ff','#2a6fb3');L(c,cx,cy,cx+x*k,cy-y*k,'rgba(255,255,255,0.25)',1);
T(c,'perihelion',cx+p.a*(1-p.e)*k+8,cy+20,{s:13,c:C.dim});T(c,'aphelion',cx-p.a*(1+p.e)*k-8,cy+20,{a:'right',s:13,c:C.dim});
box(c,720,30,250,150,'');T(c,'T = '+Tp.toFixed(2)+' yr',740,74,{s:22,w:700,m:1,c:C.amber});T(c,'speed '+(v*2*Math.PI/Tp*0+v/Tp*Tp).toFixed(2)+' AU/yr',740,112,{s:18,m:1,c:C.lime});T(c,'year '+s.t.toFixed(2),740,150,{s:18,m:1,c:C.dim});
if(p.sp)T(c,'Orange and blue sectors take the same time → equal areas',450,530,{a:'center',s:17,w:600,c:C.ink});},
readings(s,p){const Tp=Math.pow(p.a,1.5);return[['Period T',Tp.toFixed(3),'yr'],['T²',(Tp*Tp).toFixed(3),'yr²'],['a³',Math.pow(p.a,3).toFixed(3),'AU³'],['Perihelion / aphelion',(p.a*(1-p.e)).toFixed(2)+' / '+(p.a*(1+p.e)).toFixed(2),'AU']]},
columns:['a (AU)','e','T (yr)','a³ (AU³)','T² (yr²)'],
record(s,p){const Tp=Math.pow(p.a,1.5);return[p.a,p.e,+Tp.toFixed(3),+Math.pow(p.a,3).toFixed(3),+(Tp*Tp).toFixed(3)]},
plot:{x:3,y:4},
result(rows){const f=lin(rows.map(r=>[r[3],r[4]]));return f&&rows.length>1?'T² / a³ = '+f.b.toFixed(3)+' (constant, independent of e) → Kepler’s 3rd law.':''}};

/* ── HEAT ─────────────────────────────── */
S.tempScales={title:'Temperature Scales & Thermometry',topic:'heat',grades:[7,11],
aim:'Read one temperature on the Celsius, Fahrenheit, Kelvin and Reaumur scales and on a scale you design yourself from two fixed points; find the general conversion rule.',
apparatus:['Thermometers marked in °C, °F, K, °R','Custom scale with your own fixed points'],
formula:'(C − 0)/100 = (F − 32)/180 = (K − 273.15)/100 = (R − 0)/80 = (X − LFP)/(UFP − LFP)      −40 °C = −40 °F',
procedure:['Set the temperature with the slider.','Read all four thermometers.','Set the lower and upper fixed points of your own scale X.','Record readings at 5 temperatures.','Plot F against C: slope 1.8, intercept 32. Find where C = F.'],
controls:[{k:'C',label:'Temperature',type:'range',min:-50,max:120,step:5,def:37,unit:'°C'},{k:'L',label:'Your scale: lower fixed point',type:'range',min:-20,max:40,step:5,def:20,unit:'°X'},{k:'U',label:'Your scale: upper fixed point',type:'range',min:80,max:240,step:10,def:180,unit:'°X'}],
init(){return{}},
vals(p){return{F:p.C*1.8+32,K:p.C+273.15,R:p.C*0.8,X:p.L+(p.U-p.L)*p.C/100}},
draw(c,s,p){bg(c);const v=this.vals(p),f=(p.C+50)/170;[['°C',p.C,-50,120,C.cyan],['°F',v.F,-58,248,C.amber],['K',v.K,223,393,C.lime],['°R',v.R,-40,96,C.violet],['°X',v.X,p.L-50*(p.U-p.L)/100,p.L+120*(p.U-p.L)/100,C.rose]].forEach(([u,val,mn,mx,col],i)=>{
const x=110+i*190,top=70,bot=430;RR(c,x-12,top,24,bot-top+10,12,'rgba(235,242,250,0.92)','#9fb0c4');RR(c,x-5,bot-(bot-top-20)*f,10,(bot-top-20)*f+12,4,'#d62839');c.beginPath();c.arc(x,bot+18,18,0,7);c.fillStyle='#d62839';c.fill();
for(let j=0;j<=6;j++){const y=bot-(bot-top-20)*j/6,tv=mn+(mx-mn)*j/6;L(c,x+14,y,x+26,y,C.dim,1);T(c,tv.toFixed(0),x+30,y+5,{s:13,m:1,c:C.dim})}
T(c,val.toFixed(1)+' '+u,x,40,{a:'center',s:22,w:700,m:1,c:col})});
T(c,'Your scale X: ice point = '+p.L+' °X, steam point = '+p.U+' °X  ('+(p.U-p.L)+' divisions)',500,510,{a:'center',s:18,w:600});},
readings(s,p){const v=this.vals(p);return[['Fahrenheit',v.F.toFixed(1),'°F'],['Kelvin',v.K.toFixed(2),'K'],['Reaumur',v.R.toFixed(1),'°R'],['Your scale',v.X.toFixed(1),'°X']]},
columns:['°C','°F','K','°R','°X'],
record(s,p){const v=this.vals(p);return[p.C,+v.F.toFixed(1),+v.K.toFixed(2),+v.R.toFixed(1),+v.X.toFixed(1)]},
plot:{x:0,y:1},
result(rows){const f=lin(rows.map(r=>[r[0],r[1]]));return f&&rows.length>1?'F = '+f.b.toFixed(2)+' C + '+f.a.toFixed(1)+'.  C = F at −40.  One Celsius division = 1.8 Fahrenheit divisions = 1 kelvin.':''}};

S.expansion={title:'Linear Expansion of a Metal Rod',topic:'heat',grades:[8,11],
aim:'Heat metal rods in a steam jacket, measure the increase in length with a dial gauge and find the coefficient of linear expansion α (and β, γ).',
apparatus:['Metal rods (L₀ = 50 cm): aluminium, brass, copper, steel','Steam jacket with thermometer','Dial gauge (least count 0.01 mm)'],
formula:'ΔL = α L₀ ΔT      α = ΔL / (L₀ ΔT)      β = 2α (area)      γ = 3α (volume)      ρ′ = ρ / (1 + γ ΔT)',
procedure:['Choose the rod.','Raise the temperature with the steam control.','Read ΔL on the dial gauge.','Record at 5 temperatures.','Plot ΔL against ΔT; α = slope / L₀. Compare the metals.'],
controls:[{k:'m',label:'Rod',type:'select',def:'al',options:[['al','Aluminium'],['br','Brass'],['cu','Copper'],['st','Steel']]},{k:'T',label:'Temperature',type:'range',min:20,max:100,step:10,def:60,unit:'°C'}],
init(){return{}},
M(p){return{al:[23e-6,'#d8dde4',2700],br:[19e-6,'#e8c35a',8500],cu:[17e-6,'#e08a4a',8960],st:[12e-6,'#8e98a6',7850]}[p.m]},
dL(p){return this.M(p)[0]*500*(p.T-20)},
draw(c,s,p){bg(c);const [a,col]=this.M(p),d=this.dL(p);RR(c,120,220,640,70,30,'rgba(200,215,230,0.15)','rgba(200,215,230,0.4)',2);if(p.T>20){c.save();c.globalAlpha=(p.T-20)/160;RR(c,120,220,640,70,30,'#ff8a5c');c.restore()}
RR(c,90,236,40+600+d*60,38,4,G(c,0,236,0,274,[col,'#3b4451']));RR(c,70,200,30,110,4,'#4a5566');T(c,'fixed end',85,330,{a:'center',s:13,c:C.dim});
const gx=780;c.beginPath();c.arc(gx+60,255,70,0,7);c.fillStyle='#f2efe6';c.fill();c.strokeStyle='#8792a3';c.lineWidth=4;c.stroke();for(let i=0;i<100;i+=5){const an=i/100*2*Math.PI-Math.PI/2;L(c,gx+60+Math.cos(an)*58,255+Math.sin(an)*58,gx+60+Math.cos(an)*(i%10?52:46),255+Math.sin(an)*(i%10?52:46),'#1d2733',i%10?1:2)}
const an=(d%1)*2*Math.PI-Math.PI/2;L(c,gx+60,255,gx+60+Math.cos(an)*50,255+Math.sin(an)*50,'#d62839',3);L(c,730+d*60,255,gx-10,255,'#cfd6df',4);T(c,'dial gauge',gx+60,350,{a:'center',s:14,c:C.dim});
T(c,'Steam jacket: '+p.T+' °C',440,190,{a:'center',s:20,w:700,c:C.rose});box(c,250,380,500,110,'');T(c,'ΔL = '+d.toFixed(2)+' mm',500,425,{a:'center',s:28,w:700,m:1,c:C.lime});T(c,'L₀ = 500 mm   ·   ΔT = '+(p.T-20)+' °C',500,465,{a:'center',s:17,m:1,c:C.dim});},
readings(s,p){const [a,,rho]=this.M(p);return[['ΔL',this.dL(p).toFixed(2),'mm'],['α',fmt(a),'/°C'],['γ = 3α',fmt(3*a),'/°C'],['Density now',(rho/(1+3*a*(p.T-20))).toFixed(1),'kg/m³']]},
columns:['Rod','T (°C)','ΔT (°C)','ΔL (mm)'],
record(s,p){if(p.T===20)return{error:'Heat the rod first.'};return[{al:'Al',br:'Brass',cu:'Cu',st:'Steel'}[p.m],p.T,p.T-20,+this.dL(p).toFixed(2)]},
plot:{x:2,y:3},
result(rows){const g={};rows.forEach(r=>(g[r[0]]=g[r[0]]||[]).push(r[3]/(500*r[2])));return Object.keys(g).map(k=>k+': α ≈ '+(avg(g[k])*1e6).toFixed(1)+' × 10⁻⁶ /°C').join('   ·   ')}};

S.bimetal={title:'Bimetallic Strip & Thermostat',topic:'heat',grades:[8,11],
aim:'Heat a bimetallic strip and measure how it bends; find the radius of the arc and use the strip as a thermostat switch.',
apparatus:['Brass–invar steel / aluminium–steel bimetallic strip (10 cm, each layer 0.5 mm)','Heater with thermometer','Contact screw and bulb (thermostat)'],
formula:'Radius of the bent strip: R = d / [(α₁ − α₂) ΔT]   (d = thickness of each strip)      Tip deflection y ≈ L² / (2R)      Heated: brass (higher α) on the outside (convex side); cooled: brass on the inside',
procedure:['Choose the pair of metals.','Raise or lower the temperature.','Read R and the tip deflection y.','Record at 5 temperatures; y ∝ ΔT.','Set the contact gap: the bulb switches off when the strip touches — a thermostat.'],
controls:[{k:'pair',label:'Strip',type:'select',def:'bs',options:[['bs','Brass + Invar steel'],['as','Aluminium + steel']]},{k:'T',label:'Temperature',type:'range',min:-20,max:200,step:10,def:120,unit:'°C'},{k:'gap',label:'Contact gap',type:'range',min:1,max:10,step:1,def:4,unit:'mm'}],
init(){return{}},
d(p){return p.pair==='bs'?[19e-6,1e-6,'Brass','Invar']:[23e-6,12e-6,'Aluminium','Steel']},
calc(p){const [a1,a2]=this.d(p),dT=p.T-20;if(!dT)return{R:Infinity,y:0};const Rr=0.0005/((a1-a2)*dT);return{R:Rr,y:0.01/(2*Rr)*1000}},
draw(c,s,p){bg(c);const k=this.calc(p),[,,n1,n2]=this.d(p),x0=200,y0=280,Lp=500,sc=8;RR(c,150,230,60,110,6,'#4a5566');
c.beginPath();for(let i=0;i<=50;i++){const x=Lp*i/50,dy=-k.y*sc*Math.pow(i/50,2);i?c.lineTo(x0+x,y0-dy-8):c.moveTo(x0,y0-8)}c.strokeStyle='#e8c35a';c.lineWidth=10;c.stroke();
c.beginPath();for(let i=0;i<=50;i++){const x=Lp*i/50,dy=-k.y*sc*Math.pow(i/50,2);i?c.lineTo(x0+x,y0-dy+2):c.moveTo(x0,y0+2)}c.strokeStyle='#8e98a6';c.lineWidth=10;c.stroke();
T(c,n1+' (top)',x0+20,y0-30,{s:15,w:600,c:'#e8c35a'});T(c,n2+' (bottom)',x0+20,y0+34,{s:15,w:600,c:'#a8b0bb'});
const cy=y0+p.gap*sc+12;L(c,x0+Lp-10,cy,x0+Lp-10,cy+40,'#cfd6df',4);T(c,'contact',x0+Lp+4,cy+56,{a:'center',s:14,c:C.dim});const touch=k.y>=p.gap;
c.beginPath();c.arc(860,270,30,0,7);c.fillStyle=touch?'#3b4451':'rgba(255,230,140,0.9)';c.fill();T(c,touch?'Heater OFF (contact broken)':'Heater ON',860,330,{a:'center',s:17,w:700,c:touch?C.rose:C.lime});
if(p.T<20)T(c,'Cooled: bends upward — brass contracts more',360,200,{a:'center',s:17,w:600,c:C.cyan});
box(c,620,30,350,150,'');T(c,'ΔT = '+(p.T-20)+' °C',640,70,{s:20,w:700,m:1,c:C.amber});T(c,'R = '+(isFinite(k.R)?(k.R*100).toFixed(1)+' cm':'∞ (straight)'),640,108,{s:20,w:700,m:1,c:C.lime});T(c,'tip deflection y = '+k.y.toFixed(2)+' mm',640,146,{s:20,w:700,m:1,c:C.cyan});},
readings(s,p){const k=this.calc(p);return[['ΔT',p.T-20,'°C'],['Radius R',isFinite(k.R)?(k.R*100).toFixed(1):'∞','cm'],['Deflection y',k.y.toFixed(2),'mm'],['Thermostat',k.y>=p.gap?'OFF':'ON','']]},
columns:['Strip','ΔT (°C)','R (cm)','y (mm)'],
record(s,p){if(p.T===20)return{error:'Change the temperature first.'};const k=this.calc(p);return[p.pair==='bs'?'Brass/Invar':'Al/Steel',p.T-20,+(k.R*100).toFixed(1),+k.y.toFixed(2)]},
plot:{x:1,y:3},
result(rows){return'Deflection ∝ ΔT and 1/R ∝ ΔT. A larger difference (α₁ − α₂) bends more — hence brass–invar. Used in thermostats, fire alarms and flashers.'}};

/* ── KINEMATICS ─────────────────────────────── */
S.distDisp={title:'Distance vs Displacement',topic:'mech',grades:[6,9,11],
aim:'Move along different paths and compare the distance travelled (scalar, path length) with the displacement (vector, shortest straight line from start to finish).',
apparatus:['Straight track','Circular running track (radius 20 m)','Rectangular field (40 m × 30 m)'],
formula:'Distance = total path length (≥ 0, never decreases)      Displacement = change in position (has direction; can be zero)      |displacement| ≤ distance',
procedure:['Choose the path.','Move along it with the “Progress” slider.','Compare distance and displacement (arrow).','Record at several points: half-way, full circle etc.','Note: after one full lap the displacement is zero but the distance is 2πR.'],
controls:[{k:'path',label:'Path',type:'select',def:'c',options:[['s','Straight: 30 m east, then 20 m west'],['c','Circular track (R = 20 m)'],['r','Rectangle 40 m × 30 m']]},{k:'f',label:'Progress',type:'range',min:0,max:100,step:5,def:50,unit:'%'}],
init(){return{}},
pt(p,f){if(p.path==='s'){const d=50*f;return d<=30?[d,0,d]:[30-(d-30),0,d]}if(p.path==='c'){const a=2*Math.PI*f;return[20*Math.sin(a),20-20*Math.cos(a),2*Math.PI*20*f]}const per=140,d=per*f;let x,y;if(d<=40){x=d;y=0}else if(d<=70){x=40;y=d-40}else if(d<=110){x=40-(d-70);y=30}else{x=0;y=30-(d-110)}return[x,y,d]},
draw(c,s,p){bg(c);const f=p.f/100,k=p.path==='s'?16:p.path==='c'?8:8,ox=p.path==='s'?250:p.path==='c'?400:260,oy=p.path==='c'?440:p.path==='r'?420:300;
c.beginPath();for(let i=0;i<=100;i++){const [x,y]=this.pt(p,i/100);i?c.lineTo(ox+x*k,oy-y*k-(p.path==='s'&&i>60?20:0)):c.moveTo(ox+x*k,oy-y*k)}c.strokeStyle='rgba(255,255,255,0.2)';c.lineWidth=6;c.stroke();
c.beginPath();for(let i=0;i<=Math.round(f*100);i++){const [x,y]=this.pt(p,i/100);i?c.lineTo(ox+x*k,oy-y*k-(p.path==='s'&&i>60?20:0)):c.moveTo(ox+x*k,oy-y*k)}c.strokeStyle=C.amber;c.lineWidth=5;c.stroke();
const [x,y,dist]=this.pt(p,f),ex=ox+x*k,ey=oy-y*k-(p.path==='s'&&f>0.6?20:0);ball(c,ox,oy,8,'#b6f35c','#4a7a10');T(c,'start',ox,oy+26,{a:'center',s:14,c:C.lime});arrow(c,ox,oy,ex,ey+(p.path==='s'&&f>0.6?20:0),C.cyan,4);ball(c,ex,ey,10,'#ffd08a','#a8661c');
box(c,700,40,270,150,'');T(c,'Distance',720,80,{s:17,c:C.dim});T(c,dist.toFixed(1)+' m',950,80,{a:'right',s:24,w:700,m:1,c:C.amber});T(c,'Displacement',720,124,{s:17,c:C.dim});T(c,Math.hypot(x,y).toFixed(1)+' m',950,124,{a:'right',s:24,w:700,m:1,c:C.cyan});T(c,'Ratio',720,168,{s:17,c:C.dim});T(c,dist?(Math.hypot(x,y)/dist).toFixed(2):'—',950,168,{a:'right',s:24,w:700,m:1,c:C.lime});
T(c,'orange = path travelled (distance)   ·   blue arrow = displacement',500,530,{a:'center',s:16,c:C.dim});},
readings(s,p){const [x,y,d]=this.pt(p,p.f/100);return[['Distance',d.toFixed(1),'m'],['Displacement',Math.hypot(x,y).toFixed(1),'m'],['Direction',(Math.atan2(y,x)*180/Math.PI).toFixed(0)+'° from east',''],['|s| / d',d?(Math.hypot(x,y)/d).toFixed(2):'—','']]},
columns:['Path','Progress (%)','Distance (m)','Displacement (m)'],
record(s,p){const [x,y,d]=this.pt(p,p.f/100);return[{s:'Straight',c:'Circle',r:'Rectangle'}[p.path],p.f,+d.toFixed(1),+Math.hypot(x,y).toFixed(1)]},
result(rows){return'Displacement never exceeds distance; they are equal only for motion in one straight line without turning back. A full lap gives zero displacement.'}};

S.avgSpeed={title:'Average Speed — Equal Distances vs Equal Times',topic:'mech',grades:[7,9,11],
aim:'A car covers a journey in two parts at different speeds. Find its average speed when the parts are equal in distance and when they are equal in time.',
apparatus:['Car on a 120 km road','Speedometer','Clock'],
formula:'Average speed = total distance / total time      Equal distances: v = 2v₁v₂ / (v₁ + v₂)  (harmonic mean)      Equal times: v = (v₁ + v₂) / 2  (arithmetic mean)',
procedure:['Choose “equal distances” or “equal times”.','Set the two speeds v₁ and v₂.','Tap “Drive” and read the total time.','Record the average speed.','Compare: with equal distances the average is less than (v₁ + v₂)/2 — the car spends longer at the lower speed.'],
controls:[{k:'mode',label:'Journey split',type:'select',def:'d',options:[['d','Equal distances'],['t','Equal times']]},{k:'v1',label:'Speed v₁',type:'range',min:20,max:100,step:10,def:40,unit:'km/h'},{k:'v2',label:'Speed v₂',type:'range',min:20,max:100,step:10,def:60,unit:'km/h'}],
actions:[{label:'Drive',run(s){Object.assign(s,{t:0,run:true})}}],
init(){return{t:0,run:false}},onChange(s){Object.assign(s,{t:0,run:false})},
plan(p){if(p.mode==='d'){const t1=60/p.v1,t2=60/p.v2;return{t1,t2,d1:60,tot:t1+t2}}const tt=120/(p.v1+p.v2);return{t1:tt,t2:tt,d1:p.v1*tt,tot:2*tt}},
step(s,p,dt){if(!s.run)return;const k=this.plan(p);s.t+=dt*0.5;if(s.t>=k.tot){s.t=k.tot;s.run=false;s.done=true}},
draw(c,s,p){bg(c);const k=this.plan(p),x0=80,w=840,y=260;RR(c,x0,y,w,40,6,'#2a2f36');L(c,x0,y+20,x0+w,y+20,'rgba(255,255,255,0.5)',2,[20,16]);const xm=x0+w*k.d1/120;L(c,xm,y-20,xm,y+60,C.amber,2,[5,4]);
T(c,'v₁ = '+p.v1+' km/h',(x0+xm)/2,y-30,{a:'center',s:18,w:700,c:C.cyan});T(c,'v₂ = '+p.v2+' km/h',(xm+x0+w)/2,y-30,{a:'center',s:18,w:700,c:C.violet});T(c,k.d1.toFixed(0)+' km',(x0+xm)/2,y+90,{a:'center',s:16,m:1,c:C.dim});T(c,(120-k.d1).toFixed(0)+' km',(xm+x0+w)/2,y+90,{a:'center',s:16,m:1,c:C.dim});
const d=s.t<=k.t1?p.v1*s.t:k.d1+p.v2*(s.t-k.t1);RR(c,x0+w*Math.min(d,120)/120-30,y+4,60,32,8,G(c,0,y,0,y+40,['#ff8aa8','#b52a52']));
const va=120/k.tot;box(c,200,380,600,130,'');T(c,'Total time = '+k.tot.toFixed(2)+' h   ·   elapsed '+s.t.toFixed(2)+' h',500,420,{a:'center',s:19,m:1,c:C.ink});T(c,'Average speed = 120 / '+k.tot.toFixed(2)+' = '+va.toFixed(1)+' km/h',500,458,{a:'center',s:22,w:700,m:1,c:C.lime});T(c,'(v₁ + v₂)/2 = '+((p.v1+p.v2)/2).toFixed(1)+' km/h',500,492,{a:'center',s:17,m:1,c:C.dim});},
readings(s,p){const k=this.plan(p);return[['Total time',k.tot.toFixed(2),'h'],['Average speed',(120/k.tot).toFixed(1),'km/h'],['Arithmetic mean',((p.v1+p.v2)/2).toFixed(1),'km/h'],['Harmonic mean',(2*p.v1*p.v2/(p.v1+p.v2)).toFixed(1),'km/h']]},
columns:['Split','v₁ (km/h)','v₂ (km/h)','Total t (h)','v_avg (km/h)'],
record(s,p){const k=this.plan(p);return[p.mode==='d'?'Equal distance':'Equal time',p.v1,p.v2,+k.tot.toFixed(2),+(120/k.tot).toFixed(1)]},
result(rows){return'Equal times → average = arithmetic mean. Equal distances → average = harmonic mean 2v₁v₂/(v₁+v₂), which is always smaller (unless v₁ = v₂).'}};

S.motionGraphs={title:'Equations of Motion & Motion Graphs',topic:'mech',grades:[9,11],
aim:'Drive a car with constant acceleration, watch its x–t and v–t graphs build up, and verify v = u + at, s = ut + ½at² and v² = u² + 2as.',
apparatus:['Car on a straight road with position sensor','Speedometer','Stopwatch'],
formula:'v = u + a t      s = u t + ½ a t²      v² = u² + 2 a s      slope of v–t = a,  area under v–t = displacement',
procedure:['Set the initial velocity u and acceleration a (negative a = retardation).','Tap “Start”. Pause at any moment.','Record t, v and s.','Repeat at 4–5 times.','Plot v against t: slope = a, intercept = u. Check the three equations in the table.'],
controls:[{k:'u',label:'Initial velocity u',type:'range',min:-10,max:20,step:1,def:4,unit:'m/s'},{k:'a',label:'Acceleration a',type:'range',min:-4,max:4,step:0.5,def:1.5,unit:'m/s²'}],
actions:[{label:'Start / pause',run(s){s.run=!s.run}},{label:'Reset',run(s){Object.assign(s,{t:0,run:false})}}],
init(){return{t:0,run:false}},onChange(s){Object.assign(s,{t:0,run:false})},
step(s,p,dt){if(s.run){s.t+=dt;if(s.t>=10){s.t=10;s.run=false}}},
draw(c,s,p){bg(c);const v=p.u+p.a*s.t,x=p.u*s.t+0.5*p.a*s.t*s.t;L(c,40,150,960,150,'rgba(255,255,255,0.25)',2);for(let m=-100;m<=200;m+=20){const X=300+m*3;if(X>40&&X<960){L(c,X,150,X,160,C.dim,1);T(c,m+'',X,178,{a:'center',s:12,m:1,c:C.dim})}}
const cx=cl(300+x*3,40,960);RR(c,cx-26,112,52,32,8,G(c,0,112,0,144,['#ffcf7a','#b9741f']));if(Math.abs(v)>0.1)arrow(c,cx,100,cx+v*4,100,C.cyan,3);T(c,'v = '+v.toFixed(1)+' m/s',cx,88,{a:'center',s:16,w:700,c:C.cyan});
graph(c,40,210,450,300,'x – t','t (s)','x (m)');graph(c,510,210,450,300,'v – t','t (s)','v (m/s)');
const xs=t=>p.u*t+0.5*p.a*t*t,vs=t=>p.u+p.a*t,xmn=Math.min(0,...[0,2,4,6,8,10].map(xs)),xmx=Math.max(1,...[0,2,4,6,8,10].map(xs)),vmn=Math.min(0,vs(0),vs(10)),vmx=Math.max(1,vs(0),vs(10));
if(s.t>0){plotFn(c,80,480,370*s.t/10,240,xs,0,s.t,xmn,xmx,C.amber);plotFn(c,550,480,370*s.t/10,240,vs,0,s.t,vmn,vmx,C.lime);c.save();c.globalAlpha=0.18;c.beginPath();c.moveTo(550,480-240*(0-vmn)/(vmx-vmn));for(let i=0;i<=40;i++){const t=s.t*i/40;c.lineTo(550+370*t/10,480-240*(vs(t)-vmn)/(vmx-vmn))}c.lineTo(550+370*s.t/10,480-240*(0-vmn)/(vmx-vmn));c.closePath();c.fillStyle=C.lime;c.fill();c.restore()}
L(c,550,480-240*(0-vmn)/(vmx-vmn),920,480-240*(0-vmn)/(vmx-vmn),'rgba(255,255,255,0.2)',1);T(c,'shaded area = displacement',735,500,{a:'center',s:12,c:C.dim});watch(c,880,60,40,s.t);},
readings(s,p){const v=p.u+p.a*s.t,x=p.u*s.t+0.5*p.a*s.t*s.t;return[['Time t',s.t.toFixed(2),'s'],['Velocity v',v.toFixed(2),'m/s'],['Displacement s',x.toFixed(2),'m'],['u² + 2as',(p.u*p.u+2*p.a*x).toFixed(2)+' = v² '+(v*v).toFixed(2),'']]},
columns:['t (s)','v (m/s)','s (m)','u + at','ut + ½at²','v² − u² − 2as'],
record(s,p){if(!s.t)return{error:'Start the car first.'};const v=p.u+p.a*s.t,x=p.u*s.t+0.5*p.a*s.t*s.t;return[+s.t.toFixed(2),+v.toFixed(2),+x.toFixed(2),+(p.u+p.a*s.t).toFixed(2),+(p.u*s.t+0.5*p.a*s.t*s.t).toFixed(2),Math.abs(v*v-p.u*p.u-2*p.a*x)<0.01?0:+(v*v-p.u*p.u-2*p.a*x).toFixed(2)]},
plot:{x:0,y:1},
result(rows){const f=lin(rows.map(r=>[r[0],r[1]]));return f&&rows.length>1?'v–t slope a ≈ '+f.b.toFixed(2)+' m/s², intercept u ≈ '+f.a.toFixed(2)+' m/s. All three equations of motion hold in every reading.':''}};

S.stopping={title:'Stopping Distance — Reaction & Braking',topic:'mech',grades:[9,11],
aim:'Find the total stopping distance of a car: the distance covered during the driver’s reaction time plus the braking distance (third equation of motion).',
apparatus:['Car on a road','Speed control','Reaction-time setting','Road surface (braking deceleration)'],
formula:'Reaction distance = u × t_r      Braking distance = u² / (2a)   (from v² = u² − 2as with v = 0)      Doubling the speed → 4× braking distance',
procedure:['Set the speed, the driver’s reaction time and the road surface.','Tap “Obstacle!”.','Read the reaction distance, braking distance and total.','Record for 5 speeds.','Plot stopping distance against speed — a curve (∝ u²), not a straight line.'],
controls:[{k:'v',label:'Speed',type:'range',min:20,max:120,step:10,def:60,unit:'km/h'},{k:'tr',label:'Reaction time',type:'range',min:0.2,max:2,step:0.1,def:0.7,unit:'s'},{k:'a',label:'Road',type:'select',def:7,options:[[7,'Dry (7 m/s²)'],[4,'Wet (4 m/s²)'],[1.5,'Icy (1.5 m/s²)']]}],
actions:[{label:'Obstacle!',run(s){Object.assign(s,{t:0,run:true,x:0})}}],
init(){return{t:0,run:false,x:0}},onChange(s){Object.assign(s,{t:0,run:false,x:0})},
d(p){const u=p.v/3.6;return{r:u*p.tr,b:u*u/(2*p.a)}},
step(s,p,dt){if(!s.run)return;const u=p.v/3.6;s.t+=dt;const tb=s.t-p.tr;if(tb<0)s.x=u*s.t;else{const vv=Math.max(0,u-p.a*tb);s.x=u*p.tr+(u*u-vv*vv)/(2*p.a);if(vv===0)s.run=false}},
draw(c,s,p){bg(c);const k=this.d(p),sc=Math.min(6,760/(k.r+k.b+10)),x0=80,y=300;RR(c,40,y-30,920,80,6,'#2a2f36');L(c,40,y+10,960,y+10,'rgba(255,255,255,0.4)',2,[20,16]);
RR(c,x0,y-60,k.r*sc,20,3,'rgba(255,181,71,0.5)');RR(c,x0+k.r*sc,y-60,k.b*sc,20,3,'rgba(255,107,154,0.5)');T(c,'reaction '+k.r.toFixed(1)+' m',x0+k.r*sc/2,y-72,{a:'center',s:15,w:600,c:C.amber});T(c,'braking '+k.b.toFixed(1)+' m',x0+k.r*sc+k.b*sc/2,y-72,{a:'center',s:15,w:600,c:C.rose});
const ox=x0+(k.r+k.b)*sc+20;RR(c,ox,y-20,24,60,4,'#e04a4a');T(c,'⚠',ox+12,y-30,{a:'center',s:22,c:C.amber});RR(c,x0+s.x*sc-60,y-14,60,32,8,G(c,0,y-14,0,y+18,['#9ab8ff','#3a5fb3']));
box(c,250,400,500,110,'');T(c,'Stopping distance = '+(k.r+k.b).toFixed(1)+' m',500,446,{a:'center',s:26,w:700,m:1,c:C.lime});T(c,'u = '+(p.v/3.6).toFixed(1)+' m/s',500,484,{a:'center',s:17,m:1,c:C.dim});if(!s.run&&!s.x)hint(c,'Tap “Obstacle!”');},
readings(s,p){const k=this.d(p);return[['Reaction distance',k.r.toFixed(1),'m'],['Braking distance',k.b.toFixed(1),'m'],['Total',(k.r+k.b).toFixed(1),'m'],['Braking time',(p.v/3.6/p.a).toFixed(2),'s']]},
columns:['v (km/h)','t_r (s)','a (m/s²)','Reaction (m)','Braking (m)','Total (m)'],
record(s,p){const k=this.d(p);return[p.v,p.tr,p.a,+k.r.toFixed(1),+k.b.toFixed(1),+(k.r+k.b).toFixed(1)]},
plot:{x:0,y:5,fit:false},
result(rows){return'Reaction distance ∝ u; braking distance ∝ u². At high speed or on a wet/icy road braking dominates — doubling speed makes braking distance 4×.'}};

S.verticalThrow={title:'Motion under Gravity — Ball Thrown Upward',topic:'mech',grades:[9,11],
aim:'Throw a ball straight up; follow its velocity and height, find the maximum height and time of flight, and show that the acceleration is g downward all the time (even at the top).',
apparatus:['Ball and launcher','Height scale','Stopwatch / velocity sensor'],
formula:'v = u − g t      h = u t − ½ g t²      H_max = u² / 2g      t_up = u / g      T = 2u / g      At the top: v = 0 but a = g',
procedure:['Set the launch speed u.','Tap “Throw”. Pause (“Start / pause”) at several moments.','Record t, h and v (+ up, − down).','Plot v against t: a straight line of slope −g.','Note H_max and the total time; the ball returns with the same speed.'],
controls:[{k:'u',label:'Launch speed u',type:'range',min:5,max:30,step:1,def:20,unit:'m/s'},{k:'g',label:'Location',type:'select',def:9.8,options:[[9.8,'Earth'],[1.62,'Moon']]}],
actions:[{label:'Throw',run(s){Object.assign(s,{t:0,run:true})}},{label:'Start / pause',run(s){s.run=!s.run}}],
init(){return{t:0,run:false}},onChange(s){Object.assign(s,{t:0,run:false})},
step(s,p,dt){if(!s.run)return;s.t+=dt*0.7;const Tf=2*p.u/p.g;if(s.t>=Tf){s.t=Tf;s.run=false}},
draw(c,s,p){bg(c);const Hm=p.u*p.u/(2*p.g),k=400/Math.max(Hm,5),y0=480,x=300,h=p.u*s.t-0.5*p.g*s.t*s.t,v=p.u-p.g*s.t;L(c,200,y0,400,y0,'rgba(255,255,255,0.4)',2);
RR(c,150,y0-400,26,400,3,'#efe6c8');const st=[1,2,5,10,20,50,100].find(q=>q*k>=40);for(let m=0;m*k<=400;m+=st){L(c,176,y0-m*k,186,y0-m*k,'#3b3325',1);T(c,m+'',146,y0-m*k+5,{a:'right',s:12,m:1,c:C.dim})}
L(c,200,y0-Hm*k,420,y0-Hm*k,'rgba(255,181,71,0.5)',1.5,[6,5]);T(c,'H_max = '+Hm.toFixed(1)+' m',430,y0-Hm*k+5,{s:16,w:700,c:C.amber});
ball(c,x,y0-h*k-10,11,'#ffd08a','#a8661c');if(Math.abs(v)>0.2)arrow(c,x+28,y0-h*k-10,x+28,y0-h*k-10-v*4,C.cyan,3);arrow(c,x-28,y0-h*k-10,x-28,y0-h*k+30,C.rose,3);T(c,'g',x-44,y0-h*k+30,{s:16,w:700,c:C.rose});
box(c,600,60,370,190,'');T(c,'t = '+s.t.toFixed(2)+' s',620,100,{s:22,w:700,m:1});T(c,'h = '+z(h).toFixed(2)+' m',620,140,{s:22,w:700,m:1,c:C.amber});T(c,'v = '+v.toFixed(2)+' m/s',620,180,{s:22,w:700,m:1,c:C.cyan});T(c,'a = −'+p.g+' m/s² (always)',620,220,{s:20,w:700,m:1,c:C.rose});
T(c,'t_up = '+(p.u/p.g).toFixed(2)+' s   ·   T = '+(2*p.u/p.g).toFixed(2)+' s',785,290,{a:'center',s:18,m:1,c:C.dim});if(Math.abs(v)<0.4&&s.t>0)T(c,'At the top: v = 0 but a ≠ 0!',785,330,{a:'center',s:20,w:700,c:C.lime});},
readings(s,p){const h=p.u*s.t-0.5*p.g*s.t*s.t,v=p.u-p.g*s.t;return[['Time t',s.t.toFixed(2),'s'],['Height h',z(h).toFixed(2),'m'],['Velocity v',v.toFixed(2),'m/s'],['H_max',(p.u*p.u/(2*p.g)).toFixed(2),'m']]},
columns:['t (s)','h (m)','v (m/s)'],
record(s,p){if(!s.t)return{error:'Throw the ball first.'};return[+s.t.toFixed(2),+z(p.u*s.t-0.5*p.g*s.t*s.t).toFixed(2),+(p.u-p.g*s.t).toFixed(2)]},
plot:{x:0,y:2},
result(rows){const f=lin(rows.map(r=>[r[0],r[2]]));return f&&rows.length>1?'Slope of v–t ≈ '+f.b.toFixed(2)+' m/s² = −g (constant, also at the top). Time up = time down; the ball returns with speed u.':''}};

S.relative={title:'Rest, Motion & Relative Velocity',topic:'mech',grades:[6,9,11],
aim:'Watch two objects from the ground and from a moving frame: rest and motion depend on the observer. Find the relative velocity and when one catches or meets the other.',
apparatus:['Two vehicles A and B on a straight road','Observer on the ground / riding with A'],
formula:'v_BA = v_B − v_A   (velocity of B as seen from A)      Meeting / catching time t = initial separation / |relative speed of approach|      In A’s own frame, A is at rest',
procedure:['Set the velocities of A and B (+ right, − left) and their separation.','Choose the frame: ground or riding with A.','Tap “Go” and watch.','Record v_BA and the meeting time.','Switch frames: the meeting time is the same in both — only the description of motion changes.'],
controls:[{k:'vA',label:'Velocity of A',type:'range',min:-20,max:20,step:2,def:12,unit:'m/s'},{k:'vB',label:'Velocity of B',type:'range',min:-20,max:20,step:2,def:-8,unit:'m/s'},{k:'d',label:'Initial separation',type:'range',min:100,max:500,step:50,def:300,unit:'m'},{k:'fr',label:'Observer frame',type:'select',def:'g',options:[['g','Standing on the ground'],['a','Riding with A']]}],
actions:[{label:'Go',run(s){Object.assign(s,{t:0,run:true,met:false})}}],
init(){return{t:0,run:false,met:false}},onChange(s){Object.assign(s,{t:0,run:false,met:false})},
tm(p){const ap=p.vA-p.vB;return ap>0?p.d/ap:Infinity},
step(s,p,dt){if(!s.run)return;s.t+=dt*1.5;const tm=this.tm(p);if(s.t>=tm){s.t=tm;s.run=false;s.met=true}if(s.t>60)s.run=false},
draw(c,s,p){bg(c);const xa=p.vA*s.t,xb=p.d+p.vB*s.t,off=p.fr==='a'?xa:0,k=700/Math.max(p.d*1.6,200),X=x=>150+(x-off)*k;RR(c,20,250,960,70,6,'#2a2f36');for(let m=-1000;m<=1500;m+=50){const px=X(m);if(px>20&&px<980){L(c,px,320,px,332,C.dim,1)}}
for(let i=0;i<8;i++){const tx=X(i*120-200);if(tx>20&&tx<980){L(c,tx,250,tx,200,'#4a7a3a',4);c.beginPath();c.arc(tx,192,16,0,7);c.fillStyle='#3c6b2f';c.fill()}}
const car=(x,col,lab,v)=>{RR(c,x-30,262,60,34,8,col);T(c,lab,x,286,{a:'center',s:18,w:800,c:'#0a1018'});const rv=v-(p.fr==='a'?p.vA:0);if(Math.abs(rv)>0.1)arrow(c,x,240,x+rv*5,240,C.cyan,3);T(c,(rv>0?'+':'')+rv+' m/s',x,226,{a:'center',s:15,w:700,m:1,c:C.cyan})};car(X(xa),C.amber,'A',p.vA);car(X(xb),C.teal,'B',p.vB);
T(c,p.fr==='a'?'Seen by a passenger in A: A is at rest, the trees move backwards':'Seen from the ground: the trees are at rest',500,180-40,{a:'center',s:18,w:600,c:C.ink});
const tm=this.tm(p);box(c,250,380,500,130,'');T(c,'v_BA = v_B − v_A = '+(p.vB-p.vA)+' m/s',500,422,{a:'center',s:22,w:700,m:1,c:C.lime});T(c,isFinite(tm)?'They meet after '+tm.toFixed(1)+' s, '+(p.vA*tm).toFixed(0)+' m from A’s start':'Separation never closes — they never meet',500,460,{a:'center',s:19,w:600,c:isFinite(tm)?C.amber:C.rose});T(c,'t = '+s.t.toFixed(1)+' s'+(s.met?'  — MET':''),500,494,{a:'center',s:17,m:1,c:C.dim});},
readings(s,p){const tm=this.tm(p);return[['v_BA',p.vB-p.vA,'m/s'],['v_AB',p.vA-p.vB,'m/s'],['Meeting time',isFinite(tm)?tm.toFixed(1):'never','s'],['Gap now',Math.abs(p.d+p.vB*s.t-p.vA*s.t).toFixed(0),'m']]},
columns:['v_A (m/s)','v_B (m/s)','d (m)','v_BA (m/s)','t_meet (s)'],
record(s,p){const tm=this.tm(p);return[p.vA,p.vB,p.d,p.vB-p.vA,isFinite(tm)?+tm.toFixed(1):'never']},
result(rows){return'Rest and motion are relative to the observer. Opposite directions: speeds add; same direction: speeds subtract. t_meet = separation ÷ relative speed of approach.'}};

window.LabParts=(window.LabParts||0)+1;
(window.LabExtra=window.LabExtra||[]).push({order:['relative','distDisp','avgSpeed','motionGraphs','verticalThrow','stopping','cavendish','gVariation','gravPotential','kepler','satellite','tempScales','expansion','bimetal'],
syl:{6:[['Rest & motion relative to observer','relative'],['Distance and displacement','distDisp']],7:[['Speed & average speed','avgSpeed'],['Temperature scales','tempScales']],8:[['Thermal expansion of solids','expansion'],['Bimetallic strip','bimetal']],
9:[['Distance & displacement','distDisp'],['Average speed','avgSpeed'],['Equations of motion & graphs','motionGraphs'],['Free fall: ball thrown up','verticalThrow'],['Stopping distance','stopping'],['Universal law of gravitation','cavendish'],['Variation of g','gVariation'],["Kepler's laws",'kepler'],['Relative velocity','relative']],
11:[['Relative velocity','relative'],['Distance & displacement (vectors)','distDisp'],['Average & instantaneous speed','avgSpeed'],['Equations of motion & graphs','motionGraphs'],['Motion under gravity','verticalThrow'],['Stopping distance (v² = u² + 2as)','stopping'],['Gravitation: Cavendish & G','cavendish'],['g with height, depth & latitude','gVariation'],['Gravitational field & potential','gravPotential'],['Satellites: orbital & escape velocity','satellite'],["Kepler's laws",'kepler'],['Thermometry & temperature scales','tempScales'],['Thermal expansion (α, β, γ)','expansion'],['Bimetallic strip','bimetal']]}});
})();


/* 0e469e70-755a-5d0c-ab5c-e889dd127fe9 */
(function(){
const K=window.LabKit;const {W,H,R,C,T,L,P,RR,G,ball,head,arc,room,meter,watch,cl,avg,hint}=K;
const S=window.LabSims;const bg=c=>room(c,false);
const lin=pts=>{const n=pts.length,sx=pts.reduce((a,p)=>a+p[0],0),sy=pts.reduce((a,p)=>a+p[1],0),sxx=pts.reduce((a,p)=>a+p[0]*p[0],0),sxy=pts.reduce((a,p)=>a+p[0]*p[1],0),d=n*sxx-sx*sx;if(n<2||Math.abs(d)<1e-12)return null;const b=(n*sxy-sx*sy)/d;return{b,a:(sy-b*sx)/n}};
const box=(c,x,y,w,h,title)=>{RR(c,x,y,w,h,10,'rgba(10,12,16,0.75)','rgba(255,255,255,0.12)',1);if(title)T(c,title,x+12,y+22,{s:14,w:600,c:C.dim})};
const arrow=(c,x1,y1,x2,y2,col,w)=>{if(Math.hypot(x2-x1,y2-y1)<2)return;L(c,x1,y1,x2,y2,col,w||3);head(c,x2,y2,Math.atan2(y2-y1,x2-x1),col,14)};
const z=v=>Math.abs(v)<0.5e-1?0:v;
const mag=(c,x,y,w,h,ang,lab)=>{c.save();c.translate(x,y);c.rotate(ang||0);RR(c,-w/2,-h/2,w/2,h,[6,0,0,6],'#d63b3b');RR(c,0,-h/2,w/2,h,[0,6,6,0],'#2f5fb8');T(c,'N',-w/4,6,{a:'center',s:Math.min(20,h*0.6),w:800,c:'#fff'});T(c,'S',w/4,6,{a:'center',s:Math.min(20,h*0.6),w:800,c:'#fff'});c.restore();if(lab)T(c,lab,x,y+h/2+22,{a:'center',s:15,c:C.dim})};

/* 1 ─ Free fall: bouncing & two-body meeting */
S.freeFall={title:'Free Fall — Bouncing Ball & Two Bodies Meeting',topic:'mech',grades:[9,11],
aim:'Drop a ball and follow its successive rebounds; then drop one ball from height H while throwing another up from the ground and find where and when they meet.',
apparatus:['Balls of different bounciness (coefficient of restitution e)','Tower of height H with scale','Launcher at the ground','Stopwatch'],
formula:'Dropped from h: t = √(2h/g), v = √(2gh)      After a bounce: v′ = e v, h′ = e² h      Meeting: one dropped from H, one thrown up with u → t = H / u, meeting height = H − ½ g t²',
procedure:['Choose the experiment.','Bounce: set the drop height and the ball (e). Tap “Start” and record the height of each rebound.','Meeting: set H and u. Tap “Start”; record the meeting time and height.','Compare with t = H/u (the relative acceleration is zero!).','If u < √(gH/2)… the second ball falls back before they meet — try it.'],
controls:[{k:'mode',label:'Experiment',type:'select',def:'b',options:[['b','Bouncing ball'],['m','Two bodies meeting']]},{k:'H',label:'Height H',type:'range',min:5,max:40,step:1,def:20,unit:'m'},{k:'e',label:'Ball (e)',type:'select',def:0.8,options:[[0.9,'Super ball (0.9)'],[0.8,'Rubber (0.8)'],[0.5,'Tennis (0.5)']]},{k:'u',label:'Upward speed u (meeting)',type:'range',min:5,max:30,step:1,def:20,unit:'m/s'}],
actions:[{label:'Start',run(s,p){Object.assign(s,{t:0,run:true,y:p.H,v:0,n:0,peaks:[],y2:0,v2:p.u,met:null,mx:p.H})}}],
init(p){return{t:0,run:false,y:p?p.H:20,v:0,n:0,peaks:[],met:null}},onChange(s,p){Object.assign(s,{t:0,run:false,y:p.H,v:0,n:0,peaks:[],met:null})},
step(s,p,dt){if(!s.run)return;const g=9.8,h=dt/8;for(let i=0;i<8;i++){s.t+=h;if(p.mode==='b'){s.v-=g*h;s.y+=s.v*h;if(s.y<=0){s.y=0;s.v=-s.v*p.e;s.n++;s.mx=0;if(s.v<0.5){s.run=false;break}}if(s.v<=0&&s.mx===0&&s.n>0){s.mx=s.y;s.peaks.push(s.y)}}
else{s.y=p.H-0.5*g*s.t*s.t;s.y2=p.u*s.t-0.5*g*s.t*s.t;if(!s.met&&s.y2>=s.y){s.met={t:s.t,h:s.y};s.run=false;break}if(s.y<=0||(s.y2<0&&s.t>0.1)){s.run=false;break}}}},
draw(c,s,p){bg(c);const k=420/Math.max(p.H,10),y0=490,X=p.mode==='b'?300:260;L(c,100,y0,600,y0,'rgba(255,255,255,0.4)',2);RR(c,120,y0-420,24,420,3,'#efe6c8');
for(let m=0;m<=p.H;m+=5){L(c,144,y0-m*k,154,y0-m*k,'#3b3325',1);T(c,m+'',114,y0-m*k+5,{a:'right',s:12,m:1,c:C.dim})}
if(p.mode==='b'){ball(c,X,y0-s.y*k-12,12,'#ffd08a','#a8661c');let hh=p.H;for(let i=1;i<=5;i++){hh*=p.e*p.e;L(c,X+40,y0-hh*k,X+120,y0-hh*k,'rgba(79,214,255,0.4)',1.5,[5,4]);T(c,'h'+i+' = '+hh.toFixed(2)+' m',X+128,y0-hh*k+5,{s:14,m:1,c:C.cyan})}
box(c,620,40,350,170,'');T(c,'Bounces: '+s.n,640,84,{s:22,w:700,m:1,c:C.amber});T(c,'height '+s.y.toFixed(2)+' m',640,124,{s:20,m:1});T(c,'v = '+s.v.toFixed(2)+' m/s',640,162,{s:20,m:1,c:C.lime});T(c,'h′/h = e² = '+(p.e*p.e).toFixed(2),640,198,{s:18,m:1,c:C.dim})}
else{RR(c,X-40,y0-p.H*k-14,80,14,3,'#6f7b8c');ball(c,X,y0-Math.max(s.y,0)*k-26,12,'#ffd08a','#a8661c');ball(c,X+80,y0-Math.max(s.y2,0)*k-12,12,'#9ab8ff','#1e4fb3');T(c,'A (dropped)',X-50,y0-p.H*k-24,{a:'right',s:15,c:C.amber});T(c,'B (thrown up)',X+100,y0+24,{s:15,c:C.cyan});
const tm=p.H/p.u,hm=p.H-0.5*9.8*tm*tm;if(hm>0){L(c,X-60,y0-hm*k,X+140,y0-hm*k,'rgba(182,243,92,0.5)',1.5,[6,5]);T(c,'meet here',X+150,y0-hm*k+5,{s:15,c:C.lime})}
box(c,620,40,350,200,'');T(c,'t = '+s.t.toFixed(2)+' s',640,84,{s:22,w:700,m:1});T(c,'A at '+Math.max(z(s.y),0).toFixed(2)+' m',640,122,{s:20,m:1,c:C.amber});T(c,'B at '+Math.max(z(s.y2||0),0).toFixed(2)+' m',640,158,{s:20,m:1,c:C.cyan});
T(c,s.met?'MET at '+s.met.t.toFixed(2)+' s, '+s.met.h.toFixed(2)+' m':hm>0?'Predicted: t = H/u = '+tm.toFixed(2)+' s':'B falls back before A reaches it',640,200,{s:18,w:700,c:s.met?C.lime:hm>0?C.dim:C.rose});
T(c,'Relative acceleration of A w.r.t. B = 0 → they close in at constant speed u',500,535,{a:'center',s:15,c:C.dim})}
if(!s.run&&!s.t)hint(c,'Tap “Start”');},
readings(s,p){if(p.mode==='b')return[['Bounces',s.n,''],['Last rebound height',s.peaks.length?s.peaks[s.peaks.length-1].toFixed(2):'—','m'],['Impact speed √(2gH)',Math.sqrt(19.6*p.H).toFixed(2),'m/s'],['Fall time √(2H/g)',Math.sqrt(2*p.H/9.8).toFixed(2),'s']];const tm=p.H/p.u;return[['Predicted t = H/u',tm.toFixed(2),'s'],['Meeting height',(p.H-4.9*tm*tm).toFixed(2),'m'],['Measured t',s.met?s.met.t.toFixed(2):'—','s'],['Measured height',s.met?s.met.h.toFixed(2):'—','m']]},
columns:['Mode','H (m)','e or u','n / t (s)','height (m)'],
record(s,p){if(p.mode==='b'){if(!s.peaks.length)return{error:'Start and wait for at least one rebound.'};return['Bounce',p.H,p.e,s.peaks.length,+s.peaks[s.peaks.length-1].toFixed(2)]}if(!s.met)return{error:'Start and let the bodies meet first.'};return['Meeting',p.H,p.u,+s.met.t.toFixed(2),+s.met.h.toFixed(2)]},
result(rows){const b=rows.filter(r=>r[0]==='Bounce');return(b.length?'Each rebound height = e² × previous (h_n = e²ⁿ H). ':'')+(rows.some(r=>r[0]==='Meeting')?'Meeting time = H/u in every case — gravity acts equally on both, so it cancels in relative motion.':'')}};

/* 2 ─ s–t, v–t, a–t graphs */
S.graphs3={title:'Graphical Study of Motion — s–t, v–t, a–t',topic:'mech',grades:[9,11],
aim:'Play a journey and see its displacement–time, velocity–time and acceleration–time graphs together; read slopes and areas at any instant.',
apparatus:['Car on a straight road','Motion sensor','Three linked graphs'],
formula:'Slope of s–t = velocity      Slope of v–t = acceleration      Area under v–t = displacement      Area under a–t = change in velocity      Stationary: s–t horizontal; uniform v: s–t straight; accelerated: s–t curved',
procedure:['Choose a journey.','Drag the time cursor (or tap “Play”).','Read v from the slope of s–t, a from the slope of v–t.','Record readings at several times.','Check: area under v–t up to t equals the displacement s.'],
controls:[{k:'j',label:'Journey',type:'select',def:'bus',options:[['rest','Stationary'],['uni','Uniform velocity'],['acc','Uniform acceleration'],['dec','Uniform retardation'],['bus','Bus: start → cruise → stop'],['back','Goes forward, then returns']]},{k:'t',label:'Time cursor t',type:'range',min:0,max:20,step:0.5,def:8,unit:'s'}],
actions:[{label:'Play',run(s){if(s.tc>=20)s.tc=0;s.play=true}},{label:'Pause',run(s){s.play=false}}],
init(p){return{play:false,tc:p?p.t:8}},onChange(s,p,k){if(k==='t'){s.tc=p.t;s.play=false}},
a(j,t){if(j==='rest'||j==='uni')return 0;if(j==='acc')return 1;if(j==='dec')return -1;if(j==='bus')return t<5?2:t<13?0:t<18?-2:0;if(j==='back')return t<6?2:t<14?-1.5:0;return 0},
u0(j){return j==='uni'?3:j==='dec'?20:0},
state(j,t){let v=this.u0(j),s=j==='rest'?30:0;const h=0.01;for(let x=0;x<t-1e-9;x+=h){const a=this.a(j,x+h/2);s+=v*h+0.5*a*h*h;v+=a*h}return{s,v,a:this.a(j,t)}},
step(s,p,dt){if(s.play){s.tc=Math.min(20,s.tc+dt*2);if(s.tc>=20)s.play=false}},
draw(c,s,p){bg(c);const st=this.state(p.j,s.tc),samp=[];for(let i=0;i<=200;i++){const t=i/10;samp.push([t,this.state(p.j,t)])}
const ss=samp.map(x=>x[1].s),vs=samp.map(x=>x[1].v),as=samp.map(x=>x[1].a);const rng=a=>{let mn=Math.min(0,...a),mx=Math.max(0,...a);if(mx-mn<1){mx+=1;mn-=1}return[mn,mx]};
const pan=(x,y,w,h,arr,lab,col,unit,val)=>{box(c,x,y,w,h,lab);const [mn,mx]=rng(arr),Y=v=>y+h-20-(h-50)*(v-mn)/(mx-mn),X=t=>x+44+(w-60)*t/20;L(c,X(0),Y(0),X(20),Y(0),'rgba(255,255,255,0.3)',1);L(c,X(0),y+30,X(0),y+h-20,'rgba(255,255,255,0.3)',1);
c.beginPath();arr.forEach((v,i)=>{i?c.lineTo(X(i/10),Y(v)):c.moveTo(X(0),Y(v))});c.strokeStyle=col;c.lineWidth=3;c.stroke();L(c,X(s.tc),y+28,X(s.tc),y+h-16,'rgba(255,255,255,0.6)',1.5,[4,4]);c.beginPath();c.arc(X(s.tc),Y(val),7,0,7);c.fillStyle=C.amber;c.fill();T(c,val.toFixed(2)+' '+unit,x+w-12,y+22,{a:'right',s:17,w:700,m:1,c:col});
for(let t=0;t<=20;t+=5)T(c,t+'',X(t),y+h-4,{a:'center',s:11,m:1,c:C.dim});return{X,Y}};
const V=pan(20,150,315,320,vs,'v – t',C.lime,'m/s',st.v);c.save();c.globalAlpha=0.18;c.beginPath();c.moveTo(V.X(0),V.Y(0));for(let i=0;i<=s.tc*10;i++)c.lineTo(V.X(i/10),V.Y(vs[i]));c.lineTo(V.X(s.tc),V.Y(0));c.closePath();c.fillStyle=C.lime;c.fill();c.restore();
pan(345,150,315,320,ss,'s – t',C.amber,'m',st.s);pan(670,150,315,320,as,'a – t',C.rose,'m/s²',st.a);
const mn=Math.min(...ss),mx=Math.max(...ss,mn+1);L(c,40,90,960,90,'rgba(255,255,255,0.3)',2);const cx=60+880*(st.s-mn)/(mx-mn);RR(c,cx-24,62,48,26,7,G(c,0,62,0,88,['#ffcf7a','#b9741f']));if(Math.abs(st.v)>0.05)arrow(c,cx,52,cx+st.v*3,52,C.cyan,3);
T(c,'shaded area under v–t = displacement',178,500,{a:'center',s:13,c:C.dim});T(c,'t = '+s.tc.toFixed(1)+' s',500,530,{a:'center',s:20,w:700,m:1,c:C.ink});},
readings(s,p){const st=this.state(p.j,s.tc);return[['Displacement s',st.s.toFixed(2),'m'],['Velocity (slope of s–t)',st.v.toFixed(2),'m/s'],['Acceleration (slope of v–t)',st.a.toFixed(2),'m/s²'],['Motion',Math.abs(st.v)<0.01?'At rest':st.a===0?'Uniform velocity':st.a*st.v>0?'Speeding up':'Slowing down','']]},
columns:['Journey','t (s)','s (m)','v (m/s)','a (m/s²)'],
record(s,p){const st=this.state(p.j,s.tc),nm={rest:'Rest',uni:'Uniform',acc:'Accel.',dec:'Retard.',bus:'Bus',back:'Return'};return[nm[p.j],s.tc,+z(st.s).toFixed(2),+z(st.v).toFixed(2),+z(st.a).toFixed(2)]},
plot:{x:1,y:3,fit:false},
result(rows){return'Velocity is the slope of s–t, acceleration is the slope of v–t, and the area under v–t gives displacement. A negative v (returning journey) makes s–t slope downward.'}};

/* 3 ─ Horizontal projection & staircase */
S.horizontalProjectile={title:'Horizontal Projection — Cliff & Staircase',topic:'mech',grades:[11],
aim:'Throw a ball horizontally from a height; verify the parabolic path y = g x² / 2u², time of flight √(2h/g) and range u√(2h/g). Then roll a ball down a staircase and predict which step it hits first.',
apparatus:['Ball launcher at the edge of a cliff / table','Height scale','Staircase (step height & width)','Stroboscopic camera'],
formula:'x = u t,  y = ½ g t²   →   y = g x² / (2u²)      T = √(2h/g)  (independent of u!)      R = u √(2h/g)      v = √(u² + g²t²),  tan θ = g t / u      Staircase: first step hit n = ⌈2 h u² / (g b²)⌉',
procedure:['Choose cliff or staircase.','Set the launch speed u and the height h (or the step size).','Tap “Launch”. Strobe images are taken every 0.1 s — equal horizontal gaps, growing vertical gaps.','Record T and R for 4–5 speeds: T stays the same, R ∝ u.','Staircase: compare the predicted step with the one hit.'],
controls:[{k:'mode',label:'Setup',type:'select',def:'c',options:[['c','Cliff / table edge'],['s','Staircase']]},{k:'u',label:'Launch speed u',type:'range',min:1,max:12,step:0.5,def:5,unit:'m/s'},{k:'h',label:'Height h (cliff)',type:'range',min:2,max:40,step:1,def:20,unit:'m'},{k:'sh',label:'Step height (staircase)',type:'select',def:0.2,options:[[0.15,'15 cm'],[0.2,'20 cm'],[0.25,'25 cm']]},{k:'sb',label:'Step width (staircase)',type:'select',def:0.3,options:[[0.25,'25 cm'],[0.3,'30 cm'],[0.4,'40 cm']]}],
actions:[{label:'Launch',run(s){Object.assign(s,{t:0,run:true,hit:null})}}],
init(){return{t:0,run:false,hit:null}},onChange(s){Object.assign(s,{t:0,run:false,hit:null})},
step(s,p,dt){if(!s.run)return;s.t+=dt*0.6;const x=p.u*s.t,y=4.9*s.t*s.t;if(p.mode==='c'){if(y>=p.h){s.t=Math.sqrt(2*p.h/9.8);s.run=false;s.hit=1}}else{const n=Math.floor(x/p.sb)+1;if(y>=n*p.sh&&x>0){s.hit=n;s.run=false;s.t=Math.sqrt(2*n*p.sh/9.8)}if(s.t>3)s.run=false}},
draw(c,s,p){bg(c);if(p.mode==='c'){const Tf=Math.sqrt(2*p.h/9.8),Rr=p.u*Tf,k=Math.min(400/p.h,700/Math.max(Rr,5)),ox=140,oy=70;RR(c,ox-120,oy,120,p.h*k,4,'#4a5566');L(c,ox,oy+p.h*k,960,oy+p.h*k,'rgba(255,255,255,0.4)',2);
for(let tt=0;tt<=Math.min(s.t,Tf)+1e-6;tt+=0.1){const x=p.u*tt,y=4.9*tt*tt;c.beginPath();c.arc(ox+x*k,oy+y*k-8,6,0,7);c.fillStyle='rgba(255,181,71,0.45)';c.fill()}
const x=p.u*s.t,y=Math.min(4.9*s.t*s.t,p.h);ball(c,ox+x*k,oy+y*k-8,9,'#ffd08a','#a8661c');if(s.t>0){arrow(c,ox+x*k,oy+y*k-8,ox+x*k+p.u*8,oy+y*k-8,C.cyan,2.5);arrow(c,ox+x*k,oy+y*k-8,ox+x*k,oy+y*k-8+9.8*s.t*8,C.rose,2.5)}
if(s.hit){L(c,ox,oy+p.h*k+24,ox+Rr*k,oy+p.h*k+24,C.amber,2);T(c,'R = '+Rr.toFixed(2)+' m',ox+Rr*k/2,oy+p.h*k+46,{a:'center',s:18,w:700,m:1,c:C.amber})}T(c,'h = '+p.h+' m',ox-60,oy+p.h*k/2,{a:'center',s:16,w:700,c:'#fff'});
box(c,690,40,280,150,'');T(c,'T = √(2h/g) = '+Tf.toFixed(2)+' s',710,82,{s:18,w:700,m:1,c:C.lime});T(c,'R = u T = '+Rr.toFixed(2)+' m',710,118,{s:18,w:700,m:1,c:C.amber});const vv=Math.hypot(p.u,9.8*s.t);T(c,'v = '+vv.toFixed(2)+' m/s at '+(Math.atan2(9.8*s.t,p.u)*180/Math.PI).toFixed(0)+'°',710,154,{s:17,m:1,c:C.cyan})}
else{const k=Math.min(70,380/(14*p.sh)),ox=120,oy=70;for(let i=0;i<14;i++){RR(c,ox+i*p.sb*k,oy+(i+1)*p.sh*k,p.sb*k,4,0,'#cfd6df');L(c,ox+i*p.sb*k,oy+i*p.sh*k,ox+i*p.sb*k,oy+(i+1)*p.sh*k,'#cfd6df',4);T(c,(i+1)+'',ox+(i+0.5)*p.sb*k,oy+(i+1)*p.sh*k+20,{a:'center',s:13,m:1,c:C.dim})}
const tmax=s.t;c.beginPath();for(let tt=0;tt<=tmax;tt+=0.01){const x=p.u*tt,y=4.9*tt*tt;tt?c.lineTo(ox+x*k,oy+y*k-6):c.moveTo(ox,oy-6)}c.strokeStyle='rgba(255,181,71,0.7)';c.lineWidth=2.5;c.stroke();ball(c,ox+p.u*s.t*k,oy+4.9*s.t*s.t*k-8,8,'#ffd08a','#a8661c');
const n=Math.ceil(2*p.sh*p.u*p.u/(9.8*p.sb*p.sb));box(c,640,40,330,130,'');T(c,'Predicted step n = ⌈2hu²/gb²⌉ = '+n,660,82,{s:17,w:700,m:1,c:C.lime});T(c,'Hit step: '+(s.hit||'—'),660,122,{s:22,w:700,m:1,c:C.amber})}
if(!s.run&&!s.t)hint(c,'Tap “Launch”');},
readings(s,p){if(p.mode==='c'){const Tf=Math.sqrt(2*p.h/9.8);return[['Time of flight T',Tf.toFixed(2),'s'],['Range R',(p.u*Tf).toFixed(2),'m'],['Impact speed',Math.hypot(p.u,9.8*Tf).toFixed(2),'m/s'],['Impact angle',(Math.atan2(9.8*Tf,p.u)*180/Math.PI).toFixed(1),'° below horizontal']]}const n=Math.ceil(2*p.sh*p.u*p.u/(9.8*p.sb*p.sb));return[['Predicted step',n,''],['Step hit',s.hit||'—',''],['u²',(p.u*p.u).toFixed(2),'m²/s²'],['2h/(g b²)',(2*p.sh/(9.8*p.sb*p.sb)).toFixed(3),'s²/m²']]},
columns:['Setup','u (m/s)','h (m)','T (s)','R (m) / step'],
record(s,p){if(!s.hit)return{error:'Launch and let the ball land first.'};if(p.mode==='c'){const Tf=Math.sqrt(2*p.h/9.8);return['Cliff',p.u,p.h,+Tf.toFixed(2),+(p.u*Tf).toFixed(2)]}return['Stairs '+p.sh*100+'×'+p.sb*100,p.u,p.sh,+s.t.toFixed(2),s.hit]},
plot:{x:1,y:4},
result(rows){const c=rows.filter(r=>r[0]==='Cliff');if(c.length>1&&c.every(r=>r[2]===c[0][2]))return'Same height → same time of flight T = '+c[0][3]+' s for every speed; R ∝ u. Horizontal and vertical motions are independent.';return'T depends only on h; R = u√(2h/g). Staircase: the first step hit is ⌈2hu²/gb²⌉.'}};

/* 4 ─ Magnetic materials, domains & hysteresis */
S.magMaterials={title:'Magnetic Materials — Dia, Para, Ferro, Domains & Hysteresis',topic:'mag',grades:[8,12],
aim:'Place samples in a strong non-uniform field to classify them; watch the domains of a ferromagnet line up; trace the B–H hysteresis loop of soft iron and steel.',
apparatus:['Strong electromagnet with pointed pole pieces','Samples: bismuth, copper, water, aluminium, platinum, iron, nickel, steel','B–H loop tracer'],
formula:'Diamagnetic: weakly repelled (moves to weaker field)      Paramagnetic: weakly attracted      Ferromagnetic: strongly attracted (domains)      Soft iron: low retentivity & coercivity (electromagnets)      Steel: high retentivity & coercivity (permanent magnets)',
procedure:['Choose a sample and switch the field on.','Note whether it moves towards (attracted) or away (repelled) from the strong field, and how strongly.','Record and classify.','For iron or steel, raise H and watch domains align; then reduce H to zero and reverse it to trace the loop.','Compare the retentivity (B at H = 0) and coercivity (H needed for B = 0) of soft iron and steel.'],
controls:[{k:'smp',label:'Sample',type:'select',def:'fe',options:[['bi','Bismuth'],['cu','Copper'],['wa','Water'],['al','Aluminium'],['pt','Platinum'],['fe','Soft iron'],['st','Steel'],['ni','Nickel']]},{k:'Hf',label:'Magnetising field H',type:'range',min:-100,max:100,step:5,def:60,unit:'%'}],
init(){return{Bh:0,trail:[],lastH:null}},
info(p){return{bi:['Diamagnetic',-1,0,0],cu:['Diamagnetic',-0.6,0,0],wa:['Diamagnetic',-0.5,0,0],al:['Paramagnetic',0.6,0,0],pt:['Paramagnetic',0.8,0,0],fe:['Ferromagnetic',10,0.25,0.12],st:['Ferromagnetic',8,0.7,0.45],ni:['Ferromagnetic',6,0.4,0.2]}[p.smp]},
onChange(s,p,k){if(k==='smp'){s.Bh=0;s.trail=[];s.lastH=null}},
step(s,p,dt){const [cls,,Br,Hc]=this.info(p);if(cls!=='Ferromagnetic')return;const H=p.Hf/100;if(s.lastH===null)s.lastH=H;const up=H>=s.lastH,sh=up?Hc:-Hc,target=Math.tanh((H+sh)*3)*1.0;
const lim=up?Math.max(s.Bh,target):Math.min(s.Bh,target);s.Bh+= (lim-s.Bh)*Math.min(1,dt*6);s.lastH=H;const last=s.trail[s.trail.length-1];if(!last||Math.abs(last[0]-H)>0.01||Math.abs(last[1]-s.Bh)>0.01)s.trail.push([H,s.Bh]);if(s.trail.length>500)s.trail.shift()},
draw(c,s,p){bg(c);const [cls,chi]=this.info(p),H=p.Hf/100;
c.fillStyle='#4a5566';P(c,[[60,140],[220,140],[300,250],[220,250],[220,180],[60,180]],'#6f7b8c');P(c,[[60,440],[220,440],[300,330],[220,330],[220,400],[60,400]],'#6f7b8c');T(c,'strong field',300,290,{a:'center',s:13,c:C.dim});
for(let i=0;i<7;i++){const yy=255+i*12;L(c,300,yy,300+i*0,yy,C.rose,1)}
const disp=cl(chi*Math.abs(H)*14,-60,140),sx=470-disp;L(c,sx,60,sx,270,'#cfd6df',1.5);RR(c,sx-22,270,44,40,6,{bi:'#e3d7f2',cu:'#e08a4a',wa:'rgba(79,179,255,0.6)',al:'#d8dde4',pt:'#c9ccd2',fe:'#8e98a6',st:'#6c7888',ni:'#b9bfc7'}[p.smp]);
if(Math.abs(H)>0.02)arrow(c,sx,330,sx-Math.sign(chi)*cl(Math.abs(chi)*Math.abs(H)*20,10,80),330,cls==='Diamagnetic'?C.rose:C.lime,3);T(c,cls==='Diamagnetic'?'repelled':cls==='Paramagnetic'?'weakly attracted':'strongly attracted',sx,370,{a:'center',s:16,w:700,c:cls==='Diamagnetic'?C.rose:C.lime});
box(c,40,440,400,90,'');T(c,cls,240,480,{a:'center',s:24,w:800,c:C.amber});T(c,'relative pull ∝ χ = '+(chi>0?'+':'')+chi,240,512,{a:'center',s:15,m:1,c:C.dim});
if(cls==='Ferromagnetic'){box(c,560,30,410,230,'DOMAINS');for(let i=0;i<6;i++)for(let j=0;j<3;j++){const cx=600+i*62,cy=80+j*60,seed=Math.sin(i*12.9+j*78.2)*43758,ang0=(seed-Math.floor(seed))*6.28,al=cl(Math.abs(s.Bh),0,1),ang=s.Bh>=0?ang0*(1-al):ang0*(1-al)+Math.PI*al;RR(c,cx-26,cy-24,52,48,4,null,'rgba(255,255,255,0.15)');c.save();c.translate(cx,cy);c.rotate(ang);arrow(c,-16,0,16,0,C.amber,2.5);c.restore()}
box(c,560,280,410,260,'B – H LOOP');const ox=765,oy=410;L(c,580,oy,950,oy,'rgba(255,255,255,0.3)',1);L(c,ox,300,ox,530,'rgba(255,255,255,0.3)',1);T(c,'H',945,oy-8,{a:'right',s:13,c:C.dim});T(c,'B',ox+8,312,{s:13,c:C.dim});
c.beginPath();s.trail.forEach(([h,b],i)=>{const X=ox+h*170,Y=oy-b*100;i?c.lineTo(X,Y):c.moveTo(X,Y)});c.strokeStyle=C.cyan;c.lineWidth=2.5;c.stroke();c.beginPath();c.arc(ox+H*170,oy-s.Bh*100,7,0,7);c.fillStyle=C.amber;c.fill()}
else T(c,'Non-ferromagnetic: no domains, no hysteresis — the effect vanishes when the field is removed',720,200,{a:'center',s:16,c:C.dim});},
readings(s,p){const [cls,chi,Br,Hc]=this.info(p);return[['Class',cls,''],['Behaviour',chi<0?'Repelled':chi<2?'Weakly attracted':'Strongly attracted',''],['Magnetisation B',cls==='Ferromagnetic'?(s.Bh*100).toFixed(0):'≈ 0','%'],['Retentivity (typ.)',cls==='Ferromagnetic'?(Br>0.5?'High':'Low'):'—','']]},
columns:['Sample','Behaviour','Class','B at H = 0 (%)'],
record(s,p){const [cls,chi]=this.info(p),nm={bi:'Bismuth',cu:'Copper',wa:'Water',al:'Aluminium',pt:'Platinum',fe:'Soft iron',st:'Steel',ni:'Nickel'};if(cls==='Ferromagnetic'&&p.Hf!==0)return[nm[p.smp],'Strongly attracted',cls,'(set H = 0)'];return[nm[p.smp],chi<0?'Repelled':chi<2?'Weakly attracted':'Strongly attracted',cls,cls==='Ferromagnetic'?+(s.Bh*100).toFixed(0):0]},
result(rows){return'Dia: repelled; para: weakly attracted; ferro: strongly attracted. After the field is removed, steel keeps much more magnetism than soft iron (high retentivity) and needs a larger reverse field to demagnetise (high coercivity) → steel for permanent magnets, soft iron for electromagnets & transformer cores.'}};

/* 5 ─ Properties of magnets */
S.magnetProperties={title:'Properties of a Magnet — Directive, Poles & the Sure Test',topic:'mag',grades:[6,10],
aim:'Show that a freely suspended magnet points north–south, that attraction is strongest at the poles, that like poles repel, that poles always exist in pairs, and that repulsion is the sure test for a magnet.',
apparatus:['Bar magnet on a thread','Iron filings tray','Unknown bars X (magnet) and Y (iron)','Compass'],
formula:'Freely suspended magnet → rests along geographic N–S (directive property)      Like poles repel, unlike poles attract      Attraction is strongest at the poles, nil at the middle      Breaking a magnet gives two complete magnets (no isolated pole)      Repulsion is the SURE test of a magnet',
procedure:['Choose an activity.','Directive: turn the suspended magnet away and release — it returns to N–S.','Filings: see how many filings cling along the length of the magnet.','Sure test: bring the N pole of your magnet to each end of bars X and Y; attraction at both ends means iron, repulsion at one end means magnet.','Break: cut the magnet — each piece has N and S poles.'],
controls:[{k:'act',label:'Activity',type:'select',def:'dir',options:[['dir','Directive property'],['fil','Filings: pole strength'],['test','Sure test: X vs Y'],['brk','Pair property: break it']]},{k:'ang',label:'Push the magnet to angle (directive)',type:'range',min:-90,max:90,step:15,def:60,unit:'°'},{k:'bar',label:'Bring N pole to (sure test)',type:'select',def:'X1',options:[['X1','Bar X — end 1'],['X2','Bar X — end 2'],['Y1','Bar Y — end 1'],['Y2','Bar Y — end 2']]},{k:'pcs',label:'Number of pieces (break)',type:'select',def:2,options:[[1,'1'],[2,'2'],[4,'4']]}],
actions:[{label:'Release magnet',run(s,p){s.th=p.ang*R;s.w=0;s.free=true}}],
init(p){return{th:(p?p.ang:60)*R,w:0,free:false,res:{}}},onChange(s,p,k){if(k==='ang'){s.th=p.ang*R;s.w=0;s.free=false}},
step(s,p,dt){if(s.free){s.w+=-8*Math.sin(s.th)*dt-0.9*s.w*dt;s.th+=s.w*dt}},
draw(c,s,p){bg(c);
if(p.act==='dir'){const cx=480,cy=290;c.beginPath();c.arc(cx,cy,190,0,7);c.strokeStyle='rgba(255,255,255,0.12)';c.stroke();T(c,'Geographic N',cx,80,{a:'center',s:18,w:700,c:C.lime});T(c,'S',cx,512,{a:'center',s:18,w:700,c:C.dim});T(c,'E',cx+210,cy+6,{s:18,c:C.dim});T(c,'W',cx-224,cy+6,{s:18,c:C.dim});L(c,cx,60,cx,cy-30,'#cfd6df',1.5);mag(c,cx,cy,260,40,s.th-Math.PI/2);
T(c,'Angle from N–S: '+z(s.th*180/Math.PI).toFixed(0)+'°',820,120,{a:'center',s:22,w:700,m:1,c:C.amber});if(s.free&&Math.abs(s.th)<0.05&&Math.abs(s.w)<0.05)T(c,'Settles along N–S',820,160,{a:'center',s:18,w:700,c:C.lime})}
else if(p.act==='fil'){mag(c,500,260,500,60);for(let i=0;i<=40;i++){const x=250+i*12.5,d=Math.abs(x-500)/250,n=Math.round(Math.pow(d,4)*14);for(let j=0;j<n;j++){L(c,x+Math.sin(i*7+j)*4,292+j*7,x+Math.sin(i*3+j)*4+3,298+j*7,'#3b3f46',2)}}
T(c,'Most filings at the poles · almost none at the middle (neutral region)',500,470,{a:'center',s:18,w:600});T(c,'Poles lie slightly inside the ends: effective length ≈ 0.85 × geometric length',500,505,{a:'center',s:16,c:C.dim})}
else if(p.act==='test'){mag(c,200,280,240,44,0,'Your magnet');const tgt=p.bar[0],end=p.bar[1],isMag=tgt==='X',rep=isMag&&end==='1';
const bx=rep?650:590;if(isMag)mag(c,bx,280,240,44,0,'Bar X (unknown)');else{RR(c,bx-120,258,240,44,6,'#8e98a6');T(c,'Bar Y (unknown)',bx,324,{a:'center',s:15,c:C.dim})}
T(c,end==='1'?'end 1 faces you':'end 2 faces you',bx,240,{a:'center',s:15,c:C.dim});if(!rep&&isMag){}
arrow(c,350,220,rep?310:400,220,rep?C.rose:C.lime,3);T(c,rep?'REPULSION → X is definitely a magnet':'Attraction (could be a magnet OR iron)',500,160,{a:'center',s:22,w:700,c:rep?C.rose:C.lime});
T(c,'Attraction alone is not a test — iron is also attracted. Only repulsion proves a magnet.',500,470,{a:'center',s:17,c:C.dim})}
else{const n=p.pcs,w=560/n;for(let i=0;i<n;i++)mag(c,220+i*(w+30)+w/2,280,w,50);T(c,n===1?'One magnet: N and S':n+' pieces → '+n+' complete magnets, each with N and S',500,180,{a:'center',s:22,w:700,c:C.lime});T(c,'An isolated N or S pole never exists (pair property)',500,420,{a:'center',s:17,c:C.dim})}},
readings(s,p){if(p.act==='dir')return[['Angle from N–S',z(s.th*180/Math.PI).toFixed(0),'°'],['State',s.free?(Math.abs(s.w)<0.05&&Math.abs(s.th)<0.05?'At rest N–S':'Oscillating'):'Held','']];if(p.act==='test'){const rep=p.bar==='X1';return[['Observed',rep?'Repulsion':'Attraction',''],['Conclusion',rep?'X is a magnet':p.bar[0]==='Y'?'Not decided yet':'Try the other end','']]}if(p.act==='brk')return[['Pieces',p.pcs,''],['Magnets formed',p.pcs,''],['Poles',2*p.pcs,'']];return[['Strongest attraction','At the poles',''],['Weakest','Middle (neutral)','']]},
columns:['Activity','Observation','Inference'],
record(s,p){if(p.act==='dir'){if(!s.free)return{error:'Release the magnet first.'};return['Directive','Settled at '+z(Math.round(s.th*180/Math.PI))+'°','Points geographic N–S']}if(p.act==='test'){const nm={X1:['X end 1','Repulsion','X is a magnet'],X2:['X end 2','Attraction','Inconclusive'],Y1:['Y end 1','Attraction','Inconclusive'],Y2:['Y end 2','Attraction','Y attracted at both ends → iron']};return['Sure test: '+nm[p.bar][0],nm[p.bar][1],nm[p.bar][2]]}if(p.act==='brk')return['Break into '+p.pcs,p.pcs+' magnets','Poles exist in pairs'];return['Filings','Cluster at the ends','Poles near the ends']},
result(rows){return'A magnet sets N–S, attracts most strongly at its poles, has poles in pairs, and repulsion is the only sure test that a bar is a magnet.'}};

/* 6 ─ Magnetisation & demagnetisation */
S.magnetize={title:'Making & Destroying Magnets',topic:'mag',grades:[6,10],
aim:'Magnetise a steel bar by single touch, double touch and the electrical method; count how many pins it lifts; then demagnetise it by heating, hammering or an AC coil.',
apparatus:['Steel bar (needle)','Bar magnets','Coil, DC/AC supply','Bunsen burner, hammer','Pins'],
formula:'Single touch: stroke one way with one pole      Double touch: two opposite poles from the middle outwards (stronger)      Electrical: DC through a coil (strongest; pole by right-hand rule)      Demagnetise: heat above the Curie point (770 °C for iron), hammer, drop, or AC in a coil',
procedure:['Choose the method and stroke / switch on as many times as you like.','Count the pins the bar lifts (strength) and record.','Compare the methods for the same number of strokes.','Choose a demagnetising treatment and apply it.','Record the pins lifted afterwards.'],
controls:[{k:'meth',label:'Magnetising method',type:'select',def:'s',options:[['s','Single touch'],['d','Double touch'],['e','Electrical (DC coil)']]},{k:'dem',label:'Demagnetise by',type:'select',def:'heat',options:[['heat','Heating (above 770 °C)'],['ham','Hammering'],['ac','AC coil'],['drop','Dropping repeatedly']]}],
actions:[{label:'Stroke ×5 / switch on',run(s,p){s.pb=null;s.tr=null;const g={s:0.06,d:0.12,e:0.3}[p.meth];s.M=cl(s.M+(1-s.M)*g*5/(1+g*5)*1.2,0,1);s.n+=5;s.anim=1}},{label:'Demagnetise',run(s,p){s.pb=Math.round(s.M*24);s.tr=p.dem;s.M*={heat:0,ham:0.5,ac:0.05,drop:0.7}[p.dem];s.dan=1}},{label:'New bar',run(s){Object.assign(s,{M:0,n:0})}}],
init(){return{M:0,n:0,anim:0,dan:0}},step(s,p,dt){s.anim=Math.max(0,s.anim-dt);s.dan=Math.max(0,s.dan-dt)},
onChange(s,p,k){if(k==='meth')Object.assign(s,{M:0,n:0})},
draw(c,s,p){bg(c);const bx=470,by=230;RR(c,bx-200,by-20,400,40,6,s.dan&&p.dem==='heat'?'#ff7a3a':G(c,0,by-20,0,by+20,['#c9d1db','#6f7b8c']));
for(let i=0;i<10;i++){const x=bx-180+i*40,seed=Math.sin(i*91.7)*999,a0=(seed-Math.floor(seed))*6.28,a=a0*(1-s.M);c.save();c.translate(x,by);c.rotate(a);arrow(c,-12,0,12,0,C.amber,2);c.restore()}
if(s.M>0.2){T(c,'N',bx+215,by+8,{s:20,w:800,c:C.rose});T(c,'S',bx-230,by+8,{s:20,w:800,c:C.blue})}
if(s.anim){if(p.meth==='e'){c.beginPath();for(let i=0;i<20;i++)c.ellipse(bx-190+i*20,by,8,30,0,0,7);c.strokeStyle=CUc;c.lineWidth=2;c.stroke()}else{const ph=1-s.anim;mag(c,bx-200+ph*400,by-60,120,30,0);if(p.meth==='d')mag(c,bx+200-ph*400,by-100,120,30,Math.PI)}}
if(s.dan&&p.dem==='ham')T(c,'🔨',bx,by-50,{a:'center',s:40});
const pins=Math.round(s.M*24);for(let i=0;i<pins;i++){const x=bx-190+(i%12)*32,y=by+30+Math.floor(i/12)*40;L(c,x,y,x+4,y+34,'#cfd6df',2)}
box(c,320,400,300,110,'');T(c,'Pins lifted: '+pins,470,446,{a:'center',s:28,w:700,m:1,c:C.lime});T(c,'strokes / pulses: '+s.n,470,484,{a:'center',s:17,m:1,c:C.dim});
T(c,'Arrows = domains: random in an unmagnetised bar, aligned in a magnet',470,560-30,{a:'center',s:15,c:C.dim});},
readings(s,p){return[['Strength',(s.M*100).toFixed(0),'%'],['Pins lifted',Math.round(s.M*24),''],['Strokes / pulses',s.n,''],['Domains aligned',(s.M*100).toFixed(0),'%']]},
columns:['Method','Strokes','Pins (before)','Treatment','Pins (after)'],
record(s,p){if(!s.n)return{error:'Magnetise the bar first.'};return[{s:'Single touch',d:'Double touch',e:'Electrical'}[p.meth],s.n,s.pb!=null?s.pb:Math.round(s.M*24),s.tr?{heat:'Heating',ham:'Hammering',ac:'AC coil',drop:'Dropping'}[s.tr]:'—',s.pb!=null?Math.round(s.M*24):'—']},
result(rows){return'For the same number of strokes: electrical > double touch > single touch. Heating above the Curie point destroys magnetism completely; hammering, dropping and AC reduce it by jumbling the domains.'}};
const CUc='#d9964a';

window.LabParts=(window.LabParts||0)+1;
(window.LabExtra=window.LabExtra||[]).push({order:['graphs3','freeFall','horizontalProjectile','magnetProperties','magnetize','magMaterials'],
syl:{6:[['Properties of magnets','magnetProperties'],['Making magnets','magnetize']],8:[['Magnetic materials','magMaterials']],
9:[['Graphs of motion (s–t, v–t, a–t)','graphs3'],['Free fall, rebounds & meeting','freeFall']],10:[['Properties of magnets & sure test','magnetProperties'],['Magnetisation & demagnetisation','magnetize']],
11:[['Graphical study of motion','graphs3'],['Free fall: rebounds & two-body meeting','freeFall'],['Horizontal projection & staircase','horizontalProjectile']],12:[['Dia-, para-, ferromagnetism & hysteresis','magMaterials']]}});
})();


/* ce41cf11-d512-5066-8f52-2083c1a1a4db */
(function(){
const K=window.LabKit;const {W,H,R,C,T,L,P,RR,G,ball,head,arc,room,cl,avg,hint}=K;
const S=window.LabSims;const bg=c=>room(c,false);
const box=(c,x,y,w,h,title)=>{RR(c,x,y,w,h,10,'rgba(10,12,16,0.75)','rgba(255,255,255,0.12)',1);if(title)T(c,title,x+12,y+22,{s:14,w:600,c:C.dim})};
const arrow=(c,x1,y1,x2,y2,col,w)=>{if(Math.hypot(x2-x1,y2-y1)<2)return;L(c,x1,y1,x2,y2,col,w||3);head(c,x2,y2,Math.atan2(y2-y1,x2-x1),col,14)};
const z=v=>Math.abs(v)<5e-4?0:v;
const axes=(c,x0,y0,w,h,xl,yl,ox,oy)=>{L(c,x0,oy,x0+w,oy,'rgba(255,255,255,0.4)',1.5);L(c,ox,y0,ox,y0+h,'rgba(255,255,255,0.4)',1.5);head(c,x0+w,oy,0,'rgba(255,255,255,0.4)',8);head(c,ox,y0,-Math.PI/2,'rgba(255,255,255,0.4)',8);T(c,xl,x0+w-4,oy+22,{a:'right',s:15,c:C.dim});T(c,yl,ox+8,y0+14,{s:15,c:C.dim})};
const curve=(c,f,a,b,X,Y,col,w)=>{c.beginPath();let first=true;for(let i=0;i<=200;i++){const x=a+(b-a)*i/200,y=f(x);if(!isFinite(y)){first=true;continue}first?c.moveTo(X(x),Y(y)):c.lineTo(X(x),Y(y));first=false}c.strokeStyle=col;c.lineWidth=w||3;c.stroke()};

/* 1 ─ Angles & small-angle approximation */
S.angles={title:'Angles, Radians & the Small-angle Approximation',topic:'math',grades:[9,11],
aim:'Measure an angle as arc ÷ radius (radian), convert between degree, radian and revolution, and find how small an angle must be for sin θ ≈ tan θ ≈ θ (used for the pendulum, parallax and optics).',
apparatus:['Protractor circle of radius r','Flexible arc scale','Calculator for sin, tan'],
formula:'θ (rad) = arc length / radius = s / r      π rad = 180°      1 rad ≈ 57.3°      1 rev = 2π rad = 360°      Small angles (in radians!): sin θ ≈ tan θ ≈ θ,  cos θ ≈ 1 − θ²/2',
procedure:['Set the angle θ.','Read the arc length s on a circle of radius r; θ = s/r in radians.','Compare θ (rad), sin θ and tan θ.','Record the percentage error of sin θ ≈ θ.','Find the largest angle for which the error stays below 1 % (≈ 14°).'],
controls:[{k:'th',label:'Angle θ',type:'range',min:1,max:90,step:1,def:20,unit:'°'},{k:'r',label:'Radius r',type:'range',min:5,max:20,step:1,def:10,unit:'cm'}],
init(){return{}},
draw(c,s,p){bg(c);const cx=90,cy=470,rp=380,th=p.th*R;c.beginPath();c.arc(cx,cy,rp,0,-Math.PI/2,true);c.strokeStyle='rgba(255,255,255,0.15)';c.lineWidth=1.5;c.stroke();
L(c,cx,cy,cx+rp,cy,'#cfd6df',3);L(c,cx,cy,cx+rp*Math.cos(th),cy-rp*Math.sin(th),'#cfd6df',3);c.beginPath();c.arc(cx,cy,rp,0,-th,true);c.strokeStyle=C.amber;c.lineWidth=6;c.stroke();
L(c,cx+rp*Math.cos(th),cy-rp*Math.sin(th),cx+rp*Math.cos(th),cy,C.lime,2.5,[6,5]);L(c,cx+rp,cy,cx+rp,cy-rp*Math.tan(th)*(p.th<70?1:0),C.cyan,2.5);
T(c,'arc s',cx+rp*Math.cos(th/2)+14,cy-rp*Math.sin(th/2),{s:16,w:700,c:C.amber});T(c,'sin θ',cx+rp*Math.cos(th)-58,cy-rp*Math.sin(th)/2,{s:15,w:700,c:C.lime});if(p.th<70)T(c,'tan θ',cx+rp+8,cy-rp*Math.tan(th)/2,{s:15,w:700,c:C.cyan});arc(c,cx,cy,40,-th,0,C.rose,2);T(c,'θ',cx+50,cy-14,{s:18,w:700,c:C.rose});
const rad=th,sn=Math.sin(th),tn=Math.tan(th),err=(rad-sn)/sn*100;box(c,520,40,450,250,'');
[['θ (degree)',p.th+'°',C.ink],['θ (radian) = s/r',rad.toFixed(4)+' rad',C.amber],['θ (revolution)',(p.th/360).toFixed(4)+' rev',C.dim],['sin θ',sn.toFixed(4),C.lime],['tan θ',tn.toFixed(4),C.cyan],['arc s = rθ',(p.r*rad).toFixed(2)+' cm',C.amber]].forEach(([a,b,col],i)=>{T(c,a,540,78+i*36,{s:17,c:C.dim});T(c,b,950,78+i*36,{a:'right',s:20,w:700,m:1,c:col})});
box(c,520,310,450,140,'');T(c,'Error in sin θ ≈ θ: '+err.toFixed(2)+' %',745,360,{a:'center',s:24,w:700,m:1,c:err<1?C.lime:err<5?C.amber:C.rose});T(c,err<1?'Approximation is excellent (< 1 %)':err<5?'Usable for rough estimates':'Too large — do NOT use θ ≈ sin θ',745,400,{a:'center',s:17,w:600,c:C.dim});
T(c,'Always use radians in sin θ ≈ θ',745,500,{a:'center',s:17,c:C.dim});},
readings(s,p){const r=p.th*R;return[['θ',r.toFixed(4),'rad'],['sin θ',Math.sin(r).toFixed(4),''],['tan θ',Math.tan(r).toFixed(4),''],['Error (θ vs sin θ)',((r-Math.sin(r))/Math.sin(r)*100).toFixed(2),'%']]},
columns:['θ (°)','θ (rad)','sin θ','tan θ','error (%)'],
record(s,p){const r=p.th*R;return[p.th,+r.toFixed(4),+Math.sin(r).toFixed(4),+Math.tan(r).toFixed(4),+((r-Math.sin(r))/Math.sin(r)*100).toFixed(2)]},
plot:{x:0,y:4,fit:false},
result(rows){const ok=rows.filter(r=>r[4]<1).map(r=>r[0]);return'Error grows roughly as θ²/6. sin θ ≈ θ is within 1 % up to about 14°'+(ok.length?' (your largest such angle: '+Math.max(...ok)+'°).':'.')}};

/* 2 ─ Pythagoras & trigonometric ratios (resolving a vector) */
S.trigRatios={title:'Pythagoras & Trigonometric Ratios — Resolving a Force',topic:'math',grades:[9,11],
aim:'Pull a block with a force F at angle θ; read its horizontal and vertical components to discover the six trigonometric ratios, Pythagoras’ theorem and sin²θ + cos²θ = 1.',
apparatus:['Block on a smooth floor','Spring balance pulling at an angle','Protractor','Two component force sensors'],
formula:'Fx = F cos θ   (adjacent)      Fy = F sin θ   (opposite)      F² = Fx² + Fy²   (Pythagoras)      tan θ = Fy / Fx      sin²θ + cos²θ = 1      cosec = 1/sin,  sec = 1/cos,  cot = 1/tan',
procedure:['Set the force F and the angle θ.','Read Fx and Fy on the sensors.','Record and check Fx² + Fy² = F².','Note the special angles 0°, 30°, 45°, 60°, 90° and the triplet 3-4-5 (θ ≈ 36.87°).','Watch how cos θ falls and sin θ rises as θ increases from 0° to 90°.'],
controls:[{k:'F',label:'Force F',type:'range',min:5,max:50,step:5,def:20,unit:'N'},{k:'th',label:'Angle θ with horizontal',type:'range',min:0,max:90,step:1,def:37,unit:'°'}],
init(){return{}},
draw(c,s,p){bg(c);const th=p.th*R,ox=180,oy=420,k=7,fx=p.F*Math.cos(th),fy=p.F*Math.sin(th);L(c,60,oy+40,560,oy+40,'rgba(255,255,255,0.3)',2);RR(c,ox-80,oy-10,80,50,6,G(c,0,oy-10,0,oy+40,['#ffcf7a','#b9741f']));
arrow(c,ox,oy,ox+fx*k,oy-fy*k,C.amber,4);arrow(c,ox,oy,ox+fx*k,oy,C.cyan,3);arrow(c,ox+fx*k,oy,ox+fx*k,oy-fy*k,C.lime,3);P(c,[[ox+fx*k-14,oy],[ox+fx*k-14,oy-14],[ox+fx*k,oy-14]],null,'rgba(255,255,255,0.5)',1.5);arc(c,ox,oy,46,-th,0,C.rose,2);T(c,'θ',ox+56,oy-12,{s:18,w:700,c:C.rose});
T(c,'F = '+p.F+' N (hypotenuse)',ox+fx*k/2-20,oy-fy*k/2-20,{a:'right',s:17,w:700,c:C.amber});T(c,'Fx = '+fx.toFixed(2)+' N',ox+fx*k/2,oy+28,{a:'center',s:17,w:700,c:C.cyan});T(c,'Fy = '+fy.toFixed(2)+' N',ox+fx*k+12,oy-fy*k/2,{s:17,w:700,c:C.lime});
const sn=Math.sin(th),cs=Math.cos(th),tn=cs>1e-9?sn/cs:Infinity,f=v=>isFinite(v)&&Math.abs(v)<1e6?v.toFixed(4):'∞';box(c,600,30,370,300,'SIX RATIOS');
[['sin θ = Fy/F',f(sn)],['cos θ = Fx/F',f(cs)],['tan θ = Fy/Fx',f(tn)],['cosec θ = 1/sin',f(sn?1/sn:Infinity)],['sec θ = 1/cos',f(cs>1e-9?1/cs:Infinity)],['cot θ = 1/tan',f(sn?cs/sn:Infinity)]].forEach(([a,b],i)=>{T(c,a,620,80+i*40,{s:17,c:C.dim});T(c,b,950,80+i*40,{a:'right',s:20,w:700,m:1,c:i<3?C.amber:C.violet})});
box(c,600,350,370,150,'CHECKS');T(c,'Fx² + Fy² = '+(fx*fx+fy*fy).toFixed(2),620,396,{s:18,w:700,m:1,c:C.lime});T(c,'F² = '+(p.F*p.F).toFixed(2),620,430,{s:18,w:700,m:1,c:C.lime});T(c,'sin²θ + cos²θ = '+(sn*sn+cs*cs).toFixed(4),620,466,{s:18,w:700,m:1,c:C.cyan});},
readings(s,p){const th=p.th*R;return[['Fx = F cos θ',(p.F*Math.cos(th)).toFixed(2),'N'],['Fy = F sin θ',(p.F*Math.sin(th)).toFixed(2),'N'],['tan θ',p.th===90?'∞':Math.tan(th).toFixed(4),''],['√(Fx² + Fy²)',p.F.toFixed(2),'N']]},
columns:['θ (°)','sin θ','cos θ','tan θ','Fx (N)','Fy (N)'],
record(s,p){const th=p.th*R;return[p.th,+z(Math.sin(th)).toFixed(4),+z(Math.cos(th)).toFixed(4),p.th===90?'∞':+Math.tan(th).toFixed(4),+z(p.F*Math.cos(th)).toFixed(2),+z(p.F*Math.sin(th)).toFixed(2)]},
plot:{x:0,y:1,fit:false},
result(rows){return'Fx² + Fy² = F² at every angle (Pythagoras). sin θ rises 0 → 1 and cos θ falls 1 → 0 between 0° and 90°; sin 30° = cos 60° = 0.5; sin 45° = cos 45° = 0.7071.'}};

/* 3 ─ Unit circle, quadrants (ASTC), compound angles & range */
S.unitCircle={title:'Unit Circle — Quadrants, ASTC & Range of a sin θ + b cos θ',topic:'math',grades:[11],
aim:'Rotate a radius around the unit circle to see the sign of sin, cos and tan in each quadrant (ASTC), the graphs of sin and cos, and find the maximum of a sin θ + b cos θ = √(a² + b²) — used in AC, SHM and projectiles.',
apparatus:['Unit circle with rotating radius (phasor)','Sine and cosine graph tracer'],
formula:'ASTC: Q1 All +, Q2 Sin +, Q3 Tan +, Q4 Cos +      −1 ≤ sin θ, cos θ ≤ 1      sin(90° + θ) = cos θ,  sin(180° − θ) = sin θ      a sin θ + b cos θ = √(a² + b²) sin(θ + φ),  tan φ = b/a   → max √(a² + b²)      sin θ cos θ = ½ sin 2θ (max ½)',
procedure:['Set the angle θ (0° – 360°).','Read sin θ, cos θ, tan θ and the quadrant; note their signs (ASTC).','Set a and b; read y = a sin θ + b cos θ.','Record y at several angles and find its maximum.','Compare with √(a² + b²) and the angle θ = 90° − φ where it occurs.'],
controls:[{k:'th',label:'Angle θ',type:'range',min:0,max:360,step:5,def:135,unit:'°'},{k:'a',label:'a (coefficient of sin)',type:'range',min:0,max:5,step:1,def:3,unit:''},{k:'b',label:'b (coefficient of cos)',type:'range',min:0,max:5,step:1,def:4,unit:''}],
init(){return{}},
draw(c,s,p){bg(c);const cx=200,cy=270,r=150,th=p.th*R,x=Math.cos(th),y=Math.sin(th);axes(c,30,90,340,360,'x','y',cx,cy);c.beginPath();c.arc(cx,cy,r,0,7);c.strokeStyle='rgba(255,255,255,0.3)';c.lineWidth=2;c.stroke();
[['S (sin +)',cx-r*0.7,cy-r*0.7],['A (all +)',cx+r*0.7,cy-r*0.7],['T (tan +)',cx-r*0.7,cy+r*0.7+10],['C (cos +)',cx+r*0.7,cy+r*0.7+10]].forEach(([t,X,Y])=>T(c,t,X,Y,{a:'center',s:16,w:700,c:'rgba(255,181,71,0.75)'}));
L(c,cx,cy,cx+r*x,cy-r*y,C.amber,4);L(c,cx+r*x,cy-r*y,cx+r*x,cy,C.lime,3);L(c,cx,cy,cx+r*x,cy,C.cyan,3);ball(c,cx+r*x,cy-r*y,8,'#fff',C.amber);arc(c,cx,cy,30,-th,0,C.rose,2);
const q=p.th%90===0?'on an axis':'Quadrant '+(Math.floor(p.th/90)+1);T(c,q,cx,470,{a:'center',s:20,w:700,c:C.ink});
const gx=420,gw=540,gy=150,gh=110,X=t=>gx+gw*t/360,Y=v=>gy-gh*v/1;box(c,410,30,560,240,'sin θ (lime) · cos θ (blue)');L(c,gx,gy,gx+gw,gy,'rgba(255,255,255,0.25)',1);curve(c,t=>Math.sin(t*R),0,360,X,v=>gy-90*v,C.lime,2.5);curve(c,t=>Math.cos(t*R),0,360,X,v=>gy-90*v,C.cyan,2.5);L(c,X(p.th),40,X(p.th),260,'rgba(255,255,255,0.5)',1.5,[4,4]);
const A=Math.hypot(p.a,p.b),f=t=>p.a*Math.sin(t*R)+p.b*Math.cos(t*R);box(c,410,290,560,240,'y = '+p.a+' sin θ + '+p.b+' cos θ');const gy2=410;L(c,gx,gy2,gx+gw,gy2,'rgba(255,255,255,0.25)',1);curve(c,f,0,360,X,v=>gy2-v*90/Math.max(A,1),C.amber,3);
L(c,gx,gy2-90,gx+gw,gy2-90,'rgba(255,107,154,0.5)',1.5,[6,5]);T(c,'max = √(a²+b²) = '+A.toFixed(2),gx+gw-8,gy2-98,{a:'right',s:15,w:700,c:C.rose});c.beginPath();c.arc(X(p.th),gy2-f(p.th)*90/Math.max(A,1),7,0,7);c.fillStyle='#fff';c.fill();T(c,'y = '+f(p.th).toFixed(3),gx+10,520,{s:18,w:700,m:1,c:C.amber});},
readings(s,p){const th=p.th*R,c0=Math.cos(th);return[['sin θ',z(Math.sin(th)).toFixed(4),''],['cos θ',z(c0).toFixed(4),''],['tan θ',Math.abs(c0)<1e-9?'∞':z(Math.tan(th)).toFixed(4),''],['y = a sin θ + b cos θ',(p.a*Math.sin(th)+p.b*c0).toFixed(3),'']]},
columns:['θ (°)','Quadrant','sin θ','cos θ','y'],
record(s,p){const th=p.th*R;return[p.th,p.th%90===0?'axis':'Q'+(Math.floor(p.th/90)+1),+z(Math.sin(th)).toFixed(4),+z(Math.cos(th)).toFixed(4),+(p.a*Math.sin(th)+p.b*Math.cos(th)).toFixed(3)]},
plot:{x:0,y:4,fit:false},
result(rows){const b=[...rows].sort((x,y)=>y[4]-x[4])[0];return'Largest y recorded = '+b[4]+' at θ = '+b[0]+'°. Theory: max = √(a² + b²) at θ = 90° − φ, tan φ = b/a. Signs follow ASTC.'}};

/* 4 ─ Coordinate geometry & straight line */
S.coordLine={title:'Coordinate Geometry & the Straight Line (v = u + at)',topic:'math',grades:[9,11],
aim:'Plot points on the Cartesian plane, find distance, mid-point and slope, and see that a straight line y = mx + c is exactly the v–t graph of uniform acceleration (slope = a, intercept = u).',
apparatus:['Cartesian graph board','Two movable points P and Q','Line tool'],
formula:'Distance PQ = √[(x₂ − x₁)² + (y₂ − y₁)²]      Mid-point = ((x₁ + x₂)/2, (y₁ + y₂)/2)      Slope m = (y₂ − y₁)/(x₂ − x₁) = tan θ      y = mx + c   ↔   v = at + u      Quadrant signs: I (+,+), II (−,+), III (−,−), IV (+,−)',
procedure:['Place P and Q with the sliders (or drag them on the board).','Read the quadrant of each point, the distance and the mid-point.','Read the slope m, intercept c and the equation of line PQ.','Record. A line with positive slope rises; zero slope is horizontal; undefined slope is vertical.','Treat x as time and y as velocity: m is acceleration, c is initial velocity.'],
controls:[{k:'x1',label:'P: x₁',type:'range',min:-8,max:8,step:1,def:-4,unit:''},{k:'y1',label:'P: y₁',type:'range',min:-8,max:8,step:1,def:-2,unit:''},{k:'x2',label:'Q: x₂',type:'range',min:-8,max:8,step:1,def:4,unit:''},{k:'y2',label:'Q: y₂',type:'range',min:-8,max:8,step:1,def:4,unit:''}],
init(){return{drag:null}},
G0:{cx:330,cy:280,k:28},
pointer(s,p,x,y,ph){const g=this.G0,X=v=>g.cx+v*g.k,Y=v=>g.cy-v*g.k;if(ph==='down'){if(Math.hypot(x-X(p.x1),y-Y(p.y1))<24)s.drag=1;else if(Math.hypot(x-X(p.x2),y-Y(p.y2))<24)s.drag=2}else if(ph==='move'&&s.drag){const gx=Math.round(cl((x-g.cx)/g.k,-8,8)),gy=Math.round(cl((g.cy-y)/g.k,-8,8));return s.drag===1?{x1:gx,y1:gy}:{x2:gx,y2:gy}}else if(ph==='up')s.drag=null},
calc(p){const dx=p.x2-p.x1,dy=p.y2-p.y1;const m=dx?dy/dx:Infinity;return{d:Math.hypot(dx,dy),mx:(p.x1+p.x2)/2,my:(p.y1+p.y2)/2,m,c:isFinite(m)?p.y1-m*p.x1:null}},
q(x,y){return x===0||y===0?'axis':x>0&&y>0?'I':x<0&&y>0?'II':x<0?'III':'IV'},
draw(c,s,p){bg(c);const g=this.G0,X=v=>g.cx+v*g.k,Y=v=>g.cy-v*g.k;for(let i=-9;i<=9;i++){L(c,X(i),Y(-9),X(i),Y(9),'rgba(255,255,255,0.06)',1);L(c,X(-9),Y(i),X(9),Y(i),'rgba(255,255,255,0.06)',1);if(i&&i%2===0){T(c,i+'',X(i),g.cy+18,{a:'center',s:12,m:1,c:C.dim});T(c,i+'',g.cx-8,Y(i)+4,{a:'right',s:12,m:1,c:C.dim})}}
axes(c,X(-9),Y(9),18*g.k,18*g.k,'x (t)','y (v)',g.cx,g.cy);[['I',6,7],['II',-6,7],['III',-6,-7],['IV',6,-7]].forEach(([t,a,b])=>T(c,t,X(a),Y(b),{a:'center',s:22,w:800,c:'rgba(255,181,71,0.35)'}));
const k=this.calc(p);if(isFinite(k.m)){L(c,X(-9),Y(k.m*-9+k.c),X(9),Y(k.m*9+k.c),'rgba(79,214,255,0.6)',2.5)}else L(c,X(p.x1),Y(-9),X(p.x1),Y(9),'rgba(79,214,255,0.6)',2.5);
L(c,X(p.x1),Y(p.y1),X(p.x2),Y(p.y1),C.lime,2,[5,4]);L(c,X(p.x2),Y(p.y1),X(p.x2),Y(p.y2),C.rose,2,[5,4]);T(c,'Δx = '+(p.x2-p.x1),(X(p.x1)+X(p.x2))/2,Y(p.y1)+20,{a:'center',s:15,w:700,c:C.lime});T(c,'Δy = '+(p.y2-p.y1),X(p.x2)+8,(Y(p.y1)+Y(p.y2))/2,{s:15,w:700,c:C.rose});
[[p.x1,p.y1,'P'],[p.x2,p.y2,'Q']].forEach(([a,b,n])=>{ball(c,X(a),Y(b),10,'#fff',C.amber);T(c,n+'('+a+', '+b+')',X(a)+14,Y(b)-12,{s:17,w:700,c:C.amber})});c.beginPath();c.arc(X(k.mx),Y(k.my),6,0,7);c.fillStyle=C.violet;c.fill();
box(c,620,40,350,270,'');[['Distance PQ',k.d.toFixed(3)],['Mid-point','('+k.mx+', '+k.my+')'],['Slope m',isFinite(k.m)?k.m.toFixed(3):'undefined'],['Angle with x-axis',isFinite(k.m)?(Math.atan(k.m)*180/Math.PI).toFixed(1)+'°':'90°'],['Intercept c',k.c!=null?k.c.toFixed(3):'—'],['P / Q quadrant',this.q(p.x1,p.y1)+' / '+this.q(p.x2,p.y2)]].forEach(([a,b],i)=>{T(c,a,640,80+i*40,{s:17,c:C.dim});T(c,b,950,80+i*40,{a:'right',s:19,w:700,m:1,c:C.lime})});
box(c,620,330,350,150,'AS A v–t GRAPH');T(c,isFinite(k.m)?'y = '+k.m.toFixed(2)+' x '+(k.c<0?'− ':'+ ')+Math.abs(k.c).toFixed(2):'x = '+p.x1,640,376,{s:20,w:700,m:1,c:C.cyan});T(c,isFinite(k.m)?'v = '+k.c.toFixed(2)+' + '+k.m.toFixed(2)+' t':'(vertical line — not a function of t)',640,414,{s:18,m:1,c:C.amber});T(c,isFinite(k.m)?'u = '+k.c.toFixed(2)+',  a = '+k.m.toFixed(2):'',640,448,{s:17,m:1,c:C.dim});
hint(c,'Drag P or Q on the board');},
readings(s,p){const k=this.calc(p);return[['Distance PQ',k.d.toFixed(3),''],['Slope m',isFinite(k.m)?k.m.toFixed(3):'∞',''],['Intercept c',k.c!=null?k.c.toFixed(3):'—',''],['Mid-point','('+k.mx+', '+k.my+')','']]},
columns:['P','Q','PQ','Slope m','Intercept c'],
record(s,p){const k=this.calc(p);return['('+p.x1+','+p.y1+')','('+p.x2+','+p.y2+')',+k.d.toFixed(3),isFinite(k.m)?+k.m.toFixed(3):'∞',k.c!=null?+k.c.toFixed(3):'—']},
result(rows){return'Slope = Δy/Δx = tan θ; the line is y = mx + c. In physics the v–t line of uniform acceleration is v = u + at: slope = acceleration, intercept = initial velocity.'}};

/* 5 ─ Differentiation: secant → tangent */
S.derivative={title:'Differentiation — From Average to Instantaneous Velocity',topic:'math',grades:[11],
aim:'Shrink the interval Δt on a position–time curve and watch the secant (average velocity) turn into the tangent (instantaneous velocity = ds/dt). Check the standard derivatives and find stationary points.',
apparatus:['Position–time curve s(t)','Movable secant / tangent','Derivative tracer'],
formula:'Average velocity = Δs/Δt (secant slope)      v = ds/dt = lim(Δt→0) Δs/Δt (tangent slope)      d(tⁿ)/dt = n tⁿ⁻¹      d(sin t)/dt = cos t      d(eᵗ)/dt = eᵗ      d(c·f)/dt = c·f′,  d(f+g)/dt = f′ + g′      Stationary point: ds/dt = 0',
procedure:['Choose the function s(t).','Choose the instant t₀.','Reduce Δt step by step and record the secant slope each time.','Compare the limit with the formula value of ds/dt (tangent slope).','Find t₀ where the slope is zero (stationary point: body momentarily at rest).'],
controls:[{k:'f',label:'Function s(t)',type:'select',def:'t2',options:[['t2','s = t²'],['t3','s = t³ − 6t² + 9t'],['sin','s = 4 sin t'],['ut','s = 10t − 5t² (ball thrown up)'],['exp','s = eᵗ / 4']]},{k:'t0',label:'Instant t₀',type:'range',min:0,max:4,step:0.25,def:1.5,unit:'s'},{k:'dt',label:'Interval Δt',type:'select',def:1,options:[[1,'1'],[0.5,'0.5'],[0.1,'0.1'],[0.01,'0.01'],[0.001,'0.001']]}],
init(){return{}},
F(k){return{t2:[t=>t*t,t=>2*t,'2t'],t3:[t=>t*t*t-6*t*t+9*t,t=>3*t*t-12*t+9,'3t² − 12t + 9'],sin:[t=>4*Math.sin(t),t=>4*Math.cos(t),'4 cos t'],ut:[t=>10*t-5*t*t,t=>10-10*t,'10 − 10t'],exp:[t=>Math.exp(t)/4,t=>Math.exp(t)/4,'eᵗ / 4']}[k]},
draw(c,s,p){bg(c);const [f,df,lab]=this.F(p.f),ys=[];for(let i=0;i<=80;i++)ys.push(f(i/20));const mn=Math.min(0,...ys),mx=Math.max(...ys);const x0=60,y0=40,w=560,h=440,X=t=>x0+40+w*t/4.2,Y=v=>y0+h-30-(h-60)*(v-mn)/(mx-mn||1);
axes(c,x0,y0,w+40,h,'t (s)','s (m)',X(0),Y(0));curve(c,f,0,4,X,Y,C.amber,3.5);const t1=p.t0,t2=Math.min(p.t0+p.dt,4.2),sl=(f(t2)-f(t1))/(t2-t1),tg=df(t1);
const ex=t=>f(t1)+sl*(t-t1);L(c,X(t1-1),Y(ex(t1-1)),X(t1+2),Y(ex(t1+2)),'rgba(255,107,154,0.85)',2.5);const et=t=>f(t1)+tg*(t-t1);L(c,X(t1-1),Y(et(t1-1)),X(t1+2),Y(et(t1+2)),'rgba(182,243,92,0.7)',2,[7,5]);
ball(c,X(t1),Y(f(t1)),8,'#fff',C.amber);ball(c,X(t2),Y(f(t2)),7,'#fff',C.rose);
box(c,660,40,310,250,'');T(c,'secant slope Δs/Δt',680,80,{s:16,c:C.rose});T(c,sl.toFixed(4),950,112,{a:'right',s:26,w:700,m:1,c:C.rose});T(c,'tangent ds/dt = '+lab,680,152,{s:16,c:C.lime});T(c,tg.toFixed(4),950,184,{a:'right',s:26,w:700,m:1,c:C.lime});T(c,'difference '+Math.abs(sl-tg).toFixed(4),950,226,{a:'right',s:17,m:1,c:C.dim});T(c,Math.abs(tg)<0.05?'Stationary point (v = 0)':tg>0?'s increasing':'s decreasing',815,270,{a:'center',s:17,w:700,c:Math.abs(tg)<0.05?C.amber:C.cyan});
box(c,660,310,310,200,'ds/dt vs t');const X2=t=>675+280*t/4.2,dys=[];for(let i=0;i<=80;i++)dys.push(df(i/20));const dm=Math.min(0,...dys),dM=Math.max(0.1,...dys),Y2=v=>495-150*(v-dm)/(dM-dm);L(c,675,Y2(0),955,Y2(0),'rgba(255,255,255,0.25)',1);curve(c,df,0,4,X2,Y2,C.lime,2.5);c.beginPath();c.arc(X2(t1),Y2(tg),6,0,7);c.fillStyle='#fff';c.fill();
T(c,'red = secant (average) · dashed green = tangent (instantaneous)',340,530,{a:'center',s:15,c:C.dim});},
readings(s,p){const [f,df]=this.F(p.f),t2=p.t0+p.dt,sl=(f(t2)-f(p.t0))/p.dt;return[['s(t₀)',f(p.t0).toFixed(3),'m'],['Average v (secant)',sl.toFixed(4),'m/s'],['Instantaneous v',df(p.t0).toFixed(4),'m/s'],['Δt',p.dt,'s']]},
columns:['Function','t₀ (s)','Δt (s)','Δs/Δt','ds/dt'],
record(s,p){const [f,df]=this.F(p.f),sl=(f(p.t0+p.dt)-f(p.t0))/p.dt,nm={t2:'t²',t3:'t³−6t²+9t',sin:'4 sin t',ut:'10t−5t²',exp:'eᵗ/4'};return[nm[p.f],p.t0,p.dt,+sl.toFixed(4),+df(p.t0).toFixed(4)]},
plot:{x:2,y:3,fit:false},
result(rows){return'As Δt → 0 the secant slope approaches the tangent slope: the derivative ds/dt is the instantaneous velocity. Where ds/dt = 0 the body is momentarily at rest (e.g. the top of a throw, t = 1 s for 10t − 5t²).'}};

/* 6 ─ Integration: area under the curve */
S.integral={title:'Integration — Area under a Graph (Displacement, Impulse, Work)',topic:'math',grades:[11],
aim:'Fill the area under a graph with N rectangles and watch the sum approach the exact definite integral. Use it to find displacement (v–t), impulse (F–t) and work (F–x).',
apparatus:['Graph of the quantity','Adjustable strips (Riemann sum)','Integration limits a and b'],
formula:'∫ₐᵇ f(x) dx = lim(N→∞) Σ f(xᵢ) Δx  = area under the curve      ∫ xⁿ dx = xⁿ⁺¹/(n + 1) + C      Fundamental theorem: ∫ₐᵇ f dx = F(b) − F(a)      v–t area = displacement · F–t area = impulse = Δp · F–x area = work',
procedure:['Choose the physical graph.','Set the limits a and b.','Increase the number of strips N and record the sum each time.','Compare with the exact value from F(b) − F(a).','Note: area below the axis counts as negative (e.g. displacement while moving backward).'],
controls:[{k:'g',label:'Graph',type:'select',def:'vt',options:[['vt','v = 3t (m/s) — displacement'],['vq','v = 12 − 3t² (m/s) — displacement'],['ft','F = 6t − t² (N) — impulse'],['fx','F = 20x (N) — spring work']]},{k:'a',label:'Lower limit a',type:'range',min:0,max:3,step:0.5,def:0,unit:''},{k:'b',label:'Upper limit b',type:'range',min:0.5,max:4,step:0.5,def:3,unit:''},{k:'N',label:'Strips N',type:'select',def:6,options:[[3,'3'],[6,'6'],[12,'12'],[48,'48'],[200,'200']]}],
init(){return{}},
F(k){return{vt:[x=>3*x,x=>1.5*x*x,'t','v (m/s)','m','displacement'],vq:[x=>12-3*x*x,x=>12*x-x*x*x,'t','v (m/s)','m','displacement'],ft:[x=>6*x-x*x,x=>3*x*x-x*x*x/3,'t','F (N)','N·s','impulse Δp'],fx:[x=>20*x,x=>10*x*x,'x (m)','F (N)','J','work']}[k]},
calc(p){const [f,Fi]=this.F(p.g),a=Math.min(p.a,p.b),b=Math.max(p.a,p.b),dx=(b-a)/p.N;let sum=0;for(let i=0;i<p.N;i++)sum+=f(a+(i+0.5)*dx)*dx;return{sum,exact:Fi(b)-Fi(a),a,b,dx}},
draw(c,s,p){bg(c);const [f,,xl,yl,u,meaning]=this.F(p.g),k=this.calc(p),vals=[];for(let i=0;i<=80;i++)vals.push(f(i/20));const mn=Math.min(0,...vals),mx=Math.max(1,...vals),x0=60,y0=40,w=560,h=460,X=t=>x0+40+w*t/4.2,Y=v=>y0+h-30-(h-60)*(v-mn)/(mx-mn);
axes(c,x0,y0,w+40,h,xl,yl,X(0),Y(0));for(let i=0;i<p.N;i++){const xa=k.a+i*k.dx,v=f(xa+k.dx/2);c.fillStyle=v>=0?'rgba(79,214,255,0.28)':'rgba(255,107,154,0.32)';c.fillRect(X(xa),Math.min(Y(v),Y(0)),X(xa+k.dx)-X(xa),Math.abs(Y(v)-Y(0)));if(p.N<=48){c.strokeStyle='rgba(79,214,255,0.6)';c.lineWidth=1;c.strokeRect(X(xa),Math.min(Y(v),Y(0)),X(xa+k.dx)-X(xa),Math.abs(Y(v)-Y(0)))}}
curve(c,f,0,4,X,Y,C.amber,3.5);[k.a,k.b].forEach((v,i)=>{L(c,X(v),Y(mn),X(v),Y(mx),'rgba(255,255,255,0.4)',1.5,[5,4]);T(c,i?'b':'a',X(v),Y(0)+22,{a:'center',s:16,w:700,c:C.ink})});
box(c,660,40,310,280,'');T(c,'Σ of '+p.N+' strips',680,80,{s:17,c:C.cyan});T(c,k.sum.toFixed(4),950,114,{a:'right',s:28,w:700,m:1,c:C.cyan});T(c,'exact  F(b) − F(a)',680,160,{s:17,c:C.lime});T(c,k.exact.toFixed(4),950,194,{a:'right',s:28,w:700,m:1,c:C.lime});T(c,'error '+(k.exact?Math.abs((k.sum-k.exact)/k.exact*100).toFixed(3):'0')+' %',950,236,{a:'right',s:17,m:1,c:C.dim});
T(c,meaning+' = '+k.exact.toFixed(2)+' '+u,815,290,{a:'center',s:19,w:700,c:C.amber});box(c,660,340,310,170,'');T(c,'blue strips: positive area',680,380,{s:16,c:C.cyan});T(c,'red strips: negative area',680,410,{s:16,c:C.rose});T(c,'(e.g. moving backward)',680,440,{s:15,c:C.dim});},
readings(s,p){const k=this.calc(p),[, , , , u]=this.F(p.g);return[['Riemann sum',k.sum.toFixed(4),u],['Exact integral',k.exact.toFixed(4),u],['Strip width Δx',k.dx.toFixed(3),''],['Error',k.exact?Math.abs((k.sum-k.exact)/k.exact*100).toFixed(3):'0','%']]},
columns:['Graph','a','b','N','Σ f Δx','Exact'],
record(s,p){const k=this.calc(p),nm={vt:'v = 3t',vq:'v = 12 − 3t²',ft:'F = 6t − t²',fx:'F = 20x'};return[nm[p.g],k.a,k.b,p.N,+k.sum.toFixed(4),+k.exact.toFixed(4)]},
plot:{x:3,y:4,fit:false},
result(rows){return'As N grows the sum of strips converges to the exact integral F(b) − F(a) (fundamental theorem of calculus). Area under v–t = displacement, F–t = impulse, F–x = work.'}};

/* 7 ─ Squares, square roots & approximations */
S.roots={title:'Squares, Square Roots & Approximations in Physics',topic:'math',grades:[9,11],
aim:'Solve a physics quadratic (a ball thrown up passing a height h) and decide which square root is physical; then use (1 + x)ⁿ ≈ 1 + nx to find how a small change in a quantity changes the result.',
apparatus:['Ball thrown up with speed u','Height marker h','Pendulum of length L (for the approximation)'],
formula:'h = ut − ½gt²   →   t = [u ± √(u² − 2gh)] / g      Both roots physical: going up and coming down      u² < 2gh: no real root — ball never reaches h      Approximation: (1 + x)ⁿ ≈ 1 + nx for small x;  T ∝ √L → 1 % change in L gives ≈ ½ % change in T',
procedure:['Mode 1 — set u and the height h.','Read the discriminant u² − 2gh and the two roots t₁, t₂ (up and down).','Record; raise h until the discriminant becomes negative.','Mode 2 — set the percentage change in the pendulum length.','Compare the exact new period with the approximation 1 + ½ x.'],
controls:[{k:'mode',label:'Mode',type:'select',def:'q',options:[['q','Quadratic: ball passing a height'],['a','Approximation: (1 + x)ⁿ']]},{k:'u',label:'Launch speed u',type:'range',min:5,max:30,step:1,def:20,unit:'m/s'},{k:'h',label:'Height h',type:'range',min:0,max:50,step:1,def:15,unit:'m'},{k:'x',label:'Change in length',type:'range',min:-20,max:20,step:1,def:4,unit:'%'}],
init(){return{}},
calc(p){const g=9.8,D=p.u*p.u-2*g*p.h;return{D,t1:D>=0?(p.u-Math.sqrt(D))/g:null,t2:D>=0?(p.u+Math.sqrt(D))/g:null,H:p.u*p.u/(2*g)}},
draw(c,s,p){bg(c);if(p.mode==='q'){const k=this.calc(p),sc=380/Math.max(k.H,p.h,5),y0=480,x0=260;L(c,x0-120,y0,x0+140,y0,'rgba(255,255,255,0.4)',2);L(c,x0-80,y0-k.H*sc,x0+80,y0-k.H*sc,'rgba(255,181,71,0.4)',1.5,[6,5]);T(c,'H_max '+k.H.toFixed(1)+' m',x0+90,y0-k.H*sc+5,{s:14,c:C.amber});
L(c,x0-110,y0-p.h*sc,x0+110,y0-p.h*sc,k.D>=0?C.lime:C.rose,2.5);T(c,'h = '+p.h+' m',x0-118,y0-p.h*sc+5,{a:'right',s:16,w:700,c:k.D>=0?C.lime:C.rose});
if(k.D>=0){ball(c,x0-30,y0-p.h*sc,9,'#ffd08a','#a8661c');arrow(c,x0-30,y0-p.h*sc+16,x0-30,y0-p.h*sc-30,C.cyan,2.5);T(c,'t₁ (going up)',x0-44,y0-p.h*sc-36,{a:'right',s:15,c:C.cyan});ball(c,x0+30,y0-p.h*sc,9,'#ffd08a','#a8661c');arrow(c,x0+30,y0-p.h*sc-16,x0+30,y0-p.h*sc+30,C.violet,2.5);T(c,'t₂ (coming down)',x0+44,y0-p.h*sc+40,{s:15,c:C.violet})}
box(c,560,40,410,270,'t = [u ± √(u² − 2gh)] / g');T(c,'u² − 2gh = '+k.D.toFixed(1),580,92,{s:22,w:700,m:1,c:k.D>=0?C.lime:C.rose});
if(k.D>=0){T(c,'√ = '+Math.sqrt(k.D).toFixed(3),580,132,{s:20,m:1,c:C.ink});T(c,'t₁ = '+k.t1.toFixed(3)+' s',580,180,{s:24,w:700,m:1,c:C.cyan});T(c,'t₂ = '+k.t2.toFixed(3)+' s',580,220,{s:24,w:700,m:1,c:C.violet});T(c,'Both roots are physical!',580,270,{s:18,w:700,c:C.lime})}
else{T(c,'Negative → no real root',580,140,{s:22,w:700,c:C.rose});T(c,'The ball never reaches this height.',580,180,{s:18,c:C.dim})}
T(c,'In v² = u² − 2gh, choose v = +√ for going up, −√ for coming down — context decides the sign.',500,530,{a:'center',s:15,c:C.dim})}
else{const x=p.x/100,ex=Math.sqrt(1+x),ap=1+x/2;box(c,120,60,760,300,'Pendulum: T ∝ √L');T(c,'L → L(1 + x),  x = '+(x>=0?'+':'')+x.toFixed(2),500,120,{a:'center',s:24,w:700,m:1});
T(c,'Exact:  T′/T = √(1 + x) = '+ex.toFixed(5),500,190,{a:'center',s:24,w:700,m:1,c:C.lime});T(c,'Approx: 1 + ½ x = '+ap.toFixed(5),500,240,{a:'center',s:24,w:700,m:1,c:C.amber});T(c,'error = '+Math.abs((ap-ex)/ex*100).toFixed(4)+' %',500,300,{a:'center',s:20,m:1,c:Math.abs(x)<=0.1?C.lime:C.rose});
T(c,'% change in T ≈ ½ × % change in L = '+(p.x/2).toFixed(1)+' %',500,420,{a:'center',s:22,w:700,c:C.cyan});T(c,'Works well for |x| < 0.1 (10 %)',500,460,{a:'center',s:17,c:C.dim})}},
readings(s,p){if(p.mode==='q'){const k=this.calc(p);return[['Discriminant',k.D.toFixed(2),'m²/s²'],['t₁ (up)',k.t1!=null?k.t1.toFixed(3):'—','s'],['t₂ (down)',k.t2!=null?k.t2.toFixed(3):'—','s'],['t₁ + t₂ = 2u/g',k.t1!=null?(k.t1+k.t2).toFixed(3):'—','s']]}const x=p.x/100;return[['Exact √(1+x)',Math.sqrt(1+x).toFixed(5),''],['1 + x/2',(1+x/2).toFixed(5),''],['% change in T',((Math.sqrt(1+x)-1)*100).toFixed(3),'%'],['Approx. %',(p.x/2).toFixed(3),'%']]},
columns:['Mode','u or x','h','Result 1','Result 2'],
record(s,p){if(p.mode==='q'){const k=this.calc(p);return['Quadratic',p.u,p.h,k.t1!=null?+k.t1.toFixed(3):'no root',k.t2!=null?+k.t2.toFixed(3):'no root']}const x=p.x/100;return['Approx.',p.x+' %','—',+Math.sqrt(1+x).toFixed(5),+(1+x/2).toFixed(5)]},
result(rows){return'Quadratic: the two roots are the up and down crossing times (t₁ + t₂ = 2u/g); a negative discriminant means the height is never reached. (1 + x)ⁿ ≈ 1 + nx is excellent for small x.'}};

window.LabParts=(window.LabParts||0)+1;
(window.LabExtra=window.LabExtra||[]).push({topics:{math:['Maths Tools','#7dd3fc']},order:['angles','trigRatios','unitCircle','coordLine','roots','derivative','integral'],
syl:{9:[['Angles & radians','angles'],['Pythagoras & trig ratios','trigRatios'],['Coordinate geometry & straight line','coordLine'],['Squares, roots & approximations','roots']],
11:[['Maths tools: angles & small-angle approximation','angles'],['Trig ratios & resolving vectors','trigRatios'],['Quadrants, ASTC & range of trig functions','unitCircle'],['Coordinate geometry & straight line','coordLine'],['Squares, roots, quadratics & approximations','roots'],['Differentiation: slope & rate','derivative'],['Integration: area under a graph','integral']]}});
})();


/* eeda3985-133a-546d-b67b-76e97eee28c6 */
(function(){
const K=window.LabKit;const {W,H,R,C,T,L,P,RR,G,ball,head,arc,room,watch,cl,avg,hint}=K;
const S=window.LabSims;const bg=c=>room(c,false);
const lin=pts=>{const n=pts.length,sx=pts.reduce((a,p)=>a+p[0],0),sy=pts.reduce((a,p)=>a+p[1],0),sxx=pts.reduce((a,p)=>a+p[0]*p[0],0),sxy=pts.reduce((a,p)=>a+p[0]*p[1],0),d=n*sxx-sx*sx;if(n<2||Math.abs(d)<1e-12)return null;const b=(n*sxy-sx*sy)/d;return{b,a:(sy-b*sx)/n}};
const box=(c,x,y,w,h,title)=>{RR(c,x,y,w,h,10,'rgba(10,12,16,0.75)','rgba(255,255,255,0.12)',1);if(title)T(c,title,x+12,y+22,{s:14,w:600,c:C.dim})};
const arrow=(c,x1,y1,x2,y2,col,w)=>{if(Math.hypot(x2-x1,y2-y1)<2)return;L(c,x1,y1,x2,y2,col,w||3);head(c,x2,y2,Math.atan2(y2-y1,x2-x1),col,14)};
const z=v=>Math.abs(v)<5e-4?0:v;
const blk=(c,x,y,w,h,lab,col)=>{RR(c,x,y,w,h,6,G(c,0,y,0,y+h,col||['#ffcf7a','#b9741f']),'rgba(0,0,0,0.4)',1.5);T(c,lab,x+w/2,y+h/2+7,{a:'center',s:18,w:800,c:'#1d1305'})};
const fa=(c,x,y,dx,dy,col,lab,off)=>{arrow(c,x,y,x+dx,y+dy,col,3.5);if(lab)T(c,lab,x+dx+(off?off[0]:6),y+dy+(off?off[1]:6),{s:16,w:700,c:col})};

/* 1 ─ Impulse & momentum */
S.impulse={title:'Impulse & Momentum — Catching a Ball',topic:'mech',grades:[9,11],
aim:'Stop a moving ball on different surfaces (or with hands drawn back) and show that the same change in momentum produces a smaller force when the stopping time is longer: F = Δp/Δt. Relate momentum and kinetic energy.',
apparatus:['Cricket ball (m = 160 g)','Force sensor plate with surfaces: concrete, sand, foam cushion','Fielder’s hands (drawn back or held stiff)','High-speed timer'],
formula:'p = m v      Impulse J = F Δt = Δp      F_avg = Δp / Δt      Rebound: Δp = m(v + v′)  (larger!)      K = p² / 2m,  p = √(2mK)',
procedure:['Set the ball speed and choose the stopping surface.','Choose “stop” or “bounce back”.','Tap “Throw”. Read Δp, the contact time Δt and the average force.','Record for each surface.','Compare: same Δp, longer Δt → smaller force (why fielders draw hands back, why cushions protect eggs).'],
controls:[{k:'v',label:'Ball speed',type:'range',min:5,max:40,step:5,def:25,unit:'m/s'},{k:'s',label:'Stopped by',type:'select',def:0.02,options:[[0.002,'Concrete / stiff hands (2 ms)'],[0.02,'Sand (20 ms)'],[0.1,'Hands drawn back (100 ms)'],[0.25,'Foam cushion (250 ms)']]},{k:'bn',label:'Outcome',type:'select',def:'stop',options:[['stop','Ball stops'],['bounce','Bounces back at half speed']]},{k:'m',label:'Mass',type:'select',def:0.16,options:[[0.16,'Cricket ball 160 g'],[0.06,'Tennis ball 60 g'],[0.45,'Football 450 g']]}],
actions:[{label:'Throw',run(s){Object.assign(s,{t:0,run:true,hit:false})}}],
init(){return{t:0,run:false,hit:false}},onChange(s){Object.assign(s,{t:0,run:false,hit:false})},
calc(p){const vf=p.bn==='bounce'?p.v/2:0,dp=p.m*(p.v+vf);return{dp,F:dp/p.s,vf,K:0.5*p.m*p.v*p.v}},
step(s,p,dt){if(!s.run)return;s.t+=dt;if(s.t>1.2&&!s.hit)s.hit=true;if(s.t>2.4)s.run=false},
draw(c,s,p){bg(c);const k=this.calc(p),wx=760;const col={0.002:'#8e98a6',0.02:'#d9b26a',0.1:'#ffd7b0',0.25:'#f3a9c8'}[p.s];RR(c,wx,150,90,260,8,col);T(c,{0.002:'concrete',0.02:'sand',0.1:'hands',0.25:'cushion'}[p.s],wx+45,440,{a:'center',s:16,c:C.dim});
const fr=Math.min(s.t/1.2,1),squash=s.hit?Math.max(0,1-(s.t-1.2)/0.2):0;let bx=120+fr*(wx-140);if(s.hit&&p.bn==='bounce')bx=wx-20-(s.t-1.2)*300;if(s.hit&&p.bn==='stop')bx=wx-20+Math.min(p.s*400,60)*(1-squash);
ball(c,bx,280,16+p.m*12,'#ff8a8a','#8a1414');if(!s.hit)arrow(c,bx+30,240,bx+30+p.v*3,240,C.cyan,3);
const fx=600,fy=470,fw=330,fh=60;box(c,40,460,560,90,'');T(c,'Δp = '+k.dp.toFixed(2)+' kg·m/s',60,500,{s:20,w:700,m:1,c:C.amber});T(c,'Δt = '+(p.s*1000).toFixed(0)+' ms',330,500,{s:20,w:700,m:1,c:C.cyan});T(c,'F = Δp/Δt = '+(k.F>=1000?(k.F/1000).toFixed(2)+' kN':k.F.toFixed(1)+' N'),60,536,{s:22,w:700,m:1,c:k.F>1000?C.rose:C.lime});
box(c,640,30,330,100,'FORCE vs TIME (same area = Δp)');const gx=660,gy=118,gw=290;[[0.002,'#8e98a6'],[0.02,'#d9b26a'],[0.1,'#ffd7b0'],[0.25,'#f3a9c8']].forEach(([dt,cc])=>{const ww=cl(dt/0.25*gw,6,gw),hh=cl(70*Math.sqrt(0.002/dt),4,70);c.globalAlpha=dt===p.s?0.95:0.3;RR(c,gx,gy-hh,ww,hh,2,cc);c.globalAlpha=1});
box(c,40,30,380,100,'MOMENTUM & KE');T(c,'p = mv = '+(p.m*p.v).toFixed(2)+' kg·m/s',60,72,{s:18,w:700,m:1,c:C.amber});T(c,'K = p²/2m = '+k.K.toFixed(1)+' J',60,108,{s:18,w:700,m:1,c:C.violet});if(!s.run&&!s.t)hint(c,'Tap “Throw”');},
readings(s,p){const k=this.calc(p);return[['Momentum p',(p.m*p.v).toFixed(2),'kg·m/s'],['Change Δp',k.dp.toFixed(2),'kg·m/s'],['Average force',k.F.toFixed(1),'N'],['KE = p²/2m',k.K.toFixed(1),'J']]},
columns:['Surface','v (m/s)','Outcome','Δp (kg·m/s)','Δt (ms)','F (N)'],
record(s,p){if(!s.hit)return{error:'Throw the ball first.'};const k=this.calc(p);return[{0.002:'Concrete',0.02:'Sand',0.1:'Hands back',0.25:'Cushion'}[p.s],p.v,p.bn==='stop'?'Stops':'Bounces',+k.dp.toFixed(2),p.s*1000,+k.F.toFixed(1)]},
plot:{x:4,y:5,fit:false},
result(rows){return'For the same Δp, F × Δt is constant: 100× longer stopping time → 100× smaller force. A bounce gives a larger Δp (and force) than a stop. p = √(2mK): the heavier of two bodies with equal KE has more momentum.'}};

/* 2 ─ Recoil, explosion & rocket */
S.recoil={title:'Recoil, Explosion & Rocket — Conservation of Momentum',topic:'mech',grades:[9,11],
aim:'Show that internal forces cannot change the total momentum of a system: a gun recoils, an exploding body’s fragments fly apart with equal and opposite momenta, and a rocket is pushed forward by the gases it throws back.',
apparatus:['Gun on frictionless rollers + bullet','Body at rest that splits into two fragments','Rocket with exhaust (variable mass)'],
formula:'Total p before = total p after      Gun: m v + M V = 0 → V = −m v / M      Explosion from rest: m₁ v₁ = − m₂ v₂, KE shared in inverse ratio of masses      Rocket thrust F = u (dm/dt),  a = F/M − g',
procedure:['Choose the system.','Set the masses and speeds.','Tap “Fire” and read the velocities.','Record and check that the total momentum after is zero (or unchanged).','Rocket: increase the exhaust rate and see the thrust and acceleration grow; the mass decreases as fuel burns.'],
controls:[{k:'mode',label:'System',type:'select',def:'gun',options:[['gun','Gun & bullet'],['exp','Explosion into two pieces'],['rkt','Rocket (variable mass)']]},{k:'m',label:'Bullet / fragment-1 mass',type:'range',min:0.01,max:2,step:0.01,def:0.05,unit:'kg'},{k:'M',label:'Gun / fragment-2 mass',type:'range',min:1,max:10,step:0.5,def:4,unit:'kg'},{k:'v',label:'Bullet / fragment-1 speed',type:'range',min:10,max:500,step:10,def:400,unit:'m/s'},{k:'dm',label:'Rocket exhaust rate',type:'range',min:50,max:400,step:50,def:200,unit:'kg/s'}],
actions:[{label:'Fire',run(s){Object.assign(s,{t:0,run:true,fired:true,M0:1e4,mr:1e4,vr:0,yr:0})}}],
init(){return{t:0,run:false,fired:false}},onChange(s){Object.assign(s,{t:0,run:false,fired:false})},
step(s,p,dt){if(!s.run)return;s.t+=dt;if(p.mode==='rkt'){const u=2000,F=u*p.dm;s.mr=Math.max(3000,1e4-p.dm*s.t);const a=F/s.mr-9.8;if(s.yr>0||a>0){s.vr+=a*dt;s.yr+=s.vr*dt}if(s.t>12)s.run=false}else if(s.t>2)s.run=false},
draw(c,s,p){bg(c);
if(p.mode!=='rkt'){const V=-p.m*p.v/p.M,t=s.fired?s.t:0;const cx=480;L(c,60,330,940,330,'rgba(255,255,255,0.25)',2);
if(p.mode==='gun'){const gx=cx+V*t*60;RR(c,gx-140,270,180,40,6,'#4a5566');RR(c,gx+40,280,90,20,3,'#6f7b8c');RR(c,gx-150,300,60,40,6,'#3b4451');const bx=s.fired?gx+130+p.v*t*1.5:gx+120;if(bx<990){c.beginPath();c.ellipse(bx,290,10,5,0,0,7);c.fillStyle='#e8c35a';c.fill()}
if(s.fired){arrow(c,gx-150,240,gx-150+V*30,240,C.rose,4);T(c,'V = '+V.toFixed(2)+' m/s (recoil)',gx-150,226,{a:'center',s:17,w:700,c:C.rose});arrow(c,Math.min(bx,900),250,Math.min(bx,900)+60,250,C.cyan,3)}}
else{const v2=p.m*p.v/p.M;const x1=cx+(s.fired?p.v*t*0.6:0),x2=cx-(s.fired?v2*t*0.6:0);ball(c,x2-20,290,14+p.M*2,'#9ab8ff','#1e4fb3');ball(c,x1+20,290,10+p.m*8,'#ffb3b3','#b3261e');if(!s.fired){T(c,'at rest',cx,240,{a:'center',s:17,c:C.dim})}else{arrow(c,x1+20,240,x1+80,240,C.cyan,3);arrow(c,x2-20,240,x2-80,240,C.rose,3);T(c,'v₂ = '+v2.toFixed(2)+' m/s',x2-20,226,{a:'center',s:16,w:700,c:C.rose});T(c,'v₁ = '+p.v,x1+20,226,{a:'center',s:16,w:700,c:C.cyan})}}
const pA=p.mode==='gun'?p.m*p.v+p.M*V:p.m*p.v-p.M*(p.m*p.v/p.M);box(c,180,400,640,130,'');T(c,'p₁ = '+(p.m*p.v).toFixed(2)+'   p₂ = '+(-p.m*p.v).toFixed(2)+'   total = '+z(pA).toFixed(2)+' kg·m/s',500,446,{a:'center',s:20,w:700,m:1,c:C.lime});
const K1=0.5*p.m*p.v*p.v,K2=0.5*p.M*Math.pow(p.m*p.v/p.M,2);T(c,'KE₁ = '+K1.toFixed(0)+' J   KE₂ = '+K2.toFixed(1)+' J   (ratio = M/m = '+(p.M/p.m).toFixed(1)+')',500,486,{a:'center',s:17,m:1,c:C.amber});T(c,'Momentum shared equally; KE goes mostly to the lighter body',500,516,{a:'center',s:15,c:C.dim})}
else{const yy=470-cl(s.yr/3,0,380);L(c,60,480,940,480,'rgba(255,255,255,0.25)',2);RR(c,470,yy-120,60,120,[30,30,4,4],G(c,470,0,530,0,['#cfd6df','#ffffff','#8e98a6']));if(s.fired&&s.run){const fl=30+p.dm/6;P(c,[[475,yy],[525,yy],[500,yy+fl]],'rgba(255,150,60,0.85)')}
const F=2000*p.dm;arrow(c,560,yy-60,560,yy-60-F/2e4*60,C.lime,3.5);T(c,'thrust',570,yy-80,{s:16,w:700,c:C.lime});arrow(c,440,yy-60,440,yy-60+(s.mr||1e4)*9.8/2e4*60,C.rose,3.5);T(c,'weight',360,yy-20,{s:16,w:700,c:C.rose});
box(c,640,40,330,200,'');T(c,'F = u dm/dt = '+(F/1000).toFixed(0)+' kN',660,82,{s:19,w:700,m:1,c:C.lime});T(c,'mass = '+((s.mr||1e4)/1000).toFixed(2)+' t',660,118,{s:19,m:1});T(c,'a = F/M − g = '+(F/(s.mr||1e4)-9.8).toFixed(2)+' m/s²',660,154,{s:19,w:700,m:1,c:C.amber});T(c,'v = '+(s.vr||0).toFixed(0)+' m/s',660,190,{s:19,m:1,c:C.cyan});T(c,'u = 2000 m/s exhaust',660,224,{s:15,c:C.dim});
if(F<1e4*9.8)T(c,'Thrust < weight — rocket cannot lift off',500,530,{a:'center',s:18,w:700,c:C.rose})}
if(!s.fired)hint(c,'Tap “Fire”');},
readings(s,p){if(p.mode==='rkt'){const F=2000*p.dm;return[['Thrust',(F/1000).toFixed(0),'kN'],['Mass now',((s.mr||1e4)/1000).toFixed(2),'t'],['Acceleration',(F/(s.mr||1e4)-9.8).toFixed(2),'m/s²'],['Speed',(s.vr||0).toFixed(0),'m/s']]}const V=p.m*p.v/p.M;return[['Speed of heavier body',V.toFixed(3),'m/s'],['p₁',(p.m*p.v).toFixed(2),'kg·m/s'],['p₂',(-p.m*p.v).toFixed(2),'kg·m/s'],['Total p',0,'kg·m/s']]},
columns:['System','m (kg)','M (kg)','v (m/s)','V or a','Total p'],
record(s,p){if(!s.fired)return{error:'Fire first.'};if(p.mode==='rkt'){const F=2000*p.dm;return['Rocket','—',+((s.mr||1e4)/1000).toFixed(2)+' t',p.dm+' kg/s',+(F/(s.mr||1e4)-9.8).toFixed(2),'—']}return[p.mode==='gun'?'Gun':'Explosion',p.m,p.M,p.v,+(-p.m*p.v/p.M).toFixed(3),0]},
result(rows){return'Total momentum stays zero: the heavier body moves back slowly (V = −mv/M). Internal forces (Newton’s third law) cannot change a system’s momentum. A rocket accelerates faster as its mass falls.'}};

/* 3 ─ FBDs & connected bodies */
S.connected={title:'Free-body Diagrams — Contact Forces, Strings & Atwood Machine',topic:'mech',grades:[11],
aim:'Draw free-body diagrams for connected bodies and verify the common acceleration, the contact forces between touching blocks, the tensions in light strings and the Atwood machine results.',
apparatus:['Three blocks on a smooth table','Light inextensible strings','Frictionless pulley','Force sensors between blocks / in strings'],
formula:'System: a = F_ext / (m₁ + m₂ + m₃)      Contact (push on m₁): N₁₂ = (m₂ + m₃) a,  N₂₃ = m₃ a      String train (pull on m₃): T₁ = m₁ a,  T₂ = (m₁ + m₂) a      Atwood: a = (m₁ − m₂) g / (m₁ + m₂),  T = 2 m₁ m₂ g / (m₁ + m₂),  thrust on pulley = 2T',
procedure:['Choose the arrangement and set the masses (and the force F).','Read the acceleration and the force at each joint.','Draw the FBD of each block (shown) and check ΣF = ma for each.','Record and repeat for other masses.','Atwood: equal masses give a = 0; T lies between m₂g and m₁g.'],
controls:[{k:'mode',label:'Arrangement',type:'select',def:'c',options:[['c','Blocks pushed (contact forces)'],['s','Blocks pulled by strings'],['a','Atwood machine']]},{k:'m1',label:'m₁',type:'range',min:1,max:10,step:1,def:2,unit:'kg'},{k:'m2',label:'m₂',type:'range',min:1,max:10,step:1,def:3,unit:'kg'},{k:'m3',label:'m₃ (table modes)',type:'range',min:1,max:10,step:1,def:5,unit:'kg'},{k:'F',label:'Applied force F',type:'range',min:10,max:100,step:10,def:50,unit:'N'}],
init(){return{t:0}},onChange(s){s.t=0},step(s,p,dt){s.t+=dt;if(s.t>3)s.t=0},
calc(p){const g=9.8;if(p.mode==='a'){const a=(p.m1-p.m2)*g/(p.m1+p.m2),Tn=2*p.m1*p.m2*g/(p.m1+p.m2);return{a,j1:Tn,j2:2*Tn}}const M=p.m1+p.m2+p.m3,a=p.F/M;return p.mode==='c'?{a,j1:(p.m2+p.m3)*a,j2:p.m3*a}:{a,j1:p.m1*a,j2:(p.m1+p.m2)*a}},
draw(c,s,p){bg(c);const k=this.calc(p);
if(p.mode!=='a'){const y=170,sz=m=>40+m*6,ws=[p.m1,p.m2,p.m3].map(sz),sh=Math.min(0.5*k.a*s.t*s.t*8,120);let x=180+sh;L(c,60,y+80,940,y+80,'rgba(255,255,255,0.3)',2);const xs=[];
[p.m1,p.m2,p.m3].forEach((m,i)=>{const w=ws[i];xs.push(x);blk(c,x,y+80-w,w,w,'m'+(i+1),[['#ffcf7a','#b9741f'],['#9ab8ff','#3a5fb3'],['#b6f35c','#5f8a1c']][i]);x+=w+(p.mode==='s'?50:0)});
if(p.mode==='c')fa(c,xs[0]-80,y+40,70,0,C.rose,'F');else{fa(c,xs[2]+ws[2],y+40,70,0,C.rose,'F');L(c,xs[0]+ws[0],y+60,xs[1],y+60,'#cfd6df',2);L(c,xs[1]+ws[1],y+60,xs[2],y+60,'#cfd6df',2);T(c,'T₁',xs[0]+ws[0]+25,y+50,{a:'center',s:15,w:700,c:C.cyan});T(c,'T₂',xs[1]+ws[1]+25,y+50,{a:'center',s:15,w:700,c:C.cyan})}
const fbx=[60,370,680];[0,1,2].forEach(i=>{const bx=fbx[i],by=330;box(c,bx,by,280,200,'FBD of m'+(i+1));RR(c,bx+110,by+80,60,50,5,'rgba(255,255,255,0.15)','#cfd6df');const cx=bx+140,cy=by+105;fa(c,cx,cy+25,0,50,C.violet,'mg');fa(c,cx,cy-25,0,-40,C.teal,'R',[6,-4]);
let L0=0,R0=0;if(p.mode==='c'){L0=i===0?p.F:i===1?k.j1:k.j2;R0=i===0?k.j1:i===1?k.j2:0;if(L0)fa(c,cx-110,cy,80,0,C.rose,null);if(R0)fa(c,cx+110,cy,-80,0,C.amber,null);T(c,L0?(i?'N':'F')+' = '+L0.toFixed(1):'',bx+12,by+186,{s:15,w:700,m:1,c:C.rose});T(c,R0?'N = '+R0.toFixed(1):'',bx+268,by+186,{a:'right',s:15,w:700,m:1,c:C.amber})}
else{L0=i===0?0:i===1?k.j1:k.j2;R0=i===0?k.j1:i===1?k.j2:p.F;if(L0)fa(c,cx-30,cy,-70,0,C.cyan,null);fa(c,cx+30,cy,80,0,i===2?C.rose:C.cyan,null);T(c,L0?'T = '+L0.toFixed(1):'',bx+12,by+186,{s:15,w:700,m:1,c:C.cyan});T(c,(i===2?'F = ':'T = ')+R0.toFixed(1),bx+268,by+186,{a:'right',s:15,w:700,m:1,c:i===2?C.rose:C.cyan})}});
T(c,'a = F / Σm = '+k.a.toFixed(3)+' m/s²',500,60,{a:'center',s:24,w:700,m:1,c:C.lime})}
else{const px=330,py=90,dy=cl(0.5*k.a*s.t*s.t*30,-150,150);c.beginPath();c.arc(px,py,40,0,7);c.fillStyle='#8e98a6';c.fill();L(c,px,py-40,px,40,'#cfd6df',3);L(c,px-40,py,px-40,250+dy,'#cfd6df',2);L(c,px+40,py,px+40,250-dy,'#cfd6df',2);
blk(c,px-70,250+dy,60,40+p.m1*4,'m₁');blk(c,px+10,250-dy,60,40+p.m2*4,'m₂',['#9ab8ff','#3a5fb3']);T(c,'thrust on pulley 2T = '+k.j2.toFixed(1)+' N',px,30,{a:'center',s:16,w:700,c:C.amber});
box(c,560,60,410,260,'');[['a = (m₁ − m₂)g/(m₁ + m₂)',k.a.toFixed(3)+' m/s²',C.lime],['T = 2m₁m₂g/(m₁ + m₂)',k.j1.toFixed(2)+' N',C.cyan],['m₁g',(p.m1*9.8).toFixed(1)+' N',C.dim],['m₂g',(p.m2*9.8).toFixed(1)+' N',C.dim]].forEach(([a,b,col],i)=>{T(c,a,580,104+i*56,{s:17,c:C.dim});T(c,b,950,132+i*56,{a:'right',s:22,w:700,m:1,c:col})});
T(c,Math.abs(k.a)<1e-9?'Equal masses: no acceleration (but T = mg)':k.a>0?'m₁ goes down':'m₂ goes down',765,360,{a:'center',s:18,w:700,c:C.amber})}},
readings(s,p){const k=this.calc(p);return p.mode==='a'?[['Acceleration a',k.a.toFixed(3),'m/s²'],['Tension T',k.j1.toFixed(2),'N'],['Pulley thrust 2T',k.j2.toFixed(2),'N'],['m₁ − m₂',p.m1-p.m2,'kg']]:[['Acceleration a',k.a.toFixed(3),'m/s²'],[p.mode==='c'?'N₁₂ (m₁ on m₂)':'T₁ (m₁–m₂ string)',k.j1.toFixed(2),'N'],[p.mode==='c'?'N₂₃ (m₂ on m₃)':'T₂ (m₂–m₃ string)',k.j2.toFixed(2),'N'],['Total mass',p.m1+p.m2+p.m3,'kg']]},
columns:['Mode','m₁','m₂','m₃','a (m/s²)','Joint 1 (N)','Joint 2 (N)'],
record(s,p){const k=this.calc(p);return[{c:'Contact',s:'Strings',a:'Atwood'}[p.mode],p.m1,p.m2,p.mode==='a'?'—':p.m3,+k.a.toFixed(3),+k.j1.toFixed(2),+k.j2.toFixed(2)]},
result(rows){return'All connected bodies share one acceleration a = F/Σm. The force at a joint must accelerate only the masses beyond it — so it is largest nearest the applied force. Atwood: m₂g < T < m₁g.'}};

/* 4 ─ Pseudo force & frames */
S.pseudoForce={title:'Inertial & Non-inertial Frames — Pseudo Force',topic:'mech',grades:[11],
aim:'Hang a bob from the roof of an accelerating truck. Explain its tilt from the ground (inertial frame: T and mg give ma) and from inside the truck (non-inertial frame: add a pseudo force −ma and the bob is in equilibrium). Measure a from the tilt.',
apparatus:['Truck with accelerometer bob hanging from the roof','Observer on the ground and observer in the truck','Protractor'],
formula:'Inertial frame: T sin θ = m a,  T cos θ = m g      Non-inertial frame: pseudo force −m a (opposite to the frame’s acceleration) → equilibrium      tan θ = a / g,   T = m √(g² + a²)      Pseudo forces have no reaction pair (Newton’s 3rd law does not apply)',
procedure:['Set the truck’s acceleration a (negative = braking).','Read the tilt angle θ of the bob.','Switch the observer between the ground and the truck: compare the two FBDs.','Record θ and calculate a = g tan θ.','Note: braking tilts the bob forward; uniform velocity gives no tilt.'],
controls:[{k:'a',label:'Truck acceleration a',type:'range',min:-6,max:6,step:0.5,def:3,unit:'m/s²'},{k:'obs',label:'Observer',type:'select',def:'g',options:[['g','On the ground (inertial)'],['t','Inside the truck (non-inertial)']]},{k:'m',label:'Bob mass',type:'select',def:0.5,options:[[0.2,'0.2 kg'],[0.5,'0.5 kg'],[1,'1 kg']]}],
init(){return{x:0,v:5}},step(s,p,dt){s.v=cl(s.v+p.a*dt*0.3,0,20);s.x+=s.v*dt},
draw(c,s,p){bg(c);const th=Math.atan2(p.a,9.8),Tn=p.m*Math.hypot(9.8,p.a);for(let i=0;i<12;i++){const tx=((i*110-(p.obs==='t'?s.x*30:0))%1320+1320)%1320-160;L(c,tx,470,tx,420,'#4a7a3a',4);c.beginPath();c.arc(tx,412,16,0,7);c.fillStyle='#3c6b2f';c.fill()}L(c,0,470,1000,470,'rgba(255,255,255,0.3)',2);
const bx=p.obs==='g'?30+((s.x*30)%220):160;RR(c,bx,180,380,230,14,'rgba(255,207,122,0.15)','#b9741f',3);[bx+70,bx+310].forEach(w=>{c.beginPath();c.arc(w,440,28,0,7);c.fillStyle='#2d3746';c.fill()});
const px=bx+190,py=190,Lb=150,ex=px-Math.sin(th)*Lb,ey=py+Math.cos(th)*Lb;L(c,px,py,ex,ey,'#cfd6df',2);ball(c,ex,ey,14,'#ffd08a','#a8661c');L(c,px,py,px,py+Lb+20,'rgba(255,255,255,0.25)',1,[4,4]);arc(c,px,py,50,Math.PI/2,Math.PI/2+th,C.rose,2);T(c,'θ',px-12*Math.sign(p.a||1),py+70,{a:'center',s:17,w:700,c:C.rose});
arrow(c,bx+190,150,bx+190+p.a*14,150,C.cyan,3);T(c,'a = '+p.a+' m/s²',bx+190,136,{a:'center',s:16,w:700,c:C.cyan});
const fx=780,fy=270;box(c,680,40,290,330,p.obs==='g'?'FBD — ground (inertial)':'FBD — in truck (non-inertial)');ball(c,fx+45,fy,12,'#ffd08a','#a8661c');const sc=6;
fa(c,fx+45,fy,0,9.8*sc,C.violet,'mg');fa(c,fx+45,fy,Math.sin(th)*Math.hypot(9.8,p.a)*sc,-Math.cos(th)*Math.hypot(9.8,p.a)*sc,C.teal,'T',[-30,-6]);
if(p.obs==='t'){if(Math.abs(p.a)>0.01)fa(c,fx+45,fy,-p.a*sc,0,C.rose,'−ma (pseudo)',[-60,22])}else{if(Math.abs(p.a)>0.01)fa(c,fx+45,fy+80,p.a*sc,0,C.lime,'net = ma',[-30,24])}
T(c,p.obs==='g'?'T + mg = ma':'T + mg + (−ma) = 0',825,355,{a:'center',s:16,w:700,c:C.dim});
box(c,40,30,380,120,'');T(c,'θ = '+(th*180/Math.PI).toFixed(1)+'°',60,72,{s:24,w:700,m:1,c:C.rose});T(c,'a = g tan θ = '+(9.8*Math.tan(th)).toFixed(2)+' m/s²',60,108,{s:18,m:1,c:C.lime});T(c,'T = '+Tn.toFixed(2)+' N',60,138,{s:18,m:1,c:C.teal});},
readings(s,p){const th=Math.atan2(p.a,9.8);return[['Tilt θ',(th*180/Math.PI).toFixed(1),'°'],['g tan θ',(9.8*Math.tan(th)).toFixed(2),'m/s²'],['Tension T',(p.m*Math.hypot(9.8,p.a)).toFixed(2),'N'],['Pseudo force',(-p.m*p.a).toFixed(2),'N']]},
columns:['a (m/s²)','θ (°)','tan θ','g tan θ','T (N)'],
record(s,p){const th=Math.atan2(p.a,9.8);return[p.a,+(th*180/Math.PI).toFixed(1),+Math.tan(th).toFixed(3),+(9.8*Math.tan(th)).toFixed(2),+(p.m*Math.hypot(9.8,p.a)).toFixed(2)]},
plot:{x:0,y:2},
result(rows){const f=lin(rows.map(r=>[r[0],r[2]]));return f&&rows.length>1?'tan θ ∝ a with slope 1/g ≈ '+f.b.toFixed(4)+' (1/9.8 = 0.1020) → the bob is an accelerometer. Both frames give the same result; the non-inertial one needs the pseudo force.':''}};

/* 5 ─ Static vs kinetic friction, normal reaction */
S.frictionPull={title:'Static & Kinetic Friction — Pulling a Block',topic:'mech',grades:[9,11],
aim:'Pull a block with a spring balance at increasing force: static friction grows to a limiting value, then the block slides and the friction drops to kinetic friction. See how pushing or pulling at an angle changes the normal reaction and the friction.',
apparatus:['Wooden block with masses','Spring balance (force sensor)','Surfaces: glass, wood, sandpaper, oiled wood','Rollers (rolling friction)'],
formula:'Static: f_s = applied force (self-adjusting) ≤ μ_s N      Limiting friction f_L = μ_s N      Kinetic: f_k = μ_k N   (μ_k < μ_s)      Pull at angle θ above horizontal: N = mg − F sin θ;  push down at θ: N = mg + F sin θ      Rolling friction ≪ sliding friction',
procedure:['Choose the surface and the mass.','Raise the applied force slowly; watch the friction force follow it.','Note the force at which the block starts sliding (limiting friction) and record it.','After it slides, read the smaller kinetic friction.','Pull at an angle: the normal reaction falls, so friction falls (why pulling a lawn roller is easier than pushing).'],
controls:[{k:'surf',label:'Surface',type:'select',def:'w',options:[['g','Glass'],['w','Wood'],['s','Sandpaper'],['o','Oiled wood (lubricated)'],['r','On rollers (rolling)']]},{k:'m',label:'Block mass',type:'range',min:1,max:10,step:1,def:4,unit:'kg'},{k:'F',label:'Applied force F',type:'range',min:0,max:60,step:1,def:12,unit:'N'},{k:'ang',label:'Angle of force',type:'range',min:-45,max:45,step:15,def:0,unit:'° (+ = pull up, − = push down)'}],
init(){return{x:0,v:0,slid:false,trace:[]}},
mu(p){return{g:[0.2,0.15],w:[0.4,0.3],s:[0.7,0.55],o:[0.12,0.08],r:[0.02,0.01]}[p.surf]},
onChange(s,p,k){if(k!=='F'){Object.assign(s,{x:0,v:0,slid:false,trace:[]})}},
st(p,s){const [ms,mk]=this.mu(p),th=p.ang*R,N=Math.max(0,p.m*9.8-p.F*Math.sin(th)),Fh=p.F*Math.cos(th),fL=ms*N,fk=mk*N,moving=s.slid||Fh>fL;const f=moving?fk:Fh;return{N,Fh,fL,fk,f,moving}},
step(s,p,dt){const k=this.st(p,s);if(k.moving){s.slid=true;s.v=Math.max(0,s.v+(k.Fh-k.fk)/p.m*dt);if(s.v===0&&k.Fh<=k.fL)s.slid=false;s.x+=s.v*dt}const last=s.trace[s.trace.length-1];if(!last||last[0]!==p.F)s.trace.push([p.F,k.f]);if(s.trace.length>200)s.trace.shift()},
draw(c,s,p){bg(c);const k=this.st(p,s),y=260,col={g:'rgba(180,220,255,0.4)',w:'#8a6440',s:'#7d6a52',o:'#6e5532',r:'#3b4451'}[p.surf];RR(c,40,y,560,20,3,col);if(p.surf==='r')for(let i=0;i<9;i++){c.beginPath();c.arc(80+i*60,y-8,8,0,7);c.fillStyle='#cfd6df';c.fill()}
const bx=200+((s.x*80)%300);blk(c,bx,y-100-(p.surf==='r'?16:0),110,100,p.m+' kg');const cx=bx+55,cy=y-50-(p.surf==='r'?16:0),th=p.ang*R;
const sc=3;fa(c,cx+55,cy,Math.cos(th)*p.F*sc,-Math.sin(th)*p.F*sc,C.rose,'F = '+p.F+' N');if(k.f>0.01)fa(c,bx,y-12,-k.f*sc,0,C.amber,'f = '+k.f.toFixed(1)+' N',[-110,-10]);fa(c,cx-20,y-100,0,-k.N*sc*0.4,C.teal,'N = '+k.N.toFixed(1),[6,0]);fa(c,cx+20,cy+50,0,p.m*9.8*sc*0.4,C.violet,'mg',[6,0]);
T(c,k.moving?'SLIDING — kinetic friction':'AT REST — static friction = applied force',320,60,{a:'center',s:22,w:700,c:k.moving?C.rose:C.lime});
box(c,640,40,330,260,'friction f vs applied F');const gx=680,gy=270,gw=270,gh=200,Fm=60,fm=Math.max(40,this.mu(p)[0]*p.m*9.8*1.2);L(c,gx,gy,gx+gw,gy,'rgba(255,255,255,0.3)',1);L(c,gx,gy,gx,gy-gh,'rgba(255,255,255,0.3)',1);
L(c,gx,gy-k.fL/fm*gh,gx+gw,gy-k.fL/fm*gh,'rgba(255,107,154,0.5)',1.5,[5,4]);T(c,'f_L',gx+gw,gy-k.fL/fm*gh-6,{a:'right',s:13,c:C.rose});L(c,gx,gy-k.fk/fm*gh,gx+gw,gy-k.fk/fm*gh,'rgba(255,181,71,0.5)',1.5,[5,4]);T(c,'f_k',gx+gw,gy-k.fk/fm*gh+16,{a:'right',s:13,c:C.amber});
c.beginPath();for(let F=0;F<=60;F++){const Fh=F*Math.cos(th),N=Math.max(0,p.m*9.8-F*Math.sin(th)),fl=this.mu(p)[0]*N,f=Fh<=fl?Fh:this.mu(p)[1]*N;const X=gx+gw*F/Fm,Y=gy-gh*f/fm;F?c.lineTo(X,Y):c.moveTo(X,Y)}c.strokeStyle=C.cyan;c.lineWidth=2.5;c.stroke();c.beginPath();c.arc(gx+gw*p.F/Fm,gy-gh*k.f/fm,7,0,7);c.fillStyle='#fff';c.fill();
box(c,40,330,560,180,'');[['Normal reaction N',k.N.toFixed(1)+' N',C.teal],['Limiting friction μ_s N',k.fL.toFixed(1)+' N',C.rose],['Kinetic friction μ_k N',k.fk.toFixed(1)+' N',C.amber],['μ_s / μ_k',this.mu(p).join(' / '),C.dim]].forEach(([a,b,cc],i)=>{T(c,a,60,370+i*36,{s:17,c:C.dim});T(c,b,580,370+i*36,{a:'right',s:20,w:700,m:1,c:cc})});},
readings(s,p){const k=this.st(p,s);return[['Friction now',k.f.toFixed(2),'N'],['Limiting friction',k.fL.toFixed(2),'N'],['Kinetic friction',k.fk.toFixed(2),'N'],['Normal reaction',k.N.toFixed(2),'N']]},
columns:['Surface','m (kg)','angle (°)','N (N)','f_L (N)','f_k (N)','μ_s'],
record(s,p){const k=this.st(p,s);if(!s.slid)return{error:'Increase F until the block starts sliding.'};return[{g:'Glass',w:'Wood',s:'Sandpaper',o:'Oiled',r:'Rollers'}[p.surf],p.m,p.ang,+k.N.toFixed(1),+k.fL.toFixed(2),+k.fk.toFixed(2),+(k.fL/k.N).toFixed(2)]},
plot:{x:3,y:4},
result(rows){const f=lin(rows.map(r=>[r[3],r[4]]));return'Limiting friction ∝ N'+(f&&rows.length>1?' (slope μ_s ≈ '+f.b.toFixed(2)+')':'')+'; kinetic friction is smaller. Lubricants and rollers reduce friction greatly. Pulling at an angle reduces N and hence friction; pushing down increases it.'}};

window.LabParts=(window.LabParts||0)+1;
(window.LabExtra=window.LabExtra||[]).push({order:['impulse','recoil','connected','pseudoForce','frictionPull'],
syl:{8:[['Friction: static, kinetic, rolling; lubrication','frictionPull']],9:[['Momentum & impulse (F = Δp/Δt)','impulse'],['Recoil & conservation of momentum','recoil'],['Friction: static & kinetic','frictionPull']],
11:[['Impulse & momentum; p = √(2mK)','impulse'],['Recoil, explosion & rocket','recoil'],['Free-body diagrams & connected bodies','connected'],['Pseudo force & non-inertial frames','pseudoForce'],['Static & kinetic friction; normal reaction','frictionPull']]}});
})();


/* 91130cc0-5561-57f6-8f43-2bcf94e94d92 */
(function(){
const K=window.LabKit;const {W,H,R,C,T,L,P,RR,G,ball,head,arc,room,cl,avg,hint}=K;
const S=window.LabSims;const bg=c=>room(c,false);
const box=(c,x,y,w,h,title)=>{RR(c,x,y,w,h,10,'rgba(10,12,16,0.75)','rgba(255,255,255,0.12)',1);if(title)T(c,title,x+12,y+22,{s:14,w:600,c:C.dim})};
const arrow=(c,x1,y1,x2,y2,col,w)=>{if(Math.hypot(x2-x1,y2-y1)<2)return;L(c,x1,y1,x2,y2,col,w||3);head(c,x2,y2,Math.atan2(y2-y1,x2-x1),col,14)};
const ray=(c,x1,y1,x2,y2,col,w,dash)=>{L(c,x1,y1,x2,y2,col,w||2.5,dash);if(!dash)head(c,(x1+x2)/2,(y1+y2)/2,Math.atan2(y2-y1,x2-x1),col,11)};
const YEL='#ffd84a';
const candle=(c,x,yb,h,flip,alpha)=>{c.save();c.globalAlpha=alpha==null?1:alpha;const d=flip?1:-1;RR(c,x-7,flip?yb:yb-h*0.8,14,h*0.8,3,'#efe6c8');c.beginPath();c.ellipse(x,yb+d*h*0.9,6,h*0.14,0,0,7);c.fillStyle='#ffb547';c.fill();c.restore()};
const objArrow=(c,x,yb,h,col,dash)=>{L(c,x,yb,x,yb-h,col,4,dash);head(c,x,yb-h,h>0?-Math.PI/2:Math.PI/2,col,16)};

/* 1 ─ Light basics: rectilinear propagation & beams */
S.lightBasics={title:'Light Travels in Straight Lines — Rays & Beams',topic:'light',grades:[6,7],
aim:'Look at a candle through three cardboards with holes: you see it only when the holes are in one straight line. Identify parallel, convergent and divergent beams, and luminous and non-luminous bodies.',
apparatus:['Candle (luminous source)','Three cardboards with small holes on stands','Torch, lens and mirror for beams','Moon / book (non-luminous bodies)'],
formula:'Light travels in straight lines in a uniform medium (rectilinear propagation)      Ray = path of light;  beam = bundle of rays: parallel, convergent, divergent      Speed of light in vacuum c = 3 × 10⁸ m/s — sunlight takes ≈ 8 min 20 s to reach Earth',
procedure:['Activity 1: line up the three holes and look at the candle.','Shift the middle cardboard sideways with the slider — the candle disappears.','Record the offset and whether the flame is seen.','Activity 2: choose each type of beam and identify where it comes from.','Note: we see non-luminous bodies only by the light they reflect.'],
controls:[{k:'act',label:'Activity',type:'select',def:'card',options:[['card','Three cardboards'],['beam','Types of beams']]},{k:'off',label:'Shift of middle card',type:'range',min:-30,max:30,step:2,def:0,unit:'mm'},{k:'beam',label:'Beam type',type:'select',def:'par',options:[['par','Parallel (sunlight / torch)'],['con','Convergent (after a convex lens)'],['div','Divergent (from a candle)']]}],
init(){return{t:0}},step(s,p,dt){s.t+=dt},
draw(c,s,p){bg(c);if(p.act==='card'){const y=280;candle(c,100,y+60,60);const xs=[300,500,700];xs.forEach((x,i)=>{const oy=i===1?p.off*2:0;RR(c,x-8,y-110+oy,16,220,3,'#b89a6a');c.fillStyle='#141518';c.fillRect(x-8,y-6+oy,16,12);L(c,x,y+110+oy,x,y+180,'#8792a3',3);T(c,'card '+(i+1),x,y+204,{a:'center',s:14,c:C.dim})});
const seen=Math.abs(p.off)<3;if(seen){c.save();c.globalAlpha=0.6;L(c,108,y-8,900,y,YEL,4);c.restore()}else{c.save();c.globalAlpha=0.6;L(c,108,y-8,500,y,YEL,4);c.restore()}
c.beginPath();c.ellipse(900,y,30,18,0,0,7);c.fillStyle='#fff';c.fill();c.beginPath();c.arc(900,y,10,0,7);c.fillStyle='#3b2a1a';c.fill();T(c,seen?'Flame SEEN — holes in a straight line':'Flame NOT seen — light cannot bend around',500,90,{a:'center',s:22,w:700,c:seen?C.lime:C.rose})}
else{const ox=200,cx=500,y=280;if(p.beam==='par'){for(let i=-3;i<=3;i++)ray(c,ox,y+i*36,800,y+i*36,YEL,3);T(c,'Rays never meet — e.g. sunlight, torch',500,470,{a:'center',s:19,w:600})}
else if(p.beam==='con'){c.beginPath();c.ellipse(260,y,14,130,0,0,7);c.strokeStyle='rgba(180,220,255,0.7)';c.lineWidth=3;c.stroke();for(let i=-3;i<=3;i++){ray(c,80,y+i*36,260,y+i*36,YEL,2.5);ray(c,260,y+i*36,700,y,YEL,3)}c.beginPath();c.arc(700,y,8,0,7);c.fillStyle='#fff';c.fill();T(c,'Rays meet at a point — after a convex lens / concave mirror',500,470,{a:'center',s:19,w:600})}
else{candle(c,220,y+40,40);for(let i=-3;i<=3;i++){const a=i*0.18;ray(c,226,y-12,226+Math.cos(a)*560,y-12+Math.sin(a)*560,YEL,3)}T(c,'Rays spread out from a point source — candle, bulb',500,470,{a:'center',s:19,w:600})}
T(c,{par:'PARALLEL BEAM',con:'CONVERGENT BEAM',div:'DIVERGENT BEAM'}[p.beam],500,80,{a:'center',s:26,w:800,c:C.amber})}},
readings(s,p){return p.act==='card'?[['Offset of card 2',p.off,'mm'],['Flame visible',Math.abs(p.off)<3?'Yes':'No',''],['Light from Sun',(1.5e11/3e8/60).toFixed(1),'min']]:[['Beam',{par:'Parallel',con:'Convergent',div:'Divergent'}[p.beam],''],['Speed of light','3 × 10⁸','m/s']]},
columns:['Activity','Setting','Observation'],
record(s,p){return p.act==='card'?['Cardboards','offset '+p.off+' mm',Math.abs(p.off)<3?'Flame seen':'Flame not seen']:['Beams',{par:'Parallel',con:'Convergent',div:'Divergent'}[p.beam],{par:'Rays stay parallel',con:'Rays meet at a point',div:'Rays spread from a point'}[p.beam]]},
result(rows){return'The flame is visible only when all three holes are in a straight line → light travels in straight lines (rectilinear propagation).'}};

/* 2 ─ Eclipses */
S.eclipse={title:'Shadows in Space — Solar & Lunar Eclipses',topic:'light',grades:[6,8],
aim:'Move the Moon around the Earth and see when its shadow falls on the Earth (solar eclipse) or the Earth’s shadow falls on the Moon (lunar eclipse); identify umbra and penumbra and total, partial and annular eclipses.',
apparatus:['Sun (extended source)','Earth and Moon models (opaque)','Orbit track'],
formula:'Shadow needs: a source, an opaque object, a screen      Umbra: total darkness · Penumbra: partial darkness      Solar eclipse: Sun – Moon – Earth in a line (new-moon day)      Lunar eclipse: Sun – Earth – Moon in a line (full-moon day)      Annular: Moon too far — its umbra does not reach Earth',
procedure:['Move the Moon around its orbit with the slider.','Find the position where the Moon’s shadow reaches the Earth.','Change the Moon’s distance: near → total, far → annular.','Find the position where the Moon enters the Earth’s shadow.','Record the type of eclipse at each position.'],
controls:[{k:'ang',label:'Moon position (angle from Sun line)',type:'range',min:0,max:360,step:5,def:0,unit:'°'},{k:'dist',label:'Moon distance',type:'select',def:'near',options:[['near','Near (perigee)'],['far','Far (apogee)']]}],
init(){return{}},
kind(p){const a=((p.ang%360)+360)%360,d=Math.min(Math.abs(a),Math.abs(360-a)),d2=Math.abs(a-180);if(d<=5)return p.dist==='near'?'Total solar eclipse':'Annular solar eclipse';if(d<=15)return'Partial solar eclipse';if(d2<=6)return'Total lunar eclipse';if(d2<=16)return'Partial / penumbral lunar eclipse';return'No eclipse'},
draw(c,s,p){bg(c);const sx=90,sy=280,ex=640,ey=280,rm=p.dist==='near'?150:190,a=-p.ang*R+Math.PI,mx=ex+Math.cos(a)*rm,my=ey+Math.sin(a)*rm;
const g=c.createRadialGradient(sx,sy,10,sx,sy,110);g.addColorStop(0,'#fff6c0');g.addColorStop(0.5,'#ffb547');g.addColorStop(1,'rgba(255,140,40,0)');c.fillStyle=g;c.beginPath();c.arc(sx,sy,110,0,7);c.fill();T(c,'Sun',sx,sy+90,{a:'center',s:16,w:700,c:C.amber});
P(c,[[ex,ey-46],[ex,ey+46],[990,ey+18],[990,ey-18]],'rgba(0,0,0,0.55)');P(c,[[ex,ey-46],[ex,ey+46],[990,ey+110],[990,ey-110]],'rgba(0,0,0,0.25)');
const k=this.kind(p);if(k.includes('solar')){const dx=ex-mx,dy=ey-my,len=Math.hypot(dx,dy),ux=dx/len,uy=dy/len,nx=-uy,ny=ux,ur=p.dist==='near'?len+10:len-30;P(c,[[mx+nx*14,my+ny*14],[mx-nx*14,my-ny*14],[mx+ux*ur,my+uy*ur]],'rgba(0,0,0,0.7)');P(c,[[mx+nx*14,my+ny*14],[mx-nx*14,my-ny*14],[mx+ux*len-nx*40,my+uy*len-ny*40],[mx+ux*len+nx*40,my+uy*len+ny*40]],'rgba(0,0,0,0.3)')}
c.beginPath();c.arc(ex,ey,rm,0,7);c.strokeStyle='rgba(255,255,255,0.12)';c.setLineDash([5,5]);c.stroke();c.setLineDash([]);
const eg=c.createRadialGradient(ex-15,ey-15,5,ex,ey,46);eg.addColorStop(0,'#7fc3ff');eg.addColorStop(1,'#123a66');c.fillStyle=eg;c.beginPath();c.arc(ex,ey,46,0,7);c.fill();T(c,'Earth',ex,ey+70,{a:'center',s:16,w:700,c:C.cyan});
const inUmb=k.includes('lunar');c.beginPath();c.arc(mx,my,14,0,7);c.fillStyle=inUmb?(k.includes('Total')?'#8a3a2a':'#77777f'):'#d8dde4';c.fill();T(c,'Moon',mx,my-22,{a:'center',s:14,c:C.dim});
box(c,280,20,440,70,'');T(c,k,500,64,{a:'center',s:24,w:800,c:k==='No eclipse'?C.dim:C.amber});T(c,'umbra = dark core · penumbra = lighter fringe',500,530,{a:'center',s:16,c:C.dim});},
readings(s,p){const k=this.kind(p);return[['Event',k,''],['Moon phase',Math.abs(((p.ang+180)%360)-180)<20?'New moon':Math.abs(p.ang-180)<20?'Full moon':'—',''],['Alignment',k.includes('solar')?'Sun–Moon–Earth':k.includes('lunar')?'Sun–Earth–Moon':'Not in line','']]},
columns:['Moon angle (°)','Distance','Eclipse'],
record(s,p){return[p.ang,p.dist==='near'?'Near':'Far',this.kind(p)]},
result(rows){return'Solar eclipse only at new moon (Moon between Sun and Earth); lunar eclipse only at full moon (Earth between). If the Moon is far, its umbra falls short of Earth → annular eclipse.'}};

/* 3 ─ Plane mirror */
S.planeMirror={title:'Plane Mirror — Image, Lateral Inversion, Rotation & Image Speed',topic:'light',grades:[7,10,11],
aim:'Study the image formed by a plane mirror: as far behind as the object is in front, same size, virtual and laterally inverted. See regular vs diffuse reflection, that rotating the mirror by θ turns the reflected ray by 2θ, and how fast the image moves.',
apparatus:['Plane mirror on a stand','Object (letter “F”) / pin','Ray box','Metre scale'],
formula:'Image distance = object distance (behind the mirror)      Image: virtual, erect, same size, laterally inverted      Mirror rotated by θ → reflected ray turns by 2θ      Deviation δ = 180° − 2i      Object moves at v towards mirror → image moves at v towards mirror; relative speed of approach = 2v      Smallest mirror to see full height = half the height',
procedure:['Choose the activity.','Image: move the object; compare object and image distances and look at the letter F.','Rotate: turn the mirror by θ and measure the turn of the reflected ray.','Speed: move the object towards the mirror and compare speeds.','Surface: compare a polished and a rough surface.'],
controls:[{k:'act',label:'Activity',type:'select',def:'img',options:[['img','Image & lateral inversion'],['rot','Rotate the mirror'],['spd','Image speed'],['surf','Regular vs diffuse reflection']]},{k:'u',label:'Object distance',type:'range',min:5,max:30,step:1,def:15,unit:'cm'},{k:'th',label:'Mirror rotation θ',type:'range',min:0,max:30,step:5,def:10,unit:'°'},{k:'v',label:'Object speed',type:'range',min:1,max:5,step:1,def:2,unit:'cm/s'}],
init(){return{t:0}},onChange(s){s.t=0},step(s,p,dt){s.t+=dt;if(s.t>6)s.t=0},
draw(c,s,p){bg(c);const mx=500;
if(p.act==='img'||p.act==='spd'){const u=p.act==='spd'?Math.max(1,30-p.v*s.t):p.u,k=12;L(c,mx,90,mx,470,'#cfd6df',6);for(let y=95;y<470;y+=14)L(c,mx+3,y,mx+13,y+10,'rgba(207,214,223,0.4)',1.5);T(c,'mirror',mx,80,{a:'center',s:15,c:C.dim});
const ox=mx-u*k,ix=mx+u*k;T(c,'F',ox,300,{a:'center',s:90,w:800,c:C.amber});c.save();c.translate(ix,300);c.scale(-1,1);T(c,'F',0,0,{a:'center',s:90,w:800,c:'rgba(255,181,71,0.45)'});c.restore();
L(c,ox,360,mx,360,C.lime,2);L(c,mx,360,ix,360,C.cyan,2,[6,5]);T(c,'u = '+u.toFixed(1)+' cm',(ox+mx)/2,384,{a:'center',s:17,w:700,m:1,c:C.lime});T(c,'v = '+u.toFixed(1)+' cm',(mx+ix)/2,384,{a:'center',s:17,w:700,m:1,c:C.cyan});
ray(c,ox+20,240,mx,280,YEL,2.5);ray(c,mx,280,ox+20,320,YEL,2.5);L(c,mx,280,ix-20,240,YEL,2,[5,5]);
T(c,'Virtual · erect · same size · laterally inverted',500,450,{a:'center',s:20,w:700,c:C.ink});
if(p.act==='spd'){box(c,640,40,330,140,'');T(c,'object → mirror: '+p.v+' cm/s',660,82,{s:18,m:1,c:C.lime});T(c,'image → mirror: '+p.v+' cm/s',660,116,{s:18,m:1,c:C.cyan});T(c,'object ↔ image: '+(2*p.v)+' cm/s',660,152,{s:20,w:700,m:1,c:C.amber})}}
else if(p.act==='rot'){const cx=500,cy=380,th=p.th*R;c.save();c.translate(cx,cy);c.rotate(th);L(c,-220,0,220,0,'#cfd6df',6);c.restore();L(c,cx,cy,cx,cy-260,'rgba(255,255,255,0.2)',1,[4,4]);
const i0=40*R,inc=[cx-Math.sin(i0)*300,cy-Math.cos(i0)*300];ray(c,inc[0],inc[1],cx,cy,YEL,3);const r0=Math.PI/2+i0,r1=r0-2*th;
const R0=[cx+Math.sin(i0)*300,cy-Math.cos(i0)*300],a1=Math.atan2(R0[1]-cy,R0[0]-cx)+2*th,R1=[cx+Math.cos(a1)*300,cy+Math.sin(a1)*300];L(c,cx,cy,R0[0],R0[1],'rgba(255,216,74,0.35)',2,[6,5]);ray(c,cx,cy,R1[0],R1[1],C.lime,3);
arc(c,cx,cy,120,Math.atan2(R0[1]-cy,R0[0]-cx),a1,C.rose,2);T(c,'2θ = '+(2*p.th)+'°',cx+150,cy-150,{s:22,w:700,c:C.rose});T(c,'mirror turned θ = '+p.th+'°',cx,cy+60,{a:'center',s:20,w:700,c:C.cyan});T(c,'original reflected ray (dashed)',R0[0],R0[1]-12,{a:'center',s:14,c:C.dim})}
else{[['Polished mirror (regular)',260,0],['Rough paper (diffuse)',740,1]].forEach(([lab,x,rough])=>{L(c,x-170,400,x+170,400,'#cfd6df',5);if(rough)for(let i=-170;i<170;i+=10)L(c,x+i,400,x+i+5,394+Math.sin(i)*6,'#cfd6df',2);
for(let i=-2;i<=2;i++){const hx=x+i*40;ray(c,hx-120,160,hx,400,YEL,2);const ang=rough?-Math.PI/2+Math.sin(i*1.7+1)*0.9+0.5:-Math.PI/2+0.46;ray(c,hx,400,hx+Math.cos(ang)*230,400+Math.sin(ang)*230,C.lime,2)}T(c,lab,x,460,{a:'center',s:18,w:700})});T(c,'Laws of reflection hold at every point in both — the surface normals differ',500,520,{a:'center',s:16,c:C.dim})}},
readings(s,p){if(p.act==='rot')return[['Mirror turned',p.th,'°'],['Reflected ray turned',2*p.th,'°'],['Deviation δ = 180 − 2i',100,'° (i = 40°)']];if(p.act==='spd'){const u=Math.max(1,30-p.v*s.t);return[['Object distance',u.toFixed(1),'cm'],['Image distance',u.toFixed(1),'cm'],['Relative speed',2*p.v,'cm/s']]}return[['Object distance u',p.u,'cm'],['Image distance v',p.u,'cm'],['Object–image gap',2*p.u,'cm'],['Magnification',1,'']]},
columns:['Activity','Input','Measured'],
record(s,p){if(p.act==='rot')return['Rotate mirror','θ = '+p.th+'°','ray turns '+2*p.th+'°'];if(p.act==='spd')return['Image speed','v = '+p.v+' cm/s','gap closes at '+2*p.v+' cm/s'];if(p.act==='surf')return['Surfaces','polished / rough','regular / diffuse'];return['Image','u = '+p.u+' cm','v = '+p.u+' cm']},
result(rows){return'Image distance = object distance; image virtual, erect, same size, laterally inverted. Rotating the mirror by θ turns the reflected ray by 2θ. Object and image approach each other at twice the object’s speed.'}};

/* 4 ─ Two plane mirrors: multiple images & periscope */
S.twoMirrors={title:'Two Plane Mirrors — Number of Images & Periscope',topic:'light',grades:[7,10,11],
aim:'Place an object between two plane mirrors inclined at angle θ and count the images; find the rule n = 360°/θ − 1. Build a periscope from two mirrors at 45°.',
apparatus:['Two plane mirrors hinged together','Protractor','Candle / coin','Periscope tube with two mirrors'],
formula:'m = 360° / θ      m even → n = m − 1      m odd: object on the bisector → n = m − 1, otherwise n = m      Parallel mirrors (θ = 0) → infinite images      Periscope: two mirrors parallel, each at 45°, deviation 90° + 90°',
procedure:['Choose “angled mirrors”.','Set the angle θ; count the images (drawn on the circle).','Record θ and the number of images; compare with 360/θ − 1.','Move the object off the bisector for odd m.','Choose “periscope” to see how light is turned twice by 90°.'],
controls:[{k:'mode',label:'Setup',type:'select',def:'ang',options:[['ang','Angled mirrors'],['per','Periscope']]},{k:'th',label:'Angle between mirrors θ',type:'select',def:60,options:[[30,'30°'],[45,'45°'],[60,'60°'],[72,'72°'],[90,'90°'],[120,'120°']]},{k:'pos',label:'Object position',type:'select',def:'bis',options:[['bis','On the angle bisector'],['off','Off the bisector']]}],
init(){return{}},
count(p){const m=360/p.th;return m%2===0||p.pos==='bis'?m-1:m},
draw(c,s,p){bg(c);if(p.mode==='ang'){const cx=420,cy=300,r=180,th=p.th*R,a0=-Math.PI/2-th/2,a1=-Math.PI/2+th/2;c.beginPath();c.arc(cx,cy,r,0,7);c.strokeStyle='rgba(255,255,255,0.12)';c.setLineDash([5,5]);c.stroke();c.setLineDash([]);
L(c,cx,cy,cx+Math.cos(a0)*240,cy+Math.sin(a0)*240,'#cfd6df',6);L(c,cx,cy,cx+Math.cos(a1)*240,cy+Math.sin(a1)*240,'#cfd6df',6);arc(c,cx,cy,50,a0,a1,C.rose,2);T(c,'θ = '+p.th+'°',cx,cy-60,{a:'center',s:18,w:700,c:C.rose});
const ob=-Math.PI/2+(p.pos==='bis'?0:th*0.25),imgs=[];const refl=(ang,m)=>2*m-ang;let A=[ob],B=[ob];for(let i=0;i<12;i++){A.push(refl(A[A.length-1],i%2?a1:a0));B.push(refl(B[B.length-1],i%2?a0:a1))}
const norm=a=>((a%(2*Math.PI))+2*Math.PI)%(2*Math.PI),inside=a=>{const d=norm(a-a0);return d<th-1e-6};const seen=[];[...A.slice(1),...B.slice(1)].forEach(a=>{if(inside(a))return;if(!seen.some(b=>Math.abs(norm(b)-norm(a))<1e-3))seen.push(a)});const n=this.count(p),shown=seen.slice(0,n);
ball(c,cx+Math.cos(ob)*r,cy+Math.sin(ob)*r,12,'#ffd08a','#a8661c');shown.forEach(a=>{c.save();c.globalAlpha=0.45;ball(c,cx+Math.cos(a)*r,cy+Math.sin(a)*r,12,'#ffd08a','#a8661c');c.restore()});
box(c,680,60,290,200,'');T(c,'m = 360/θ = '+(360/p.th),700,104,{s:20,w:700,m:1,c:C.cyan});T(c,(360/p.th)%2===0?'m even → n = m − 1':'m odd → '+(p.pos==='bis'?'on bisector: n = m − 1':'off bisector: n = m'),700,144,{s:17,c:C.dim});T(c,'Images: '+n,700,200,{s:30,w:800,m:1,c:C.amber})}
else{RR(c,380,60,120,420,8,'rgba(120,130,145,0.25)','#8792a3',2);L(c,390,130,490,70,'#cfd6df',6);L(c,390,470,490,410,'#cfd6df',6);
ray(c,820,100,440,100,YEL,3);ray(c,440,100,440,440,YEL,3);ray(c,440,440,160,440,YEL,3);c.beginPath();c.ellipse(140,440,22,14,0,0,7);c.fillStyle='#fff';c.fill();c.beginPath();c.arc(140,440,7,0,7);c.fillStyle='#3b2a1a';c.fill();
T(c,'object (over the wall)',830,90,{s:16,c:C.amber});T(c,'45°',505,110,{s:16,c:C.rose});T(c,'45°',505,450,{s:16,c:C.rose});RR(c,600,200,40,340,4,'#4a5566');T(c,'wall',620,190,{a:'center',s:14,c:C.dim});
T(c,'Each mirror turns the light by 90° — the image is erect and the same size',500,530,{a:'center',s:17,w:600})}},
readings(s,p){if(p.mode==='per')return[['Mirror angle','45','°'],['Deviation at each mirror','90','°'],['Image','Erect, same size','']];return[['θ',p.th,'°'],['m = 360/θ',360/p.th,''],['Number of images',this.count(p),'']]},
columns:['θ (°)','m = 360/θ','Object','Images n'],
record(s,p){if(p.mode==='per')return{error:'Switch to “Angled mirrors” to record image counts.'};return[p.th,360/p.th,p.pos==='bis'?'On bisector':'Off bisector',this.count(p)]},
plot:{x:1,y:3},
result(rows){return'n = 360/θ − 1 when 360/θ is even (or the object is on the bisector); n = 360/θ for odd m off the bisector. At 90° → 3 images, 60° → 5, 45° → 7; parallel mirrors → infinitely many.'}};

/* 5 ─ Spherical mirror ray diagrams */
S.rayDiagram={title:'Spherical Mirrors — Ray Diagrams, Mirror Formula & Magnification',topic:'light',grades:[10,12],
aim:'Draw the image formed by a concave or convex mirror for any object position using principal rays; verify 1/v + 1/u = 1/f and m = −v/u with the New Cartesian sign convention.',
apparatus:['Concave and convex mirrors (f = 15 cm)','Object arrow on an optical bench','Ray box'],
formula:'1/v + 1/u = 1/f      f = R/2      m = h′/h = −v/u      Sign convention: distances measured from the pole; along the incident light +, against it −; upward +, downward −      Concave f < 0, convex f > 0      Real images: v < 0 (in front); virtual: v > 0 (behind)',
procedure:['Choose concave or convex.','Move the object along the bench (u is negative).','Watch the three principal rays locate the image.','Read v, m and the nature of the image; record.','Cover all positions: beyond C, at C, between C and F, at F, between F and P — and the convex mirror (always virtual, diminished).'],
controls:[{k:'type',label:'Mirror',type:'select',def:'cc',options:[['cc','Concave'],['cv','Convex']]},{k:'u',label:'Object distance |u|',type:'range',min:3,max:60,step:1,def:40,unit:'cm'},{k:'f',label:'Focal length |f|',type:'select',def:15,options:[[10,'10 cm'],[15,'15 cm'],[20,'20 cm']]}],
init(){return{}},
calc(p){const f=p.type==='cc'?-p.f:p.f,u=-p.u;if(Math.abs(1/f-1/u)<1e-9)return{f,u,v:Infinity,m:Infinity};const v=1/(1/f-1/u);return{f,u,v,m:-v/u}},
nature(k,p){if(!isFinite(k.v))return'Image at infinity (highly magnified)';const real=k.v<0,sz=Math.abs(k.m)>1.001?'magnified':Math.abs(k.m)<0.999?'diminished':'same size';return(real?'Real, inverted, ':'Virtual, erect, ')+sz},
draw(c,s,p){bg(c);const k=this.calc(p),Px=700,ay=280,sc=9,X=d=>Px+d*sc,h=50;L(c,40,ay,980,ay,'rgba(255,255,255,0.3)',1.5);
const Rr=2*Math.abs(k.f)*sc*1.6,cc=p.type==='cc';c.beginPath();if(cc)c.arc(Px+Rr,ay,Rr,Math.PI-0.33,Math.PI+0.33);else c.arc(Px-Rr,ay,Rr,-0.33,0.33);c.strokeStyle='#cfd6df';c.lineWidth=6;c.stroke();
[['P',0],['F',k.f],['C',2*k.f]].forEach(([n,d])=>{c.beginPath();c.arc(X(d),ay,5,0,7);c.fillStyle=C.dim;c.fill();T(c,n,X(d),ay+24,{a:'center',s:16,w:700,c:C.dim})});
const ox=X(k.u);objArrow(c,ox,ay,h,C.amber);const top=[ox,ay-h];
const fx=X(k.f);// ray 1: parallel then through/away F
ray(c,top[0],top[1],Px,top[1],YEL,2.5);{const dx=fx-Px,dy=ay-top[1],len=Math.hypot(dx,dy);const ex=cc?Px+dx/len*560:Px-dx/len*380,ey=cc?top[1]+dy/len*560:top[1]-dy/len*380;ray(c,Px,top[1],ex,ey,YEL,2.5);if(!cc)L(c,Px,top[1],fx,ay,YEL,1.5,[5,5])}
// ray 2: toward pole, reflects symmetric
{const dy=ay-top[1];ray(c,top[0],top[1],Px,ay,C.lime,2.5);const ex=Px-(Px-top[0])*3,ey=ay+dy*3;ray(c,Px,ay,Math.max(40,ex),ay+(Px-Math.max(40,ex))/(Px-top[0])*dy,C.lime,2.5)}
if(isFinite(k.v)){const ix=X(k.v),ih=-k.m*h;
const virt=k.v>0;if(virt){L(c,Px,top[1],ix,ay-k.m*h,YEL,1.5,[5,5]);L(c,Px,ay,ix,ay-k.m*h,C.lime,1.5,[5,5])}objArrow(c,ix,ay,k.m*h,virt?'rgba(255,107,154,0.7)':C.rose,virt?[6,4]:null);T(c,'image',ix,ay-k.m*h+(k.m>0?-14:24),{a:'center',s:15,w:700,c:C.rose})}
box(c,40,30,430,170,'');T(c,'u = '+k.u.toFixed(1)+' cm   f = '+k.f+' cm',60,70,{s:19,w:700,m:1});T(c,'v = '+(isFinite(k.v)?k.v.toFixed(2)+' cm':'∞'),60,108,{s:22,w:700,m:1,c:C.cyan});T(c,'m = −v/u = '+(isFinite(k.m)?k.m.toFixed(2):'∞'),60,144,{s:22,w:700,m:1,c:C.amber});T(c,this.nature(k,p),60,182,{s:18,w:700,c:C.lime});},
readings(s,p){const k=this.calc(p);return[['Image distance v',isFinite(k.v)?k.v.toFixed(2):'∞','cm'],['Magnification m',isFinite(k.m)?k.m.toFixed(2):'∞',''],['1/u + 1/v',isFinite(k.v)?(1/k.u+1/k.v).toFixed(4):'—','cm⁻¹'],['1/f',(1/k.f).toFixed(4),'cm⁻¹']]},
columns:['Mirror','u (cm)','v (cm)','m','Nature'],
record(s,p){const k=this.calc(p);return[p.type==='cc'?'Concave':'Convex',k.u,isFinite(k.v)?+k.v.toFixed(2):'∞',isFinite(k.m)?+k.m.toFixed(2):'∞',this.nature(k,p)]},
result(rows){return'1/v + 1/u = 1/f holds for every position. Concave: real & inverted beyond F, virtual & magnified inside F (shaving mirror). Convex: always virtual, erect, diminished (rear-view mirror).'}};

window.LabParts=(window.LabParts||0)+1;
(window.LabExtra=window.LabExtra||[]).push({order:['lightBasics','eclipse','planeMirror','twoMirrors','rayDiagram'],
syl:{6:[['Rectilinear propagation; beams','lightBasics'],['Shadows & eclipses','eclipse']],7:[['Plane mirror image; lateral inversion','planeMirror'],['Multiple images; periscope','twoMirrors'],['Light: sources and beams','lightBasics']],8:[['Eclipses','eclipse']],
10:[['Plane mirror: image & rotation','planeMirror'],['Two plane mirrors: number of images','twoMirrors'],['Spherical mirrors: ray diagrams & mirror formula','rayDiagram']],
11:[['Plane mirror: image velocity','planeMirror'],['Images by two mirrors','twoMirrors']],12:[['Mirror formula & sign convention','rayDiagram']]}});
})();


/* 25e4c1f0-bbc9-5c06-a7bf-f14c561a092f */
(function(){
const K=window.LabKit;const {W,H,R,C,T,L,P,RR,G,ball,head,arc,room,cl,avg,hint}=K;
const S=window.LabSims;const bg=c=>room(c,false);
const lin=pts=>{const n=pts.length,sx=pts.reduce((a,p)=>a+p[0],0),sy=pts.reduce((a,p)=>a+p[1],0),sxx=pts.reduce((a,p)=>a+p[0]*p[0],0),sxy=pts.reduce((a,p)=>a+p[0]*p[1],0),d=n*sxx-sx*sx;if(n<2||Math.abs(d)<1e-12)return null;const b=(n*sxy-sx*sy)/d;return{b,a:(sy-b*sx)/n}};
const box=(c,x,y,w,h,title)=>{RR(c,x,y,w,h,10,'rgba(10,12,16,0.75)','rgba(255,255,255,0.12)',1);if(title)T(c,title,x+12,y+22,{s:14,w:600,c:C.dim})};
const arrow=(c,x1,y1,x2,y2,col,w)=>{if(Math.hypot(x2-x1,y2-y1)<2)return;L(c,x1,y1,x2,y2,col,w||3);head(c,x2,y2,Math.atan2(y2-y1,x2-x1),col,14)};
const ray=(c,x1,y1,x2,y2,col,w,dash)=>{L(c,x1,y1,x2,y2,col,w||2.5,dash);if(!dash)head(c,(x1+x2)/2,(y1+y2)/2,Math.atan2(y2-y1,x2-x1),col,11)};
const YEL='#ffd84a';
const objA=(c,x,yb,h,col,dash)=>{if(Math.abs(h)<1)return;L(c,x,yb,x,yb-h,col,4,dash);head(c,x,yb-h,h>0?-Math.PI/2:Math.PI/2,col,16)};
const info=(c,x,y,w,rows)=>{box(c,x,y,w,26+rows.length*36,'');rows.forEach(([a,b,col],i)=>{T(c,a,x+18,y+38+i*36,{s:17,c:C.dim});T(c,b,x+w-16,y+38+i*36,{a:'right',s:20,w:700,m:1,c:col||C.ink})})};
const lensShape=(c,x,y,h,conv,col)=>{c.beginPath();if(conv){c.moveTo(x,y-h);c.quadraticCurveTo(x+22,y,x,y+h);c.quadraticCurveTo(x-22,y,x,y-h)}else{c.moveTo(x-12,y-h);c.lineTo(x+12,y-h);c.quadraticCurveTo(x+2,y,x+12,y+h);c.lineTo(x-12,y+h);c.quadraticCurveTo(x-2,y,x-12,y-h)}c.fillStyle='rgba(150,200,255,0.25)';c.fill();c.strokeStyle=col||'rgba(180,220,255,0.8)';c.lineWidth=2;c.stroke()};
const MED={1:'Air',1.33:'Water',1.5:'Glass',2.42:'Diamond'};

/* 1 ─ Image velocity & longitudinal magnification */
S.mirrorVelocity={title:'Mirror — Velocity of Image & Longitudinal Magnification',topic:'light',grades:[12],
aim:'Move an object along the axis of a concave mirror and compare the speed of its image; show that v_image = −(v/u)² v_object = −m² v_object, while sideways motion is scaled by m.',
apparatus:['Concave mirror (f = −20 cm)','Object on a moving carriage','Image tracker'],
formula:'1/v + 1/u = 1/f      m = −v/u      Along axis: dv/dt = −(v²/u²) du/dt = −m² du/dt      Longitudinal magnification m_L = −m²      Perpendicular to axis: v_image = m × v_object      Newton: x₁ x₂ = f²',
procedure:['Set the object position u and its speed.','Choose motion along the axis or perpendicular to it.','Tap “Move” and compare object and image speeds.','Record at several positions.','Note: near F the image races away (m² large); at C both move at the same speed in opposite senses.'],
controls:[{k:'u',label:'Object position |u|',type:'range',min:24,max:80,step:1,def:35,unit:'cm'},{k:'vo',label:'Object speed',type:'range',min:1,max:5,step:1,def:2,unit:'cm/s'},{k:'dir',label:'Motion',type:'select',def:'ax',options:[['ax','Along the axis (towards mirror)'],['pp','Perpendicular (upward)']]}],
init(){return{}},
calc(p){const f=-20,u=-p.u,v=1/(1/f-1/u),m=-v/u;const vi=p.dir==='ax'?-(m*m)*p.vo:m*p.vo;return{u,v,m,vi}},
draw(c,s,p){bg(c);const k=this.calc(p),Px=760,ay=290,sc=7,X=d=>Px+d*sc;L(c,40,ay,980,ay,'rgba(255,255,255,0.3)',1.5);c.beginPath();c.arc(Px+300,ay,300,Math.PI-0.42,Math.PI+0.42);c.strokeStyle='#cfd6df';c.lineWidth=6;c.stroke();
[['F',-20],['C',-40]].forEach(([n,d])=>{c.beginPath();c.arc(X(d),ay,5,0,7);c.fillStyle=C.dim;c.fill();T(c,n,X(d),ay+24,{a:'center',s:16,w:700,c:C.dim})});
objA(c,X(k.u),ay,40,C.amber);objA(c,X(k.v),ay,40*k.m,C.rose);
if(p.dir==='ax'){arrow(c,X(k.u),ay-60,X(k.u)+p.vo*14,ay-60,C.lime,3);arrow(c,X(k.v),ay+50,X(k.v)+(-k.vi)*-14*-1*-1*0+k.vi*-14*-1,ay+50,C.cyan,3)}else{arrow(c,X(k.u)-20,ay-20,X(k.u)-20,ay-20-p.vo*14,C.lime,3);arrow(c,X(k.v)-20,ay-40*k.m,X(k.v)-20,ay-40*k.m-k.vi*14,C.cyan,3)}
info(c,40,30,460,[['u','−'+p.u+' cm',C.amber],['v',k.v.toFixed(2)+' cm',C.rose],['m = −v/u',k.m.toFixed(3),C.ink],[p.dir==='ax'?'m_L = −m²':'m',(p.dir==='ax'?-k.m*k.m:k.m).toFixed(3),C.violet],['object speed',p.vo+' cm/s',C.lime],['image speed',Math.abs(k.vi).toFixed(2)+' cm/s',C.cyan]]);
T(c,p.dir==='ax'?'Object approaches the mirror → real image moves AWAY from it':'Image moves opposite (inverted image, m < 0)',500,530,{a:'center',s:16,c:C.dim});},
readings(s,p){const k=this.calc(p);return[['Image distance v',k.v.toFixed(2),'cm'],['m',k.m.toFixed(3),''],['m_L = −m²',(-k.m*k.m).toFixed(3),''],['Image speed',Math.abs(k.vi).toFixed(2),'cm/s']]},
columns:['u (cm)','v (cm)','m','v_obj (cm/s)','v_img (cm/s)','v_img/v_obj'],
record(s,p){const k=this.calc(p);return[k.u,+k.v.toFixed(2),+k.m.toFixed(3),p.vo,+k.vi.toFixed(3),+(k.vi/p.vo).toFixed(3)]},
plot:{x:0,y:5,fit:false},
result(rows){return'Along the axis the image speed = m² × object speed (opposite sense for a real image); sideways it is m × object speed. At C (m = −1) the speeds are equal; near F the image moves very fast.'}};

/* 2 ─ Snell's law & total internal reflection */
S.snellTIR={title:"Refraction — Snell's Law, Critical Angle & Total Internal Reflection",topic:'light',grades:[10,12],
aim:'Send a ray from one medium into another; verify n₁ sin i = n₂ sin r, see bending towards / away from the normal, find the critical angle and observe total internal reflection.',
apparatus:['Semicircular glass / water block','Ray box','Protractor disc'],
formula:'n₁ sin i = n₂ sin r      ₁n₂ = n₂/n₁ = v₁/v₂ = sin i / sin r      Rarer → denser: bends towards the normal      Denser → rarer: bends away      Critical angle: sin c = n₂/n₁ (n₁ > n₂)      i > c → total internal reflection (no refracted ray)',
procedure:['Choose the two media.','Increase the angle of incidence i.','Record i and r; plot sin i against sin r — slope = n₂/n₁.','From a denser into a rarer medium, find the angle at which r = 90° (critical angle).','Go beyond it: all light reflects — total internal reflection.'],
controls:[{k:'n1',label:'Incident medium (top)',type:'select',def:1.5,options:[[1,'Air (1.00)'],[1.33,'Water (1.33)'],[1.5,'Glass (1.50)'],[2.42,'Diamond (2.42)']]},{k:'n2',label:'Second medium (bottom)',type:'select',def:1,options:[[1,'Air (1.00)'],[1.33,'Water (1.33)'],[1.5,'Glass (1.50)'],[2.42,'Diamond (2.42)']]},{k:'i',label:'Angle of incidence i',type:'range',min:0,max:89,step:1,def:30,unit:'°'}],
init(){return{}},
calc(p){const s=p.n1*Math.sin(p.i*R)/p.n2,tir=s>1;return{tir,r:tir?null:Math.asin(s)/R,c:p.n1>p.n2?Math.asin(p.n2/p.n1)/R:null}},
draw(c,s,p){bg(c);const k=this.calc(p),cx=380,cy=280,Lr=240;const tint=n=>n===1?'rgba(255,255,255,0.03)':n===1.33?'rgba(79,179,255,0.18)':n===1.5?'rgba(180,220,255,0.22)':'rgba(220,240,255,0.32)';c.fillStyle=tint(p.n1);c.fillRect(40,40,680,240);c.fillStyle=tint(p.n2);c.fillRect(40,280,680,240);
T(c,MED[p.n1]+' (n = '+p.n1+')',60,70,{s:18,w:700,c:C.ink});T(c,MED[p.n2]+' (n = '+p.n2+')',60,510,{s:18,w:700,c:C.ink});L(c,40,cy,720,cy,'rgba(255,255,255,0.5)',2);L(c,cx,50,cx,510,'rgba(255,255,255,0.3)',1.5,[6,5]);T(c,'normal',cx+6,60,{s:13,c:C.dim});
const ia=p.i*R,ix=cx-Math.sin(ia)*Lr,iy=cy-Math.cos(ia)*Lr;ray(c,ix,iy,cx,cy,YEL,3.5);arc(c,cx,cy,60,-Math.PI/2-ia,-Math.PI/2,C.amber,2);T(c,'i = '+p.i+'°',cx-90,cy-70,{s:17,w:700,c:C.amber});
const refl=k.tir?1:0.15+0.5*Math.pow(p.i/90,4);c.save();c.globalAlpha=refl;ray(c,cx,cy,cx+Math.sin(ia)*Lr,cy-Math.cos(ia)*Lr,YEL,3);c.restore();
if(!k.tir){const ra=k.r*R;ray(c,cx,cy,cx+Math.sin(ra)*Lr,cy+Math.cos(ra)*Lr,C.lime,3.5);arc(c,cx,cy,70,Math.PI/2-ra,Math.PI/2,C.lime,2);T(c,'r = '+k.r.toFixed(1)+'°',cx+40,cy+100,{s:17,w:700,c:C.lime})}else T(c,'TOTAL INTERNAL REFLECTION',cx+20,cy+60,{s:22,w:800,c:C.rose});
info(c,740,40,240,[['sin i',Math.sin(ia).toFixed(3),C.amber],['sin r',k.tir?'—':Math.sin(k.r*R).toFixed(3),C.lime],['n₂/n₁',(p.n2/p.n1).toFixed(3),C.ink],['critical c',k.c!=null?k.c.toFixed(1)+'°':'none',C.rose],['bending',p.n2>p.n1?'towards N':p.n2<p.n1?'away from N':'none',C.cyan]]);},
readings(s,p){const k=this.calc(p);return[['Refraction angle r',k.tir?'TIR':k.r.toFixed(1),'°'],['sin i / sin r',k.tir||!p.i?'—':(Math.sin(p.i*R)/Math.sin(k.r*R)).toFixed(3),''],['Critical angle',k.c!=null?k.c.toFixed(1):'none','°'],['₁n₂',(p.n2/p.n1).toFixed(3),'']]},
columns:['n₁','n₂','i (°)','r (°)','sin i','sin r'],
record(s,p){const k=this.calc(p);return[p.n1,p.n2,p.i,k.tir?'TIR':+k.r.toFixed(1),+Math.sin(p.i*R).toFixed(3),k.tir?'—':+Math.sin(k.r*R).toFixed(3)]},
plot:{x:5,y:4},
result(rows){const ok=rows.filter(r=>r[3]!=='TIR'&&r[2]>0);const f=ok.length>1?lin(ok.map(r=>[r[5],r[4]])):null;return(f?'sin i / sin r = '+(1/f.b).toFixed(3)+' ≈ n₂/n₁ (Snell’s law). ':'')+'Above the critical angle (denser → rarer) there is no refracted ray — TIR.'}};

/* 3 ─ Optical fibre */
S.opticalFibre={title:'Optical Fibre — Total Internal Reflection & Acceptance Angle',topic:'light',grades:[10,12],
aim:'Send light into an optical fibre at different angles; see it trapped by repeated total internal reflection when the entry angle is within the acceptance angle, and leak out when it is not.',
apparatus:['Optical fibre: glass core (n₁) and cladding (n₂ < n₁)','Laser at adjustable entry angle'],
formula:'At entry: sin θ = n₁ sin r      At the core–cladding wall the angle is (90° − r); TIR needs sin(90° − r) > n₂/n₁      Maximum acceptance angle: sin θ_max = √(n₁² − n₂²)  (numerical aperture)      Diamond sparkles because c ≈ 24° — light is trapped and reflected many times',
procedure:['Choose core and cladding.','Increase the entry angle θ from 0°.','Watch the zig-zag path: trapped (TIR) or leaking.','Record θ, the angle at the wall and whether TIR occurs.','Find the largest θ that is still trapped and compare with √(n₁² − n₂²).'],
controls:[{k:'n1',label:'Core n₁',type:'select',def:1.5,options:[[1.5,'1.50'],[1.62,'1.62']]},{k:'n2',label:'Cladding n₂',type:'select',def:1.4,options:[[1.4,'1.40'],[1.46,'1.46'],[1,'none (air)']]},{k:'th',label:'Entry angle θ',type:'range',min:0,max:80,step:2,def:30,unit:'°'}],
init(){return{}},
calc(p){const r=Math.asin(Math.sin(p.th*R)/p.n1),wall=90-r/R,crit=Math.asin(p.n2/p.n1)/R,na=Math.sqrt(Math.max(0,p.n1*p.n1-p.n2*p.n2)),tmax=na>=1?90:Math.asin(na)/R;return{r:r/R,wall,crit,tir:wall>crit,tmax,na}},
draw(c,s,p){bg(c);const k=this.calc(p),y0=230,h=90,x0=200,x1=960;RR(c,x0,y0-h-18,x1-x0,2*h+36,12,'rgba(160,200,240,0.12)','rgba(160,200,240,0.4)',1.5);RR(c,x0,y0-h,x1-x0,2*h,6,'rgba(180,220,255,0.28)');T(c,'cladding n₂',x0+10,y0-h-24,{s:14,c:C.dim});T(c,'core n₁',x0+10,y0+6,{s:14,c:C.dim});
const ia=p.th*R;ray(c,x0-Math.cos(ia)*170,y0+Math.sin(ia)*170,x0,y0,YEL,3);arc(c,x0,y0,50,Math.PI,Math.PI-ia,C.amber,2);T(c,'θ = '+p.th+'°',x0-130,y0-14,{s:17,w:700,c:C.amber});
let x=x0,y=y0,d=-1;const rr=k.r*R,dx=1/Math.tan(rr||1e-6);let n=0;while(x<x1&&n<40){const ty=d<0?y0-h:y0+h,nx=x+Math.abs(ty-y)*dx;const ex=Math.min(nx,x1),ey=y+(ty-y)*(ex-x)/(nx-x||1);ray(c,x,y,ex,ey,C.lime,3);if(nx>=x1)break;if(!k.tir){const out=(90-Math.asin(cl(p.n1*Math.sin(k.wall*R)/p.n2,-1,1))/R)*R;ray(c,nx,ty,nx+70,ty+d*Math.tan(Math.PI/2-out)*70*0+d*60,C.rose,2.5);if(n>=1)break}x=nx;y=ty;d=-d;n++;if(p.th===0)break}
if(p.th===0)ray(c,x0,y0,x1,y0,C.lime,3);
info(c,40,360,520,[['Angle at wall (90° − r)',k.wall.toFixed(1)+'°',C.lime],['Critical angle c',k.crit.toFixed(1)+'°',C.rose],['Acceptance θ_max',k.tmax.toFixed(1)+'°',C.cyan],['Result',k.tir?'Trapped by TIR':'Leaks out of the core',k.tir?C.lime:C.rose]]);},
readings(s,p){const k=this.calc(p);return[['Refraction at entry r',k.r.toFixed(1),'°'],['Angle at wall',k.wall.toFixed(1),'°'],['Critical angle',k.crit.toFixed(1),'°'],['θ_max (acceptance)',k.tmax.toFixed(1),'°']]},
columns:['n₁','n₂','θ (°)','wall angle (°)','c (°)','TIR?'],
record(s,p){const k=this.calc(p);return[p.n1,p.n2,p.th,+k.wall.toFixed(1),+k.crit.toFixed(1),k.tir?'Yes':'No']},
result(rows){const r=rows[0];const na=Math.sqrt(Math.max(0,r[0]*r[0]-r[1]*r[1]));return'Light is trapped for θ up to θ_max where sin θ_max = √(n₁² − n₂²) = '+na.toFixed(3)+(na>=1?' (≥ 1: every entry angle is accepted)':' → θ_max = '+(Math.asin(na)/R).toFixed(1)+'°')+'.'}};

/* 4 ─ Apparent depth, bird–fish & normal shift */
S.apparentDepth={title:'Apparent Depth, Bird & Fish, and Normal Shift',topic:'light',grades:[10,12],
aim:'Find how deep an object under water appears from above (near-normal viewing), work out what a bird sees of a fish and a fish sees of a bird, and measure the normal shift produced by a glass slab.',
apparatus:['Tank of water / glass slab','Coin (object)','Bird and fish models','Scale'],
formula:'Viewed from the rarer medium: apparent depth = real depth / n,  shift = d (1 − 1/n)      Fish sees bird: apparent height = n H  (bird looks farther)      Bird sees fish: apparent depth = D / n  (fish looks nearer)      Glass slab of thickness t: normal shift = t (1 − 1/n)',
procedure:['Choose the situation.','Set the depths / heights and the liquid.','Read the apparent position and the shift.','Record.','Compare: the shift depends only on thickness and n, not on where the object is.'],
controls:[{k:'mode',label:'Situation',type:'select',def:'coin',options:[['coin','Coin under water (seen from air)'],['bf','Bird above, fish below'],['slab','Object behind a glass slab']]},{k:'n',label:'Medium n',type:'select',def:1.33,options:[[1.33,'Water 1.33'],[1.5,'Glass 1.50']]},{k:'d',label:'Depth D / thickness t',type:'range',min:6,max:60,step:2,def:36,unit:'cm'},{k:'Hb',label:'Bird height H',type:'range',min:6,max:60,step:2,def:24,unit:'cm'}],
init(){return{}},
draw(c,s,p){bg(c);const k=5,ws=230;
if(p.mode!=='slab'){c.fillStyle='rgba(79,179,255,0.25)';c.fillRect(60,ws,880,300);L(c,60,ws,940,ws,'rgba(140,200,255,0.8)',2);T(c,'surface',70,ws-8,{s:14,c:C.dim})}
if(p.mode==='coin'){const cy=ws+p.d*k*0.8,ay=ws+p.d/p.n*k*0.8;c.beginPath();c.ellipse(400,cy,22,6,0,0,7);c.fillStyle='#e8c35a';c.fill();c.save();c.globalAlpha=0.5;c.beginPath();c.ellipse(400,ay,22,6,0,0,7);c.fillStyle='#e8c35a';c.fill();c.restore();
ray(c,400,cy,440,ws,YEL,2.5);ray(c,440,ws,470,60,YEL,2.5);L(c,440,ws,400,ay,YEL,1.5,[5,5]);c.beginPath();c.ellipse(475,52,20,12,0,0,7);c.fillStyle='#fff';c.fill();
T(c,'real '+p.d+' cm',330,cy+5,{a:'right',s:16,w:700,c:C.amber});T(c,'apparent '+(p.d/p.n).toFixed(1)+' cm',330,ay+5,{a:'right',s:16,w:700,c:C.lime});
info(c,600,40,370,[['Real depth',p.d+' cm',C.amber],['Apparent depth d/n',(p.d/p.n).toFixed(2)+' cm',C.lime],['Shift d(1 − 1/n)',(p.d*(1-1/p.n)).toFixed(2)+' cm',C.cyan]])}
else if(p.mode==='bf'){const by=ws-p.Hb*k*0.8,fy=ws+p.d*k*0.8;T(c,'🐦',300,by+12,{a:'center',s:34});T(c,'🐟',300,fy+12,{a:'center',s:34});c.save();c.globalAlpha=0.45;T(c,'🐦',520,ws-p.n*p.Hb*k*0.8+12,{a:'center',s:34});T(c,'🐟',520,ws+p.d/p.n*k*0.8+12,{a:'center',s:34});c.restore();T(c,'as seen by the other',520,ws+290,{a:'center',s:13,c:C.dim});
info(c,600,40,370,[['Fish sees bird at height nH',(p.n*p.Hb).toFixed(1)+' cm',C.lime],['Fish sees bird at distance',(p.d+p.n*p.Hb).toFixed(1)+' cm',C.lime],['Bird sees fish at depth D/n',(p.d/p.n).toFixed(1)+' cm',C.cyan],['Bird sees fish at distance',(p.Hb+p.d/p.n).toFixed(1)+' cm',C.cyan]])}
else{const t=p.d*k*0.6;RR(c,400,100,t,360,4,'rgba(180,220,255,0.3)','rgba(180,220,255,0.7)',2);objA(c,180,380,80,C.amber);const sh=p.d*(1-1/p.n)*k*0.6;c.save();c.globalAlpha=0.5;objA(c,180+sh,380,80,C.amber);c.restore();c.beginPath();c.ellipse(940,300,22,14,0,0,7);c.fillStyle='#fff';c.fill();
L(c,180,420,180+sh,420,C.lime,3);T(c,'shift',180+sh/2,446,{a:'center',s:16,w:700,c:C.lime});T(c,'t = '+p.d+' cm',400+t/2,90,{a:'center',s:16,w:700});info(c,600,40,370,[['Thickness t',p.d+' cm',C.ink],['Normal shift t(1 − 1/n)',(p.d*(1-1/p.n)).toFixed(2)+' cm',C.lime],['(object appears nearer)','',C.dim]])}},
readings(s,p){if(p.mode==='coin')return[['Apparent depth',(p.d/p.n).toFixed(2),'cm'],['Shift',(p.d*(1-1/p.n)).toFixed(2),'cm']];if(p.mode==='bf')return[['Bird as seen by fish',(p.d+p.n*p.Hb).toFixed(1),'cm away'],['Fish as seen by bird',(p.Hb+p.d/p.n).toFixed(1),'cm away']];return[['Normal shift',(p.d*(1-1/p.n)).toFixed(2),'cm']]},
columns:['Situation','n','D or t (cm)','Apparent / shift (cm)'],
record(s,p){if(p.mode==='coin')return['Coin',p.n,p.d,+(p.d/p.n).toFixed(2)];if(p.mode==='bf')return['Bird–fish (fish view)',p.n,p.d,+(p.d+p.n*p.Hb).toFixed(1)];return['Slab',p.n,p.d,+(p.d*(1-1/p.n)).toFixed(2)]},
plot:{x:2,y:3},
result(rows){return'Apparent depth = real/n: objects under water look raised. The fish sees the bird higher than it is (nH); the bird sees the fish nearer (D/n). Normal shift t(1 − 1/n) does not depend on object distance.'}};

/* 5 ─ Refraction at a single curved surface */
S.curvedSurface={title:'Refraction at a Single Curved Surface',topic:'light',grades:[12],
aim:'Find the image formed by refraction at one spherical surface — a glass rod with a curved end, or a fish seen in a spherical bowl — using n₂/v − n₁/u = (n₂ − n₁)/R.',
apparatus:['Glass rod with convex end (R = 10 cm)','Spherical fish bowl (R = 15 cm)','Object pin / fish'],
formula:'n₂/v − n₁/u = (n₂ − n₁)/R   (light travels left → right; New Cartesian signs)      m = (n₁ v)/(n₂ u)      Focal lengths: f₁ = −n₁R/(n₂ − n₁),  f₂ = n₂R/(n₂ − n₁),  f₂/f₁ = −n₂/n₁',
procedure:['Choose the set-up.','Move the object (u is negative).','Read v, m and whether the image is real or virtual.','Record for several positions.','Fish bowl: the fish (at the centre) appears at the centre but magnified n times.'],
controls:[{k:'set',label:'Set-up',type:'select',def:'rod',options:[['rod','Air → glass rod, convex end (R = +10 cm)'],['bowl','Fish in bowl: water → air (R = −15 cm)']]},{k:'u',label:'Object distance |u|',type:'range',min:2,max:60,step:1,def:30,unit:'cm'}],
init(){return{}},
calc(p){const [n1,n2,Rr]=p.set==='rod'?[1,1.5,10]:[1.33,1,-15];const u=-p.u,rhs=(n2-n1)/Rr+n1/u;const v=Math.abs(rhs)<1e-9?Infinity:n2/rhs;return{n1,n2,Rr,u,v,m:isFinite(v)?n1*v/(n2*u):Infinity,f1:-n1*Rr/(n2-n1),f2:n2*Rr/(n2-n1)}},
draw(c,s,p){bg(c);const k=this.calc(p),Px=560,ay=290,sc=6,X=d=>Px+d*sc;L(c,40,ay,980,ay,'rgba(255,255,255,0.3)',1.5);
if(p.set==='rod'){c.beginPath();c.moveTo(980,ay-150);c.lineTo(Px+30,ay-150);c.quadraticCurveTo(Px-30,ay,Px+30,ay+150);c.lineTo(980,ay+150);c.closePath();c.fillStyle='rgba(180,220,255,0.22)';c.fill();c.strokeStyle='rgba(180,220,255,0.7)';c.lineWidth=2;c.stroke()}
else{c.beginPath();c.arc(X(-15),ay,15*sc,0,7);c.fillStyle='rgba(79,179,255,0.25)';c.fill();c.strokeStyle='rgba(180,220,255,0.7)';c.lineWidth=2;c.stroke()}
T(c,'n₁ = '+k.n1,80,ay+190,{s:20,w:700});T(c,'n₂ = '+k.n2,900,ay+190,{s:20,w:700});c.beginPath();c.arc(X(k.Rr),ay,5,0,7);c.fillStyle=C.dim;c.fill();T(c,'C',X(k.Rr),ay+22,{a:'center',s:15,c:C.dim});
objA(c,X(k.u),ay,40,C.amber);if(isFinite(k.v)&&Math.abs(X(k.v))<3000){const vx=cl(X(k.v),30,990);objA(c,vx,ay,cl(40*k.m,-200,200),C.rose,k.v*1<0===false&&k.v<0?null:(k.v>0?null:[6,4]));T(c,'image',vx,ay+(k.m>0?-50*k.m-10:40),{a:'center',s:15,w:700,c:C.rose})}
info(c,40,30,430,[['u',k.u+' cm',C.amber],['v',isFinite(k.v)?k.v.toFixed(2)+' cm':'∞',C.cyan],['m',isFinite(k.m)?k.m.toFixed(2):'∞',C.ink],['Image',!isFinite(k.v)?'at infinity':k.v>0?'Real (in second medium)':'Virtual (same side)',C.lime],['f₁ / f₂',k.f1.toFixed(1)+' / '+k.f2.toFixed(1)+' cm',C.violet]]);},
readings(s,p){const k=this.calc(p);return[['Image distance v',isFinite(k.v)?k.v.toFixed(2):'∞','cm'],['Magnification',isFinite(k.m)?k.m.toFixed(2):'∞',''],['f₁',k.f1.toFixed(1),'cm'],['f₂',k.f2.toFixed(1),'cm']]},
columns:['Set-up','u (cm)','v (cm)','m','Nature'],
record(s,p){const k=this.calc(p);return[p.set==='rod'?'Glass rod':'Fish bowl',k.u,isFinite(k.v)?+k.v.toFixed(2):'∞',isFinite(k.m)?+k.m.toFixed(2):'∞',!isFinite(k.v)?'Infinity':k.v>0?'Real':'Virtual']},
result(rows){return'n₂/v − n₁/u = (n₂ − n₁)/R holds in every case. Object beyond f₁ on the rod → real image inside the glass; within f₁ → virtual. A fish at the bowl centre is seen at the centre, magnified by n.'}};

/* 6 ─ Thin lens: ray diagram, lens formula, lens maker */
S.lensRay={title:"Thin Lenses — Ray Diagrams, Lens Formula & Lens Maker's Formula",topic:'light',grades:[10,12],
aim:'Draw images by convex and concave lenses for every object position; verify 1/v − 1/u = 1/f, m = v/u and the lens maker’s formula, and find the power in dioptres.',
apparatus:['Biconvex / biconcave lenses (choose R and n)','Object arrow on an optical bench','Screen'],
formula:"Lens maker: 1/f = (n − 1)(1/R₁ − 1/R₂)  → equi-convex: f = R / 2(n − 1)      Lens formula: 1/v − 1/u = 1/f      m = v/u      Power P = 1/f (metre) dioptre: convex +, concave −      Convex: real & inverted beyond F, virtual & magnified within F;  concave: always virtual, erect, diminished",
procedure:['Choose the lens type, radius R and refractive index n — f is calculated by the lens maker’s formula.','Move the object along the bench.','Watch the two principal rays locate the image.','Record u, v, m and the nature of the image.','Change n: a lens of higher n is more powerful (shorter f).'],
controls:[{k:'type',label:'Lens',type:'select',def:'cx',options:[['cx','Biconvex'],['cc','Biconcave']]},{k:'Rr',label:'Radius of curvature R',type:'select',def:15,options:[[10,'10 cm'],[15,'15 cm'],[20,'20 cm'],[30,'30 cm']]},{k:'n',label:'Refractive index n',type:'select',def:1.5,options:[[1.5,'1.50'],[1.6,'1.60'],[1.75,'1.75']]},{k:'u',label:'Object distance |u|',type:'range',min:3,max:60,step:1,def:30,unit:'cm'}],
init(){return{}},
calc(p){const f0=p.Rr/(2*(p.n-1)),f=p.type==='cx'?f0:-f0,u=-p.u;const rhs=1/f+1/u;const v=Math.abs(rhs)<1e-9?Infinity:1/rhs;return{f,u,v,m:isFinite(v)?v/u:Infinity,Pw:100/f}},
draw(c,s,p){bg(c);const k=this.calc(p),Ox=520,ay=290,sc=7,X=d=>Ox+d*sc,h=45;L(c,30,ay,990,ay,'rgba(255,255,255,0.3)',1.5);lensShape(c,Ox,ay,150,p.type==='cx');
[['F₁',-Math.abs(k.f)],['F₂',Math.abs(k.f)],['2F₁',-2*Math.abs(k.f)],['2F₂',2*Math.abs(k.f)]].forEach(([n,d])=>{if(Math.abs(X(d)-Ox)<480){c.beginPath();c.arc(X(d),ay,5,0,7);c.fillStyle=C.dim;c.fill();T(c,n,X(d),ay+24,{a:'center',s:15,c:C.dim})}});
const ox=X(k.u),ty=ay-h;objA(c,ox,ay,h,C.amber);ray(c,ox,ty,Ox,ty,YEL,2.5);
if(p.type==='cx'){const fx=X(k.f),sl=(ay-ty)/(fx-Ox);ray(c,Ox,ty,990,ty+sl*(990-Ox),YEL,2.5)}else{const fx=X(k.f),sl=(ty-ay)/(Ox-fx);ray(c,Ox,ty,990,ty+sl*(990-Ox),YEL,2.5);L(c,Ox,ty,fx,ay,YEL,1.5,[5,5])}
const sl2=(ay-ty)/(Ox-ox);ray(c,ox,ty,Ox,ay,C.lime,2.5);ray(c,Ox,ay,990,ay+sl2*(990-Ox),C.lime,2.5);
if(isFinite(k.v)){const ix=X(k.v),ih=k.m*h;if(Math.abs(ix-Ox)<520){const virt=k.v<0;if(virt){L(c,Ox,ty,ix,ay-ih,YEL,1.5,[5,5]);L(c,Ox,ay,ix,ay-ih,C.lime,1.5,[5,5])}objA(c,ix,ay,cl(ih,-220,220),virt?'rgba(255,107,154,0.75)':C.rose,virt?[6,4]:null);T(c,'image',ix,ay-cl(ih,-220,220)+(ih>0?-14:24),{a:'center',s:15,w:700,c:C.rose})}}
info(c,30,30,420,[['f (lens maker)',k.f.toFixed(2)+' cm',C.violet],['Power P',k.Pw.toFixed(2)+' D',C.violet],['v',isFinite(k.v)?k.v.toFixed(2)+' cm':'∞',C.cyan],['m = v/u',isFinite(k.m)?k.m.toFixed(2):'∞',C.amber],['Image',!isFinite(k.v)?'at infinity':(k.v>0?'Real, inverted, ':'Virtual, erect, ')+(Math.abs(k.m)>1.001?'magnified':Math.abs(k.m)<0.999?'diminished':'same size'),C.lime]]);},
readings(s,p){const k=this.calc(p);return[['Focal length f',k.f.toFixed(2),'cm'],['Power',k.Pw.toFixed(2),'D'],['Image distance v',isFinite(k.v)?k.v.toFixed(2):'∞','cm'],['m',isFinite(k.m)?k.m.toFixed(2):'∞','']]},
columns:['Lens','f (cm)','u (cm)','v (cm)','m','1/v − 1/u'],
record(s,p){const k=this.calc(p);return[p.type==='cx'?'Convex':'Concave',+k.f.toFixed(2),k.u,isFinite(k.v)?+k.v.toFixed(2):'∞',isFinite(k.m)?+k.m.toFixed(2):'∞',isFinite(k.v)?+(1/k.v-1/k.u).toFixed(4):'—']},
result(rows){return'1/v − 1/u = 1/f in every reading. Equi-convex: f = R/2(n − 1), so a larger n or a smaller R gives a stronger lens. Convex: real beyond F, virtual within F (magnifying glass). Concave: always virtual, erect, diminished.'}};

/* 7 ─ Displacement method */
S.displacement={title:'Focal Length by the Displacement Method',topic:'light',grades:[12],
aim:'Keep the object and screen a fixed distance D apart and find the two lens positions that give a sharp image; get f = (D² − d²)/4D and the object size h = √(h₁h₂).',
apparatus:['Optical bench','Illuminated object (h = 4 cm)','Convex lens','Screen fixed at distance D'],
formula:'Sharp image is possible only if D ≥ 4f      Two positions separated by d:  f = (D² − d²) / (4D)      Image sizes h₁ (magnified) and h₂ (diminished):  h = √(h₁ h₂)',
procedure:['Set D (it must be at least 4f).','Slide the lens until the image on the screen is sharp — record.','Slide further to the second sharp position — record.','Calculate d, f and h from the two readings.','Reduce D below 4f: no sharp image can be found.'],
controls:[{k:'D',label:'Object–screen distance D',type:'range',min:50,max:120,step:5,def:100,unit:'cm'},{k:'f',label:'Lens (unknown f)',type:'select',def:20,options:[[15,'Lens A'],[20,'Lens B'],[24,'Lens C']]},{k:'x',label:'Lens position from object',type:'range',min:5,max:115,step:0.5,def:30,unit:'cm'}],
init(){return{}},
sharp(p){if(p.x>=p.D)return 0;const u=-p.x,v=p.D-p.x,e=Math.abs(1/v-1/u-1/p.f);return Math.max(0,1-e*400)},
draw(c,s,p){bg(c);const k=7.5,x0=80,ay=300,lx=x0+p.x*k,sx=x0+p.D*k;L(c,40,ay+120,980,ay+120,'rgba(255,255,255,0.3)',2);for(let cm=0;cm<=120;cm+=10){L(c,x0+cm*k,ay+120,x0+cm*k,ay+132,C.dim,1);T(c,cm+'',x0+cm*k,ay+150,{a:'center',s:12,m:1,c:C.dim})}
objA(c,x0,ay,40,C.amber);lensShape(c,lx,ay,100,true);RR(c,sx,ay-120,10,240,3,'#e8e4da');const sh=this.sharp(p),u=-p.x,v=p.D-p.x,m=v/u;c.save();c.globalAlpha=0.3+0.7*sh;c.filter='blur('+((1-sh)*6)+'px)';if(Math.abs(m*40)<200)objA(c,sx-14,ay,m*40,C.rose);c.restore();
info(c,560,30,410,[['Sharpness',(sh*100).toFixed(0)+' %',sh>0.9?C.lime:C.rose],['D vs 4f',p.D>=4*p.f?'D ≥ 4f ✓':'D < 4f — impossible',p.D>=4*p.f?C.lime:C.rose],['Image height',(Math.abs(m)*4).toFixed(2)+' cm',C.amber]]);},
readings(s,p){const sh=this.sharp(p),m=(p.D-p.x)/-p.x;return[['Sharpness',(sh*100).toFixed(0),'%'],['Lens position',p.x,'cm'],['Image height',(Math.abs(m)*4).toFixed(2),'cm']]},
columns:['D (cm)','Lens at (cm)','Image h (cm)'],
record(s,p){if(this.sharp(p)<0.9)return{error:'Image not sharp — slide the lens until sharpness > 90 %.'};return[p.D,p.x,+(Math.abs((p.D-p.x)/p.x)*4).toFixed(2)]},
result(rows){const g={};rows.forEach(r=>(g[r[0]]=g[r[0]]||[]).push(r));const out=[];Object.keys(g).forEach(D=>{const r=g[D];if(r.length<2)return;const xs=r.map(x=>x[1]),d=Math.max(...xs)-Math.min(...xs),hs=r.map(x=>x[2]);if(d<1)return;out.push('D = '+D+': d = '+d.toFixed(1)+' → f = (D² − d²)/4D = '+((D*D-d*d)/(4*D)).toFixed(2)+' cm;  h = √(h₁h₂) = '+Math.sqrt(Math.max(...hs)*Math.min(...hs)).toFixed(2)+' cm')});return out.join('   ·   ')||'Record both sharp positions for the same D.'}};

/* 8 ─ Power, combinations & silvered lens */
S.lensCombo={title:'Power of Lenses — Combinations & Silvered Lens',topic:'light',grades:[10,12],
aim:'Combine two thin lenses (in contact or separated) and find the equivalent power; then silver one face of a plano-convex lens and find the focal length of the resulting mirror.',
apparatus:['Thin lenses of various powers','Parallel beam of light','Plano-convex lens (R = 20 cm, n = 1.5) and silvering'],
formula:'P = 1/f (m) in dioptre      In contact: P = P₁ + P₂      Separated by d: P = P₁ + P₂ − d P₁ P₂      Silvered lens behaves as a mirror: P = 2P_lens + P_mirror  →  plane face silvered: F = f/2 = R/2(n − 1);  curved face silvered: F = R/2n',
procedure:['Choose the combination.','Set the lens powers (and separation).','Watch the parallel beam focus and read the equivalent power.','Record and check P = P₁ + P₂ (in contact).','Silvered lens: compare F for the plane face and the curved face silvered.'],
controls:[{k:'mode',label:'Combination',type:'select',def:'c',options:[['c','Two lenses in contact'],['s','Two lenses separated by d'],['pl','Plano-convex: plane face silvered'],['cu','Plano-convex: curved face silvered']]},{k:'P1',label:'Lens 1 power P₁',type:'range',min:-10,max:10,step:1,def:5,unit:'D'},{k:'P2',label:'Lens 2 power P₂',type:'range',min:-10,max:10,step:1,def:-2,unit:'D'},{k:'d',label:'Separation d',type:'range',min:0,max:20,step:2,def:10,unit:'cm'}],
init(){return{}},
calc(p){if(p.mode==='c'){const P=p.P1+p.P2;return{P,f:P?100/P:Infinity}}if(p.mode==='s'){const P=p.P1+p.P2-p.d/100*p.P1*p.P2;return{P,f:P?100/P:Infinity}}const n=1.5,Rr=20,PL=(n-1)/Rr*100,PM=p.mode==='pl'?0:2/Rr*100,P=2*PL+PM;return{P,f:100/P,PL,PM}},
draw(c,s,p){bg(c);const k=this.calc(p),ay=290;L(c,40,ay,980,ay,'rgba(255,255,255,0.3)',1.5);
if(p.mode==='c'||p.mode==='s'){const x1=420,x2=p.mode==='c'?440:420+p.d*8;lensShape(c,x1,ay,130,p.P1>=0);lensShape(c,x2,ay,130,p.P2>=0);T(c,'P₁ = '+p.P1+' D',x1,ay-150,{a:'center',s:16,w:700,c:C.amber});T(c,'P₂ = '+p.P2+' D',x2+30,ay+170,{a:'center',s:16,w:700,c:C.amber});
const fx=x2+k.f*4;for(let i=-2;i<=2;i++){if(!i)continue;const y=ay+i*45;ray(c,60,y,x1,y,YEL,2.5);if(isFinite(k.f)&&k.f>0){const sl=(ay-y)/(fx-x2);ray(c,x2,y,990,y+sl*(990-x2),YEL,2.5)}else if(isFinite(k.f)){const sl=(y-ay)/(x2-fx);ray(c,x2,y,990,y+sl*(990-x2),YEL,2.5);L(c,x2,y,fx,ay,YEL,1.2,[5,5])}else ray(c,x2,y,990,y,YEL,2.5)}
if(isFinite(k.f)&&Math.abs(fx-x2)<560){c.beginPath();c.arc(fx,ay,6,0,7);c.fillStyle=C.rose;c.fill();T(c,'F',fx,ay+24,{a:'center',s:16,w:700,c:C.rose})}}
else{const x=600;c.beginPath();c.moveTo(x,ay-150);c.quadraticCurveTo(x-60,ay,x,ay+150);c.closePath();c.fillStyle='rgba(180,220,255,0.25)';c.fill();L(c,x,ay-150,x,ay+150,p.mode==='pl'?'#cfd6df':'rgba(180,220,255,0.7)',p.mode==='pl'?7:2);if(p.mode==='cu'){c.beginPath();c.moveTo(x,ay-150);c.quadraticCurveTo(x-60,ay,x,ay+150);c.strokeStyle='#cfd6df';c.lineWidth=7;c.stroke()}
const fx=x-k.f*4;for(let i=-2;i<=2;i++){if(!i)continue;const y=ay+i*45;ray(c,60,y,x-30,y,YEL,2.5);ray(c,x-30,y,fx,ay,C.lime,2.5)}c.beginPath();c.arc(fx,ay,6,0,7);c.fillStyle=C.rose;c.fill();T(c,'F (mirror)',fx,ay+26,{a:'center',s:16,w:700,c:C.rose});T(c,'silvered '+(p.mode==='pl'?'plane':'curved')+' face',x+20,ay-160,{s:16,w:700,c:'#cfd6df'})}
info(c,40,30,430,[['Equivalent power P',k.P.toFixed(2)+' D',C.lime],['Focal length',isFinite(k.f)?k.f.toFixed(2)+' cm':'∞ (plane glass)',C.cyan],['Nature',p.mode==='pl'||p.mode==='cu'?'Concave mirror':k.P>0?'Converging':k.P<0?'Diverging':'No focusing',C.amber]]);},
readings(s,p){const k=this.calc(p);return[['Equivalent power',k.P.toFixed(2),'D'],['Focal length',isFinite(k.f)?k.f.toFixed(2):'∞','cm'],['Mode',{c:'Contact',s:'Separated',pl:'Plane silvered',cu:'Curved silvered'}[p.mode],'']]},
columns:['Mode','P₁ (D)','P₂ (D)','d (cm)','P (D)','f (cm)'],
record(s,p){const k=this.calc(p),sil=p.mode==='pl'||p.mode==='cu';return[{c:'Contact',s:'Separated',pl:'Plane silvered',cu:'Curved silvered'}[p.mode],sil?'—':p.P1,sil?'—':p.P2,p.mode==='s'?p.d:'—',+k.P.toFixed(2),isFinite(k.f)?+k.f.toFixed(2):'∞']},
result(rows){return'Powers add for lenses in contact (P = P₁ + P₂). Separation reduces the combined power for two converging lenses. Silvered plano-convex (R = 20 cm, n = 1.5): plane face silvered → F = 20 cm, curved face silvered → F = 6.67 cm.'}};

/* 9 ─ Defects of the eye */
S.eyeDefects={title:'Human Eye — Myopia, Hypermetropia & Correction',topic:'light',grades:[10],
aim:'See where the eye lens focuses light from near and far objects; find why a myopic eye cannot see far and a hypermetropic eye cannot see near, and calculate the power of the correcting lens.',
apparatus:['Model eye (retina 2.5 cm behind the lens)','Object at adjustable distance','Corrective lenses'],
formula:'Normal eye: near point 25 cm, far point ∞ (accommodation)      Myopia: far point F.P. < ∞ → image in front of the retina → concave lens, P = −100 / F.P.(cm)      Hypermetropia: near point N.P. > 25 cm → image behind the retina → convex lens, P = 100/25 − 100/N.P.(cm)      Presbyopia: both — bifocal lenses',
procedure:['Choose the eye.','Move the object from far to near.','See whether the rays meet on, in front of, or behind the retina.','Record the defect and the required lens power.','Switch on the corrective lens and check that the image falls on the retina.'],
controls:[{k:'eye',label:'Eye',type:'select',def:'my',options:[['n','Normal'],['my','Myopic (short-sighted)'],['hy','Hypermetropic (long-sighted)']]},{k:'fp',label:'Far point (myopia)',type:'range',min:50,max:300,step:10,def:100,unit:'cm'},{k:'np',label:'Near point (hypermetropia)',type:'range',min:30,max:150,step:5,def:75,unit:'cm'},{k:'obj',label:'Object distance',type:'select',def:1e6,options:[[1e6,'Far (∞)'],[300,'3 m'],[100,'1 m'],[50,'50 cm'],[25,'25 cm']]},{k:'corr',label:'Corrective lens',type:'toggle',def:false}],
init(){return{}},
calc(p){const FP=p.eye==='my'?p.fp:1e7,NP=p.eye==='hy'?p.np:25;const Pc=p.eye==='my'?-100/p.fp:p.eye==='hy'?100/25-100/p.np:0;let u=p.obj;if(p.corr&&Pc){const f=100/Pc,v=1/(1/f-1/u);u=Math.abs(v)}const sees=u>=NP-0.01&&u<=FP+0.01;const err=sees?0:u>FP?-1:1;return{FP,NP,Pc,sees,err}},
draw(c,s,p){bg(c);const k=this.calc(p),ex=640,ey=280;c.beginPath();c.arc(ex+60,ey,170,0,7);c.fillStyle='rgba(255,255,255,0.06)';c.fill();c.strokeStyle='rgba(255,255,255,0.4)';c.lineWidth=3;c.stroke();c.beginPath();c.arc(ex+60,ey,170,-0.6,0.6);c.strokeStyle=C.rose;c.lineWidth=6;c.stroke();T(c,'retina',ex+240,ey+6,{s:15,w:700,c:C.rose});
lensShape(c,ex-80,ey,60,true);const rx=ex+225,fx=rx+k.err*-70*-1*-1;const focusX=k.sees?rx:k.err<0?rx-70:rx+70;
for(const dy of[-50,50]){const sy=p.obj>1000?ey+dy:ey+dy*0.3;const x0=p.obj>1000?60:cl(ex-80-p.obj*1.6,60,ex-120);ray(c,x0,p.obj>1000?sy:ey,ex-80,ey+dy,YEL,2.5);L(c,ex-80,ey+dy,focusX,ey,C.lime,2.5);if(focusX<rx)L(c,focusX,ey,rx,ey-(ey+dy-ey)*(rx-focusX)/(focusX-ex+80),C.lime,1.5,[4,4])}
c.beginPath();c.arc(focusX,ey,7,0,7);c.fillStyle=k.sees?C.lime:C.rose;c.fill();if(p.corr&&k.Pc)lensShape(c,ex-200,ey,90,k.Pc>0,C.amber);
T(c,k.sees?'Sharp image on the retina':k.err<0?'Focused IN FRONT of the retina (blurred)':'Focused BEHIND the retina (blurred)',500,500,{a:'center',s:21,w:700,c:k.sees?C.lime:C.rose});
info(c,30,30,430,[['Near point',k.NP+' cm',C.ink],['Far point',k.FP>1e6?'∞':k.FP+' cm',C.ink],['Correcting lens',k.Pc?(k.Pc>0?'Convex ':'Concave ')+k.Pc.toFixed(2)+' D':'none needed',C.amber],['Focal length',k.Pc?(100/k.Pc).toFixed(1)+' cm':'—',C.cyan]]);},
readings(s,p){const k=this.calc(p);return[['Object',p.obj>1e5?'∞':p.obj+' cm',''],['Seen clearly',k.sees?'Yes':'No',''],['Lens power needed',k.Pc.toFixed(2),'D']]},
columns:['Eye','N.P. (cm)','F.P. (cm)','Lens','Power (D)'],
record(s,p){const k=this.calc(p);return[{n:'Normal',my:'Myopic',hy:'Hypermetropic'}[p.eye],k.NP,k.FP>1e6?'∞':k.FP,k.Pc?(k.Pc>0?'Convex':'Concave'):'None',+k.Pc.toFixed(2)]},
result(rows){return'Myopia: image forms in front of the retina for far objects → concave lens of P = −100/F.P. Hypermetropia: image behind the retina for near objects → convex lens of P = 4 − 100/N.P.'}};

window.LabParts=(window.LabParts||0)+1;
(window.LabExtra=window.LabExtra||[]).push({order:['snellTIR','opticalFibre','apparentDepth','curvedSurface','lensRay','displacement','lensCombo','eyeDefects','mirrorVelocity'],
syl:{8:[['Refraction & total internal reflection','snellTIR']],10:[["Refraction: Snell's law, TIR",'snellTIR'],['Optical fibres & sparkling diamond','opticalFibre'],['Apparent depth','apparentDepth'],['Lenses: ray diagrams & lens formula','lensRay'],['Power of lenses','lensCombo'],['Defects of vision & correction','eyeDefects']],
12:[['Image velocity & longitudinal magnification','mirrorVelocity'],['TIR & critical angle','snellTIR'],['Optical fibre: acceptance angle','opticalFibre'],['Apparent depth & normal shift','apparentDepth'],['Refraction at a curved surface','curvedSurface'],["Lens maker's formula",'lensRay'],['Displacement method for f','displacement'],['Combination of lenses; silvered lens','lensCombo']]}});
})();


/* d5c29e7e-2a7e-5204-8534-f815ea158c32 */
(function(){
const K=window.LabKit;const {W,H,R,C,T,L,P,RR,G,ball,head,arc,room,cl,avg,hint}=K;
const S=window.LabSims;const bg=c=>room(c,false);
const box=(c,x,y,w,h,title)=>{RR(c,x,y,w,h,10,'rgba(10,12,16,0.75)','rgba(255,255,255,0.12)',1);if(title)T(c,title,x+12,y+22,{s:14,w:600,c:C.dim})};
const ray=(c,x1,y1,x2,y2,col,w,dash)=>{L(c,x1,y1,x2,y2,col,w||2.5,dash);if(!dash)head(c,(x1+x2)/2,(y1+y2)/2,Math.atan2(y2-y1,x2-x1),col,11)};
const YEL='#ffd84a';
const objA=(c,x,yb,h,col,dash)=>{if(Math.abs(h)<1)return;L(c,x,yb,x,yb-h,col,4,dash);head(c,x,yb-h,h>0?-Math.PI/2:Math.PI/2,col,16)};
const info=(c,x,y,w,rows)=>{box(c,x,y,w,26+rows.length*36,'');rows.forEach(([a,b,col],i)=>{T(c,a,x+18,y+38+i*36,{s:17,c:C.dim});T(c,b,x+w-16,y+38+i*36,{a:'right',s:20,w:700,m:1,c:col||C.ink})})};
const lensShape=(c,x,y,h)=>{c.beginPath();c.moveTo(x,y-h);c.quadraticCurveTo(x+18,y,x,y+h);c.quadraticCurveTo(x-18,y,x,y-h);c.fillStyle='rgba(150,200,255,0.25)';c.fill();c.strokeStyle='rgba(180,220,255,0.8)';c.lineWidth=2;c.stroke()};
const sup=n=>String(n).replace(/-/g,'⁻').replace(/[0-9]/g,d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
const dimStr=([m,l,t,a,k])=>{const s=[];if(m)s.push('M'+(m!==1?sup(m):''));if(l)s.push('L'+(l!==1?sup(l):''));if(t)s.push('T'+(t!==1?sup(t):''));if(a)s.push('A'+(a!==1?sup(a):''));if(k)s.push('K'+(k!==1?sup(k):''));return'['+(s.join(' ')||'M⁰ L⁰ T⁰')+']'};

/* 1 ─ Optical instruments */
S.instruments={title:'Optical Instruments — Magnifier, Compound Microscope & Telescope',topic:'light',grades:[10,12],
aim:'Find the magnifying power of a simple microscope, a compound microscope and an astronomical telescope, with the final image at the near point (D = 25 cm) or at infinity (normal adjustment).',
apparatus:['Convex lenses of different focal lengths','Tube with adjustable length','Object (insect / distant tree)'],
formula:'Simple microscope: M = 1 + D/f (image at D),  M = D/f (at ∞)      Compound microscope: M = (v₀/u₀)(1 + D/fₑ) at D;  M ≈ (L/f₀)(D/fₑ) at ∞      Telescope (normal adjustment): M = f₀/fₑ, tube length L = f₀ + fₑ;  image at D: M = (f₀/fₑ)(1 + fₑ/D)',
procedure:['Choose the instrument.','Set the focal lengths (and tube length).','Choose where the final image is formed.','Read the magnifying power and the length of the instrument; record.','Compare: a short-focus eyepiece and (for a telescope) a long-focus objective give a high magnification.'],
controls:[{k:'ins',label:'Instrument',type:'select',def:'mic',options:[['mag','Simple microscope (magnifier)'],['mic','Compound microscope'],['tel','Astronomical telescope']]},{k:'fo',label:'Objective f₀ (or magnifier f)',type:'select',def:2,options:[[1,'1 cm'],[2,'2 cm'],[5,'5 cm'],[50,'50 cm'],[100,'100 cm']]},{k:'fe',label:'Eyepiece fₑ',type:'select',def:5,options:[[2,'2 cm'],[5,'5 cm'],[10,'10 cm']]},{k:'L',label:'Tube length (microscope)',type:'range',min:10,max:25,step:1,def:16,unit:'cm'},{k:'fin',label:'Final image at',type:'select',def:'D',options:[['D','Near point (D = 25 cm)'],['inf','Infinity (relaxed eye)']]}],
init(){return{}},
calc(p){const D=25;if(p.ins==='mag'){const f=p.fo;return{M:p.fin==='D'?1+D/f:D/f,len:f,note:'u = '+(p.fin==='D'?(D*f/(D+f)).toFixed(2):f.toFixed(2))+' cm'}}
if(p.ins==='mic'){const ue=p.fin==='D'?D*p.fe/(D+p.fe):p.fe,vo=p.L-ue;if(vo<=p.fo)return{M:NaN,len:p.L,note:'Tube too short'};const uo=vo*p.fo/(vo-p.fo),mo=vo/uo,me=p.fin==='D'?1+D/p.fe:D/p.fe;return{M:mo*me,len:p.L,mo,me,note:'object at '+uo.toFixed(2)+' cm from objective'}}
const M=p.fin==='inf'?p.fo/p.fe:(p.fo/p.fe)*(1+p.fe/D),len=p.fin==='inf'?p.fo+p.fe:p.fo+D*p.fe/(D+p.fe);return{M,len,note:p.fo<p.fe?'f₀ must be larger than fₑ!':''}},
draw(c,s,p){bg(c);const k=this.calc(p),ay=300;L(c,30,ay,990,ay,'rgba(255,255,255,0.3)',1.5);
if(p.ins==='mag'){const lx=520,sc=Math.min(40,300/p.fo);lensShape(c,lx,ay,110);const u=p.fin==='D'?25*p.fo/(25+p.fo):p.fo*0.999;objA(c,lx-u*sc,ay,30,C.amber);const ih=p.fin==='D'?30*(1+25/p.fo):180;objA(c,lx-Math.min(25*sc,470),ay,cl(ih,0,200),'rgba(255,107,154,0.6)',[6,4]);ray(c,lx-u*sc,ay-30,lx,ay-30,YEL,2.5);ray(c,lx,ay-30,lx+300,ay-30+300*30/(p.fo*sc),YEL,2.5);L(c,lx,ay-30,lx-Math.min(25*sc,470),ay-cl(ih,0,200),YEL,1.5,[5,5]);c.beginPath();c.ellipse(lx+340,ay,20,12,0,0,7);c.fillStyle='#fff';c.fill()}
else{const sc=p.ins==='mic'?28:Math.min(5,700/(k.len||1)),ox=200,ex=ox+(k.len||0)*sc;lensShape(c,ox,ay,p.ins==='mic'?70:120);lensShape(c,ex,ay,70);RR(c,ox,ay-80,ex-ox,160,6,null,'rgba(255,255,255,0.15)',1.5);T(c,'objective',ox,ay+140,{a:'center',s:15,c:C.dim});T(c,'eyepiece',ex,ay+140,{a:'center',s:15,c:C.dim});c.beginPath();c.ellipse(ex+50,ay,20,12,0,0,7);c.fillStyle='#fff';c.fill();
L(c,ox,ay+110,ex,ay+110,C.lime,2);T(c,(p.ins==='mic'?'L = ':'tube = ')+(k.len||0).toFixed(1)+' cm',(ox+ex)/2,ay+100,{a:'center',s:17,w:700,m:1,c:C.lime});
if(p.ins==='tel'){for(const d of[-50,0,50])ray(c,40,ay+d-25,ox,ay+d,YEL,2.5);c.beginPath();c.arc(ox+p.fo*sc,ay,5,0,7);c.fillStyle=C.rose;c.fill();T(c,'F₀ = Fₑ',ox+p.fo*sc,ay+24,{a:'center',s:14,c:C.rose})}else{objA(c,ox-40,ay,20,C.amber);ray(c,ox-40,ay-20,ox,ay-20,YEL,2.5);ray(c,ox,ay-20,ex,ay+40,YEL,2.5)}}
info(c,30,30,460,[['Magnifying power M',isFinite(k.M)?k.M.toFixed(1)+' ×':'—',C.lime],['Length / position',(k.len||0).toFixed(2)+' cm',C.cyan],['Note',k.note||'—',k.note&&k.note.includes('!')||k.note==='Tube too short'?C.rose:C.dim]]);},
readings(s,p){const k=this.calc(p);return[['Magnifying power',isFinite(k.M)?k.M.toFixed(2):'—','×'],['Instrument length',(k.len||0).toFixed(2),'cm'],['Final image',p.fin==='D'?'at 25 cm':'at ∞','']]},
columns:['Instrument','f₀ (cm)','fₑ (cm)','Image at','M','Length (cm)'],
record(s,p){const k=this.calc(p);if(!isFinite(k.M))return{error:k.note||'Invalid setting.'};return[{mag:'Magnifier',mic:'Microscope',tel:'Telescope'}[p.ins],p.fo,p.ins==='mag'?'—':p.fe,p.fin==='D'?'D':'∞',+k.M.toFixed(2),+k.len.toFixed(2)]},
result(rows){return'Magnifier: M = 1 + D/f (D) or D/f (∞). Microscope: both lenses short-focus, M = m₀ × mₑ. Telescope: long-focus objective, short-focus eyepiece, M = f₀/fₑ and L = f₀ + fₑ in normal adjustment. Image at D always gives slightly more M than at ∞.'}};

/* 2 ─ Physical quantities, units & dimensions */
const Q={len:['Length','Fundamental','metre (m)','cm','foot',[0,1,0,0,0]],mass:['Mass','Fundamental','kilogram (kg)','g','pound',[1,0,0,0,0]],time:['Time','Fundamental','second (s)','s','s',[0,0,1,0,0]],cur:['Electric current','Fundamental','ampere (A)','—','—',[0,0,0,1,0]],temp:['Temperature','Fundamental','kelvin (K)','—','—',[0,0,0,0,1]],
area:['Area','Derived','m²','cm²','ft²',[0,2,0,0,0]],vol:['Volume','Derived','m³','cm³','ft³',[0,3,0,0,0]],den:['Density','Derived','kg/m³','g/cm³','lb/ft³',[1,-3,0,0,0]],vel:['Velocity','Derived','m/s','cm/s','ft/s',[0,1,-1,0,0]],acc:['Acceleration','Derived','m/s²','cm/s²','ft/s²',[0,1,-2,0,0]],
force:['Force','Derived','newton (N)','dyne','poundal',[1,1,-2,0,0]],mom:['Momentum','Derived','kg·m/s','g·cm/s','lb·ft/s',[1,1,-1,0,0]],work:['Work / energy','Derived','joule (J)','erg','ft·poundal',[1,2,-2,0,0]],pow:['Power','Derived','watt (W)','erg/s','—',[1,2,-3,0,0]],pres:['Pressure','Derived','pascal (Pa)','dyne/cm²','—',[1,-1,-2,0,0]],G:['Gravitational constant G','Derived','N·m²/kg²','dyne·cm²/g²','—',[-1,3,-2,0,0]],
ang:['Plane angle','Supplementary','radian (rad)','rad','rad',[0,0,0,0,0]],sang:['Solid angle','Supplementary','steradian (sr)','sr','sr',[0,0,0,0,0]],chg:['Charge','Derived','coulomb (C)','—','—',[0,0,1,1,0]]};
S.dimensions={title:'Physical Quantities, Units & Dimensional Analysis',topic:'meas',grades:[9,11],
aim:'Classify quantities as fundamental, derived or supplementary; find their SI, CGS and FPS units and dimensional formulae; check whether an equation is dimensionally correct; and derive the formula for the period of a pendulum by dimensions.',
apparatus:['Table of SI base quantities (m, kg, s, A, K, mol, cd)','Simple pendulum (length l, mass m) for the derivation'],
formula:'7 SI base units: m, kg, s, A, K, mol, cd   ·   supplementary: rad, sr      Dimensional formula: [Mᵃ Lᵇ Tᶜ]      Principle of homogeneity: every term of a correct equation has the same dimensions      Pendulum: T = k lᵃ gᵇ mᶜ → [T] = [L]ᵃ[LT⁻²]ᵇ[M]ᶜ → c = 0, a = ½, b = −½  → T = k√(l/g)',
procedure:['Mode 1 — choose a quantity: read its type, units in SI/CGS/FPS and dimensional formula. Record.','Mode 2 — choose an equation and check every term: is it homogeneous?','Mode 3 — choose powers a, b, c for T = k lᵃ gᵇ mᶜ until the dimensions match [T].','Note: a dimensionally correct equation may still be wrong by a pure number (k = 2π).','Dimensionless quantities (angle, strain, refractive index) have formula [M⁰L⁰T⁰].'],
controls:[{k:'mode',label:'Mode',type:'select',def:'q',options:[['q','Quantity explorer'],['eq','Check an equation'],['der','Derive the pendulum formula']]},{k:'q',label:'Quantity',type:'select',def:'force',options:Object.keys(Q).map(k=>[k,Q[k][0]])},{k:'eq',label:'Equation',type:'select',def:'v2',options:[['v2','v² = u² + 2as'],['s','s = ut + ½at²'],['wrong','s = ut + ½at³'],['ke','KE = ½ m v²'],['bad','F = m v²'],['pv','P V = nRT (as energy)']]},{k:'a',label:'Power of l (a)',type:'select',def:1,options:[[-1,'−1'],[-0.5,'−½'],[0,'0'],[0.5,'½'],[1,'1']]},{k:'b',label:'Power of g (b)',type:'select',def:0,options:[[-1,'−1'],[-0.5,'−½'],[0,'0'],[0.5,'½'],[1,'1']]},{k:'c',label:'Power of m (c)',type:'select',def:0,options:[[-1,'−1'],[0,'0'],[1,'1']]}],
init(){return{}},
eqs:{v2:[['v²',[0,2,-2]],['u²',[0,2,-2]],['2as',[0,2,-2]]],s:[['s',[0,1,0]],['ut',[0,1,0]],['½at²',[0,1,0]]],wrong:[['s',[0,1,0]],['ut',[0,1,0]],['½at³',[0,1,1]]],ke:[['KE',[1,2,-2]],['½mv²',[1,2,-2]]],bad:[['F',[1,1,-2]],['mv²',[1,2,-2]]],pv:[['PV',[1,2,-2]],['nRT',[1,2,-2]]]},
der(p){return[p.c,p.a+p.b,-2*p.b]},
draw(c,s,p){bg(c);
if(p.mode==='q'){const q=Q[p.q];T(c,q[0],500,120,{a:'center',s:40,w:800,c:C.amber});T(c,q[1]+' quantity',500,170,{a:'center',s:22,w:700,c:q[1]==='Fundamental'?C.lime:q[1]==='Derived'?C.cyan:C.violet});
info(c,220,210,560,[['SI unit',q[2],C.ink],['CGS unit',q[3],C.ink],['FPS unit',q[4],C.ink],['Dimensional formula',dimStr(q[5]),C.lime]]);T(c,'Fundamental: length, mass, time, current, temperature, amount, luminous intensity',500,500,{a:'center',s:15,c:C.dim})}
else if(p.mode==='eq'){const e=this.eqs[p.eq],ok=e.every(t=>t[1].join()===e[0][1].join());e.forEach(([t,d],i)=>{const y=130+i*90;RR(c,200,y,600,70,10,'rgba(10,12,16,0.75)',d.join()===e[0][1].join()?'rgba(182,243,92,0.6)':'rgba(255,107,154,0.7)',2);T(c,t,240,y+46,{s:28,w:700,m:1,c:C.amber});T(c,dimStr([...d,0,0]),770,y+46,{a:'right',s:26,w:700,m:1,c:d.join()===e[0][1].join()?C.lime:C.rose})});
T(c,ok?'Dimensionally CORRECT (homogeneous)':'Dimensionally WRONG — terms do not match',500,450,{a:'center',s:26,w:800,c:ok?C.lime:C.rose});if(ok)T(c,'(may still have a wrong numerical factor — dimensions cannot check pure numbers)',500,490,{a:'center',s:15,c:C.dim})}
else{const d=this.der(p),ok=d[0]===0&&d[1]===0&&d[2]===1;T(c,'T = k · l'+sup(p.a===0.5?'½':p.a===-0.5?'-½':p.a)+' · g'+(p.b===0.5?'½':p.b===-0.5?'⁻½':sup(p.b))+' · m'+sup(p.c),500,140,{a:'center',s:34,w:800,m:1,c:C.amber});
info(c,220,190,560,[['[l]ᵃ','[L]^'+p.a,C.ink],['[g]ᵇ','[L T⁻²]^'+p.b,C.ink],['[m]ᶜ','[M]^'+p.c,C.ink],['Result','[M^'+d[0]+' L^'+d[1]+' T^'+d[2]+']',ok?C.lime:C.rose]]);T(c,ok?'Matches [T] → T = k √(l/g)  (experiment gives k = 2π)':'Does not match [T] = [M⁰ L⁰ T¹] — try other powers',500,470,{a:'center',s:22,w:700,c:ok?C.lime:C.rose})}},
readings(s,p){if(p.mode==='q'){const q=Q[p.q];return[['Type',q[1],''],['SI unit',q[2],''],['Dimensions',dimStr(q[5]),'']]}if(p.mode==='eq'){const e=this.eqs[p.eq];return[['Homogeneous',e.every(t=>t[1].join()===e[0][1].join())?'Yes':'No','']]}const d=this.der(p);return[['Dimensions of RHS','[M^'+d[0]+' L^'+d[1]+' T^'+d[2]+']',''],['Matches [T]',d.join()==='0,0,1'?'Yes':'No','']]},
columns:['Mode','Item','Result'],
record(s,p){if(p.mode==='q'){const q=Q[p.q];return[q[1],q[0]+' — '+q[2],dimStr(q[5])]}if(p.mode==='eq'){const e=this.eqs[p.eq],ok=e.every(t=>t[1].join()===e[0][1].join());return['Equation',{v2:'v² = u² + 2as',s:'s = ut + ½at²',wrong:'s = ut + ½at³',ke:'KE = ½mv²',bad:'F = mv²',pv:'PV = nRT'}[p.eq],ok?'Correct':'Wrong']}const d=this.der(p);return['Derivation','a = '+p.a+', b = '+p.b+', c = '+p.c,d.join()==='0,0,1'?'T ∝ √(l/g) ✓':'no match']},
result(rows){return'Every physical quantity has a dimensional formula in M, L, T (A, K…). An equation must be homogeneous; dimensions also let us derive relations such as T = 2π√(l/g) (up to a constant).'}};

/* 3 ─ Prefixes & unit conversion */
const PRE=[[12,'tera','T'],[9,'giga','G'],[6,'mega','M'],[3,'kilo','k'],[2,'hecto','h'],[1,'deca','da'],[0,'(base)',''],[-1,'deci','d'],[-2,'centi','c'],[-3,'milli','m'],[-6,'micro','µ'],[-9,'nano','n'],[-12,'pico','p'],[-15,'femto','f']];
const CONV={N:['1 newton → dyne',[1,1,-2],[1000,100,1],'dyne'],J:['1 joule → erg',[1,2,-2],[1000,100,1],'erg'],den:['1 g/cm³ → kg/m³',[1,-3,0],[0.001,0.01,1],'kg/m³'],kmh:['1 km/h → m/s',[0,1,-1],[1,1000,3600],'m/s'],G:['G = 6.67×10⁻¹¹ (SI) → CGS',[-1,3,-2],[1000,100,1],'CGS units'],ly:['1 light year → metre',[0,1,0],[1,9.46e15,1],'m'],au:['1 astronomical unit → metre',[0,1,0],[1,1.496e11,1],'m'],pc:['1 parsec → light year',[0,1,0],[1,3.26,1],'ly'],ang:['1 ångström → metre',[0,1,0],[1,1e-10,1],'m'],fm:['1 fermi → metre',[0,1,0],[1,1e-15,1],'m']};
S.unitConvert={title:'Multiples, Prefixes & Unit Conversion',topic:'meas',grades:[6,9,11],
aim:'Use SI prefixes to write very large and very small quantities, convert units between systems with the dimensional method n₂ = n₁ [M₁/M₂]ᵃ[L₁/L₂]ᵇ[T₁/T₂]ᶜ, and meet practical units (light year, AU, parsec, ångström, fermi).',
apparatus:['Prefix ladder (10¹² … 10⁻¹⁵)','Conversion table'],
formula:'kilo 10³ · mega 10⁶ · giga 10⁹ · tera 10¹²  |  centi 10⁻² · milli 10⁻³ · micro 10⁻⁶ · nano 10⁻⁹ · pico 10⁻¹²      n₂ = n₁ (M₁/M₂)ᵃ (L₁/L₂)ᵇ (T₁/T₂)ᶜ  for [Mᵃ Lᵇ Tᶜ]      1 ly = 9.46 × 10¹⁵ m · 1 AU = 1.496 × 10¹¹ m · 1 pc = 3.26 ly · 1 Å = 10⁻¹⁰ m · 1 fm = 10⁻¹⁵ m',
procedure:['Mode 1 — set a value in metres with the exponent slider and read it with every prefix.','Choose the most convenient prefix (number between 1 and 1000).','Mode 2 — choose a conversion and follow the dimensional method step by step.','Record the result.','Check: 1 N = 10⁵ dyne, 1 J = 10⁷ erg, 1 g/cm³ = 1000 kg/m³, 1 km/h = 5/18 m/s.'],
controls:[{k:'mode',label:'Mode',type:'select',def:'pre',options:[['pre','Prefix ladder'],['conv','Convert a unit']]},{k:'e',label:'Length = 10^e metre',type:'range',min:-15,max:16,step:1,def:-6,unit:''},{k:'cv',label:'Conversion',type:'select',def:'N',options:Object.keys(CONV).map(k=>[k,CONV[k][0]])}],
init(){return{}},
best(e){return PRE.filter(p=>p[0]<=e).sort((a,b)=>b[0]-a[0])[0]||PRE[PRE.length-1]},
conv(p){const [lab,d,f,u]=CONV[p.cv];if(['ly','au','pc','ang','fm'].includes(p.cv))return{lab,val:f[1],u,steps:['Practical unit — use the defined value']};const n1=p.cv==='G'?6.67e-11:1;const factor=Math.pow(f[0],d[0])*Math.pow(f[1],d[1])*Math.pow(f[2],d[2]);const val=p.cv==='kmh'?1000/3600:n1*factor;return{lab,val,u,steps:['[M^'+d[0]+' L^'+d[1]+' T^'+d[2]+']',p.cv==='kmh'?'n₂ = 1 × (1000 m)/(3600 s)':'n₂ = n₁ × ('+f[0]+')^'+d[0]+' × ('+f[1]+')^'+d[1]+' × ('+f[2]+')^'+d[2]]}},
fmtE(v){if(v===0)return'0';const e=Math.floor(Math.log10(Math.abs(v)));return Math.abs(e)<4?String(+v.toPrecision(4)):(v/Math.pow(10,e)).toFixed(3)+' × 10'+sup(e)},
draw(c,s,p){bg(c);if(p.mode==='pre'){const b=this.best(p.e);box(c,40,30,920,90,'');T(c,'Length = 10'+sup(p.e)+' m',80,88,{s:30,w:800,m:1,c:C.amber});T(c,'= '+Math.pow(10,p.e-b[0])+' '+b[2]+'m  ('+b[1]+'metre)',900,88,{a:'right',s:28,w:800,m:1,c:C.lime});
PRE.forEach(([e,n,sym],i)=>{const y=150+i*27,on=e===b[0];RR(c,180,y,640,24,4,on?'rgba(182,243,92,0.25)':'rgba(255,255,255,0.03)');T(c,n,200,y+18,{s:16,w:on?800:500,c:on?C.lime:C.ink});T(c,sym||'—',400,y+18,{s:16,w:700,m:1,c:C.cyan});T(c,'10'+sup(e),500,y+18,{s:16,m:1,c:C.amber});T(c,this.fmtE(Math.pow(10,p.e-e))+' '+sym+'m',800,y+18,{a:'right',s:16,m:1,c:C.dim})});
const ex=p.e<=-14?'size of a nucleus':p.e<=-10?'size of an atom':p.e<=-6?'bacterium':p.e<=-3?'thickness of a coin':p.e<=0?'a pencil':p.e<=3?'a building':p.e<=7?'Earth radius scale':p.e<=11?'Earth–Sun distance scale':'light-year scale';T(c,'e.g. '+ex,880,140,{a:'right',s:15,c:C.dim})}
else{const k=this.conv(p);T(c,k.lab,500,110,{a:'center',s:30,w:800,c:C.amber});k.steps.forEach((st,i)=>T(c,st,500,190+i*50,{a:'center',s:22,m:1,c:C.ink}));box(c,220,330,560,110,'');T(c,'= '+this.fmtE(k.val)+' '+k.u,500,398,{a:'center',s:32,w:800,m:1,c:C.lime})}},
readings(s,p){if(p.mode==='pre'){const b=this.best(p.e);return[['Best prefix',b[1]+' ('+b[2]+')',''],['Value',Math.pow(10,p.e-b[0])+' '+b[2]+'m','']]}const k=this.conv(p);return[['Result',this.fmtE(k.val),k.u]]},
columns:['Conversion','Result'],
record(s,p){if(p.mode==='pre'){const b=this.best(p.e);return['10^'+p.e+' m',Math.pow(10,p.e-b[0])+' '+b[2]+'m']}const k=this.conv(p);return[k.lab,this.fmtE(k.val)+' '+k.u]},
result(rows){return'Prefixes keep numbers between 1 and 1000. Converting units: n₂ = n₁[M₁/M₂]ᵃ[L₁/L₂]ᵇ[T₁/T₂]ᶜ — e.g. 1 N = 10⁵ dyne, 1 J = 10⁷ erg.'}};

/* 4 ─ Irregular area & volume */
S.irregularArea={title:'Area of an Irregular Shape & Volume by Displacement',topic:'meas',grades:[6,7,9],
aim:'Estimate the area of a leaf on centimetre graph paper by counting squares (full = 1, half or more = 1, less than half = 0), and find the volume of an irregular stone from the rise of water in a measuring cylinder.',
apparatus:['Leaf on cm graph paper','Measuring cylinder (graduated in mL)','Irregular stone on a thread'],
formula:'Area ≈ (number of full squares) + (number of squares at least half covered)  in cm²      Finer grid → better estimate      Volume of stone = V₂ − V₁ (water level after − before)      1 mL = 1 cm³',
procedure:['Mode 1 — choose the leaf and the grid size.','Count full squares and squares at least half covered (shown in colour).','Record the estimate and compare with the true area; use a finer grid.','Mode 2 — choose the stone and lower it into the cylinder.','Record V₁ and V₂; volume = V₂ − V₁.'],
controls:[{k:'mode',label:'Mode',type:'select',def:'area',options:[['area','Area by counting squares'],['vol','Volume by displacement']]},{k:'leaf',label:'Leaf',type:'select',def:1,options:[[1,'Leaf A'],[2,'Leaf B']]},{k:'g',label:'Grid size',type:'select',def:1,options:[[1,'1 cm'],[0.5,'0.5 cm'],[0.25,'0.25 cm']]},{k:'st',label:'Stone',type:'select',def:18,options:[[12,'Small stone'],[18,'Medium stone'],[27,'Large stone']]},{k:'in',label:'Stone in water',type:'toggle',def:true}],
init(){return{}},
inLeaf(p,x,y){const a=p.leaf===1?6:7,b=p.leaf===1?3.2:2.6,cx=7,cy=4.5,dx=x-cx,dy=y-cy;const wob=1+0.12*Math.sin(Math.atan2(dy,dx)*3+p.leaf);return(dx*dx)/(a*a)+(dy*dy)/(b*b)<=wob*wob*(1-0.15*Math.max(0,dx/a))},
count(p){const key=p.leaf+'|'+p.g;if(this._ck===key)return this._cv;const cells=[];const g=p.g;let full=0,half=0;for(let x=0;x<14;x+=g)for(let y=0;y<9;y+=g){let n=0,m=6;for(let i=0;i<m;i++)for(let j=0;j<m;j++)if(this.inLeaf(p,x+(i+0.5)*g/m,y+(j+0.5)*g/m))n++;const f=n/(m*m);cells.push([x,y,f]);if(f>0.98)full++;else if(f>=0.5)half++}let tr=0;const q=0.05;for(let x=0;x<14;x+=q)for(let y=0;y<9;y+=q)if(this.inLeaf(p,x+q/2,y+q/2))tr++;const out={full,half,est:(full+half)*g*g,true:tr*q*q,cells};const bd=[];for(let a=0;a<=360;a+=3){let r=0.1;for(;r<8;r+=0.03){if(!this.inLeaf(p,7+Math.cos(a*R)*r,4.5+Math.sin(a*R)*r))break}bd.push([7+Math.cos(a*R)*r,4.5+Math.sin(a*R)*r])}out.bd=bd;this._ck=key;this._cv=out;return out},
draw(c,s,p){bg(c);if(p.mode==='area'){const k=this.count(p),sc=46,ox=60,oy=60;RR(c,ox,oy,14*sc,9*sc,4,'#f4f1ea');
k.cells.forEach(([x,y,f])=>{if(f>0.98){c.fillStyle='rgba(60,170,90,0.45)';c.fillRect(ox+x*sc,oy+y*sc,p.g*sc,p.g*sc)}else if(f>=0.5){c.fillStyle='rgba(255,181,71,0.5)';c.fillRect(ox+x*sc,oy+y*sc,p.g*sc,p.g*sc)}});
c.strokeStyle='rgba(60,90,130,0.25)';c.lineWidth=1;c.beginPath();for(let x=0;x<=14;x+=p.g){c.moveTo(ox+x*sc,oy);c.lineTo(ox+x*sc,oy+9*sc)}for(let y=0;y<=9;y+=p.g){c.moveTo(ox,oy+y*sc);c.lineTo(ox+14*sc,oy+y*sc)}c.stroke();
c.beginPath();k.bd.forEach(([x,y],i)=>{i?c.lineTo(ox+x*sc,oy+y*sc):c.moveTo(ox+x*sc,oy+y*sc)});c.closePath();c.strokeStyle='#2f7a3a';c.lineWidth=3;c.stroke();
info(c,720,470-160,250,[['Full',k.full,C.lime],['≥ half',k.half,C.amber],['Estimate',k.est.toFixed(2)+' cm²',C.cyan],['True',k.true.toFixed(2)+' cm²',C.dim]])}
else{const cx=420,top=90,bot=470,w=120,V1=50,V2=V1+(p.in?p.st:0),k=(bot-top)/100;RR(c,cx-w/2,top,w,bot-top,8,'rgba(200,220,240,0.12)','rgba(200,220,240,0.6)',2);c.fillStyle='rgba(79,179,255,0.45)';c.fillRect(cx-w/2+3,bot-V2*k,w-6,V2*k-3);
for(let m=0;m<=100;m+=5){L(c,cx-w/2,bot-m*k,cx-w/2+(m%10?10:20),bot-m*k,'#cfd6df',1);if(m%10===0)T(c,m+'',cx-w/2-10,bot-m*k+5,{a:'right',s:13,m:1,c:C.dim})}T(c,'mL',cx-w/2-10,top-10,{a:'right',s:13,c:C.dim});
const sy=p.in?bot-30:top-60;L(c,cx,top-100,cx,sy-14,'#cfd6df',1.5);c.beginPath();c.ellipse(cx,sy,10+p.st/2,8+p.st/3,0.3,0,7);c.fillStyle='#8792a3';c.fill();
info(c,620,120,330,[['V₁ (water only)',V1+' mL',C.cyan],['V₂ (with stone)',V2+' mL',C.cyan],['Volume of stone',(V2-V1)+' cm³',C.lime]])}},
readings(s,p){if(p.mode==='area'){const k=this.count(p);return[['Squares counted',k.full+k.half,''],['Estimated area',k.est.toFixed(2),'cm²'],['True area',k.true.toFixed(2),'cm²'],['Error',((k.est-k.true)/k.true*100).toFixed(1),'%']]}return[['V₁',50,'mL'],['V₂',50+(p.in?p.st:0),'mL'],['Stone volume',p.in?p.st:0,'cm³']]},
columns:['Mode','Object','Setting','Result','True / note'],
record(s,p){if(p.mode==='area'){const k=this.count(p);return['Area','Leaf '+(p.leaf===1?'A':'B'),p.g+' cm grid',+k.est.toFixed(2)+' cm²',+k.true.toFixed(2)+' cm²']}if(!p.in)return{error:'Lower the stone into the water first.'};return['Volume',{12:'Small',18:'Medium',27:'Large'}[p.st]+' stone','V₁ = 50 mL',p.st+' cm³','V₂ − V₁']},
result(rows){return'Counting squares gives a good estimate, which improves with a finer grid. Volume of an irregular solid = rise in water level (1 mL = 1 cm³).'}};

window.LabParts=(window.LabParts||0)+1;
(window.LabExtra=window.LabExtra||[]).push({order:['dimensions','unitConvert','irregularArea','instruments'],
syl:{6:[['Units & prefixes','unitConvert'],['Area of irregular shapes; volume by displacement','irregularArea']],7:[['Measuring area & volume','irregularArea']],9:[['Physical quantities & units','dimensions'],['Unit conversion','unitConvert']],
10:[['Optical instruments','instruments']],11:[['Physical quantities, SI units & dimensions','dimensions'],['Unit conversion & practical units','unitConvert']],12:[['Microscope & telescope','instruments']]}});
})();


/* 2849d1f7-f4f9-5764-a435-e9e0438170e2 */
(function(){
const K=window.LabKit;const {W,H,R,C,T,L,P,RR,G,ball,head,arc,room,watch,cl,avg,hint}=K;
const S=window.LabSims;const bg=c=>room(c,false);
const lin=pts=>{const n=pts.length,sx=pts.reduce((a,p)=>a+p[0],0),sy=pts.reduce((a,p)=>a+p[1],0),sxx=pts.reduce((a,p)=>a+p[0]*p[0],0),sxy=pts.reduce((a,p)=>a+p[0]*p[1],0),d=n*sxx-sx*sx;if(n<2||Math.abs(d)<1e-12)return null;const b=(n*sxy-sx*sy)/d;return{b,a:(sy-b*sx)/n}};
const box=(c,x,y,w,h,title)=>{RR(c,x,y,w,h,10,'rgba(10,12,16,0.75)','rgba(255,255,255,0.12)',1);if(title)T(c,title,x+12,y+22,{s:14,w:600,c:C.dim})};
const arrow=(c,x1,y1,x2,y2,col,w)=>{if(Math.hypot(x2-x1,y2-y1)<2)return;L(c,x1,y1,x2,y2,col,w||3);head(c,x2,y2,Math.atan2(y2-y1,x2-x1),col,14)};
const info=(c,x,y,w,rows)=>{box(c,x,y,w,26+rows.length*36,'');rows.forEach(([a,b,col],i)=>{T(c,a,x+18,y+38+i*36,{s:17,c:C.dim});T(c,b,x+w-16,y+38+i*36,{a:'right',s:20,w:700,m:1,c:col||C.ink})})};
const z=v=>Math.abs(v)<5e-4?0:v;
const blk=(c,x,y,w,h,lab)=>{RR(c,x,y,w,h,6,G(c,0,y,0,y+h,['#ffcf7a','#b9741f']),'rgba(0,0,0,0.4)',1.5);if(lab)T(c,lab,x+w/2,y+h/2+7,{a:'center',s:17,w:800,c:'#1d1305'})};

/* 1 ─ Vector addition & subtraction */
S.vectorAdd={title:'Vectors — Triangle & Parallelogram Laws, Subtraction, Components',topic:'math',grades:[9,11],
aim:'Add two vectors by the triangle and parallelogram laws, find the resultant’s magnitude and direction, subtract vectors, and resolve vectors into components.',
apparatus:['Two vectors A and B (displacements / forces)','Protractor & scale on grid'],
formula:'R = √(A² + B² + 2AB cos θ)      tan α = B sin θ / (A + B cos θ)  (angle of R with A)      |A − B| = √(A² + B² − 2AB cos θ)      Rmax = A + B (θ = 0°),  Rmin = |A − B| (θ = 180°)      Components: Ax = A cos φ, Ay = A sin φ;  R = (Ax + Bx) î + (Ay + By) ĵ',
procedure:['Set the magnitudes of A and B and the angle θ between them.','Choose triangle, parallelogram or subtraction.','Read R and its direction α; check by adding components.','Record for θ = 0°, 60°, 90°, 120°, 180°.','Note the largest and smallest possible resultants.'],
controls:[{k:'A',label:'|A|',type:'range',min:1,max:10,step:1,def:6,unit:''},{k:'B',label:'|B|',type:'range',min:1,max:10,step:1,def:4,unit:''},{k:'th',label:'Angle θ between A and B',type:'range',min:0,max:180,step:15,def:60,unit:'°'},{k:'mode',label:'Method',type:'select',def:'par',options:[['tri','Triangle law (A + B)'],['par','Parallelogram law (A + B)'],['sub','Subtraction (A − B)']]}],
init(){return{}},
calc(p){const t=p.th*R,sg=p.mode==='sub'?-1:1,rx=p.A+sg*p.B*Math.cos(t),ry=sg*p.B*Math.sin(t),Rm=Math.hypot(rx,ry);return{rx,ry,Rm,al:Math.atan2(ry,rx)/R}},
draw(c,s,p){bg(c);const k=this.calc(p),ox=200,oy=380,sc=34,t=p.th*R;for(let i=0;i<=26;i++){L(c,40+i*34,40,40+i*34,520,'rgba(255,255,255,0.04)',1)}for(let j=0;j<=14;j++)L(c,40,40+j*34,924,40+j*34,'rgba(255,255,255,0.04)',1);
const Ax=ox+p.A*sc,Ay=oy,bx=p.B*Math.cos(t)*sc,by=-p.B*Math.sin(t)*sc;arrow(c,ox,oy,Ax,Ay,C.amber,4);T(c,'A',(ox+Ax)/2,oy+26,{a:'center',s:20,w:800,c:C.amber});
if(p.mode==='tri'){arrow(c,Ax,Ay,Ax+bx,Ay+by,C.cyan,4);T(c,'B',Ax+bx/2+16,Ay+by/2,{s:20,w:800,c:C.cyan})}
else if(p.mode==='par'){arrow(c,ox,oy,ox+bx,oy+by,C.cyan,4);T(c,'B',ox+bx/2-24,oy+by/2,{s:20,w:800,c:C.cyan});L(c,Ax,Ay,Ax+bx,Ay+by,'rgba(79,214,255,0.4)',2,[6,5]);L(c,ox+bx,oy+by,Ax+bx,Ay+by,'rgba(255,181,71,0.4)',2,[6,5])}
else{arrow(c,ox,oy,ox+bx,oy+by,'rgba(79,214,255,0.5)',3);arrow(c,Ax,Ay,Ax-bx,Ay-by,C.cyan,4);T(c,'−B',Ax-bx/2+16,Ay-by/2,{s:20,w:800,c:C.cyan})}
arrow(c,ox,oy,ox+k.rx*sc,oy-k.ry*sc,C.lime,5);T(c,p.mode==='sub'?'A − B':'R',ox+k.rx*sc/2-10,oy-k.ry*sc/2-14,{a:'right',s:20,w:800,c:C.lime});arc(c,ox,oy,50,-t,0,C.rose,2);
info(c,620,40,350,[['|R|',k.Rm.toFixed(3),C.lime],['Direction α (with A)',k.al.toFixed(1)+'°',C.lime],['Rx = Ax + Bx',k.rx.toFixed(2),C.ink],['Ry = Ay + By',k.ry.toFixed(2),C.ink],['Rmax / Rmin',(p.A+p.B)+' / '+Math.abs(p.A-p.B),C.dim]]);},
readings(s,p){const k=this.calc(p);return[['|R|',k.Rm.toFixed(3),''],['α',k.al.toFixed(1),'°'],['Rx',k.rx.toFixed(2),''],['Ry',k.ry.toFixed(2),'']]},
columns:['Method','A','B','θ (°)','|R|','α (°)'],
record(s,p){const k=this.calc(p);return[{tri:'Triangle',par:'Parallelogram',sub:'A − B'}[p.mode],p.A,p.B,p.th,+k.Rm.toFixed(3),+k.al.toFixed(1)]},
plot:{x:3,y:4,fit:false},
result(rows){return'R = √(A² + B² + 2AB cos θ): largest (A + B) at 0°, smallest |A − B| at 180°. Triangle and parallelogram laws give the same resultant; A − B = A + (−B).'}};

/* 2 ─ Dot, cross & triple products */
S.vectorProducts={title:'Vector Products — Dot, Cross & Scalar Triple Product',topic:'math',grades:[11],
aim:'Find the dot product (work = F·s) and cross product (torque, area) of two vectors as the angle between them changes; find the direction of A × B by the right-hand screw rule; and get the volume of a parallelepiped from the scalar triple product.',
apparatus:['Vectors A and B in the xy-plane','Vector C with a z-component (triple product)','Right-hand screw'],
formula:'A · B = AB cos θ  (scalar; zero when ⟂)      |A × B| = AB sin θ = area of parallelogram  (vector ⟂ to both; zero when ∥)      B × A = − A × B      A · (B × C) = volume of parallelepiped (zero if coplanar)      Work W = F · s,  torque τ = r × F,  L = r × p',
procedure:['Set |A|, |B| and the angle θ.','Read A · B and |A × B|; note when each is maximum or zero.','Choose “A × B” or “B × A” — the direction (out of / into the page) reverses.','Mode 3: set the height of C and read the triple-product volume.','Record and plot A·B and |A×B| against θ.'],
controls:[{k:'A',label:'|A|',type:'range',min:1,max:8,step:1,def:5,unit:''},{k:'B',label:'|B|',type:'range',min:1,max:8,step:1,def:4,unit:''},{k:'th',label:'Angle θ',type:'range',min:0,max:180,step:15,def:60,unit:'°'},{k:'mode',label:'Show',type:'select',def:'dot',options:[['dot','Dot product A · B'],['ab','Cross product A × B'],['ba','Cross product B × A'],['tri','Scalar triple product']]},{k:'cz',label:'Height of C (triple)',type:'range',min:0,max:6,step:1,def:3,unit:''}],
init(){return{}},
draw(c,s,p){bg(c);const t=p.th*R,ox=260,oy=360,sc=32,ax=p.A*sc,bx=p.B*Math.cos(t)*sc,by=-p.B*Math.sin(t)*sc,dot=p.A*p.B*Math.cos(t),crs=p.A*p.B*Math.sin(t);
if(p.mode==='dot'){L(c,ox+bx,oy+by,ox+bx,oy,'rgba(255,255,255,0.4)',1.5,[5,4]);L(c,ox,oy+8,ox+bx,oy+8,C.lime,5);T(c,'B cos θ',ox+bx/2,oy+32,{a:'center',s:16,w:700,c:C.lime})}
if(p.mode!=='dot'){P(c,[[ox,oy],[ox+ax,oy],[ox+ax+bx,oy+by],[ox+bx,oy+by]],'rgba(177,140,255,0.22)','rgba(177,140,255,0.6)',1.5);T(c,'area = |A × B|',ox+(ax+bx)/2,oy+by/2,{a:'center',s:16,w:700,c:C.violet})}
arrow(c,ox,oy,ox+ax,oy,C.amber,4);T(c,'A',ox+ax+12,oy+6,{s:20,w:800,c:C.amber});arrow(c,ox,oy,ox+bx,oy+by,C.cyan,4);T(c,'B',ox+bx-10,oy+by-12,{s:20,w:800,c:C.cyan});arc(c,ox,oy,40,-t,0,C.rose,2);T(c,'θ',ox+48,oy-12,{s:17,w:700,c:C.rose});
if(p.mode==='ab'||p.mode==='ba'){const sg=(p.mode==='ab'?1:-1)*Math.sign(crs||1);c.beginPath();c.arc(ox,oy,16,0,7);c.strokeStyle=C.lime;c.lineWidth=3;c.stroke();if(sg>0){c.beginPath();c.arc(ox,oy,4,0,7);c.fillStyle=C.lime;c.fill()}else{L(c,ox-10,oy-10,ox+10,oy+10,C.lime,3);L(c,ox-10,oy+10,ox+10,oy-10,C.lime,3)}T(c,sg>0?'⊙ out of the page (+z)':'⊗ into the page (−z)',ox,oy+60,{a:'center',s:18,w:700,c:C.lime})}
const vol=Math.abs(crs*p.cz);if(p.mode==='tri'){const czp=p.cz*26;arrow(c,ox,oy,ox-czp*0.6,oy-czp,C.rose,4);T(c,'C',ox-czp*0.6-16,oy-czp,{s:20,w:800,c:C.rose});P(c,[[ox-czp*0.6,oy-czp],[ox+ax-czp*0.6,oy-czp],[ox+ax+bx-czp*0.6,oy+by-czp],[ox+bx-czp*0.6,oy+by-czp]],'rgba(255,107,154,0.12)','rgba(255,107,154,0.5)',1.5)}
info(c,620,40,350,[['A · B = AB cos θ',z(dot).toFixed(2),C.lime],['|A × B| = AB sin θ',z(crs).toFixed(2),C.violet],['Direction of A × B',Math.abs(crs)<1e-9?'— (parallel)':'+z (⊙)',C.ink],['A·(B×C) volume',vol.toFixed(2),C.rose]]);
const gx=640,gy=480,gw=320,gh=90;box(c,620,250,350,260,'A·B (lime) and |A×B| (violet) vs θ');L(c,gx,gy-gh,gx+gw,gy-gh,'rgba(255,255,255,0.2)',1);c.beginPath();for(let i=0;i<=180;i+=3){const X=gx+gw*i/180,Y=gy-gh-gh*Math.cos(i*R);i?c.lineTo(X,Y):c.moveTo(X,Y)}c.strokeStyle=C.lime;c.lineWidth=2.5;c.stroke();c.beginPath();for(let i=0;i<=180;i+=3){const X=gx+gw*i/180,Y=gy-gh-gh*Math.sin(i*R);i?c.lineTo(X,Y):c.moveTo(X,Y)}c.strokeStyle=C.violet;c.lineWidth=2.5;c.stroke();L(c,gx+gw*p.th/180,gy-2*gh-10,gx+gw*p.th/180,gy,'rgba(255,255,255,0.5)',1.5,[4,4]);},
readings(s,p){const t=p.th*R;return[['A · B',z(p.A*p.B*Math.cos(t)).toFixed(2),''],['|A × B|',z(p.A*p.B*Math.sin(t)).toFixed(2),''],['Triple product',Math.abs(p.A*p.B*Math.sin(t)*p.cz).toFixed(2),'']]},
columns:['θ (°)','A · B','|A × B|','Volume'],
record(s,p){const t=p.th*R;return[p.th,+z(p.A*p.B*Math.cos(t)).toFixed(2),+z(p.A*p.B*Math.sin(t)).toFixed(2),+Math.abs(p.A*p.B*Math.sin(t)*p.cz).toFixed(2)]},
plot:{x:0,y:1,fit:false},
result(rows){return'A·B is greatest at 0°, zero at 90°, negative beyond 90° (negative work). |A×B| is greatest at 90° and zero for parallel vectors. A × B = −B × A. The triple product gives the volume (zero if the vectors are coplanar).'}};

/* 3 ─ Lami's theorem & tangent law */
S.lami={title:"Equilibrium of Concurrent Forces — Lami's Theorem & Tangent Law",topic:'mech',grades:[11],
aim:'Hang a weight from two strings and measure the tensions; verify Lami’s theorem. Then push a hanging bob sideways with a horizontal force and verify the tangent law tan θ = F/W.',
apparatus:['Weight W on a knot','Two strings with spring balances at adjustable angles','Horizontal force gauge (tangent law)'],
formula:"Lami: T₁ / sin α = T₂ / sin β = W / sin γ   (each force over the sine of the angle between the OTHER two)      Equilibrium: vector sum of forces = 0 (closed triangle)      Tangent law: tan θ = F / W,  T = √(W² + F²)",
procedure:['Choose Lami’s theorem or the tangent law.','Set the weight and the string angles (or the horizontal force).','Read the tensions on the spring balances.','Record and check that each T / sin(opposite angle) is the same.','Check the force triangle closes.'],
controls:[{k:'mode',label:'Experiment',type:'select',def:'lami',options:[['lami',"Lami's theorem (two strings)"],['tan','Tangent law (horizontal push)']]},{k:'W',label:'Weight W',type:'range',min:10,max:100,step:10,def:50,unit:'N'},{k:'a1',label:'String 1 angle from vertical',type:'range',min:10,max:80,step:5,def:30,unit:'°'},{k:'a2',label:'String 2 angle from vertical',type:'range',min:10,max:80,step:5,def:60,unit:'°'},{k:'F',label:'Horizontal force F (tangent)',type:'range',min:0,max:100,step:5,def:30,unit:'N'}],
init(){return{}},
calc(p){if(p.mode==='tan'){const th=Math.atan2(p.F,p.W);return{th:th/R,T:Math.hypot(p.W,p.F)}}const a=p.a1*R,b=p.a2*R,den=Math.sin(a+b),T1=p.W*Math.sin(b)/den,T2=p.W*Math.sin(a)/den;const al=180-p.a2,be=180-p.a1,ga=p.a1+p.a2;return{T1,T2,al,be,ga}},
draw(c,s,p){bg(c);const k=this.calc(p);L(c,60,60,620,60,'#8792a3',6);
if(p.mode==='lami'){const kx=360,ky=300,a=p.a1*R,b=p.a2*R;const L1=(ky-60)/Math.cos(a),L2=(ky-60)/Math.cos(b);L(c,kx,ky,kx-Math.sin(a)*L1,60,'#cfd6df',2.5);L(c,kx,ky,kx+Math.sin(b)*L2,60,'#cfd6df',2.5);L(c,kx,ky,kx,ky+80,'#cfd6df',2.5);blk(c,kx-35,ky+80,70,60,p.W+' N');c.beginPath();c.arc(kx,ky,7,0,7);c.fillStyle='#fff';c.fill();
const sc=2.2;arrow(c,kx,ky,kx-Math.sin(a)*k.T1*sc,ky-Math.cos(a)*k.T1*sc,C.amber,3.5);arrow(c,kx,ky,kx+Math.sin(b)*k.T2*sc,ky-Math.cos(b)*k.T2*sc,C.cyan,3.5);T(c,'T₁ = '+k.T1.toFixed(1)+' N',kx-Math.sin(a)*k.T1*sc-10,ky-Math.cos(a)*k.T1*sc-10,{a:'right',s:17,w:700,c:C.amber});T(c,'T₂ = '+k.T2.toFixed(1)+' N',kx+Math.sin(b)*k.T2*sc+10,ky-Math.cos(b)*k.T2*sc-10,{s:17,w:700,c:C.cyan});
arc(c,kx,ky,40,-Math.PI/2-a,-Math.PI/2,C.rose,1.5);arc(c,kx,ky,48,-Math.PI/2,-Math.PI/2+b,C.rose,1.5);
const ox=780,oy=420,ts=1.6;P(c,[[ox,oy],[ox,oy-p.W*ts],[ox+Math.sin(b)*k.T2*ts,oy-p.W*ts+Math.cos(b)*k.T2*ts]],'rgba(182,243,92,0.12)',null);arrow(c,ox,oy,ox,oy-p.W*ts,C.violet,3);arrow(c,ox,oy-p.W*ts,ox+Math.sin(b)*k.T2*ts*-1*-1-Math.sin(b)*k.T2*ts*0,oy-p.W*ts+Math.cos(b)*k.T2*ts,C.cyan,3);arrow(c,ox+Math.sin(b)*k.T2*ts,oy-p.W*ts+Math.cos(b)*k.T2*ts,ox,oy,C.amber,3);T(c,'force triangle closes',ox,oy+26,{a:'center',s:15,c:C.dim});
info(c,640,40,330,[['T₁ / sin α',(k.T1/Math.sin(k.al*R)).toFixed(2),C.amber],['T₂ / sin β',(k.T2/Math.sin(k.be*R)).toFixed(2),C.cyan],['W / sin γ',(p.W/Math.sin(k.ga*R)).toFixed(2),C.violet]])}
else{const px=340,Lp=260,th=k.th*R,bx=px+Math.sin(th)*Lp,by=60+Math.cos(th)*Lp;L(c,px,60,bx,by,'#cfd6df',2.5);L(c,px,60,px,60+Lp+30,'rgba(255,255,255,0.2)',1,[4,4]);ball(c,bx,by,20,'#ffd08a','#a8661c');arc(c,px,60,60,Math.PI/2-th,Math.PI/2,C.rose,2);T(c,'θ',px+16,140,{s:18,w:700,c:C.rose});
arrow(c,bx,by,bx,by+p.W*1.6,C.violet,3.5);T(c,'W',bx+10,by+p.W*1.6,{s:17,w:700,c:C.violet});if(p.F)arrow(c,bx,by,bx+p.F*1.6,by,C.lime,3.5);T(c,'F',bx+p.F*1.6+8,by+6,{s:17,w:700,c:C.lime});arrow(c,bx,by,bx-Math.sin(th)*k.T*1.6,by-Math.cos(th)*k.T*1.6,C.amber,3.5);T(c,'T',bx-Math.sin(th)*k.T*1.6-16,by-Math.cos(th)*k.T*1.6,{s:17,w:700,c:C.amber});
info(c,640,40,330,[['θ',k.th.toFixed(1)+'°',C.rose],['tan θ',Math.tan(k.th*R).toFixed(3),C.lime],['F / W',(p.F/p.W).toFixed(3),C.lime],['T = √(W² + F²)',k.T.toFixed(2)+' N',C.amber]])}},
readings(s,p){const k=this.calc(p);return p.mode==='lami'?[['T₁',k.T1.toFixed(2),'N'],['T₂',k.T2.toFixed(2),'N'],['α, β, γ',k.al+'°, '+k.be+'°, '+k.ga+'°','']]:[['θ',k.th.toFixed(1),'°'],['tan θ',Math.tan(k.th*R).toFixed(3),''],['Tension',k.T.toFixed(2),'N']]},
columns:['Mode','W (N)','Angles / F','T₁ or θ','T₂ or T','Lami ratio / tan θ'],
record(s,p){const k=this.calc(p);return p.mode==='lami'?['Lami',p.W,p.a1+'°, '+p.a2+'°',+k.T1.toFixed(2),+k.T2.toFixed(2),+(p.W/Math.sin(k.ga*R)).toFixed(2)]:['Tangent',p.W,'F = '+p.F,+k.th.toFixed(1),+k.T.toFixed(2),+Math.tan(k.th*R).toFixed(3)]},
result(rows){return'Lami: T₁/sin α = T₂/sin β = W/sin γ in every reading (three concurrent forces in equilibrium). Tangent law: tan θ = F/W. The string at the steeper angle carries more tension.'}};

/* 4 ─ Waves */
S.waveMotion={title:'Wave Motion — Transverse & Longitudinal Waves, v = fλ',topic:'sound',grades:[8,9,11],
aim:'Watch particles of a medium as a wave passes: they only oscillate about their mean positions while energy travels. Compare transverse and longitudinal waves and verify v = f λ.',
apparatus:['Row of particles connected by springs (medium)','Vibrator of adjustable frequency','Scale and stopwatch'],
formula:'v = f λ      f = 1/T      Transverse: particles vibrate ⟂ to wave direction (crests & troughs) — e.g. string, light      Longitudinal: particles vibrate ∥ to wave direction (compressions & rarefactions) — e.g. sound      The medium does not travel with the wave; energy does',
procedure:['Choose the type of wave.','Set the frequency f and the wave speed v (medium).','Measure the wavelength λ (crest to crest or compression to compression).','Record f, λ and v; check v = f λ.','Watch the red particle: it only moves to and fro.'],
controls:[{k:'type',label:'Wave type',type:'select',def:'t',options:[['t','Transverse'],['l','Longitudinal']]},{k:'f',label:'Frequency f',type:'range',min:0.5,max:3,step:0.25,def:1,unit:'Hz'},{k:'v',label:'Wave speed v (medium)',type:'range',min:100,max:400,step:50,def:200,unit:'px/s'},{k:'A',label:'Amplitude',type:'range',min:10,max:50,step:5,def:30,unit:'px'}],
init(){return{t:0}},step(s,p,dt){s.t+=dt},
draw(c,s,p){bg(c);const lam=p.v/p.f,k=2*Math.PI/lam,w=2*Math.PI*p.f,y0=260,n=44;const ys=[];for(let i=0;i<n;i++){const x0=60+i*20,ph=k*(x0-60)-w*s.t;const dx=p.type==='l'?p.A*0.6*Math.sin(ph):0,dy=p.type==='t'?-p.A*Math.sin(ph):0;ys.push([x0+dx,y0+dy])}
if(p.type==='t'){c.beginPath();ys.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle='rgba(79,214,255,0.4)';c.lineWidth=2;c.stroke()}
ys.forEach(([x,y],i)=>{if(p.type==='l')L(c,x,y0-50,x,y0+50,i===10?'rgba(255,90,90,0.9)':'rgba(79,214,255,0.55)',i===10?4:3);else{c.beginPath();c.arc(x,y,i===10?9:6,0,7);c.fillStyle=i===10?'#ff5a5a':C.cyan;c.fill()}});
const lx=60+lam;if(lx<940){L(c,60,y0+110,lx,y0+110,C.amber,3);head(c,lx,y0+110,0,C.amber,12);head(c,60,y0+110,Math.PI,C.amber,12);T(c,'λ = '+lam.toFixed(0)+' px',60+lam/2,y0+136,{a:'center',s:18,w:700,m:1,c:C.amber})}
arrow(c,700,90,860,90,C.lime,4);T(c,'wave (energy) travels',780,74,{a:'center',s:16,w:700,c:C.lime});T(c,p.type==='t'?'red particle moves up–down ⟂':'red particle moves to–fro ∥',260,80,{a:'center',s:18,w:700,c:'#ff8a8a'});
if(p.type==='l')T(c,'compressions (close) · rarefactions (spread)',500,y0+180,{a:'center',s:16,c:C.dim});
info(c,640,400,330,[['f',p.f+' Hz',C.ink],['λ',lam.toFixed(0)+' px',C.amber],['f × λ',(p.f*lam).toFixed(0)+' px/s',C.lime]]);},
readings(s,p){const lam=p.v/p.f;return[['Wavelength λ',lam.toFixed(1),'px'],['Period T',(1/p.f).toFixed(2),'s'],['f λ',(p.f*lam).toFixed(0),'px/s'],['Wave speed v',p.v,'px/s']]},
columns:['Type','f (Hz)','λ (px)','T (s)','f λ (px/s)'],
record(s,p){const lam=p.v/p.f;return[p.type==='t'?'Transverse':'Longitudinal',p.f,+lam.toFixed(1),+(1/p.f).toFixed(2),+(p.f*lam).toFixed(0)]},
plot:{x:1,y:2,fit:false},
result(rows){return'f × λ equals the wave speed in every reading: in a given medium, doubling f halves λ. Particles oscillate in place — only energy moves along.'}};

/* 5 ─ Work done */
S.workDone={title:'Work Done — Positive, Zero & Negative; Work–Energy Theorem',topic:'mech',grades:[9,11],
aim:'Pull a block with a force at an angle and find the work done W = F s cos θ; see when work is positive, zero or negative; find the work done against gravity; and verify that net work equals the change in kinetic energy.',
apparatus:['Block (m = 2 kg) on a floor','Force at adjustable angle','Friction surface','Metre scale'],
formula:'W = F · s = F s cos θ  (joule)      θ < 90°: positive · θ = 90°: zero · θ > 90°: negative      Lifting: W = m g h      Work–energy theorem: W_net = ΔKE = ½ m v² − ½ m u²      1 J = 10⁷ erg',
procedure:['Set the force F, its angle θ with the motion and the distance s.','Read the work done by F, by friction and by gravity.','Record for θ = 0°, 60°, 90°, 120°, 180°.','Turn on friction: W_net = W_F − W_friction; compare with the KE gained.','Mode “lift”: work against gravity = mgh, independent of the path.'],
controls:[{k:'mode',label:'Situation',type:'select',def:'pull',options:[['pull','Pull a block along the floor'],['lift','Lift a load (against gravity)']]},{k:'F',label:'Force F',type:'range',min:0,max:40,step:2,def:20,unit:'N'},{k:'th',label:'Angle of F with motion θ',type:'range',min:0,max:180,step:15,def:30,unit:'°'},{k:'s',label:'Distance s / height h',type:'range',min:1,max:10,step:1,def:5,unit:'m'},{k:'mu',label:'Friction μ',type:'select',def:0,options:[[0,'None'],[0.1,'0.1'],[0.2,'0.2']]}],
init(){return{}},
calc(p){const m=2,g=9.8;if(p.mode==='lift')return{WF:m*g*p.s,Wg:-m*g*p.s,Wf:0,net:0,v:0};const th=p.th*R,N=Math.max(0,m*g-p.F*Math.sin(th)),WF=p.F*p.s*Math.cos(th),Wf=-p.mu*N*p.s,net=WF+Wf;return{WF,Wf,Wg:0,net,v:net>0?Math.sqrt(2*net/m):0,N}},
draw(c,s,p){bg(c);const k=this.calc(p);
if(p.mode==='pull'){const y=330;L(c,40,y,960,y,'rgba(255,255,255,0.35)',2);const x0=120,sc=70,x1=x0+p.s*sc;c.save();c.globalAlpha=0.35;blk(c,x0,y-60,80,60);c.restore();blk(c,x1,y-60,80,60,'2 kg');L(c,x0+40,y+30,x1+40,y+30,C.cyan,2);head(c,x1+40,y+30,0,C.cyan,12);T(c,'s = '+p.s+' m',(x0+x1)/2+40,y+56,{a:'center',s:18,w:700,c:C.cyan});
const th=p.th*R;arrow(c,x1+40,y-30,x1+40+Math.cos(th)*p.F*4,y-30-Math.sin(th)*p.F*4,C.rose,4);T(c,'F',x1+44+Math.cos(th)*p.F*4,y-36-Math.sin(th)*p.F*4,{s:18,w:800,c:C.rose});arc(c,x1+40,y-30,30,-th,0,C.amber,2);T(c,'θ',x1+80,y-34,{s:16,w:700,c:C.amber});
T(c,Math.abs(p.th-90)<1e-9?'ZERO work (F ⟂ motion)':p.th<90?'POSITIVE work':'NEGATIVE work (F opposes motion)',500,120,{a:'center',s:24,w:800,c:Math.abs(p.th-90)<1e-9?C.dim:p.th<90?C.lime:C.rose})}
else{const bx=300,sc=36;L(c,200,470,500,470,'rgba(255,255,255,0.35)',2);blk(c,bx,470-p.s*sc-50,80,50,'2 kg');L(c,bx+40,470,bx+40,470-p.s*sc,C.cyan,2);T(c,'h = '+p.s+' m',bx+100,470-p.s*sc/2,{s:18,w:700,c:C.cyan});arrow(c,bx+40,470-p.s*sc-60,bx+40,470-p.s*sc-120,C.rose,4);T(c,'F = mg',bx+50,470-p.s*sc-110,{s:17,w:700,c:C.rose})}
info(c,600,190,370,p.mode==='pull'?[['W by F = Fs cos θ',k.WF.toFixed(1)+' J',C.lime],['W by friction',k.Wf.toFixed(1)+' J',C.rose],['W_net',k.net.toFixed(1)+' J',C.amber],['ΔKE = ½mv²',(k.net>0?k.net:0).toFixed(1)+' J',C.cyan],['Final speed v',k.v.toFixed(2)+' m/s',C.cyan]]:[['Work by lifter = mgh',k.WF.toFixed(1)+' J',C.lime],['Work by gravity',k.Wg.toFixed(1)+' J',C.rose],['PE gained',k.WF.toFixed(1)+' J',C.amber]]);},
readings(s,p){const k=this.calc(p);return[['Work by F',k.WF.toFixed(1),'J'],['Work by friction',k.Wf.toFixed(1),'J'],['Net work',(p.mode==='lift'?0:k.net).toFixed(1),'J'],['In erg',(k.WF*1e7).toExponential(2),'erg']]},
columns:['Mode','F (N)','θ (°)','s (m)','W_F (J)','W_net (J)'],
record(s,p){const k=this.calc(p);return[p.mode==='pull'?'Pull':'Lift',p.mode==='lift'?19.6:p.F,p.mode==='lift'?0:p.th,p.s,+k.WF.toFixed(1),p.mode==='lift'?0:+k.net.toFixed(1)]},
plot:{x:2,y:4,fit:false},
result(rows){return'W = Fs cos θ: positive for θ < 90°, zero at 90° (e.g. a coolie walking with a load, centripetal force), negative beyond 90° (friction, braking). Net work = change in kinetic energy.'}};

/* 6 ─ Power */
S.powerLift={title:'Power — Climbing Stairs & Lifting Loads',topic:'mech',grades:[9,11],
aim:'Measure your power by running up stairs (P = mgh/t), compare a slow and a fast lift, use P = F v for a moving vehicle, and convert between watt, horse power and kilowatt-hour.',
apparatus:['Staircase (height h)','Stopwatch','Bathroom scale (mass m)','Motor lifting a load at constant speed'],
formula:'P = W / t = m g h / t      P = F v  (constant velocity)      1 W = 1 J/s      1 hp = 746 W      Energy (kWh) = P (kW) × t (h);  1 kWh = 3.6 × 10⁶ J',
procedure:['Set your mass, the stair height and your time.','Tap “Climb” and read the power in W and hp.','Record and compare walking and running (same work, different power).','Mode “motor”: set force and speed; P = F v.','Find the energy (kWh) used if the motor runs for the given hours.'],
controls:[{k:'mode',label:'Situation',type:'select',def:'stairs',options:[['stairs','Running up stairs'],['motor','Motor / vehicle (P = F v)']]},{k:'m',label:'Mass m',type:'range',min:30,max:90,step:5,def:50,unit:'kg'},{k:'h',label:'Stair height h',type:'range',min:2,max:12,step:1,def:6,unit:'m'},{k:'t',label:'Time taken t',type:'range',min:2,max:30,step:1,def:8,unit:'s'},{k:'F',label:'Force F (motor)',type:'range',min:100,max:2000,step:100,def:1000,unit:'N'},{k:'v',label:'Speed v (motor)',type:'range',min:1,max:30,step:1,def:10,unit:'m/s'},{k:'hrs',label:'Running time (motor)',type:'range',min:1,max:10,step:1,def:2,unit:'h'}],
actions:[{label:'Climb',run(s){Object.assign(s,{tt:0,run:true})}}],
init(){return{tt:0,run:false}},onChange(s){Object.assign(s,{tt:0,run:false})},step(s,p,dt){if(s.run){s.tt+=dt*Math.max(1,p.t/5);if(s.tt>=p.t){s.tt=p.t;s.run=false}}},
P(p){return p.mode==='stairs'?p.m*9.8*p.h/p.t:p.F*p.v},
draw(c,s,p){bg(c);const Pw=this.P(p);
if(p.mode==='stairs'){const n=10,sw=40,sh=34*p.h/12*1.0+10,ox=120,oy=480;for(let i=0;i<n;i++){RR(c,ox+i*sw,oy-(i+1)*sh,sw,(i+1)*sh,0,'rgba(255,255,255,0.08)','rgba(255,255,255,0.2)',1)}const f=s.tt/p.t,i=Math.min(n-1,Math.floor(f*n));ball(c,ox+i*sw+20,oy-(i+1)*sh-18,14,'#9ab8ff','#1e4fb3');T(c,'h = '+p.h+' m',ox+n*sw+20,oy-n*sh/2,{s:18,w:700,c:C.cyan});watch(c,780,120,60,s.tt)}
else{const ty=380;L(c,40,ty+40,960,ty+40,'rgba(255,255,255,0.3)',2);RR(c,200,ty-30,200,70,12,G(c,0,ty-30,0,ty+40,['#ff8aa8','#b52a52']));arrow(c,410,ty,410+p.F/20,ty,C.rose,4);T(c,'F = '+p.F+' N',410+p.F/20+10,ty+6,{s:17,w:700,c:C.rose});arrow(c,300,ty-60,300+p.v*8,ty-60,C.cyan,4);T(c,'v = '+p.v+' m/s',300,ty-74,{a:'center',s:17,w:700,c:C.cyan})}
info(c,560,240,410,p.mode==='stairs'?[['Work = mgh',(p.m*9.8*p.h).toFixed(0)+' J',C.ink],['Power = mgh/t',Pw.toFixed(1)+' W',C.lime],['In horse power',(Pw/746).toFixed(3)+' hp',C.amber]]:[['Power = F v',(Pw/1000).toFixed(2)+' kW',C.lime],['In horse power',(Pw/746).toFixed(1)+' hp',C.amber],['Energy in '+p.hrs+' h',(Pw/1000*p.hrs).toFixed(1)+' kWh',C.cyan],['= joules',(Pw*p.hrs*3600).toExponential(2)+' J',C.dim]]);if(p.mode==='stairs'&&!s.tt)hint(c,'Tap “Climb”');},
readings(s,p){const Pw=this.P(p);return[['Power',Pw.toFixed(1),'W'],['Horse power',(Pw/746).toFixed(3),'hp'],['Work done',p.mode==='stairs'?(p.m*9.8*p.h).toFixed(0):(Pw*p.hrs*3600).toExponential(2),'J']]},
columns:['Mode','m or F','h or v','t (s)','P (W)','P (hp)'],
record(s,p){const Pw=this.P(p);if(p.mode==='stairs'&&s.tt<p.t)return{error:'Tap “Climb” and let the climb finish.'};return[p.mode==='stairs'?'Stairs':'Motor',p.mode==='stairs'?p.m:p.F,p.mode==='stairs'?p.h:p.v,p.mode==='stairs'?p.t:'—',+Pw.toFixed(1),+(Pw/746).toFixed(3)]},
plot:{x:3,y:4,fit:false},
result(rows){return'Same work done faster means more power (P ∝ 1/t). For a vehicle at steady speed P = F v. 1 hp = 746 W; electricity is billed in kWh = 3.6 MJ.'}};

/* 7 ─ Conservation of mechanical energy */
S.energyConservation={title:'Conservation of Mechanical Energy — Roller Track',topic:'mech',grades:[9,11],
aim:'Release a ball on a smooth track and watch kinetic and potential energy change while their sum stays constant; add friction and see the “lost” energy appear as heat.',
apparatus:['Curved track with height scale','Ball (m = 1 kg)','Energy meters for KE, PE and heat'],
formula:'KE = ½ m v²      PE = m g h      Without friction: KE + PE = constant  →  v = √(2 g (h₀ − h))      With friction: KE + PE + heat = constant      Total energy is always conserved; it only changes form',
procedure:['Set the release height h₀ and friction.','Tap “Release” and watch the energy bars.','Pause at several points; record h, v, KE, PE.','Check KE + PE = m g h₀ (no friction).','With friction the ball never regains its starting height; the difference is heat.'],
controls:[{k:'h0',label:'Release height h₀',type:'range',min:2,max:10,step:1,def:8,unit:'m'},{k:'mu',label:'Friction',type:'select',def:0,options:[[0,'None (smooth)'],[0.03,'Low'],[0.08,'High']]}],
actions:[{label:'Release',run(s,p){Object.assign(s,{x:-1,v:0,run:true,heat:0,t:0,dir:1})}},{label:'Pause / play',run(s){s.run=!s.run}}],
init(){return{x:-1,v:0,run:false,heat:0,t:0}},onChange(s){Object.assign(s,{x:-1,v:0,run:false,heat:0,t:0})},
hh(p,x){return p.h0*x*x},
step(s,p,dt){if(!s.run)return;const g=9.8,n=20,h=dt/n;if(s.dir==null)s.dir=1;for(let i=0;i<n;i++){const sl=2*p.h0*s.x/4,cs=1/Math.sqrt(1+sl*sl);let v2=2*(g*p.h0-g*this.hh(p,s.x)-s.heat);if(v2<=1e-6){s.dir=s.x>0?-1:1;v2=1e-4}const sp=Math.sqrt(v2);if(p.mu&&sp<0.05&&Math.abs(s.x)<0.02){s.v=0;s.run=false;break}s.v=s.dir*sp;s.heat+=p.mu*g*cs*sp*h;s.x+=s.v*h*cs/4}s.t+=dt},
draw(c,s,p){bg(c);const ox=340,oy=470,sx=240,sy=36,X=x=>ox+x*sx,Y=h=>oy-h*sy;c.beginPath();for(let i=-100;i<=100;i++){const x=i/100*1.05;i===-100?c.moveTo(X(x),Y(this.hh(p,x))):c.lineTo(X(x),Y(this.hh(p,x)))}c.strokeStyle='#cfd6df';c.lineWidth=5;c.stroke();
const h=this.hh(p,s.x);ball(c,X(s.x),Y(h)-14,14,'#ffd08a','#a8661c');L(c,40,Y(p.h0),640,Y(p.h0),'rgba(255,181,71,0.4)',1.5,[6,5]);T(c,'h₀ = '+p.h0+' m',44,Y(p.h0)-8,{s:15,c:C.amber});
const m=1,g=9.8,PE=m*g*h,KE=0.5*m*s.v*s.v,E0=m*g*p.h0,bx=700,bw=60,bh=360,top=100;[['KE',KE,C.lime],['PE',PE,C.cyan],['Heat',s.heat,C.rose],['Total',KE+PE+s.heat,C.amber]].forEach(([n,v,col],i)=>{const x=bx+i*68;RR(c,x,top,bw,bh,6,'rgba(255,255,255,0.05)');const hgt=cl(v/E0,0,1.05)*bh;RR(c,x,top+bh-hgt,bw,hgt,6,col);T(c,n,x+bw/2,top+bh+24,{a:'center',s:15,w:700,c:col});T(c,v.toFixed(0),x+bw/2,top+bh-hgt-8,{a:'center',s:14,m:1,c:col})});
T(c,'Energy (J)',bx+130,80,{a:'center',s:16,w:700,c:C.dim});if(!s.run&&s.x===-1)hint(c,'Tap “Release”');},
readings(s,p){const h=this.hh(p,s.x),KE=0.5*s.v*s.v,PE=9.8*h;return[['Height h',h.toFixed(2),'m'],['Speed v',Math.abs(s.v).toFixed(2),'m/s'],['KE + PE',(KE+PE).toFixed(1),'J'],['Heat produced',s.heat.toFixed(1),'J']]},
columns:['h (m)','v (m/s)','KE (J)','PE (J)','KE + PE (J)','Heat (J)'],
record(s,p){if(s.x===-1&&!s.run)return{error:'Release the ball first.'};const h=this.hh(p,s.x),KE=0.5*s.v*s.v,PE=9.8*h;return[+h.toFixed(2),+Math.abs(s.v).toFixed(2),+KE.toFixed(1),+PE.toFixed(1),+(KE+PE).toFixed(1),+s.heat.toFixed(1)]},
plot:{x:0,y:2,fit:false},
result(rows){return'Without friction KE + PE stays equal to mgh₀ at every point (KE falls linearly as h rises). With friction KE + PE decreases, but KE + PE + heat is constant — energy is conserved.'}};

/* 8 ─ Energy transformations */
const DEV={bulb:['Electric bulb (LED)','Electrical',[['Light',40,'#ffd84a'],['Heat',60,'#ff6b6b']]],fil:['Filament bulb','Electrical',[['Light',8,'#ffd84a'],['Heat',92,'#ff6b6b']]],motor:['Electric motor / fan','Electrical',[['Mechanical (KE)',85,'#b6f35c'],['Heat',12,'#ff6b6b'],['Sound',3,'#b18cff']]],gen:['Generator / dynamo','Mechanical',[['Electrical',90,'#4fd6ff'],['Heat',10,'#ff6b6b']]],cell:['Battery / cell','Chemical',[['Electrical',90,'#4fd6ff'],['Heat',10,'#ff6b6b']]],solar:['Solar cell','Light',[['Electrical',20,'#4fd6ff'],['Heat',80,'#ff6b6b']]],spk:['Loudspeaker','Electrical',[['Sound',2,'#b18cff'],['Heat',98,'#ff6b6b']]],mic:['Microphone','Sound',[['Electrical',95,'#4fd6ff'],['Heat',5,'#ff6b6b']]],heat:['Electric heater / iron','Electrical',[['Heat',100,'#ff6b6b']]],car:['Car engine','Chemical (fuel)',[['Mechanical (KE)',25,'#b6f35c'],['Heat',70,'#ff6b6b'],['Sound',5,'#b18cff']]],plant:['Green plant','Light',[['Chemical (food)',3,'#7fd18a'],['Heat',97,'#ff6b6b']]],hydro:['Hydro power station','Potential (water)',[['Electrical',90,'#4fd6ff'],['Heat & sound',10,'#ff6b6b']]]};
S.energyForms={title:'Energy Transformations in Everyday Devices',topic:'heat',grades:[6,9],
aim:'Choose a device and see which form of energy goes in and which forms come out (energy flow diagram); find its efficiency and note that the total energy out always equals the energy in.',
apparatus:['Everyday devices: bulb, motor, generator, cell, solar cell, loudspeaker, microphone, heater, engine, plant, hydro plant'],
formula:'Energy can neither be created nor destroyed — only transformed      Energy in = sum of all energy out      Efficiency = useful energy out / energy in × 100 %      Forms: mechanical (KE, PE), heat, light, sound, electrical, chemical, nuclear',
procedure:['Choose a device and the input energy.','Read the energy flow: useful output and wasted output (mostly heat).','Record the efficiency.','Compare an LED with a filament bulb.','Check the outputs always add up to the input.'],
controls:[{k:'d',label:'Device',type:'select',def:'motor',options:Object.keys(DEV).map(k=>[k,DEV[k][0]])},{k:'E',label:'Energy in',type:'range',min:100,max:1000,step:100,def:500,unit:'J'}],
init(){return{t:0}},step(s,p,dt){s.t+=dt},
draw(c,s,p){bg(c);const [name,inp,outs]=DEV[p.d],x0=120,y0=280,tot=p.E,wIn=cl(tot/1000*140,30,140);RR(c,x0-90,y0-wIn/2,200,wIn,4,'rgba(255,181,71,0.75)');T(c,inp,x0-80,y0-wIn/2-12,{s:18,w:700,c:C.amber});T(c,tot+' J',x0+10,y0+7,{a:'center',s:18,w:800,m:1,c:'#1d1305'});
RR(c,330,y0-80,200,160,16,'rgba(10,12,16,0.85)','rgba(255,255,255,0.3)',2);T(c,name,430,y0+6,{a:'center',s:18,w:800});P(c,[[x0+110,y0-wIn/2],[330,y0-wIn/2],[330,y0+wIn/2],[x0+110,y0+wIn/2]],'rgba(255,181,71,0.5)');
let y=y0-wIn/2;outs.forEach(([n,pc,col],i)=>{const w=wIn*pc/100,ty=100+i*130;c.beginPath();c.moveTo(530,y);c.bezierCurveTo(640,y,620,ty,720,ty);c.lineTo(720,ty+Math.max(w,3));c.bezierCurveTo(620,ty+Math.max(w,3),640,y+w,530,y+w);c.closePath();c.fillStyle=col+'aa';c.fill();T(c,n+': '+(tot*pc/100).toFixed(0)+' J ('+pc+'%)',730,ty+Math.max(w,3)/2+6,{s:18,w:700,c:col});y+=w});
const use=outs[0];T(c,'Efficiency = '+use[1]+' %',430,y0+130,{a:'center',s:22,w:800,c:C.lime});T(c,'Energy out = '+tot+' J = energy in',430,y0+164,{a:'center',s:16,m:1,c:C.dim});},
readings(s,p){const [n,inp,outs]=DEV[p.d];return[['Input form',inp,''],['Useful output',outs[0][0],''],['Efficiency',outs[0][1],'%'],['Wasted',(100-outs[0][1]),'%']]},
columns:['Device','Input','Useful output','Efficiency (%)'],
record(s,p){const [n,inp,outs]=DEV[p.d];return[n,inp,outs[0][0],outs[0][1]]},
result(rows){return'Every device converts energy from one form to others; outputs always add up to the input. Most devices “waste” part as heat — an LED is far more efficient than a filament bulb.'}};

window.LabParts=(window.LabParts||0)+1;
(window.LabExtra=window.LabExtra||[]).push({order:['vectorAdd','vectorProducts','lami','waveMotion','workDone','powerLift','energyConservation','energyForms'],
syl:{6:[['Forms of energy & transformations','energyForms']],8:[['Waves: transverse & longitudinal','waveMotion']],9:[['Work done (W = Fs cos θ)','workDone'],['Power (P = W/t)','powerLift'],['Conservation of energy','energyConservation'],['Energy transformations','energyForms'],['Wave motion & v = fλ','waveMotion'],['Vectors: addition','vectorAdd']],
11:[['Scalars & vectors; addition & components','vectorAdd'],['Dot, cross & triple products','vectorProducts'],["Lami's theorem & tangent law",'lami'],['Work–energy theorem','workDone'],['Power: P = Fv','powerLift'],['Conservation of mechanical energy','energyConservation'],['Waves: types & v = fλ','waveMotion']]}});
})();


/* 504b4efe-d61d-5816-bccd-1e0ab6ce9f39 */
(function(){
const K=window.LabKit;const {W,H,R,C,T,L,P,RR,G,ball,head,arc,room,cl,avg,hint}=K;
const S=window.LabSims;const bg=c=>room(c,false);
const lin=pts=>{const n=pts.length,sx=pts.reduce((a,p)=>a+p[0],0),sy=pts.reduce((a,p)=>a+p[1],0),sxx=pts.reduce((a,p)=>a+p[0]*p[0],0),sxy=pts.reduce((a,p)=>a+p[0]*p[1],0),d=n*sxx-sx*sx;if(n<2||Math.abs(d)<1e-12)return null;const b=(n*sxy-sx*sy)/d;return{b,a:(sy-b*sx)/n}};
const box=(c,x,y,w,h,title)=>{RR(c,x,y,w,h,10,'rgba(10,12,16,0.75)','rgba(255,255,255,0.12)',1);if(title)T(c,title,x+12,y+22,{s:14,w:600,c:C.dim})};
const arrow=(c,x1,y1,x2,y2,col,w)=>{if(Math.hypot(x2-x1,y2-y1)<2)return;L(c,x1,y1,x2,y2,col,w||3);head(c,x2,y2,Math.atan2(y2-y1,x2-x1),col,14)};
const info=(c,x,y,w,rows)=>{box(c,x,y,w,26+rows.length*36,'');rows.forEach(([a,b,col],i)=>{T(c,a,x+18,y+38+i*36,{s:17,c:C.dim});T(c,b,x+w-16,y+38+i*36,{a:'right',s:20,w:700,m:1,c:col||C.ink})})};
const blk=(c,x,y,w,h,lab)=>{RR(c,x,y,w,h,6,G(c,0,y,0,y+h,['#ffcf7a','#b9741f']),'rgba(0,0,0,0.4)',1.5);if(lab)T(c,lab,x+w/2,y+h/2+7,{a:'center',s:17,w:800,c:'#1d1305'})};
const spring=(c,x1,y1,x2,y2,col,coils)=>{const n=coils||14,dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy),ux=dx/len,uy=dy/len,nx=-uy,ny=ux;c.beginPath();c.moveTo(x1,y1);for(let i=1;i<n;i++){const t=i/n,s=(i%2?1:-1)*12;c.lineTo(x1+dx*t+nx*s,y1+dy*t+ny*s)}c.lineTo(x2,y2);c.strokeStyle=col||'#c9d3de';c.lineWidth=2.6;c.stroke()};
const fmt=v=>{const a=Math.abs(v);if(!a)return'0';const e=Math.floor(Math.log10(a));return(a>=0.01&&a<1e4)?v.toFixed(2):(v/Math.pow(10,e)).toFixed(2)+' × 10'+String(e).replace(/-/g,'⁻').replace(/[0-9]/g,d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[d])};

/* 1 ─ Spring force, elastic PE & combinations */
S.springEnergy={title:'Springs — Elastic Potential Energy & Series / Parallel Combinations',topic:'mech',grades:[11],
aim:'Stretch springs singly, in series and in parallel; find the equivalent spring constant, the spring force F = −kx and the stored energy ½kx² as the area under the F–x graph.',
apparatus:['Two springs k₁ and k₂','Hook, scale and force gauge'],
formula:'F = − k x (restoring)      Work done in stretching = area under F–x = ½ k x² = elastic PE      Series: 1/k = 1/k₁ + 1/k₂  (softer)      Parallel: k = k₁ + k₂  (stiffer)      Spring force is conservative',
procedure:['Choose the arrangement and set k₁, k₂.','Set the extension x.','Read the force and the energy stored (shaded area).','Record and plot F against x: slope = equivalent k.','Compare series (smaller k) and parallel (larger k) for the same x.'],
controls:[{k:'arr',label:'Arrangement',type:'select',def:'s',options:[['1','Single spring k₁'],['s','Series k₁ + k₂'],['p','Parallel k₁ ∥ k₂']]},{k:'k1',label:'k₁',type:'select',def:200,options:[[100,'100 N/m'],[200,'200 N/m'],[300,'300 N/m']]},{k:'k2',label:'k₂',type:'select',def:300,options:[[100,'100 N/m'],[200,'200 N/m'],[300,'300 N/m']]},{k:'x',label:'Extension x',type:'range',min:0,max:20,step:1,def:10,unit:'cm'}],
init(){return{}},
keq(p){return p.arr==='1'?p.k1:p.arr==='s'?p.k1*p.k2/(p.k1+p.k2):p.k1+p.k2},
draw(c,s,p){bg(c);const k=this.keq(p),x=p.x/100,F=k*x,E=0.5*k*x*x,top=60,L0=180,ext=p.x*8,hx=280;RR(c,120,top-20,320,20,4,'#6f7b8c');
if(p.arr==='p'){const by=top+L0+ext;spring(c,hx-60,top,hx-60,by);spring(c,hx+60,top,hx+60,by);RR(c,hx-90,by,180,12,3,'#8f9aa8');blk(c,hx-40,by+12,80,50,'load');T(c,'k₁',hx-90,top+80,{a:'right',s:16,w:700});T(c,'k₂',hx+90,top+80,{s:16,w:700})}
else if(p.arr==='s'){const mid=top+L0/2+ext*k/p.k1/2*2*0.5+ext*(k/p.k1)*0.5,by=top+L0+ext,m1=top+L0/2+ext*(k/p.k1);spring(c,hx,top,hx,m1,undefined,8);RR(c,hx-14,m1-4,28,8,3,'#cfd6df');spring(c,hx,m1+4,hx,by,'#9ab8ff',8);blk(c,hx-40,by,80,50,'load');T(c,'k₁ (x₁ = '+(F/p.k1*100).toFixed(1)+' cm)',hx+30,top+60,{s:15,w:700});T(c,'k₂ (x₂ = '+(F/p.k2*100).toFixed(1)+' cm)',hx+30,m1+60,{s:15,w:700,c:'#9ab8ff'})}
else{const by=top+L0+ext;spring(c,hx,top,hx,by);blk(c,hx-40,by,80,50,'load')}
L(c,90,top+L0,140,top+L0,C.dim,1.5,[4,4]);if(p.x)arrow(c,110,top+L0,110,top+L0+ext,C.cyan,2.5);T(c,'x',96,top+L0+ext/2,{a:'right',s:16,w:700,c:C.cyan});
const gx=560,gy=480,gw=380,gh=230,Fm=Math.max(k*0.2,20)*1.15;box(c,540,200,420,310,'F – x  (area = ½ k x²)');L(c,gx,gy,gx+gw,gy,'rgba(255,255,255,0.35)',1.5);L(c,gx,gy,gx,gy-gh,'rgba(255,255,255,0.35)',1.5);
P(c,[[gx,gy],[gx+gw*p.x/20,gy],[gx+gw*p.x/20,gy-gh*F/Fm]],'rgba(255,181,71,0.35)');L(c,gx,gy,gx+gw,gy-gh*k*0.2/Fm,C.amber,3);T(c,'x (cm)',gx+gw,gy+20,{a:'right',s:13,c:C.dim});T(c,'F (N)',gx+8,gy-gh+10,{s:13,c:C.dim});
info(c,540,30,420,[['k (equivalent)',k.toFixed(1)+' N/m',C.lime],['Spring force kx',F.toFixed(2)+' N',C.amber],['Energy ½kx²',E.toFixed(3)+' J',C.cyan]]);},
readings(s,p){const k=this.keq(p),x=p.x/100;return[['Equivalent k',k.toFixed(1),'N/m'],['Force',(k*x).toFixed(2),'N'],['Stored energy',(0.5*k*x*x).toFixed(3),'J']]},
columns:['Arrangement','k₁','k₂','x (cm)','F (N)','E (J)'],
record(s,p){const k=this.keq(p),x=p.x/100;return[{1:'Single',s:'Series',p:'Parallel'}[p.arr],p.k1,p.arr==='1'?'—':p.k2,p.x,+(k*x).toFixed(2),+(0.5*k*x*x).toFixed(3)]},
plot:{x:3,y:4},
result(rows){return'F ∝ x (Hooke’s law); stored energy ∝ x² (doubling x gives 4× energy). Series springs are softer: 1/k = 1/k₁ + 1/k₂; parallel springs are stiffer: k = k₁ + k₂.'}};

/* 2 ─ Conservative vs non-conservative forces */
S.conservative={title:'Conservative & Non-conservative Forces — Path Independence',topic:'mech',grades:[11],
aim:'Move a block from A to B along different paths: the work done by gravity (and a spring) is the same for every path and zero round a closed loop, but the work done against friction depends on the path.',
apparatus:['Block (m = 2 kg)','Three paths from A to B: straight ramp, staircase, curved slide','Friction surface (μ)'],
formula:'Conservative force (gravity, spring, electrostatic): work depends only on start and end points; round trip work = 0; has a potential energy U, F = −dU/dx      Non-conservative (friction, air drag): work depends on path; round trip work ≠ 0 (energy lost as heat)      W_gravity = − m g Δh',
procedure:['Choose a path from A (top) to B (bottom).','Read the work done by gravity and by friction.','Record for all three paths.','Compare: gravity work is identical; friction work is greater for the longer path.','Choose “round trip” to go A → B → A: gravity gives zero net work, friction does not.'],
controls:[{k:'path',label:'Path',type:'select',def:'r',options:[['r','Straight ramp'],['s','Staircase'],['c','Curved slide'],['loop','Round trip A → B → A (ramp)']]},{k:'h',label:'Height difference',type:'range',min:1,max:5,step:1,def:4,unit:'m'},{k:'mu',label:'Friction μ',type:'select',def:0.2,options:[[0,'0 (smooth)'],[0.1,'0.1'],[0.2,'0.2']]}],
init(){return{t:0}},step(s,p,dt){s.t=(s.t+dt*0.3)%1},
calc(p){const m=2,g=9.8,d=6,len={r:Math.hypot(d,p.h),s:d+p.h,c:Math.hypot(d,p.h)*1.25,loop:2*Math.hypot(d,p.h)}[p.path],horiz={r:d,s:d,c:d*1.05,loop:2*d}[p.path];const Wg=p.path==='loop'?0:m*g*p.h,Wf=-p.mu*m*g*horiz;return{Wg,Wf,len}},
draw(c,s,p){bg(c);const k=this.calc(p),Ax=120,Ay=120,sc=70,Bx=Ax+6*sc,By=Ay+p.h*sc;L(c,60,By+6,640,By+6,'rgba(255,255,255,0.3)',2);
const pts=[];if(p.path==='r'||p.path==='loop'){pts.push([Ax,Ay],[Bx,By])}else if(p.path==='s'){const n=Math.max(1,p.h);for(let i=0;i<n;i++){pts.push([Ax+i*6*sc/n,Ay+i*sc*p.h/n],[Ax+(i+1)*6*sc/n,Ay+i*sc*p.h/n])}pts.push([Bx,By])}else{for(let i=0;i<=30;i++){const t=i/30;pts.push([Ax+t*6*sc,Ay+p.h*sc*(1-Math.cos(t*Math.PI))/2])}}
c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle='#cfd6df';c.lineWidth=5;c.stroke();if(p.path==='loop'){c.save();c.setLineDash([8,6]);c.beginPath();c.moveTo(Bx,By);c.lineTo(Ax,Ay);c.strokeStyle='rgba(79,214,255,0.6)';c.lineWidth=3;c.stroke();c.restore()}
T(c,'A',Ax-18,Ay,{a:'right',s:22,w:800,c:C.amber});T(c,'B',Bx+16,By,{s:22,w:800,c:C.amber});L(c,Bx+60,Ay,Bx+60,By,C.cyan,2);T(c,'Δh = '+p.h+' m',Bx+70,(Ay+By)/2,{s:17,w:700,c:C.cyan});
let tot=0;const seg=[];for(let i=1;i<pts.length;i++){const l=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);seg.push(l);tot+=l}let d=s.t*tot,i=0;while(i<seg.length-1&&d>seg[i]){d-=seg[i];i++}const f=seg[i]?d/seg[i]:0,bx=pts[i][0]+(pts[i+1][0]-pts[i][0])*f,by=pts[i][1]+(pts[i+1][1]-pts[i][1])*f;blk(c,bx-18,by-30,36,28);
info(c,640,40,330,[['Path length',k.len.toFixed(2)+' m',C.ink],['W by gravity',k.Wg.toFixed(1)+' J',C.lime],['W by friction',k.Wf.toFixed(1)+' J',C.rose],['Heat produced',(-k.Wf).toFixed(1)+' J',C.amber]]);
T(c,p.path==='loop'?'Round trip: gravity work = 0 (conservative) · friction work ≠ 0 (non-conservative)':'Gravity work = mgΔh = '+k.Wg.toFixed(1)+' J for EVERY path',330,530,{a:'center',s:17,w:700,c:C.ink});},
readings(s,p){const k=this.calc(p);return[['W gravity',k.Wg.toFixed(1),'J'],['W friction',k.Wf.toFixed(1),'J'],['Path length',k.len.toFixed(2),'m']]},
columns:['Path','Length (m)','W_gravity (J)','W_friction (J)'],
record(s,p){const k=this.calc(p);return[{r:'Ramp',s:'Staircase',c:'Curved',loop:'Round trip'}[p.path],+k.len.toFixed(2),+k.Wg.toFixed(1),+k.Wf.toFixed(1)]},
result(rows){return'Gravity did the same work on every path and zero on the round trip → conservative. Friction work changed with the path and was not zero for the round trip → non-conservative.'}};

/* 3 ─ Potential-energy curves & equilibrium */
S.equilibriumU={title:'Potential-energy Curves & Types of Equilibrium',topic:'mech',grades:[11],
aim:'Place a ball on a potential-energy landscape U(x); find where the force F = −dU/dx is zero and decide whether each equilibrium is stable (U minimum), unstable (U maximum) or neutral (U constant).',
apparatus:['Smooth track shaped like U(x)','Ball','Force gauge (slope of U)'],
formula:'F = − dU/dx      Equilibrium: F = 0 (dU/dx = 0)      Stable: U minimum (d²U/dx² > 0) — ball returns      Unstable: U maximum (d²U/dx² < 0) — ball moves away      Neutral: U constant — ball stays where placed',
procedure:['Choose the landscape.','Place the ball with the slider and read U and F = −dU/dx.','Find the points where F = 0.','Tap “Nudge” at each one: does the ball come back, run away or stay?','Record the type of equilibrium.'],
controls:[{k:'land',label:'Landscape',type:'select',def:'w',options:[['w','Valley – hill – valley'],['b','Bowl'],['f','Flat region']]},{k:'x',label:'Ball position x',type:'range',min:-3,max:3,step:0.25,def:0,unit:'m'}],
actions:[{label:'Nudge',run(s,p){s.x=p.x+0.15;s.v=0;s.run=true}},{label:'Place',run(s){s.run=false}}],
init(p){return{x:p?p.x:0,v:0,run:false}},onChange(s,p){s.x=p.x;s.run=false;s.v=0},
U(p,x){if(p.land==='w')return 4+Math.pow(x,4)/4-2*x*x;if(p.land==='b')return 0.5*x*x;return Math.abs(x)<1.5?1:1+Math.pow(Math.abs(x)-1.5,2)},
dU(p,x){const h=1e-4;return(this.U(p,x+h)-this.U(p,x-h))/(2*h)},d2U(p,x){const h=1e-3;return(this.U(p,x+h)-2*this.U(p,x)+this.U(p,x-h))/(h*h)},
step(s,p,dt){if(!s.run)return;for(let i=0;i<10;i++){const a=-this.dU(p,s.x)-0.3*s.v;s.v+=a*dt/10;s.x+=s.v*dt/10;if(Math.abs(s.x)>3.2){s.x=Math.sign(s.x)*3.2;s.v=0}}},
kind(p,x){const f=this.dU(p,x),d2=this.d2U(p,x);if(Math.abs(f)>0.05)return'Not in equilibrium';if(Math.abs(d2)<0.05)return'Neutral';return d2>0?'Stable':'Unstable'},
draw(c,s,p){bg(c);const x0=60,y0=440,w=600,X=x=>x0+(x+3.2)/6.4*w,us=[];for(let i=0;i<=200;i++){us.push(this.U(p,-3.2+6.4*i/200))}const mx=Math.max(...us),mn=Math.min(...us),Y=u=>y0-(u-mn)/((mx-mn)||1)*300;
c.beginPath();us.forEach((u,i)=>{const x=-3.2+6.4*i/200;i?c.lineTo(X(x),Y(u)):c.moveTo(X(x),Y(u))});c.strokeStyle='#cfd6df';c.lineWidth=4;c.stroke();T(c,'U(x)',x0,100,{s:16,c:C.dim});
const bx=s.run?s.x:p.x;ball(c,X(bx),Y(this.U(p,bx))-14,13,'#ffd08a','#a8661c');const F=-this.dU(p,bx);if(Math.abs(F)>0.02)arrow(c,X(bx),Y(this.U(p,bx))-40,X(bx)+F*30,Y(this.U(p,bx))-40,C.rose,3);
for(let i=1;i<200;i++){const x=-3.2+6.4*i/200,a=this.dU(p,x-0.016),b=this.dU(p,x+0.016);if(a*b<=0&&p.land!=='f'){const t=this.kind(p,x);if(t!=='Not in equilibrium'){T(c,t,X(x),Y(this.U(p,x))+34,{a:'center',s:15,w:700,c:t==='Stable'?C.lime:C.rose})}}}
if(p.land==='f')T(c,'Neutral (flat)',X(0),Y(1)-30,{a:'center',s:15,w:700,c:C.cyan});
info(c,680,40,290,[['U',this.U(p,bx).toFixed(3)+' J',C.cyan],['F = −dU/dx',F.toFixed(3)+' N',C.rose],['d²U/dx²',this.d2U(p,bx).toFixed(2),C.ink],['Here',this.kind(p,bx),this.kind(p,bx)==='Stable'?C.lime:this.kind(p,bx)==='Unstable'?C.rose:C.dim]]);},
readings(s,p){const x=s.run?s.x:p.x;return[['x',x.toFixed(2),'m'],['U',this.U(p,x).toFixed(3),'J'],['F',(-this.dU(p,x)).toFixed(3),'N'],['Type',this.kind(p,x),'']]},
columns:['Landscape','x (m)','U (J)','F (N)','Equilibrium'],
record(s,p){return[{w:'Valley–hill',b:'Bowl',f:'Flat'}[p.land],p.x,+this.U(p,p.x).toFixed(3),+(-this.dU(p,p.x)).toFixed(3),this.kind(p,p.x)]},
result(rows){return'F = 0 wherever the U(x) curve is flat. A minimum of U is stable (the ball returns when nudged), a maximum is unstable (it rolls away), and a flat region is neutral.'}};

/* 4 ─ Power & efficiency of machines */
S.machineEfficiency={title:'Power & Efficiency — Crane, Water Pump & the Heart',topic:'mech',grades:[9,11],
aim:'Find the useful (output) power of a crane, a water pump and the human heart, and compare it with the input power to get the efficiency.',
apparatus:['Electric crane lifting a load','Pump lifting water to a tank','Heart (pressure × volume flow)'],
formula:'Efficiency η = output power / input power × 100 % = useful work / energy supplied      Crane: P_out = m g v  (= m g h / t)      Pump: P_out = (mass per second) g h = ρ Q g h  (+ ½ (dm/dt) v² if water leaves with speed v)      Heart: P = pressure × volume pumped per second',
procedure:['Choose the machine.','Set its load, rate and input power.','Read the output power and the efficiency.','Record and compare machines.','Check: η can never exceed 100 %.'],
controls:[{k:'mode',label:'Machine',type:'select',def:'crane',options:[['crane','Crane'],['pump','Water pump'],['heart','Human heart']]},{k:'m',label:'Crane load',type:'range',min:100,max:2000,step:100,def:1000,unit:'kg'},{k:'v',label:'Lifting speed',type:'range',min:0.1,max:1,step:0.1,def:0.5,unit:'m/s'},{k:'Pin',label:'Input power (crane / pump)',type:'range',min:1,max:20,step:1,def:8,unit:'kW'},{k:'Q',label:'Pump flow',type:'range',min:1,max:20,step:1,def:5,unit:'L/s'},{k:'h',label:'Pump lift height',type:'range',min:5,max:50,step:5,def:20,unit:'m'},{k:'bpm',label:'Heart rate',type:'range',min:50,max:150,step:10,def:70,unit:'beats/min'}],
init(){return{t:0}},step(s,p,dt){s.t+=dt},
calc(p){if(p.mode==='crane'){const out=p.m*9.8*p.v;return{out,inp:p.Pin*1000}}if(p.mode==='pump'){const out=p.Q*9.8*p.h;return{out,inp:p.Pin*1000}}const P=1.6e4,V=70e-6,out=P*V*p.bpm/60;return{out,inp:out/0.2}},
draw(c,s,p){bg(c);const k=this.calc(p),eff=k.out/k.inp*100;
if(p.mode==='crane'){L(c,200,480,200,80,'#6f7b8c',10);L(c,200,90,520,90,'#6f7b8c',8);const y=120+((s.t*p.v*80)%300);L(c,480,90,480,y,'#cfd6df',2);blk(c,440,y,80,60,p.m+' kg');arrow(c,560,y+30,560,y-30,C.cyan,3);T(c,'v = '+p.v+' m/s',570,y,{s:16,w:700,c:C.cyan})}
else if(p.mode==='pump'){RR(c,120,420,120,60,8,'#4a5566');T(c,'pump',180,456,{a:'center',s:16,w:700});L(c,240,440,420,440,'#9fb0c4',8);L(c,420,440,420,140,'#9fb0c4',8);RR(c,380,80,180,70,6,'rgba(79,179,255,0.4)','#9fb0c4',2);T(c,'h = '+p.h+' m',440,300,{s:17,w:700,c:C.cyan});for(let i=0;i<6;i++){const yy=440-((s.t*120+i*50)%300);c.beginPath();c.arc(420,yy,5,0,7);c.fillStyle=C.cyan;c.fill()}}
else{const b=1+0.08*Math.max(0,Math.sin(s.t*p.bpm/60*2*Math.PI));c.save();c.translate(330,280);c.scale(b,b);c.beginPath();c.moveTo(0,60);c.bezierCurveTo(-140,-30,-60,-120,0,-50);c.bezierCurveTo(60,-120,140,-30,0,60);c.fillStyle='#d63b55';c.fill();c.restore();T(c,'pressure ≈ 16 kPa (120 mmHg), ~70 mL per beat',330,420,{a:'center',s:16,c:C.dim})}
info(c,620,60,350,[['Output (useful) power',(k.out>=1000?(k.out/1000).toFixed(2)+' kW':k.out.toFixed(2)+' W'),C.lime],['Input power',(k.inp>=1000?(k.inp/1000).toFixed(2)+' kW':k.inp.toFixed(2)+' W'),C.amber],['Efficiency',eff>100?'> 100 % — impossible!':eff.toFixed(1)+' %',eff>100?C.rose:C.cyan]]);},
readings(s,p){const k=this.calc(p);return[['Output power',k.out.toFixed(1),'W'],['Input power',k.inp.toFixed(1),'W'],['Efficiency',(k.out/k.inp*100).toFixed(1),'%']]},
columns:['Machine','Output (W)','Input (W)','η (%)'],
record(s,p){const k=this.calc(p);if(k.out>k.inp)return{error:'Output exceeds input — increase the input power (η cannot exceed 100 %).'};return[{crane:'Crane',pump:'Pump',heart:'Heart'}[p.mode],+k.out.toFixed(1),+k.inp.toFixed(1),+(k.out/k.inp*100).toFixed(1)]},
result(rows){return'Useful power is always less than input power (η < 100 %) — the rest is lost as heat, sound etc. The heart’s mechanical power is only about 1–2 W.'}};

/* 5 ─ Mass–energy equivalence */
S.massEnergy={title:'Mass–Energy Equivalence — E = mc²',topic:'modern',grades:[9,11,12],
aim:'Convert a small mass into energy with E = mc² and compare it with everyday energies: lifting work, burning coal, a household’s electricity use, and the mass lost in nuclear fission.',
apparatus:['Mass converter (thought experiment)','Comparison scales'],
formula:'E = m c²,  c = 3 × 10⁸ m/s      1 g of mass ≡ 9 × 10¹³ J      1 u (atomic mass unit) ≡ 931.5 MeV      In fission of U-235 about 0.1 % of the mass is converted to energy      Total (mass + energy) is conserved',
procedure:['Set the mass converted.','Read the energy E = mc².','Compare: how high could it lift a 1000 kg car? how much coal would release this? how long would it power a home?','Record for several masses.','Choose “fission” to see the mass defect of 1 kg of U-235.'],
controls:[{k:'mode',label:'Example',type:'select',def:'m',options:[['m','Convert a small mass'],['fis','Fission of 1 kg U-235 (0.09 % mass lost)']]},{k:'lg',label:'Mass = 10^x kg',type:'range',min:-9,max:0,step:1,def:-3,unit:''}],
init(){return{}},
E(p){const m=p.mode==='fis'?1*0.0009:Math.pow(10,p.lg);return{m,E:m*9e16}},
draw(c,s,p){bg(c);const k=this.E(p);T(c,'m = '+fmt(k.m)+' kg',500,110,{a:'center',s:34,w:800,m:1,c:C.amber});T(c,'E = mc² = '+fmt(k.E)+' J',500,170,{a:'center',s:34,w:800,m:1,c:C.lime});
const rows=[['Lift a 1000 kg car to a height of',fmt(k.E/(1000*9.8))+' m',C.cyan],['Coal needed to release this (30 MJ/kg)',fmt(k.E/3e7)+' kg',C.amber],['Powers a home (300 kWh/month) for',fmt(k.E/(300*3.6e6))+' months',C.violet],['In kWh',fmt(k.E/3.6e6)+' kWh',C.ink]];info(c,180,230,640,rows);
T(c,'A tiny mass holds enormous energy — basis of nuclear reactors, the Sun and atom bombs',500,520,{a:'center',s:17,c:C.dim});},
readings(s,p){const k=this.E(p);return[['Mass converted',fmt(k.m),'kg'],['Energy',fmt(k.E),'J'],['kWh',fmt(k.E/3.6e6),'kWh']]},
columns:['m (kg)','E (J)','Coal equivalent (kg)'],
record(s,p){const k=this.E(p);return[fmt(k.m),fmt(k.E),fmt(k.E/3e7)]},
result(rows){return'E = mc²: even 1 g of mass is equivalent to 9 × 10¹³ J — the energy of about 3000 tonnes of coal.'}};

/* 6 ─ Work–energy theorem: bullet penetration */
S.penetration={title:'Work–Energy Theorem — Bullet Penetration',topic:'mech',grades:[11],
aim:'Fire a bullet into a wooden block: the block’s constant resistive force does negative work equal to the bullet’s kinetic energy. Find how penetration depth depends on speed, and how many planks a bullet can pass through.',
apparatus:['Bullet (m = 20 g)','Wooden block / identical planks (each 2 cm thick)','Velocity gate'],
formula:'Work–energy theorem: − F s = 0 − ½ m u²  →  s = m u² / 2F      s ∝ u²: double the speed → 4× the depth      Through planks: each plank removes the same energy F d; speed after n planks v² = u² − 2 n F d / m      Time of penetration t = 2s/u',
procedure:['Set the bullet speed and the resistive force of the wood.','Choose a single block or a stack of planks.','Tap “Fire”. Read the penetration depth (or planks crossed).','Record for several speeds; plot s against u².','Check s = mu²/2F and t = 2s/u.'],
controls:[{k:'u',label:'Bullet speed u',type:'range',min:50,max:400,step:50,def:200,unit:'m/s'},{k:'F',label:'Resistive force F',type:'range',min:2000,max:12000,step:1000,def:8000,unit:'N'},{k:'mode',label:'Target',type:'select',def:'blk',options:[['blk','Thick wooden block'],['pl','Stack of 2 cm planks']]}],
actions:[{label:'Fire',run(s){Object.assign(s,{t:0,run:true,done:false})}}],
init(){return{t:0,run:false,done:false}},onChange(s){Object.assign(s,{t:0,run:false,done:false})},
calc(p){const m=0.02,sd=m*p.u*p.u/(2*p.F),nPl=Math.floor(sd/0.02),vout=Math.sqrt(Math.max(0,p.u*p.u-2*nPl*p.F*0.02/m));return{sd,nPl,t:2*sd/p.u,KE:0.5*m*p.u*p.u,vout}},
step(s,p,dt){if(!s.run)return;s.t+=dt;if(s.t>1.5){s.run=false;s.done=true}},
draw(c,s,p){bg(c);const k=this.calc(p),bx=480,sc=1200,y=280;if(p.mode==='blk')RR(c,bx,y-80,420,160,6,G(c,bx,0,bx+420,0,['#a0784c','#7a5634']));else for(let i=0;i<12;i++)RR(c,bx+i*36,y-80,22,160,3,G(c,0,y-80,0,y+80,['#b88a58','#7a5634']));
const f=Math.min(s.t/0.8,1),pen=Math.min(k.sd,0.35)*sc*(s.done||f>=1?1:0),bxp=s.run||s.done?(f<1?100+f*(bx-100):bx+pen):100;c.beginPath();c.ellipse(bxp-16,y,20,7,0,0,7);c.fillStyle='#e8c35a';c.fill();
if(s.done){L(c,bx,y+100,bx+pen,y+100,C.lime,3);T(c,'s = '+(k.sd*100).toFixed(1)+' cm'+(k.sd>0.35?' (passes through)':''),bx+Math.max(pen,80)/2,y+126,{a:'center',s:18,w:700,c:C.lime})}
info(c,40,370,400,[['KE = ½mu²',k.KE.toFixed(0)+' J',C.amber],['Depth s = mu²/2F',(k.sd*100).toFixed(2)+' cm',C.lime],['Time 2s/u',(k.t*1000).toFixed(2)+' ms',C.cyan],[p.mode==='pl'?'Planks crossed':'Work by wood',p.mode==='pl'?k.nPl+'':(-k.KE).toFixed(0)+' J',C.rose]]);if(!s.run&&!s.done)hint(c,'Tap “Fire”');},
readings(s,p){const k=this.calc(p);return[['Kinetic energy',k.KE.toFixed(0),'J'],['Penetration depth',(k.sd*100).toFixed(2),'cm'],['Planks (2 cm) crossed',k.nPl,''],['Time',(k.t*1000).toFixed(2),'ms']]},
columns:['u (m/s)','u² (m²/s²)','F (N)','s (cm)'],
record(s,p){if(!s.done)return{error:'Fire the bullet first.'};const k=this.calc(p);return[p.u,p.u*p.u,p.F,+(k.sd*100).toFixed(2)]},
plot:{x:1,y:3},
result(rows){const f=lin(rows.map(r=>[r[1],r[3]]));return f&&rows.length>1?'s ∝ u² (straight line through origin): doubling the speed gives 4× the depth. Work done by the wood = −½mu².':''}};

window.LabParts=(window.LabParts||0)+1;
(window.LabExtra=window.LabExtra||[]).push({order:['springEnergy','conservative','equilibriumU','machineEfficiency','massEnergy','penetration'],
syl:{9:[['Efficiency & power of machines','machineEfficiency'],['Mass–energy equivalence','massEnergy']],
11:[['Elastic PE & spring combinations','springEnergy'],['Conservative & non-conservative forces','conservative'],['Potential-energy curves & equilibrium','equilibriumU'],['Power & efficiency','machineEfficiency'],['E = mc²','massEnergy'],['Work–energy theorem: penetration','penetration']],12:[['Mass–energy equivalence','massEnergy']]}});
})();
