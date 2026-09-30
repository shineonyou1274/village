import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';

// Visual extension of the shared village. Student inventory and production
// remain owned by the existing server actions.
export function createWatersideKit({villageRoot,viewport,fallback,onReady}){
 const root=new THREE.Group();root.name='waterside-kit';root.position.set(0,.12,-42);villageRoot.add(root);
 const loader=new GLTFLoader(),assets=new Map();
 const names=['pond-water','shore-straight','shore-corner','small-dock','fish-pen','water-quality-station'];
 const load=(name,folder='waterside')=>new Promise(resolve=>loader.load(`./assets/${folder}/${name}.glb`,g=>resolve([name,g]),undefined,()=>resolve([name,null])));
 const put=(name,x,z,rotation=0)=>{const model=assets.get(name).scene.clone(true);model.position.set(x,0,z);model.rotation.y=rotation;root.add(model);return model};
 Promise.all([...names.map(name=>load(name)),load('road-straight','land')]).then(rows=>{
  if(rows.some(([,g])=>!g)){viewport.dataset.watersideAsset='fallback';return}
  rows.forEach(([name,g])=>assets.set(name,g));
  put('pond-water',0,0);
  for(const x of [-3,-1.5,0,1.5,3]){put('shore-straight',x,3);put('shore-straight',x,-3,Math.PI)}
  for(const z of [-1.5,0,1.5]){put('shore-straight',4.5,z,Math.PI/2);put('shore-straight',-4.5,z,-Math.PI/2)}
  for(const [x,z,angle] of [[4.5,3,0],[4.5,-3,Math.PI/2],[-4.5,-3,Math.PI],[-4.5,3,-Math.PI/2]])put('shore-corner',x,z,angle);
  put('small-dock',0,2);put('fish-pen',2.4,.1);put('water-quality-station',-3.8,4.15);
  // The existing central road ends at world Z -37.5. The modular tile meets
  // the dock ramp without changing the plaza's current movement bounds.
  put('road-straight',0,4.35);
  fallback.forEach(group=>{group.visible=false});onReady();
  viewport.dataset.watersideAsset='ready';
 }).catch(error=>{console.warn('Waterside scenery unavailable; keeping original pond',error);viewport.dataset.watersideAsset='fallback'});
 return root;
}
