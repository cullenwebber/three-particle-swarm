import * as THREE from "three";
import { GPUComputationRenderer } from "three/addons/misc/GPUComputationRenderer.js";
import positionShader from "../shaders/position.frag.glsl";
import particlesVertexShader from "../shaders/particles.vert.glsl";
import particlesFragmentShader from "../shaders/particles.frag.glsl";
import ParticleSort from "./ParticleSort.js";
import OpacityPass from "./OpacityPass.js";

const SIZE = 512;

export default class ParticleSystem {
	constructor(renderer) {
		this.renderer = renderer;
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
		this.positionUniforms.wind = { value: new THREE.Vector3(-4, 0.0, -1.0) };
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

		// Initialize sort and opacity systems
		this.particleSort = new ParticleSort(renderer, SIZE);
		this.opacityPass = new OpacityPass(
			renderer,
			this.mesh.geometry,
			SIZE,
			this.pointSizeUniform,
		);
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

		// Shared uniform so one value controls both render + opacity shaders
		this.pointSizeUniform = { value: 10000.0 };

		const material = new THREE.ShaderMaterial({
			uniforms: {
				texturePosition: { value: null },
				textureSortKey: { value: null },
				opacityTexture: { value: null },
				pointSize: this.pointSizeUniform,
				sortResolution: { value: new THREE.Vector2(SIZE, SIZE) },
				lightDirection: { value: new THREE.Vector3(0.5, 0.8, 1.0) },
				lightViewMatrix: { value: new THREE.Matrix4() },
				lightProjectionMatrix: { value: new THREE.Matrix4() },
				shadowDensity: { value: 0.5 },
			},
			vertexShader: particlesVertexShader,
			fragmentShader: particlesFragmentShader,
			transparent: false,
			blending: THREE.NoBlending,
			depthWrite: false,
		});

		this.particleMaterial = material;

		const mesh = new THREE.Points(geometry, material);
		mesh.frustumCulled = false;

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

		// 1. Run simulation compute (updates positions)
		this.gpuCompute.compute();

		const positionTexture = this.gpuCompute.getCurrentRenderTarget(
			this.positionVariable,
		).texture;

		// 2-3. Run sort key generation + bitonic sort passes
		this.particleSort.update(positionTexture, camera, lightPosition);
		const sortTexture = this.particleSort.getSortTexture();

		// 4. Render opacity pass (particles into light-space RT)
		this.opacityPass.update(positionTexture, sortTexture, lightPosition);

		// 5. Pass textures to particle material
		this.particleMaterial.uniforms.texturePosition.value = positionTexture;
		this.particleMaterial.uniforms.textureSortKey.value = sortTexture;
		this.particleMaterial.uniforms.opacityTexture.value =
			this.opacityPass.getOpacityTexture();

		// Update light camera matrices for particle shader
		const lightCamera = this.opacityPass.getLightCamera();
		this.particleMaterial.uniforms.lightViewMatrix.value.copy(
			lightCamera.matrixWorldInverse,
		);
		this.particleMaterial.uniforms.lightProjectionMatrix.value.copy(
			lightCamera.projectionMatrix,
		);

		// Update light direction in view space for per-particle sphere shading
		if (lightPosition && camera) {
			// Direction from scene center toward light, in view space
			const lightWorld = lightPosition.clone().normalize();
			const lightDir = lightWorld.transformDirection(camera.matrixWorldInverse);
			this.particleMaterial.uniforms.lightDirection.value.copy(lightDir);
		}
	}
}
