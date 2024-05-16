import {
  PlaneGeometry,
  Mesh,
  Group,
  MathUtils,
  Vector3,
  Euler,
  AlwaysStencilFunc,
  ReplaceStencilOp,
  EqualStencilFunc,
  MeshPhongMaterial,
  MeshStandardMaterial,
  Box3,
  AnimationMixer,
  Clock
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { damp } from 'maath/easing';
import { addGLBToTile, addGLBToTileNoAnimation } from './AddGLBFile.js';

export default class Tiles extends Group {
  constructor(camera, scene) {
    super();

    this._camera = camera;
    this._scene = scene;
    this._isDragging = false;
    this._width = 750;
    this._height = 1300;
    this._radius = 1400;
    this._dragRadiusOffset = 250;
    this._els = [];
    this._sphereCenter = new Vector3(0, 0, 0);
    this._numTiles = 9;
    this._gltfLoader = new GLTFLoader();
    this._mixers = [];
    this._clock = new Clock();
    this._targetObjectGroup = null;
    this._targetModelScaleFactor = null;

    this._initialSpherePosition = new Vector3(0, 5000, 0);
    this.position.copy(this._initialSpherePosition);
    this._targetYPosition = this._initialSpherePosition.y;

    // For damping rotation
    this._currentRotation = new Euler(0, 0, 0);
    this._targetRotation = new Euler(0, 0, 0);
    this._maxYRotation = MathUtils.degToRad(15);

    // Animation state
    this._crossFadeTriggered = false;
    this._scrollLimit = 0.8; // Stop the scroll effect at 80%

    this._init();
    this._loadClimber();
  }

  createStencilMaterial(stencilRef) {
    const stencilMat = new MeshStandardMaterial({ color: 'black' });
    stencilMat.depthWrite = false;
    stencilMat.stencilWrite = true;
    stencilMat.stencilRef = stencilRef;
    stencilMat.stencilFunc = AlwaysStencilFunc;
    stencilMat.stencilZPass = ReplaceStencilOp;
    return stencilMat;
  }

  createObjectMaterial(stencilRef, color) {
    const objectMat = new MeshPhongMaterial({ color });
    objectMat.stencilWrite = true;
    objectMat.stencilRef = stencilRef;
    objectMat.stencilFunc = EqualStencilFunc;
    return objectMat;
  }

  _init() {
    const stencilGLBPath = '../public/phone_screen.glb';
    const angleIncrement = (2 * Math.PI) / this._numTiles;

    for (let i = 0; i < this._numTiles; i++) {
      const additionalRotation = MathUtils.degToRad(30);
      const angle = i * angleIncrement + additionalRotation;

      const x = Math.cos(angle);
      const z = Math.sin(angle);

      const yOffset = (Math.random() - 0.5) * 0.4;
      const y = yOffset;

      const tilePosition = new Vector3(x * this._radius, y * this._radius, z * this._radius);
      const objectPosition = new Vector3(x * (this._radius + 1200), y * (this._radius + 1200), z * (this._radius + 1200));

      const objectGroup = new Group();
      objectGroup.position.copy(objectPosition);

      const objectMat = this.createObjectMaterial(i + 1, 'lightblue');
      const planeMesh = new Mesh(new PlaneGeometry(1, 1), objectMat);
      planeMesh.scale.set(this._width, this._width, 1);
      objectGroup.add(planeMesh);

      objectGroup.userData.initialPosition = objectGroup.position.clone();
      objectGroup.userData.dragPosition = objectGroup.position.clone();
      objectGroup.userData.dragPosition.multiplyScalar((this._radius + this._dragRadiusOffset) / this._radius);

      this.add(objectGroup);
      this._els.push(objectGroup);

      this._loadStencilModel(stencilGLBPath, tilePosition, i);
    }
  }

  _loadStencilModel(path, tilePosition, index) {
    this._gltfLoader.load(path, (gltf) => {
      const model = gltf.scene;
      const box = new Box3().setFromObject(model);
      const size = new Vector3();
      box.getSize(size);
      const scaleFactor = Math.min(this._width / size.x, this._height / size.y, this._width / size.z) * 0.97;
      model.scale.set(scaleFactor, scaleFactor, scaleFactor);

      if (index === 6) {
        this._targetObjectGroup = this._els[index];
        this._targetModelScaleFactor = scaleFactor * 0.07; // Save the specific scale factor used
      }

      model.traverse((child) => {
        if (child.isMesh) {
          child.material = this.createStencilMaterial(index + 1);
        }
      });

      model.position.copy(tilePosition);
      const normal = new Vector3().subVectors(this._sphereCenter, tilePosition).normalize();
      model.lookAt(tilePosition.clone().add(normal));

      // initial and drag positions
      model.userData.initialPosition = model.position.clone();
      model.userData.dragPosition = model.position.clone();
      model.userData.dragPosition.multiplyScalar((this._radius + this._dragRadiusOffset - 350) / this._radius);

      // Add the stencil model
      this.add(model);

      const glbPath = '/Avatar_Animations_2.glb';
      const glbPath_landscape = '/landscape_3.glb';

      const animationNames = [
        'Armature.001|mixamo.com|Layer0 Retarget',
        'Armature.002|mixamo.com|Layer0 Retarget',
        'Armature.003|mixamo.com|Layer0 Retarget',
        'Armature.004|mixamo.com|Layer0 Retarget',
        'Armature.001|mixamo.com|Layer0.001 Retarget',
        'Armature.002|mixamo.com|Layer0.001 Retarget',
      ];
      const animationName = animationNames[index % animationNames.length];
      addGLBToTile(this._els[index], glbPath, index, this._mixers, animationName, model, scaleFactor * 0.07);
      addGLBToTileNoAnimation(this._els[index], glbPath_landscape, index, model, scaleFactor * 0.015);

      this._addPhoneScreen(model);
    });
  }


  onDrag(state) {
    this._isDragging = state.dragging;
    const deltaX = state.delta[0] * 0.001;
    const deltaY = state.delta[1] * 0.001;

    this._targetRotation.y -= deltaX;
    this._targetRotation.x = MathUtils.clamp(this._targetRotation.x - deltaY, -this._maxYRotation, this._maxYRotation);
  }

  
  onDragEnd() {
    const angleIncrement = (2 * Math.PI) / this._numTiles;
    const currentRotationY = this._targetRotation.y;
  
    // Calculate the closest tile index with additional rotation included
    let closestTileIndex = Math.round(currentRotationY / angleIncrement);
  
    // Calculate the target rotation for the closest tile
    let targetRotationY = closestTileIndex * angleIncrement;
  
    // Ensure the rotation takes the shortest path
    if (Math.abs(targetRotationY - currentRotationY) > Math.PI) {
      if (targetRotationY > currentRotationY) {
        closestTileIndex -= this._numTiles;
      } else {
        closestTileIndex += this._numTiles;
      }
      targetRotationY = closestTileIndex * angleIncrement;
    }
  
    this._targetRotation.y = targetRotationY;
  }
  
  
  _addPhoneScreen(stencilMesh) {
    const phoneScreenPath = '../public/phoneBody11.glb';
    this._gltfLoader.load(phoneScreenPath, (gltf) => {
      const phoneScreen = gltf.scene;

      const box = new Box3().setFromObject(phoneScreen);
      const size = new Vector3();
      box.getSize(size);
      const scaleFactor = Math.min(this._width / size.x, this._height / size.y, this._width / size.z);
      phoneScreen.scale.set(scaleFactor, scaleFactor, scaleFactor);

      phoneScreen.position.copy(stencilMesh.position);
      phoneScreen.rotation.copy(stencilMesh.rotation);

      phoneScreen.userData.initialPosition = phoneScreen.position.clone();
      phoneScreen.userData.dragPosition = phoneScreen.position.clone();
      phoneScreen.userData.dragPosition.multiplyScalar((this._radius + this._dragRadiusOffset - 350) / this._radius);

      this.add(phoneScreen);
    });
  }

  _loadClimber() {
    const loader = new GLTFLoader();
    loader.load('/Avatar_Animations_2.glb', (gltf) => {
      this._climber = gltf.scene;
      this._mixer = new AnimationMixer(this._climber);

      const animationName = 'Armature.001|mixamo.com|Layer0.002 Retarget';
      const secondAnimationName = 'Armature.002|mixamo.com|Layer0 Retarget';

      const clip = gltf.animations.find(clip => clip.name === animationName);
      const secondClip = gltf.animations.find(clip => clip.name === secondAnimationName);

      this._action = this._mixer.clipAction(clip);
      this._secondAction = this._mixer.clipAction(secondClip);

      this._action.play();
      this._action.paused = true;
      this._secondAction.paused = true;

      this._climber.scale.set(this._targetModelScaleFactor, this._targetModelScaleFactor, this._targetModelScaleFactor);
      this._climber.position.copy(this._targetObjectGroup.position);
      this._climber.rotation.copy(this._targetObjectGroup.rotation);
      this._climber.rotation.y += 3.14;
      this._climber.position.y -= 850;

      this._scene.add(this._climber);
    });
  }

  _prepareCrossFade(startAction, endAction, duration) {
    if (!startAction || !endAction) return;
    startAction.crossFadeTo(endAction, duration, true);
  }

  _executeCrossFade() {
    const duration = 0.35; // Duration of the crossfade
    this._prepareCrossFade(this._action, this._secondAction, duration);
    this._secondAction.play();
    this._secondAction.paused = false;
  }

  onScroll() {
    if (!this._mixer || !this._action || !this._secondAction) return;

    const scrollY = window.scrollY;
    const maxScrollY = document.documentElement.scrollHeight - window.innerHeight;
    const scrollOffset = scrollY / maxScrollY;

    if (scrollOffset >= this._scrollLimit) {
      if (!this._crossFadeTriggered) {
        this._executeCrossFade();
        this._crossFadeTriggered = true;
      }
      return;
    } else if (scrollOffset < this._scrollLimit && this._crossFadeTriggered) {
      // If the user scrolls back up, revert to the scroll-controlled animation
      this._crossFadeTriggered = false;
      this._secondAction.stop();
      this._action.play();
      this._action.paused = false;
    }

    this._targetYPosition = this._initialSpherePosition.y * (1 - scrollOffset);

    if (!this._crossFadeTriggered) {
      this._action.time = this._action.getClip().duration * scrollOffset;
      this._mixer.update(0);
    }
  }

  update(delta) {
    damp(this._currentRotation, 'x', this._targetRotation.x, 0.22, delta);
    damp(this._currentRotation, 'y', this._targetRotation.y, 0.22, delta);
    this.rotation.set(this._currentRotation.x, this._currentRotation.y, this._currentRotation.z);

    this._els.forEach((el) => {
      const targetPosition = this._isDragging ? el.userData.dragPosition : el.userData.initialPosition;
      damp(el.position, 'x', targetPosition.x, 0.15, delta);
      damp(el.position, 'y', targetPosition.y, 0.15, delta);
      damp(el.position, 'z', targetPosition.z, 0.15, delta);
    });

    this.children.forEach((child) => {
      if (child.userData.initialPosition) {
        const targetPosition = this._isDragging ? child.userData.dragPosition : child.userData.initialPosition;
        damp(child.position, 'x', targetPosition.x, 0.15, delta);
        damp(child.position, 'y', targetPosition.y, 0.15, delta);
        damp(child.position, 'z', targetPosition.z, 0.15, delta);
      }
    });

    this.position.y += (this._targetYPosition - this.position.y) * 0.1;

    if (this._crossFadeTriggered) {
      this._mixer.update(delta);
    }
  }
}
