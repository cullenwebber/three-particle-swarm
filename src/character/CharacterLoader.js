import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

export default class CharacterLoader {
	constructor() {
		this.mixer = null;
		this.skinnedMesh = null;
		this.group = null;
	}

	async load(url) {
		const loader = new FBXLoader();
		const fbx = await loader.loadAsync(url);

		this.group = fbx;

		// Find the first SkinnedMesh
		fbx.traverse((child) => {
			if (child.isSkinnedMesh && !this.skinnedMesh) {
				this.skinnedMesh = child;
				child.visible = false;
			}
		});

		if (!this.skinnedMesh) {
			throw new Error("No SkinnedMesh found in FBX");
		}

		// Set up animation mixer and play first clip
		if (fbx.animations.length > 0) {
			this.mixer = new THREE.AnimationMixer(fbx);
			const action = this.mixer.clipAction(fbx.animations[0]);
			action.play();
		}

		return this;
	}

	update(delta) {
		if (this.mixer) {
			this.mixer.update(delta);
		}
	}
}
