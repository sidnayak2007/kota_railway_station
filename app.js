import * as T from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {data,makeModel,makeTrain} from './models.js';

const $=s=>document.querySelector(s),viewport=$('#viewport');
const coarse=matchMedia('(pointer:coarse)').matches;
let current='escalator',model,renderer,scene,camera,controls,train,view='overview';
let paused=matchMedia('(prefers-reduced-motion: reduce)').matches,elapsed=0,last=performance.now(),lastUi=-1;
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
    <path d="M0 0h800v440H0z" fill="#e7d0b8"/><path d="M0 350h800v90H0z" fill="#c9bdac"/><path d="M0 0h800v80H0z" fill="#c9998b"/>
    <path d="M0 80h800v13H0z" fill="#f5e0c2"/><path d="M50 93h700v300H50z" fill="#d3a396"/>
    <path d="M170 320h460v72H170z" fill="#34484c"/><path d="M90 42h80v350H90zm540 0h80v350h-80zM90 42h620v45H90z" fill="#e9d1ba"/>
    <g stroke="#566f7e" fill="none" stroke-width="15"><path d="M165 320Q400 95 635 320"/><path d="M165 276Q400 67 635 276"/><path d="M165 238Q400 55 635 238"/></g>
    <g stroke="#819ba8" stroke-width="8"><path d="M260 187v91m94-147v92m92-92v92m94-36v91"/></g>
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
function updateVisibility(){if(!model)return;model.dims.visible=$('#dimensions').checked;model.ohe.visible=$('#overhead').checked;model.landscape.visible=$('#landscape').checked&&view!=='section';}
function pose(which='overview'){view=which;if(!camera||!model)return;const f=model.focus;if(which==='overview'){camera.position.set(f.x+17,f.y+10,f.z+(current==='facade'?-21:22));controls.target.copy(f);}else if(which==='platform'){camera.position.set(f.x+11,f.y+2.5,f.z+(current==='facade'?15:-17));controls.target.copy(f);}else if(which==='section'){camera.position.set(f.x+14,f.y+3,f.z+(current==='facade'?-9:8));controls.target.copy(f);}else{camera.position.set(f.x+.01,f.y+27,f.z+.01);controls.target.set(f.x,0,f.z);}controls.update();updateVisibility();document.querySelectorAll('[data-view]').forEach(b=>{const yes=b.dataset.view===which;b.classList.toggle('active',yes);b.setAttribute('aria-pressed',String(yes));});}
function disposeGroup(group){group.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.isSprite){o.material.map?.dispose();o.material.dispose();}});}
function select(id){current=id;info();renderFallback();if(!scene)return;if(model){scene.remove(model.group);disposeGroup(model.group);}model=makeModel(id);scene.add(model.group);train.position.set(-115,model.railY,model.trainZ);pose('overview');elapsed=0;}
function resize(){if(!renderer)return;const w=viewport.clientWidth,h=viewport.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
function animate(now){const dt=Math.min((now-last)/1000,.1);last=now;if(!paused&&!document.hidden)elapsed+=dt;const t=elapsed%PERIOD;train.visible=t<CROSSING;train.position.x=-115+t/CROSSING*260;controls.update();renderer.render(scene,camera);const tick=Math.floor(elapsed*4);if(tick!==lastUi||paused){$('#train-status').textContent=paused?'Animation paused':t<CROSSING?'Passing through Kota Station':`Next train in ${Math.ceil(PERIOD-t)} seconds`;$('#progress').style.width=`${t/PERIOD*100}%`;lastUi=tick;}requestAnimationFrame(animate);}

info();
try{
  renderer=new T.WebGLRenderer({antialias:!coarse,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,coarse?1.15:1.65));renderer.setClearColor('#bfe3fa');renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;renderer.shadowMap.enabled=!coarse;renderer.shadowMap.type=T.PCFSoftShadowMap;viewport.prepend(renderer.domElement);renderer.domElement.setAttribute('aria-label','Interactive Kota Station structural model. Drag to rotate and pinch or scroll to zoom.');renderer.domElement.setAttribute('role','img');
  scene=new T.Scene();scene.background=new T.Color('#bfe3fa');scene.fog=new T.Fog('#c9e3ec',75,190);scene.add(new T.HemisphereLight('#e9f6ff','#75856a',2.15));const sun=new T.DirectionalLight('#fff6df',3.3);sun.position.set(-22,32,-18);sun.castShadow=!coarse;sun.shadow.mapSize.set(coarse?512:1536,coarse?512:1536);sun.shadow.camera.left=-35;sun.shadow.camera.right=35;sun.shadow.camera.top=30;sun.shadow.camera.bottom=-30;scene.add(sun);scene.add(new T.AmbientLight('#ffffff',.26));
  camera=new T.PerspectiveCamera(42,1,.1,400);controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.075;controls.minDistance=3;controls.maxDistance=75;controls.maxPolarAngle=Math.PI*.49;controls.enablePan=true;controls.screenSpacePanning=true;
  train=makeTrain();scene.add(train);select(current);resize();new ResizeObserver(resize).observe(viewport);$('#loading').hidden=true;syncPause();requestAnimationFrame(animate);
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();renderFallback();$('#fallback').hidden=false;$('#fallback').querySelector('h2').textContent='The 3D view was interrupted.';$('#fallback').querySelector('p').textContent='Reload to restore it, or use the visualisation and PDF below.';});
}catch(error){console.error('3D scene unavailable:',error);$('#loading').hidden=true;renderFallback();$('#fallback').hidden=false;$('#train-status').textContent='3D animation unavailable';for(const el of [$('#pause'),$('#run-train'),$('#dimensions'),$('#overhead'),$('#landscape'),$('#zoom-in'),$('#zoom-out'),$('#reset')])el.disabled=true;}

document.querySelectorAll('[data-project]').forEach(b=>b.addEventListener('click',()=>select(b.dataset.project)));
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>pose(b.dataset.view)));
for(const id of ['dimensions','overhead','landscape'])$('#'+id).addEventListener('change',updateVisibility);
$('#pause').addEventListener('click',()=>{paused=!paused;lastUi=-1;syncPause();});
$('#run-train').addEventListener('click',()=>{elapsed=0;paused=false;lastUi=-1;syncPause();});
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
