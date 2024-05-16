import { Box3, Vector3, AnimationMixer, EqualStencilFunc, ReplaceStencilOp, FrontSide } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import store from "../store"

const loader = new GLTFLoader(store.loaderManager);

export function addGLBToTile(tileGroup, glbPath, index, mixers, animationName, stencilMesh, scaleFactor, visible = true) {
  loader.load(glbPath, (gltf) => {

    const model = gltf.scene;

    // Set initial visibility
    model.visible = visible;
    model.userData.isGLBModel = true;

    // Scale and position the model
    const box = new Box3().setFromObject(model);
    const size = new Vector3();
    box.getSize(size);
    model.scale.set(scaleFactor, scaleFactor, scaleFactor);
    model.position.y -= 850;

    // Apply stencil properties to meshes
    model.traverse((child) => {
      if (child.isMesh) {
        child.material.stencilWrite = true;
        child.material.stencilRef = index + 1;
        child.material.stencilFunc = EqualStencilFunc;
        child.material.stencilZPass = ReplaceStencilOp;

        child.material.metalness = 0.1; 
        child.material.roughness = 0.8;
        child.material.color.set(0x999999);

        child.material.side = FrontSide 
        child.matrixAutoUpdate = false
      }
    });

    // Setup animations if present
    const mixer = new AnimationMixer(model);
    const clip = gltf.animations.find(clip => clip.name === animationName);
    if (clip) {
      const action = mixer.clipAction(clip);
      action.play();
    } else {
      console.warn(`Animation clip "${animationName}" not found in GLB model.`);
    }
    mixers.push(mixer);

    model.rotation.copy(stencilMesh.rotation);
    tileGroup.add(model);
  });
}

export function addGLBToTileNoAnimation(tileGroup, glbPath, index, stencilMesh, scaleFactor) {
  loader.load(glbPath, (gltf) => {
    const model = gltf.scene;

    // Scale and position the model
    const box = new Box3().setFromObject(model);
    const size = new Vector3();
    box.getSize(size);
    const newScaleFactor = scaleFactor * 4.0;
    model.scale.set(newScaleFactor, newScaleFactor, newScaleFactor);
    model.position.y -= 900;

    // Apply stencil properties to meshes
    model.traverse((child) => {
      if (child.isMesh) {
        child.userData.isSelectedForBloom = true;
        child.material.stencilWrite = true;
        child.material.stencilRef = index + 1;
        child.material.stencilFunc = EqualStencilFunc;
        child.material.stencilZPass = ReplaceStencilOp;

        child.material.side = FrontSide 
        child.matrixAutoUpdate = false
      }
    });

    model.rotation.copy(stencilMesh.rotation);
    tileGroup.add(model);
  });
}