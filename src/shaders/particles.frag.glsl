#include <common>
#include <packing>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>

varying float vLife;
varying float vColorIndex;
uniform vec3 lightDirection;

void main() {

    // Circular point sprite
    vec2 coord = gl_PointCoord * 2.0 - 1.0;
    float r2 = dot(coord, coord);
    if(r2 > 1.0) discard;

    // Reconstruct sphere normal
    vec3 normal = vec3(coord, sqrt(1.0 - r2));

    vec3 lightDir = normalize(lightDirection);

    // Diffuse
    float diffuse = max(dot(normal, lightDir), 0.0);

    // Specular (Blinn-Phong)
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    vec3 halfDir = normalize(lightDir + viewDir);
    float specular = pow(max(dot(normal, halfDir), 0.0), 32.0);

    // Vivid rainbow palette
    vec3 palette[4];
    palette[0] = vec3(1.3, 0.15, 0.6);  // magenta
    palette[1] = vec3(0.6, 0.15, 1.3);  // violet
    palette[2] = vec3(0.15, 0.4, 1.4);  // deep blue
    palette[3] = vec3(1.0, 0.3, 1.2);   // orchid pink

    int idx = int(floor(vColorIndex * 5.0));
    vec3 baseColor = palette[idx];

    // Stronger lit/shadow contrast
    vec3 litColor = baseColor * (0.7 + 0.3 * diffuse) + vec3(0.1) * specular;

    float shadow = getShadowMask();
    // Shadow tints toward a dark cool tone instead of just dimming
    vec3 shadowColor = mix(baseColor, vec3(0.,0.,0.01) , 0.8);
    vec3 outgoingLight = mix(shadowColor, litColor, mix(0.0, 1.0, shadow));

    gl_FragColor = vec4( outgoingLight, 1.0 );

}
