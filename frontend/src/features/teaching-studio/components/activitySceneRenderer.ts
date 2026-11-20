// @ts-nocheck
// Ported from the supplied SPECTROPY Activity Builder prototype.
// Keep this renderer shared by the builder preview and exported activity.
export function drawActivityScene(ctx: CanvasRenderingContext2D,W: number,H: number,id: string,acc: string,t=0,anim=true,subject='General Science'){
 ctx.clearRect(0,0,W,H);const u=Math.min(W,H)/100;ctx.lineCap='round';ctx.lineJoin='round';
 const L=(a)=>`rgba(233,236,241,${a})`;const A=(a)=>hexA(acc,a);
 const grid=(s,a)=>{ctx.strokeStyle=L(a);ctx.lineWidth=1;for(let x=0;x<W;x+=s){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}for(let y=0;y<H;y+=s){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}};
 const circ=(x,y,r,st,fi,lw=2)=>{ctx.beginPath();ctx.arc(x,y,r,0,7);if(fi){ctx.fillStyle=fi;ctx.fill()}if(st){ctx.strokeStyle=st;ctx.lineWidth=lw;ctx.stroke()}};
 const line=(a,b,c,d,st,lw=2)=>{ctx.beginPath();ctx.moveTo(a,b);ctx.lineTo(c,d);ctx.strokeStyle=st;ctx.lineWidth=lw;ctx.stroke()};
 const txt=(s,x,y,sz,c=L(.6))=>{ctx.fillStyle=c;ctx.font=`600 ${sz}px Inter`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(s,x,y)};
 const T=anim?t:0, cx=W/2, cy=H/2;
 switch(id){
 case 'grid':grid(u*5,.05);grid(u*25,.1);break;
 case 'space':for(let i=0;i<120;i++){const x=(i*137.5%100)/100*W,y=(i*71.3%100)/100*H;ctx.fillStyle=L(.15+.4*((i*13)%7)/7);ctx.fillRect(x,y,1.5,1.5)}
  circ(cx,cy,u*8,null,A(.9));[18,30,42].forEach((r,i)=>{ctx.save();ctx.translate(cx,cy);ctx.scale(1,.45);circ(0,0,u*r,L(.18),null,1);ctx.restore();const a=T*(.8/(i+1))+i*2;circ(cx+Math.cos(a)*u*r,cy+Math.sin(a)*u*r*.45,u*(2.2-i*.4),null,L(.8))});break;
 case 'optics':line(u*5,cy,W-u*5,cy,L(.25),1.5);ctx.save();ctx.translate(cx,cy);ctx.beginPath();ctx.ellipse(0,0,u*3,u*28,0,0,7);ctx.fillStyle=A(.18);ctx.fill();ctx.strokeStyle=A(.9);ctx.lineWidth=2;ctx.stroke();ctx.restore();
  const ox=cx-u*35,ix=cx+u*35;line(ox,cy,ox,cy-u*16,L(.8),4);line(ix,cy,ix,cy+u*16,L(.5),4);[[ox,cy-u*16,cx,cy-u*16,ix,cy+u*16],[ox,cy-u*16,cx,cy,ix,cy+u*16]].forEach(p=>{ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(p[2],p[3]);ctx.lineTo(p[4],p[5]);ctx.strokeStyle=hexA('#f5c451',.8);ctx.lineWidth=1.5;ctx.stroke()});
  txt('F',cx-u*18,cy+u*4,u*3);txt('F',cx+u*18,cy+u*4,u*3);circ(cx-u*18,cy,u*.8,null,L(.7));circ(cx+u*18,cy,u*.8,null,L(.7));break;
 case 'circuit':grid(u*5,.04);ctx.strokeStyle=A(.85);ctx.lineWidth=3;ctx.strokeRect(cx-u*35,cy-u*25,u*70,u*50);
  ctx.fillStyle='#0d0e10';ctx.fillRect(cx-u*10,cy-u*27,u*20,u*4);ctx.strokeStyle=L(.9);ctx.beginPath();for(let i=0;i<=8;i++)ctx.lineTo(cx-u*10+i*u*2.5,cy-u*25+(i%2?-u*2:u*2)*(i&&i<8?1:0));ctx.stroke();
  ctx.fillRect(cx-u*37,cy-u*4,u*4,u*8);line(cx-u*39,cy-u*3,cx-u*31,cy-u*3,L(.9),3);line(cx-u*37,cy+u*3,cx-u*33,cy+u*3,L(.9),3);
  circ(cx,cy+u*25,u*5,L(.9),'#0d0e10');txt('A',cx,cy+u*25,u*4,L(.9));circ(cx+u*35,cy,u*5,L(.9),'#0d0e10');txt('V',cx+u*35,cy,u*4,L(.9));
  const p=(T*.25)%1;const per=[[cx-u*35,cy-u*25],[cx+u*35,cy-u*25],[cx+u*35,cy+u*25],[cx-u*35,cy+u*25]];for(let k=0;k<12;k++){const q=(p+k/12)%1*4,s=q|0,f=q-s,a=per[s],b=per[(s+1)%4];circ(a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,u*.9,null,hexA('#f5c451',.9))}break;
 case 'field':for(let k=-4;k<=4;k++){if(!k)continue;ctx.beginPath();ctx.ellipse(cx,cy,u*24,Math.abs(k)*u*6,0,Math.PI*(k>0?1:0),Math.PI*(k>0?2:1));ctx.strokeStyle=L(.25);ctx.lineWidth=1.5;ctx.stroke()}
  ctx.fillStyle=hexA('#ff6b6b',.85);ctx.fillRect(cx-u*24,cy-u*6,u*24,u*12);ctx.fillStyle=hexA('#4fb3ff',.85);ctx.fillRect(cx,cy-u*6,u*24,u*12);txt('N',cx-u*18,cy,u*6,'#fff');txt('S',cx+u*18,cy,u*6,'#fff');break;
 case 'incline':ctx.beginPath();ctx.moveTo(u*10,H-u*15);ctx.lineTo(W-u*10,H-u*15);ctx.lineTo(W-u*10,u*20);ctx.closePath();ctx.strokeStyle=L(.5);ctx.lineWidth=2;ctx.stroke();
  {const ang=Math.atan2(H-u*35,W-u*20),s=.3+.4*(.5+.5*Math.sin(T*.6));const x=u*10+(W-u*20)*s,y=H-u*15-(H-u*35)*s;ctx.save();ctx.translate(x,y);ctx.rotate(-ang);ctx.fillStyle=A(.85);ctx.fillRect(-u*5,-u*8,u*10,u*8);ctx.restore()}txt('θ',u*24,H-u*19,u*4);break;
 case 'wavebg':for(let r=0;r<6;r++){ctx.beginPath();for(let x=0;x<=W;x+=4)ctx.lineTo(x,cy+(r-2.5)*u*12+Math.sin(x/W*12-T*2+r)*u*3);ctx.strokeStyle=r===2?A(.9):L(.18);ctx.lineWidth=r===2?3:1.5;ctx.stroke()}break;
 case 'lab':{const fl=(x,w,h,lv,c)=>{ctx.beginPath();ctx.moveTo(x-w*.18,cy-h);ctx.lineTo(x-w*.18,cy-h*.35);ctx.lineTo(x-w/2,cy+h*.6);ctx.lineTo(x+w/2,cy+h*.6);ctx.lineTo(x+w*.18,cy-h*.35);ctx.lineTo(x+w*.18,cy-h);ctx.strokeStyle=L(.8);ctx.lineWidth=2.5;ctx.stroke();ctx.save();ctx.clip();ctx.fillStyle=c;ctx.fillRect(x-w,cy+h*.6-h*lv,w*2,h*2);ctx.restore()};
  fl(cx-u*30,u*28,u*30,.6,hexA('#4fb3ff',.45));fl(cx,u*32,u*34,.5,A(.5));ctx.strokeStyle=L(.8);ctx.lineWidth=2.5;ctx.strokeRect(cx+u*24,cy-u*30,u*12,u*50);ctx.fillStyle=hexA('#3ddc97',.45);ctx.fillRect(cx+u*24,cy-u*5,u*12,u*25);
  for(let i=0;i<8;i++){const y=cy+u*15-((T*12+i*9)%40)*u;circ(cx-u*4+((i*7)%9)*u,y,u*(.6+i%3*.3),L(.5))}break}
 case 'ptable':{const el='H,He,Li,Be,B,C,N,O,F,Ne,Na,Mg,Al,Si,P,S,Cl,Ar'.split(','),pos=[[0,0],[17,0],[0,1],[1,1],[12,1],[13,1],[14,1],[15,1],[16,1],[17,1],[0,2],[1,2],[12,2],[13,2],[14,2],[15,2],[16,2],[17,2]];
  const s=Math.min(W/19,H/8);const ox=(W-s*18)/2,oy=H/2-s*3;for(let r=3;r<7;r++)for(let c=0;c<18;c++){ctx.strokeStyle=L(.12);ctx.strokeRect(ox+c*s+2,oy+r*s+2,s-4,s-4)}
  el.forEach((e,i)=>{const[c,r]=pos[i];const col=c<2?'#ff8a4c':c===17?'#b58cff':c===16?'#f5c451':'#4fb3ff';ctx.fillStyle=hexA(col,.22);ctx.fillRect(ox+c*s+2,oy+r*s+2,s-4,s-4);ctx.strokeStyle=hexA(col,.9);ctx.strokeRect(ox+c*s+2,oy+r*s+2,s-4,s-4);txt(e,ox+c*s+s/2,oy+r*s+s/2,s*.38,'#fff')});break}
 case 'molecule':{ctx.save();ctx.translate(cx,cy);const a0=T*.4;const at=[[0,0,9,'#e9ecf1'],...[0,1,2,3].map(i=>{const a=a0+i*Math.PI/2+(i%2?.3:0);return[Math.cos(a)*u*28,Math.sin(a)*u*16*(i%2?1:-1)*.9,5.5,'#4fb3ff']})];
  at.slice(1).forEach(p=>line(0,0,p[0],p[1],L(.5),u*1.2));at.forEach(p=>{const g=ctx.createRadialGradient(p[0]-u*2,p[1]-u*2,1,p[0],p[1],u*p[2]);g.addColorStop(0,'#fff');g.addColorStop(1,p[3]);circ(p[0],p[1],u*p[2],null,g)});ctx.restore();txt('CH₄ · tetrahedral',cx,H-u*7,u*4);break}
 case 'atom':circ(cx,cy,u*7,null,A(.9));[16,28,40].forEach((r,i)=>{circ(cx,cy,u*r,L(.2),null,1.5);const n=[2,8,4][i];for(let k=0;k<n;k++){const a=T*(.9-i*.25)+k*2*Math.PI/n;circ(cx+Math.cos(a)*u*r,cy+Math.sin(a)*u*r,u*1.5,null,'#e9ecf1')}});break;
 case 'beaker':line(cx,u*6,cx,u*52,L(.8),u*3.5);ctx.fillStyle=hexA('#4fb3ff',.4);ctx.fillRect(cx-u*1.3,u*8,u*2.6,u*30);line(cx-u*20,u*20,cx-u*2,u*20,L(.4),3);line(cx-u*20,u*5,cx-u*20,H-u*10,L(.4),3);
  {const d=(T*30)%30;circ(cx,u*55+d*u*.6,u*1,null,hexA('#4fb3ff',.9))}ctx.beginPath();ctx.moveTo(cx-u*8,u*62);ctx.lineTo(cx-u*20,H-u*10);ctx.lineTo(cx+u*20,H-u*10);ctx.lineTo(cx+u*8,u*62);ctx.strokeStyle=L(.8);ctx.lineWidth=2.5;ctx.stroke();ctx.save();ctx.clip();ctx.fillStyle=hexA('#ff7bd5',.25+.15*Math.sin(T));ctx.fillRect(0,H-u*24,W,H);ctx.restore();break;
 case 'coord':{grid(u*5,.05);line(u*3,cy,W-u*3,cy,L(.7),2);line(cx,u*3,cx,H-u*3,L(.7),2);for(let k=-8;k<=8;k++){if(!k)continue;line(cx+k*u*10,cy-u*1,cx+k*u*10,cy+u*1,L(.6),1.5);line(cx-u*1,cy-k*u*10,cx+u*1,cy-k*u*10,L(.6),1.5)}
  ctx.beginPath();for(let x=-50;x<=50;x+=.5){const y=Math.sin(x/8+T*.8)*14;ctx.lineTo(cx+x*u,cy-y*u)}ctx.strokeStyle=A(.85);ctx.lineWidth=3;ctx.stroke();txt('x',W-u*5,cy-u*4,u*4);txt('y',cx+u*4,u*5,u*4);break}
 case 'numline':line(u*5,cy,W-u*5,cy,L(.8),3);for(let k=-5;k<=5;k++){const x=cx+k*u*8.5;line(x,cy-u*2.5,x,cy+u*2.5,L(.8),2);txt(String(k),x,cy+u*7,u*4)}
  {const k=Math.round(Math.sin(T*.6)*4);circ(cx+k*u*8.5,cy-u*8,u*2.5,null,A(.9))}break;
 case 'geo':grid(u*5,.04);ctx.beginPath();ctx.moveTo(cx-u*30,cy+u*25);ctx.lineTo(cx+u*30,cy+u*25);ctx.lineTo(cx-u*30,cy-u*20);ctx.closePath();ctx.strokeStyle=A(.9);ctx.lineWidth=3;ctx.stroke();ctx.strokeStyle=L(.6);ctx.strokeRect(cx-u*30,cy+u*20,u*5,u*5);
  circ(cx+u*22,cy-u*10,u*14,L(.5));txt('A',cx-u*33,cy-u*23,u*4);txt('B',cx-u*33,cy+u*29,u*4);txt('C',cx+u*33,cy+u*29,u*4);break;
 case 'circle':{const r=u*36;line(cx-r-u*6,cy,cx+r+u*6,cy,L(.5));line(cx,cy-r-u*6,cx,cy+r+u*6,L(.5));circ(cx,cy,r,L(.7));const a=T*.5;const px=cx+Math.cos(a)*r,py=cy-Math.sin(a)*r;line(cx,cy,px,py,A(.9),3);line(px,py,px,cy,hexA('#ff6b6b',.9),2.5);line(cx,cy,px,cy,hexA('#3ddc97',.9),2.5);circ(px,py,u*1.6,null,'#fff');break}
 case 'prob':{const die=(x,y,n,rot)=>{ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.fillStyle=L(.08);ctx.strokeStyle=L(.8);ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(-u*10,-u*10,u*20,u*20,u*3);ctx.fill();ctx.stroke();
  const P={1:[[0,0]],2:[[-1,-1],[1,1]],3:[[-1,-1],[0,0],[1,1]],4:[[-1,-1],[1,-1],[-1,1],[1,1]],5:[[-1,-1],[1,-1],[0,0],[-1,1],[1,1]],6:[[-1,-1],[1,-1],[-1,0],[1,0],[-1,1],[1,1]]};P[n].forEach(p=>circ(p[0]*u*5,p[1]*u*5,u*1.6,null,A(.95)));ctx.restore()};
  const n1=1+((T*.5|0)%6),n2=1+((T*.5|0)*5%6);die(cx-u*18,cy,n1,Math.sin(T)*.15);die(cx+u*18,cy,n2,-Math.sin(T)*.15);txt('P(sum = 7) = 6/36',cx,H-u*10,u*4.5);break}
 case 'cell':ctx.save();ctx.translate(cx,cy);ctx.beginPath();for(let a=0;a<=6.3;a+=.05){const r=u*40+Math.sin(a*5+T)*u*1.5;ctx.lineTo(Math.cos(a)*r*1.2,Math.sin(a)*r*.95)}ctx.closePath();ctx.fillStyle=A(.08);ctx.fill();ctx.strokeStyle=A(.85);ctx.lineWidth=3;ctx.stroke();
  circ(0,0,u*11,L(.7),hexA('#b58cff',.25),2.5);circ(u*2,-u*2,u*3.5,null,hexA('#b58cff',.6));
  [[-u*24,u*19],[u*22,u*17],[-u*20,-u*18]].forEach((p,i)=>{ctx.save();ctx.translate(...p);ctx.rotate(i);ctx.beginPath();ctx.ellipse(0,0,u*7,u*3.5,0,0,7);ctx.fillStyle=hexA('#ff8a4c',.35);ctx.fill();ctx.strokeStyle=hexA('#ff8a4c',.9);ctx.lineWidth=2;ctx.stroke();ctx.restore()});
  for(let i=0;i<30;i++){circ(Math.cos(i*2.4)*u*(16+i%5*4),Math.sin(i*2.4)*u*(14+i%4*3),u*.6,null,L(.5))}ctx.restore();break;
 case 'plant':ctx.strokeStyle=A(.9);ctx.lineWidth=u*1.5;ctx.strokeRect(cx-u*40,cy-u*30,u*80,u*60);ctx.strokeStyle=L(.5);ctx.lineWidth=2;ctx.strokeRect(cx-u*37,cy-u*27,u*74,u*54);
  ctx.fillStyle=L(.06);ctx.fillRect(cx-u*15,cy-u*20,u*45,u*40);circ(cx-u*25,cy-u*12,u*8,L(.7),hexA('#b58cff',.25));
  [[-25,15],[-10,22],[30,-20],[25,22]].forEach(p=>{ctx.beginPath();ctx.ellipse(cx+p[0]*u,cy+p[1]*u,u*5,u*2.5,.4,0,7);ctx.fillStyle=hexA('#3ddc97',.5);ctx.fill()});break;
 case 'dna':for(let i=0;i<40;i++){const y=u*5+i*(H-u*10)/40,ph=i*.35+T,x1=cx+Math.sin(ph)*u*18,x2=cx-Math.sin(ph)*u*18,z=Math.cos(ph);if(i%2)line(x1,y,x2,y,L(.25),2);circ(x1,y,u*(1.4+z*.4),null,hexA('#4fb3ff',.6+z*.3));circ(x2,y,u*(1.4-z*.4),null,hexA('#ff8a4c',.6-z*.3))}break;
 case 'heart':{const s=1+.04*Math.sin(T*6);ctx.save();ctx.translate(cx,cy);ctx.scale(s,s);ctx.beginPath();ctx.moveTo(0,u*30);ctx.bezierCurveTo(-u*45,0,-u*30,-u*35,0,-u*15);ctx.bezierCurveTo(u*30,-u*35,u*45,0,0,u*30);ctx.fillStyle=hexA('#ff6b6b',.18);ctx.fill();ctx.strokeStyle=hexA('#ff6b6b',.9);ctx.lineWidth=3;ctx.stroke();
  line(0,-u*15,0,u*28,L(.4),2);line(-u*28,-u*2,u*28,-u*2,L(.4),2);txt('RA',-u*14,-u*10,u*4);txt('LA',u*14,-u*10,u*4);txt('RV',-u*12,u*8,u*4);txt('LV',u*12,u*8,u*4);ctx.restore();break}
 case 'eco':{const n=['🌿','🐛','🐦','🦅'],xs=[.14,.38,.62,.86];xs.forEach((x,i)=>{circ(W*x,cy,u*10,A(.7),hexA('#ffffff',.04));txt(n[i],W*x,cy,u*9,'#fff');if(i<3){line(W*x+u*11,cy,W*xs[i+1]-u*11,cy,L(.5),2);ctx.beginPath();ctx.moveTo(W*xs[i+1]-u*11,cy);ctx.lineTo(W*xs[i+1]-u*14,cy-u*2);ctx.lineTo(W*xs[i+1]-u*14,cy+u*2);ctx.fillStyle=L(.5);ctx.fill()}});
  ['Producer','Primary','Secondary','Tertiary'].forEach((s,i)=>txt(s,W*xs[i],cy+u*16,u*3.6));{const p=(T*.3)%1*(xs[3]-xs[0])+xs[0];circ(W*p,cy-u*14,u*1.2,null,hexA('#f5c451',.9))}break}
 case 'formula':{const F={Physics:['F = ma','E = mc²','v = u + at','P = VI','λ = h/p','W = Fs','KE = ½mv²','V = IR'],Chemistry:['PV = nRT','H₂O','pH = −log[H⁺]','NaCl','C₆H₁₂O₆','ΔG = ΔH − TΔS','CH₄','n = m/M'],
  Mathematics:['a² + b² = c²','sin²θ + cos²θ = 1','∫ x dx','A = πr²','e^iπ + 1 = 0','Σ n','(a+b)²','dy/dx'],Biology:['DNA','ATP','6CO₂ + 6H₂O','A–T  G–C','RNA','O₂','Cell','2n → n']}[subject]||['F = ma','PV = nRT','a² + b² = c²','DNA','E = mc²','pH','πr²','ATP'];
  grid(u*10,.025);F.forEach((f,i)=>{const x=((i*0.37+0.08)%1)*W,y=(((i*0.61+0.1)+T*.012*(1+i%3))%1.1)*H*1.0-H*.05;ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(i)*.15);txt(f,0,0,u*(4+i%3*1.5),i%3?L(.35):A(.6));ctx.restore()});break}
 case 'hex':{const r=u*6,h=r*Math.sqrt(3);for(let row=-1;row*h*.5<H+h;row++)for(let col=-1;col*r*3<W+r*3;col++){const x=col*r*3+(row%2?r*1.5:0),y=row*h*.5;const k=Math.sin(T*.8+col*.9+row*.7);
   ctx.beginPath();for(let a=0;a<6;a++)ctx.lineTo(x+Math.cos(a*Math.PI/3)*r*.92,y+Math.sin(a*Math.PI/3)*r*.92);ctx.closePath();ctx.strokeStyle=L(.1);ctx.lineWidth=1.2;ctx.stroke();if(k>.92){ctx.fillStyle=A(.18);ctx.fill()}}break}
 case 'particles':{const N=46,P=[];for(let i=0;i<N;i++){const sx=(i*0.618)%1,sy=(i*0.377)%1;P.push([((sx+Math.sin(T*.15+i)*.04)%1)*W,((sy+Math.cos(T*.12+i*1.3)*.04)%1)*H])}
   for(let i=0;i<N;i++)for(let j=i+1;j<N;j++){const d=Math.hypot(P[i][0]-P[j][0],P[i][1]-P[j][1]);if(d<u*16)line(P[i][0],P[i][1],P[j][0],P[j][1],A(.25*(1-d/(u*16))),1)}P.forEach((p,i)=>circ(p[0],p[1],u*(.5+i%3*.25),null,i%5?L(.5):A(.9)));break}
 case 'chalk':{ctx.fillStyle='#14181a';ctx.fillRect(0,0,W,H);for(let i=0;i<14;i++){ctx.fillStyle=`rgba(255,255,255,${.012+(i%3)*.006})`;ctx.beginPath();ctx.ellipse(((i*.29)%1)*W,((i*.53)%1)*H,u*(18+i%4*6),u*(6+i%3*3),i,0,7);ctx.fill()}
   ctx.setLineDash([]);const ch=L(.28);line(u*8,H-u*12,u*40,H-u*12,ch,2);line(u*10,H-u*10,u*10,H-u*42,ch,2);ctx.beginPath();for(let x=0;x<=28;x++)ctx.lineTo(u*10+x*u,H-u*12-(x*x)/28*u);ctx.strokeStyle=ch;ctx.stroke();
   ctx.beginPath();ctx.moveTo(W-u*40,H-u*12);ctx.lineTo(W-u*10,H-u*12);ctx.lineTo(W-u*40,H-u*36);ctx.closePath();ctx.stroke();txt('θ',W-u*33,H-u*15,u*3,ch);circ(W*.5,u*16,u*7,ch,null,2);line(W*.5,u*16,W*.5+u*7,u*16,ch,2);txt('r',W*.5+u*3.5,u*13.5,u*2.6,ch);break}
 case 'neuron':circ(u*22,cy,u*10,A(.9),A(.15),3);circ(u*22,cy,u*3.5,null,A(.7));for(let i=0;i<7;i++){const a=i*.9+2;line(u*22+Math.cos(a)*u*10,cy+Math.sin(a)*u*10,u*22+Math.cos(a)*u*20,cy+Math.sin(a)*u*20,A(.7),2)}
  line(u*32,cy,W-u*14,cy,L(.6),u*1.2);for(let k=0;k<6;k++){ctx.fillStyle=hexA('#f5c451',.35);ctx.beginPath();ctx.roundRect(u*38+k*(W-u*58)/6,cy-u*3,(W-u*58)/6-u*2,u*6,u*3);ctx.fill()}
  for(let i=-2;i<=2;i++)line(W-u*14,cy,W-u*5,cy+i*u*6,L(.6),2);{const x=u*32+((T*.4)%1)*(W-u*46);circ(x,cy,u*2,null,'#fff')}break;
 }
}
export function hexA(h: string,a: number){h=h.replace('#','');const n=parseInt(h.length===3?h.split('').map(c=>c+c).join(''):h,16);return`rgba(${n>>16&255},${n>>8&255},${n&255},${a})`}

