varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  float intensity = pow(0.2 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 1.0); // Reduce the intensity calculation
  vec3 baseColor = vec3(0.01, 0.05, 0.14); 
  vec3 color = baseColor * (0.07 + 0.07 * intensity); 
  gl_FragColor = vec4(color, 1.0);

  #include <tonemapping_fragment>
	#include <colorspace_fragment>
}