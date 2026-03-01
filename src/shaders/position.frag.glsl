// resolution and texturePosition are provided by GPUComputationRenderer
uniform sampler2D textureDefaultPosition;
uniform float time;
uniform float speed;
uniform float dieSpeed;
uniform float radius;
uniform float curlSize;
uniform float attraction;
uniform float initAnimation;
uniform sampler2D textureMeshPositions;
uniform sampler2D textureMeshVelocities;
uniform float meshSampleSize;
uniform vec3 wind;
uniform float timeScale;

#include './includes/curl4.glsl'

void main() {

    vec2 uv = gl_FragCoord.xy / resolution.xy;

    vec4 positionInfo = texture2D( texturePosition, uv );
    vec3 position = mix(vec3(0.0, -200.0, 0.0), positionInfo.xyz, smoothstep(0.0, 0.3, initAnimation));
    float life = positionInfo.a - dieSpeed * timeScale;

    // Hash particle UV to pick a deterministic mesh sample point
    float hashVal = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
    vec2 meshUV = vec2(
        fract(hashVal * 127.1),
        fract(hashVal * 311.7)
    );
    // Snap to texel centers
    meshUV = (floor(meshUV * meshSampleSize) + 0.5) / meshSampleSize;

    vec4 meshPos = texture2D(textureMeshPositions, meshUV);
    vec4 meshVel = texture2D(textureMeshVelocities, meshUV);

    vec3 followPosition = mix(vec3(0.0, -(1.0 - initAnimation) * 200.0, 0.0), meshPos.xyz, smoothstep(0.2, 0.7, initAnimation));

    if(life < 0.0) {
        positionInfo = texture2D( textureDefaultPosition, uv );
        // Spawn at mesh surface point + small random offset
        vec3 spawnOffset = positionInfo.xyz * 3.0;
        position = followPosition + spawnOffset;
        life = 0.5 + fract(positionInfo.w * 21.4131 + time);
    } else {
        vec3 delta = followPosition - position;
        position += delta * (0.005 + life * 0.015) * attraction * (1.0 - smoothstep(50.0, 350.0, length(delta))) * speed * timeScale;

        // Bone velocity — smooth inertia trail
        // Life-scaled: fresh particles get full kick, dying ones coast
        vec3 boneVel = meshVel.xyz;
        float boneSpeed = length(boneVel);
        position -= boneVel * 0.04 * life * timeScale;


        float drift = 1.0 - life;
        vec3 curlNoise = curl(position * curlSize, time, 0.1);
        position += (wind + curlNoise * speed) * drift * timeScale;
    }

    gl_FragColor = vec4(position, life);

}
