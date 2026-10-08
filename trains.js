import * as T from 'three';

// Representative Indian Railways rolling stock. Service names describe model
// liveries, not a claim that every service calls at Kota Junction.
export const trainTypes=[
  {id:'vande',name:'Vande Bharat',kind:'electric trainset'},
  {id:'rajdhani',name:'Rajdhani Express',kind:'LHB coaches'},
  {id:'shatabdi',name:'Shatabdi Express',kind:'chair-car coaches'},
  {id:'duronto',name:'Duronto Express',kind:'long-distance coaches'},
  {id:'tejas',name:'Tejas Express',kind:'premium coaches'},
  {id:'mail',name:'Mail / Express',kind:'classic blue coaches'},
  {id:'memu',name:'MEMU',kind:'suburban electric train'},
  {id:'freight',name:'Freight train',kind:'container wagons'}
];

const materialCache=new Map(),signCache=new Map();
const material=(color,metalness=.15,roughness=.65)=>{
  const key=`${color}/${metalness}/${roughness}`;
  if(!materialCache.has(key))materialCache.set(key,new T.MeshStandardMaterial({color,metalness,roughness}));
  return materialCache.get(key);
};
const colors={
  black:material('#202932',.3),wheel:material('#38444a',.55),glass:material('#143950',.35,.24),
  silver:material('#c9d2d4',.58,.35),light:material('#edf0e8',.15,.44),
  blue:material('#145a9c',.32),navy:material('#143758',.22),red:material('#ac3640',.25),
  orange:material('#e48b36',.18),yellow:material('#e6c73b',.12),green:material('#599559',.1)
};
function box(g,x,y,z,w,h,d,m){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);return mesh;}
function beam(g,a,b,w,d,m){const p=new T.Vector3(...a),v=new T.Vector3(...b).sub(p);const mesh=new T.Mesh(new T.BoxGeometry(w,v.length(),d),m);mesh.position.copy(p).addScaledVector(v,.5);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());mesh.castShadow=true;g.add(mesh);return mesh;}
function wheel(g,x,z){const o=new T.Mesh(new T.CylinderGeometry(.34,.34,.16,14),colors.wheel);o.rotation.x=Math.PI/2;o.position.set(x,.22,z);g.add(o);}
function bogies(g,L){for(const x of [-L*.31,L*.31]){box(g,x,.38,0,2.35,.42,2.4,colors.black);for(const dx of [-.78,.78])for(const z of [-1,1])wheel(g,x+dx,z);}}
function signMaterial(name,ink='#123e63'){
  const key=name+ink;if(signCache.has(key))return signCache.get(key);
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#f8f4e8';ctx.fillRect(0,0,512,96);
  ctx.fillStyle=ink;ctx.font='bold 46px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(name,256,49,490);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  const mat=new T.MeshStandardMaterial({map:texture,roughness:.65});signCache.set(key,mat);return mat;
}
function sideSign(g,title,z){
  const mesh=new T.Mesh(new T.PlaneGeometry(2.5,.46),signMaterial(title));
  mesh.position.set(0,1.38,z);if(z<0)mesh.rotation.y=Math.PI;g.add(mesh);
}
function coach(g,L,scheme,title,index){
  const body=material(scheme.body),stripe=material(scheme.stripe),roof=material(scheme.roof||'#d8dbd7');
  box(g,0,1.75,0,L,2.35,3.0,body);
  box(g,0,.58,0,L-.25,.35,2.7,colors.black);
  box(g,0,3.0,0,L-.3,.22,2.54,roof);
  for(const side of [-1,1]){
    const z=side*1.52;
    box(g,0,2.28,z,L-.35,.67,.045,stripe);
    box(g,0,1.02,z,L-.2,.22,.05,stripe);
    for(let j=0;j<8;j++){
      const x=-L*.38+j*L*.108;
      box(g,x,2.3,z+side*.035,L*.082,.47,.04,colors.glass);
      box(g,x,2.55,z+side*.06,L*.089,.045,.04,colors.silver);
    }
    for(const x of [-L*.45,L*.45]){
      box(g,x,1.72,z+side*.04,.74,1.78,.05,body);
      box(g,x,2.22,z+side*.09,.5,.54,.04,colors.glass);
      box(g,x+.25,1.45,z+side*.11,.045,.52,.04,colors.silver);
    }
    if(index%2===0)sideSign(g,title,z+side*.14);
  }
  bogies(g,L);
  for(const x of [-L/2,L/2])box(g,x,1.65,0,.18,2.4,2.85,colors.silver);
  for(const x of [-L*.32,0,L*.32])box(g,x,3.17,0,1.3,.17,.8,colors.silver);
}
function electricLoco(g,freight=false){
  const base=freight?material('#e7e2d0'):colors.light,accent=freight?material('#489089'):colors.red;
  const L=14.4;
  box(g,0,1.84,0,L,2.65,3.1,base);
  box(g,0,.58,0,L,.48,2.8,colors.black);
  box(g,0,3.23,0,L-.7,.23,2.8,colors.silver);
  for(const side of [-1,1]){
    const z=side*1.57;
    box(g,0,1.55,z,L-.25,.45,.05,accent);
    box(g,0,2.5,z,L-.25,.17,.06,accent);
    for(const x of [-5.1,5.1])box(g,x,2.65,z+side*.05,1.35,.72,.04,colors.glass);
    for(let x=-3.8;x<=3.8;x+=1.25)box(g,x,2.42,z+side*.04,.68,.6,.04,colors.silver);
    sideSign(g,freight?'WAG-9':'WAP-7',z+side*.12);
  }
  box(g,L/2+.08,2.28,0,.14,1.25,2.45,colors.glass);
  for(const z of [-1.12,1.12])box(g,L/2+.16,1.2,z,.08,.22,.35,colors.yellow);
  bogies(g,L);
  for(const x of [-3.5,3.5]){
    box(g,x,3.46,0,1.6,.13,1.4,colors.black);
    beam(g,[x-.45,3.51,-.6],[x+.5,4.47,.6],.07,.07,colors.wheel);
    beam(g,[x+.45,3.51,-.6],[x-.5,4.47,.6],.07,.07,colors.wheel);
    box(g,x,4.52,0,1.7,.075,.12,colors.wheel);
  }
}
function vandeCar(g,L,index,last){
  const body=colors.light;box(g,0,1.75,0,L,2.55,3.08,body);
  box(g,0,.58,0,L-.3,.45,2.7,colors.black);
  box(g,0,1.13,0,L,.42,3.14,colors.blue);
  box(g,0,3.1,0,L-.4,.19,2.82,colors.light);
  for(const side of [-1,1]){
    const z=side*1.57;
    box(g,0,2.29,z,L-.75,.8,.045,colors.blue);
    for(let j=0;j<7;j++)box(g,-5.2+j*1.7,2.34,z+side*.038,1.2,.56,.04,colors.glass);
    for(const x of [-5.75,5.75]){
      box(g,x,1.7,z+side*.07,.73,1.75,.05,body);
      box(g,x,2.28,z+side*.12,.45,.52,.045,colors.glass);
    }
    sideSign(g,'VANDE BHARAT',z+side*.15);
  }
  bogies(g,L);
  if(index===0||last){
    const dir=index===0?1:-1,nose=new T.Group();nose.position.x=dir*L/2;if(dir<0)nose.rotation.y=Math.PI;g.add(nose);
    const sh=new T.Shape();sh.moveTo(0,.32);sh.lineTo(1.7,.5);sh.quadraticCurveTo(2.55,1.3,1.65,2.25);sh.lineTo(.25,3.05);sh.lineTo(0,3.05);sh.closePath();
    const geo=new T.ExtrudeGeometry(sh,{depth:2.82,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.09,bevelThickness:.07});geo.translate(0,0,-1.41);nose.add(new T.Mesh(geo,body));
    box(nose,1.73,.88,0,.48,.42,2.55,colors.blue);
    const wind=box(nose,1.12,2.44,0,.06,.65,2.13,colors.glass);wind.rotation.z=.92;
  }
}
function freightWagon(g,index){
  const L=13.5;
  box(g,0,.78,0,L,.38,2.65,colors.black);bogies(g,L);
  const container=material(['#b75a37','#315985','#7d8e6d','#d7b26e','#9a4e45','#66868d'][index%6]);
  box(g,0,1.85,0,L-.55,1.75,2.55,container);
  for(const side of [-1,1])for(let x=-5.9;x<6;x+=.95)box(g,x,1.86,side*1.31,.045,1.64,.055,colors.silver);
  box(g,0,2.78,0,L-.55,.08,2.56,container);
  for(const side of [-1,1])sideSign(g,'INDIAN RAILWAYS',side*1.39);
}
const schemes={
  rajdhani:{body:'#d9d5c9',stripe:'#ad3037',roof:'#d1d3d3',title:'RAJDHANI'},
  shatabdi:{body:'#c9d6d7',stripe:'#245d91',roof:'#dce2dc',title:'SHATABDI'},
  duronto:{body:'#e7d862',stripe:'#70a153',roof:'#e5dec0',title:'DURONTO'},
  tejas:{body:'#d0b05d',stripe:'#8f382e',roof:'#ddd1ae',title:'TEJAS'},
  mail:{body:'#386aa0',stripe:'#d5e1e4',roof:'#b9c6cc',title:'MAIL / EXP'},
  memu:{body:'#e0ded3',stripe:'#376e99',roof:'#c6ccd0',title:'MEMU'}
};
export function makeTrain(type='vande'){
  const train=new T.Group(),L=13.5,gap=.35;
  if(type==='vande'){
    for(let i=0;i<6;i++){const car=new T.Group();car.position.x=-i*(L+gap);train.add(car);vandeCar(car,L,i,i===5);}
  }else if(type==='freight'){
    const loco=new T.Group();train.add(loco);electricLoco(loco,true);
    for(let i=0;i<6;i++){const wagon=new T.Group();wagon.position.x=-17-i*(L+gap);train.add(wagon);freightWagon(wagon,i);}
  }else{
    const scheme=schemes[type]||schemes.mail;
    if(type!=='memu'){const loco=new T.Group();train.add(loco);electricLoco(loco);}
    for(let i=0;i<6;i++){
      const car=new T.Group();car.position.x=type==='memu'?-i*(L+gap):-17-i*(L+gap);
      train.add(car);coach(car,L,scheme,scheme.title,i);
      if(type==='memu'&&(i===0||i===5)){
        box(car,(i===0?1:-1)*(L/2+.03),2.4,0,.1,.82,2.2,colors.glass);
        for(const z of [-1.1,1.1])box(car,(i===0?1:-1)*(L/2+.12),1.35,z,.08,.18,.23,colors.yellow);
      }
    }
  }
  train.scale.setScalar(.82);
  return train;
}
