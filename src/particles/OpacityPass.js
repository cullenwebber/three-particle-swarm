import * as THREE from "three";
import opacityVertexShader from "../shaders/opacity.vert.glsl";
import opacityFragmentShader from "../shaders/opacity.frag.glsl";

const OPACITY_MAP_SIZE = 1024;
const ORTHO_SIZE = 500;

export default class OpacityPass {
	constructor(renderer, particleGeometry, size, pointSizeUniform) {
		this.renderer = renderer;

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

		this.renderTarget = new THREE.WebGLRenderTarget(
			OPACITY_MAP_SIZE,
			OPACITY_MAP_SIZE,
			{
				minFilter: THREE.NearestFilter,
				magFilter: THREE.NearestFilter,
				format: THREE.RGBAFormat,
				type: THREE.HalfFloatType,
			},
		);

		const fovRad = (50 * Math.PI) / 180;
		const opacityPointScale =
			(Math.tan(fovRad / 2) * OPACITY_MAP_SIZE) / (1000 * ORTHO_SIZE);

		this.material = new THREE.ShaderMaterial({
			uniforms: {
				texturePosition: { value: null },
				textureSortKey: { value: null },
				useSortKey: { value: 1.0 },
				sortResolution: { value: new THREE.Vector2(size, size) },
				lightViewMatrix: { value: this.lightCamera.matrixWorldInverse.clone() },
				lightProjectionMatrix: {
					value: this.lightCamera.projectionMatrix.clone(),
				},
				pointSize: pointSizeUniform,
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

		this.mesh = new THREE.Points(particleGeometry, this.material);
		this.mesh.frustumCulled = false;

		this.scene = new THREE.Scene();
		this.scene.add(this.mesh);
	}

	update(positionTexture, sortTexture, lightPosition, sortEnabled = true) {
		this.lightCamera.position.copy(lightPosition);
		this.lightCamera.lookAt(0, 0, 0);
		this.lightCamera.updateMatrixWorld();

		this.material.uniforms.texturePosition.value = positionTexture;
		this.material.uniforms.textureSortKey.value = sortTexture;
		this.material.uniforms.useSortKey.value = sortEnabled ? 1.0 : 0.0;
		this.material.uniforms.lightViewMatrix.value.copy(
			this.lightCamera.matrixWorldInverse,
		);
		this.material.uniforms.lightProjectionMatrix.value.copy(
			this.lightCamera.projectionMatrix,
		);

		const prevRT = this.renderer.getRenderTarget();
		const prevColor = this.renderer.getClearColor(new THREE.Color());
		const prevAlpha = this.renderer.getClearAlpha();

		this.renderer.setRenderTarget(this.renderTarget);
		this.renderer.setClearColor(0x000000, 0);
		this.renderer.clear();
		this.renderer.render(this.scene, this.lightCamera);

		this.renderer.setRenderTarget(prevRT);
		this.renderer.setClearColor(prevColor, prevAlpha);
	}

	getOpacityTexture() {
		return this.renderTarget.texture;
	}

	getLightCamera() {
		return this.lightCamera;
	}
}
