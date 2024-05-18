import { 
  Group, 
  MathUtils, 
  Vector3, 
  Euler, 
  Mesh, 
  AlwaysStencilFunc, 
  ReplaceStencilOp, 
  EqualStencilFunc, 
  MeshPhongMaterial, 
  MeshStandardMaterial, 
  Box3, 
  AnimationMixer, 
  Clock, 
  Color, 
  Raycaster, 
  Vector2 
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { damp } from 'maath/easing';
import { addGLBToTile, addGLBToTileNoAnimation } from './handleGLBModels';

import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';

export default class Tiles extends Group {
  constructor(camera, scene, pointLight, app) {
    super();

    this._camera = camera;
    this._scene = scene;
    this._app = app;
    this._pointLight = pointLight;
    this._initializeVariables();
    this._init();

    // Additional initializations
    this._loadClimber();
    this._camera.position.z -= 900;
    this._initialCameraPosition = this._camera.position.clone();
  }

  _initializeVariables() {
    this._isDragging = false;
    this._isDraggingClick = false;
    this._width = 750;
    this._height = 1300;
    this._radius = 1400;
    this._dragRadiusOffset = -400;
    this._els = [];
    this._modelsForRaycasting = [];
    this._sphereCenter = new Vector3(0, 0, 0);
    this._numTiles = 9;
    this._gltfLoader = new GLTFLoader();
    this._mixers = [];
    this._clock = new Clock();
    this._targetObjectGroup = null;
    this._targetModelScaleFactor = null;
    this._initialSpherePosition = new Vector3(0, 2000, 0);
    this.position.copy(this._initialSpherePosition);
    this._targetYPosition = this._initialSpherePosition.y;
    this._currentRotation = new Euler(0, 0, 0);
    this._targetRotation = new Euler(0, 0, 0);
    this._maxYRotation = MathUtils.degToRad(15);
    this._crossFadeTriggered = false;
    this._scrollLimit = 0.92;
    this._raycaster = new Raycaster();
    this._mouse = new Vector2();
    this._targetModel = null;
    this._hasClickedZoom = false;
  }

  _init() {
    this.addTextToScene("Space Trip", '/font-2.json');
    this._createTiles();
  }

  _createTiles() {
    // phone screen
    const stencilGLBPath = '../public/phone_screen_new.glb';
    const angleIncrement = (2 * Math.PI) / this._numTiles;
    const normal = new Vector3();

    for (let i = 0; i < this._numTiles; i++) {
      const additionalRotation = MathUtils.degToRad(30);
      const angle = i * angleIncrement + additionalRotation;
      const x = Math.cos(angle);
      const z = Math.sin(angle);
      const y = (i === 6) ? 0 : (Math.random() - 0.5) * 0.4;
      const randomOffset = (i === 6) ? 0 : (Math.random() - 0.5) * 300;


      const tilePosition = new Vector3(
        x * (this._radius + randomOffset),
        y * (this._radius + randomOffset),
        z * (this._radius + randomOffset)
      );

      // group for inside the stencil
      const objectPosition = new Vector3(
        x * (this._radius + 2000 + randomOffset), 
        y * (this._radius + 2000 + randomOffset),
        z * (this._radius + 2000 + randomOffset)
      );

      const objectGroup = this._createObjectGroup(objectPosition);
      this.add(objectGroup);
      this._els.push(objectGroup);

      this._loadTileModel(stencilGLBPath, tilePosition, normal, objectGroup, i);
    }
  }

  _createObjectGroup(position) {
    const group = new Group();
    group.position.copy(position);
    group.userData.initialPosition = group.position.clone();
    group.userData.dragPosition = group.position.clone();
    group.userData.dragPosition.multiplyScalar((this._radius - this._dragRadiusOffset) / this._radius);
    return group;
  }

  // Stencil
  _loadTileModel(stencilGLBPath, tilePosition, normal, objectGroup, index) {
    this._gltfLoader.load(stencilGLBPath, (gltf) => {
      const model = gltf.scene;
      this._scaleAndPositionModel(model, tilePosition);

      model.traverse((child) => {
        if (child.isMesh) {
          child.material = this.createStencilMaterial(index + 1);
        }
      });

      this._addModelToScene(model, tilePosition, normal, objectGroup, index);
    });
  }

  _scaleAndPositionModel(model, position) {
    const box = new Box3().setFromObject(model);
    const size = new Vector3();

    box.getSize(size);
    const scaleFactor = Math.min(this._width / size.x, this._height / size.y, this._width / size.z) * 0.97;

    model.scale.set(scaleFactor, scaleFactor, scaleFactor);
    model.position.copy(position);
  }

  // Object group inside stencil
  _addModelToScene(model, position, normal, objectGroup, index) {
      normal.subVectors(this._sphereCenter, position).normalize();
      model.lookAt(position.clone().add(normal));
      model.userData.initialPosition = model.position.clone();
      model.userData.dragPosition = model.position.clone();
      model.userData.dragPosition.multiplyScalar(this._radius / this._radius);
      this.add(model);
      this._modelsForRaycasting.push(model);

      const glbPath = '/Avatar_Animations_4.glb';
      const glbPath_landscape = '/tunnel.glb';
      const animationNames = [
        'Armature.002|mixamo.com|Layer0.001 Retarget',
        'Armature.002|mixamo.com|Layer0.003 Retarget',
        'Armature.003|mixamo.com|Layer0 Retarget',
        'Armature.004|mixamo.com|Layer0 Retarget',
        'Armature.001|mixamo.com|Layer0.001 Retarget',
        'Armature.001|mixamo.com|Layer0 Retarget',
        'Armature.002|mixamo.com|Layer0 Retarget',
      ];

      const animationName = animationNames[index % animationNames.length];
      this._handleGLBModels(objectGroup, glbPath, glbPath_landscape, index, animationName, model);
  }

  _handleGLBModels(objectGroup, glbPath, glbPath_landscape, index, animationName, stencilMesh) {
    if (index === 6) {
      this._targetObjectGroup = objectGroup;
      this._targetModelScaleFactor = stencilMesh.scale.x * 0.05;
      addGLBToTile(objectGroup, glbPath, index, this._mixers, animationName, stencilMesh, this._targetModelScaleFactor, false);
    } else {
      addGLBToTile(objectGroup, glbPath, index, this._mixers, animationName, stencilMesh, stencilMesh.scale.x * 0.05);
    }

    addGLBToTileNoAnimation(objectGroup, glbPath_landscape, index, stencilMesh, stencilMesh.scale.x * 0.015);
    this._addPhoneScreen(stencilMesh);
  }

  _addPhoneScreen(stencilMesh) {
    const phoneScreenPath = '../public/phone_newest.glb';
    this._gltfLoader.load(phoneScreenPath, (gltf) => {
      const phoneScreen = gltf.scene;
      this._scaleAndPositionModel(phoneScreen, stencilMesh.position);
      phoneScreen.rotation.copy(stencilMesh.rotation);
      phoneScreen.userData.initialPosition = phoneScreen.position.clone();
      phoneScreen.userData.dragPosition = phoneScreen.position.clone();
      phoneScreen.userData.dragPosition.multiplyScalar((this._radius) / this._radius);
      this.add(phoneScreen);
    });
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

  addTextToScene(text, fontUrl) {
    const loader = new FontLoader();
    loader.load(fontUrl, (font) => {
      const geometry = new TextGeometry(text, {
        font: font,
        size: 80,
        depth: 20,
        curveSegments: 5,
        bevelEnabled: true,
        bevelThickness: 2,
        bevelSize: 2,
        bevelOffset: 0,
        bevelSegments: 2,
      });

      const material = new MeshPhongMaterial({ color: 0xFFFFFF });
      const textMesh = new Mesh(geometry, material);
      textMesh.position.set(-360, -2300, -1000);
      textMesh.rotation.set(0, 0, 0);
      this._scene.add(textMesh);
    });
  }

  onDrag(state) {
    if (this._climber.visible) return;
    this._isDragging = state.dragging;
    if (!this._isDraggingClick) {
      this._dragStartTime = Date.now();
      this._dragTimer = setTimeout(() => {
        this._isDraggingClick = true;
      }, 950);
    }

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
    clearTimeout(this._dragTimer);
    if (!this._isDraggingClick || (Date.now() - this._dragStartTime < 950)) {
      this._onMouseClick(event);
    }
    this._isDraggingClick = false;
  }

  _onMouseClick(event) {
    this._mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this._mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    this._raycaster.setFromCamera(this._mouse, this._camera);
    const intersects = this._raycaster.intersectObjects(this._modelsForRaycasting, true);

    if (intersects.length > 0) {
      if (!this._hasClickedZoom) {
        this._moveCamera(-1600);
        this._hasClickedZoom = true;
      } else {
        this._blinkPointLight();
        this._moveCamera(1600);
        this._hasClickedZoom = false;
      }
    }
  }

  _moveCamera(distance) {
    const targetPosition = new Vector3(
      this._camera.position.x,
      this._camera.position.y,
      this._camera.position.z + distance
    );

    const duration = 2;
    const startTime = performance.now();
    const initialPosition = this._camera.position.clone();

    const animate = (time) => {
      const elapsed = (time - startTime) / 200;
      const t = Math.min(elapsed / duration, 1);
      this._camera.position.lerpVectors(initialPosition, targetPosition, t);
      this._camera.updateProjectionMatrix();

      if (t < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  _blinkPointLight(duration = 2500, interval = 300, color = 0xaa8181) {
    const originalColor = new Color(this._pointLight.color.getHex());
    let isBlinking = false;

    const blinkInterval = setInterval(() => {
      this._pointLight.color.set(isBlinking ? originalColor : color);
      isBlinking = !isBlinking;
    }, interval);

    setTimeout(() => {
      clearInterval(blinkInterval);
      this._pointLight.color.set(originalColor);
    }, duration);
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
        this._climber.scale.set(this._targetModelScaleFactor, this._targetModelScaleFactor, this._targetModelScaleFactor);
        this._climber.position.copy(this._targetObjectGroup.position);
        this._climber.rotation.copy(this._targetObjectGroup.rotation);
        this._climber.rotation.y += 3.14; 
        this._climber.position.y -= 850;
        this._climber.position.z -= 1050;
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

  _moveCameraWithScroll(scrollOffset) {
    if (scrollOffset < 0) {
      this._camera.position.z = this._camera.position.z;
      this._camera.position.y = this._camera.position.y;
      return;
    }

    const normalizedScrollOffset = (scrollOffset - 0.1) / (1 - 0.1);
    const targetY = MathUtils.lerp(this._initialCameraPosition.y, this._initialCameraPosition.y + 3000, normalizedScrollOffset);
    const targetZ = MathUtils.lerp(this._initialCameraPosition.z, this._initialCameraPosition.z + 900, normalizedScrollOffset);

    this._camera.position.z = targetZ;
    this._camera.position.y = targetY;
    this._camera.updateProjectionMatrix();
  }

  onScroll() {
    if (!this._mixer || !this._action || !this._secondAction || !this._thirdAction) return;

    const scrollY = window.scrollY;
    const maxScrollY = document.documentElement.scrollHeight - window.innerHeight;
    const scrollOffset = scrollY / maxScrollY;

    if (scrollOffset >= 0.9) {
      const normalizedScrollOffset = (scrollOffset - 0.9) / (1 - 0.9);
      const distance = MathUtils.lerp(2119, 25000, normalizedScrollOffset);
      this._pointLight.distance = distance;
    }

    if (scrollOffset >= this._scrollLimit && !this._crossFadeTriggered) {
      this._executeCrossFade();
    }

    this._targetYPosition = this._initialSpherePosition.y * (1 - scrollOffset);

    if (!this._crossFadeTriggered) {
      this._action.paused = false;
      this._climber.visible = true;
      this._action.time = this._action.getClip().duration * scrollOffset;
      this._mixer.update(0);
    }

    this._moveCameraWithScroll(scrollOffset);
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