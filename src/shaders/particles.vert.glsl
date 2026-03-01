#include <common>
#include <shadowmap_pars_vertex>
uniform sampler2D texturePosition;
uniform float pointSize;

varying float vLife;
varying float vColorIndex;

void main() {

    vec4 positionInfo = texture2D( texturePosition, position.xy );

    vec4 worldPosition = modelMatrix * vec4( positionInfo.xyz, 1.0 );
    vec4 mvPosition = viewMatrix * worldPosition;

    // Points have no geometry normal — provide a dummy for shadow bias
    vec3 transformedNormal = vec3( 0.0, 0.0, 1.0 );

    #include <shadowmap_vertex>

    vLife = positionInfo.w;
    vColorIndex = fract(position.x * 431.0 + position.y * 7697.0);
    gl_PointSize = pointSize / length( mvPosition.xyz ) * smoothstep(0.0, 0.2, positionInfo.w);

    gl_Position = projectionMatrix * mvPosition;

}
