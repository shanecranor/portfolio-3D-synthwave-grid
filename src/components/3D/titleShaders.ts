export const currentMainTitleVertexShader = `
varying vec3 vObjectPosition;
varying vec3 vObjectNormal;
varying vec3 vWorldNormal;
varying vec3 vViewDirection;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vObjectPosition = position;
  vObjectNormal = normalize(normal);
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vViewDirection = normalize(cameraPosition - worldPosition.xyz);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const currentMainTitleFragmentShader = `
uniform float uTime;
uniform float uBoundsMinY;
uniform float uBoundsMaxY;

varying vec3 vObjectPosition;
varying vec3 vObjectNormal;
varying vec3 vWorldNormal;
varying vec3 vViewDirection;

float inverseLerp(float a, float b, float value) {
  return clamp((value - a) / (b - a), 0.0, 1.0);
}

vec3 gradientFromTop(float t) {
  vec3 deepBlue = vec3(0.03, 0.1, 0.38);
  vec3 electricBlue = vec3(0.16, 0.39, 1.0);
  vec3 paleBlue = vec3(0.58, 0.72, 1.0);
  vec3 skyWhite = vec3(0.99, 0.98, 1.0);
  vec3 divider = vec3(0.07, 0.0, 0.09);
  vec3 magenta = vec3(0.98, 0.02, 0.9);
  vec3 pink = vec3(1.0, 0.42, 0.95);
  vec3 lowerWhite = vec3(1.0, 0.96, 0.99);

  vec3 color = deepBlue;
  color = mix(color, electricBlue, smoothstep(0.05, 0.18, t));
  color = mix(color, paleBlue, smoothstep(0.18, 0.34, t));
  color = mix(color, skyWhite, smoothstep(0.34, 0.47, t));
  color = mix(color, divider, smoothstep(0.495, 0.515, t));
  color = mix(color, magenta, smoothstep(0.515, 0.68, t));
  color = mix(color, pink, smoothstep(0.68, 0.82, t));
  color = mix(color, lowerWhite, smoothstep(0.82, 0.94, t));
  color = mix(color, vec3(0.0,0.0,0.0), 0.5);
  return color;
}

void main() {
  float topDown = inverseLerp(uBoundsMaxY, uBoundsMinY, vObjectPosition.y);
  vec3 normal = normalize(vWorldNormal);
  vec3 viewDir = normalize(vViewDirection);
  vec3 reflectDir = reflect(-viewDir, normal);

  float reflectionT = clamp(0.5 - reflectDir.y * 0.5, 0.0, 1.0);
  float reflectionSweep = clamp(
    reflectionT + reflectDir.x * 0.08 - vObjectNormal.x * 0.05,
    0.0,
    1.0
  );

  float frontFace = smoothstep(0.34, 0.92, vObjectNormal.z);
  float bevelMask = 1.0 - frontFace;

  vec3 faceChrome = gradientFromTop(mix(topDown, reflectionSweep, 0.38));
  vec3 edgeChrome = gradientFromTop(mix(topDown, reflectionSweep, 0.82));

  vec3 deepShadow = vec3(0.025, 0.005, 0.04);
  vec3 color = mix(deepShadow, edgeChrome * 0.5, 0.45);
  color = mix(color, faceChrome, frontFace);

  float directional = max(dot(normal, normalize(vec3(-0.22, 0.4, 0.88))), 0.0);
  color *= mix(0.56, 1.04, pow(directional, 0.85));

  float centerShadow = smoothstep(0.0, 0.12, topDown) * (1.0 - smoothstep(0.88, 1.0, topDown));
  color *= mix(0.92, 1.0, centerShadow);

  float dividerShadow = exp(-pow((reflectionSweep - 0.51) / 0.04, 2.0));
  color *= 1.0 - dividerShadow * 0.18 * frontFace;

  float rim = pow(1.0 - max(dot(normal, viewDir), 0.0), 4.5);
  color += rim * mix(vec3(0.3, 0.55, 1.0), vec3(1.0, 0.7, 0.95), smoothstep(0.5, 0.78, topDown)) * (0.26 + 0.36 * bevelMask);

  vec3 halfVector = normalize(viewDir + normalize(vec3(-0.4, 0.52, 0.82)));
  float specular = pow(max(dot(normal, halfVector), 0.0), 48.0);
  color += specular * vec3(1.0, 0.98, 1.0) * (0.3 + bevelMask * 0.24);

  float upperSheen = exp(-pow((reflectionSweep - 0.15) / 0.06, 2.0));
  float lowerSheen = exp(-pow((reflectionSweep - 0.9) / 0.07, 2.0));
  color += vec3(0.66, 0.8, 1.0) * upperSheen * 0.12 * frontFace;
  color += vec3(1.0, 0.94, 0.98) * lowerSheen * 0.1 * frontFace;

  float horizonLine = exp(-pow((reflectionSweep - 0.505) / 0.018, 2.0));
  color += horizonLine * vec3(1.0) * 0.08 * frontFace;

  float scan = 0.5 + 0.5 * sin((reflectionSweep * 96.0 - uTime * 0.2) * 6.28318530718);
  float scanMask = smoothstep(0.45, 1.0, scan);
  vec3 scanTint = mix(vec3(0.58, 0.7, 1.0), vec3(1.0, 0.72, 0.96), smoothstep(0.52, 0.72, reflectionSweep));
  color += scanTint * scanMask * 0.014 * frontFace;

  color = max(color, vec3(0.0));

  gl_FragColor = vec4(color, 1.0);
}
`;
