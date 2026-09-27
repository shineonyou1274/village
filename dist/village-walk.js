import * as THREE from './vendor/three.module.js';
// Future destinations are scenery; details belong to the panel, never over the field.
export function createVillageWalk({world,viewport,artSprite,getState,isFarm,home,chooseTomato}){
 const root=new THREE.Group();world.add(root);
 const places=[{name:'토마토 씨앗터',icon:'🍅',x:-9,z:-5,cell:7},{name:'콩 연구터',icon:'🌿',x:-9,z:5,cell:0},{name:'목장',icon:'🐄',x:9,z:-5,cell:10},{name:'머지 놀이터',icon:'🎲',x:9,z:5,cell:13}];
 const panel=document.createElement('details');panel.className='village-destinations';panel.innerHTML='<summary>마을 성장 지도 · 앞으로 열릴 곳</summary><p>풍경 속 시설은 성장 목표예요. 실제 재배는 내 밭에서 해요.</p><div class="destination-tabs"></div><div class="destination-detail"><b></b><p></p><button></button></div>';viewport.parentElement.append(panel);
 let selected=0,last='';
 const buttons=places.map((p,i)=>{const art=artSprite(p.cell,3,3);art.position.set(p.x,1.5,p.z);root.add(art);const b=document.createElement('button');b.textContent=p.icon+' '+p.name;b.onclick=()=>{selected=i;draw()};panel.querySelector('.destination-tabs').append(b);return b});
 function draw(){const s=getState(),n=s.farm?.picked||0;const texts=[n<16?`누적 수확 16개에 토마토 씨앗이 열려요. 지금 ${n}개 · ${16-n}개 더 수확하세요.`:'토마토 씨앗이 열렸어요. 씨앗을 고르고 내 빈 밭에 심으세요.','콩 재배는 준비 중이에요. 아직 심거나 구매할 수 없어요.',s.cow?'젖소에게 먹이와 물을 주고 우유를 모아요.':`목장 목표: 누적 수확 80개 + 100코인. 수확 ${Math.max(0,80-n)}개 · ${Math.max(0,100-(s.coins||0))}코인 더 필요해요.`,'같은 그림을 합쳐 나눔 상자를 만들어요. 하루 첫 완성에 10코인을 받아요.'];const d=panel.querySelector('.destination-detail');d.children[0].textContent=places[selected].icon+' '+places[selected].name;d.children[1].textContent=texts[selected];d.children[2].textContent=['내 밭으로','준비 중','목장 조건 보기','머지 놀이 시작'][selected];d.children[2].disabled=selected===1;buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===selected)))}
 panel.querySelector('.destination-detail button').onclick=()=>{if(selected===0){home();if((getState().farm?.picked||0)>=16)chooseTomato()}else if(selected===2){document.querySelector('.farm-progression').open=true;document.querySelector('.farm-progression').scrollIntoView({block:'nearest'})}else if(selected===3)window.openMergeGame?.()};
 draw();return {get target(){return null},tick(){const n=getState().farm?.picked||0;root.visible=isFarm()&&n>0;panel.hidden=!isFarm();const stamp=n+':'+getState().coins+':'+!!getState().cow;if(stamp!==last){last=stamp;draw()}}};
}
