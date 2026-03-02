import * as THREE from "three";
import opacityVertexShader from "../shaders/opacity.vert.glsl";
import opacityFragmentShader from "../shaders/opacity.frag.glsl";

const OPACITY_MAP_SIZE = 1024;
const ORTHO_SIZE = 500; // half-width of light frustum in world units

export default class OpacityPass {
	constructor(renderer, particleGeometry, size, pointSizeUniform) {
		this.renderer = renderer;
		this.size = size;

		// Light-space camera (orthographic, covers the particle volume)
		this.lightCamera = new THREE.OrthographicCamera(
			-ORTHO_SIZE,
			ORTHO_SIZE,
			ORTHO_SIZE,
			-ORTHO_SIZE,
			1,
			3000,
		);
		this.lightCamera.position.set(0, -100, 800);
		this.lightCamera.updateMatrixWorld();
		this.lightCamera.updateProjectionMatrix();

		// Render target for opacity accumulation
		this.renderTarget = new THREE.WebGLRenderTarget(
			OPACITY_MAP_SIZE,
			OPACITY_MAP_SIZE,
			{
				minFilter: THREE.LinearFilter,
				magFilter: THREE.LinearFilter,
				format: THREE.RGBAFormat,
				type: THREE.FloatType,
			},
		);

		const fovRad = (50 * Math.PI) / 180;
		const approxScreenH = 1000;
		const opacityPointScale =
			(Math.tan(fovRad / 2) * OPACITY_MAP_SIZE) / (approxScreenH * ORTHO_SIZE);

		// Opacity material — shares the same pointSize uniform as the main particles
		this.material = new THREE.ShaderMaterial({
			uniforms: {
				texturePosition: { value: null },
				textureSortKey: { value: null },
				sortResolution: { value: new THREE.Vector2(size, size) },
				lightViewMatrix: {
					value: this.lightCamera.matrixWorldInverse.clone(),
				},
				lightProjectionMatrix: {
					value: this.lightCamera.projectionMatrix.clone(),
				},
				pointSize: pointSizeUniform, // shared reference, not a copy
				opacityPointScale: { value: opacityPointScale },
			},
			vertexShader: opacityVertexShader,
			fragmentShader: opacityFragmentShader,
			transparent: true,
			depthWrite: false,
			depthTest: false,
			blending: THREE.CustomBlending,
			blendEquation: THREE.AddEquation,
			blendSrc: THREE.OneFactor,
			blendDst: THREE.OneFactor,
		});

		// Create points mesh for opacity rendering (shares geometry)
		this.mesh = new THREE.Points(particleGeometry, this.material);
		this.mesh.frustumCulled = false;

		// Scene for rendering opacity
		this.scene = new THREE.Scene();
		this.scene.add(this.mesh);
	}

	update(positionTexture, sortTexture, lightPosition) {
		// Update light camera to match light position
		this.lightCamera.position.copy(lightPosition);
		this.lightCamera.lookAt(0, 0, 0);
		this.lightCamera.updateMatrixWorld();

		this.material.uniforms.texturePosition.value = positionTexture;
		this.material.uniforms.textureSortKey.value = sortTexture;
		this.material.uniforms.lightViewMatrix.value.copy(
			this.lightCamera.matrixWorldInverse,
		);
		this.material.uniforms.lightProjectionMatrix.value.copy(
			this.lightCamera.projectionMatrix,
		);

		// Render opacity pass
		const currentRenderTarget = this.renderer.getRenderTarget();
		const currentClearColor = this.renderer.getClearColor(new THREE.Color());
		const currentClearAlpha = this.renderer.getClearAlpha();

		this.renderer.setRenderTarget(this.renderTarget);
		this.renderer.setClearColor(0x000000, 0);
		this.renderer.clear();
		this.renderer.render(this.scene, this.lightCamera);

		// Restore
		this.renderer.setRenderTarget(currentRenderTarget);
		this.renderer.setClearColor(currentClearColor, currentClearAlpha);
	}

	getOpacityTexture() {
		return this.renderTarget.texture;
	}

	getLightCamera() {
		return this.lightCamera;
	}
}
