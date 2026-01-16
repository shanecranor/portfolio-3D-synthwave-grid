export const vertexShaderSource = `
  attribute vec2 a_position;
  varying vec2 v_uv;

  void main() {
    v_uv = (a_position + 1.0) * 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

export const fragmentShaderSource = `
  precision highp float;

  varying vec2 v_uv;
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform float u_gridScale;
  uniform float u_horizon;
  uniform float u_glowStrength;
  uniform float u_speed;

  float glowLine(float dist, float core, float glow) {
    float coreLine = smoothstep(core, 0.0, dist);
    float glowLine = smoothstep(glow, 0.0, dist);
    return coreLine + glowLine * 0.45;
  }

  void main() {
    vec2 uv = v_uv;
    float aspect = u_resolution.x / u_resolution.y;
    float horizon = u_horizon;

    vec3 color = vec3(0.01, 0.0, 0.03);

    if (uv.y > horizon) {
      float skyT = (uv.y - horizon) / (1.0 - horizon);
      vec3 skyA = vec3(0.02, 0.0, 0.06);
      vec3 skyB = vec3(0.11, 0.02, 0.18);
      color = mix(skyA, skyB, skyT);

      vec2 sunPos = vec2(0.5, horizon + 0.18);
      float sun = smoothstep(
        0.35,
        0.0,
        length((uv - sunPos) * vec2(1.0, 1.4))
      );
      color += vec3(0.8, 0.25, 0.9) * sun * 0.5;
    } else {
      float t = (horizon - uv.y) / horizon;
      float depth = 1.0 / (t * 6.0 + 0.22);
      vec2 ground = vec2((uv.x - 0.5) * aspect, 1.0) * depth;
      float gridScale = u_gridScale;
      ground.y += u_time * u_speed;
      vec2 gridUv = ground * gridScale;

      vec2 gridDist = abs(fract(gridUv) - 0.5);
      float lineX = glowLine(gridDist.x, 0.05, 0.22);
      float lineY = glowLine(gridDist.y, 0.05, 0.22);

      vec3 base = mix(vec3(0.0, 0.0, 0.02), vec3(0.05, 0.0, 0.08), t);
      vec3 neonX = vec3(0.2, 0.9, 1.0);
      vec3 neonY = vec3(1.0, 0.2, 0.8);

      color = base;
      color += neonX * lineX * u_glowStrength;
      color += neonY * lineY * u_glowStrength;

      float fog = smoothstep(0.0, 1.0, t);
      color *= mix(1.0, 0.75, fog);
      color *= 0.9 + 0.1 * sin(u_time * 1.4 + gridUv.y * 0.3);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;
