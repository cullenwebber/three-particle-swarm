import * as THREE from "three";
import WebGLContext from "../core/WebGLContext";
import ParticleSystem from "../particles/ParticleSystem";
import CharacterLoader from "../character/CharacterLoader";
import MeshSurfaceSampler from "../character/MeshSurfaceSampler";

export default class Scene {
	constructor() {
		this.context = null;
		this.camera = null;
		this.width = 0;
		this.height = 0;
		this.aspectRatio = 0;
		this.scene = null;
		this.particleSystem = null;
		this.character = null;
		this.meshSampler = null;
		this.#init();
	}

	#init() {
		this.#setContext();
		this.#setupScene();
		this.#setupCamera();
		this.#setupLight();
		this.#setupParticles();
		this.#loadCharacter();
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
		const pointLight = new THREE.PointLight(0xffffff, 1, 10);
		pointLight.position.set(0, -200, 3000);
		this.scene.add(pointLight);
		this.light = pointLight;
	}

	#setupParticles() {
		this.particleSystem = new ParticleSystem(this.context.renderer);
		this.scene.add(this.particleSystem.mesh);
	}

	async #loadCharacter() {
		try {
			this.character = new CharacterLoader();
			await this.character.load("models/running.fbx");
			this.character.group.position.y = -100;
			this.character.group.rotation.y = Math.PI / 5;
			this.scene.add(this.character.group);
			this.meshSampler = new MeshSurfaceSampler(this.character.skinnedMesh);
			this.#hideLoader();
		} catch (err) {
			console.error("Failed to load character FBX:", err);
			this.#hideLoader();
		}
	}

	#hideLoader() {
		const loader = document.getElementById("loader");
		if (loader) {
			loader.style.opacity = "0";
			loader.addEventListener("transitionend", () => loader.remove());
		}
	}

	#calculateAspectRatio() {
		const { width, height } = this.context.getFullScreenDimensions();
		this.width = width;
		this.height = height;
		this.aspectRatio = this.width / this.height;
	}

	animate(delta, elapsed, timeScale) {
		if (this.character) this.character.update(delta);
		if (this.meshSampler) this.meshSampler.update();
		if (this.particleSystem) {
			this.particleSystem.update(
				delta, elapsed, timeScale, this.meshSampler, this.camera, this.light.position,
			);
		}
	}

	onResize(width, height) {
		this.width = width;
		this.height = height;
		this.aspectRatio = width / height;
		this.camera.aspect = this.aspectRatio;
		this.camera.updateProjectionMatrix();
	}
}
