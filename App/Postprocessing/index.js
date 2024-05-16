import { ShaderMaterial, WebGLRenderer } from 'three';
import { EffectComposer, RenderPass, ShaderPass, SelectiveBloomEffect, EffectPass, KernelSize } from 'postprocessing';

import vertex from './shaders/vertex.glsl';
import fragment from './shaders/fragment.glsl';

export default class Postprocessing {
  constructor({ gl, scene, camera }) {
    this._gl = gl;
    this._scene = scene;
    this._camera = camera;

    this._init();
  }

  _init() {
    // Enable stencil buffer on WebGLRenderer
    //this._gl.setPixelRatio(window.devicePixelRatio);
    //this._gl.setSize(window.innerWidth, window.innerHeight);
    this._gl.autoClear = false;

    // COMPOSER
    const composer = new EffectComposer(this._gl, {stencilBuffer:true});
    this._composer = composer;

    // RENDERPASS
    const renderPass = new RenderPass(this._scene, this._camera);
    composer.addPass(renderPass);

    // SHADERPASS
    const shaderMaterial = new ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: {
        uPrevInput: { value: null },
      },
    });

    const shaderPass = new ShaderPass(shaderMaterial, 'uPrevInput');
    
    composer.addPass(shaderPass);

    // BLOOM EFFECT
    const bloomEffect = new SelectiveBloomEffect(this._scene,this._camera, {
        // kernelSize: KernelSize.VERY_LARGE,
        // intensity: 10.2, 
        // distinction: 1.0, 
        // luminanceThreshold: 0.0, 
        // luminanceSmoothing: 0.5, // Smoothing for the luminance threshold
        // resolutionScale: 0.5,
        mipmapBlur: true,
        intensity: 3,
        radius: 0.7,
        luminanceThreshold: 0.3,
        levels: 4
    });

    this._scene.traverse(element => {
        if(element.isMesh) {
            console.log(element.name, element.userData);
        }
    })
    this._bloomEffect = bloomEffect;

    // EFFECTPASS
    const effectPass = new EffectPass(this._camera, bloomEffect);
    composer.addPass(effectPass);
  }

  createBloomSelection(){
    const { selection } = this._bloomEffect

    this._scene.traverse(element => {
        if(element.isMesh && element.userData?.isSelectedForBloom) {
            selection.add(element)
        }
    })
  }

  render() {
    this._composer.render();
  }
}

// kernelSize: KernelSize.VERY_LARGE,
// intensity: 1.2, 
// distinction: 1.0, 
// luminanceThreshold: 0.4, 
// luminanceSmoothing: 0.5, // Smoothing for the luminance threshold
// resolutionScale: 0.5,