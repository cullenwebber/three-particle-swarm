import * as THREE from "three";
import WebGLContext from "../core/WebGLContext";
import { CameraRig } from "../utils/CameraRig";
import ParticleSystem from "../particles/ParticleSystem";

export default class Scene {
	constructor() {
		this.context = null;
		this.camera = null;
		this.cameraRig = null;
		this.width = 0;
		this.height = 0;
		this.aspectRatio = 0;
		this.scene = null;
		this.particleSystem = null;
		this.mouse3d = new THREE.Vector3();
		this.raycaster = new THREE.Raycaster();
		this.mouseNDC = new THREE.Vector2();
		this.intersectPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
		this.#init();
	}

	#init() {
		this.#setContext();
		this.#setupScene();
		this.#setupCamera();
		this.#setupLight();
		this.#setupParticles();
		this.#bindMouseEvents();
	}

	#setContext() {
		this.context = new WebGLContext();
	}

	#setupScene() {
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0x03051a);
	}

	#setupCamera() {
		this.#calculateAspectRatio();
		this.camera = new THREE.PerspectiveCamera(50, this.aspectRatio, 0.1, 1000);
		this.camera.position.z = 300;
	}

	#setupLight() {
		const pointLight = new THREE.PointLight(0xffffff, 1, 1400);
		pointLight.position.set(0, 10, 700);
		pointLight.castShadow = true;
		pointLight.shadowCameraNear = 10;
		pointLight.shadowCameraFar = 1400;
		pointLight.shadowBias = 0.1;
		pointLight.shadowMapWidth = 2048;
		pointLight.shadowMapHeight = 2048;

		this.scene.add(pointLight);
		this.light = pointLight;
	}

	#setupParticles() {
		this.particleSystem = new ParticleSystem(this.context.renderer);
		this.scene.add(this.particleSystem.mesh);
	}

	#bindMouseEvents() {
		window.addEventListener("mousemove", (event) => {
			this.mouseNDC.x = (event.clientX / window.innerWidth) * 2 - 1;
			this.mouseNDC.y = -(event.clientY / window.innerHeight) * 2 + 1;
		});
	}

	#updateMouse3d() {
		this.raycaster.setFromCamera(this.mouseNDC, this.camera);
		this.raycaster.ray.intersectPlane(this.intersectPlane, this.mouse3d);
	}

	#calculateAspectRatio() {
		const { width, height } = this.context.getFullScreenDimensions();
		this.width = width;
		this.height = height;
		this.aspectRatio = this.width / this.height;
	}

	animate(delta, elapsed) {
		this.#updateMouse3d();
		this.particleSystem &&
			this.particleSystem.update(
				delta,
				elapsed,
				this.mouse3d,
				this.camera,
				this.light.position,
			);
	}

	onResize(width, height) {
		this.width = width;
		this.height = height;
		this.aspectRatio = width / height;

		this.camera.aspect = this.aspectRatio;
		this.camera.updateProjectionMatrix();
	}
}
