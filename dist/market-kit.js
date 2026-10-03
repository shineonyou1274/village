import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';

// Scenery only. Movement, presence and exchanges stay in plaza.js and market-square.js.
export function createMarketKit({villageRoot,viewport,fallback}){
 const root=new THREE.Group();root.name='market-kit';villageRoot.add(root);
 const names=['market-entrance','market-stall','exchange-table','produce-crate','market-lantern'];
 const loader=new GLTFLoader();
 const assets=new Map();
 const lanternGlows=[];let powerOut=false;
 const syncPower=off=>{powerOut=!!off;for(const entry of lanternGlows){entry.material.color.setHex(powerOut?0x64757b:entry.color);entry.material.emissiveIntensity=powerOut?0:entry.intensity}};
 const load=name=>new Promise(resolve=>loader.load(`./assets/market/${name}.glb`,g=>resolve([name,g]),undefined,()=>resolve([name,null])));
 const place=(name,x,z,rotation=0)=>{
  const model=assets.get(name).scene.clone(true);
  model.position.set(x,.17,z);model.rotation.y=rotation;root.add(model);return model;
 };
 Promise.all(names.map(load)).then(rows=>{
  if(rows.some(([,g])=>!g)){viewport.dataset.marketAsset='fallback';return}
  rows.forEach(([name,g])=>assets.set(name,g));
  // The village path approaches from +Z. Keep the center clear for walking.
  place('market-entrance',0,-14.5);
  const colors=[[0xd99b78,0x79bcae],[0xe7c77a,0xc97e68],[0x8bb9a3,0xf0cd83],[0xc49aba,0x88b3a5]];
  [[-3.25,-21.3],[3.25,-21.3],[-3.25,-16.7],[3.25,-16.7]].forEach(([x,z],i)=>{
   const stall=place('market-stall',x,z,x<0?-Math.PI/2:Math.PI/2);
   stall.traverse(node=>{
    if(!node.isMesh||!['awningMain','awningAccent'].includes(node.material?.name))return;
    node.material=node.material.clone();node.material.color.setHex(colors[i][node.material.name==='awningMain'?0:1]);
   });
   place('produce-crate',x<0?x+1.1:x-1.1,z+.6,x<0?-Math.PI/2:Math.PI/2);
  });
  place('exchange-table',0,-21.8);
  for(const x of [-4.7,4.7])for(const z of [-23,-15.5]){const lantern=place('market-lantern',x,z);lantern.traverse(node=>{if(!node.isMesh||node.material?.name!=='glow')return;node.material=node.material.clone();lanternGlows.push({material:node.material,color:node.material.color.getHex(),intensity:node.material.emissiveIntensity||0})})}
  syncPower(powerOut);
  fallback.visible=false;
  viewport.dataset.marketAsset='ready';
 }).catch(error=>{console.warn('Market scenery unavailable; keeping original stalls',error);viewport.dataset.marketAsset='fallback'});
 return {root,syncPower};
}
