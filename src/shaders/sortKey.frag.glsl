uniform sampler2D texturePosition;
uniform vec3 halfVector;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec4 positionInfo = texture2D(texturePosition, uv);
    float projectedDistance = dot(halfVector, positionInfo.xyz);
    float index = gl_FragCoord.y * resolution.x + gl_FragCoord.x;
    gl_FragColor = vec4(projectedDistance, index, 0.0, positionInfo.w);
}
