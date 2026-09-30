import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';

// Village scenery. The server remains the authority for fish and market trades.
export function createColdChainKit({villageRoot,viewport,getState}){
 const root=new THREE.Group();root.name='cold-chain-kit';root.position.set(9,.12,-33.65);villageRoot.add(root);
 window.coldChainScene=root; // Read-only scene inspection for visual regression tests.
 const names=['cold-storage','loading-platform','insulated-box','cold-storage-power','refrigerated-van'];
 const loader=new GLTFLoader(),assets=new Map();
 const load=(name,folder='cold-chain')=>new Promise(resolve=>loader.load(`./assets/${folder}/${name}.glb`,g=>resolve([name,g]),undefined,()=>resolve([name,null])));
 let van,wheels=[],distance=0,lastShipment="",boxes=[],indicator;
 const place=(name,x,y,z)=>{const model=assets.get(name).scene.clone(true);model.name=name;model.position.set(x,y,z);root.add(model);return model};
 Promise.all([...names.map(name=>load(name)),load('road-straight','land')]).then(rows=>{
  if(rows.some(([,g])=>!g)){viewport.dataset.coldChainAsset='fallback';return}
  rows.forEach(([name,g])=>assets.set(name,g));
  place('cold-storage',0,0,0);
  place('loading-platform',0,0,2.15);
  const power=place('cold-storage-power',3.05,0,-.75);indicator=power.getObjectByName('cold-storage-power_indicator');if(indicator?.material)indicator.material=indicator.material.clone();
  boxes.push(place('insulated-box',-.55,.33,2.1));
  boxes.push(place('insulated-box',.45,.33,2.1));
  // The 2 m road slot centred 3.75 m ahead meets the existing east-west road.
  place('road-straight',0,0,3.75);
  van=place('refrigerated-van',0,0,3.75);
  van.traverse(node=>{if(/^wheel_(front|rear)_(left|right)$/.test(node.name))wheels.push(node)});
  van.rotation.y=-Math.PI/2;
  viewport.dataset.coldChainAsset='ready';
 }).catch(error=>{console.warn('Cold-chain scenery unavailable',error);viewport.dataset.coldChainAsset='fallback'});
 return {root,tick(dt){
  if(!van||!villageRoot.visible)return;
  const shipment=getState?.().logistics?.shipment,conditions=window.classroomData?.shipping;
  viewport.dataset.coldChainStatus=shipment?.status||'idle';
  if(indicator?.material?.color)indicator.material.color.setHex(conditions?.powerReady===false?0xd35b4b:0x79c8a4);
  boxes.forEach(box=>{box.visible=!!shipment&&['packed','checked'].includes(shipment.status)});
  if((shipment?.id||'')!==lastShipment){distance=0;lastShipment=shipment?.id||''}
  if(shipment?.status!=='in_transit'){van.position.set(0,0,3.75);van.rotation.y=-Math.PI/2;return}
  if(window.gamePreferences?.ambient===false||conditions?.reasons?.length)return;
  distance=Math.min(22,distance+Math.min(.1,dt)*2.2);
  if(distance<9){van.position.set(-distance,0,3.75);van.rotation.y=-Math.PI/2}
  else if(distance<20){van.position.set(-9,0,3.75+distance-9);van.rotation.y=0}
  else{van.position.set(-9+(distance-20),0,14.75);van.rotation.y=Math.PI/2}
  for(const wheel of wheels)wheel.rotation.x-=Math.min(.1,dt)*3.5;
 }};;
}
