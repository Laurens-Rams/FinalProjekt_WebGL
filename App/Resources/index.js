import { TextureLoader } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const ASSETS = [
    { key: 'model', type: 'gltf', path: '../public/climber6.glb' }, // Update with your model path
  // Add other assets as needed
];

class Resources {
  constructor() {
    this._resources = new Map();

    this._loaders = {
      tl: new TextureLoader(),
      gltf: new GLTFLoader(),
      rgbe: new RGBELoader(),
    };
  }

  get(key) {
    return this._resources.get(key);
  }

  async load() {
    const promises = ASSETS.map((asset) => {
      let prom;
      if (asset.type === 'gltf') {
        prom = new Promise((resolve) => {
          this._loaders.gltf.load(asset.path, (model) => {
            this._resources.set(asset.key, model);
            resolve();
            console.log('reso');
          });
        });
      }
      if (asset.type === 'envmap') {
        prom = new Promise((resolve) => {
          this._loaders.rgbe.load(asset.path, (texture) => {
            this._resources.set(asset.key, texture);
            resolve();
          });
        });
      }
      if (asset.type === 'texture') {
        prom = new Promise((resolve) => {
          this._loaders.tl.load(asset.path, (texture) => {
            this._resources.set(asset.key, texture);
            resolve();
          });
        });
      }
      return prom;
    });

    await Promise.all(promises);
  }
}

const resources = new Resources();
export default resources;