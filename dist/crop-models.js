import * as THREE from './vendor/three.module.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';

const crops = ['lettuce', 'carrot', 'tomato', 'potato', 'strawberry'];
const stages = { 2: 'sprout', 3: 'growing', 4: 'harvest' };
const positions = [[-.55, -.25], [0, .28], [.55, -.2]];

// Visuals only: the farm's existing plot state, hitboxes and action rules stay authoritative.
export function createCropModels(onReady) {
  const loader = new GLTFLoader();
  const cache = new Map();

  function request(key) {
    if (!cache.has(key)) {
      const entry = { scene: null, failed: false };
      cache.set(key, entry);
      loader.load(`/assets/crops/${key}.glb`, gltf => {
        entry.scene = gltf.scene;
        onReady();
      }, undefined, () => {
        entry.failed = true;
        onReady();
      });
    }
    return cache.get(key);
  }

  function clear(bed) {
    if (bed.cropModel) bed.g.remove(bed.cropModel);
    bed.cropModel = null;
    bed.cropModelKey = null;
  }

  function sync(bed, crop, stage, hidden) {
    const stageName = stages[stage];
    if (!stageName) {
      clear(bed);
      bed.label.dataset.cropModel = 'original';
      return;
    }
    const key = `${crops[crop] || crops[0]}-${stageName}`;
    const entry = request(key);
    if (bed.cropModelKey !== key) clear(bed);
    if (!bed.cropModel && entry.scene) {
      const group = new THREE.Group();
      // The wide classroom camera makes native-size plants unreadable on phones.
      const scale = stage === 2 ? 4 : stage === 3 ? 1.6 : 1.5;
      positions.forEach(([x, z]) => {
        const plant = entry.scene.clone(true);
        plant.position.set(x, .32, z);
        plant.scale.setScalar(scale);
        group.add(plant);
      });
      bed.g.add(group);
      bed.cropModel = group;
      bed.cropModelKey = key;
    }
    if (bed.cropModel) bed.cropModel.visible = !hidden;
    bed.label.dataset.cropModel = bed.cropModel ? key : entry.failed ? 'fallback' : 'loading';
    if (bed.cropModel) {
      bed.sprouts.forEach(plant => { plant.visible = false; });
      bed.plants.forEach(plant => { plant.visible = false; });
    }
  }

  function sway(bed, time, index) {
    if (!bed.cropModel || !bed.cropModel.visible) return;
    bed.cropModel.children.forEach((plant, i) => {
      plant.rotation.z = Math.sin(time * 1.2 + index + i) * .018;
    });
  }

  return { sync, sway };
}
