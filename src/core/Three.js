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
	}

	#animate() {
		const delta = this.clock.getDelta();
		const elapsed = this.clock.elapsedTime;

		this.scene.animate(delta, elapsed);
		this.postProcessing.render();
		requestAnimationFrame(() => this.#animate());
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
