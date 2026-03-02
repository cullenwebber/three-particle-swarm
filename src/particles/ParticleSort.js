import * as THREE from "three";
import { GPUComputationRenderer } from "three/addons/misc/GPUComputationRenderer.js";
import sortKeyShader from "../shaders/sortKey.frag.glsl";
import bitonicSortShader from "../shaders/bitonicSort.frag.glsl";

const SORT_PASSES_PER_FRAME = 6;

export default class ParticleSort {
	constructor(renderer, size) {
		this.renderer = renderer;
		this.size = size;

		this.sortN = 1;
		while (this.sortN < size * size) this.sortN *= 2;
		this.totalStages = Math.log2(this.sortN);

		this.currentStage = 0;
		this.currentPass = 0;
		this.sortComplete = false;
		this.prevHalfVector = new THREE.Vector3();
		this.halfVector = new THREE.Vector3();

		this.#initGPUCompute();
	}

	#initGPUCompute() {
		this.gpuCompute = new GPUComputationRenderer(this.size, this.size, this.renderer);

		const initialTexture = this.gpuCompute.createTexture();
		const data = initialTexture.image.data;
		for (let i = 0; i < data.length; i += 4) {
			data[i] = 0.0;
			data[i + 1] = i / 4;
			data[i + 2] = 0.0;
			data[i + 3] = 1.0;
		}

		this.sortKeyVariable = this.gpuCompute.addVariable(
			"textureSortKey",
			sortKeyShader,
			initialTexture,
		);
		this.sortKeyVariable.wrapS = THREE.ClampToEdgeWrapping;
		this.sortKeyVariable.wrapT = THREE.ClampToEdgeWrapping;

		this.sortKeyUniforms = this.sortKeyVariable.material.uniforms;
		this.sortKeyUniforms.texturePosition = { value: null };
		this.sortKeyUniforms.halfVector = { value: new THREE.Vector3(0, 0, 1) };

		this.gpuCompute.setVariableDependencies(this.sortKeyVariable, [this.sortKeyVariable]);

		const error = this.gpuCompute.init();
		if (error !== null) console.error("ParticleSort init error:", error);

		this.sortPassThrough = this.gpuCompute.createShaderMaterial(bitonicSortShader, {
			u_pass: { value: 0 },
			u_stage: { value: 0 },
		});
	}

	computeHalfVector(camera, lightPosition) {
		const viewDir = new THREE.Vector3();
		camera.getWorldDirection(viewDir);

		const lightDir = lightPosition.clone().normalize();
		this.halfVector.copy(lightDir).add(viewDir).normalize();

		if (this.prevHalfVector.lengthSq() > 0) {
			const dot = this.halfVector.dot(this.prevHalfVector);
			if (dot < 0) this.halfVector.negate();
			if (dot < 0.5) this.restartSort();
		}

		this.prevHalfVector.copy(this.halfVector);
	}

	restartSort() {
		this.currentStage = 0;
		this.currentPass = 0;
		this.sortComplete = false;
	}

	update(positionTexture, camera, lightPosition) {
		this.computeHalfVector(camera, lightPosition);

		this.sortKeyUniforms.texturePosition.value = positionTexture;
		this.sortKeyUniforms.halfVector.value.copy(this.halfVector);

		this.sortKeyVariable.material.fragmentShader = sortKeyShader;
		this.sortKeyVariable.material.needsUpdate = true;
		this.gpuCompute.compute();

		if (!this.sortComplete) this.#runSortPasses();
	}

	#runSortPasses() {
		let passesThisFrame = 0;

		while (passesThisFrame < SORT_PASSES_PER_FRAME && !this.sortComplete) {
			this.sortPassThrough.uniforms.u_stage.value = this.currentStage;
			this.sortPassThrough.uniforms.u_pass.value = this.currentPass;

			const currentRT = this.gpuCompute.getCurrentRenderTarget(this.sortKeyVariable);
			const alternateRT = this.gpuCompute.getAlternateRenderTarget(this.sortKeyVariable);

			this.sortPassThrough.uniforms.textureSortKey = { value: currentRT.texture };
			this.gpuCompute.doRenderTarget(this.sortPassThrough, alternateRT);
			this.sortKeyVariable.renderTargets.reverse();

			passesThisFrame++;

			this.currentPass--;
			if (this.currentPass < 0) {
				this.currentStage++;
				if (this.currentStage >= this.totalStages) {
					this.sortComplete = true;
				} else {
					this.currentPass = this.currentStage;
				}
			}
		}
	}

	getSortTexture() {
		return this.gpuCompute.getCurrentRenderTarget(this.sortKeyVariable).texture;
	}
}
