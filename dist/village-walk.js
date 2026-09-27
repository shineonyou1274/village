import * as THREE from './vendor/three.module.js';
export function createVillageWalk({world,viewport,farmer,artSprite,getState,isFarm,home,chooseTomato}){
const root=new THREE.Group();world.add(root);const guide=farmer.clone(true);guide.scale.setScalar(.95);root.add(guide);guide.position.set(-6,.1,0);
const places=[{name:'토마토 씨앗터',icon:'🍅',x:-10,z:-5,cell:7},{name:'콩 연구터 · 준비 중',icon:'🌿',x:-10,z:5,cell:0},{name:'목장 자리',icon:'🐄',x:10,z:-5,cell:10},{name:'머지 놀이터',icon:'🎲',x:10,z:5,cell:13}];
const pathMat=new THREE.MeshStandardMaterial({color:0xe4ce9d,roughness:1});
function path(w,d,x,z){const m=new THREE.Mesh(new THREE.BoxGeometry(w,.04,d),pathMat);m.position.set(x,.09,z);root.add(m)}
path(21,.8,0,-7);path(21,.8,0,7);path(.8,14,-8,0);path(.8,14,8,0);
const buttons=[];for(const [i,p]of places.entries()){const art=artSprite(p.cell,3.4,3.4);art.position.set(p.x,1.7,p.z);root.add(art);const b=document.createElement('button');b.className='walk-place';b.textContent=p.icon+' '+p.name;b.dataset.walkPlace=String(i);viewport.append(b);buttons.push(b)}
viewport.addEventListener('click',e=>{const b=e.target.closest('[data-walk-place]');if(!b)return;destination=Number(b.dataset.walkPlace);waiting=0;hidden=false;expanded=true;detail=destination;syncDetails()});
const bubble=document.createElement('section');bubble.className='walk-details';bubble.setAttribute('aria-label','길잡이 상세 안내');bubble.id='walkDetails';bubble.innerHTML='<button class="walk-close" aria-label="길잡이 안내 닫기">×</button><b>마을 길잡이</b><p></p><button class="walk-action"></button>';viewport.after(bubble);
const hint=document.createElement('button');hint.className='walk-hint';hint.setAttribute('aria-controls','walkDetails');hint.setAttribute('aria-expanded','false');viewport.append(hint);hint.onclick=()=>{detail=destination;expanded=!expanded;hidden=false;syncDetails()};
const tour=document.createElement('button');tour.className='walk-tour';tour.textContent='🚶 길잡이와 산책';viewport.append(tour);
let destination=0,waiting=0,following=false,hidden=false,expanded=false,detail=0,lastText='',lastAction='';
viewport.querySelector('#cameraHome').addEventListener('click',()=>{following=false;tour.textContent='🚶 길잡이와 산책'});
tour.onclick=()=>{following=!following;hidden=false;tour.textContent=following?'산책 시점 끝내기':'🚶 길잡이와 산책'};
bubble.querySelector('.walk-close').onclick=()=>{hidden=true;expanded=false;bubble.hidden=true;hint.hidden=true;following=false;tour.textContent='🚶 길잡이와 산책'};
bubble.querySelector('.walk-action').onclick=()=>{expanded=false;if(detail===0){if((getState().farm?.picked||0)>=16)chooseTomato();else home();following=false}else if(detail===2){home();following=false;document.querySelector('.farm-progression').open=true}else if(detail===3){window.openMergeGame?.()}else{destination=3;waiting=0;following=true;hidden=false}};
function words(p){const s=getState(),n=s.farm?.picked||0,coins=s.coins||0;
if(p===0)return n<16?[`여긴 토마토 씨앗터야! ${16-n}개를 더 수확하면 토마토를 심을 수 있어. 기본 상추 수확으로 약 ${Math.ceil((16-n)/2)}번이야. 날짜를 기다릴 필요는 없어!`,'내 밭에서 수확하기']:[`토마토 씨앗이 열렸어! 씨앗을 골라 내 빈 밭에 심어 봐. 이곳의 토마토는 안내용 견본이야.`,'토마토 씨앗 고르기'];
if(p===1)return ['여긴 앞으로 콩을 연구할 자리야. 지금은 준비 중이라 심거나 구매할 수 없어. 현재는 상추부터 딸기까지 다섯 작물을 키울 수 있어!','놀이터로 걸어가기'];
if(p===2)return s.cow?['젖소가 있는 농장이 되었네! 먹이와 물을 챙기고 우유를 모아 보자.','젖소 돌보기']:[`이 자리처럼 목장을 키워 보자! 입양 조건은 누적 수확 80개와 100코인. 지금은 수확 ${Math.max(0,80-n)}개 · ${Math.max(0,100-coins)}코인이 더 필요해. 소 그림은 미래 모습 견본이야.`,'입양 조건 보기'];
return ['일하다가 잠깐 쉬어 갈까? 같은 그림을 합쳐 나눔 상자를 만들면 하루 한 번 10코인을 받아. 농장 물건은 줄어들지 않아!','머지 놀이 시작'];}
function syncDetails(){bubble.hidden=!isFarm()||!expanded;hint.setAttribute('aria-expanded',String(expanded));const [text,action]=words(detail);bubble.querySelector('p').textContent=text;bubble.querySelector('.walk-action').textContent=action;bubble.querySelector('b').textContent=places[detail].icon+' '+places[detail].name;lastText=text;lastAction=action}
return {get target(){return following?guide.position:null},tick(dt,t,camera,reduceMotion){root.visible=isFarm();bubble.hidden=!isFarm()||!expanded;hint.hidden=!isFarm()||hidden;hint.setAttribute('aria-expanded',String(expanded));buttons.forEach(b=>b.hidden=!isFarm());tour.hidden=!isFarm();if(!isFarm()){following=false;tour.textContent='🚶 길잡이와 산책';return}const p=places[destination],goal=new THREE.Vector3(p.x+(p.x<0?2:-2),.1,p.z+1.8),delta=goal.clone().sub(guide.position),distance=delta.length();if(distance>.1){if(reduceMotion)guide.position.copy(goal);else{guide.position.addScaledVector(delta.normalize(),Math.min(distance,dt*2.4));guide.rotation.y=Math.atan2(delta.x,delta.z);guide.position.y=.1+Math.abs(Math.sin(t*7))*.06}const hips=guide.children[0];if(hips?.children[1]&&hips?.children[2]){hips.children[1].rotation.x=reduceMotion?0:Math.sin(t*7)*.5;hips.children[2].rotation.x=reduceMotion?0:-Math.sin(t*7)*.5}waiting=0}else{waiting+=dt;if(waiting>11&&!expanded){destination=(destination+1)%places.length;waiting=0}}
const [text,action]=words(detail);if(text!==lastText){bubble.querySelector('p').textContent=text;lastText=text}if(action!==lastAction){bubble.querySelector('.walk-action').textContent=action;lastAction=action}bubble.querySelector('b').textContent=places[detail].icon+' '+places[detail].name;
const w=viewport.clientWidth,h=viewport.clientHeight,n=getState().farm?.picked||0;
const short=[n<16?`🍅 수확 ${16-n}개 더 · 보기`:'🍅 토마토 심어 볼까?', '🌿 콩 연구터 · 준비 중',getState().cow?'🐄 젖소를 돌봐요':`🐄 목장 목표 보기`,'🎲 머지 놀이 · 10코인'];
if(hint.textContent!==short[destination])hint.textContent=short[destination];
const pt=guide.position.clone().add(new THREE.Vector3(0,2.1,0)).project(camera);
hint.hidden=hint.hidden||Math.abs(pt.x)>.95||Math.abs(pt.y)>.8;
hint.style.left=Math.max(90,Math.min(w-90,(pt.x*.5+.5)*w))+'px';hint.style.top=Math.max(48,Math.min(h-95,(-pt.y*.5+.5)*h-28))+'px';

places.forEach((p,i)=>{const v=new THREE.Vector3(p.x,.4,p.z+1).project(camera);buttons[i].style.left=Math.max(70,Math.min(w-70,(v.x*.5+.5)*w))+'px';buttons[i].style.top=Math.max(48,Math.min(h-80,(-v.y*.5+.5)*h))+'px'});
}};
}
