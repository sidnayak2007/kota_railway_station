import * as T from 'three';

const cache={};
function mat(color,metalness=.1,roughness=.72,extra={}){const key=`${color}-${metalness}-${roughness}-${JSON.stringify(extra)}`;return cache[key]??=new T.MeshStandardMaterial({color,metalness,roughness,...extra});}
function textured(base,variation,repeatX=3,repeatY=3,roughness=.9){
  const key=`surface-${base}-${variation}-${repeatX}-${repeatY}`;
  if(cache[key])return cache[key];
  const c=document.createElement('canvas');c.width=c.height=256;
  const ctx=c.getContext('2d'),pixels=ctx.createImageData(256,256);
  const rgb=base.match(/[a-f\d]{2}/gi).map(v=>parseInt(v,16));let seed=284753;
  for(let i=0;i<pixels.data.length;i+=4){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const x=(i/4)%256,y=Math.floor(i/1024);
    const grain=((seed>>>16)/65535-.5)*variation+Math.sin(x*.14+y*.11)*variation*.12;
    for(let j=0;j<3;j++)pixels.data[i+j]=Math.max(0,Math.min(255,rgb[j]+grain));
    pixels.data[i+3]=255;
  }
  ctx.putImageData(pixels,0,0);
  const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;
  map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(repeatX,repeatY);map.anisotropy=4;
  return cache[key]=new T.MeshStandardMaterial({map,roughness,bumpMap:map,bumpScale:.014});
}
const M={
 steel:mat('#758690',.47,.42), steelDark:mat('#34434c',.48,.45), steelLight:mat('#b7c2c5',.42,.38),
 concrete:textured('#c6c3b9',15,4,3), concreteDark:textured('#999b96',19,3,3,.96), ballast:textured('#858984',54,8,3,1),
 rail:mat('#4c575e',.84,.25), sleeper:mat('#443f3a',.08,.94), blue:mat('#1352a1',.45,.32),
 white:mat('#edf2f3',.26,.4), glass:mat('#0d3048',.65,.16), black:mat('#18232b',.5,.66),
 roof:mat('#aab8bd',.28,.54), bridgeGlass:mat('#a7d9e2',.12,.2,{transparent:true,opacity:.28,depthWrite:false,side:T.DoubleSide}), ground:textured('#81956d',34,22,12,1), platform:textured('#b8b7ae',12,6,3,.95),
 yellow:mat('#e4b62f',.05,.7), red:mat('#ba442d',.2,.6), soil:mat('#765a3c',0,1)
};

export const data={
  escalator:{label:'ESCALATOR STR',title:'Escalator support frame',description:'Four-column braced support frame at the island-platform access to the elevated concourse. The escalator run and bridge show its passenger-route context.',pdf:"ESCALATOR STR 21-09-2026 Model.pdf",image:"Kota_Station_Escalator_3D_With_Measurements.png",alt:"Dimensioned 3D visualisation of the escalator support frame",rows:[['Grid 1-2','3.200 m'],['Grid A-B','1.000 m'],['Level 1-4','5.515 m'],['Level intervals','0.525 / 1.720 / 3.270 m'],['Pedestal','0.800 × 0.600 m'],['Footing','1.200 × 2.000 m'],['Main columns','ISHB 200'],['Bracing','ISA 75×75×6']],placement:'Island platform · concourse access zone, away from the canopy',note:'The structural sheet gives frame dimensions, not a station grid location. The bridge and escalator sit in a separate illustrative zone; foundation datum is -2.000 m.'},
  facade:{label:'R1 FACADE',title:'Curved façade frame',description:'The 8.130 m curved steel frame sits within an existing RCC bay on the station-building frontage, facing the forecourt.',pdf:"R1_FACADE STR_21-09-2026.pdf",image:"Kota_Station_Facade_3D_With_Measurements.png",alt:"Dimensioned 3D visualisation of the curved façade frame",rows:[['Shown bay','8.130 m'],['Frame height','3.827 m'],['Drawing variants','6.275 / 6.395 / 7.240 / 8.130 m'],['Main member','ISMC 200'],['Base plate','0.350 × 0.250 × 0.016 m'],['Top plate','0.250 × 0.180 × 0.012 m'],['Anchors','4-M20 Grade 8.8']],placement:'Main station building · RCC bay facing the forecourt',note:'The drawing anchors this frame to existing RCC columns and slab. The exact frontage bay is not identified, so the centre bay is illustrative.'},
  cop:{label:'12.00 M C.O.P.',title:'Platform canopy structure',description:'The 12 m C.O.P. spans the island platform between running lines, in a different platform zone from the escalator access.',pdf:"R1_Final_C.O.P. SECTION FOR 12.00M SPAN 08-06-2026-Model.pdf",image:"Kota_Station_COP_12m_3D_With_Measurements.png",alt:"Dimensioned 3D visualisation of the platform canopy",rows:[['Overall span','12.000 m'],['Foundation','3.600 × 2.200 m'],['RCC pedestal','1.350 × 0.600 m'],['Base plate','1.150 × 0.550 × 0.036 m'],['Anchor bolts','12-M30 Grade 8.8'],['Bolt length','1.300 m'],['Model variant','With OHE']],placement:'Island platform · sheltered zone, away from the escalator',note:'The supplied section governs the 12 m transverse span. Longitudinal roof length and exact station placement are illustrative.'}
};

export function box(g,x,y,z,w,h,d,m=M.steel){const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
function repeatedBoxes(g,w,h,d,m,positions){
  const mesh=new T.InstancedMesh(new T.BoxGeometry(w,h,d),m,positions.length);
  const dummy=new T.Object3D();positions.forEach(([x,y,z],i)=>{
    dummy.position.set(x,y,z);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
  return mesh;
}
function cylinder(g,x,y,z,r,h,m=M.steel,segments=10){const o=new T.Mesh(new T.CylinderGeometry(r,r,h,segments),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
function beam(g,a,b,w=.12,d=.12,m=M.steel){const p=new T.Vector3(...a),v=new T.Vector3(...b).sub(p);const o=new T.Mesh(new T.BoxGeometry(w,v.length(),d),m);o.position.copy(p).addScaledVector(v,.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
function iColumn(g,x,y,z,height,depth,width,m=M.steelDark){
  box(g,x,y,z,depth,height,.024,m);
  for(const side of [-1,1])box(g,x+side*(depth/2-.013),y,z,.026,height,width,m);
}
function tube(g,curve,r=.07,m=M.steel){const o=new T.Mesh(new T.TubeGeometry(curve,48,r,8,false),m);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
function bolt(g,x,y,z,r=.045){const o=cylinder(g,x,y,z,r,.06,M.steelDark,8);o.rotation.x=Math.PI/2;return o;}
function platformSurface(g,width,depth,z,repeatY){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#c5c3b8';ctx.fillRect(0,0,256,256);
  ctx.strokeStyle='#a7a99e';ctx.lineWidth=3;
  for(let y=0;y<=256;y+=64){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(256,y);ctx.stroke();}
  for(let row=0;row<4;row++)for(let x=0;x<=256;x+=64){
    const offset=row%2?32:0;ctx.beginPath();ctx.moveTo(x+offset,row*64);ctx.lineTo(x+offset,(row+1)*64);ctx.stroke();
  }
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(55,repeatY);
  const mesh=new T.Mesh(new T.PlaneGeometry(width,depth),new T.MeshStandardMaterial({map:texture,roughness:.95}));
  mesh.rotation.x=-Math.PI/2;mesh.position.set(0,.562,z);mesh.receiveShadow=true;mesh.userData.disposeMaterial=true;g.add(mesh);
}
function tactileStrip(g,z){
  const c=document.createElement('canvas');c.width=c.height=128;
  const ctx=c.getContext('2d');ctx.fillStyle='#d6b349';ctx.fillRect(0,0,128,128);
  ctx.fillStyle='#ab8832';
  for(let y=9;y<128;y+=20)for(let x=9;x<128;x+=20){ctx.beginPath();ctx.arc(x,y,3.2,0,Math.PI*2);ctx.fill();}
  const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;
  map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(100,1);map.anisotropy=4;
  const strip=new T.Mesh(new T.PlaneGeometry(160,.38),new T.MeshStandardMaterial({map,roughness:.9}));
  strip.rotation.x=-Math.PI/2;strip.position.set(0,.637,z);strip.receiveShadow=true;
  strip.userData.disposeMaterial=true;g.add(strip);
}

function concourseTiles(g){
  const c=document.createElement('canvas');c.width=c.height=512;
  const ctx=c.getContext('2d');
  for(let row=0;row<8;row++)for(let col=0;col<8;col++){
    ctx.fillStyle=(row+col)%2?'#c1beb6':'#e1ded4';
    ctx.fillRect(col*64,row*64,64,64);
    ctx.strokeStyle='#eee9df';ctx.lineWidth=2;ctx.strokeRect(col*64,row*64,64,64);
  }
  const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;
  texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(2,1.5);
  const floor=new T.Mesh(new T.PlaneGeometry(20,14.5),new T.MeshStandardMaterial({map:texture,roughness:.42,metalness:.06}));
  floor.rotation.x=-Math.PI/2;floor.position.set(0,.381,-21.3);
  floor.receiveShadow=true;floor.userData.disposeMaterial=true;g.add(floor);
}

function curvedChannel(g,span,endY,crownY,z,web=.20){
  const shape=new T.Shape();const n=48;
  const point=t=>({x:-span/2+span*t,y:endY*(1-t)*(1-t)+2*crownY*t*(1-t)+endY*t*t});
  for(let i=0;i<=n;i++){const p=point(i/n);i?shape.lineTo(p.x,p.y+web/2):shape.moveTo(p.x,p.y+web/2);}
  for(let i=n;i>=0;i--){const p=point(i/n);shape.lineTo(p.x,p.y-web/2);}
  shape.closePath();
  const member=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.17,bevelEnabled:false,steps:1}),M.steelLight);
  member.position.z=z-.085;member.castShadow=true;member.receiveShadow=true;g.add(member);
  // Narrow channel flanges make the members read as rolled steel rather than round rails.
  for(const faceZ of [z-.107,z+.107]){
    const line=new T.QuadraticBezierCurve3(new T.Vector3(-span/2,endY+web/2,faceZ),new T.Vector3(0,crownY+web/2,faceZ),new T.Vector3(span/2,endY+web/2,faceZ));
    tube(g,line,.018,M.steelDark);
  }
  return t=>point(t).y;
}

function labelTexture(text,accent=false){const c=document.createElement('canvas');c.width=1024;c.height=160;const x=c.getContext('2d');x.fillStyle='rgba(255,255,255,.97)';x.fillRect(5,5,1014,150);x.strokeStyle=accent?'#f47b38':'#2a6688';x.lineWidth=9;x.strokeRect(5,5,1014,150);x.fillStyle='#12344d';x.textAlign='center';x.textBaseline='middle';x.font='700 56px sans-serif';x.fillText(text,512,82,940);const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;return tx;}
function label(g,text,pos,scale=1.4,accent=false){const s=new T.Sprite(new T.SpriteMaterial({map:labelTexture(text,accent),depthTest:false,transparent:true}));s.position.set(...pos);s.scale.set(scale*5.8,scale,1);s.renderOrder=20;g.add(s);return s;}
function dimension(g,a,b,text,offset=[0,.45,0]){const material=new T.LineBasicMaterial({color:'#1f6f9e',depthTest:false});const start=new T.Vector3(...a),end=new T.Vector3(...b);const line=new T.Line(new T.BufferGeometry().setFromPoints([start,end]),material);line.renderOrder=18;g.add(line);const axis=end.clone().sub(start).normalize();const cross=Math.abs(axis.y)>.8?new T.Vector3(.22,0,0):new T.Vector3(0,.22,0);for(const p of [start,end]){const tick=new T.Line(new T.BufferGeometry().setFromPoints([p.clone().sub(cross),p.clone().add(cross)]),material);tick.renderOrder=18;g.add(tick);}const mid=start.clone().lerp(end,.5).add(new T.Vector3(...offset));label(g,text,mid.toArray(),.82,true);}

function makeTrack(g,centreZ,length=180){box(g,0,-.14,centreZ,length,.25,3.6,M.ballast);const sleepers=[];for(let x=-length/2;x<=length/2;x+=.85)sleepers.push([x,.02,centreZ]);repeatedBoxes(g,.22,.16,2.75,M.sleeper,sleepers);for(const dz of [-.838,.838]){box(g,0,.16,centreZ+dz,length,.14,.08,M.rail);box(g,0,.085,centreZ+dz,length,.035,.18,M.rail);}for(let x=-length/2;x<=length/2;x+=9)box(g,x,-.03,centreZ,1.15,.04,3.7,M.concreteDark);}
function turnout(g){
  // A short diverging turnout beyond the platform end; the running rail stays continuous.
  const x0=62,length=28;
  for(const dz of [-.838,.838]){
    const points=[];
    for(let i=0;i<=28;i++){const t=i/28;points.push(new T.Vector3(x0+t*length,.18,8+dz+3.1*t*t));}
    tube(g,new T.CatmullRomCurve3(points),.043,M.rail);
  }
  for(let x=x0;x<=89;x+=1.2){const t=(x-x0)/length;box(g,x,.015,8+3.1*t*t,.18,.11,2.8,M.sleeper);}
  box(g,65,.05,8,.75,.08,2.6,M.steelDark);
  box(g,65,1.1,12.4,.17,2.0,.19,M.steelDark);
  box(g,65,2.15,12.4,.52,.24,.12,M.steelLight);
}
function makeOHE(g,centreZ,length=180){const q=new T.Group();g.add(q);const poleZ=centreZ+(centreZ<0?-3.35:3.35);for(let x=-length/2+7;x<length/2;x+=18){box(q,x,3.3,poleZ,.18,6.8,.22,M.steelDark);beam(q,[x,6.6,poleZ],[x,6.2,centreZ-1.25],.075,.075,M.steelDark);beam(q,[x,5.2,poleZ],[x,6.15,centreZ+.4],.05,.05,M.steelDark);for(let k=0;k<4;k++)cylinder(q,x,6.2+k*.09,centreZ-.35,.08,.05,mat('#725848',.12,.75),10);}for(const h of [5.85,6.28])beam(q,[-length/2,h,centreZ],[length/2,h,centreZ],.025,.025,M.steelDark);for(let x=-length/2;x<=length/2;x+=4)beam(q,[x,5.85,centreZ],[x,6.28,centreZ],.014,.014,M.steelDark);return q;}

function tree(g,x,z,s=1){const q=new T.Group();q.position.set(x,-.2,z);g.add(q);cylinder(q,0,1.1*s,0,.14*s,2.2*s,mat('#6f5138',0,1),10);for(const [i,p] of [[0,2.4,0],[.55,2.15,.1],[-.5,2.2,.18],[.2,2.0,-.5]].entries()){const crown=new T.Mesh(new T.SphereGeometry(.85*s,10,8),mat(['#537849','#648c51','#466e43','#739253'][i],0,.98));crown.position.set(p[0]*s,p[1]*s,p[2]*s);crown.castShadow=true;q.add(crown);}}
function stationBuilding(g){
  const rose=textured('#cb9e91',18,5,3),sand=textured('#e7cbb1',12,3,3),trim=textured('#ead8c0',10,3,2),recess=mat('#414a49',0,.9);
  const frontage=-28.5;
  // Leave a real through-opening at the centre bay. A single solid station
  // block here used to sit directly behind the curved steel frame.
  for(const x of [-24.5,24.5])box(g,x,3.65,-21.3,29,7.3,14.4,rose);
  // Only the façade plane encloses the neighbouring bays. The concourse behind
  // the portal opens out to columns, as in the supplied structural visual.
  for(const x of [-7.2,7.2])for(const z of [-27.85,-14.75])box(g,x,2.68,z,5.6,5.25,1.35,rose);
  box(g,0,6.3,-21.3,20,2.0,14.4,rose);
  box(g,0,.28,-21.3,20,.18,14.5,mat('#d7c8ad',0,.83));
  concourseTiles(g);
  for(const x of [-4.36,4.36]){
    box(g,x,2.68,frontage+.55,.14,5.25,1.2,sand);
    box(g,x,1.0,frontage+.55,.055,1.3,1.2,trim);
  }
  for(const x of [-8.4,8.4])for(const z of [-24,-19.2]){
    box(g,x,2.72,z,.72,5.3,.72,mat('#bbb9b0',0,.92));
    box(g,x,5.3,z,1.02,.25,1.02,sand);
  }
  box(g,0,5.28,-21.3,20,.12,14.4,trim);
  for(const z of [-26,-22,-18]){
    box(g,0,5.08,z,9.0,.055,.3,mat('#fff1d4',.04,.48,{emissive:'#ffe0a6',emissiveIntensity:.23}));
    box(g,0,5.0,z,20,.36,.5,sand);
  }
  box(g,0,7.45,-21.3,80,.42,15,trim);
  box(g,0,8.0,-21.3,78,.7,14.7,M.roof);
  // Long, shallow standing seams keep the roof legible at overview distance.
  for(let x=-38;x<=38;x+=1.4)box(g,x,8.37,-21.3,.035,.055,14.4,M.steelLight);
  box(g,0,.28,frontage-1.4,82,.3,3.5,sand);
  for(let i=-4;i<=4;i++){
    const x=i*8.9;
    if(i!==0)box(g,x,2.8,frontage-.22,7.95,4.85,.12,recess);
    const arch=new T.QuadraticBezierCurve3(new T.Vector3(x-3.55,1.15,frontage-.35),new T.Vector3(x,6.8,frontage-.35),new T.Vector3(x+3.55,1.15,frontage-.35));
    if(i!==0)tube(g,arch,.21,trim);
    if(i!==0){
      box(g,x,2.45,frontage-.37,5.8,3.5,.11,M.glass);
      for(const dx of [-1.85,0,1.85])box(g,x+dx,2.45,frontage-.48,.075,3.5,.08,trim);
      box(g,x,1.1,frontage-.5,6.1,.16,.16,sand);
      for(const dx of [-2.8,-.92,.92,2.8])box(g,x+dx,2.42,frontage-.495,.025,3.23,.025,M.steelLight);
      box(g,x,2.7,frontage-.51,5.9,.045,.025,M.steelLight);
    }
  }
  for(let i=-4;i<4;i++)box(g,(i+.5)*8.9,3.65,frontage-.48,.48,7.3,.75,sand);
  box(g,0,6.95,frontage-.48,76,.18,.6,sand);
  for(const x of [-35,-26,-17,-8,8,17,26,35]){
    box(g,x,5.45,frontage-.72,.48,.09,.15,M.steelDark);
    box(g,x,5.39,frontage-.74,.37,.025,.12,mat('#fff3d7',.04,.45,{emissive:'#ffe2af',emissiveIntensity:.4}));
  }
  for(const x of [-31,31]){
    box(g,x,9.2,frontage+1,4.5,2.9,5.1,rose);
    box(g,x,10.82,frontage+1,5.0,.33,5.6,trim);
    box(g,x,11.35,frontage+1,3.5,.8,3.5,rose);
  }
  box(g,0,10.0,frontage+1,6.1,3.4,5.1,rose);
  box(g,0,11.86,frontage+1,6.7,.33,5.7,trim);
  box(g,0,12.35,frontage+1,4.6,.75,4.2,rose);
  const clockZ=frontage-1.62,clockY=10.12;
  for(const [radius,depth,m] of [[1.06,.08,M.steelDark],[.94,.10,mat('#f7f3e8',0,.43)]]){
    const dial=new T.Mesh(new T.CylinderGeometry(radius,radius,depth,40),m);
    dial.rotation.x=Math.PI/2;dial.position.set(0,clockY,clockZ-(radius<1?.08:0));g.add(dial);
  }
  for(let n=0;n<12;n++){
    const a=n*Math.PI/6,tick=box(g,Math.sin(a)*.77,clockY+Math.cos(a)*.77,clockZ-.145,.035,n%3===0?.14:.075,.025,M.steelDark);
    tick.rotation.z=-a;
  }
  beam(g,[0,clockY,clockZ-.17],[.04,clockY+.56,clockZ-.17],.045,.045,M.steelDark);
  beam(g,[0,clockY,clockZ-.17],[.4,clockY-.25,clockZ-.17],.05,.05,M.steelDark);
  box(g,0,8.55,frontage-.55,20,1.15,.22,mat('#244868',.1,.75));
  label(g,'कोटा जं.   KOTA JN.',[0,8.55,frontage-1.0],.54);
  for(let x=-36;x<=36;x+=9)box(g,x,7.2,frontage-.65,.38,.95,.32,trim);
  const rear=-14.03;
  box(g,0,6.95,rear+.16,77,.36,.5,trim);
  for(const x of [-21.7,21.7])box(g,x,.54,rear+.3,34.6,.38,.85,sand);
  for(let i=-4;i<=4;i++){
    const x=i*8.9;
    if(i!==0)box(g,x,3.25,rear+.32,7.2,4.8,.14,mat('#7899a0',.2,.42));
    const arc=new T.QuadraticBezierCurve3(new T.Vector3(x-3.45,1.05,rear+.52),new T.Vector3(x,7.65,rear+.52),new T.Vector3(x+3.45,1.05,rear+.52));
    if(i!==0)tube(g,arc,.22,trim);
    if(i!==0){
      for(const dx of [-2.25,-.75,.75,2.25])box(g,x+dx,2.85,rear+.48,.095,3.45,.13,trim);
      box(g,x,1.12,rear+.52,6.9,.22,.2,sand);
      box(g,x,3.8,rear+.58,2.8,.72,.16,mat('#e0c6a8',0,.88));
    }
  }
  for(let i=-4;i<4;i++)box(g,(i+.5)*8.9,3.65,rear+.6,.52,7.3,.74,sand);
  box(g,0,7.85,rear+.45,22,1.15,.3,mat('#244868',.1,.75));
  label(g,'KOTA JUNCTION  ·  कोटा जंक्शन',[0,7.85,rear+.92],.55);
  for(const x of [-31,31]){
    box(g,x,10.95,rear+.5,4.3,2.8,.4,rose);
    box(g,x,12.45,rear+.55,5.1,.26,.65,trim);
  }
  box(g,0,.06,-39,100,.13,15,mat('#7b8484',0,1));
  box(g,0,.15,-31.6,100,.12,2.7,sand);
  for(const x of [-25,-17,17,25]){box(g,x,.27,-36,4,.22,2.1,M.soil);tree(g,x,-36,1.25);}
}
function stationBridge(g,x=-35){
  const bridge=new T.Group();bridge.position.x=x;g.add(bridge);
  box(bridge,0,6.56,-9.35,6.9,.26,12,M.concrete);
  box(bridge,0,6.72,-9.35,6.45,.06,11.8,sandstone());
  for(const x of [-3.45,3.45]){
    box(bridge,x,7.35,-9.35,.055,1.16,11.95,M.bridgeGlass);
    box(bridge,x,7.95,-9.35,.11,.11,12,M.steelLight);
    for(let z=-14.7;z<=-4;z+=2.1)box(bridge,x,8.0,z,.12,2.8,.12,M.steelLight);
    box(bridge,x,9.4,-9.35,.17,.12,12,M.steelLight);
  }
  for(const z of [-14.9,-3.8])for(const x of [-3.2,3.2])box(bridge,x,3.25,z,.26,6.5,.28,M.concrete);
  for(let z=-14.8;z<=-4;z+=2.1)beam(bridge,[-3.45,9.38,z],[3.45,9.38,z],.13,.15,M.steelLight);
  for(const x of [-2.6,0,2.6])box(bridge,x,9.51,-9.35,.065,.11,11.8,M.steelLight);
  box(bridge,0,9.62,-9.35,7.4,.11,12,mat('#e5edf0',.1,.55,{transparent:true,opacity:.6,depthWrite:false}));
  for(const z of [-15.35,-3.35])box(bridge,0,9.58,z,7.45,.26,.18,trimMaterial());
  box(bridge,0,6.55,-16,7.3,.3,2.8,M.concrete);
  return bridge;
}
function sandstone(){return mat('#c8b9a2',0,.96);}
function trimMaterial(){return mat('#e9d7c0',0,.84);}
function person(g,x,z,shirt='#476f8a'){
  const q=new T.Group();q.position.set(x,.58,z);g.add(q);
  const clothes=mat(shirt,0,.82),skin=mat('#b98d69',0,.85);
  for(const side of [-1,1]){
    box(q,side*.13,.37,0,.16,.73,.19,M.steelDark);
    box(q,side*.13,.035,.07,.23,.07,.34,mat('#373b3c',0,.93));
    beam(q,[side*.29,1.34,0],[side*.34,.83,.04],.13,.14,clothes);
    cylinder(q,side*.34,.80,.04,.075,.12,skin,10);
  }
  box(q,0,1.12,0,.52,.67,.31,clothes);
  cylinder(q,0,1.63,0,.16,.27,skin,14);
  const hair=new T.Mesh(new T.SphereGeometry(.165,10,8),mat('#282c2b',0,.96));hair.position.set(0,1.79,-.015);q.add(hair);
}
function platformDetails(g){
  for(const x of [-48,-32,19,36,52]){
    box(g,x,.95,1.8,2.4,.12,.75,mat('#a98057',0,.9));
    box(g,x,1.2,2.22,2.4,.55,.11,M.steelLight);
    for(const dx of [-.85,.85])box(g,x+dx,.73,1.8,.09,.42,.58,M.steelDark);
    box(g,x,2.55,0,.13,4.0,.15,M.steelDark);
    box(g,x,4.45,0,2.7,.52,.13,mat('#224b79',.1,.65));
  }
  for(const [x,z,c] of [[-39,2,'#a86d4f'],[-24,-2,'#d6a943'],[-16,2,'#657d9a'],[13,3,'#c46d66'],[27,-2,'#70926a'],[43,1,'#a77a9e']])person(g,x,z,c);
  for(const [x,z] of [[-24.7,-1.6],[12.3,3.2],[42.2,1.4]]){
    box(g,x,.94,z,.38,.7,.27,mat('#4d6681',.05,.77));
    box(g,x,.6,z,.36,.07,.3,M.black);
    beam(g,[x-.12,1.27,z],[x+.12,1.27,z],.035,.035,M.steelDark);
  }
  for(const x of [-52,-12,12,48]){
    cylinder(g,x,.97,3.9,.23,.76,mat('#506579',.16,.68),12);
    cylinder(g,x,1.37,3.9,.27,.075,M.steelLight,12);
    box(g,x,1.05,4.13,.25,.3,.02,M.black);
  }
  box(g,65,1.8,1.5,3.2,2.35,2.0,textured('#d5b995',15,3,2));
  box(g,65,3.07,1.5,3.55,.18,2.35,mat('#597c8d',.18,.65));
  box(g,65,1.75,.46,2.1,.9,.05,mat('#765c49',0,.82));
  box(g,65,1.16,.42,2.5,.11,.22,M.steelLight);
  label(g,'REFRESHMENTS',[65,2.69,.36],.29);
  person(g,65,3.3,'#537286');
  label(g,'PLATFORM 2 / 3',[-22,3.55,.1],.56);
  label(g,'KOTA JUNCTION',[38,3.55,.1],.56);
  for(const x of [-62,62]){
    box(g,x,.84,2.1,2.2,.55,1.5,mat('#e3e0d5',0,.86));
    box(g,x,1.3,1.3,2.25,.34,.10,mat('#2a608a',.3,.5));
  }
}
function signal(g,x,z,green=true){
  box(g,x,2.12,z,.16,4.25,.18,M.steelDark);
  box(g,x,3.7,z,.56,1.18,.34,M.black);
  for(const [i,c] of [[0,'#b4423c'],[1,'#d2a832'],[2,'#4a9871']]){
    const active=green?i===2:i===0;
    const lamp=new T.Mesh(new T.CylinderGeometry(.13,.13,.035,16),mat(c,.05,.35,{emissive:c,emissiveIntensity:active?.9:.05}));
    lamp.rotation.x=Math.PI/2;lamp.position.set(x,4.04-i*.34,z-.19);g.add(lamp);
  }
  box(g,x,1.6,z,.42,.46,.35,M.concreteDark);
}
function environment(){
  const g=new T.Group(),landscape=new T.Group();g.add(landscape);
  box(landscape,0,-.8,-5,200,1.1,100,M.ground);
  makeTrack(g,-8);makeTrack(g,8);turnout(g);
  box(g,0,.28,0,160,.55,11.3,M.platform);
  box(g,0,.28,-12.4,160,.55,3.9,M.platform);
  platformSurface(g,160,11.3,0,5);
  platformSurface(g,160,3.9,-12.4,2);
  for(const z of [-5.15,5.15,-10.5]){box(g,0,.59,z,160,.08,.38,M.yellow);tactileStrip(g,z);}
  const edgeBlocks=[];for(let x=-78;x<80;x+=2)for(const z of [-4.72,4.72,-10.9])edgeBlocks.push([x,.6,z]);
  repeatedBoxes(g,1.45,.035,.32,M.concreteDark,edgeBlocks);
  const ohe=new T.Group();g.add(ohe);makeOHE(ohe,-8);makeOHE(ohe,8);
  stationBuilding(landscape);
  const bridge=stationBridge(landscape);
  for(const x of [-58,-43,43,58]){tree(landscape,x,-36,1.1);tree(landscape,x,22,1.1);}
  for(const x of [-62,62]){
    for(const z of [-.3,.3])box(landscape,x,2.65,z,.25,4.2,.25,M.steelDark);
    box(landscape,x,4.7,0,.4,.25,10.7,M.steel);
    box(landscape,x,4.8,0,12,.12,11,M.roof);
  }
  platformDetails(landscape);
  for(const [x,z,green] of [[-67,-3.9,true],[70,-3.9,false],[-67,11.3,false],[70,11.3,true]])signal(landscape,x,z,green);
  return {group:g,ohe,landscape,bridge};
}
function escalatorModel(){const g=new T.Group(),dims=new T.Group();g.add(dims);const xs=[-1.6,1.6],zs=[-.5,.5],levels=[.6,1.125,2.845,6.115];for(const x of xs)for(const z of zs){box(g,x,-.15,z,1.2,.45,2,M.concrete);box(g,x,.25,z,.8,.35,.6,M.concreteDark);iColumn(g,x,3.35,z,5.5,.20,.20);for(const dx of [-.24,.24])for(const dz of [-.14,.14])bolt(g,x+dx,.47,z+dz);}for(const y of [levels[1],levels[2],levels[3]])for(const z of zs)box(g,0,y,z,3.4,.20,.18,M.steel);for(const y of [levels[2],levels[3]])for(const x of xs)box(g,x,y,0,.18,.18,1.15,M.steel);for(const z of zs){beam(g,[-1.5,levels[1],z],[1.5,levels[2],z],.10,.10,M.steelLight);beam(g,[1.5,levels[1],z],[-1.5,levels[2],z],.10,.10,M.steelLight);beam(g,[-1.5,levels[2],z],[1.5,levels[3],z],.10,.10,M.steelLight);beam(g,[1.5,levels[2],z],[-1.5,levels[3],z],.10,.10,M.steelLight);}for(const x of xs){beam(g,[x,levels[1],-.48],[x,levels[2],.48],.09,.09,M.steelLight);beam(g,[x,levels[1],.48],[x,levels[2],-.48],.09,.09,M.steelLight);beam(g,[x,levels[2],-.48],[x,levels[3],.48],.09,.09,M.steelLight);beam(g,[x,levels[2],.48],[x,levels[3],-.48],.09,.09,M.steelLight);}dimension(dims,[-1.6,6.55,-.72],[1.6,6.55,-.72],'3.200 m',[0,.42,0]);dimension(dims,[2.15,.6,-.65],[2.15,6.115,-.65],'5.515 m',[1.05,0,0]);dimension(dims,[-2.05,.72,-.5],[-2.05,.72,.5],'1.000 m',[-.85,.2,0]);label(dims,'ISHB 200 + ISA 75x75x6',[0,4.35,.8],.58);// The frame carries the upper landing where the island platform joins the concourse bridge.
const stair=new T.Group();g.add(stair);
const a=[0,.6,8.55],b=[0,6.07,0];
beam(stair,a,b,1.32,.2,M.steelDark);
for(const side of [-1,1]){
  beam(stair,[side*.75,.8,8.55],[side*.75,6.28,0],.09,.08,M.steelLight);
  beam(stair,[side*.76,1.7,8.55],[side*.76,7.1,0],.08,.07,M.steelDark);
}
for(let i=0;i<26;i++){
  const t=i/25,y=.62+t*5.45,z=8.55-t*8.55;
  box(stair,0,y,z,1.28,.08,.34,M.steelDark);
  box(stair,0,y+.047,z-.13,1.23,.012,.025,M.yellow);
  for(const x of [-.39,-.13,.13,.39])box(stair,x,y+.045,z,.012,.006,.23,M.steelLight);
}
box(g,0,6.15,-.6,2.5,.2,2.3,M.concrete);
g.position.set(-35,.34,-4.25);return {group:g,dims,focus:new T.Vector3(-35,3.3,-3.5)};}

function facadeModel(){
  const g=new T.Group(),dims=new T.Group();g.add(dims);
  const w=8.13,z=1.4,front=z-.48;
  const concrete=textured('#d5d1c6',13,3,3,.92);
  for(const x of [-w/2,w/2]){
    box(g,x,2.45,z,.58,4.9,.86,concrete);
    box(g,x,2.43,front,.20,3.82,.20,M.steelLight);
    box(g,x,.57,front-.06,.35,.25,.28,M.steel);
    for(const dx of [-.1,.1])for(const y of [.50,.64])bolt(g,x+dx,y,front-.23,.024);
  }
  box(g,0,4.83,z,w+1,1.05,.9,concrete);
  box(g,0,4.27,front,w,.20,.22,M.steelLight);
  box(g,0,4.26,front-.14,w,.035,.035,M.steelDark);
  const upper=curvedChannel(g,w,1.82,6.40,front-.06,.21);
  const lower=curvedChannel(g,w,1.41,5.78,front-.08,.21);
  // Suspended channel hangers and bolted gussets connect the header and both arcs.
  for(let i=1;i<=7;i++){
    const t=i/8,x=-w/2+t*w,yTop=upper(t),yLow=lower(t);
    box(g,x,(4.16+yTop)/2,front-.18,.16,4.16-yTop,.18,M.steelLight);
    box(g,x,(yTop+yLow)/2,front-.18,.16,yTop-yLow,.18,M.steelLight);
    for(const y of [4.04,yTop+.08,yLow+.08]){
      box(g,x,y,front-.30,.28,.25,.025,M.steel);
      for(const dx of [-.085,.085])for(const dy of [-.065,.065])bolt(g,x+dx,y+dy,front-.33,.019);
    }
  }
  for(const x of [-w/2,w/2]){
    box(g,x,1.1,front-.27,.31,.68,.055,M.steel);
    for(const y of [.85,1.05,1.25])for(const dx of [-.085,.085])bolt(g,x+dx,y,front-.32,.019);
    box(g,x,4.16,front-.22,.34,.16,.30,M.steel);
  }
  dimension(dims,[-w/2,5.35,z-.62],[w/2,5.35,z-.62],'8.130 m',[0,.45,0]);
  dimension(dims,[4.75,.45,z-.62],[4.75,4.277,z-.62],'3.827 m',[1.05,0,0]);
  g.position.set(0,.34,-30);
  return {group:g,dims,focus:new T.Vector3(0,3.0,-29)};
}

function copModel(){const g=new T.Group(),dims=new T.Group();g.add(dims);box(g,0,-.42,0,3.6,.65,2.2,M.concreteDark);box(g,0,.15,0,1.35,1.15,.6,M.concrete);box(g,0,.78,0,1.15,.12,.55,M.steel);for(const x of [-.42,-.14,.14,.42])for(const z of [-.18,.18])bolt(g,x,.88,z);iColumn(g,0,2.8,0,4.0,.30,.25);const frames=9,length=22;for(let i=0;i<frames;i++){const x=-length/2+i*length/(frames-1);box(g,x,2.8,0,.18,4,.18,M.steelDark);for(const side of [-1,1]){beam(g,[x,4.65,side*.18],[x,4.05,side*5.7],.14,.18,M.steel);beam(g,[x,3.3,side*.18],[x,3.7,side*5.6],.12,.16,M.steel);beam(g,[x,3.05,side*.3],[x,3.55,side*4.8],.08,.10,M.steelLight);beam(g,[x,3.05,side*.3],[x,4.0,side*3.2],.08,.10,M.steelLight);}}for(const z of [-5.7,-4.5,-3.2,-1.8,1.8,3.2,4.5,5.7])box(g,0,4.02-Math.abs(z)*.08,z,length,.10,.10,M.steelLight);for(const side of [-1,1]){const roof=box(g,0,4.22,side*3.0,length,.08,5.9,M.roof);roof.rotation.x=-side*.10;box(g,0,3.95,side*5.88,length,.44,.22,M.roof);box(g,0,3.74,side*5.86,length,.08,.12,M.steelLight);for(let x=-10.5;x<=10.5;x+=1.05){const rib=box(g,x,4.30,side*3,.035,.05,5.7,M.steelLight);rib.rotation.x=-side*.10;}}for(const x of [-8.25,-2.75,2.75,8.25]){box(g,x,3.57,-2.4,1.1,.045,.16,mat('#eef5ec',.05,.35,{emissive:'#ffe5b0',emissiveIntensity:.16}));box(g,x,3.57,2.4,1.1,.045,.16,mat('#eef5ec',.05,.35,{emissive:'#ffe5b0',emissiveIntensity:.16}));}copFinish(g,length);dimension(dims,[0,5.25,-6],[0,5.25,6],'12.000 m',[0,.45,0]);dimension(dims,[-1.8,-.9,-1.25],[1.8,-.9,-1.25],'3.600 m',[0,.45,0]);label(dims,'FOUNDATION 3.600 x 2.200 m',[0,-.15,1.6],.56);label(dims,'RCC PEDESTAL 1.350 x 0.600 m',[0,1.2,1.15],.52);g.position.set(25,.55,0);return {group:g,dims,focus:new T.Vector3(25,2.9,0)};}

function copFinish(g,length){
  for(const side of [-1,1]){
    box(g,0,3.87,side*5.88,length,.15,.18,M.steelDark);
    for(let x=-10.5;x<=10.5;x+=2.75){
      const curve=new T.QuadraticBezierCurve3(new T.Vector3(x,4.31,side*4.9),new T.Vector3(x,4.65,side*5.96),new T.Vector3(x,3.93,side*6.1));
      tube(g,curve,.055,M.roof);
      box(g,x,3.7,side*5.75,.08,.28,.15,M.steelLight);
    }
  }
  for(const z of [-.28,.28]){
    box(g,0,4.48,z,.56,.46,.065,M.steel);
    for(const x of [-.2,.2])for(const y of [4.32,4.6])bolt(g,x,y,z+Math.sign(z)*.06,.023);
  }
  for(const x of [-10.3,10.3])for(const side of [-1,1]){
    box(g,x,3.56,side*5.8,.12,.4,.12,M.steelDark);
    box(g,x,3.34,side*5.8,.23,.09,.22,M.steelLight);
  }
}

export function makeModel(id){
  const env=environment(),structures={escalator:escalatorModel(),facade:facadeModel(),cop:copModel()};
  for(const item of Object.values(structures))env.group.add(item.group);
  return {group:env.group,structures,ohe:env.ohe,landscape:env.landscape,bridge:env.bridge,focus:structures[id].focus,railY:.16,trainZ:-8};
}

function trainText(){const c=document.createElement('canvas');c.width=512;c.height=128;const x=c.getContext('2d');x.fillStyle='#edf2f3';x.fillRect(0,0,512,128);x.fillStyle='#1551a0';x.font='700 40px sans-serif';x.textAlign='center';x.fillText('VANDE BHARAT',256,56);x.font='22px sans-serif';x.fillText('INDIAN RAILWAYS',256,94);const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;return new T.MeshStandardMaterial({map:tx,roughness:.55});}
export function makeTrain(){const train=new T.Group(),nameMat=trainText(),coaches=6,L=13.5;for(let i=0;i<coaches;i++){const c=new T.Group();c.position.x=-i*(L+.28);train.add(c);box(c,0,1.55,0,L,2.65,3.1,M.white);box(c,0,.55,0,L-.2,.45,2.7,M.steelDark);box(c,0,1.03,0,L+.05,.48,3.14,M.blue);box(c,0,2.9,0,L-.25,.20,2.85,M.white);for(const side of [-1,1]){const z=side*1.56;box(c,0,2.05,z,L-1.1,.72,.03,M.blue);for(let j=0;j<7;j++)box(c,-5.1+j*1.7,2.08,z*1.005,1.2,.55,.035,M.glass);for(const x of [-5.8,5.8]){box(c,x,1.55,z*1.006,.72,1.82,.04,M.white);box(c,x,2.06,z*1.01,.46,.58,.04,M.glass);}const sign=new T.Mesh(new T.PlaneGeometry(2.6,.62),nameMat);sign.position.set(0,1.34,z*1.014);if(side<0)sign.rotation.y=Math.PI;c.add(sign);}for(const x of [-4.1,4.1]){box(c,x,.25,0,2.5,.45,2.35,M.black);for(const dx of [-.75,.75])for(const z of [-.92,.92]){const wheel=new T.Mesh(new T.CylinderGeometry(.34,.34,.12,12),M.steelDark);wheel.rotation.x=Math.PI/2;wheel.position.set(x+dx,.14,z);c.add(wheel);}}if(i===0||i===coaches-1){const dir=i===0?1:-1,nose=new T.Group();nose.position.x=dir*L/2; if(dir<0)nose.rotation.y=Math.PI;c.add(nose);const sh=new T.Shape();sh.moveTo(0,.3);sh.lineTo(2,.55);sh.quadraticCurveTo(2.7,1.25,1.85,2);sh.lineTo(.45,2.85);sh.lineTo(0,2.85);sh.closePath();const geo=new T.ExtrudeGeometry(sh,{depth:2.85,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.1,bevelThickness:.08});geo.translate(0,0,-1.425);nose.add(new T.Mesh(geo,M.white));box(nose,1.9,.78,0,.45,.44,2.55,M.blue);const wind=box(nose,1.28,2.27,0,.05,.68,2.18,M.glass);wind.rotation.z=.94;}}train.scale.setScalar(.82);return train;}

