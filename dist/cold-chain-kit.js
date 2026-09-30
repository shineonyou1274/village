import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';

// Village scenery. The server remains the authority for fish and market trades.
export function createColdChainKit({villageRoot,viewport}){
 const root=new THREE.Group();root.name='cold-chain-kit';root.position.set(9,.12,-33.65);villageRoot.add(root);
 window.coldChainScene=root; // Read-only scene inspection for visual regression tests.
 const names=['cold-storage','loading-platform','insulated-box','cold-storage-power','refrigerated-van'];
 const loader=new GLTFLoader(),assets=new Map();
 const load=(name,folder='cold-chain')=>new Promise(resolve=>loader.load(`./assets/${folder}/${name}.glb`,g=>resolve([name,g]),undefined,()=>resolve([name,null])));
 let van,wheels=[],distance=0;
 const place=(name,x,y,z)=>{const model=assets.get(name).scene.clone(true);model.name=name;model.position.set(x,y,z);root.add(model);return model};
 Promise.all([...names.map(name=>load(name)),load('road-straight','land')]).then(rows=>{
  if(rows.some(([,g])=>!g)){viewport.dataset.coldChainAsset='fallback';return}
  rows.forEach(([name,g])=>assets.set(name,g));
  place('cold-storage',0,0,0);
  place('loading-platform',0,0,2.15);
  place('cold-storage-power',3.05,0,-.75);
  place('insulated-box',-.55,.33,2.1);
  place('insulated-box',.45,.33,2.1);
  // The 2 m road slot centred 3.75 m ahead meets the existing east-west road.
  place('road-straight',0,0,3.75);
  van=place('refrigerated-van',0,0,3.75);
  van.traverse(node=>{if(/^wheel_(front|rear)_(left|right)$/.test(node.name))wheels.push(node)});
  van.rotation.y=-Math.PI/2;
  viewport.dataset.coldChainAsset='ready';
 }).catch(error=>{console.warn('Cold-chain scenery unavailable',error);viewport.dataset.coldChainAsset='fallback'});
 return {root,tick(dt){
  if(!van||!villageRoot.visible||window.gamePreferences?.ambient===false)return;
  // Storage → crossing → market; visual movement never changes inventory.
  distance=(distance+Math.min(.1,dt)*1.25)%40;
  if(distance<9){van.position.set(-distance,0,3.75);van.rotation.y=-Math.PI/2}
  else if(distance<20){van.position.set(-9,0,3.75+distance-9);van.rotation.y=0}
  else if(distance<31){van.position.set(-9,0,14.75-(distance-20));van.rotation.y=Math.PI}
  else {van.position.set(-9+(distance-31),0,3.75);van.rotation.y=Math.PI/2}
  for(const wheel of wheels)wheel.rotation.x-=Math.min(.1,dt)*3.5;
 }};
}
