import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';

// The mission owns road and power state. These models only reflect that state.
export function createStormKit({villageRoot,viewport}){
 const root=new THREE.Group();root.name='storm-kit';villageRoot.add(root);
 window.stormScene=root; // Scene inspection for browser regression checks.
 const loader=new GLTFLoader(),names=['flooded-road','road-closure-sign','power-facility','mobile-generator','recovery-vehicle'];
 const load=name=>new Promise(resolve=>loader.load(`./assets/storm/${name}.glb`,g=>resolve([name,g]),undefined,()=>resolve([name,null])));
 let flood,sign,power,generator,vehicle,wheels=[],indicatorMeshes=[],ready=false,lastState='',arrival=0;
 const place=(name,x,z)=>{const model=assets.get(name).scene.clone(true);model.name=name;model.position.set(x,.15,z);root.add(model);return model};
 const assets=new Map();
 Promise.all(names.map(load)).then(rows=>{
  if(rows.some(([,g])=>!g)){viewport.dataset.stormAsset='fallback';return}
  rows.forEach(([name,g])=>assets.set(name,g));
  flood=place('flooded-road',0,-10.8);
  sign=place('road-closure-sign',0,-9.9);
  power=place('power-facility',-5.5,-23.5);
  generator=place('mobile-generator',-5.4,-25.2);
  vehicle=place('recovery-vehicle',2.2,-6);vehicle.rotation.y=Math.PI;
  vehicle.traverse(node=>{if(/^wheel_(front|rear)_(left|right)$/.test(node.name))wheels.push(node)});
  const indicator=power.getObjectByName('status_indicator');
  indicator?.traverse(node=>{if(node.isMesh&&node.material?.color){node.material=node.material.clone();indicatorMeshes.push(node)}});
  ready=true;viewport.dataset.stormAsset='ready';
  sync(window.missionVisual?.()||{active:false,road:true,power:true,complete:false});
 }).catch(error=>{console.warn('Storm scenery unavailable; keeping original warning markers',error);viewport.dataset.stormAsset='fallback'});
 function sync(v){
  if(!ready)return;
  const outage=!!v.active&&!v.complete;
  const key=[outage,!!v.road,!!v.power].join(':');if(key===lastState)return;lastState=key;
  flood.visible=sign.visible=outage&&!v.road;
  generator.visible=outage&&!v.power;
  vehicle.visible=outage&&(!v.road||!v.power);
  power.visible=true;
  const color=v.power?0x8bc872:0xd8866c;
  for(const mesh of indicatorMeshes)mesh.material.color.setHex(color);
  if(vehicle.visible)arrival=0;
 }
 return {get ready(){return ready},sync,tick(dt){
  if(!vehicle?.visible||!villageRoot.visible||window.gamePreferences?.ambient===false)return;
  if(arrival<1){arrival=Math.min(1,arrival+Math.min(.1,dt)*.5);vehicle.position.z=-6-2.5*arrival;for(const wheel of wheels)wheel.rotation.x-=Math.min(.1,dt)*3.5}
 }};
}
