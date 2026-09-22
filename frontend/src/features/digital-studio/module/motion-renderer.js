import * as THREE from './three.module.js';
// Original procedural geometry. Prototype engine reused; no remote assets or scripts.
export function mountMotion(el, config) {
  const renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#091b2e');
  const camera = new THREE.PerspectiveCamera(40,1,.1,100);
  scene.add(new THREE.HemisphereLight('#b8ddff','#203e57',2));
  const light = new THREE.DirectionalLight('#ffffff',4); light.position.set(4,10,5); scene.add(light);
  const group = new THREE.Group();scene.add(group);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(14,.2,12),new THREE.MeshStandardMaterial({color:'#16394f',roughness:.5}));floor.position.y=-.2;scene.add(floor);
  scene.add(new THREE.GridHelper(12,24,'#3f7490','#244b64'));
  const scale = 8/Math.max(config.firstLeg,config.secondLeg);
  const point = (p) => {const d=p*(config.firstLeg+config.secondLeg);return new THREE.Vector3(-config.firstLeg*scale/2+Math.min(d,config.firstLeg)*scale,.35,config.secondLeg*scale/2-Math.max(0,d-config.firstLeg)*scale);};
  const route = new THREE.Line(new THREE.BufferGeometry().setFromPoints([point(0),point(config.firstLeg/(config.firstLeg+config.secondLeg)),point(1)]),new THREE.LineBasicMaterial({color:'#76c6ef'}));scene.add(route);
  const traveller = new THREE.Group();scene.add(traveller);
  const part=(geometry,color,x,y,z)=>{const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,metalness:.45,roughness:.28}));mesh.position.set(x,y,z);traveller.add(mesh);return mesh;};
  part(new THREE.BoxGeometry(1.1,.3,.6),'#d3edfa',0,.2,0);
  part(new THREE.BoxGeometry(.5,.35,.5),config.color,-.1,.5,0);
  for(const x of [-.35,.35])for(const z of [-.36,.36]){const wheel=part(new THREE.CylinderGeometry(.2,.2,.12,24),'#172435',x,0,z);wheel.rotation.x=Math.PI/2;}
  for(const z of [-.2,.2])part(new THREE.SphereGeometry(.06,12,8),'#ffe9a3',.57,.25,z);
  const vector = new THREE.ArrowHelper(new THREE.Vector3(1,0,0),point(0),.001,'#ffce70',.3,.15);scene.add(vector);
  const resize = () => {const w=Math.max(1,el.clientWidth),h=Math.max(1,el.clientHeight);renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();};
  el.appendChild(renderer.domElement); renderer.domElement.setAttribute('aria-label','Three-dimensional right-angle journey');renderer.domElement.setAttribute('role','img');
  let progress=0,disposed=false,orbitOffset=0;
  const draw = (p) => {if(disposed)return;progress=p;traveller.position.copy(point(p));traveller.rotation.y=p*(config.firstLeg+config.secondLeg)>config.firstLeg?Math.PI/2:0;const delta=point(p).sub(point(0));vector.setDirection(delta.length()>0?delta.clone().normalize():new THREE.Vector3(1,0,0));vector.setLength(Math.max(.001,delta.length()),.3,.15);const angle=(config.yaw+orbitOffset+(config.cinematic&&!window.matchMedia("(prefers-reduced-motion: reduce)").matches?p*40:0))*Math.PI/180,e=config.elevation*Math.PI/180;camera.position.set(17*Math.cos(e)*Math.sin(angle),17*Math.sin(e),17*Math.cos(e)*Math.cos(angle));camera.lookAt(0,0,0);renderer.render(scene,camera);};
  const observer=new ResizeObserver(()=>{resize();draw(progress);});observer.observe(el);resize();draw(0);
  return {draw,orbit(delta){orbitOffset+=delta;draw(progress);},dispose(){disposed=true;observer.disconnect();scene.traverse((o)=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});renderer.dispose();renderer.domElement.remove();}};
}
