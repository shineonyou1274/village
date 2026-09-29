import * as THREE from './vendor/three.module.js';
// One scene and one completion-based presence loop. No farm-state writes.
export function createPlaza({world,viewport,template,camera,enterMarket}){
 const root=new THREE.Group();world.add(root);root.visible=false;
 const ui=document.createElement('section');ui.className='plaza-tools';ui.hidden=true;
 ui.innerHTML='<div class="plaza-heading"><b>우리 반 만남의 광장</b><span class="plaza-connection" role="status">입장을 확인하고 있어요.</span><button data-plaza-overview aria-pressed="false">전체 지도</button></div><p>땅을 누르거나 방향키로 걸어요. 장터 입구까지 걸어가면 장터가 열립니다.</p><div class="plaza-actions"><button data-plaza-wave>👋 인사하기</button><button data-plaza-market>장터까지 걷기</button><details><summary>터치 이동 버튼</summary><div class="plaza-pad"><button data-plaza-step="up" aria-label="광장 위로 걷기">↑</button><button data-plaza-step="left" aria-label="광장 왼쪽으로 걷기">←</button><button data-plaza-step="down" aria-label="광장 아래로 걷기">↓</button><button data-plaza-step="right" aria-label="광장 오른쪽으로 걷기">→</button></div></details></div>';
 viewport.after(ui);
 const actors=new Map(),clock=()=>performance.now();let overview=false,joined=false,token='',timer=0,busy=false,generation=0,rows=[],queued=null,wave=false,gate=false,lastOK=0,paused=false,failed=false;
 const active=()=>document.body.dataset.screen==='village'&&window.classroomActive&&!document.hidden;
 const status=t=>{const e=ui.querySelector('.plaza-connection');if(e.textContent!==t)e.textContent=t;};
 const current=p=>{const dx=p.tx-p.x,dz=p.tz-p.z,d=Math.hypot(dx,dz),f=d?Math.min(1,(clock()-p.received)/1000*3/d):1;return {x:p.x+dx*f,z:p.z+dz*f};};
 function make(p){const g=template.clone(true);g.visible=true;const palette=[0x659ac6,0xc77b8f,0x89a55b,0xeeb45c,0x9b86bd,0x57aaa0],color=palette[Array.from(p.id).reduce((n,c)=>n+c.charCodeAt(0),0)%palette.length];g.traverse(o=>{if(o.material?.color?.getHex()===0xeeb45c){o.material=o.material.clone();o.material.color.setHex(color);o.userData.plazaMaterial=true;}});g.scale.setScalar(1.3);root.add(g);const label=document.createElement('span');label.className='plaza-name';label.dataset.peer=p.id;viewport.append(label);const actor={g,label};actors.set(p.id,actor);return actor;}
 function clear(){for(const {g,label}of actors.values()){root.remove(g);g.traverse(o=>{if(o.userData.plazaMaterial)o.material.dispose()});label.remove()}actors.clear();rows=[];}
 async function leave(t){if(t)try{await schoolFetch('/api/plaza',{action:'leave'},t)}catch{}}
 async function poll(){
  if(!active()||busy)return;
  busy=true;const t=schoolToken,gen=generation,destination=queued,greeting=wave;queued=null;wave=false;
  try{const data=await schoolFetch('/api/plaza',destination?{action:'move',...destination}:{action:greeting?'wave':'visit'},t);
   if(gen!==generation||!active()||t!==schoolToken){await leave(t);return}
   rows=data.visitors.map(p=>({...p,received:clock()}));lastOK=clock();paused=data.paused;failed=false;joined=true;
   // Render server-derived movement, not a separate client position.
   for(const p of rows){const a=actors.get(p.id)||make(p);a.label.textContent=(p.id===classroomData.me.id?p.name+' · 나':p.name)+(p.wave?' 👋':'');a.label.classList.toggle('is-me',p.id===classroomData.me.id);}
   const ids=new Set(rows.map(p=>p.id));for(const [id,a]of actors){if(!ids.has(id)){root.remove(a.g);a.label.remove();actors.delete(id)}}
   status(state.trial?'체험 광장 · 실제 친구는 학급 입장 후 만나요':`같은 광장에 ${rows.length}명 · 연결됨`);
  }catch(e){if(gen===generation){failed=true;gate=false;status(e.message||'연결을 다시 확인하고 있어요.');if(clock()-lastOK>15000)clear();}}
  finally{busy=false;if(active())timer=setTimeout(poll,1100+Math.random()*150);}
 }
 function change(){const on=active();ui.hidden=document.body.dataset.screen!=='village';root.visible=on&&!overview;if(!on){generation++;clearTimeout(timer);const old=token;token='';joined=false;gate=false;queued=null;clear();leave(old);return}if(token===schoolToken)return;token=schoolToken;generation++;clearTimeout(timer);status('입장을 확인하고 있어요.');poll();}
 function destination(x,z,toMarket=false){if(!active()||!joined||failed||paused){status('연결을 확인한 뒤 걸을 수 있어요.');return}queued={x:Math.max(-4.8,Math.min(4.8,x)),z:Math.max(-17,Math.min(-10.8,z))};gate=toMarket;clearTimeout(timer);if(!busy)poll();viewport.focus({preventScroll:true});}
 function step(key){const self=rows.find(p=>p.id===classroomData?.me?.id);if(!self)return;const p=queued||current(self);const angle=Math.atan2(camera.position.x,camera.position.z+14);const dx=({left:-1,right:1}[key]||0)*1.2,dz=({up:-1,down:1}[key]||0)*1.2;destination(p.x+Math.cos(angle)*dx+Math.sin(angle)*dz,p.z-Math.sin(angle)*dx+Math.cos(angle)*dz);}
 ui.onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-plaza-overview')){overview=!overview;b.textContent=overview?'광장으로 돌아오기':'전체 지도';b.setAttribute('aria-pressed',String(overview));ui.querySelector('.plaza-actions').hidden=overview;}if(b.hasAttribute('data-plaza-market'))destination(0,-17,true);if(b.dataset.plazaStep)step(b.dataset.plazaStep);if(b.hasAttribute('data-plaza-wave')){if(!joined||failed)return;wave=true;clearTimeout(timer);if(!busy)poll();}};
 viewport.addEventListener('keydown',e=>{if(!active()||overview||e.target!==viewport||document.querySelector('dialog[open]'))return;const k={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'}[e.key];if(k){e.preventDefault();step(k)}});
 window.addEventListener('village-screen-change',change);document.addEventListener('visibilitychange',change);
 window.addEventListener('pagehide',()=>{if(token)fetch('/api/plaza',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify({action:'leave'}),keepalive:true}).catch(()=>{})});
 // Read-only telemetry for end-to-end movement assertions.
 return {get closeView(){return active()&&!overview},sync:change,click(point,market){if(overview)return false;if(market)destination(0,-17,true);else destination(point.x,point.z);return true;},tick(){
  ui.hidden=document.body.dataset.screen!=='village';if(active()&&!token)change();root.visible=active()&&!overview;
  if(lastOK&&clock()-lastOK>15000){failed=true;clear();status('연결이 끊겼어요. 다시 연결하고 있습니다.');}
  for(const p of rows){const a=actors.get(p.id);if(!a)continue;const pos=current(p),moving=Math.hypot(p.tx-pos.x,p.tz-pos.z)>.08;a.g.position.set(pos.x,.1+(moving?Math.abs(Math.sin(clock()/90))*.035:0),pos.z);const limbs=a.g.children[0]?.children;if(limbs?.[2]&&limbs?.[3]){limbs[2].rotation.x=moving?Math.sin(clock()/90)*.6:0;limbs[3].rotation.x=-limbs[2].rotation.x;}if(moving)a.g.rotation.y=Math.atan2(p.tx-pos.x,p.tz-pos.z);a.label.hidden=!root.visible;const v=a.g.position.clone().add(new THREE.Vector3(0,2.3,0)).project(camera);a.label.style.left=(v.x*.5+.5)*viewport.clientWidth+'px';a.label.style.top=(-v.y*.5+.5)*viewport.clientHeight+'px';a.label.dataset.x=pos.x.toFixed(2);a.label.dataset.z=pos.z.toFixed(2);if(p.id===classroomData.me.id&&gate&&!failed&&Math.hypot(pos.x,pos.z+17)<.15){gate=false;enterMarket();}}
 }};
}
