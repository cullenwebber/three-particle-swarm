varying float vLife;

void main() {
    vec2 coord = gl_PointCoord * 2.0 - 1.0;
    if (dot(coord, coord) > 1.0) discard;

    // Soft falloff from center
    float alpha = 1.0 - dot(coord, coord);
    alpha *= smoothstep(0.0, 0.5, vLife);

    // Output small alpha for accumulation
    gl_FragColor = vec4(alpha * 0.15, 0.0, 0.0, 1.0);
}
