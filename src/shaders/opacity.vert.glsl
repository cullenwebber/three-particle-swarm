uniform sampler2D texturePosition;
uniform sampler2D textureSortKey;
uniform vec2 sortResolution;
uniform mat4 lightViewMatrix;
uniform mat4 lightProjectionMatrix;
uniform float pointSize;
uniform float opacityPointScale; // converts perspective pointSize to ortho pixels

varying float vLife;

void main() {
    // Look up sorted index from sort key texture
    vec4 sortData = texture2D(textureSortKey, position.xy);
    float originalIndex = sortData.g;

    // Convert 1D index back to UV in position texture
    vec2 posUV = vec2(
        (mod(originalIndex, sortResolution.x) + 0.5) / sortResolution.x,
        (floor(originalIndex / sortResolution.x) + 0.5) / sortResolution.y
    );

    vec4 positionInfo = texture2D(texturePosition, posUV);
    vLife = positionInfo.w;

    // Transform to light space
    vec4 lightSpacePos = lightProjectionMatrix * lightViewMatrix * vec4(positionInfo.xyz, 1.0);

    // Same sizeRand as the main particle shader
    float sizeRand = 0.1 + 0.6 * fract(sin(dot(posUV, vec2(53.127, 97.863))) * 43758.5453);
    gl_PointSize = pointSize * sizeRand * opacityPointScale
                 * smoothstep(0.0, 0.2, positionInfo.w);

    gl_Position = lightSpacePos;
}
