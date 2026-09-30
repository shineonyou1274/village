import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';

// This layer owns only scenery and controls. Plot count, coins, cow care and
// rewards remain in the existing game state and server action path.
export function createLandRanch({land,viewport,getState,isFarm,onExpand,onCowAction,onRanchView}){
 const loader=new GLTFLoader(),assets=new Map(),root=new THREE.Group();land.add(root);
 const load=(folder,name)=>new Promise(resolve=>loader.load(`./assets/${folder}/${name}.glb`,g=>{assets.set(name,g);resolve(g)},undefined,()=>resolve(null)));
 let plotCount=-1,landReady=false,cowModel=null,cowMixer=null,cowActions={},cowClip='',lastCare='';
 const road=new THREE.Group(),fence=new THREE.Group(),ranch=new THREE.Group();root.add(road,fence,ranch);
 const barnSpot=new THREE.Vector3(9.2,0,-4),cowSpot=new THREE.Vector3(9.2,0,1.5);
 const marker=document.createElement('button');marker.type='button';marker.className='land-expansion-marker';marker.onpointerdown=e=>{e.preventDefault();e.stopPropagation();onExpand()};marker.onclick=e=>{e.stopPropagation();if(e.detail===0)onExpand()};viewport.append(marker);
 const ranchButton=document.createElement('button');ranchButton.type='button';ranchButton.className='ranch-marker';ranchButton.textContent='🐄 목장';const toggleRanch=()=>{panel.hidden=!panel.hidden;onRanchView(!panel.hidden);if(!panel.hidden)updateCare()};ranchButton.onpointerdown=e=>{e.preventDefault();e.stopPropagation();toggleRanch()};ranchButton.onclick=e=>{e.stopPropagation();if(e.detail===0)toggleRanch()};viewport.append(ranchButton);
 const panel=document.createElement('section');panel.className='ranch-panel';panel.hidden=true;panel.innerHTML='<button type="button" class="ranch-close" aria-label="목장 닫기">×</button><b>🐄 나의 목장</b><p class="ranch-status"></p><div class="ranch-actions"></div><small>먹이와 물을 챙긴 뒤 20초가 지나면 우유를 모을 수 있어요.</small>';viewport.append(panel);
 panel.querySelector('.ranch-close').onclick=()=>{panel.hidden=true;onRanchView(false)};
 panel.querySelector('.ranch-actions').onclick=async e=>{const b=e.target.closest('[data-cow]');if(!b||b.disabled)return;b.disabled=true;try{await onCowAction(b.dataset.cow)}finally{updateCare()}};
 function placed(name,parent,x,y,z){const asset=assets.get(name);if(!asset)return null;const model=asset.scene.clone(true);model.position.set(x,y,z);parent.add(model);return model}
 function buildLand(n){
  road.clear();fence.clear();const back=n<=6?3.3:n<=8?6.3:9.3;
  // Beds retain their 2.7m × 3m positions; modular scenery has its own 2m grid.
  // A half-length last road tile bridges the 3m first expansion without changing plots.
  const segments=n<=6?0:n<=8?2:3;
  for(let i=0;i<segments;i++){const tile=placed('road-straight',road,-5.15,.12,i===0?4.3:i===1&&n<=8?5.8:4.3+i*2);if(tile&&i===1&&n<=8)tile.scale.z=.5}
  for(let i=0;i<6;i++)placed(i===0?'fence-gate':'fence-straight',fence,-5+i*2,0,back);
  const sign=placed('empty-lot-sign',fence,-4.9,0,back+1.65);if(sign)sign.visible=n<12;
  plotCount=n;viewport.dataset.landPlots=String(n);viewport.dataset.landBoundary=back.toFixed(1);
 }
 function updateCare(){
  const s=getState(),c=s.cow,done=!!c&&c.milkDay>=s.day,ready=(s.farm?.picked||0)>=80&&s.coins>=100;
  const key=[!!c,c?.fedAt||0,!!c?.watered,c?.milkDay||0,s.day,s.coins,s.farm?.picked,s.stock?.[0]].join(':');
  if(key===lastCare)return;lastCare=key;
  panel.querySelector('.ranch-status').textContent=!c?`입양 목표 · 수확 ${Math.max(0,80-(s.farm?.picked||0))}개, 코인 ${Math.max(0,100-s.coins)}개 더 필요해요.`:done?'오늘의 돌봄을 마쳤어요. 우유 2개를 모았어요.':c.fedAt&&c.watered?'먹이와 물을 챙겼어요. 잠시 뒤 우유를 모을 수 있어요.':c.fedAt?'먹이를 먹었어요. 물을 주세요.':c.watered?'물을 마셨어요. 먹이를 주세요.':'먹이와 물을 기다리고 있어요.';
  const actions=panel.querySelector('.ranch-actions');
  actions.innerHTML=!c?`<button data-cow="cow_adopt" ${ready?'':'disabled'}>젖소 입양 · 100코인</button>`:`<button data-cow="cow_feed" ${done||c.fedAt||!s.stock?.[0]?'disabled':''}>먹이 주기 · 상추 1개</button><button data-cow="cow_water" ${done||c.watered?'disabled':''}>물 주기</button><button data-cow="cow_milk" ${done||!c.fedAt||!c.watered||Date.now()-c.fedAt<20000?'disabled':''}>우유 2개 모으기</button>`;
  if(cowModel)cowModel.visible=!!c;
  viewport.dataset.ranchCow=c?'adopted':'locked';
 }
 function playCow(name){if(cowClip===name||!cowActions[name])return;if(cowClip)cowActions[cowClip]?.stop();cowActions[name].reset().play();cowClip=name}
 function sync(){const s=getState(),n=s.farm?.plots?.length||6;if(landReady&&n!==plotCount)buildLand(n);updateCare();const cost=n===6?40:n===8?60:80;marker.textContent=n>=12?'':`＋ 다음 땅 · 밭 2칸 · ${cost}코인`;marker.hidden=!isFarm()||n>=12;ranchButton.hidden=!isFarm();if(!isFarm())panel.hidden=true;return landReady}
 function tick(dt){sync();const visible=isFarm();root.visible=visible;if(!visible)return;
  if(cowMixer){const c=getState().cow,done=!!c&&c.milkDay>=getState().day;playCow(!c||done?'idle':c.fedAt&&!c.watered?'eat':c.watered&&!c.fedAt?'drink':'idle');cowMixer.update(dt)}
  if(!panel.hidden&&getState().cow?.fedAt&&Date.now()-getState().cow.fedAt>=20000){lastCare='';updateCare()}
 }
 const landLoaded=Promise.all(['road-straight','fence-straight','fence-gate','empty-lot-sign'].map(name=>load('land',name)));
 landLoaded.then(()=>{landReady=assets.has('fence-straight')&&assets.has('fence-gate');if(landReady)buildLand(getState().farm?.plots?.length||6);sync()});
 landLoaded.then(()=>Promise.all(['barn','cow','feed-trough','water-trough','milk-collection'].map(name=>load('ranch',name)))).then(()=>{
  placed('barn',ranch,barnSpot.x,0,barnSpot.z);
  placed('road-straight',ranch,9.2,.12,-1.4);
  placed('fence-gate',ranch,9.2,0,-.4);
  placed('feed-trough',ranch,7.7,0,1.2);placed('water-trough',ranch,10.6,0,1.2);placed('milk-collection',ranch,10.6,0,3.1);
  const source=assets.get('cow');if(source){cowModel=source.scene.clone(true);cowModel.position.copy(cowSpot);ranch.add(cowModel);cowMixer=new THREE.AnimationMixer(cowModel);cowActions=Object.fromEntries(source.animations.map(clip=>[clip.name,cowMixer.clipAction(clip)]));cowModel.visible=!!getState().cow;playCow('idle')}
  viewport.dataset.ranchAsset=source&&assets.has('barn')?'ready':'fallback';sync();
 });
 return {sync,tick,get landReady(){return landReady}};
}
