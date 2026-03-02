precision highp float;

#include <common>
uniform sampler2D texturePosition;
uniform sampler2D textureSortKey;
uniform float pointSize;
uniform vec2 sortResolution;
uniform mat4 lightViewMatrix;
uniform mat4 lightProjectionMatrix;

varying float vLife;
varying float vColorIndex;
varying vec4 vLightSpacePos;

void main() {
    vec4 sortData = texture2D(textureSortKey, position.xy);
    float originalIndex = sortData.g;

    vec2 posUV = vec2(
        (mod(originalIndex, sortResolution.x) + 0.5) / sortResolution.x,
        (floor(originalIndex / sortResolution.x) + 0.5) / sortResolution.y
    );

    vec4 positionInfo = texture2D(texturePosition, posUV);
    vec4 worldPosition = modelMatrix * vec4(positionInfo.xyz, 1.0);
    vec4 mvPosition = viewMatrix * worldPosition;

    vLife = positionInfo.w;
    vColorIndex = fract(posUV.x * 431.0 + posUV.y * 7697.0);

    float sizeRand = 0.1 + 0.6 * fract(sin(dot(posUV, vec2(53.127, 97.863))) * 43758.5453);
    gl_PointSize = pointSize * sizeRand / length(mvPosition.xyz) * smoothstep(0.0, 0.2, positionInfo.w);

    vLightSpacePos = lightProjectionMatrix * lightViewMatrix * worldPosition;
    gl_Position = projectionMatrix * mvPosition;
}
