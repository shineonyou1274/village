import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';

// The kit is visual only. Every watering request still goes through the game's
// existing action path, which owns the student's saved farm and rewards.
export function createSmartFarm({land,viewport,selectedInfo,getPlot,getSelected,waterBed,isFarm,plotPosition}){
 const root=new THREE.Group();land.add(root);
 const loader=new GLTFLoader();
 const models={};const mixers={};const actions={};let activeClip='';
 const locations={robot:new THREE.Vector3(-3.7,.13,5.45),sensor:new THREE.Vector3(5.2,.13,2.45),station:new THREE.Vector3(-5.5,.13,5.55)};
 const paths={robot:'farm-robot',sensor:'moisture-sensor',station:'irrigation-station'};
 for(const [key,name] of Object.entries(paths)){
  loader.load(`./assets/smart-farm/${name}.glb`,gltf=>{
   const model=gltf.scene;model.position.copy(locations[key]);model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});root.add(model);models[key]=model;
   if(gltf.animations.length){const mixer=new THREE.AnimationMixer(model);mixers[key]=mixer;actions[key]=Object.fromEntries(gltf.animations.map(clip=>[clip.name,mixer.clipAction(clip)]));if(key==='robot')playRobot('scan');}
  },undefined,()=>{viewport.dataset.smartFarm='fallback';});
 }
 const label=document.createElement('button');label.type='button';label.className='smart-farm-label';label.textContent='🤖 스마트 농장';label.setAttribute('aria-label','스마트 농장 탐구 열기');viewport.append(label);
 const bedButton=document.createElement('button');bedButton.type='button';bedButton.className='smart-farm-bed-button';bedButton.textContent='🤖';bedButton.setAttribute('aria-label','스마트 농장 수분 확인');selectedInfo.insertBefore(bedButton,selectedInfo.querySelector('.selected-bed-action'));
 const panel=document.createElement('section');panel.className='smart-farm-panel';panel.hidden=true;panel.setAttribute('aria-label','스마트 농장 탐구');panel.innerHTML='<button type="button" class="smart-farm-close" aria-label="스마트 농장 닫기">×</button><b>🤖 스마트 농장</b><p class="smart-farm-reading"></p><div class="smart-farm-choices"><button type="button" class="smart-farm-measure">선택한 밭 수분 확인</button><button type="button" class="smart-farm-water">로봇에게 물 주기</button></div><small>수분 수치는 농사 단계를 바탕으로 만든 교육용 추정치예요.</small>';viewport.append(panel);
 const reading=panel.querySelector('.smart-farm-reading'),water=panel.querySelector('.smart-farm-water');let measured=-1;
 function refresh(){const i=getSelected(),p=i===null?null:getPlot(i);if(!p){reading.textContent='먼저 밭을 선택하세요. 센서가 흙 상태를 살펴봐요.';water.hidden=true;return}const stage=p.wateredAt?2:p.seeded?1:0;reading.textContent=measured===i?`${i+1}번 밭 · ${stage===0?'씨앗을 심으면 측정할 수 있어요.':stage===1?'건조 24% · 물이 필요해요.':'적정 72% · 지금은 물이 충분해요.'}`:`${i+1}번 밭을 선택했어요. 수분 확인을 눌러 보세요.`;water.hidden=stage!==1;water.disabled=measured!==i||!!viewport.querySelector('.selected-bed-action')?.disabled;}
 function open(){panel.hidden=false;measured=-1;refresh();}
 label.onclick=()=>{if(panel.hidden)open();else panel.hidden=true};
 bedButton.onclick=open;
 panel.querySelector('.smart-farm-close').onclick=()=>{panel.hidden=true};
 panel.querySelector('.smart-farm-measure').onclick=()=>{const i=getSelected();if(i!==null)measured=i;refresh();if(actions.robot?.scan){playRobot('scan')}};
 water.onclick=()=>{const i=getSelected();if(i===null||measured!==i||!getPlot(i)?.seeded||getPlot(i)?.wateredAt)return;panel.hidden=true;waterBed(i)};
 function playRobot(name){if(activeClip===name)return;for(const action of Object.values(actions.robot||{}))action.stop();actions.robot?.[name]?.reset().play();activeClip=name;}
 function tick(dt,job,camera){root.visible=isFarm();label.hidden=!isFarm()||!models.station||getSelected()!==null;panel.style.display=isFarm()?'':'none';if(!isFarm())return;if(!models.robot)return;
  const watering=job?.stage===1,working=watering&&job.phase==='work';
  const target=watering?plotPosition(job.i)?.clone().add(new THREE.Vector3(-1.45,.13,1.1)):locations.robot;
  if(target){target.y=.13;const delta=target.clone().sub(models.robot.position);if(delta.length()>.08){models.robot.position.addScaledVector(delta.normalize(),Math.min(delta.length(),dt*3));models.robot.rotation.y=Math.atan2(delta.x,delta.z);playRobot('drive')}else playRobot(working?'water':'scan')}
  if(actions.station?.sprinkle){if(working&&!actions.station.sprinkle.isRunning())actions.station.sprinkle.reset().play();if(!working&&actions.station.sprinkle.isRunning())actions.station.sprinkle.stop()}
  for(const mixer of Object.values(mixers))mixer.update(dt);
  if(!panel.hidden)refresh();
 }
 return {tick,close:()=>{panel.hidden=true}};
}
