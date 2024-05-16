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
  Clock,
  Color
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { damp } from 'maath/easing';
import { addGLBToTile, addGLBToTileNoAnimation } from './AddGLBFile.js';

export default class Tiles extends Group {
  constructor(camera, scene, pointLight) {
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

    this._initialSpherePosition = new Vector3(0, 4000, 0);
    this.position.copy(this._initialSpherePosition);
    this._targetYPosition = this._initialSpherePosition.y;

    // For damping rotation
    this._currentRotation = new Euler(0, 0, 0);
    this._targetRotation = new Euler(0, 0, 0);
    this._maxYRotation = MathUtils.degToRad(15);

    // Animation state
    this._crossFadeTriggered = false;
    this._scrollLimit = 0.8;

    this._pointLight = pointLight;  

    this._init();
    this._loadClimber();
  }


  blinkPointLight(duration = 3000, interval = 400, color = 0xCD7878) {
    const originalColor = new Color(this._pointLight.color.getHex());
    let isBlinking = false;
  
    const blinkInterval = setInterval(() => {
      if (isBlinking) {
        this._pointLight.color.set(originalColor);
      } else {
        this._pointLight.color.set(color);
      }
      isBlinking = !isBlinking;
    }, interval);
  
    setTimeout(() => {
      clearInterval(blinkInterval);
      this._pointLight.color.set(originalColor);
    }, duration);
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

  getFirstTilePosition() {
    return this._els[0].position.clone();
  }

  createObjectMaterial(stencilRef, color) {
    const objectMat = new MeshPhongMaterial({ color: color });
    objectMat.stencilWrite = true;
    objectMat.stencilRef = stencilRef;
    objectMat.stencilFunc = EqualStencilFunc;
    return objectMat;
  }

  

  _init() {
    console.log(this._pointLight);
    const stencilGLBPath = '../public/phone_screen.glb';
    const lookDirection = new Vector3();
    const normal = new Vector3();
    const angleIncrement = (2 * Math.PI) / this._numTiles;
  
    for (let i = 0; i < this._numTiles; i++) {
      const additionalRotation = MathUtils.degToRad(30);
      const angle = i * angleIncrement + additionalRotation;
  
      const x = Math.cos(angle);
      const z = Math.sin(angle);
      const y = (i === 6) ? 0 : (Math.random() - 0.5) * 0.4;

      const randomOffset = (i === 6) ? 0 : (Math.random() - 0.5) * 800; 
  
      const tilePosition = new Vector3(
        x * (this._radius + randomOffset),
        y * (this._radius + randomOffset),
        z * (this._radius + randomOffset)
      );
      const objectPosition = new Vector3(
        x * (this._radius + 2000 + randomOffset),
        y * (this._radius + 2000 + randomOffset),
        z * (this._radius + 2000 + randomOffset)
      );
  
      const objectGroup = new Group();
      objectGroup.position.copy(objectPosition);
  
      const objectMat = this.createObjectMaterial(i + 1, 'lightblue');
      objectGroup.userData.initialPosition = objectGroup.position.clone();
      objectGroup.userData.dragPosition = objectGroup.position.clone();
      objectGroup.userData.dragPosition.multiplyScalar((this._radius - this._dragRadiusOffset) / this._radius);
  
      this.add(objectGroup);
      this._els.push(objectGroup);
  
      this._gltfLoader.load(stencilGLBPath, (gltf) => {
        const model = gltf.scene;
        const box = new Box3().setFromObject(model);
        const size = new Vector3();
        box.getSize(size);
        const scaleFactor = Math.min(this._width / size.x, this._height / size.y, this._width / size.z) * 0.97;
        model.scale.set(scaleFactor, scaleFactor, scaleFactor);
  
        model.traverse((child) => {
          if (child.isMesh) {
            child.material = this.createStencilMaterial(i + 1);
          }
        });
  
        model.position.copy(tilePosition);
        normal.subVectors(this._sphereCenter, tilePosition).normalize();
        model.lookAt(tilePosition.clone().add(normal));
  
        model.userData.initialPosition = model.position.clone();
        model.userData.dragPosition = model.position.clone();
        model.userData.dragPosition.multiplyScalar(this._radius / this._radius);
  
        // checks to avoid duplicates
        if (!this.children.some(child => child.userData.id === `stencil_${i}`)) {
          model.userData.id = `stencil_${i}`;
          this.add(model);
        }
  
        const glbPath = '/Avatar_Animations_3.glb';
        const glbPath_landscape = '/tunnel.glb';
        const animationNames = [
          'Armature.002|mixamo.com|Layer0.001 Retarget',
          'Armature.002|mixamo.com|Layer0 Retarget',
          'Armature.003|mixamo.com|Layer0 Retarget',
          'Armature.004|mixamo.com|Layer0 Retarget',
          'Armature.001|mixamo.com|Layer0.001 Retarget',
          'Armature.001|mixamo.com|Layer0 Retarget',
        ];
        const animationName = animationNames[i % animationNames.length];
  
        if (i === 6) {
          this._targetObjectGroup = objectGroup;
          this._targetModelScaleFactor = scaleFactor * 0.05;
          addGLBToTile(objectGroup, glbPath, i, this._mixers, animationName, model, scaleFactor * 0.05, false);
        } else {
          addGLBToTile(objectGroup, glbPath, i, this._mixers, animationName, model, scaleFactor * 0.05);
        }
  
        addGLBToTileNoAnimation(objectGroup, glbPath_landscape, i, model, scaleFactor * 0.015);
        this._addPhoneScreen(model);
      });
    }
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
      phoneScreen.userData.dragPosition.multiplyScalar((this._radius) / this._radius);

      this.add(phoneScreen);
    });
  }

  onDrag(state) {
    if (this._climber.visible) return;
    this._isDragging = state.dragging;
    const deltaX = state.delta[0] * 0.002;
    const deltaY = state.delta[1] * 0.002;

    this._targetRotation.y -= deltaX;
    this._targetRotation.x = MathUtils.clamp(this._targetRotation.x - deltaY, -this._maxYRotation, this._maxYRotation);
  }

  onDragEnd() {
    const angleIncrement = (2 * Math.PI) / this._numTiles;
    const currentRotationY = this._targetRotation.y;
  
    let closestTileIndex = Math.round(currentRotationY / angleIncrement);
    let targetRotationY = closestTileIndex * angleIncrement;

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
  
  _loadClimber() {
    const loader = new GLTFLoader();
    loader.load('/Avatar_Animations_Climbing.glb', (gltf) => {
      this._climber = gltf.scene;
      this._mixer = new AnimationMixer(this._climber);
  
      const animationName = 'Armature.003|mixamo.com|Layer0.001 Retarget';
      const secondAnimationName = 'Armature.002|mixamo.com|Layer0.002 Retarget';
      const thirdAnimationName = 'Armature.002|mixamo.com|Layer0.003 Retarget';
  
      const clip = gltf.animations.find(clip => clip.name === animationName);
      const secondClip = gltf.animations.find(clip => clip.name === secondAnimationName);
      const thirdClip = gltf.animations.find(clip => clip.name === thirdAnimationName);
  
      this._action = this._mixer.clipAction(clip);
      this._secondAction = this._mixer.clipAction(secondClip);
      this._thirdAction = this._mixer.clipAction(thirdClip);
  
      this._action.play();
      this._action.paused = true;
      this._secondAction.paused = true;
      this._thirdAction.paused = true;
  
      if (this._targetObjectGroup) {
        console.log(this._targetObjectGroup.position)
        this._climber.scale.set(this._targetModelScaleFactor, this._targetModelScaleFactor, this._targetModelScaleFactor);
        this._climber.position.copy(this._targetObjectGroup.position);
        this._climber.rotation.copy(this._targetObjectGroup.rotation);
        this._climber.rotation.y += 3.14; 
        this._climber.position.y -= 850;
        this._climber.position.z -= 600;
      }
  
    this._climber.traverse((child) => {
      if (child.isMesh) {
        child.material.metalness = 0.1; 
        child.material.roughness = 0.9; 
        child.material.color.set(0xC7C7C7); 
      }
    });

      this._climber.visible = true;
      this._scene.add(this._climber);
    });
  }

  _executeCrossFade() {
    const duration = 0.5;
    this._action.crossFadeTo(this._secondAction, duration, true);
    this._crossFadeTriggered = true;
    this._secondAction.play();
    this._secondAction.paused = false;

    setTimeout(() => {
      this._secondAction.crossFadeTo(this._thirdAction, duration, true);
      this._thirdAction.play();
      this._thirdAction.paused = false;
    }, 2000); 
    
    const sixthTileModel = this._els[6].children.find(child => child.userData.isGLBModel);

    setTimeout(() => {
      if (this._climber) {
        this._climber.visible = false;
      }
      if (sixthTileModel) {
        sixthTileModel.visible = true;
      }
    }, 3500);
  }

  onScroll() {
    if (!this._mixer || !this._action || !this._secondAction || !this._thirdAction) return;
  
    const scrollY = window.scrollY;
    const maxScrollY = document.documentElement.scrollHeight - window.innerHeight;
    const scrollOffset = scrollY / maxScrollY;
  
    if (scrollOffset >= this._scrollLimit) {
      const normalizedScrollOffset = (scrollOffset - this._scrollLimit) / (1 - this._scrollLimit);
      const distance = MathUtils.lerp(3443, 25000, normalizedScrollOffset);
  
      this._pointLight.distance = distance;
    }
  
    if (scrollOffset >= this._scrollLimit && !this._crossFadeTriggered) {
      window.scrollTo({ top: maxScrollY, behavior: 'smooth' });
      this._executeCrossFade();
      this.blinkPointLight(); 
    }
  
    this._targetYPosition = this._initialSpherePosition.y * (1 - scrollOffset);
  
    if (!this._crossFadeTriggered) {
      this._action.paused = false;
      this._climber.visible = true;
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
  
    this._mixers.forEach((mixer) => mixer.update(delta));
  
    if (this._crossFadeTriggered) { 
      this._mixer.update(delta);
    }
  }
}