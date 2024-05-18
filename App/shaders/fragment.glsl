varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  float intensity = pow(0.2 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 1.0); // Reduce the intensity calculation
  vec3 baseColor = vec3(0.01, 0.05, 0.14); // Dark base color
  vec3 color = baseColor * (0.04 + 0.04 * intensity); // Apply subtle darkening effect
  gl_FragColor = vec4(color, 1.0);
}