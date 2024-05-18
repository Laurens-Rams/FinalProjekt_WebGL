

import { ShaderMaterial, WebGLRenderer } from 'three';
import { EffectComposer, RenderPass, ShaderPass, SelectiveBloomEffect, EffectPass } from 'postprocessing';
import DistortionTexture from './Distortion';
import { DistortionEffect } from './DistortionEffect';

import vertex from './shaders/vertex.glsl';
import fragment from './shaders/fragment.glsl';

export default class Postprocessing {
    constructor({ gl, scene, camera }) {
        this._gl = gl;
        this._scene = scene;
        this._camera = camera;
        this.distortionTexture = new DistortionTexture({ debug: false }); 

        this._init();
    }

    _init() {
        this._gl.autoClear = false;

        // COMPOSER
        const composer = new EffectComposer(this._gl, { stencilBuffer: true });
        this._composer = composer;

        // RENDERPASS
        const renderPass = new RenderPass(this._scene, this._camera);
        composer.addPass(renderPass);

        // distortion EFFECT
        const distortionEffect = new DistortionEffect(this.distortionTexture.texture);
        const distortionPass = new EffectPass(this._camera, distortionEffect);

        composer.addPass(distortionPass);

        // BLOOM EFFECT
        const bloomEffect = new SelectiveBloomEffect(this._scene, this._camera, {
            mipmapBlur: true,
            intensity: 3.2,
            radius: 0.5,
            luminanceThreshold: 0.4,
            levels: 4,
        });

        this._scene.traverse((element) => {
            if (element.isMesh) {
                console.log(element.name, element.userData);
            }
        });
        this._bloomEffect = bloomEffect;

        // EFFECTPASS
        const effectPass = new EffectPass(this._camera, bloomEffect);
        composer.addPass(effectPass);

        // Render to screen
        effectPass.renderToScreen = true;
    }

    createBloomSelection() {
        const { selection } = this._bloomEffect;

        this._scene.traverse((element) => {
            if (element.isMesh && element.userData?.isSelectedForBloom) {
                selection.add(element);
            }
        });
    }

    render() {
        this.distortionTexture.update();
        this._composer.render();
    }
}
