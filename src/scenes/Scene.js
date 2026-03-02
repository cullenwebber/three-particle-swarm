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

		this.orbitTarget = new THREE.Vector3(0, 0, 0);
		this.orbitRadius = 300;
		this.orbitAngle = { x: 0, y: 0 };
		this.orbitAngleTarget = { x: 0, y: 0 };
		this.defaultOrbitAngle = { x: 0, y: 0 };
		this.isDragging = false;
		this.dragStart = { x: 0, y: 0 };
		this.dragAngleStart = { x: 0, y: 0 };

		this.#init();
	}

	#init() {
		this.#setContext();
		this.#setupScene();
		this.#setupCamera();
		this.#setupLight();
		this.#setupParticles();
		this.#setupOrbitControls();
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
		this.camera.position.z = this.orbitRadius;
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

	#setupOrbitControls() {
		const onDown = (x, y) => {
			this.isDragging = true;
			this.dragStart.x = x;
			this.dragStart.y = y;
			this.dragAngleStart.x = this.orbitAngleTarget.x;
			this.dragAngleStart.y = this.orbitAngleTarget.y;
		};

		const onMove = (x, y) => {
			if (!this.isDragging) return;
			const dx = (x - this.dragStart.x) / this.width;
			this.orbitAngleTarget.x = this.dragAngleStart.x + dx * Math.PI * 2;
		};

		const onUp = () => {
			this.isDragging = false;
		};

		window.addEventListener("mousedown", (e) => onDown(e.clientX, e.clientY));
		window.addEventListener("mousemove", (e) => onMove(e.clientX, e.clientY));
		window.addEventListener("mouseup", onUp);

		window.addEventListener("touchstart", (e) => {
			const t = e.touches[0];
			onDown(t.clientX, t.clientY);
		});
		window.addEventListener("touchmove", (e) => {
			const t = e.touches[0];
			onMove(t.clientX, t.clientY);
		});
		window.addEventListener("touchend", onUp);
	}

	#updateCamera() {
		if (!this.isDragging) {
			this.orbitAngleTarget.x +=
				(this.defaultOrbitAngle.x - this.orbitAngleTarget.x) * 0.05;
		}

		this.orbitAngle.x += (this.orbitAngleTarget.x - this.orbitAngle.x) * 0.1;

		this.camera.position.x =
			this.orbitTarget.x + this.orbitRadius * Math.sin(this.orbitAngle.x);
		this.camera.position.y = this.orbitTarget.y;
		this.camera.position.z =
			this.orbitTarget.z + this.orbitRadius * Math.cos(this.orbitAngle.x);
		this.camera.lookAt(this.orbitTarget);
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
		this.#updateCamera();
		if (this.character) this.character.update(delta);
		if (this.meshSampler) this.meshSampler.update();
		if (this.particleSystem) {
			this.particleSystem.update(
				delta,
				elapsed,
				timeScale,
				this.meshSampler,
				this.camera,
				this.light.position,
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
