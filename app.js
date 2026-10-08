import * as T from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {data,makeModel} from './models.js';
import {trainTypes,makeTrain} from './trains.js';

const $=s=>document.querySelector(s),viewport=$('#viewport');
const coarse=matchMedia('(pointer:coarse)').matches;
let current='escalator',model,renderer,scene,camera,controls,train,sun,hemisphere,bounce,ambient,nightLights,rain,view='overview';
let paused=matchMedia('(prefers-reduced-motion: reduce)').matches,elapsed=0,last=performance.now(),lastUi=-1;
let activeTrain=-1,fallbackMode=false;
let technical=false,walking=false,walkZone='island',yaw=-Math.PI/2,pitch=0,lookPointer=null,previousDimensions=false;
let announcementsOn=false,lastAnnouncementCycle=-1;
const movement=new Set();
const PERIOD=30,CROSSING=12;

const fallbackArt={
  escalator:`<svg viewBox="0 0 800 440" role="img" aria-label="Diagram of the escalator steel support frame with cross bracing and concrete footings">
    <defs><linearGradient id="steel" x2="1" y2="1"><stop stop-color="#9eb5c1"/><stop offset="1" stop-color="#445d6b"/></linearGradient></defs>
    <path d="M0 368h800v72H0z" fill="#c7bdb0"/><path d="M0 347h800v20H0z" fill="#f0cf52"/>
    <path d="M65 92h630v30H65zM90 122h580v12H90z" fill="#d39e93"/><path d="M54 133h600v8H54z" fill="#688a9b"/>
    <path d="M120 230L498 90h30L150 230z" fill="#6b8491" stroke="#344b59" stroke-width="6"/>
    <path d="M135 215L510 82" stroke="#e0e4e1" stroke-width="8"/><path d="M170 365h142v38H170zm318 0h142v38H488z" fill="#aeb9bd"/><path d="M190 339h102v26H190zm318 0h102v26H508z" fill="#d5d7d4"/>
    <g fill="url(#steel)" stroke="#344b59" stroke-width="2"><path d="M225 70h20v270h-20zm318 0h20v270h-20z"/><path d="M225 70h338v15H225zm0 122h338v15H225zm0 132h338v15H225z"/></g>
    <g stroke="#678392" stroke-width="10" fill="none"><path d="M244 88l299 104M543 88L244 192M244 209l299 115M543 209L244 324"/></g>
    <g stroke="#2678a1" stroke-width="2" fill="none"><path d="M225 42h338m-338-8v17m338-17v17M598 70v269m-8-269h17m-17 269h17"/></g>
    <g fill="#1b5e82" font-size="18" font-weight="700" font-family="sans-serif"><text x="350" y="32">3.200 m</text><text x="618" y="210">5.515 m</text></g>
  </svg>`,
  facade:`<svg viewBox="0 0 800 440" role="img" aria-label="Diagram of the curved steel facade frame spanning between concrete columns">
    <path d="M0 0h800v440H0z" fill="#d5d2c9"/><path d="M0 0h800v120H0z" fill="#e8e2d6"/>
    <path d="M165 125h470v205H165z" fill="#c9c6ba"/><path d="M220 155h360v170H220z" fill="#d4d5ce"/>
    <path d="M270 170h35v150h-35zm225 0h35v150h-35z" fill="#aaa99f"/>
    <path d="M350 165h24v155h-24zm76 0h24v155h-24z" fill="#b7b5ab"/>
    <path d="M165 330h470l105 110H60z" fill="#d1cdc3"/>
    <g stroke="#eee9dd" stroke-width="2" fill="none"><path d="M165 330h470m-420 35h370m-325 35h280M280 330L190 440m150-110l-30 110m100-110l15 110m105-110l90 110"/></g>
    <path d="M90 35h80v355H90zm540 0h80v355h-80zM90 35h620v90H90z" fill="#e2ded3"/>
    <path d="M170 117h460v17H170z" fill="#718391" stroke="#394c57" stroke-width="3"/>
    <g stroke="#8195a1" fill="none" stroke-width="16"><path d="M170 325Q400 90 630 325"/><path d="M170 284Q400 72 630 284"/></g>
    <g stroke="#465c68" fill="none" stroke-width="3"><path d="M170 325Q400 90 630 325"/><path d="M170 284Q400 72 630 284"/></g>
    <g stroke="#8c9ea8" stroke-width="12"><path d="M235 125v158m82-158v97m83-97v82m83-82v97m82-97v158"/></g>
    <g fill="#445967"><circle cx="235" cy="204" r="4"/><circle cx="317" cy="180" r="4"/><circle cx="400" cy="170" r="4"/><circle cx="483" cy="180" r="4"/><circle cx="565" cy="204" r="4"/></g>
    <g stroke="#2678a1" stroke-width="2" fill="none"><path d="M165 20h470m-470-8v16m470-16v16M747 87v233m-8-233h16m-16 233h16"/></g>
    <g fill="#1b5e82" font-size="18" font-weight="700" font-family="sans-serif"><text x="350" y="18">8.130 m</text><text x="676" y="212">3.827 m</text></g>
  </svg>`,
  cop:`<svg viewBox="0 0 800 440" role="img" aria-label="Diagram of the 12 metre platform canopy with central steel support and foundation">
    <path d="M125 340h550v40H125z" fill="#bdbdb6"/><path d="M324 370h152v44H324z" fill="#9fa8aa"/>
    <path d="M383 126h34v244h-34z" fill="#536b77"/><path d="M100 145L400 92l300 53v34L400 139 100 179z" fill="#799caf" stroke="#405b69" stroke-width="7"/>
    <g stroke="#5d7784" stroke-width="9" fill="none"><path d="M400 136L110 177M400 136l290 41M400 165L155 220M400 165l245 55"/></g>
    <g stroke="#2678a1" stroke-width="2" fill="none"><path d="M100 64h600m-600-9v18m600-18v18M324 425h152m-152-9v18m152-18v18"/></g>
    <g fill="#1b5e82" font-size="18" font-weight="700" font-family="sans-serif"><text x="350" y="53">12.000 m span</text><text x="350" y="422">3.600 m</text></g>
  </svg>`
};
function renderFallback(){const art=$('#fallback-art');if(art)art.innerHTML=fallbackArt[current];}

function syncPause(){const b=$('#pause');b.textContent=paused?'Resume':'Pause';b.setAttribute('aria-pressed',String(paused));}
function info(){const d=data[current];$('#project-title').textContent=d.title;$('#project-description').textContent=d.description;$('#scene-id').textContent=d.label;$('#dimension-list').replaceChildren(...d.rows.map(([name,value])=>{const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=name;dd.textContent=value;row.append(dt,dd);return row;}));$('#source-note').textContent=d.note;$('#placement').textContent=d.placement;
const pdfUrl='assets/'+encodeURIComponent(d.pdf),imageUrl='assets/'+encodeURIComponent(d.image);
$('#pdf-link').href=pdfUrl;$('#pdf-download').href=pdfUrl;$('#pdf-download').download=d.pdf;
$('#board-image').src=imageUrl;$('#board-image').alt=d.alt;
document.querySelectorAll('[data-project]').forEach(b=>{const yes=b.dataset.project===current;b.classList.toggle('selected',yes);b.setAttribute('aria-pressed',String(yes));});}
function updateVisibility(){
  if(!model)return;
  for(const [id,item] of Object.entries(model.structures)){
    item.group.visible=$('#show-'+id).checked;
    item.dims.visible=$('#dimensions').checked&&id===current;
  }
  model.ohe.visible=$('#overhead').checked;
  model.landscape.visible=$('#landscape').checked&&view!=='section'&&!technical;
  model.bridge.visible=$('#show-escalator').checked;
}
function pose(which='overview'){view=which;if(!camera||!model)return;const f=model.focus;if(which==='overview'){camera.position.set(f.x+(current==='facade'?25:21),f.y+11,f.z+(current==='facade'?-32:27));controls.target.copy(f);}else if(which==='platform'){camera.position.set(f.x+11,f.y+2.5,f.z+(current==='facade'?15:-17));controls.target.copy(f);}else if(which==='section'){camera.position.set(f.x+14,f.y+3,f.z+(current==='facade'?-9:8));controls.target.copy(f);}else{camera.position.set(f.x+.01,f.y+27,f.z+.01);controls.target.set(f.x,0,f.z);}controls.update();updateVisibility();document.querySelectorAll('[data-view]').forEach(b=>{const yes=b.dataset.view===which;b.classList.toggle('active',yes);b.setAttribute('aria-pressed',String(yes));});}
const zones={
  island:{x:-26,z:0,minX:-76,maxX:76,minZ:-4.28,maxZ:4.28,floor:.56,title:'Island platform · 2 / 3'},
  main:{x:0,z:-12.35,minX:-76,maxX:76,minZ:-13.95,maxZ:-10.85,floor:.56,title:'Station platform · 1'},
  concourse:{x:0,z:-24,minX:-9.2,maxX:9.2,minZ:-28.35,maxZ:-14.65,floor:.38,title:'Station concourse'},
  forecourt:{x:0,z:-36,minX:-38,maxX:38,minZ:-43,maxZ:-30.1,floor:.3,title:'Station forecourt'}
};
function walkPlacement(){
  if(!camera)return;const zone=zones[walkZone];
  camera.position.set(zone.x,zone.floor+1.65,zone.z);
  yaw=walkZone==='forecourt'?Math.PI:walkZone==='concourse'?0:-Math.PI/2;pitch=0;
  camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);
  $('#platform-readout').textContent=zone.title;
}
function enterWalk(){
  if(!camera||fallbackMode)return;walking=true;movement.clear();controls.enabled=false;
  camera.fov=64;camera.updateProjectionMatrix();walkPlacement();
  $('.viewer-card').classList.add('walking');$('#walk-pad').hidden=false;
  $('#walk-mode').classList.add('active');$('#orbit-mode').classList.remove('active');
  $('#walk-mode').setAttribute('aria-pressed','true');$('#orbit-mode').setAttribute('aria-pressed','false');
  $('.viewer-help .desktop-help').textContent='WASD or arrows to walk · Drag to look · Choose an area above';
  $('.viewer-help .touch-help').textContent='Use arrows to walk · Drag the scene to look';
}
function leaveWalk(){
  if(!walking)return;walking=false;movement.clear();lookPointer=null;controls.enabled=true;
  camera.fov=42;camera.updateProjectionMatrix();$('.viewer-card').classList.remove('walking');
  $('#walk-pad').hidden=true;$('#walk-mode').classList.remove('active');$('#orbit-mode').classList.add('active');
  $('#walk-mode').setAttribute('aria-pressed','false');$('#orbit-mode').setAttribute('aria-pressed','true');
  $('.viewer-help .desktop-help').textContent='Drag to orbit · Scroll to zoom';
  $('.viewer-help .touch-help').textContent='Drag to rotate · Pinch to zoom';
  $('#platform-readout').textContent='Kota Junction · '+data[current].title;
}
function moveWalk(dt){
  if(!walking)return;
  let f=Number(movement.has('forward'))-Number(movement.has('back'));
  let r=Number(movement.has('right'))-Number(movement.has('left'));
  if(!f&&!r)return;const len=Math.hypot(f,r);f/=len;r/=len;
  const zone=zones[walkZone],speed=movement.has('sprint')?7:4.2;
  let x=camera.position.x+(-Math.sin(yaw)*f+Math.cos(yaw)*r)*dt*speed;
  let z=camera.position.z+(-Math.cos(yaw)*f-Math.sin(yaw)*r)*dt*speed;
  z=Math.max(zone.minZ,Math.min(zone.maxZ,z));
  const sideLimit=walkZone==='concourse'&&z<-26.2?3.48:zone.maxX;
  x=Math.max(walkZone==='concourse'&&z<-26.2?-3.48:zone.minX,Math.min(sideLimit,x));
  const obstacles=[];
  if(walkZone==='concourse')for(const cx of [-8.4,8.4])for(const cz of [-24,-19.2])obstacles.push([cx,cz,.76,.76]);
  if(walkZone==='island'){
    obstacles.push([-35,-.1,1.15,4.2],[25,0,.55,.55],[65,1.5,1.8,1.3]);
    for(const cx of [-48,-32,19,36,52])obstacles.push([cx,1.8,1.35,.56]);
  }
  if(walkZone==='forecourt')for(const cx of [-25,-17,17,25])obstacles.push([cx,-36,1.2,1.2]);
  if(obstacles.some(([cx,cz,rx,rz])=>Math.abs(x-cx)<rx&&Math.abs(z-cz)<rz)){
    x=camera.position.x;z=camera.position.z;
  }
  camera.position.set(x,zone.floor+1.65,z);
}
function setTechnical(){
  technical=$('#technical-mode').getAttribute('aria-pressed')!=='true';
  $('#technical-mode').setAttribute('aria-pressed',String(technical));
  $('.viewer-card').classList.toggle('technical',technical);
  if(technical){previousDimensions=$('#dimensions').checked;$('#dimensions').checked=true;}
  else $('#dimensions').checked=previousDimensions;
  updateVisibility();applyAtmosphere();
}
function setGraphics(){
  if(!renderer||!sun)return;
  const level=$('#graphics').value;
  const max={low:.8,medium:1.15,high:1.65,ultra:2}[level];
  renderer.setPixelRatio(Math.min(devicePixelRatio,max));
  const shadows=level==='ultra'||level==='high'||(level==='medium'&&!coarse);
  renderer.shadowMap.enabled=shadows;sun.castShadow=shadows;
  const size={low:512,medium:1024,high:2048,ultra:3072}[level];
  if(sun.shadow.mapSize.x!==size){sun.shadow.map?.dispose();sun.shadow.map=null;sun.shadow.mapSize.set(size,size);}
  resize();
}
function applyAtmosphere(){
  if(!scene)return;
  const time=$('#time-of-day').value,weather=$('#weather').value;
  const settings={day:['#bfd8e8','#c9d9d9',2.25,1.15,.48],dusk:['#bd9c91','#bca997',1.12,.78,.32],night:['#172b40','#31455a',.22,.42,.15]}[time];
  scene.background=new T.Color(technical?'#dce8ed':weather==='rain'?'#8599a5':settings[0]);
  const fogColour=technical?'#dce8ed':weather==='rain'?'#9daeb5':settings[1];
  scene.fog=new T.Fog(fogColour,weather==='clear'?90:weather==='haze'?48:38,weather==='clear'?205:weather==='haze'?135:115);
  sun.intensity=settings[2]*(weather==='rain'?.58:1);
  hemisphere.intensity=settings[3]*(weather==='rain'?.78:1);
  bounce.intensity=settings[4];ambient.intensity=time==='night'?.18:.1;
  nightLights.visible=time==='night'||time==='dusk';rain.visible=weather==='rain'&&!technical;
}
function disposeGroup(group){group.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.isSprite||o.userData.disposeMaterial){o.material.map?.dispose();o.material.dispose();}});}
function select(id){current=id;$('#show-'+id).checked=true;info();renderFallback();$('#platform-readout').textContent='Kota Junction · '+data[id].title;if(!scene)return;if(!model){model=makeModel(id);scene.add(model.group);}model.focus=model.structures[id].focus;if(sun){sun.position.copy(model.focus).add(new T.Vector3(-25,36,-19));sun.target.position.copy(model.focus);sun.target.updateMatrixWorld();}if(train)train.position.set(-115,model.railY,model.trainZ);if(walking)leaveWalk();pose('overview');}
function trainIndex(){const chosen=$('#train-type').value;return chosen==='auto'?((Math.floor(elapsed/PERIOD)%trainTypes.length)+trainTypes.length)%trainTypes.length:Math.max(0,trainTypes.findIndex(t=>t.id===chosen));}
function syncTrain(force=false){const index=trainIndex();if(index===activeTrain&&!force)return;activeTrain=index;$('#train-name').textContent=trainTypes[index].name;$('#train-kind').textContent=trainTypes[index].kind;$('#train-icon').textContent=({vande:'VB',rajdhani:'RA',shatabdi:'SH',duronto:'DU',tejas:'TE',mail:'EX',memu:'ME',freight:'FR'})[trainTypes[index].id];$('#fallback-rolling').dataset.type=trainTypes[index].id;if(!scene)return;if(train){scene.remove(train);disposeGroup(train);}train=makeTrain(trainTypes[index].id);scene.add(train);train.position.set(-115,model?.railY??.16,model?.trainZ??-8);}
function resize(){if(!renderer)return;const w=viewport.clientWidth,h=viewport.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
function animate(now){const dt=Math.max(0,Math.min((now-last)/1000,.1));last=now;if(!paused&&!document.hidden)elapsed+=dt;syncTrain();const t=elapsed%PERIOD;train.visible=t<CROSSING;train.position.x=-115+t/CROSSING*260;if(walking)moveWalk(dt);else controls.update();if(rain.visible){rain.position.set(camera.position.x,0,camera.position.z);const a=rain.geometry.attributes.position;for(let i=0;i<a.count;i++){let y=a.getY(i)-dt*10;if(y<.5)y+=14;a.setY(i,y);}a.needsUpdate=true;}renderer.render(scene,camera);const cycle=Math.floor(elapsed/90);if(announcementsOn&&cycle>0&&cycle!==lastAnnouncementCycle){lastAnnouncementCycle=cycle;announce();}const tick=Math.floor(elapsed*4);if(tick!==lastUi||paused){$('#train-status').textContent=paused?'Animation paused':t<CROSSING?'Passing through Kota Junction':`Next train in ${Math.ceil(PERIOD-t)} seconds`;$('#progress').style.width=`${t/PERIOD*100}%`;lastUi=tick;}requestAnimationFrame(animate);}
function animateFallback(now){if(!fallbackMode)return;const dt=Math.max(0,Math.min((now-last)/1000,.1));last=now;if(!paused&&!document.hidden)elapsed+=dt;syncTrain();const t=elapsed%PERIOD,car=$('#fallback-rolling');car.style.display=t<CROSSING?'flex':'none';car.style.left=(-410+t/CROSSING*(viewport.clientWidth+470))+'px';const tick=Math.floor(elapsed*4);if(tick!==lastUi||paused){$('#train-status').textContent=paused?'Animation paused':t<CROSSING?'Passing through Kota Junction':`Next train in ${Math.ceil(PERIOD-t)} seconds`;$('#progress').style.width=`${t/PERIOD*100}%`;lastUi=tick;}requestAnimationFrame(animateFallback);}

info();
try{
  if(coarse)$('#graphics').value='medium';
  renderer=new T.WebGLRenderer({antialias:!coarse,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,coarse?1.15:1.65));renderer.setClearColor('#bfd8e8');renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.28;renderer.shadowMap.enabled=!coarse;renderer.shadowMap.type=T.PCFSoftShadowMap;viewport.prepend(renderer.domElement);renderer.domElement.setAttribute('aria-label','Interactive Kota Station structural model. Drag to rotate and pinch or scroll to zoom.');renderer.domElement.setAttribute('role','img');
  scene=new T.Scene();scene.background=new T.Color('#bfd8e8');scene.fog=new T.Fog('#c9d9d9',85,205);
  const pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(new RoomEnvironment()).texture;scene.environmentIntensity=.42;pmrem.dispose();
  hemisphere=new T.HemisphereLight('#e9f3ff','#8d846e',1.15);scene.add(hemisphere);sun=new T.DirectionalLight('#fff1d9',2.25);sun.castShadow=!coarse;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-38;sun.shadow.camera.right=38;sun.shadow.camera.top=34;sun.shadow.camera.bottom=-34;sun.shadow.normalBias=.025;sun.shadow.bias=-.00015;sun.shadow.radius=2;scene.add(sun,sun.target);bounce=new T.DirectionalLight('#d9e9fa',.48);bounce.position.set(18,14,22);scene.add(bounce);ambient=new T.AmbientLight('#ffffff',.1);scene.add(ambient);
  nightLights=new T.Group();for(const [x,y,z,power] of [[-35,5,0,24],[-15,5,0,18],[10,5,0,18],[30,5,0,24],[0,4.8,-23,26],[0,5,-17,20]]){const light=new T.PointLight('#ffe4ae',power,17,2);light.position.set(x,y,z);nightLights.add(light);}scene.add(nightLights);
  const drops=new Float32Array(900);let seed=2017;for(let i=0;i<drops.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;drops[i]=(seed/4294967296-.5)*32;if(i%3===1)drops[i]=(seed/4294967296)*14;}
  rain=new T.Points(new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(drops,3)),new T.PointsMaterial({color:'#d6e9f5',size:.055,transparent:true,opacity:.65,depthWrite:false}));scene.add(rain);
  camera=new T.PerspectiveCamera(42,1,.1,400);controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.075;controls.minDistance=3;controls.maxDistance=75;controls.maxPolarAngle=Math.PI*.49;controls.enablePan=true;controls.screenSpacePanning=true;
  select(current);syncTrain();setGraphics();applyAtmosphere();resize();new ResizeObserver(resize).observe(viewport);$('#loading').hidden=true;syncPause();requestAnimationFrame(animate);
  renderer.domElement.addEventListener('pointerdown',e=>{if(!walking)return;lookPointer={id:e.pointerId,x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);});
  renderer.domElement.addEventListener('pointermove',e=>{if(!walking||lookPointer?.id!==e.pointerId)return;yaw-=(e.clientX-lookPointer.x)*.004;pitch=Math.max(-1.3,Math.min(1.3,pitch-(e.clientY-lookPointer.y)*.004));camera.rotation.set(pitch,yaw,0);lookPointer.x=e.clientX;lookPointer.y=e.clientY;});
  renderer.domElement.addEventListener('pointerup',()=>{lookPointer=null;});renderer.domElement.addEventListener('pointercancel',()=>{lookPointer=null;});
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();renderFallback();$('#fallback').hidden=false;$('#fallback').querySelector('h2').textContent='The 3D view was interrupted.';$('#fallback').querySelector('p').textContent='Reload to restore it, or use the visualisation and PDF below.';});
}catch(error){console.error('3D scene unavailable:',error);$('#loading').hidden=true;renderFallback();$('#fallback').hidden=false;fallbackMode=true;for(const el of [$('#dimensions'),$('#overhead'),$('#landscape'),$('#show-facade'),$('#show-escalator'),$('#show-cop'),$('#zoom-in'),$('#zoom-out'),$('#reset'),$('#walk-mode'),$('#orbit-mode'),$('#walk-zone'),$('#technical-mode'),$('#graphics'),$('#time-of-day'),$('#weather'),...document.querySelectorAll('[data-view]')])el.disabled=true;syncTrain(true);syncPause();requestAnimationFrame(animateFallback);}

document.querySelectorAll('[data-project]').forEach(b=>b.addEventListener('click',()=>select(b.dataset.project)));
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{if(walking)leaveWalk();pose(b.dataset.view);}));
for(const id of ['dimensions','overhead','landscape','show-facade','show-escalator','show-cop'])$('#'+id).addEventListener('change',updateVisibility);
$('#walk-mode').addEventListener('click',enterWalk);
$('#orbit-mode').addEventListener('click',()=>{leaveWalk();pose('overview');});
$('#walk-zone').addEventListener('change',e=>{walkZone=e.target.value;if(walking)walkPlacement();else $('#platform-readout').textContent=zones[walkZone].title;});
$('#technical-mode').addEventListener('click',setTechnical);
$('#graphics').addEventListener('change',setGraphics);
for(const id of ['time-of-day','weather'])$('#'+id).addEventListener('change',applyAtmosphere);
function announce(){if(!('speechSynthesis' in window))return;window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance('Welcome to Kota Junction. Please stay behind the yellow safety line and use the foot overbridge to reach other platforms.');utterance.rate=.9;utterance.volume=.65;window.speechSynthesis.speak(utterance);}
$('#announcements').addEventListener('click',()=>{announcementsOn=!announcementsOn;$('#announcements').setAttribute('aria-pressed',String(announcementsOn));$('#announcements').textContent=announcementsOn?'Announcements on':'Announcements off';if(announcementsOn)announce();else window.speechSynthesis?.cancel();});
if(!('speechSynthesis' in window))$('#announcements').disabled=true;
const keyActions={KeyW:'forward',ArrowUp:'forward',KeyS:'back',ArrowDown:'back',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',ShiftLeft:'sprint',ShiftRight:'sprint'};
window.addEventListener('keydown',e=>{if(e.code==='Escape'&&walking){leaveWalk();pose('overview');return;}if(!walking||!keyActions[e.code]||['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;e.preventDefault();movement.add(keyActions[e.code]);});
window.addEventListener('keyup',e=>{if(keyActions[e.code])movement.delete(keyActions[e.code]);});
window.addEventListener('blur',()=>movement.clear());
for(const b of document.querySelectorAll('[data-move]')){b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);movement.add(b.dataset.move);});for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,()=>movement.delete(b.dataset.move));}
$('#pause').addEventListener('click',()=>{paused=!paused;lastUi=-1;syncPause();});
$('#train-type').addEventListener('change',()=>{elapsed=Math.floor(elapsed/PERIOD)*PERIOD;syncTrain(true);paused=false;lastUi=-1;syncPause();});
$('#run-train').addEventListener('click',()=>{elapsed=Math.floor(elapsed/PERIOD)*PERIOD;paused=false;lastUi=-1;syncPause();});
$('#next-train').addEventListener('click',()=>{$('#train-type').value='auto';elapsed=(Math.floor(elapsed/PERIOD)+1)*PERIOD;syncTrain(true);paused=false;lastUi=-1;syncPause();});
$('#reset').addEventListener('click',()=>pose('overview'));
for(const [id,m] of [['zoom-in',.78],['zoom-out',1.28]])$('#'+id).addEventListener('click',()=>{if(!camera)return;const offset=camera.position.clone().sub(controls.target);offset.multiplyScalar(m).clampLength(controls.minDistance,controls.maxDistance);camera.position.copy(controls.target).add(offset);controls.update();});
$('#fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if($('.viewer-card').requestFullscreen)await $('.viewer-card').requestFullscreen();else viewport.scrollIntoView({block:'start'});}catch{viewport.scrollIntoView({block:'start'});}});


const dialog=$('#image-dialog');let zoom=100;
function showBoard(){const d=data[current];$('#large-image').src='assets/'+encodeURIComponent(d.image);$('#large-image').alt=d.alt;$('#dialog-title').textContent=d.title+' · Dimensioned 3D view';zoom=100;$('#large-image').style.width='100%';dialog.showModal();}
$('#board-button').addEventListener('click',showBoard);
$('#expand-board').addEventListener('click',showBoard);
$('#close-dialog').addEventListener('click',()=>dialog.close());
for(const [id,v] of [['image-plus',50],['image-minus',-50]])$('#'+id).addEventListener('click',()=>{zoom=Math.max(100,Math.min(400,zoom+v));$('#large-image').style.width=zoom+'%';});
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});

