uniform sampler2D texturePosition;
uniform float pointSize;

void main() {
    vec4 positionInfo = texture2D( texturePosition, position.xy );
    vec4 mvPosition = modelViewMatrix * vec4( positionInfo.xyz, 1.0 );

    float sizeRand = 0.1 + 0.6 * fract(sin(dot(position.xy, vec2(53.127, 97.863))) * 43758.5453);
    gl_PointSize = pointSize * sizeRand / length( mvPosition.xyz ) * smoothstep(0.0, 0.2, positionInfo.w);
    gl_Position = projectionMatrix * mvPosition;
}
