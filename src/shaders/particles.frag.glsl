precision highp float;

#include <common>

varying float vLife;
varying float vColorIndex;
varying vec4 vLightSpacePos;

uniform vec3 lightDirection;
uniform sampler2D opacityTexture;
uniform float shadowDensity;

void main() {
    vec2 coord = gl_PointCoord * 2.0 - 1.0;
    float r2 = dot(coord, coord);
    if (r2 > 1.0) discard;

    vec3 normal = vec3(coord, sqrt(1.0 - r2));
    vec3 lightDir = normalize(lightDirection);

    float diffuse = max(dot(normal, lightDir), 0.0);

    vec3 viewDir = vec3(1.0, -1.0, 1.0);
    vec3 halfDir = normalize(lightDir + viewDir);
    float specular = pow(max(dot(normal, halfDir), 0.0), 32.0);

    vec3 palette[4];
    palette[0] = vec3(1.3, 0.15, 0.6);
    palette[1] = vec3(0.6, 0.15, 1.3);
    palette[2] = vec3(0.15, 0.4, 1.4);
    palette[3] = vec3(1.0, 0.3, 1.2);

    int idx = int(floor(vColorIndex * 5.0));
    vec3 baseColor = palette[idx];
    vec3 litColor = baseColor * (0.7 + 0.3 * diffuse) + vec3(0.3) * specular;

    vec2 lightUV = vLightSpacePos.xy / vLightSpacePos.w * 0.5 + 0.5;
    float opacity = 0.0;
    if (lightUV.x >= 0.0 && lightUV.x <= 1.0 && lightUV.y >= 0.0 && lightUV.y <= 1.0) {
        opacity = texture2D(opacityTexture, lightUV).r;
    }

    float shadow = exp(-opacity * shadowDensity);
    vec3 shadowColor = mix(baseColor, vec3(0., 0., 0.01), 0.99);
    vec3 outgoingLight = mix(shadowColor, litColor, shadow);

    gl_FragColor = vec4(outgoingLight, 1.0);
}
