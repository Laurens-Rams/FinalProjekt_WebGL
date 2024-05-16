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
  PointLightHelper
} from 'three';
import Stats from 'stats.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DragGesture } from '@use-gesture/vanilla';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as dat from 'dat.gui';
import Postprocessing from './Postprocessing';
import store from "./store"

import Tiles from './Sliders';

export default class App {
  constructor() {
    this._moveForward = true; // Flag to track camera movement direction
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
    this._setDPR()

    // Camera
    const aspect = window.innerWidth / window.innerHeight;
    this._camera = new PerspectiveCamera(50, aspect, 0.1, 34000);
    this._camera.position.set(1, 1, 900);
    this._resize();

    // Scene
    this._scene = new Scene();
    this._scene.background = new Color(0x111111);

    // Initialize scene objects

    // Stats
    this._stats = new Stats();
    document.body.appendChild(this._stats.dom);

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

    // Button click event
    const moveCameraButton = document.getElementById('moveCameraButton');
    moveCameraButton.addEventListener('click', this._toggleCameraMove.bind(this));

    
  }

  _initLights() {
    // Ambient light
    const al = new AmbientLight(0xffffff);
    al.intensity = 0.08;
    this._scene.add(al);

    // Point Light
    this._pointLight = new PointLight(0xcab4b3, 1, 400);
    this._pointLight.position.set(0, 0, 10); // Adjust this position as needed
    this._scene.add(this._pointLight);

    // Point Light Helper
    const pointLightHelper = new PointLightHelper(this._pointLight);
    this._scene.add(pointLightHelper);

    // GUI for Point Light
    const gui = new dat.GUI();
    const pointLightFolder = gui.addFolder('Point Light');
    pointLightFolder.addColor(new ColorGUIHelper(this._pointLight, 'color'), 'value').name('color');
    pointLightFolder.add(this._pointLight, 'intensity', 0, 600000, 0.05).setValue(65940); 
    pointLightFolder.add(this._pointLight, 'distance', 0, 30000).setValue(3443); 
    pointLightFolder.add(this._pointLight, 'decay', 0, 3, 0.04).setValue(1.04); 
    pointLightFolder.add(this._pointLight.position, 'x', -900, 900).setValue(-197);
    pointLightFolder.add(this._pointLight.position, 'y', -1500, 1500).setValue(70);
    pointLightFolder.add(this._pointLight.position, 'z', -5000, 500).setValue(-1761); 
    pointLightFolder.open();

      // Point Light
      const _pointLight2 = new PointLight(0xffffff, 1, 400);
      _pointLight2.position.set(-98, 120, 10);
      const gui2 = new dat.GUI();
      const pointLightFolder2 = gui.addFolder('Point Light2');
      pointLightFolder2.add(_pointLight2, 'intensity', 0, 600000, 0.05).setValue(65940); 
      pointLightFolder2.add(_pointLight2, 'distance', 0, 30000).setValue(2119);
      pointLightFolder2.add(_pointLight2, 'decay', 0, 3, 0.04).setValue(1.04); 
      pointLightFolder2.add(_pointLight2.position, 'x', -1000, 9000).setValue(-197);
      pointLightFolder2.add(_pointLight2.position, 'y', -5500, 5500).setValue(70);
      pointLightFolder2.add(_pointLight2.position, 'z', -10000, 5000).setValue(-1761); 
      pointLightFolder2.open();
  }

  _initScene() {
    const tiles = new Tiles(this._camera, this._scene, this._pointLight);
    this._tiles = tiles;
    this._scene.add(tiles);
  }

  _toggleCameraMove() {
    if (this._moveForward) {
      this._moveCamera(-2000);
    } else {
      this._moveCamera(2000);
    }
    this._moveForward = !this._moveForward;
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

      // Interpolate position
      this._camera.position.lerpVectors(initialPosition, targetPosition, t);
      this._camera.updateProjectionMatrix();

      if (t < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
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

  _onLoaded(){
    this._composer.createBloomSelection()
  }

  _resize() {
    this._gl.setSize(window.innerWidth, window.innerHeight);
    this._setDPR();

    const aspect = window.innerWidth / window.innerHeight;
    this._camera.aspect = aspect;
    this._camera.updateProjectionMatrix();
  }


  _animate() {
    this._stats.begin();
  
    const delta = this._clock.getDelta();
    if (this._tiles) {
      this._tiles.update(delta);
    }
  
    this._gl.clearStencil();
    this._gl.clear(this._gl.STENCIL_BUFFER_BIT | this._gl.DEPTH_BUFFER_BIT | this._gl.COLOR_BUFFER_BIT);
  
    this._composer.render();
  
    this._stats.end();
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
