import * as T from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {data,makeModel,makeTrain} from './models.js';

const $=s=>document.querySelector(s),viewport=$('#viewport');
const coarse=matchMedia('(pointer:coarse)').matches;
let current='escalator',model,renderer,scene,camera,controls,train,view='overview';
let paused=matchMedia('(prefers-reduced-motion: reduce)').matches,elapsed=0,last=performance.now(),lastUi=-1;
const PERIOD=30,CROSSING=12;

function syncPause(){const b=$('#pause');b.textContent=paused?'Resume':'Pause';b.setAttribute('aria-pressed',String(paused));}
function info(){const d=data[current];$('#project-title').textContent=d.title;$('#project-description').textContent=d.description;$('#scene-id').textContent=d.label;$('#dimension-list').replaceChildren(...d.rows.map(([name,value])=>{const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=name;dd.textContent=value;row.append(dt,dd);return row;}));$('#source-note').textContent=d.note;document.querySelectorAll('[data-project]').forEach(b=>{const yes=b.dataset.project===current;b.classList.toggle('selected',yes);b.setAttribute('aria-pressed',String(yes));});}
function updateVisibility(){if(!model)return;model.dims.visible=$('#dimensions').checked;model.ohe.visible=$('#overhead').checked;model.landscape.visible=$('#landscape').checked&&view!=='section';}
function pose(which='overview'){view=which;if(!camera||!model)return;const f=model.focus;if(which==='overview'){camera.position.set(18,12,21);controls.target.copy(f);}else if(which==='platform'){camera.position.set(12,4.2,-16);controls.target.set(f.x,f.y*.7,f.z);}else if(which==='section'){camera.position.set(14,5.5,.2);controls.target.copy(f);}else{camera.position.set(.01,28,.01);controls.target.set(f.x,0,f.z);}controls.update();updateVisibility();document.querySelectorAll('[data-view]').forEach(b=>{const yes=b.dataset.view===which;b.classList.toggle('active',yes);b.setAttribute('aria-pressed',String(yes));});}
function disposeGroup(group){group.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.isSprite){o.material.map?.dispose();o.material.dispose();}});}
function select(id){current=id;info();if(!scene)return;if(model){scene.remove(model.group);disposeGroup(model.group);}model=makeModel(id);scene.add(model.group);train.position.set(-115,model.railY,model.trainZ);pose('overview');elapsed=0;}
function resize(){if(!renderer)return;const w=viewport.clientWidth,h=viewport.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
function animate(now){const dt=Math.min((now-last)/1000,.1);last=now;if(!paused&&!document.hidden)elapsed+=dt;const t=elapsed%PERIOD;train.visible=t<CROSSING;train.position.x=-115+t/CROSSING*260;controls.update();renderer.render(scene,camera);const tick=Math.floor(elapsed*4);if(tick!==lastUi||paused){$('#train-status').textContent=paused?'Animation paused':t<CROSSING?'Passing through Kota Station':`Next train in ${Math.ceil(PERIOD-t)} seconds`;$('#progress').style.width=`${t/PERIOD*100}%`;lastUi=tick;}requestAnimationFrame(animate);}

info();
try{
  renderer=new T.WebGLRenderer({antialias:!coarse,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,coarse?1.15:1.65));renderer.setClearColor('#bfe3fa');renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;renderer.shadowMap.enabled=!coarse;renderer.shadowMap.type=T.PCFSoftShadowMap;viewport.prepend(renderer.domElement);renderer.domElement.setAttribute('aria-label','Interactive Kota Station structural model. Drag to rotate and pinch or scroll to zoom.');renderer.domElement.setAttribute('role','img');
  scene=new T.Scene();scene.background=new T.Color('#bfe3fa');scene.fog=new T.Fog('#c9e3ec',75,190);scene.add(new T.HemisphereLight('#e9f6ff','#75856a',2.15));const sun=new T.DirectionalLight('#fff6df',3.3);sun.position.set(-22,32,-18);sun.castShadow=!coarse;sun.shadow.mapSize.set(coarse?512:1536,coarse?512:1536);sun.shadow.camera.left=-35;sun.shadow.camera.right=35;sun.shadow.camera.top=30;sun.shadow.camera.bottom=-30;scene.add(sun);scene.add(new T.AmbientLight('#ffffff',.26));
  camera=new T.PerspectiveCamera(42,1,.1,400);controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.075;controls.minDistance=3;controls.maxDistance=75;controls.maxPolarAngle=Math.PI*.49;controls.enablePan=true;controls.screenSpacePanning=true;
  train=makeTrain();scene.add(train);select(current);resize();new ResizeObserver(resize).observe(viewport);$('#loading').hidden=true;syncPause();requestAnimationFrame(animate);
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('#fallback').hidden=false;$('#fallback').querySelector('h2').textContent='The 3D view was interrupted.';$('#fallback').querySelector('p').textContent='Reload to restore it, or use the visualisation and PDF below.';});
}catch(error){console.error('3D scene unavailable:',error);$('#loading').hidden=true;$('#fallback').hidden=false;$('#train-status').textContent='3D animation unavailable';for(const el of [$('#pause'),$('#run-train'),$('#dimensions'),$('#overhead'),$('#landscape'),$('#zoom-in'),$('#zoom-out'),$('#reset')])el.disabled=true;}

document.querySelectorAll('[data-project]').forEach(b=>b.addEventListener('click',()=>select(b.dataset.project)));
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>pose(b.dataset.view)));
for(const id of ['dimensions','overhead','landscape'])$('#'+id).addEventListener('change',updateVisibility);
$('#pause').addEventListener('click',()=>{paused=!paused;lastUi=-1;syncPause();});
$('#run-train').addEventListener('click',()=>{elapsed=0;paused=false;lastUi=-1;syncPause();});
$('#reset').addEventListener('click',()=>pose('overview'));
for(const [id,m] of [['zoom-in',.78],['zoom-out',1.28]])$('#'+id).addEventListener('click',()=>{if(!camera)return;const offset=camera.position.clone().sub(controls.target);offset.multiplyScalar(m).clampLength(controls.minDistance,controls.maxDistance);camera.position.copy(controls.target).add(offset);controls.update();});
$('#fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if($('.viewer-card').requestFullscreen)await $('.viewer-card').requestFullscreen();else viewport.scrollIntoView({block:'start'});}catch{viewport.scrollIntoView({block:'start'});}});

