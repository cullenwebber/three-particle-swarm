import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

export default class PostProcessing {
	constructor(renderer, scene, camera, width, height) {
		this.composer = new EffectComposer(renderer);

		// Render pass
		const renderPass = new RenderPass(scene, camera);
		this.composer.addPass(renderPass);

		// Unreal Bloom
		this.bloomPass = new UnrealBloomPass(
			new THREE.Vector2(width, height),
			0.4, // strength
			0.2, // radius
			0.4, // threshold
		);
		this.composer.addPass(this.bloomPass);

		// Output (tone mapping + color space)
		const outputPass = new OutputPass();
		this.composer.addPass(outputPass);
	}

	render() {
		this.composer.render();
	}

	onResize(width, height) {
		this.composer.setSize(width, height);
	}
}
