import * as THREE from "three";
import { GPUComputationRenderer } from "three/addons/misc/GPUComputationRenderer.js";
import positionShader from "../shaders/position.frag.glsl";
import particlesVertexShader from "../shaders/particles.vert.glsl";
import particlesFragmentShader from "../shaders/particles.frag.glsl";
import depthVertexShader from "../shaders/depth.vert.glsl";
import depthFragmentShader from "../shaders/depth.frag.glsl";

const SIZE = 312;

export default class ParticleSystem {
	constructor(renderer) {
		this.gpuCompute = new GPUComputationRenderer(SIZE, SIZE, renderer);

		// Create default position texture (random sphere distribution)
		const defaultPositionTexture = this.gpuCompute.createTexture();
		this.fillPositionTexture(defaultPositionTexture);

		// Add position compute variable
		this.positionVariable = this.gpuCompute.addVariable(
			"texturePosition",
			positionShader,
			defaultPositionTexture,
		);
		this.positionVariable.wrapS = THREE.RepeatWrapping;
		this.positionVariable.wrapT = THREE.RepeatWrapping;

		// Set uniforms for position compute shader
		this.positionUniforms = this.positionVariable.material.uniforms;
		this.positionUniforms.time = { value: 0.0 };
		this.positionUniforms.speed = { value: 2.0 };
		this.positionUniforms.dieSpeed = { value: 0.01 };
		this.positionUniforms.radius = { value: 90.0 };
		this.positionUniforms.curlSize = { value: 0.0175 };
		this.positionUniforms.attraction = { value: 3.5 };
		this.positionUniforms.initAnimation = { value: 0.0 };
		this.positionUniforms.textureMeshPositions = { value: null };
		this.positionUniforms.textureMeshVelocities = { value: null };
		this.positionUniforms.meshSampleSize = { value: 64.0 };
		this.positionUniforms.timeScale = { value: 1.0 };
		this.positionUniforms.wind = { value: new THREE.Vector3(-3, 0.0, 0.0) };
		this.positionUniforms.textureDefaultPosition = {
			value: defaultPositionTexture,
		};

		this.gpuCompute.setVariableDependencies(this.positionVariable, [
			this.positionVariable,
		]);

		const error = this.gpuCompute.init();
		if (error !== null) {
			console.error("GPUComputationRenderer init error:", error);
		}

		// Create particle mesh
		this.mesh = this.createParticleMesh();
	}

	fillPositionTexture(texture) {
		const data = texture.image.data;
		for (let i = 0; i < data.length; i += 4) {
			// Random point in sphere volume
			const theta = Math.random() * Math.PI * 2;
			const phi = Math.acos(2 * Math.random() - 1);
			const r = Math.cbrt(Math.random());

			data[i] = r * Math.sin(phi) * Math.cos(theta);
			data[i + 1] = r * Math.sin(phi) * Math.sin(theta);
			data[i + 2] = r * Math.cos(phi);
			data[i + 3] = Math.random(); // life
		}
	}

	createParticleMesh() {
		const geometry = new THREE.BufferGeometry();
		const count = SIZE * SIZE;
		const positions = new Float32Array(count * 3);

		// Store UV coords that reference into the GPGPU texture
		for (let i = 0; i < count; i++) {
			const x = (i % SIZE) / SIZE;
			const y = Math.floor(i / SIZE) / SIZE;
			positions[i * 3] = x;
			positions[i * 3 + 1] = y;
			positions[i * 3 + 2] = 0;
		}

		geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

		// Shared uniform so one value controls both render + depth shaders
		this.pointSizeUniform = { value: 9000.0 };

		const material = new THREE.ShaderMaterial({
			uniforms: THREE.UniformsUtils.merge([
				THREE.UniformsLib.lights,
				{
					texturePosition: { value: null },
					pointSize: this.pointSizeUniform,
					lightDirection: { value: new THREE.Vector3(0.5, 0.8, 1.0) },
				},
			]),
			vertexShader: particlesVertexShader,
			fragmentShader: particlesFragmentShader,
			lights: true,
			transparent: true,
			depthWrite: false,
		});

		this.particleMaterial = material;

		// customDepthMaterial for DirectionalLight shadow pass
		const depthMaterial = new THREE.ShaderMaterial({
			uniforms: {
				texturePosition: { value: null },
				pointSize: this.pointSizeUniform,
			},
			vertexShader: depthVertexShader,
			fragmentShader: depthFragmentShader,
		});

		this.depthMaterial = depthMaterial;

		const mesh = new THREE.Points(geometry, material);
		mesh.frustumCulled = false;
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		mesh.customDepthMaterial = depthMaterial;

		return mesh;
	}

	update(delta, elapsed, timeScale, meshSampler, camera, lightPosition) {
		// Animate init
		this.positionUniforms.initAnimation.value = Math.min(
			1.0,
			this.positionUniforms.initAnimation.value + delta * 0.5,
		);
		this.positionUniforms.time.value = elapsed;
		this.positionUniforms.timeScale.value = timeScale;

		// Set mesh surface textures from sampler
		if (meshSampler) {
			this.positionUniforms.textureMeshPositions.value =
				meshSampler.positionTexture;
			this.positionUniforms.textureMeshVelocities.value =
				meshSampler.velocityTexture;
			this.positionUniforms.meshSampleSize.value = meshSampler.size;
		}

		this.gpuCompute.compute();

		// Pass computed position texture to particle material and depth material
		const positionTexture = this.gpuCompute.getCurrentRenderTarget(
			this.positionVariable,
		).texture;
		this.particleMaterial.uniforms.texturePosition.value = positionTexture;
		this.depthMaterial.uniforms.texturePosition.value = positionTexture;
		this.depthMaterial.uniformsNeedUpdate = true;

		// Update light direction in view space for per-particle sphere shading
		if (lightPosition && camera) {
			const lightDir = lightPosition
				.clone()
				.applyMatrix4(camera.matrixWorldInverse)
				.normalize();
			this.particleMaterial.uniforms.lightDirection.value.copy(lightDir);
		}
	}
}
