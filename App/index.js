import {
  PerspectiveCamera,
  WebGLRenderer,
  Scene,
  Color,
  Clock,
  MathUtils,
  AmbientLight,
  Vector3,
  PointLight,
  PointLightHelper,
  TextureLoader,
  AnimationMixer,
  ShaderMaterial
} from 'three';


import { DragGesture } from '@use-gesture/vanilla';

import Stats from 'stats.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as dat from 'dat.gui';
import Postprocessing from './Postprocessing';
import store from "./store";

import vertex from './shaders/vertex.glsl';
import fragment from './shaders/fragment.glsl';

import Tiles from './Sliders';

const TL = new TextureLoader();

export default class App {
  constructor(debug = true) {
    this.spreadX = 50;
    this.spreadY = 50;
    this.spreadZ = 50;
    this.numParticles = 500;

    this.debug = debug;

    this._init();
  }

  _init() {
    // Renderer
    this._gl = new WebGLRenderer({
      canvas: document.querySelector('#canvas_main'),
      antialias: window.devicePixelRatio <= 1,
      stencil: true,
      logarithmicDepthBuffer: true
    });
    this._gl.setSize(window.innerWidth, window.innerHeight);
    this._setDPR();

    // Camera
    const aspect = window.innerWidth / window.innerHeight;
    this._camera = new PerspectiveCamera(50, aspect, 0.1, 34000);
    this._camera.position.set(1, -3000, 500);
    this._resize();

    // Scene
    this._scene = new Scene();
    this._scene.background = new Color(0x040d11);

    // Initialize scene objects

    // Stats (conditionally initialize)
    if (this.debug) {
      this._stats = new Stats();
      document.body.appendChild(this._stats.dom);
    }

    // Clock for delta
    this._clock = new Clock();

    // Lights
    this._initLights();

    // COMPOSER
    this._composer = new Postprocessing({
      gl: this._gl,
      scene: this._scene,
      camera: this._camera,
    });

    this._initScene();

    // Event Listeners
    this._initEvents();
    // this._controls = new OrbitControls(this._camera, this._gl.domElement);

    // Animation
    this._animate();
  }

  _initLights() {
    // Ambient light
    const al = new AmbientLight(0xffffff);
    al.intensity = 0.1;
    this._scene.add(al);

    // Point Light
    this._pointLight = new PointLight(0xcab4b3, 1, 400);
    this._pointLight.position.set(0, 0, 10); // Adjust this position as needed
    this._scene.add(this._pointLight);

    // Set properties for Point Light
    this._pointLight.intensity = 65940;
    this._pointLight.distance = 2119;
    this._pointLight.decay = 1.04;
    this._pointLight.position.set(-197, 70, -1761);


     // Point Light
     this._Pl1 = new PointLight(0xcab4b3, 1, 400);
     this._scene.add(this._Pl1);
 
     // Set properties for Point Light
     this._Pl1.intensity = 22000;
     this._Pl1.distance = 2119;
     this._Pl1.decay = 1.24;
     this._Pl1.position.set(40, -1600, -500);


    // GUI for Point Light (conditionally initialize)
    if (this.debug) {
      const gui = new dat.GUI();
      const pointLightFolder = gui.addFolder('Point Light');
      pointLightFolder.addColor(new ColorGUIHelper(this._pointLight, 'color'), 'value').name('color');
      pointLightFolder.add(this._pointLight, 'intensity', 0, 600000, 0.05).setValue(65940);
      pointLightFolder.add(this._pointLight, 'distance', 0, 30000).setValue(2119);
      pointLightFolder.add(this._pointLight, 'decay', 0, 3, 0.04).setValue(1.04);
      pointLightFolder.add(this._pointLight.position, 'x', -900, 900).setValue(-197);
      pointLightFolder.add(this._pointLight.position, 'y', -1500, 1500).setValue(70);
      pointLightFolder.add(this._pointLight.position, 'z', -5000, 500).setValue(-1761);
      pointLightFolder.open();
    }
  }

  _initScene() {
    const tiles = new Tiles(this._camera, this._scene, this._pointLight, this);
    this._tiles = tiles;
    this._scene.add(tiles);

    this._loadGLTF();
  }

  _loadGLTF() {
    const loader = new GLTFLoader();
    loader.load(
      '/space.glb', // Replace with the path to your GLB file
      (gltf) => {
        this._gltfScene = gltf.scene;
        this._scene.add(this._gltfScene);

        // Set the position of the GLB model
        this._gltfScene.position.set(0, 0, 2000); // Adjust these values to your desired position

        // Set the scale of the GLB model
        this._gltfScene.scale.set(1000, 1000, 1000); // Adjust these values to your desired scale

        // Apply custom shaders
        const shaderMaterial = new ShaderMaterial({
          vertexShader: vertex,
          fragmentShader: fragment,
          uniforms: {
            time: { value: 0.0 },
          },
        });
    
        this._gltfScene.traverse((child) => {
          if (child.isMesh) {
            child.material = shaderMaterial;
          }
        });

        // If the model has animations, set up the animation mixer
        if (gltf.animations && gltf.animations.length > 0) {
          this._mixer = new AnimationMixer(this._gltfScene);
          gltf.animations.forEach((clip) => {
            this._mixer.clipAction(clip).play();
          });
        }
      },
      undefined,
      (error) => {
        console.error('An error happened while loading the GLTF model:', error);
      }
    );
  }


  _setDPR() {
    const dpr = MathUtils.clamp(window.devicePixelRatio, 1, 1.3);
    this._gl.setPixelRatio(dpr);
  }

  onDrag(state) {
    this._tiles.onDrag(state);
  }

  onDragEnd() {
    this._tiles.onDragEnd();
    console.log("end")
  }

  _initEvents() {
    window.addEventListener('resize', this._resize.bind(this));
    window.addEventListener('scroll', this._tiles.onScroll.bind(this._tiles));

    const el = document.querySelector('#canvas_main');
    el.style.touchAction = 'none';

    const gesture = new DragGesture(el, (state) => {
      this.onDrag(state);
      if (!state.active) {
        this.onDragEnd();
      }
    });

    // DETECT IF LOADER
    store.loaderManager.onLoad = () => {
      this._onLoaded()
    }
  }

  _onLoaded() {
    this._composer.createBloomSelection();
  }

  _resize() {
    this._gl.setSize(window.innerWidth, window.innerHeight);
    this._setDPR();

    const aspect = window.innerWidth / window.innerHeight;
    this._camera.aspect = aspect;
    this._camera.updateProjectionMatrix();
  }

  _animate() {
    if (this.debug) {
      this._stats.begin();
    }
  
    const delta = this._clock.getDelta();
    if (this._tiles) {
      this._tiles.update(delta);
    }
  
    this._gl.clearStencil();
    this._gl.clear(this._gl.STENCIL_BUFFER_BIT | this._gl.DEPTH_BUFFER_BIT | this._gl.COLOR_BUFFER_BIT);
  
    this._composer.render();
  
    if (this.debug) {
      this._stats.end();
    }
  
    // Update the animation mixer if it exists
    if (this._mixer) {
      this._mixer.update(delta * 4);
  
      this._gltfScene.traverse((child) => {
        if (child.isMesh) {
          // Example effect: Pulsating intensity
          const time = Date.now() * 1.0;
          child.material.uniforms.time.value = time;
        }
      });
    }
  
    window.requestAnimationFrame(this._animate.bind(this));
  }
}

class ColorGUIHelper {
  constructor(object, prop) {
    this.object = object;
    this.prop = prop;
  }

  get value() {
    return `#${this.object[this.prop].getHexString()}`;
  }

  set value(hexString) {
    this.object[this.prop].set(hexString);
  }
}