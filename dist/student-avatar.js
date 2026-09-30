import * as THREE from './vendor/three.module.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';

const requiredClips = ['idle', 'walk', 'wave', 'sit'];

function player(group, clips) {
  const mixer = new THREE.AnimationMixer(group);
  const actions = Object.fromEntries(clips.map(clip => [clip.name, mixer.clipAction(clip)]));
  let current = '';
  return {
    play(name) {
      if (current === name || !actions[name]) return;
      if (current) actions[current].stop();
      actions[name].reset().play();
      if (name === 'wave' || name === 'sit') {
        actions[name].setLoop(THREE.LoopOnce, 1);
        actions[name].clampWhenFinished = true;
      }
      current = name;
    },
    tick(dt) { mixer.update(dt); },
    dispose() { mixer.stopAllAction(); mixer.uncacheRoot(group); }
  };
}

function isWithin(object, parent) {
  for (let node = object; node; node = node.parent) if (node === parent) return true;
  return false;
}

// Loads once. The original gardener is retained as a visible fallback if the GLB fails.
export function createStudentAvatar({ farmer, fallbackBody, tools, viewport, onReady }) {
  let farmPlayer = null;
  new GLTFLoader().load('/assets/avatars/student-base.glb', gltf => {
    let scene;
    try {
      if (!requiredClips.every(name => gltf.animations.some(clip => clip.name === name))) throw Error('Missing student animation');
      scene = gltf.scene;
      scene.name = 'student-avatar';
      scene.scale.setScalar(1.14);
      farmer.add(scene);
      fallbackBody.traverse(object => {
        if (!object.isMesh || tools.some(tool => isWithin(object, tool))) return;
        object.userData.avatarFallback = true;
        object.visible = false;
      });
      farmPlayer = player(scene, gltf.animations);
      farmPlayer.play('idle');
      viewport.dataset.avatar = 'student';
      viewport.dataset.avatarClips = requiredClips.join(' ');

      onReady(color => {
        const actor = new THREE.Group();
        const clone = gltf.scene.clone(true);
        clone.scale.setScalar(1.14);
        const changed = new Map();
        clone.traverse(object => {
          if (!object.isMesh || object.material?.name !== 'shirt') return;
          if (!changed.has(object.material)) {
            const material = object.material.clone();
            material.color.setHex(color);
            changed.set(object.material, material);
          }
          object.material = changed.get(object.material);
        });
        actor.add(clone);
        actor.scale.setScalar(1.2);
        const controller = player(clone, gltf.animations);
        controller.play('idle');
        actor.userData.avatarType = 'student';
        return {
          g: actor,
          update(dt, moving, waving) {
            controller.play(waving && !moving ? 'wave' : moving ? 'walk' : 'idle');
            controller.tick(dt);
          },
          dispose() {
            controller.dispose();
            changed.forEach(material => material.dispose());
          }
        };
      });
    } catch (error) {
      if (scene) farmer.remove(scene);
      fallbackBody.traverse(object => { if (object.userData.avatarFallback) object.visible = true; });
      farmPlayer = null;
      console.warn('Student avatar unavailable; keeping gardener', error);
      viewport.dataset.avatar = 'fallback';
    }
  }, undefined, () => { viewport.dataset.avatar = 'fallback'; });
  return {
    tick(dt, moving) {
      if (!farmPlayer) return;
      farmPlayer.play(moving ? 'walk' : 'idle');
      farmPlayer.tick(dt);
    }
  };
}
