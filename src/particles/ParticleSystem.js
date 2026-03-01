import * as THREE from "three";
import { GPUComputationRenderer } from "three/addons/misc/GPUComputationRenderer.js";
import positionShader from "../shaders/position.frag.glsl";
import particlesVertexShader from "../shaders/particles.vert.glsl";
import particlesFragmentShader from "../shaders/particles.frag.glsl";

const SIZE = 256;

// DirectionalLight shadow pass — customDepthMaterial.
// PCFShadowMap uses native depth buffer, so only the vertex position matters.
const depthVertexShader = /* glsl */ `
uniform sampler2D texturePosition;
uniform float pointSize;

void main() {
    vec4 positionInfo = texture2D( texturePosition, position.xy );
    vec4 mvPosition = modelViewMatrix * vec4( positionInfo.xyz, 1.0 );

    gl_PointSize = pointSize / length( mvPosition.xyz ) * smoothstep(0.0, 0.2, positionInfo.w);
    gl_Position = projectionMatrix * mvPosition;
}
`;

const depthFragmentShader = /* glsl */ `
void main() {
    vec2 coord = gl_PointCoord * 2.0 - 1.0;
    if(dot(coord, coord) > 1.0) discard;
    gl_FragColor = vec4( 1.0 );
}
`;

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
		this.positionUniforms.speed = { value: 1.0 };
		this.positionUniforms.dieSpeed = { value: 0.02 };
		this.positionUniforms.radius = { value: 90.0 };
		this.positionUniforms.curlSize = { value: 0.015 };
		this.positionUniforms.attraction = { value: 1.5 };
		this.positionUniforms.initAnimation = { value: 0.0 };
		this.positionUniforms.mouse3d = { value: new THREE.Vector3() };
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
		this.pointSizeUniform = { value: 6000.0 };

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
			blending: THREE.NoBlending,
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

	update(delta, elapsed, mouse3d, camera, lightPosition) {
		// Animate init
		this.positionUniforms.initAnimation.value = Math.min(
			1.0,
			this.positionUniforms.initAnimation.value + delta * 0.5,
		);
		this.positionUniforms.time.value = elapsed;
		this.positionUniforms.mouse3d.value.copy(mouse3d);

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
