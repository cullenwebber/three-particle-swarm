precision highp float;
precision highp int;

uniform sampler2D textureSortKey;
uniform int u_pass;
uniform int u_stage;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    float index1D = floor(gl_FragCoord.y) * resolution.x + floor(gl_FragCoord.x);
    int selfIndex = int(index1D);

    int blockSize = 1;
    for (int i = 0; i < 20; i++) {
        if (i >= u_pass) break;
        blockSize *= 2;
    }
    int partnerIndex = selfIndex ^ blockSize;

    vec2 partnerCoord = vec2(
        mod(float(partnerIndex), resolution.x),
        floor(float(partnerIndex) / resolution.x)
    );
    vec2 partnerUV = (partnerCoord + 0.5) / resolution;

    vec4 selfKey = texture2D(textureSortKey, uv);
    vec4 partnerKey = texture2D(textureSortKey, partnerUV);

    int dirBlockSize = 1;
    for (int i = 0; i < 20; i++) {
        if (i >= u_stage + 1) break;
        dirBlockSize *= 2;
    }
    bool ascending = ((selfIndex / dirBlockSize) & 1) == 0;

    bool isSmaller = selfKey.r < partnerKey.r;
    bool swap;
    if (selfIndex < partnerIndex) {
        swap = ascending ? !isSmaller : isSmaller;
    } else {
        swap = ascending ? isSmaller : !isSmaller;
    }

    gl_FragColor = swap ? partnerKey : selfKey;
}
