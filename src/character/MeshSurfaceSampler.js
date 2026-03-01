import * as THREE from "three";

const SAMPLE_SIZE = 64; // 64x64 = 4096 sample points

export default class MeshSurfaceSampler {
	constructor(skinnedMesh) {
		this.mesh = skinnedMesh;
		this.sampleCount = SAMPLE_SIZE * SAMPLE_SIZE;
		this.size = SAMPLE_SIZE;

		// Pre-compute evenly-spaced vertex indices to sample
		const vertexCount = this.mesh.geometry.attributes.position.count;
		this.sampleIndices = new Uint32Array(this.sampleCount);
		for (let i = 0; i < this.sampleCount; i++) {
			this.sampleIndices[i] = Math.floor((i / this.sampleCount) * vertexCount);
		}

		// Position DataTexture (RGBA float)
		const posData = new Float32Array(this.sampleCount * 4);
		this.positionTexture = new THREE.DataTexture(
			posData,
			SAMPLE_SIZE,
			SAMPLE_SIZE,
			THREE.RGBAFormat,
			THREE.FloatType,
		);
		this.positionTexture.needsUpdate = true;

		// Velocity DataTexture (RGBA float)
		const velData = new Float32Array(this.sampleCount * 4);
		this.velocityTexture = new THREE.DataTexture(
			velData,
			SAMPLE_SIZE,
			SAMPLE_SIZE,
			THREE.RGBAFormat,
			THREE.FloatType,
		);
		this.velocityTexture.needsUpdate = true;

		// Previous frame positions for velocity calculation
		this.prevPositions = new Float32Array(this.sampleCount * 3);
		this.firstFrame = true;

		// Temp vector for boneTransform output
		this._target = new THREE.Vector3();
	}

	update() {
		const posData = this.positionTexture.image.data;
		const velData = this.velocityTexture.image.data;

		// Ensure skeleton and matrixWorld are up to date
		this.mesh.updateMatrixWorld(true);

		for (let i = 0; i < this.sampleCount; i++) {
			const vertexIndex = this.sampleIndices[i];

			// Get skinned vertex position in local space
			this._target.fromBufferAttribute(this.mesh.geometry.attributes.position, vertexIndex);
			this.mesh.applyBoneTransform(vertexIndex, this._target);

			// Transform to world space
			this._target.applyMatrix4(this.mesh.matrixWorld);

			const x = this._target.x;
			const y = this._target.y;
			const z = this._target.z;

			const i4 = i * 4;
			const i3 = i * 3;

			// Write position
			posData[i4] = x;
			posData[i4 + 1] = y;
			posData[i4 + 2] = z;
			posData[i4 + 3] = 1.0;

			// Compute velocity (current - previous)
			if (this.firstFrame) {
				velData[i4] = 0;
				velData[i4 + 1] = 0;
				velData[i4 + 2] = 0;
				velData[i4 + 3] = 0;
			} else {
				velData[i4] = x - this.prevPositions[i3];
				velData[i4 + 1] = y - this.prevPositions[i3 + 1];
				velData[i4 + 2] = z - this.prevPositions[i3 + 2];
				velData[i4 + 3] = 0;
			}

			// Store for next frame
			this.prevPositions[i3] = x;
			this.prevPositions[i3 + 1] = y;
			this.prevPositions[i3 + 2] = z;
		}

		this.firstFrame = false;
		this.positionTexture.needsUpdate = true;
		this.velocityTexture.needsUpdate = true;
	}
}
