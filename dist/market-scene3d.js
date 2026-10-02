import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';

// The 3D layer shows the existing market state. The server still owns presence,
// offers, inventory and trade confirmation; the HTML controls remain accessible.
export function createMarketScene({onPeer,onSpot}){
 const loader=new GLTFLoader();
 const names=['market-entrance','market-stall','exchange-table','produce-crate','market-lantern'];
 const load=url=>loader.loadAsync(url);
 let assets=null,avatar=null,renderer=null,scene=null,camera=null,canvas=null,host=null,latest=null;
 let stalls=[],actors=new Map(),last=0,ready=false,failed=false,previousCount=0;
 const palette=[0x659ac6,0xc77b8f,0x89a55b,0xeeb45c,0x9b86bd,0x57aaa0];
 const color=id=>palette[Array.from(id).reduce((n,c)=>n+c.charCodeAt(0),0)%palette.length];
 const spotPosition=(spot,mobile)=>new THREE.Vector3((spot%6-2.5)*(mobile?1.4:3.2),.1,1.15+Math.floor(spot/6)*1.15);
 const promise=Promise.all([...names.map(name=>load(`./assets/market/${name}.glb`)),load('./assets/avatars/student-base.glb')]).then(rows=>{
  assets=new Map(names.map((name,i)=>[name,rows[i]]));avatar=rows.at(-1);
  if(!['idle','walk','wave'].every(name=>avatar.animations.some(clip=>clip.name===name)))throw Error('Student avatar animation missing');
  ready=true;if(latest)update(latest);
 }).catch(error=>{failed=true;console.warn('3D market unavailable; keeping accessible 2D market',error)});

 function makeScene(){
  scene=new THREE.Scene();scene.background=new THREE.Color(0xb8d69a);
  scene.add(new THREE.HemisphereLight(0xfff9e6,0x709869,2));
  const sun=new THREE.DirectionalLight(0xffe6b4,2);sun.position.set(-5,12,8);scene.add(sun);
  camera=new THREE.OrthographicCamera(-8,8,6,-6,.1,100);
  renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<760?.85:1));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  canvas=renderer.domElement;canvas.setAttribute('aria-label','친구 캐릭터와 가판대가 있는 3D 장터. 가판대나 땅을 누르면 이동합니다.');
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(54,20),new THREE.MeshBasicMaterial({color:0xb2d58f}));ground.rotation.x=-Math.PI/2;ground.position.y=-.08;scene.add(ground);
  const path=new THREE.Mesh(new THREE.PlaneGeometry(54,5.4),new THREE.MeshBasicMaterial({color:0xf2dda9}));path.rotation.x=-Math.PI/2;path.position.set(0,-.06,2.2);scene.add(path);
  const plaza=new THREE.Mesh(new THREE.CircleGeometry(3.4,32),new THREE.MeshBasicMaterial({color:0xe8d19a}));plaza.rotation.x=-Math.PI/2;plaza.position.set(0,-.05,1.5);plaza.scale.set(1.65,1,1);scene.add(plaza);
  place('market-entrance',0,-5.2);place('exchange-table',0,.15);
  for(const x of [-16,16])for(const z of [-4.5,3.8])place('market-lantern',x,z);
  for(const x of [-18,18])for(const z of [-3.8,3.5]){
   const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.15,.22,1,6),new THREE.MeshStandardMaterial({color:0x936947,roughness:1}));trunk.position.set(x,.45,z);scene.add(trunk);
   const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(.75,0),new THREE.MeshStandardMaterial({color:0x6ba653,roughness:1}));crown.position.set(x,1.4,z);scene.add(crown);
  }
  canvas.addEventListener('pointerup',clickCanvas);
  requestAnimationFrame(frame);
 }
 function place(name,x,z,rotation=0){const model=assets.get(name).scene.clone(true);model.position.set(x,0,z);model.rotation.y=rotation;scene.add(model);return model}
 function rebuildStalls(count){
  for(const stall of stalls){scene.remove(stall.model);scene.remove(stall.crate)}stalls=[];
  const xs=count===3?[-3.25,0,3.25]:[-12.5,-7.5,-2.5,2.5,7.5,12.5];
  xs.forEach((x,i)=>{
   const model=place('market-stall',x,-1.8),crate=place('produce-crate',x+.85,-.72);
   const colors=[0xd99b78,0x7fb4a3,0xe7c77a,0xc49aba,0xc97e68,0x88b3a5];
   model.traverse(node=>{if(!node.isMesh||!['awningMain','awningAccent'].includes(node.material?.name))return;node.material=node.material.clone();node.material.color.setHex(colors[i%colors.length])});
   stalls.push({model,crate,x,peer:null});
  });previousCount=count;
 }
 function makeActor(row){
  const group=new THREE.Group(),figure=avatar.scene.clone(true),changed=new Map();
  figure.scale.setScalar(1.14);group.add(figure);group.scale.setScalar(1.2);
  figure.traverse(node=>{if(!node.isMesh||!node.material)return;if(!changed.has(node.material)){const material=node.material.clone();if(material.name==='shirt')material.color.setHex(row.practice?0xc77b8f:color(row.id));changed.set(node.material,material)}node.material=changed.get(node.material)});
  const mixer=new THREE.AnimationMixer(figure),actions=Object.fromEntries(avatar.animations.map(clip=>[clip.name,mixer.clipAction(clip)]));
  scene.add(group);const actor={group,mixer,actions,current:'',changed,target:new THREE.Vector3(),waving:false};actors.set(row.id,actor);return actor;
 }
 function removeActor(id){const a=actors.get(id);if(!a)return;scene.remove(a.group);a.mixer.stopAllAction();a.mixer.uncacheRoot(a.group.children[0]);a.changed.forEach(material=>material.dispose());actors.delete(id)}
 function play(a,name){if(a.current===name||!a.actions[name])return;if(a.current)a.actions[a.current].stop();a.actions[name].reset().play();if(name==='wave'){a.actions[name].setLoop(THREE.LoopOnce,1);a.actions[name].clampWhenFinished=true}a.current=name}
 function resize(){if(!host||!renderer)return;const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);const span=12.8,aspect=w/h;camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;camera.position.set(0,10.5,15.5);camera.lookAt(0,.4,-.2);camera.updateProjectionMatrix()}
 function project(point){const v=point.clone().project(camera);return {x:(v.x*.5+.5)*host.clientWidth,y:(-v.y*.5+.5)*host.clientHeight}}
 function placeLabels(){if(!host||!latest)return;
  host.querySelectorAll('.market-stall').forEach((button,i)=>{const item=stalls[i];if(!item)return;const p=project(new THREE.Vector3(item.x,2.65,-1.8)),half=button.offsetWidth/2;button.style.left=Math.max(half+4,Math.min(host.clientWidth-half-4,p.x))+'px';button.style.top=Math.max(24,Math.min(host.clientHeight-24,p.y))+'px'});
  for(const [id,a] of actors){const marker=id===latest.me.id?host.querySelector('#marketHero'):host.querySelector(`.market-visitor[data-market-peer="${CSS.escape(id)}"]`);if(!marker)continue;const p=project(a.group.position.clone().add(new THREE.Vector3(0,2.3,0)));marker.style.left=Math.max(45,Math.min(host.clientWidth-45,p.x))+'px';marker.style.top=Math.max(22,Math.min(host.clientHeight-22,p.y))+'px';marker.hidden=false}
 }
 function frame(now){requestAnimationFrame(frame);if(!renderer||!host||document.hidden||document.body.dataset.screen!=='market'||!host.isConnected)return;if(now-last<45)return;const dt=Math.min(.08,(now-last)/1000||.05);last=now;
  if(canvas.parentElement!==host)host.prepend(canvas);
  if(canvas.width!==Math.round(host.clientWidth*renderer.getPixelRatio())||canvas.height!==Math.round(host.clientHeight*renderer.getPixelRatio()))resize();
  for(const a of actors.values()){const distance=a.group.position.distanceTo(a.target),moving=distance>.05;if(moving){a.group.position.lerp(a.target,Math.min(1,dt*5));a.group.rotation.y=Math.atan2(a.target.x-a.group.position.x,a.target.z-a.group.position.z)}play(a,moving?'walk':a.waving?'wave':'idle');a.mixer.update(dt)}
  camera.updateMatrixWorld();placeLabels();renderer.render(scene,camera);
 }
 function clickCanvas(event){if(!latest||!host)return;const rect=canvas.getBoundingClientRect(),pointer=new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1),ray=new THREE.Raycaster();ray.setFromCamera(pointer,camera);
  const targets=[...stalls.map(s=>s.model),...actors.values().map(a=>a.group)],hits=ray.intersectObjects(targets,true);
  for(const hit of hits){let node=hit.object;while(node&&!stalls.some(s=>s.model===node)&&![...actors.values()].some(a=>a.group===node))node=node.parent;if(!node)continue;const stall=stalls.find(s=>s.model===node);if(stall?.peer){onPeer(stall.peer);return}const actor=[...actors.entries()].find(([,a])=>a.group===node);if(actor&&actor[0]!==latest.me.id){onPeer(actor[0]);return}}
  const ground=new THREE.Plane(new THREE.Vector3(0,1,0),0),point=new THREE.Vector3();if(!ray.ray.intersectPlane(ground,point))return;const mobile=host.clientWidth<650;let closest=0,distance=Infinity;for(let i=0;i<12;i++){const p=spotPosition(i,mobile),d=p.distanceToSquared(point);if(d<distance){closest=i;distance=d}}onSpot(closest);
 }
 function update(data){latest=data;if(failed||!ready||!data?.root||document.body.dataset.screen!=='market')return;
  const nextHost=data.root.querySelector('.market-plaza');if(!nextHost)return;if(!renderer)makeScene();host=nextHost;if(canvas.parentElement!==host)host.prepend(canvas);host.classList.add('market-3d');host.dataset.asset='ready';
  const count=data.root.querySelectorAll('.market-stall').length;if(count!==previousCount)rebuildStalls(count);
  stalls.forEach((stall,i)=>{stall.peer=data.shown[i]?.id||null});
  const mobile=host.clientWidth<850,rows=data.visitors.filter(row=>row.id===data.me.id||data.visitors.findIndex(v=>v.id===row.id)<(mobile?5:9));
  if(!rows.some(row=>row.id===data.me.id))rows.unshift({id:data.me.id,spot:data.spot});
  if(data.trial){const guide=data.shown.find(peer=>peer.id!==data.me.id&&!rows.some(row=>row.id===peer.id));if(guide)rows.push({id:guide.id,spot:9,practice:true})}
  const ids=new Set(rows.map(row=>row.id));for(const id of actors.keys())if(!ids.has(id))removeActor(id);
  for(const row of rows){const a=actors.get(row.id)||makeActor(row);a.target.copy(spotPosition(row.id===data.me.id?data.spot:row.spot,mobile));if(!a.group.userData.placed){a.group.position.copy(a.target);a.group.userData.placed=true}a.waving=row.greeting==='wave';for(const material of a.changed.values()){material.transparent=!!row.away;material.opacity=row.away?.38:1;material.depthWrite=!row.away}}
  host.dataset.actors=String(actors.size);host.dataset.stalls=String(stalls.length);resize();placeLabels();
 }
 return {update,ready:promise};
}
