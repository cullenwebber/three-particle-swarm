import * as THREE from "three";

class WebGLContext {
	constructor(container) {
		if (WebGLContext.instance) return WebGLContext.instance;

		this.container = container;
		this.renderer = null;
		this.canvas = null;
		this.fullScreenDimensions = { width: 0, height: 0 };
		this.pixelRatio = Math.min(window.devicePixelRatio, 2.0);

		WebGLContext.instance = this;
	}

	async init() {
		this.#createCanvas();
		this.#setUpRenderer();
	}

	#setUpRenderer() {
		this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false });
		this.fullScreenDimensions = this.getFullScreenDimensions();
		this.renderer.setSize(this.fullScreenDimensions.width, this.fullScreenDimensions.height);
		this.renderer.setPixelRatio(this.pixelRatio);
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
	}

	getFullScreenDimensions() {
		const el = document.createElement("div");
		el.style.height = "100lvh";
		el.style.width = "100lvw";
		el.style.position = "absolute";
		el.style.visibility = "hidden";
		document.body.appendChild(el);
		const width = el.offsetWidth;
		const height = el.offsetHeight;
		document.body.removeChild(el);
		return { width, height };
	}

	#createCanvas() {
		this.canvas = document.createElement("canvas");
		this.canvas.style.position = "fixed";
		this.canvas.style.left = 0;
		this.canvas.style.top = 0;
		this.canvas.style.zIndex = 35;
		this.canvas.style.pointerEvents = "auto";
		document.body.appendChild(this.canvas);
		return this.canvas;
	}

	onResize(width, height) {
		this.pixelRatio = Math.min(window.devicePixelRatio, 2);
		this.renderer.setSize(width, height);
		this.renderer.setPixelRatio(this.pixelRatio);
	}
}

export default WebGLContext;
