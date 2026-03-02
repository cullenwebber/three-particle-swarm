precision highp float;

uniform sampler2D texturePosition;
uniform sampler2D textureSortKey;
uniform float useSortKey;
uniform vec2 sortResolution;
uniform mat4 lightViewMatrix;
uniform mat4 lightProjectionMatrix;
uniform float pointSize;
uniform float opacityPointScale;

varying float vLife;

void main() {
    vec2 posUV = position.xy;

    if (useSortKey > 0.5) {
        vec4 sortData = texture2D(textureSortKey, position.xy);
        float originalIndex = sortData.g;
        posUV = vec2(
            (mod(originalIndex, sortResolution.x) + 0.5) / sortResolution.x,
            (floor(originalIndex / sortResolution.x) + 0.5) / sortResolution.y
        );
    }

    vec4 positionInfo = texture2D(texturePosition, posUV);
    vLife = positionInfo.w;

    vec4 lightSpacePos = lightProjectionMatrix * lightViewMatrix * vec4(positionInfo.xyz, 1.0);

    float sizeRand = 0.1 + 0.6 * fract(sin(dot(posUV, vec2(53.127, 97.863))) * 43758.5453);
    gl_PointSize = pointSize * sizeRand * opacityPointScale * smoothstep(0.0, 0.2, positionInfo.w);

    gl_Position = lightSpacePos;
}
