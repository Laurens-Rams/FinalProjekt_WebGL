// loadGLTF.js
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { ShaderMaterial, AnimationMixer } from 'three';
import vertex from './shaders/vertex.glsl';
import fragment from './shaders/fragment.glsl';

export default function loadGLTF(scene, onLoadCallback) {
  const loader = new GLTFLoader();
  loader.load(
    '/space.glb',
    (gltf) => {
      const gltfScene = gltf.scene;
      scene.add(gltfScene);

      gltfScene.position.set(0, 0, 2000);
      gltfScene.scale.set(1000, 1000, 1000);

      const shaderMaterial = new ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms: {
          time: { value: 0.0 },
        },
      });

      gltfScene.traverse((child) => {
        if (child.isMesh) {
          child.material = shaderMaterial;
        }
      });

      let mixer;
      if (gltf.animations && gltf.animations.length > 0) {
        mixer = new AnimationMixer(gltfScene);
        gltf.animations.forEach((clip) => {
          mixer.clipAction(clip).play();
        });
      }

      if (onLoadCallback) onLoadCallback(gltfScene, mixer);
    },
    undefined,
    (error) => {
      console.error('An error happened while loading the GLTF model:', error);
    }
  );
}