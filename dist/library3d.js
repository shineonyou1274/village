import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';

const interior=document.querySelector('.study-interior');
const seatTools=interior?.querySelector('.seat-tools');
const floorList=interior?.querySelector('.cafe-floor');
if(interior&&seatTools&&floorList){
 const list=document.createElement('details');list.className='library-seat-list';
 list.innerHTML='<summary>번호별 자리 목록 펼치기</summary>';
 floorList.before(list);
 const oldZones=interior.querySelector('.zone-tabs'),oldPaging=interior.querySelector('.compact-seat-paging');
 if(oldZones)list.append(oldZones);list.append(floorList);if(oldPaging)list.append(oldPaging);
 const host=document.createElement('section');host.className='library3d';host.dataset.ready='false';host.setAttribute('aria-label','별빛도서관 입체 좌석 지도');
 host.innerHTML='<div class="library3d-top"><strong>자리를 골라 보세요</strong><span>친구가 앉은 자리도 보여요</span></div><nav class="library3d-zones" aria-label="도서관 공간 선택"><button type="button" data-library-zone="library">조용한 열람실 · 1~12</button><button type="button" data-library-zone="window">달빛 창가 · 13~24</button><button type="button" data-library-zone="fireside">서재 · 25~30</button><button type="button" data-library-zone="lounge">라운지</button></nav><div class="library3d-stage"><div class="library3d-markers"></div><p class="library3d-loading" role="status">도서관 공간을 준비하고 있어요…</p></div><p class="library3d-help">빈 번호를 누른 뒤 공부 시작을 누르면 자리가 확정돼요.</p>';
 seatTools.after(host);
 const stage=host.querySelector('.library3d-stage'),markers=host.querySelector('.library3d-markers'),loading=host.querySelector('.library3d-loading');
 const spots=[];
 for(const z of [-5.2,-3.2,-1.2,.8])for(const x of [-5.3,-3.4,-1.5])spots.push({number:spots.length+1,zone:'library',x,z,kind:'study-desk-chair'});
 for(const z of [-5.2,-3.2,-1.2])for(const x of [1.1,3,4.9])spots.push({number:spots.length+1,zone:'window',x,z,kind:'study-desk-chair'});
 spots.push({number:22,zone:'window',x:4.9,z:.8,kind:'study-desk-chair'});
 spots.push({number:23,zone:'window',x:7.45,z:1.8,kind:'window-desk',rotation:-Math.PI/2});
 spots.push({number:24,zone:'window',x:7.45,z:4.2,kind:'window-desk',rotation:-Math.PI/2});
 for(const z of [3.2,5.2])for(const x of [-5.3,-3.4,-1.5])spots.push({number:spots.length+1,zone:'fireside',x,z,kind:'study-desk-chair'});
 const byNumber=new Map(spots.map(s=>[s.number,s]));
 let zone='library',latest=null,scene,camera,renderer,studentGltf,ready=false,scheduled=false;
 const avatars=new Map();
 const targets={library:[-3.4,-2.3],window:[4.2,-2.2],fireside:[-3.8,4.1],lounge:[5.2,4.8]};
 function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;draw()})}
 function draw(){
  if(!ready||!stage.clientWidth||!stage.clientHeight)return;
  const width=stage.clientWidth,height=stage.clientHeight,aspect=width/height,span=width<700?6.1:5.8;
  renderer.setSize(width,height,false);renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));
  const [x,z]=targets[zone];camera.position.set(x+5,13,z+13);camera.lookAt(x,.2,z);
  camera.left=-span*aspect;camera.right=span*aspect;camera.top=span;camera.bottom=-span;camera.updateProjectionMatrix();camera.updateMatrixWorld();
  for(const button of markers.querySelectorAll('[data-seat3d]')){
   const spot=byNumber.get(Number(button.dataset.seat3d));const occupied=button.classList.contains('occupied');const p=new THREE.Vector3(spot.x,occupied?2.35:1.12,spot.z).project(camera);
   button.style.left=((p.x+1)*50)+'%';button.style.top=((1-p.y)*50)+'%';
   button.hidden=Math.abs(p.x)>1.04||Math.abs(p.y)>1.04;
  }
  renderer.render(scene,camera);
 }
 function seatMarkers(){
  markers.replaceChildren();if(!latest||zone==='lounge')return;
  const seats=latest.seats||[];
  for(const spot of spots.filter(s=>s.zone===zone)){
   const p=seats.find(s=>s.number===spot.number),mine=!!p&&p.actor===latest.actor,chosen=latest.pickedDesk?.room===latest.viewedHall&&latest.pickedDesk.number===spot.number;
   const button=document.createElement('button');button.type='button';button.className='library3d-seat'+(p?' occupied':'')+(mine?' mine':'')+(chosen?' picked':'');
   button.dataset.seat3d=String(spot.number);button.textContent=mine?'✦'+spot.number:String(spot.number);
   button.setAttribute('aria-label',`${spot.number}번 ${p?`${p.name} · ${p.status}`:'빈자리'}${mine?' · 내 자리':''}`);
   if(mine)button.setAttribute('aria-current','true');
   button.title=p?`${p.name} · ${p.status}`:`${spot.number}번 빈자리`;
   button.disabled=!!interior.querySelector(`.cafe-floor [data-desk="${spot.number}"]`)?.disabled;
   markers.append(button);
  }
 }
 function syncAvatars(){
  if(!ready||!latest)return;
  const seats=latest.seats||[],active=new Set(seats.map(s=>s.number));
  for(const [number,entry]of avatars)if(!active.has(number)||seats.find(s=>s.number===number)?.actor!==entry.actor){scene.remove(entry.root);avatars.delete(number)}
  let resting=0;
  for(const person of seats){
   const spot=byNumber.get(person.number);if(!spot)continue;
   let entry=avatars.get(person.number);
   if(!entry){
    const root=studentGltf.scene.clone(true);root.name=`student-seat-${person.number}`;
    root.traverse(node=>{if(node.isMesh&&node.material?.name==='shirt'){node.material=node.material.clone();node.material.color.setHex([0xc9877a,0x8cad91,0xd0a371,0xb3869a][person.number%4])}});
    const sit=THREE.AnimationClip.findByName(studentGltf.animations,'sit');if(sit){const mixer=new THREE.AnimationMixer(root);const action=mixer.clipAction(sit);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();mixer.update(sit.duration)}
    scene.add(root);entry={actor:person.actor,root};avatars.set(person.number,entry);
   }
   const rest=person.status==='쉬는 중';
   if(rest){const n=resting++;entry.root.position.set(4.6+(n%3)*.55,0,4.4+Math.floor(n/3)*.45);entry.root.rotation.y=Math.PI}
   else{entry.root.position.set(spot.x+(spot.kind==='window-desk'?.35:0),0,spot.z+(spot.kind==='window-desk'?0:.43));entry.root.rotation.y=spot.rotation?spot.rotation+Math.PI:Math.PI}
   entry.root.visible=zone==='lounge'?rest:!rest&&spot.zone===zone;
  }
 }
 function update(value){latest=value;if(!ready)return;seatMarkers();syncAvatars();schedule()}
 host.querySelector('.library3d-zones').onclick=e=>{const b=e.target.closest('[data-library-zone]');if(!b)return;zone=b.dataset.libraryZone;host.querySelectorAll('[data-library-zone]').forEach(n=>{n.classList.toggle('selected',n===b);n.setAttribute('aria-pressed',String(n===b))});seatMarkers();syncAvatars();schedule()};
 host.querySelector('[data-library-zone="library"]').click();
 markers.onclick=e=>{const b=e.target.closest('[data-seat3d]');if(!b||b.disabled)return;interior.querySelector(`.cafe-floor [data-desk="${b.dataset.seat3d}"]`)?.click()};
 window.library3D={update};
 async function load(){
  try{
   const loader=new GLTFLoader(),ids=['library-floor-wall','study-desk-chair','bookshelf','window-desk','lounge-sofa-table','warm-lamp'];
   const models={};await Promise.all(ids.map(async id=>{models[id]=(await loader.loadAsync(`./assets/library/${id}.glb`)).scene}));
   studentGltf=await loader.loadAsync('./assets/avatars/student-base.glb');
   scene=new THREE.Scene();scene.background=new THREE.Color(0x263947);window.library3DScene=scene;
   scene.add(new THREE.HemisphereLight(0xffefcf,0x82978e,2.6));const sun=new THREE.DirectionalLight(0xffddac,2.7);sun.position.set(-5,11,8);scene.add(sun);
   const floor=new THREE.Mesh(new THREE.BoxGeometry(18,.08,16),new THREE.MeshStandardMaterial({color:0xb9ad8c,roughness:1}));floor.position.y=-.05;scene.add(floor);
   const put=(id,x,z,rotation=0)=>{const model=models[id].clone(true);model.name=id;model.position.set(x,0,z);model.rotation.y=rotation;scene.add(model);return model};
   for(const x of [-8,-6,-4,-2,0,2,4,6,8]){const wall=put('library-floor-wall',x,-7);wall.getObjectByName('floor_panel').visible=false}
   for(const z of [-5,-1,3,7]){const wall=put('library-floor-wall',-8,z,Math.PI/2);wall.getObjectByName('floor_panel').visible=false}
   for(const spot of spots)put(spot.kind,spot.x,spot.z,spot.rotation||0);
   for(const z of [-5,-2,1,4])put('bookshelf',-7.5,z,Math.PI/2);
   put('lounge-sofa-table',4.8,5.4);for(const [x,z]of [[6.6,-5.8],[-6.9,6.2],[6.6,6.5]])put('warm-lamp',x,z);
   camera=new THREE.OrthographicCamera(-10,10,6,-6,.01,100);
   renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power'});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.13;
   renderer.domElement.setAttribute('aria-hidden','true');stage.prepend(renderer.domElement);
   renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();host.dataset.ready='fallback';list.open=true;loading.textContent='입체 화면을 표시할 수 없어 번호별 자리 목록을 열었어요.'});
   ready=true;host.dataset.ready='true';loading.hidden=true;
   new ResizeObserver(schedule).observe(stage);window.addEventListener('resize',schedule);
   if(typeof drawSeatPlan==='function'&&typeof data!=='undefined'&&data)drawSeatPlan();else schedule();
  }catch(error){console.warn('Library scenery unavailable; numbered seats remain available',error);host.dataset.ready='fallback';list.open=true;loading.textContent='입체 화면을 불러오지 못했어요. 아래 번호별 자리 목록을 이용해 주세요.'}
 }
 load();
}
