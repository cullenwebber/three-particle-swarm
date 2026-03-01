import * as THREE from "three";
import WebGLContext from "./WebGLContext";
import PostProcessing from "./PostProcessing";
import Scene from "../scenes/Scene";

class Three {
	constructor(container) {
		this.container = container;
		this.context = null;
		this.clock = new THREE.Clock();
		this.postProcessing = null;
		this.mouseDown = false;
		this.timeScale = 1.0;
		this.scaledElapsed = 0;
	}

	run() {
		this.context = new WebGLContext(this.container);
		this.context.init();
		this.scene = new Scene();

		const { width, height } = this.context.getFullScreenDimensions();
		this.postProcessing = new PostProcessing(
			this.context.renderer,
			this.scene.scene,
			this.scene.camera,
			width,
			height,
		);

		this.#animate();
		this.#addResizeListener();
		this.#addMouseListeners();
	}

	#animate() {
		const delta = this.clock.getDelta();

		const targetScale = this.mouseDown ? 0.1 : 1.0;
		this.timeScale += (targetScale - this.timeScale) * 0.2;

		const scaledDelta = delta * this.timeScale;
		this.scaledElapsed += scaledDelta;

		this.scene.animate(scaledDelta, this.scaledElapsed, this.timeScale);
		this.postProcessing.render();
		requestAnimationFrame(() => this.#animate());
	}

	#addMouseListeners() {
		window.addEventListener("mousedown", () => {
			this.mouseDown = true;
		});
		window.addEventListener("mouseup", () => {
			this.mouseDown = false;
		});
		window.addEventListener("touchstart", () => {
			this.mouseDown = true;
		});
		window.addEventListener("touchend", () => {
			this.mouseDown = false;
		});
	}

	#addResizeListener() {
		window.addEventListener("resize", () => this.#onResize());
	}

	#onResize() {
		const { width, height } = this.context.getFullScreenDimensions();
		this.context.onResize(width, height);
		this.scene.onResize(width, height);
		this.postProcessing.onResize(width, height);
	}
}

export default Three;
